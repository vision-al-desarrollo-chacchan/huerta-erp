import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  BookOpen,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { getProducts } from "../services/restaurant-store";
import {
  deleteRecipeLine,
  getInventoryMovements,
  getRecipeLines,
  getSupplies,
  registerInventoryMovement,
  saveRecipeLine,
  saveSupply,
  type InventoryMovement,
  type RecipeLine,
  type Supply,
} from "../services/inventory-store";
import type { RestaurantProduct } from "../types/restaurant";
const emptySupply = {
  code: "",
  name: "",
  category: "Cárnicos",
  unit: "unidad",
  stock: 0,
  minStock: 0,
  averageCost: 0,
};
const msg = (e: unknown, f: string) => (e instanceof Error ? e.message : f);
export default function Inventario() {
  const [tab, setTab] = useState<"insumos" | "kardex" | "recetas">("insumos");
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [recipes, setRecipes] = useState<RecipeLine[]>([]);
  const [products, setProducts] = useState<RestaurantProduct[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [supply, setSupply] = useState(emptySupply);
  const [movement, setMovement] = useState({
    supplyId: "",
    type: "entrada",
    quantity: 0,
    reason: "",
  });
  const [recipe, setRecipe] = useState({
    productId: "",
    supplyId: "",
    quantity: 0,
    useUnit: "",
  });
  const load = async () => {
    try {
      setError("");
      const [a, b, c, d] = await Promise.all([
        getSupplies(),
        getInventoryMovements(),
        getRecipeLines(),
        getProducts(),
      ]);
      setSupplies(a);
      setMovements(b);
      setRecipes(c);
      setProducts(d);
    } catch (e: unknown) {
      setError(msg(e, "No se pudo cargar."));
    }
  };
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, []);
  const low = useMemo(
    () => supplies.filter((x) => x.stock <= x.minStock),
    [supplies],
  );
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(msg(e, "No se pudo guardar."));
    } finally {
      setBusy(false);
    }
  };
  const chosen = supplies.find((x) => x.id === recipe.supplyId);
  const units =
    chosen?.unit === "kg"
      ? ["kg", "g"]
      : chosen?.unit === "litro"
        ? ["litro", "ml"]
        : [chosen?.unit ?? "unidad"];
  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}
      <h1 className="text-3xl font-black">Inventario y recetas</h1>
      <p className="mb-6 text-sm text-slate-500">
        Costos, conversiones, kardex y consumo automático
      </p>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card
          icon={<Package />}
          label="Insumos activos"
          value={supplies.length}
        />
        <Card icon={<AlertTriangle />} label="Stock bajo" value={low.length} />
        <Card
          icon={<BookOpen />}
          label="Líneas de receta"
          value={recipes.length}
        />
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {(
          [
            ["insumos", "Insumos"],
            ["kardex", "Kardex"],
            ["recetas", "Recetas"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold ${tab === id ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "insumos" && (
        <Grid>
          <Panel title="Nuevo insumo">
            <Field label="Código">
              <input
                value={supply.code}
                onChange={(e) => setSupply({ ...supply, code: e.target.value })}
              />
            </Field>
            <Field label="Nombre">
              <input
                value={supply.name}
                onChange={(e) => setSupply({ ...supply, name: e.target.value })}
              />
            </Field>
            <Field label="Categoría (puedes escribir una nueva)">
              <input
                value={supply.category}
                onChange={(e) =>
                  setSupply({ ...supply, category: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unidad base">
                <select
                  value={supply.unit}
                  onChange={(e) =>
                    setSupply({ ...supply, unit: e.target.value })
                  }
                >
                  {["unidad", "kg", "litro"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Stock inicial">
                <input
                  type="number"
                  value={supply.stock}
                  onChange={(e) =>
                    setSupply({ ...supply, stock: +e.target.value })
                  }
                />
              </Field>
              <Field label="Stock mínimo">
                <input
                  type="number"
                  value={supply.minStock}
                  onChange={(e) =>
                    setSupply({ ...supply, minStock: +e.target.value })
                  }
                />
              </Field>
              <Field label="Costo por unidad base">
                <input
                  type="number"
                  step="0.01"
                  value={supply.averageCost}
                  onChange={(e) =>
                    setSupply({ ...supply, averageCost: +e.target.value })
                  }
                />
              </Field>
            </div>
            <Action
              disabled={busy || !supply.code || !supply.name}
              onClick={() =>
                void run(async () => {
                  await saveSupply(supply);
                  setSupply(emptySupply);
                })
              }
            >
              <Plus className="mr-2 inline h-4 w-4" />
              Guardar insumo
            </Action>
          </Panel>
          <Panel title="Existencias">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-slate-400">
                    <th className="p-3">Insumo</th>
                    <th>Stock</th>
                    <th>Mínimo</th>
                    <th>Costo promedio</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.map((x) => (
                    <tr key={x.id} className="border-b">
                      <td className="p-3">
                        <b>{x.name}</b>
                        <small className="block text-slate-400">
                          {x.code} · {x.category}
                        </small>
                      </td>
                      <td>
                        {x.stock} {x.unit}
                      </td>
                      <td>{x.minStock}</td>
                      <td>
                        S/ {x.averageCost.toFixed(2)} / {x.unit}
                      </td>
                      <td>
                        <b
                          className={
                            x.stock <= x.minStock
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }
                        >
                          {x.stock <= x.minStock ? "Reponer" : "Correcto"}
                        </b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Empty
                show={!supplies.length}
                text="Registra el primer insumo."
              />
            </div>
          </Panel>
        </Grid>
      )}
      {tab === "kardex" && (
        <Grid>
          <Panel title="Movimiento manual">
            <Field label="Insumo">
              <select
                value={movement.supplyId}
                onChange={(e) =>
                  setMovement({ ...movement, supplyId: e.target.value })
                }
              >
                <option value="">Seleccionar</option>
                {supplies.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select
                value={movement.type}
                onChange={(e) =>
                  setMovement({ ...movement, type: e.target.value })
                }
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
                <option value="merma">Merma</option>
                <option value="ajuste">Ajuste (+/-)</option>
              </select>
            </Field>
            <Field label="Cantidad">
              <input
                type="number"
                value={movement.quantity}
                onChange={(e) =>
                  setMovement({ ...movement, quantity: +e.target.value })
                }
              />
            </Field>
            <Field label="Motivo">
              <input
                value={movement.reason}
                onChange={(e) =>
                  setMovement({ ...movement, reason: e.target.value })
                }
              />
            </Field>
            <Action
              disabled={busy || !movement.supplyId || !movement.quantity}
              onClick={() =>
                void run(() =>
                  registerInventoryMovement(
                    movement.supplyId,
                    movement.type,
                    movement.quantity,
                    movement.reason,
                  ),
                )
              }
            >
              <ArrowDownUp className="mr-2 inline h-4 w-4" />
              Registrar
            </Action>
          </Panel>
          <Panel title="Movimientos recientes">
            {movements.map((x) => (
              <div
                key={x.id}
                className="mb-2 flex justify-between rounded-xl border p-3"
              >
                <div>
                  <b>{x.supplyName}</b>
                  <p className="text-xs text-slate-500">
                    {x.reason} · {x.responsible}
                  </p>
                </div>
                <div className="text-right">
                  <b>
                    {x.type === "entrada" ? "+" : "-"}
                    {x.quantity}
                  </b>
                  <p className="text-xs">
                    {x.previous} → {x.current}
                  </p>
                </div>
              </div>
            ))}
            <Empty show={!movements.length} text="Sin movimientos." />
          </Panel>
        </Grid>
      )}
      {tab === "recetas" && (
        <Grid>
          <Panel title="Ingrediente de receta">
            <Field label="Producto vendido">
              <select
                value={recipe.productId}
                onChange={(e) =>
                  setRecipe({ ...recipe, productId: e.target.value })
                }
              >
                <option value="">Seleccionar</option>
                {products.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Insumo">
              <select
                value={recipe.supplyId}
                onChange={(e) => {
                  const s = supplies.find((x) => x.id === e.target.value);
                  setRecipe({
                    ...recipe,
                    supplyId: e.target.value,
                    useUnit: s?.unit ?? "",
                  });
                }}
              >
                <option value="">Seleccionar</option>
                {supplies.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cantidad">
                <input
                  type="number"
                  step="0.001"
                  value={recipe.quantity}
                  onChange={(e) =>
                    setRecipe({ ...recipe, quantity: +e.target.value })
                  }
                />
              </Field>
              <Field label="Unidad usada">
                <select
                  value={recipe.useUnit}
                  onChange={(e) =>
                    setRecipe({ ...recipe, useUnit: e.target.value })
                  }
                >
                  {units.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-xs text-blue-600">
              Puedes comprar papa en kg y usar gramos en la receta. La
              conversión será automática.
            </p>
            <Action
              disabled={
                busy || !recipe.productId || !chosen || recipe.quantity <= 0
              }
              onClick={() =>
                chosen &&
                void run(() =>
                  saveRecipeLine(
                    recipe.productId,
                    chosen,
                    recipe.quantity,
                    recipe.useUnit,
                  ),
                )
              }
            >
              Guardar ingrediente
            </Action>
          </Panel>
          <Panel title="Recetas configuradas">
            {recipes.map((x) => (
              <div
                key={x.id}
                className="mb-2 flex justify-between rounded-xl border p-3"
              >
                <div>
                  <b>{x.productName}</b>
                  <p className="text-sm text-slate-500">
                    {x.useQuantity} {x.useUnit} de {x.supplyName} · Costo S/{" "}
                    {x.cost.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => void run(() => deleteRecipeLine(x.id))}
                  className="text-red-500"
                >
                  <Trash2 />
                </button>
              </div>
            ))}
            <Empty show={!recipes.length} text="Configura la primera receta." />
          </Panel>
        </Grid>
      )}
    </div>
  );
}
function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 xl:grid-cols-[400px_1fr]">{children}</div>;
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="mb-4 font-black">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactElement }) {
  return (
    <label className="mb-3 block text-xs font-bold uppercase text-slate-500">
      {label}
      <span className="mt-1 block [&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:p-3 [&>*]:font-normal [&>*]:normal-case">
        {children}
      </span>
    </label>
  );
}
function Action({
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50"
    >
      {children}
    </button>
  );
}
function Card({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex gap-2 text-sm text-slate-500">
        {icon}
        {label}
      </div>
      <b className="text-3xl">{value}</b>
    </div>
  );
}
function Empty({ show, text }: { show: boolean; text: string }) {
  return show ? <p className="p-8 text-center text-slate-400">{text}</p> : null;
}
