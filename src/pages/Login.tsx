import '../styles/login.css';
import logo from '../assets/logo-white.svg';
import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, TicketCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../services/auth';
import { acceptInvitation } from '../services/erp-store';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [invite, setInvite] = useState(localStorage.getItem('huerta-invite') ?? '');
  const [registerMode, setRegisterMode] = useState(false);
  const [message, setMessage] = useState('');

  async function handleLogin() {
    const { error } = await login(email, password);
    if (error) {
      setMessage('Correo o contraseña incorrectos.');
      return;
    }
    if (invite.trim()) {
      try {
        await acceptInvitation(invite.trim());
        localStorage.removeItem('huerta-invite');
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'No se pudo aceptar la invitación.');
        return;
      }
    }
    navigate('/dashboard');
  }

  async function handleRegister() {
    if (!name.trim() || password.length < 6 || !invite.trim()) {
      setMessage('Completa tu nombre, el código y una contraseña de mínimo 6 caracteres.');
      return;
    }
    localStorage.setItem('huerta-invite', invite.trim());
    const { data, error } = await register(email, password, name);
    if (error) return setMessage(error.message);
    if (data.session) {
      try {
        await acceptInvitation(invite.trim());
        localStorage.removeItem('huerta-invite');
        navigate('/dashboard');
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : 'No se pudo aceptar la invitación.');
      }
    } else {
      setMessage('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión conservando el código.');
    }
  }

  return <main className="login-shell">
    <section className="login-brand" aria-label="Huerta ERP">
      <div className="brand-content">
        <img src={logo} alt="Huerta Digital" className="login-brand-logo" />
        <h1>HUERTA ERP</h1>
        <p>Administra tu empresa desde cualquier lugar.</p>
        <ul>
          <li>✓ Multiempresa</li>
          <li>✓ Seguro en la nube</li>
          <li>✓ Rápido y moderno</li>
        </ul>
      </div>
    </section>

    <section className="login-panel">
      <div className="login-card">
        <header>
          <h2>{registerMode ? '¡Crea tu acceso!' : '¡Bienvenido!'}</h2>
          <p>{registerMode ? 'Usa la invitación entregada por tu administrador' : 'Ingresa tus credenciales para continuar'}</p>
        </header>

        {registerMode && <label className="login-field">
          <span>Nombre completo</span>
          <div><UserRound aria-hidden="true" /><input autoComplete="name" placeholder="Nombre del trabajador" value={name} onChange={(event) => setName(event.target.value)} /></div>
        </label>}

        <label className="login-field">
          <span>Correo electrónico</span>
          <div><Mail aria-hidden="true" /><input type="email" autoComplete="email" placeholder="correo@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        </label>

        {registerMode && <label className="login-field">
          <span>Código de invitación</span>
          <div><TicketCheck aria-hidden="true" /><input autoComplete="off" placeholder="Código entregado por el administrador" value={invite} onChange={(event) => setInvite(event.target.value)} /></div>
        </label>}

        <label className="login-field">
          <span>Contraseña</span>
          <div><LockKeyhole aria-hidden="true" /><input type={showPassword ? 'text' : 'password'} autoComplete={registerMode ? 'new-password' : 'current-password'} placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
        </label>

        {!registerMode && <div className="login-options">
          <label><input type="checkbox" /> <span>Recordarme</span></label>
          <button type="button" className="forgot-link">¿Olvidaste tu contraseña?</button>
        </div>}

        {message && <p className={message.startsWith('Cuenta creada') ? 'login-message success' : 'login-message'}>{message}</p>}

        <button type="button" className="login-submit" onClick={() => void (registerMode ? handleRegister() : handleLogin())}>
          {registerMode ? 'Crear mi acceso' : 'Iniciar sesión'}
        </button>

        <button type="button" className="invite-link" onClick={() => { setRegisterMode((active) => !active); setMessage(''); }}>
          {registerMode ? 'Ya tengo una cuenta' : 'Tengo un código de invitación'}
        </button>

        <small>© 2026 Huerta Digital</small>
      </div>
    </section>
  </main>;
}
