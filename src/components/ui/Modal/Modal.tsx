import { createPortal } from 'react-dom'
import { useModal } from '../../../context/ModalContext'
import s from './Modal.module.css'
export function Modal() {
  const { state, close } = useModal()
  if (!state.isOpen) return null
  return createPortal(
    <div className={s.overlay} onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className={`${s.modal} ${state.large ? s.large : ''}`}>
        <div className={s.header}><h3 className={s.title}>{state.title}</h3><button className={s.close} onClick={close}>&times;</button></div>
        <div className={s.body}>{state.content}</div>
      </div>
    </div>,
    document.body
  )
}
