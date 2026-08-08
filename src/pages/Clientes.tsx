import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";

interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  correo: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");

  function agregarCliente() {
    if (!nombre || !telefono) {
      alert("Complete los datos.");
      return;
    }

    const nuevo: Cliente = {
      id: Date.now(),
      nombre,
      telefono,
      correo,
    };

    setClientes([...clientes, nuevo]);

    setNombre("");
    setTelefono("");
    setCorreo("");
  }

  function eliminarCliente(id: number) {
    if (!confirm("¿Eliminar cliente?")) return;

    setClientes(clientes.filter((c) => c.id !== id));
  }

  return (
    <DashboardLayout>
      <h1
        style={{
          marginBottom: 25,
          color: "#0f172a",
        }}
      >
        Clientes
      </h1>

      <div
        style={{
          background: "#fff",
          padding: 25,
          borderRadius: 12,
          marginBottom: 25,
          boxShadow: "0 5px 15px rgba(0,0,0,.08)",
        }}
      >
        <h2>Nuevo cliente</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 15,
            marginTop: 20,
          }}
        >
          <input
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <input
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <input
            placeholder="Correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </div>

        <button
          onClick={agregarCliente}
          style={{
            marginTop: 20,
            padding: "12px 25px",
            background: "#0ea5e9",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Guardar Cliente
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 5px 15px rgba(0,0,0,.08)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead
            style={{
              background: "#0f172a",
              color: "white",
            }}
          >
            <tr>
              <th style={{ padding: 15 }}>Nombre</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    padding: 40,
                  }}
                >
                  No existen clientes registrados.
                </td>
              </tr>
            ) : (
              clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td
                    style={{
                      padding: 15,
                    }}
                  >
                    {cliente.nombre}
                  </td>

                  <td>{cliente.telefono}</td>

                  <td>{cliente.correo}</td>

                  <td>
                    <button
                      onClick={() => eliminarCliente(cliente.id)}
                      style={{
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}