import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';

type ConfirmDeleteModalProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  title,
  description,
  confirmLabel = 'Delete',
  isDeleting = false,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border border-[#F9A8D4] bg-white shadow-2xl shadow-[#111827]/20">
        <div className="flex items-start justify-between gap-4 border-b border-[#FCE7F3] px-5 py-4">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base text-[#111827]" style={{ fontWeight: 700 }}>{title}</h2>
              <p className="mt-1 text-sm leading-5 text-[#6B7280]">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg p-1.5 text-[#9CA3AF] transition-all hover:bg-[#F9FAFB] hover:text-[#374151] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm text-[#374151] transition-all hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isDeleting ? 'Deleting...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
