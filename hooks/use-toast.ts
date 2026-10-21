"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ToastMessage } from "@/components/ui/toast-notification";

export function useToast(autoCloseMs = 4000) {
  const [notification, setNotification] = useState<ToastMessage | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setNotification({ type, message });
      timerRef.current = setTimeout(() => {
        setNotification(null);
        timerRef.current = null;
      }, autoCloseMs);
    },
    [autoCloseMs]
  );

  const clearNotification = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setNotification(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { notification, showNotification, clearNotification };
}
