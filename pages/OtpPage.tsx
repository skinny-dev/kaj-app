import React, { useState, useRef, useEffect } from "react";
import type { Page } from "../App";
import { useAuth } from "../context/AuthContext";

interface OtpPageProps {
  onSuccess: () => void;
  phoneNumber: string;
  onNavigate: (page: Page) => void;
}

export const OtpPage: React.FC<OtpPageProps> = ({
  onSuccess,
  phoneNumber,
  onNavigate,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { login } = useAuth();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    if (element.nextSibling && element.value) {
      (element.nextSibling as HTMLInputElement).focus();
    }

    const joinedOtp = newOtp.join("");
    if (joinedOtp.length === 6) {
      handleSubmit(joinedOtp);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Backspace" && !otp[index] && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (/^\d{6}$/.test(pastedText)) {
      e.preventDefault();
      const newOtp = pastedText.split("");
      setOtp(newOtp);
      handleSubmit(pastedText);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (finalOtp: string) => {
    if (finalOtp.length !== 6 || isVerifying) return;

    setIsVerifying(true);
    setError("");

    try {
      await login(phoneNumber, finalOtp); // Don't pass pendingName - let name be null
      onSuccess();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "کد تایید وارد شده صحیح نمی‌باشد.";
      setError(errorMessage);
      setOtp(new Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">کد تایید را وارد کنید</h1>
        <p className="text-gray-400 mb-8">
          کد ۶ رقمی ارسال شده به شماره {phoneNumber} را وارد کنید.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(otp.join(""));
          }}
        >
          <div className="flex justify-center gap-2 mb-4" dir="ltr">
            {otp.map((data, index) => (
              <input
                key={index}
                type="tel"
                value={data}
                maxLength={1}
                disabled={isVerifying}
                onChange={(e) => handleChange(e.target, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={handlePaste}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                className="w-12 h-14 bg-gray-800 border border-gray-600 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              />
            ))}
          </div>

          {isVerifying && (
            <p className="text-green-400 text-sm mt-4">در حال بررسی...</p>
          )}
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <button
            type="button"
            onClick={() => onNavigate("login")}
            className="mt-8 text-gray-400 hover:text-white disabled:opacity-50"
            disabled={isVerifying}
          >
            ویرایش شماره موبایل
          </button>
        </form>
      </div>
    </div>
  );
};
