import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div
      onClick={onCancel}
      className={styles.confirmBackdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.confirmPanel}
      >
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button
            onClick={onCancel}
            className={styles.confirmCancelBtn}
          >Cancel</button>
          <button
            onClick={onConfirm}
            className={styles.confirmDeleteBtn}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}
