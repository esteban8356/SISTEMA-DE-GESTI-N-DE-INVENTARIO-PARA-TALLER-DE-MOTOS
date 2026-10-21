"use client";

import { Modal } from "./modal";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemDescription: string;
  loading?: boolean;
  warningText?: string;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Eliminación",
  itemDescription,
  loading = false,
  warningText = "Esta acción también borrará sus fotos asociadas en storage.",
}: ConfirmDeleteModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
      maxWidth="md"
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          ¿Estás seguro de que deseas eliminar permanentemente{" "}
          <span className="font-bold text-foreground">"{itemDescription}"</span>?{" "}
          {warningText}
        </p>

        <div className="flex justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl border hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
