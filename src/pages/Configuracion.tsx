import { useEffect, useState } from "react";
import {
  getCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from "../services/erp-store";
const cls =
  "w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-900 outline-none focus:border-blue-600";
export default function Configuracion() {
  const [f, setF] = useState<CompanySettings | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    void getCompanySettings()
      .then(setF)
      .catch((e) =>
        setError(
          e instanceof Error
            ? e.message
            : "No se pudo cargar la configuración.",
        ),
      );
  }, []);
  if (!f)
    return (
      <div className="p-10 font-bold">
        {error || "Cargando configuración..."}
      </div>
    );
  const save = async () => {
    if (!f.nombre.trim() || !f.sucursal.trim())
      return setError("Empresa y sucursal son obligatorias.");
    setSaving(true);
    try {
      await saveCompanySettings(f);
      window.dispatchEvent(new Event("huerta-settings-updated"));
      setNotice("Configuración guardada correctamente.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">Configuración</h1>
        <p className="font-medium text-slate-600">
          Datos propios de esta empresa, sucursal y comprobantes.
        </p>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-emerald-50 p-4 font-bold text-emerald-700">
          {notice}
        </div>
      )}
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-5 text-xl font-black">Empresa</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Razón social / empresa">
            <input
              className={cls}
              value={f.nombre}
              onChange={(e) => setF({ ...f, nombre: e.target.value })}
            />
          </Field>
          <Field label="Nombre comercial">
            <input
              className={cls}
              value={f.nombreComercial}
              onChange={(e) => setF({ ...f, nombreComercial: e.target.value })}
            />
          </Field>
          <Field label="RUC">
            <input
              className={cls}
              inputMode="numeric"
              value={f.ruc}
              onChange={(e) => setF({ ...f, ruc: e.target.value })}
            />
          </Field>
          <Field label="Teléfono">
            <input
              className={cls}
              value={f.telefono}
              onChange={(e) => setF({ ...f, telefono: e.target.value })}
            />
          </Field>
          <Field label="Dirección fiscal">
            <input
              className={cls}
              value={f.direccion}
              onChange={(e) => setF({ ...f, direccion: e.target.value })}
            />
          </Field>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-5 text-xl font-black">Sucursal</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre del local">
            <input
              className={cls}
              value={f.sucursal}
              onChange={(e) => setF({ ...f, sucursal: e.target.value })}
            />
          </Field>
          <Field label="Dirección del local">
            <input
              className={cls}
              value={f.sucursalDireccion}
              onChange={(e) =>
                setF({ ...f, sucursalDireccion: e.target.value })
              }
            />
          </Field>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-6">
        <h2 className="mb-5 text-xl font-black">Parámetros</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Moneda">
            <select
              className={cls}
              value={f.moneda}
              onChange={(e) => setF({ ...f, moneda: e.target.value })}
            >
              <option value="PEN">Soles (PEN)</option>
              <option value="USD">Dólares (USD)</option>
            </select>
          </Field>
          <Field label="IGV %">
            <input
              className={cls}
              inputMode="decimal"
              value={f.igv}
              onChange={(e) => setF({ ...f, igv: Number(e.target.value) })}
            />
          </Field>
          <Field label="Serie boleta">
            <input
              className={cls}
              value={f.serieBoleta}
              onChange={(e) =>
                setF({ ...f, serieBoleta: e.target.value.toUpperCase() })
              }
            />
          </Field>
          <Field label="Serie factura">
            <input
              className={cls}
              value={f.serieFactura}
              onChange={(e) =>
                setF({ ...f, serieFactura: e.target.value.toUpperCase() })
              }
            />
          </Field>
        </div>
      </section>
      <button
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-blue-600 px-8 py-3 font-black text-white disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
