"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastMessage {
  type: "success" | "error";
  message: string;
}

interface ToastNotificationProps {
  notification: ToastMessage | null;
  onClose: () => void;
}

export function ToastNotification({ notification, onClose }: ToastNotificationProps) {
  if (!notification) return null;

  const isSuccess = notification.type === "success";

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5 ${
        isSuccess
          ? "bg-emerald-950/90 text-emerald-200 border-emerald-700/60"
          : "bg-rose-950/90 text-rose-200 border-rose-700/60"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
      )}
      <span>{notification.message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-0.5 rounded hover:bg-white/10 transition-colors"
        title="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
