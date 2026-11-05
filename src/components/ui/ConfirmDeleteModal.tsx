import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal.tsx';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  itemName: string;
  description?: string;
  loading?: boolean;
  error?: string | null;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  description,
  loading = false,
  error = null,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-[#172B4D]">
              Tem certeza que deseja excluir{' '}
              <span className="text-red-700 font-bold">"{itemName}"</span>?
            </p>
            <p className="text-[#64748B] leading-relaxed">
              {description ||
                'Esta ação é permanente e será registrada no log de auditoria do sistema.'}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-xs font-medium text-[#172B4D] hover:bg-[#F5F8FC] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {loading ? 'Excluindo...' : 'Confirmar Exclusão'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
