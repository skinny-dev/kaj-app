import React, { useEffect } from "react";

interface ModalSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
}

// Prevent body scroll when modal is open
const useScrollLock = (locked: boolean) => {
  useEffect(() => {
    const original = document.body.style.overflow;
    if (locked) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
};

const ModalSheet: React.FC<ModalSheetProps> = ({ open, onClose, title, children, fullScreen }) => {
  useScrollLock(open);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[1000] ${fullScreen ? "flex items-stretch" : "flex items-end md:items-center"} justify-center bg-black/60`}
      aria-modal="true"
      role="dialog"
    >
      {/* Clickable backdrop */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* Container: bottom sheet on mobile, modal on desktop */}
  <div className={`relative w-full ${fullScreen ? "h-[100vh] md:h-auto" : ""} md:w-[720px] max-w-full bg-gray-900 border border-gray-700 ${fullScreen ? "rounded-none md:rounded-2xl" : "rounded-t-2xl md:rounded-2xl"} shadow-xl overflow-hidden animate-[slideUp_200ms_ease-out] md:animate-none flex flex-col`}>
        {/* Drag handle for mobile */}
        <div className="md:hidden flex justify-center py-2">
          <div className="h-1.5 w-12 rounded-full bg-gray-600" />
        </div>

        {/* Header */}
        {(title || true) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="text-white font-semibold text-base">{title || ""}</h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="text-gray-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div
          className={`px-4 py-3 flex flex-col ${fullScreen ? "flex-1 min-h-0" : ""} overflow-auto`}
          style={{
            // Respect iOS safe areas
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
            paddingTop: fullScreen ? "max(env(safe-area-inset-top, 0px), 8px)" : undefined,
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(8%); opacity: 0.9; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ModalSheet;
