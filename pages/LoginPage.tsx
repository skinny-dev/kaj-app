import React, { useState } from "react";
import type { Page } from "../App";
import { ArrowRightIcon, UserIcon } from "../components/icons/Icons";

interface LoginPageProps {
  onNavigate: (page: Page) => void;
  onRequestOtp: (phone: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigate,
  onRequestOtp,
}) => {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{11}$/.test(phone)) {
      setError("شماره تماس باید ۱۱ رقمی باشد.");
      return;
    }

    setIsLoading(true);
    try {
      await onRequestOtp(phone);
    } catch (error) {
      setError("خطا در ارسال کد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen text-white flex flex-col">
      <header className="flex items-center justify-between p-4">
        <button onClick={() => onNavigate("home")} className="p-2">
          <ArrowRightIcon />
        </button>
        <h1 className="text-xl font-bold">ورود / ثبت‌نام</h1>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <UserIcon />
            </div>
            <h2 className="text-2xl font-bold mb-2">خوش آمدید!</h2>
            <p className="text-gray-400">
              برای ورود یا ثبت‌نام، شماره موبایل خود را وارد کنید.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                شماره موبایل
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError("");
                }}
                maxLength={11}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white text-center text-lg"
                placeholder="09123456789"
                dir="ltr"
                autoFocus
                disabled={isLoading}
              />
              {error && (
                <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 text-black font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
              )}
              {isLoading ? "در حال ارسال..." : "ارسال کد تأیید"}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center">
            با ورود یا ثبت‌نام، شما قوانین و مقررات ما را می‌پذیرید.
          </p>
        </div>
      </div>
    </div>
  );
};
