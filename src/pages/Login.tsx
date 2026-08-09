import "../styles/login.css";
import logo from "../assets/logo-square.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../services/auth";
import { acceptInvitation } from "../services/erp-store";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState(localStorage.getItem('huerta-invite') ?? "");
  const [registerMode, setRegisterMode] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin() {
    const { error } = await login(email, password);

    if (error) {
      alert("Correo o contraseña incorrectos");
      return;
    }

    if (invite.trim()) {
      try { await acceptInvitation(invite.trim()); localStorage.removeItem('huerta-invite'); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo aceptar la invitación.'); return; }
    }
    navigate("/dashboard");
  }

  async function handleRegister() {
    if (!name.trim() || password.length < 6 || !invite.trim()) { setMessage('Completa tu nombre, el código y una contraseña de mínimo 6 caracteres.'); return; }
    localStorage.setItem('huerta-invite', invite.trim());
    const { data, error } = await register(email, password, name);
    if (error) return setMessage(error.message);
    if (data.session) { try { await acceptInvitation(invite.trim()); localStorage.removeItem('huerta-invite'); navigate('/dashboard'); } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo aceptar la invitación.'); } }
    else setMessage('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión conservando el código.');
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <img src={logo} alt="Huerta ERP" className="logo" />

        <h1>HUERTA ERP</h1>

        <p>Administra tu empresa desde cualquier lugar.</p>

        <div className="features">
          <div>✔ Multiempresa</div>
          <div>✔ Seguro en la nube</div>
          <div>✔ Rápido y moderno</div>
        </div>
      </div>

      <div className="login-right">
        <div className="card">
          <h2>{registerMode ? 'Crear acceso' : 'Bienvenido'}</h2>

          {registerMode && <><span>Nombre completo</span><input placeholder="Nombre del trabajador" value={name} onChange={(e) => setName(e.target.value)} /></>}

          <span>Correo electrónico</span>

          <input
            type="email"
            placeholder="correo@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {registerMode && <><span>Código de invitación</span><input placeholder="Código entregado por el administrador" value={invite} onChange={(e) => setInvite(e.target.value)} /></>}

          <span>Contraseña</span>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="options">
            <label>
              <input type="checkbox" />
              Recordarme
            </label>

            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>

          {message && <p style={{color:'#b91c1c',fontSize:13,fontWeight:700}}>{message}</p>}
          <button onClick={registerMode ? handleRegister : handleLogin}>
            {registerMode ? 'Crear mi acceso' : 'Iniciar sesión'}
          </button>

          <button type="button" onClick={() => { setRegisterMode(!registerMode); setMessage(''); }} style={{background:'transparent',color:'#2563eb',boxShadow:'none'}}>{registerMode ? 'Ya tengo una cuenta' : 'Tengo un código de invitación'}</button>

          <small>© 2026 Huerta Digital</small>
        </div>
      </div>
    </div>
  );
}
