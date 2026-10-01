import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type MenuLink = { href: string; label: string; icon: IconName; current: boolean; count?: number }

// Phone-width home for the destinations the desktop sidebar lists under Configurations, Community and Help.
export function MobileMenu({ route, selectedCount, admin }: { route: string; selectedCount: number; admin: boolean }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() } }
    window.addEventListener('hashchange', close)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('hashchange', close); window.removeEventListener('keydown', onKey) }
  }, [open])
  const groups: MenuLink[][] = [
    [{ href: '#configuration', label: 'Configuration', icon: 'sliders', current: route === 'configuration', count: selectedCount }],
    [
      { href: '#submit', label: 'Submit a module', icon: 'plus', current: route.startsWith('submit') },
      { href: '#activity', label: 'Your activity', icon: 'message', current: route === 'activity' },
      ...(admin ? [{ href: '#admin', label: 'Admin workspace', icon: 'shield' as const, current: route === 'admin' || route === 'review' }] : []),
    ],
    [{ href: '#faq', label: 'FAQ & flashing guide', icon: 'help', current: route === 'faq' }],
  ]
  return (
    <div className="mobile-menu">
      <button ref={buttonRef} type="button" className="mobile-menu-button" aria-label="Menu" aria-expanded={open} aria-controls="mobile-menu-panel" onClick={() => setOpen(value => !value)}><Icon name={open ? 'close' : 'menu'} size={20} /></button>
      {open && <>
        <div className="mobile-menu-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
        <nav id="mobile-menu-panel" className="mobile-menu-panel" aria-label="Menu">
          {groups.map((links, index) => <div key={index} className="mobile-menu-group">{links.map(link => <a key={link.href} href={link.href} aria-current={link.current ? 'page' : undefined} onClick={() => setOpen(false)}><Icon name={link.icon} size={18} /><span>{link.label}</span>{link.count !== undefined && <small>{link.count}</small>}</a>)}</div>)}
        </nav>
      </>}
    </div>
  )
}
