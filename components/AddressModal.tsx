import React, { useMemo, useState } from "react";
import { validateZone } from "../services/api";
import ModalSheet from "./ModalSheet";
import LocationPicker from "./LocationPicker";
import StepMap from "./StepMap";

interface AddressModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    address: string;
    details?: string;
    title?: string;
    phone?: string;
    lat?: number;
    lng?: number;
  }) => void;
  initialPhone?: string; // used for save payload only; no input field
  onZoneBlocked?: (message: string) => void;
}

async function reverseGeocodeOSM(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fa`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "fa,fa-IR;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error("osm http error");
    const data = await res.json();
    const addr = (data.display_name || "").toString();
    return addr || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

// Reverse geocode: try Neshan (if key), else fall back to OSM, else coordinates
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = (import.meta as any)?.env?.VITE_NESHAN_API_KEY as
    | string
    | undefined;
  if (!key) return reverseGeocodeOSM(lat, lng);
  try {
    const res = await fetch(
      `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`,
      {
        headers: { "Api-Key": key },
      }
    );
    if (!res.ok) throw new Error("neshan http error");
    const data = await res.json();
    const addr = (data.formatted_address || data.address || "").toString();
    return addr || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return reverseGeocodeOSM(lat, lng);
  }
}

const DEFAULT_CENTER = { lat: 35.699739, lng: 51.338097 };

const AddressModal: React.FC<AddressModalProps> = ({
  open,
  onClose,
  onSave,
  initialPhone,
  onZoneBlocked,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [address, setAddress] = useState("");
  const [details, setDetails] = useState("");
  const [plaque, setPlaque] = useState("");
  const [unit, setUnit] = useState("");
  const [title, setTitle] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    DEFAULT_CENTER
  );
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const allowedAreas =
    "چهاردانگه، شهرک قدس، شهرک مطهری، گلشهر، ماهشر، گلدسته، حسین آباد";

  // Require both address and title
  const canSave = useMemo(() => !!address && !!title.trim(), [address, title]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapCenter(next); // triggers map re-init to center there
        setCoords(next);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleConfirmPosition = async () => {
    const lat = coords.lat ?? mapCenter.lat;
    const lng = coords.lng ?? mapCenter.lng;
    if (lat == null || lng == null) return;
    setConfirming(true);
    try {
      const addr = await reverseGeocode(lat, lng);
      setAddress(addr);
      setCoords({ lat, lng });
      setStep(2);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      title={step === 1 ? "انتخاب موقعیت" : "افزودن آدرس جدید"}
      fullScreen={step === 1}
    >
      <div className="space-y-4">
        {step === 1 ? (
          <div className="flex flex-col gap-3 min-h-0">
            <p className="text-xs text-gray-400 pr-1">
              نشانگر را بکشید یا روی نقشه بزنید.
            </p>
            <div
              className="relative flex-1 min-h-[420px]"
              style={{ height: "calc(100dvh - 220px)" }}
            >
              <StepMap
                center={{
                  lat: coords.lat ?? mapCenter.lat,
                  lng: coords.lng ?? mapCenter.lng,
                }}
                onChange={(pos) => setCoords(pos)}
                className="absolute inset-0"
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="absolute top-4 right-4 z-[2] w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-all duration-200"
                title="استفاده از موقعیت فعلی من"
              >
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                </svg>
              </button>
            </div>
            <div className="sticky bottom-0 bg-gray-900 pt-1">
              <button
                type="button"
                className="w-full bg-green-500 text-black font-bold rounded-lg py-3 disabled:opacity-60"
                onClick={handleConfirmPosition}
                disabled={confirming}
              >
                {confirming ? "در حال دریافت نشانی..." : "ثبت موقعیت"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-800"
              style={{ height: 220 }}
            >
              <div
                className="pointer-events-none"
                style={{ pointerEvents: "none" }}
              >
                <LocationPicker
                  hideHeader
                  hideConfirmButton
                  readOnly
                  initialCenter={{
                    lat: coords.lat || DEFAULT_CENTER.lat,
                    lng: coords.lng || DEFAULT_CENTER.lng,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="absolute top-3 left-3 z-[50] bg-white/95 hover:bg-white text-black rounded-full shadow px-4 py-2 text-sm flex items-center gap-2"
              >
                ویرایش موقعیت ✎
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-300">نشانی</label>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-100 rounded px-3 py-1"
                  >
                    ویرایش موقعیت
                  </button>
                </div>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 pr-9 text-white"
                  placeholder="برای اطمینان آدرس را چک کرده و در صورت مغایرت، آن را اصلاح کنید."
                />
                {address && (
                  <button
                    type="button"
                    onClick={() => setAddress("")}
                    aria-label="clear"
                    className="absolute right-2 top-8 text-gray-300 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  جزئیات آدرس
                </label>
                <div className="flex gap-2">
                  <input
                    value={plaque}
                    onChange={(e) => setPlaque(e.target.value)}
                    className="w-1/2 bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                    placeholder="پلاک"
                  />
                  <input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-1/2 bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                    placeholder="واحد"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  عنوان آدرس <span className="text-red-400">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white"
                  placeholder="مثال: خانه، محل کار"
                />
                {!title.trim() && (
                  <p className="text-xs text-red-400 mt-1">
                    وارد کردن عنوان آدرس الزامی است.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-800 border border-gray-600 text-white rounded-lg py-3"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (saving) return;
                  setSaving(true);
                  try {
                    setZoneError(null);
                    const lat = coords.lat ?? mapCenter.lat;
                    const lng = coords.lng ?? mapCenter.lng;
                    const vr = await validateZone(lat, lng);
                    if (vr && vr.allowed === false) {
                      const msg =
                        vr.reason || "این آدرس خارج از محدوده ارسال است.";
                      setZoneError(
                        `${msg} محدوده‌های قابل سرویس: ${allowedAreas}`
                      );
                      try {
                        onZoneBlocked?.(
                          `${msg} محدوده‌های قابل سرویس: ${allowedAreas}`
                        );
                      } catch {}
                      return;
                    }
                    const combinedDetails = [
                      plaque && `پلاک ${plaque}`,
                      unit && `واحد ${unit}`,
                    ]
                      .filter(Boolean)
                      .join("، ");
                    const finalDetails = details || combinedDetails;
                    await Promise.resolve(
                      onSave({
                        address,
                        details: finalDetails,
                        title,
                        phone: initialPhone,
                        ...coords,
                      })
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex-1 bg-green-500 text-black font-bold rounded-lg py-3 disabled:opacity-60"
                disabled={!canSave || saving}
              >
                {saving ? "در حال ذخیره..." : "ثبت آدرس"}
              </button>
            </div>
            {zoneError && (
              <div className="mt-2 p-3 rounded-md bg-red-900/40 border border-red-700 text-red-200 text-sm">
                {zoneError}
              </div>
            )}
          </>
        )}
      </div>
    </ModalSheet>
  );
};

export default AddressModal;
