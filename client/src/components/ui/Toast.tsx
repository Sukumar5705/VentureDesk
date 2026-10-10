import { X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useToast, type Toast } from '../../contexts/ToastContext';
import styles from './Toast.module.css';

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const icons = {
    success: <CheckCircle2 size={16} aria-hidden="true" />,
    error: <XCircle size={16} aria-hidden="true" />,
    warning: <AlertCircle size={16} aria-hidden="true" />,
  };
  return (
    <div className={`${styles.toast} ${styles[toast.type]}`} role="alert" aria-live="assertive">
      <span className={styles.icon}>{icons[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={() => removeToast(toast.id)} aria-label="Close notification">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div className={styles.container} aria-label="Notifications">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}
