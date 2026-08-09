import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { PackageCheck, Plus, ShoppingCart, Truck } from "lucide-react";
import {
  getInventoryPurchases,
  getSupplies,
  registerInventoryPurchase,
  type InventoryPurchase,
  type Supply,
} from "../services/inventory-store";

const initial = {
  supplyId: "",
  presentation: "Saco",
  presentations: 1,
  content: 1,
  totalCost: 0,
  provider: "",
};
export default function Compras() {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        getInventoryPurchases(),
        getSupplies(),
      ]);
      setPurchases(a);
      setSupplies(b);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar las compras.",
      );
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
      await registerInventoryPurchase(form);
      setForm(initial);
      setOpen(false);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo registrar la compra.",
      );
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
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
            <h2 className="text-xl font-black">Nueva compra recibida</h2>
            <p className="mb-5 text-sm text-slate-500">
              Regístrala cuando la mercadería haya llegado. El stock aumentará
              una sola vez.
            </p>
            <Field label="Insumo">
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
                  type="number"
                  step="0.001"
                  value={form.presentations}
                  onChange={(e) =>
                    setForm({ ...form, presentations: +e.target.value })
                  }
                />
              </Field>
              <Field label={`Contenido por presentación (${unit})`}>
                <input
                  type="number"
                  step="0.001"
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: +e.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Costo total pagado">
              <input
                type="number"
                step="0.01"
                value={form.totalCost}
                onChange={(e) =>
                  setForm({ ...form, totalCost: +e.target.value })
                }
              />
            </Field>
            <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              Ingreso:{" "}
              <b>
                {(form.presentations * form.content).toFixed(3)} {unit}
              </b>{" "}
              · Costo de compra:{" "}
              <b>
                S/{" "}
                {(
                  form.totalCost /
                  Math.max(1, form.presentations * form.content)
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
                  form.content <= 0 ||
                  form.presentations <= 0
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
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <label className="mb-3 block text-xs font-bold uppercase text-slate-500">
      {label}
      <span className="mt-1 block [&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:p-3 [&>*]:font-normal [&>*]:normal-case">
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
