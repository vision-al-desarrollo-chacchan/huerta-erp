import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { PackageCheck, Plus, ShoppingCart, Truck } from "lucide-react";
import {
  createSupply,
  getInventoryPurchases,
  getSupplies,
  registerInventoryPurchase,
  type InventoryPurchase,
  type Supply,
} from "../services/inventory-store";

const initial = {
  supplyId: "",
  presentation: "Saco",
  presentations: "",
  content: "",
  totalCost: "",
  provider: "",
};
const initialSupply = {
  code: "",
  name: "",
  category: "Verduras",
  unit: "kg",
  stock: "",
  minStock: "",
  averageCost: "",
};
function nextSupplyCode(name: string, existing: Supply[]) {
  const prefix = (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 3) || "INS"
  ).toUpperCase();
  const used = new Set(existing.map((item) => item.code.toUpperCase()));
  let number = 1;
  while (used.has(`${prefix}-${String(number).padStart(3, "0")}`)) number += 1;
  return `${prefix}-${String(number).padStart(3, "0")}`;
}
function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === "object") {
    const value = reason as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [value.message, value.details, value.hint, value.code].filter(
      (item) => typeof item === "string" && item.length > 0,
    );
    if (parts.length) return parts.join(" · ");
  }
  return fallback;
}
export default function Compras() {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [creatingSupply, setCreatingSupply] = useState(false);
  const [newSupply, setNewSupply] = useState(initialSupply);
  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        getInventoryPurchases(),
        getSupplies(),
      ]);
      setPurchases(a);
      setSupplies(b);
    } catch (e) {
      setError(errorMessage(e, "No se pudieron cargar las compras."));
    }
  };
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, []);
  const total = useMemo(
    () => purchases.reduce((s, x) => s + x.totalCost, 0),
    [purchases],
  );
  const providers = new Set(purchases.map((x) => x.provider)).size;
  const unit =
    supplies.find((x) => x.id === form.supplyId)?.unit ?? "unidad base";
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await registerInventoryPurchase({
        ...form,
        presentations: Number(form.presentations),
        content: Number(form.content),
        totalCost: Number(form.totalCost),
      });
      setForm(initial);
      setOpen(false);
      await load();
    } catch (e) {
      setError(errorMessage(e, "No se pudo registrar la compra."));
    } finally {
      setBusy(false);
    }
  };
  const saveNewSupply = async () => {
    setBusy(true);
    setError("");
    try {
      const requestedCode = newSupply.code.trim().toUpperCase();
      const code =
        !requestedCode ||
        supplies.some((item) => item.code.toUpperCase() === requestedCode)
          ? nextSupplyCode(newSupply.name, supplies)
          : requestedCode;
      const created = await createSupply({
        ...newSupply,
        code,
        stock: 0,
        minStock: Number(newSupply.minStock || 0),
        averageCost: 0,
      });
      setSupplies((current) =>
        [...current, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setForm((current) => ({ ...current, supplyId: created.id }));
      setNewSupply(initialSupply);
      setCreatingSupply(false);
    } catch (e) {
      setError(errorMessage(e, "No se pudo crear el insumo."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black">Compras y proveedores</h1>
          <p className="text-sm text-slate-500">
            Cada compra recibida actualiza inventario, kardex y costo promedio
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
        >
          <Plus className="mr-2 inline h-5 w-5" />
          Nueva compra recibida
        </button>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card
          icon={<ShoppingCart />}
          label="Inversión registrada"
          value={`S/ ${total.toFixed(2)}`}
        />
        <Card
          icon={<PackageCheck />}
          label="Compras recibidas"
          value={String(purchases.length)}
        />
        <Card icon={<Truck />} label="Proveedores" value={String(providers)} />
      </div>
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <th className="p-4">Fecha / insumo</th>
                <th>Proveedor</th>
                <th>Presentación</th>
                <th>Ingreso a stock</th>
                <th>Costo unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((x) => (
                <tr key={x.id} className="border-b">
                  <td className="p-4">
                    <b>{x.supplyName}</b>
                    <small className="block text-slate-400">
                      {new Date(x.createdAt).toLocaleString("es-PE")}
                    </small>
                  </td>
                  <td>{x.provider}</td>
                  <td>
                    {x.presentations} {x.presentation}
                  </td>
                  <td className="font-bold text-emerald-600">
                    +{x.baseQuantity} {x.unit}
                  </td>
                  <td>
                    S/ {x.unitCost.toFixed(2)} / {x.unit}
                  </td>
                  <td className="font-bold">S/ {x.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!purchases.length && (
            <p className="p-12 text-center text-sm text-slate-400">
              Aún no hay compras reales registradas.
            </p>
          )}
        </div>
      </section>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">
              Nueva compra recibida
            </h2>
            <p className="mb-5 text-sm font-medium text-slate-600">
              Regístrala cuando la mercadería haya llegado. El stock aumentará
              una sola vez.
            </p>
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {error}
              </div>
            )}
            <div className="mb-2 flex items-center justify-between">
              <b className="text-xs uppercase text-slate-700">Insumo</b>
              <button
                onClick={() => setCreatingSupply(!creatingSupply)}
                className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
              >
                + Crear nuevo insumo
              </button>
            </div>
            {creatingSupply && (
              <div className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
                <h3 className="mb-3 font-black text-emerald-900">
                  Nuevo insumo o producto
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Código (opcional)">
                    <input
                      value={newSupply.code}
                      onChange={(e) =>
                        setNewSupply({ ...newSupply, code: e.target.value })
                      }
                      placeholder="Se genera automáticamente"
                    />
                  </Field>
                  <Field label="Nombre">
                    <input
                      value={newSupply.name}
                      onChange={(e) =>
                        setNewSupply({ ...newSupply, name: e.target.value })
                      }
                      placeholder="Papa Canchán"
                    />
                  </Field>
                  <Field label="Categoría libre">
                    <input
                      value={newSupply.category}
                      onChange={(e) =>
                        setNewSupply({ ...newSupply, category: e.target.value })
                      }
                      placeholder="Verduras"
                    />
                  </Field>
                  <Field label="Unidad base">
                    <select
                      value={newSupply.unit}
                      onChange={(e) =>
                        setNewSupply({ ...newSupply, unit: e.target.value })
                      }
                    >
                      <option value="unidad">unidad</option>
                      <option value="kg">kg</option>
                      <option value="litro">litro</option>
                    </select>
                  </Field>
                  <Field label="Stock mínimo">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ej.: 20"
                      value={newSupply.minStock}
                      onChange={(e) =>
                        setNewSupply({
                          ...newSupply,
                          minStock: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-600">
                    El stock y costo comenzarán en cero. La compra recibida los
                    calculará automáticamente.
                  </div>
                </div>
                <button
                  disabled={busy || !newSupply.name.trim()}
                  onClick={() => void saveNewSupply()}
                  className="w-full rounded-xl bg-emerald-600 py-3 font-black text-white disabled:opacity-50"
                >
                  Guardar y seleccionar insumo
                </button>
              </div>
            )}
            <Field label="Seleccionar insumo existente">
              <select
                value={form.supplyId}
                onChange={(e) => setForm({ ...form, supplyId: e.target.value })}
              >
                <option value="">Seleccionar insumo</option>
                {supplies.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} ({x.unit})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Proveedor">
              <input
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
              />
            </Field>
            <Field label="Presentación (puedes escribir otra)">
              <input
                list="presentaciones"
                value={form.presentation}
                onChange={(e) =>
                  setForm({ ...form, presentation: e.target.value })
                }
              />
            </Field>
            <datalist id="presentaciones">
              {[
                "Saco",
                "Caja",
                "Jaba",
                "Paquete",
                "Bidón",
                "Malla",
                "Cajón",
                "Balde",
                "Galón",
                "Bandeja",
              ].map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad de presentaciones">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej.: 1"
                  value={form.presentations}
                  onChange={(e) =>
                    setForm({ ...form, presentations: e.target.value })
                  }
                />
              </Field>
              <Field label={`Contenido por presentación (${unit})`}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej.: 50"
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Costo total pagado">
              <div className="flex overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
                <span className="grid place-items-center bg-slate-100 px-4 text-base font-black text-slate-800">
                  S/
                </span>
                <input
                  className="min-w-0 flex-1 border-0 p-3 font-bold outline-none"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.totalCost}
                  onChange={(e) =>
                    setForm({ ...form, totalCost: e.target.value })
                  }
                />
              </div>
            </Field>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              Ingreso:{" "}
              <b>
                {(Number(form.presentations) * Number(form.content)).toFixed(3)}{" "}
                {unit}
              </b>{" "}
              · Costo de compra:{" "}
              <b>
                S/{" "}
                {(
                  Number(form.totalCost) /
                  Math.max(1, Number(form.presentations) * Number(form.content))
                ).toFixed(2)}
              </b>{" "}
              por {unit}.
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl bg-slate-100 py-3 font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={
                  busy ||
                  !form.supplyId ||
                  Number(form.content) <= 0 ||
                  Number(form.presentations) <= 0 ||
                  Number(form.totalCost) < 0
                }
                onClick={() => void save()}
                className="rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50"
              >
                {busy ? "Guardando…" : "Confirmar recepción"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactElement }) {
  return (
    <label className="mb-3 block text-xs font-black uppercase tracking-wide text-slate-700">
      {label}
      <span className="mt-1 block [&>*]:w-full [&>*]:rounded-xl [&>*]:border-2 [&>*]:border-slate-200 [&>*]:bg-white [&>*]:p-3 [&>*]:font-semibold [&>*]:normal-case [&>*]:text-slate-900 focus-within:[&>*]:border-blue-500">
        {children}
      </span>
    </label>
  );
}
function Card({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="mb-2 flex gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <b className="text-2xl">{value}</b>
    </div>
  );
}
