import { createPortal } from 'react-dom'
import { useToast } from '../../../context/ToastContext'
import s from './Toast.module.css'
export function ToastContainer() {
  const { toasts } = useToast()
  if (toasts.length === 0) return null
  return createPortal(
    <div className={s.container}>{toasts.map(t => <div key={t.id} className={`${s.toast} ${s[t.type]}`}>{t.message}</div>)}</div>,
    document.body
  )
}
