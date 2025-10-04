import React, { useEffect, useState } from "react";
import type { Page } from "../App";
import type { OrderDetails } from "../types";
import { Invoice } from "../components/Invoice";
import {
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PackageIcon,
} from "../components/icons/Icons";
import {
  fetchOrderById,
  verifyPayment,
  getSettingsInfo,
  fetchPublicReceipt,
} from "../services/api";
import { useCart } from "../context/CartContext";

interface ConfirmationPageProps {
  onNavigate: (page: Page) => void;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ onNavigate }) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "success" | "failed" | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [refId, setRefId] = useState<string>("");
  const [fetchError, setFetchError] = useState<string>("");
  const [retrying, setRetrying] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(true);
  const [settings, setSettings] = useState<{
    name?: string;
    address?: string;
    openingHours?: string;
    contactPhone?: string;
  } | null>(null);
  const { clearCart } = useCart();

  // Default business info if settings API is not available
  const defaultBiz = {
    name: "کافه رستوران کاج",
    address: "تهران، چهاردانگه، جنب مجتمع افشین",
    openingHours: "شنبه تا جمعه - ۱۲:۰۰ تا ۱۲:۰۰ شب",
  };

  useEffect(() => {
    // Fetch restaurant info (non-blocking)
    (async () => {
      try {
        setSettingsLoading(true);
        const s = await getSettingsInfo();
        if (s) setSettings(s as any);
      } catch {
      } finally {
        setSettingsLoading(false);
      }
    })();

    const urlParams = new URLSearchParams(window.location.search);
    let success = urlParams.get("success");
    let orderId = urlParams.get("orderId");
    const authority = urlParams.get("Authority");
    const status = urlParams.get("Status");
    const refIdParam = urlParams.get("refId");
    if (refIdParam) setRefId(refIdParam);

    // Handle payment callback from Zarinpal redirect
    if (success !== null || (authority && status)) {
      handlePaymentCallback(success, authority, status, orderId);
      return;
    }

    // Fallback: if no query params but we have stored lastOrderId, try fetching it (user manually opened /confirmation)
    if (!orderId) {
      try {
        orderId = localStorage.getItem("lastOrderId") || undefined;
      } catch {}
    }
    if (orderId) {
      // Attempt to fetch order directly without payment status context
      (async () => {
        setLoading(true);
        try {
          const orderData = await fetchOrderById(orderId!);
          setOrder(orderData);
          setPaymentStatus(null); // Unknown payment state
        } catch (e: any) {
          setFetchError(e?.message || "خطا در دریافت سفارش");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const handlePaymentCallback = async (
    success: string | null,
    authority: string | null,
    status: string | null,
    orderId: string | null
  ) => {
    setLoading(true);
    try {
      // Check if it's a successful payment redirect from backend
      if (success === "1" && orderId) {
        setPaymentStatus("success");
        // Clear cart on successful payment
        clearCart();
        // Fetch updated order details (parallel private+public if refId available)
        await fetchBestEffort(orderId);
      }
      // Check if it's a failed payment redirect from backend
      else if (success === "0") {
        setPaymentStatus("failed");
        if (orderId) {
          try {
            const orderData = await fetchOrderById(orderId);
            setOrder(orderData);
            setFetchError("");
          } catch (error: any) {
            console.error("Failed to fetch order details:", error);
            setFetchError(error?.message || "خطا در دریافت سفارش");
          }
        }
      }
      // Handle direct Zarinpal callback (if user was redirected directly)
      else if (authority && status && orderId) {
        if (status === "OK") {
          try {
            const result = await verifyPayment({
              Authority: authority,
              Status: status,
              orderId,
            });
            if (result.success) {
              setPaymentStatus("success");
              // @ts-ignore - api typing may not include refId yet
              setRefId((result as any).refId || "");
              // Clear cart on successful payment verification
              clearCart();
            } else {
              setPaymentStatus("failed");
            }
            // Fetch order details
            await fetchBestEffort(orderId);
          } catch (error) {
            console.error("Payment verification error:", error);
            setPaymentStatus("failed");
          }
        } else {
          setPaymentStatus("failed");
          if (orderId) {
            try {
              await fetchBestEffort(orderId);
            } catch (error) {
              console.error("Failed to fetch order details:", error);
              setFetchError("خطا در دریافت سفارش");
            }
          }
        }
      }
    } catch (error) {
      console.error("Payment callback handling error:", error);
      setPaymentStatus("failed");
    } finally {
      setLoading(false);
    }
  };

  // Retry helper to fetch order after payment; handles propagation delays
  const fetchWithRetries = async (orderId: string) => {
    const delays = [0, 800, 1500, 3000];
    setOrderLoading(true);
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        const data = await fetchOrderById(orderId);
        if (data) {
          setOrder(data);
          setFetchError("");
          setOrderLoading(false);
          return;
        }
      } catch (e: any) {
        setFetchError(e?.message || "خطا در دریافت سفارش");
      }
    }
    setOrderLoading(false);
  };

  // Parallel fetch: try private with retries while also trying public (if refId present). Whichever returns first wins.
  const fetchBestEffort = async (orderId: string) => {
    setOrderLoading(true);
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("refId");
    let resolved = false;

    const settle = (data: any) => {
      if (resolved || !data) return;
      resolved = true;
      setOrder(data);
      setFetchError("");
      setOrderLoading(false);
    };

    const tasks: Promise<void>[] = [];
    // Private with retries
    tasks.push(
      (async () => {
        const delays = [0, 800, 1500, 3000];
        for (let i = 0; i < delays.length; i++) {
          if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
          try {
            const data = await fetchOrderById(orderId);
            if (data) {
              settle(data);
              return;
            }
          } catch {}
        }
      })()
    );
    // Public
    if (ref) {
      tasks.push(
        (async () => {
          try {
            const pub = await fetchPublicReceipt(orderId, ref);
            if (pub) {
              settle(pub);
            }
          } catch {}
        })()
      );
    }

    await Promise.allSettled(tasks);
    if (!resolved) {
      setOrderLoading(false);
      setFetchError("خطا در دریافت سفارش");
    }
  };

  const formatCurrency = (n: number) =>
    `${(n || 0).toLocaleString("fa-IR")} تومان`;

  const faType = (t?: string) => {
    switch (t) {
      case "DELIVERY":
        return "ارسال به آدرس";
      case "TAKEOUT":
        return "دریافت حضوری";
      case "DINE_IN":
        return "سرو در رستوران";
      default:
        return "نوع سفارش";
    }
  };

  const faStatus = (s?: string) => {
    switch (s) {
      case "WAITING":
        return "در انتظار تایید";
      case "COOKING":
        return "در حال آماده‌سازی";
      case "SENT":
        return "تحویل شد";
      case "SELECTING":
        return "در حال انتخاب";
      case "CANCELLED":
        return "لغو شده";
      default:
        return s || "";
    }
  };

  const getStatusIcon = () => {
    if (loading) {
      return <ClockIcon className="w-16 h-16 text-blue-500 animate-spin" />;
    }

    switch (paymentStatus) {
      case "success":
        return <CheckCircleIcon className="w-16 h-16 text-green-500" />;
      case "failed":
        return <XCircleIcon className="w-16 h-16 text-red-500" />;
      default:
        return order ? (
          <CheckCircleIcon className="w-16 h-16 text-green-500" />
        ) : (
          <PackageIcon className="w-16 h-16 text-blue-500" />
        );
    }
  };

  const getStatusMessage = () => {
    if (loading) {
      return "در حال بررسی پرداخت...";
    }

    switch (paymentStatus) {
      case "success":
        return "پرداخت با موفقیت انجام شد";
      case "failed":
        return "پرداخت ناموفق بود. لطفا دوباره تلاش کنید.";
      default:
        return order ? "سفارش شما ثبت شد!" : "در حال پردازش...";
    }
  };

  const getStatusColor = () => {
    if (loading) return "text-blue-600";

    switch (paymentStatus) {
      case "success":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return order ? "text-green-600" : "text-blue-600";
    }
  };

  // If payment was reported success but order still not fetched, keep a gentle pending UI
  if (
    !order &&
    !loading &&
    paymentStatus !== "failed" &&
    paymentStatus !== "success"
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <PackageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            سفارشی یافت نشد
          </h2>
          <p className="text-gray-600">
            لطفا به صفحه اصلی برگردید و دوباره سفارش دهید.
          </p>
          {fetchError && (
            <>
              <p className="text-red-500 text-sm mt-4">{fetchError}</p>
              <button
                disabled={retrying}
                onClick={async () => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const retryOrderId = urlParams.get("orderId");
                  if (!retryOrderId) return;
                  setRetrying(true);
                  try {
                    const retryData = await fetchOrderById(retryOrderId);
                    setOrder(retryData);
                    setFetchError("");
                  } catch (e: any) {
                    setFetchError(e?.message || "خطا در دریافت سفارش");
                  } finally {
                    setRetrying(false);
                  }
                }}
                className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                تلاش مجدد
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-lg w-full text-center">
        {/* Status Icon */}
        <div className="mb-4">{getStatusIcon()}</div>

        {/* Status Message */}
        <h1 className={`text-2xl font-bold mb-2 ${getStatusColor()}`}>
          {getStatusMessage()}
        </h1>

        {/* Friendly thanks */}
        {paymentStatus === "success" && (
          <p className="text-gray-600 mb-4">
            از خرید شما سپاسگزاریم. سفارش شما با موفقیت ثبت شد و رسید پرداخت
            دریافت گردید.
          </p>
        )}

        {/* Reference ID and loading indicator */}
        {paymentStatus === "success" && (
          <div className="mb-4 space-y-2">
            {refId && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  کد پیگیری: <span className="font-mono">{refId}</span>
                </p>
              </div>
            )}
            {orderLoading && (
              <div className="text-xs text-gray-500">
                در حال دریافت جزئیات سفارش...
              </div>
            )}
          </div>
        )}

        {/* Order Details */}
        {order && (
          <div className="space-y-4 text-right">
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-800 mb-3">جزئیات سفارش</h3>
              <div className="grid grid-cols-2 gap-y-1 text-sm text-gray-700">
                <div>شماره سفارش</div>
                <div className="font-medium">
                  # {order.orderNumber || order.id.slice(-6)}
                </div>
                <div>تاریخ</div>
                <div>
                  {new Date(order.date).toLocaleDateString("fa-IR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div>زمان</div>
                <div>{new Date(order.date).toLocaleTimeString("fa-IR")}</div>
                {order.type && (
                  <>
                    <div>نوع سفارش</div>
                    <div>{faType(order.type)}</div>
                  </>
                )}
                {order.type === "TAKEOUT" && (
                  <>
                    <div>زمان آماده‌سازی</div>
                    <div>حدود ۱۵ تا ۲۰ دقیقه</div>
                  </>
                )}
                {order.status && (
                  <>
                    <div>وضعیت</div>
                    <div>{faStatus(order.status)}</div>
                  </>
                )}
              </div>
            </div>

            {/* What's Next */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-2">گام بعدی</h4>
              <p className="text-sm text-gray-700 leading-6">
                سفارش شما در حال آماده‌سازی است. به محض آماده شدن، پیامک
                اطلاع‌رسانی برای{" "}
                <span className="font-mono">
                  {order.contactPhone || "شماره شما"}
                </span>{" "}
                ارسال می‌شود.
              </p>
            </div>

            {/* Customer Info */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-2">
                اطلاعات مشتری
              </h4>
              <div className="space-y-1 text-sm text-gray-700">
                {order.customerName && <div>نام: {order.customerName}</div>}
                {order.contactPhone && (
                  <div>
                    شماره تماس:{" "}
                    <span className="font-mono">{order.contactPhone}</span>
                  </div>
                )}
                {order.type === "DELIVERY" && (
                  <div>
                    آدرس تحویل:{" "}
                    <span className="leading-6">
                      {order.deliveryAddress || "-"}
                    </span>
                  </div>
                )}
                {order.type === "DINE_IN" && <div>محل سرو: رستوران</div>}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-800 mb-2">اقلام سفارش:</h4>
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm text-gray-700"
                >
                  <span className="font-mono">{item.quantity}x</span>
                  <span>{item.name}</span>
                  <span className="font-mono">
                    {formatCurrency(item.priceAtTimeOfOrder * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              {typeof order.subtotal === "number" && (
                <div className="flex justify-between text-sm text-gray-700">
                  <span>جمع اقلام</span>
                  <span className="font-mono">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
              )}
              {/* Optional tax placeholder if needed in future */}
              {typeof order.discount === "number" && order.discount > 0 && (
                <div className="flex justify-between text-sm text-gray-700">
                  <span>تخفیف</span>
                  <span className="font-mono">
                    -{formatCurrency(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base md:text-lg">
                <span>مجموع:</span>
                <span className="font-mono">{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Visit Us */}
            <div className="border-t pt-4 text-sm text-gray-600">
              <div className="font-semibold text-gray-800 mb-1">
                مراجعه به ما
              </div>
              <div className="font-medium">
                {settings?.name || defaultBiz.name}
              </div>
              {settingsLoading ? (
                <div className="animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-56 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-48 mb-1"></div>
                </div>
              ) : (
                <>
                  <div>آدرس: {settings?.address || defaultBiz.address}</div>
                  <div>
                    ساعات کاری:{" "}
                    {settings?.openingHours || defaultBiz.openingHours}
                  </div>
                </>
              )}
              <div className="mt-2 text-gray-500">
                منتظر دیدار شما هستیم — نوش جان!
              </div>
            </div>

            {/* Business Info */}
            <div className="border-t pt-4 text-sm text-gray-600">
              <div className="font-semibold text-gray-800 mb-1">
                {settings?.name || defaultBiz.name}
              </div>
              {settingsLoading ? (
                <div className="animate-pulse">
                  <div className="h-3.5 bg-gray-200 rounded w-40 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-56 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-48 mb-1"></div>
                  <div className="h-3 bg-gray-100 rounded w-32"></div>
                </div>
              ) : (
                <>
                  <div>آدرس: {settings?.address || defaultBiz.address}</div>
                  <div>
                    ساعات کاری:{" "}
                    {settings?.openingHours || defaultBiz.openingHours}
                  </div>
                  {settings?.contactPhone && (
                    <div>تماس: {settings.contactPhone}</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          {paymentStatus === "failed" && order && (
            <button
              onClick={() => onNavigate("checkout")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              تلاش مجدد پرداخت
            </button>
          )}

          {!order && (
            <button
              onClick={() => {
                const urlParams = new URLSearchParams(window.location.search);
                const oid = urlParams.get("orderId");
                if (oid) fetchBestEffort(oid);
              }}
              className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg hover:bg-blue-100 transition-colors"
            >
              تلاش مجدد دریافت جزئیات
            </button>
          )}

          <button
            onClick={() => onNavigate("home")}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
