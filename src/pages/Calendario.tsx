import { useEffect, useState } from "react";
import {
  createTask,
  getEmployees,
  getTasks,
  setTaskStatus,
  type Employee,
  type Task,
} from "../services/erp-store";
const cls =
  "rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600";
export default function Calendario() {
  const [rows, setRows] = useState<Task[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
    [error, setError] = useState("");
  const [f, setF] = useState({
    titulo: "",
    descripcion: "",
    fecha: new Date().toISOString().slice(0, 10),
    hora: "",
    prioridad: "media" as Task["prioridad"],
    responsable: "",
  });
  const load = async () => setRows(await getTasks());
  useEffect(() => {
    void Promise.all([getTasks(), getEmployees()])
      .then(([tasks, staff]) => {
        setRows(tasks);
        setEmployees(staff.filter((employee) => employee.estado === "activo"));
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "No se pudo cargar."),
      );
  }, []);
  const save = async () => {
    if (!f.titulo) return setError("Ingresa el título de la tarea.");
    try {
      await createTask({
        ...f,
        descripcion: f.descripcion || null,
        hora: f.hora || null,
        responsable: f.responsable || null,
      });
      setF({ ...f, titulo: "", descripcion: "", hora: "", responsable: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-slate-950">
          Calendario y tareas
        </h1>
        <p className="font-medium text-slate-600">
          Vencimientos, compras, mantenimiento y pendientes del equipo.
        </p>
      </div>
      {error && (
        <div className="rounded-xl bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}
      <section className="grid gap-4 rounded-2xl border bg-white p-5 md:grid-cols-4">
        <input
          className={`${cls} md:col-span-2`}
          placeholder="Tarea *"
          value={f.titulo}
          onChange={(e) => setF({ ...f, titulo: e.target.value })}
        />
        <input
          className={cls}
          type="date"
          value={f.fecha}
          onChange={(e) => setF({ ...f, fecha: e.target.value })}
        />
        <input
          className={cls}
          type="time"
          value={f.hora}
          onChange={(e) => setF({ ...f, hora: e.target.value })}
        />
        <select
          className={cls}
          value={f.responsable}
          onChange={(e) => setF({ ...f, responsable: e.target.value })}
        >
          <option value="">Sin responsable</option>
          {employees.map((employee) => (
            <option key={employee.id} value={`${employee.nombres} ${employee.apellidos}`}>
              {employee.nombres} {employee.apellidos} · {employee.cargo}
            </option>
          ))}
        </select>
        <select
          className={cls}
          value={f.prioridad}
          onChange={(e) =>
            setF({ ...f, prioridad: e.target.value as Task["prioridad"] })
          }
        >
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>
        <input
          className={cls}
          placeholder="Detalle"
          value={f.descripcion}
          onChange={(e) => setF({ ...f, descripcion: e.target.value })}
        />
        <button
          onClick={() => void save()}
          className="rounded-xl bg-blue-600 font-black text-white"
        >
          Agregar tarea
        </button>
      </section>
      <section className="space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">
            No hay tareas.
          </div>
        ) : (
          rows.map((r) => (
            <article
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 ${r.estado === "completada" ? "opacity-60" : ""}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-3 w-3 rounded-full ${r.prioridad === "alta" ? "bg-red-500" : r.prioridad === "media" ? "bg-amber-500" : "bg-emerald-500"}`}
                  />
                  <h3 className="font-black">{r.titulo}</h3>
                </div>
                <p className="text-sm text-slate-600">
                  {r.fecha} {r.hora?.slice(0, 5) || ""} ·{" "}
                  {r.responsable || "Sin responsable"}
                </p>
              </div>
              <button
                onClick={async () => {
                  await setTaskStatus(
                    r.id,
                    r.estado === "pendiente" ? "completada" : "pendiente",
                  );
                  await load();
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white"
              >
                {r.estado === "pendiente" ? "Completar" : "Reabrir"}
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
