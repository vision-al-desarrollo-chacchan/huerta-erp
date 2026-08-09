import { useEffect, useMemo, useState } from 'react';
import {
  activateEmployeeByPin,
  configureEmployeePin,
  createInvitation,
  getEmployees,
  getInvitations,
  getMembers,
  removeEmployeePin,
  setMember,
  type Employee,
  type Invitation,
  type Member,
} from '../services/erp-store';
import { getActiveOperator, type ActiveOperator } from '../services/operator-session';

const cls = 'rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600';
const errorMessage = (reason: unknown, fallback: string) => typeof reason === 'object' && reason !== null && 'message' in reason && typeof reason.message === 'string' ? reason.message : fallback;
const roles: { value: ActiveOperator['role']; label: string }[] = [
  { value: 'cajero', label: 'Cajero' },
  { value: 'mozo', label: 'Mozo / vendedor' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'supervisor', label: 'Supervisor' },
];

export default function Usuarios() {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', rol: 'administrador' });
  const [pinForm, setPinForm] = useState<{ employeeId: string; role: ActiveOperator['role']; pin: string }>({ employeeId: '', role: 'cajero', pin: '' });
  const [switchForm, setSwitchForm] = useState({ employeeId: '', pin: '' });
  const [activeOperator, setActiveOperatorState] = useState(getActiveOperator());

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.estado === 'activo'), [employees]);

  const load = async () => {
    const [memberRows, invitationRows, employeeRows] = await Promise.all([getMembers(), getInvitations(), getEmployees()]);
    setMembers(memberRows);
    setInvites(invitationRows);
    setEmployees(employeeRows);
    setPinForm((current) => ({ ...current, employeeId: current.employeeId || employeeRows.find((row) => row.estado === 'activo')?.id || '' }));
    setSwitchForm((current) => ({ ...current, employeeId: current.employeeId || employeeRows.find((row) => row.pin_actualizado_at)?.id || '' }));
  };

  useEffect(() => {
    void Promise.all([getMembers(), getInvitations(), getEmployees()])
      .then(([memberRows, invitationRows, employeeRows]) => {
        setMembers(memberRows);
        setInvites(invitationRows);
        setEmployees(employeeRows);
        setPinForm((current) => ({ ...current, employeeId: current.employeeId || employeeRows.find((row) => row.estado === 'activo')?.id || '' }));
        setSwitchForm((current) => ({ ...current, employeeId: current.employeeId || employeeRows.find((row) => row.pin_actualizado_at)?.id || '' }));
      })
      .catch((reason) => setError(errorMessage(reason, 'No se pudieron cargar los accesos.')));
  }, []);

  const invite = async () => {
    if (!/^\S+@\S+\.\S+$/.test(inviteForm.email)) return setError('Ingresa un correo real y válido.');
    setSaving(true);
    try {
      const row = await createInvitation(inviteForm.email, inviteForm.rol);
      setNotice(`Invitación creada. Código: ${row.token}`);
      setInviteForm((current) => ({ ...current, email: '' }));
      setError('');
      await load();
    } catch (reason) {
      setError(errorMessage(reason, 'No se pudo crear la invitación.'));
    } finally {
      setSaving(false);
    }
  };

  const savePin = async () => {
    if (!pinForm.employeeId) return setError('Selecciona un trabajador activo.');
    if (!/^\d{6}$/.test(pinForm.pin)) return setError('El PIN debe tener exactamente 6 números.');
    setSaving(true);
    try {
      await configureEmployeePin(pinForm.employeeId, pinForm.role, pinForm.pin);
      setNotice('PIN guardado de forma protegida. Ya puedes activar a ese trabajador en este equipo.');
      setPinForm((current) => ({ ...current, pin: '' }));
      setError('');
      await load();
    } catch (reason) {
      setError(errorMessage(reason, 'No se pudo configurar el PIN.'));
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!switchForm.employeeId || !/^\d{6}$/.test(switchForm.pin)) return setError('Selecciona un trabajador e ingresa su PIN de 6 números.');
    setSaving(true);
    try {
      const operator = await activateEmployeeByPin(switchForm.employeeId, switchForm.pin);
      setActiveOperatorState(operator);
      setSwitchForm((current) => ({ ...current, pin: '' }));
      setNotice(`Operador activo: ${operator.name} · ${operator.role}`);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason, 'PIN incorrecto.'));
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-6 p-6">
    <div>
      <h1 className="text-3xl font-black text-slate-950">Usuarios y roles</h1>
      <p className="font-medium text-slate-600">Correo para acceso remoto y PIN rápido para el personal del local.</p>
    </div>

    {error && <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">{notice}</div>}

    <section className="rounded-2xl border bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-black">Operador de este equipo</h2><p className="text-sm font-medium text-slate-500">Para caja, mozos y cocina en una computadora o tablet autorizada.</p></div>
        <span className={`rounded-full px-4 py-2 text-sm font-black ${activeOperator ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
          {activeOperator ? `${activeOperator.name} · ${activeOperator.role}` : 'Administrador conectado'}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
        <select className={cls} value={switchForm.employeeId} onChange={(event) => setSwitchForm({ ...switchForm, employeeId: event.target.value })}>
          <option value="">Seleccionar trabajador con PIN</option>
          {activeEmployees.filter((employee) => employee.pin_actualizado_at).map((employee) => <option key={employee.id} value={employee.id}>{employee.nombres} {employee.apellidos} · {employee.acceso_rol}</option>)}
        </select>
        <input className={cls} type="password" inputMode="numeric" maxLength={6} placeholder="PIN de 6 números" value={switchForm.pin} onChange={(event) => setSwitchForm({ ...switchForm, pin: event.target.value.replace(/\D/g, '').slice(0, 6) })} />
        <button disabled={saving} onClick={() => void activate()} className="rounded-xl bg-slate-950 py-3 font-black text-white disabled:opacity-50">Activar operador</button>
      </div>
    </section>

    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-black">Crear o cambiar PIN de trabajador</h2>
      <p className="mb-4 text-sm font-medium text-slate-500">Primero registra al trabajador en Recursos Humanos. El PIN no se mostrará nuevamente.</p>
      <div className="grid gap-4 md:grid-cols-[1fr_220px_220px_220px]">
        <select className={cls} value={pinForm.employeeId} onChange={(event) => setPinForm({ ...pinForm, employeeId: event.target.value })}>
          <option value="">Seleccionar trabajador</option>
          {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.nombres} {employee.apellidos} · {employee.cargo}</option>)}
        </select>
        <select className={cls} value={pinForm.role} onChange={(event) => setPinForm({ ...pinForm, role: event.target.value as ActiveOperator['role'] })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
        <input className={cls} type="password" inputMode="numeric" maxLength={6} placeholder="Nuevo PIN (6 números)" value={pinForm.pin} onChange={(event) => setPinForm({ ...pinForm, pin: event.target.value.replace(/\D/g, '').slice(0, 6) })} />
        <button disabled={saving} onClick={() => void savePin()} className="rounded-xl bg-blue-600 py-3 font-black text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar PIN'}</button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {activeEmployees.map((employee) => <div key={employee.id} className="rounded-xl bg-slate-50 p-4">
          <p className="font-black">{employee.nombres} {employee.apellidos}</p>
          <p className="text-sm text-slate-500">{employee.pin_actualizado_at ? `PIN activo · ${employee.acceso_rol}` : 'Sin acceso por PIN'}</p>
          {employee.pin_actualizado_at && <button onClick={async () => { if (!confirm('¿Quitar el acceso por PIN de este trabajador?')) return; await removeEmployeePin(employee.id); await load(); }} className="mt-2 text-sm font-black text-red-600">Quitar PIN</button>}
        </div>)}
      </div>
    </section>

    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-black">Invitar administrador o usuario remoto</h2>
      <p className="mb-4 text-sm font-medium text-slate-500">Usa un correo verdadero para quien necesite entrar desde fuera del local o recuperar su contraseña.</p>
      <div className="grid gap-4 md:grid-cols-[1fr_220px_220px]">
        <input className={cls} type="email" placeholder="trabajador@correo.com" value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} />
        <select className={cls} value={inviteForm.rol} onChange={(event) => setInviteForm({ ...inviteForm, rol: event.target.value })}>
          <option value="administrador">Administrador</option><option value="cajero">Cajero remoto</option><option value="mozo">Mozo remoto</option><option value="cocina">Cocina remota</option>
        </select>
        <button disabled={saving} onClick={() => void invite()} className="rounded-xl bg-blue-600 py-3 font-black text-white disabled:opacity-50">Crear invitación</button>
      </div>
    </section>

    <section className="overflow-x-auto rounded-2xl border bg-white">
      <h2 className="p-5 text-lg font-black">Cuentas con correo</h2>
      <table className="w-full text-left"><thead className="bg-slate-50 text-xs font-black uppercase text-slate-600"><tr><th className="p-4">Usuario</th><th>Rol</th><th>Estado</th></tr></thead>
        <tbody className="divide-y">{members.map((member) => <tr key={member.user_id}><td className="p-4 font-black">{member.nombre || 'Usuario'}<small className="block font-medium text-slate-500">{member.user_id.slice(0, 8)}…</small></td><td><select disabled={member.rol === 'propietario'} className="rounded-lg border p-2 font-bold" value={member.rol} onChange={async (event) => { await setMember(member.user_id, { rol: event.target.value as Member['rol'] }); await load(); }}><option value="propietario">Propietario</option><option value="administrador">Administrador</option><option value="cajero">Cajero</option><option value="mozo">Mozo</option><option value="cocina">Cocina</option></select></td><td><button disabled={member.rol === 'propietario'} onClick={async () => { await setMember(member.user_id, { activo: !member.activo }); await load(); }} className={`rounded-full px-3 py-1 font-black ${member.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{member.activo ? 'Activo' : 'Inactivo'}</button></td></tr>)}</tbody>
      </table>
    </section>

    <section className="overflow-x-auto rounded-2xl border bg-white">
      <h2 className="p-5 text-lg font-black">Invitaciones pendientes</h2>
      <table className="w-full text-left"><thead className="bg-slate-50 text-xs font-black uppercase text-slate-600"><tr><th className="p-4">Correo</th><th>Rol</th><th>Código</th><th>Estado</th></tr></thead>
        <tbody className="divide-y">{invites.length === 0 ? <tr><td colSpan={4} className="p-10 text-center text-slate-500">No hay invitaciones.</td></tr> : invites.map((invitation) => <tr key={invitation.id}><td className="p-4 font-bold">{invitation.email}</td><td className="capitalize">{invitation.rol}</td><td><button onClick={() => void navigator.clipboard.writeText(invitation.token)} className="font-mono font-black text-blue-600" title="Copiar">{invitation.token}</button></td><td className="capitalize">{invitation.estado}</td></tr>)}</tbody>
      </table>
    </section>
  </div>;
}
