import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', () => setOpen(false), { capture: true, once: true });
    return () => document.removeEventListener('mousedown', handler);
  }, [open, updatePosition]);

  return (
    <div className={styles.ellipsisContainer}>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={styles.ellipsisBtn}
      >⋯</button>

      {open && createPortal(
        <div className={styles.ellipsisMenu} style={menuStyle}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              className={item.danger ? styles.ellipsisMenuItemDanger : styles.ellipsisMenuItem}
            >{item.label}</button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
