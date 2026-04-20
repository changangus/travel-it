import styles from './EmptyState.module.css';

export function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>✈️</div>
      <h2 className={styles.emptyStateTitle}>
        No trips yet
      </h2>
      <p className={styles.emptyStateText}>
        Your itineraries will appear here once you add your first trip.
      </p>
    </div>
  );
}
