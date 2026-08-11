import { supabase } from "../lib/supabase";
import { getBusinessContext } from "./restaurant-store";
export type Supply = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  averageCost: number;
};
export type InventoryMovement = {
  id: string;
  supplyName: string;
  type: string;
  quantity: number;
  previous: number;
  current: number;
  reason: string;
  responsible: string;
  createdAt: string;
};
export type RecipeLine = {
  id: string;
  productName: string;
  supplyName: string;
  useUnit: string;
  useQuantity: number;
  cost: number;
};
export type InventoryPurchase = {
  id: string;
  supplyName: string;
  presentation: string;
  presentations: number;
  baseQuantity: number;
  unit: string;
  totalCost: number;
  unitCost: number;
  provider: string;
  createdAt: string;
  status: 'registrada' | 'anulada';
  cancellationReason?: string;
};
export type DailyInventorySummary = {
  supplyId: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  openingStock: number;
  purchased: number;
  consumed: number;
  waste: number;
  adjustment: number;
  closingStock: number;
  minStock: number;
  suggestedPurchase: number;
};
type MovementRow = {
  id: string;
  tipo: string;
  cantidad: number;
  saldo_anterior: number;
  saldo_nuevo: number;
  motivo: string;
  registrado_por_nombre: string | null;
  created_at: string;
  rest_insumos: { nombre: string } | null;
};
type RecipeRow = {
  id: string;
  cantidad: number;
  cantidad_uso: number | null;
  unidad_uso: string | null;
  rest_productos: { nombre: string } | null;
  rest_insumos: {
    nombre: string;
    unidad: string;
    costo_promedio: number;
  } | null;
};
export async function getSupplies(): Promise<Supply[]> {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase
    .from("rest_insumos")
    .select(
      "id,codigo,nombre,categoria,unidad,stock,stock_minimo,costo_promedio",
    )
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .order("nombre");
  if (error) throw error;
  return (data ?? []).map((x) => ({
    id: x.id,
    code: x.codigo,
    name: x.nombre,
    category: x.categoria,
    unit: x.unidad,
    stock: Number(x.stock),
    minStock: Number(x.stock_minimo),
    averageCost: Number(x.costo_promedio),
  }));
}
export async function saveSupply(input: Omit<Supply, "id"> & { id?: string }) {
  const { empresaId } = await getBusinessContext();
  const row = {
    empresa_id: empresaId,
    codigo: input.code.trim(),
    nombre: input.name.trim(),
    categoria: input.category,
    unidad: input.unit,
    stock: input.stock,
    stock_minimo: input.minStock,
    costo_promedio: input.averageCost,
  };
  const result = input.id
    ? await supabase.from("rest_insumos").update(row).eq("id", input.id)
    : await supabase.from("rest_insumos").insert(row);
  if (result.error) throw result.error;
}
export async function createSupply(input: Omit<Supply, "id">): Promise<Supply> {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase
    .from("rest_insumos")
    .insert({
      empresa_id: empresaId,
      codigo: input.code.trim(),
      nombre: input.name.trim(),
      categoria: input.category.trim(),
      unidad: input.unit,
      stock: input.stock,
      stock_minimo: input.minStock,
      costo_promedio: input.averageCost,
    })
    .select(
      "id,codigo,nombre,categoria,unidad,stock,stock_minimo,costo_promedio",
    )
    .single();
  if (error) throw error;
  return {
    id: data.id,
    code: data.codigo,
    name: data.nombre,
    category: data.categoria,
    unit: data.unidad,
    stock: Number(data.stock),
    minStock: Number(data.stock_minimo),
    averageCost: Number(data.costo_promedio),
  };
}
export async function registerInventoryMovement(
  supplyId: string,
  type: string,
  quantity: number,
  reason: string,
) {
  const { error } = await supabase.rpc("rest_registrar_movimiento_inventario", {
    p_insumo_id: supplyId,
    p_tipo: type,
    p_cantidad: quantity,
    p_motivo: reason,
  });
  if (error) throw error;
}
export async function registerInventoryPurchase(input: {
  supplyId: string;
  presentation: string;
  presentations: number;
  content: number;
  totalCost: number;
  provider: string;
}) {
  const { error } = await supabase.rpc("rest_registrar_compra_inventario", {
    p_insumo_id: input.supplyId,
    p_presentacion: input.presentation,
    p_cantidad_presentaciones: input.presentations,
    p_contenido: input.content,
    p_costo_total: input.totalCost,
    p_proveedor: input.provider,
  });
  if (error) throw error;
}
export async function getInventoryPurchases(): Promise<InventoryPurchase[]> {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase
    .from("rest_compras_inventario")
    .select(
      "id,presentacion,cantidad_presentaciones,cantidad_base,unidad_base,costo_total,costo_unitario,proveedor,estado,motivo_anulacion,created_at,rest_insumos(nombre)",
    )
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (
    (data ?? []) as unknown as Array<{
      id: string;
      presentacion: string;
      cantidad_presentaciones: number;
      cantidad_base: number;
      unidad_base: string;
      costo_total: number;
      costo_unitario: number;
      proveedor: string | null;
      estado: 'registrada' | 'anulada';
      motivo_anulacion: string | null;
      created_at: string;
      rest_insumos: { nombre: string } | null;
    }>
  ).map((x) => ({
    id: x.id,
    supplyName: x.rest_insumos?.nombre ?? "Insumo",
    presentation: x.presentacion,
    presentations: Number(x.cantidad_presentaciones),
    baseQuantity: Number(x.cantidad_base),
    unit: x.unidad_base,
    totalCost: Number(x.costo_total),
    unitCost: Number(x.costo_unitario),
    provider: x.proveedor ?? "Sin proveedor",
    createdAt: x.created_at,
    status: x.estado,
    cancellationReason: x.motivo_anulacion ?? undefined,
  }));
}
export async function cancelInventoryPurchase(id:string,reason:string){const {error}=await supabase.rpc('erp_anular_compra_inventario',{p_compra_id:id,p_motivo:reason});if(error)throw error;}
export async function deactivateSupply(id:string){const {empresaId}=await getBusinessContext();const {error}=await supabase.from('rest_insumos').update({activo:false}).eq('empresa_id',empresaId).eq('id',id);if(error)throw error;}
export async function getInventoryMovements(): Promise<InventoryMovement[]> {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase
    .from("rest_movimientos_inventario")
    .select(
      "id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por_nombre,created_at,rest_insumos(nombre)",
    )
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as MovementRow[]).map((x) => ({
    id: x.id,
    supplyName: x.rest_insumos?.nombre ?? "Insumo",
    type: x.tipo,
    quantity: Number(x.cantidad),
    previous: Number(x.saldo_anterior),
    current: Number(x.saldo_nuevo),
    reason: x.motivo,
    responsible: x.registrado_por_nombre ?? "Sistema",
    createdAt: x.created_at,
  }));
}
export async function getDailyInventorySummary(date: string): Promise<DailyInventorySummary[]> {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase.rpc('rest_resumen_inventario_diario', { p_empresa_id: empresaId, p_fecha: date });
  if (error) throw error;
  return (data ?? []).map((x: Record<string, unknown>) => ({
    supplyId: String(x.insumo_id), code: String(x.codigo), name: String(x.nombre), category: String(x.categoria), unit: String(x.unidad),
    openingStock: Number(x.stock_inicial), purchased: Number(x.comprado), consumed: Number(x.consumido), waste: Number(x.merma),
    adjustment: Number(x.ajuste), closingStock: Number(x.stock_final), minStock: Number(x.stock_minimo), suggestedPurchase: Number(x.compra_sugerida),
  }));
}
export async function getRecipeLines(): Promise<RecipeLine[]> {
  const { empresaId } = await getBusinessContext();
  const { data, error } = await supabase
    .from("rest_recetas")
    .select(
      "id,cantidad,cantidad_uso,unidad_uso,rest_productos(nombre),rest_insumos(nombre,unidad,costo_promedio)",
    )
    .eq("empresa_id", empresaId)
    .order("created_at");
  if (error) throw error;
  return ((data ?? []) as unknown as RecipeRow[]).map((x) => ({
    id: x.id,
    productName: x.rest_productos?.nombre ?? "Producto",
    supplyName: x.rest_insumos?.nombre ?? "Insumo",
    useUnit: x.unidad_uso ?? x.rest_insumos?.unidad ?? "",
    useQuantity: Number(x.cantidad_uso ?? x.cantidad),
    cost: Number(x.cantidad) * Number(x.rest_insumos?.costo_promedio ?? 0),
  }));
}
export async function saveRecipeLine(
  productId: string,
  supply: Supply,
  quantity: number,
  useUnit: string,
) {
  const base =
    useUnit === "g" && supply.unit === "kg"
      ? quantity / 1000
      : useUnit === "ml" && supply.unit === "litro"
        ? quantity / 1000
        : quantity;
  const { empresaId } = await getBusinessContext();
  const { error } = await supabase.from("rest_recetas").upsert(
    {
      empresa_id: empresaId,
      producto_id: productId,
      insumo_id: supply.id,
      cantidad: base,
      cantidad_uso: quantity,
      unidad_uso: useUnit,
    },
    { onConflict: "producto_id,insumo_id" },
  );
  if (error) throw error;
}
export async function deleteRecipeLine(id: string) {
  const { error } = await supabase.from("rest_recetas").delete().eq("id", id);
  if (error) throw error;
}
