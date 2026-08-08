import "../styles/login.css";
import logo from "../assets/logo-square.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { error } = await login(email, password);

    if (error) {
      alert("Correo o contraseña incorrectos");
      return;
    }

    navigate("/dashboard");
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
          <h2>Bienvenido</h2>

          <span>Correo electrónico</span>

          <input
            type="email"
            placeholder="correo@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

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

          <button onClick={handleLogin}>
            Iniciar sesión
          </button>

          <small>© 2026 Huerta Digital</small>
        </div>
      </div>
    </div>
  );
}