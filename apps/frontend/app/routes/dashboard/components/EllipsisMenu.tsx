import { useState, useRef, useEffect } from 'react';
import styles from './EllipsisMenu.module.css';

interface EllipsisMenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}

interface EllipsisMenuProps {
  items: EllipsisMenuItem[];
}

export function EllipsisMenu({ items }: EllipsisMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={styles.ellipsisContainer}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={styles.ellipsisBtn}
      >⋯</button>

      {open && (
        <div className={styles.ellipsisMenu}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              className={item.danger ? styles.ellipsisMenuItemDanger : styles.ellipsisMenuItem}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
