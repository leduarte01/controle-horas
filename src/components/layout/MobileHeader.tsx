import s from './MobileHeader.module.css'
export function MobileHeader({ onHamburger }: { onHamburger: () => void }) {
  return (
    <header className={s.header}>
      <button className={s.hamburger} onClick={onHamburger}><span/><span/><span/></button>
      <span className={s.title}>Controle de Horas</span>
    </header>
  )
}
