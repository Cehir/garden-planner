import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
}

/** Seitenleiste als Overlay auf kleinen Bildschirmen; Klick neben den Inhalt schließt sie. */
export default function MobileSidebar({ onClose, children }: Props) {
  return (
    <div
      className="sidebar mobile-open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button className="close-btn" onClick={onClose}>✕</button>
      {children}
    </div>
  )
}
