"use client";

import { useState, useCallback, useEffect } from "react";

export function usePhotoUpload() {
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const filesArray = Array.from(e.target.files);
    setNewFiles((prev) => [...prev, ...filesArray]);
    const previews = filesArray.map((file) => URL.createObjectURL(file));
    setNewFilePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  }, []);

  const removeNewFile = useCallback((index: number) => {
    setNewFilePreviews((prev) => {
      if (prev[index]) {
        URL.revokeObjectURL(prev[index]);
      }
      return prev.filter((_, i) => i !== index);
    });
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearNewFiles = useCallback(() => {
    newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    setNewFiles([]);
    setNewFilePreviews([]);
  }, [newFilePreviews]);

  useEffect(() => {
    return () => {
      newFilePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newFilePreviews]);

  return {
    newFiles,
    newFilePreviews,
    handleFileChange,
    removeNewFile,
    clearNewFiles,
  };
}
