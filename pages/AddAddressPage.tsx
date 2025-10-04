import React from "react";
import { Page } from "../App";
import { ArrowRightIcon } from "../components/icons/Icons";
import LocationPicker from "../components/LocationPicker";
import ModalSheet from "../components/ModalSheet";

interface AddAddressPageProps {
  onNavigate: (page: Page) => void;
  onAddAddress: (address: string) => void;
}

export const AddAddressPage: React.FC<AddAddressPageProps> = ({
  onNavigate,
  onAddAddress,
}) => {
  const [address, setAddress] = React.useState("");
  const [showPicker, setShowPicker] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim()) {
      onAddAddress(address.trim());
      onNavigate("checkout");
    }
  };

  return (
    <div className="bg-black min-h-screen text-white p-4">
      <header className="flex items-center mb-6">
        <button onClick={() => onNavigate("checkout")} className="p-2">
          <ArrowRightIcon />
        </button>
        <h1 className="text-xl font-bold flex-grow text-center">
          افزودن آدرس جدید
        </h1>
        <div className="w-10"></div>
      </header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-300"
          >
            آدرس
          </label>
          <div className="flex gap-2">
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
              placeholder="آدرس کامل خود را وارد کنید"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="whitespace-nowrap bg-gray-800 border border-gray-600 rounded-lg px-3 text-sm hover:border-gray-400"
            >
              انتخاب روی نقشه
            </button>
          </div>
          <ModalSheet
            open={showPicker}
            onClose={() => setShowPicker(false)}
            title="انتخاب موقعیت روی نقشه"
          >
            <LocationPicker
              onConfirm={({ address }) => {
                setAddress(address);
                setShowPicker(false);
              }}
              onCancel={() => setShowPicker(false)}
            />
          </ModalSheet>
        </div>
        <footer className="fixed bottom-0 right-0 left-0 bg-gray-900 p-4 border-t border-gray-700">
          <div className="max-w-md mx-auto">
            <button
              type="submit"
              className="w-full bg-green-500 text-black font-bold py-3 px-8 rounded-lg text-base"
            >
              ذخیره آدرس
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};
