import { useAppContext } from '../../../context/AppContext'
import { useModal } from '../../../context/ModalContext'
import { EmployeeForm } from './EmployeeForm/EmployeeForm'
import { EmployeeCard } from './EmployeeCard/EmployeeCard'

export function Employees() {
  const { state } = useAppContext()
  const { open } = useModal()
  const openNew = () => open('Novo Funcionário', <EmployeeForm onClose={() => {}} />)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Funcionários</div>
          <div className="page-subtitle">{state.employees.length} cadastrado(s)</div>
        </div>
        <button className="btn btn-primary no-print" onClick={openNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Funcionário
        </button>
      </div>
      {state.employees.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <h3>Nenhum funcionário</h3>
          <p>Clique em "Novo Funcionário" para começar.</p>
          <button className="btn btn-primary" onClick={openNew}>Novo Funcionário</button>
        </div>
      ) : (
        <div className="employee-grid">
          {state.employees.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
        </div>
      )}
    </div>
  )
}
