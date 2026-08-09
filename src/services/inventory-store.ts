import { supabase } from '../lib/supabase';
import { getBusinessContext } from './restaurant-store';

export type Supply = { id:string; code:string; name:string; category:string; unit:string; stock:number; minStock:number };
export type InventoryMovement = { id:string; supplyName:string; type:string; quantity:number; previous:number; current:number; reason:string; responsible:string; createdAt:string };
export type RecipeLine = { id:string; productId:string; productName:string; supplyId:string; supplyName:string; unit:string; quantity:number };
type MovementRow={id:string;tipo:string;cantidad:number;saldo_anterior:number;saldo_nuevo:number;motivo:string;registrado_por_nombre:string|null;created_at:string;rest_insumos:{nombre:string}|null};
type RecipeRow={id:string;producto_id:string;insumo_id:string;cantidad:number;rest_productos:{nombre:string}|null;rest_insumos:{nombre:string;unidad:string}|null};

export async function getSupplies(): Promise<Supply[]> {
  const { empresaId } = await getBusinessContext();
  const { data,error }=await supabase.from('rest_insumos').select('id,codigo,nombre,categoria,unidad,stock,stock_minimo').eq('empresa_id',empresaId).eq('activo',true).order('nombre');
  if(error) throw error;
  return (data??[]).map(x=>({id:x.id,code:x.codigo,name:x.nombre,category:x.categoria,unit:x.unidad,stock:Number(x.stock),minStock:Number(x.stock_minimo)}));
}
export async function saveSupply(input:Omit<Supply,'id'|'stock'> & {id?:string;stock:number}) {
  const { empresaId }=await getBusinessContext();
  const row={empresa_id:empresaId,codigo:input.code.trim(),nombre:input.name.trim(),categoria:input.category,unidad:input.unit,stock:input.stock,stock_minimo:input.minStock};
  const result=input.id?await supabase.from('rest_insumos').update(row).eq('id',input.id):await supabase.from('rest_insumos').insert(row);
  if(result.error) throw result.error;
}
export async function registerInventoryMovement(supplyId:string,type:string,quantity:number,reason:string){
  const {error}=await supabase.rpc('rest_registrar_movimiento_inventario',{p_insumo_id:supplyId,p_tipo:type,p_cantidad:quantity,p_motivo:reason}); if(error) throw error;
}
export async function getInventoryMovements():Promise<InventoryMovement[]>{
  const {empresaId}=await getBusinessContext();
  const {data,error}=await supabase.from('rest_movimientos_inventario').select('id,tipo,cantidad,saldo_anterior,saldo_nuevo,motivo,registrado_por_nombre,created_at,rest_insumos(nombre)').eq('empresa_id',empresaId).order('created_at',{ascending:false}).limit(200); if(error) throw error;
  return ((data??[]) as unknown as MovementRow[]).map(x=>({id:x.id,supplyName:x.rest_insumos?.nombre??'Insumo',type:x.tipo,quantity:Number(x.cantidad),previous:Number(x.saldo_anterior),current:Number(x.saldo_nuevo),reason:x.motivo,responsible:x.registrado_por_nombre??'Sistema',createdAt:x.created_at}));
}
export async function getRecipeLines():Promise<RecipeLine[]>{
  const {empresaId}=await getBusinessContext();
  const {data,error}=await supabase.from('rest_recetas').select('id,producto_id,insumo_id,cantidad,rest_productos(nombre),rest_insumos(nombre,unidad)').eq('empresa_id',empresaId).order('created_at'); if(error) throw error;
  return ((data??[]) as unknown as RecipeRow[]).map(x=>({id:x.id,productId:x.producto_id,productName:x.rest_productos?.nombre??'Producto',supplyId:x.insumo_id,supplyName:x.rest_insumos?.nombre??'Insumo',unit:x.rest_insumos?.unidad??'',quantity:Number(x.cantidad)}));
}
export async function saveRecipeLine(productId:string,supplyId:string,quantity:number){
  const {empresaId}=await getBusinessContext(); const {error}=await supabase.from('rest_recetas').upsert({empresa_id:empresaId,producto_id:productId,insumo_id:supplyId,cantidad:quantity},{onConflict:'producto_id,insumo_id'}); if(error) throw error;
}
export async function deleteRecipeLine(id:string){const {error}=await supabase.from('rest_recetas').delete().eq('id',id);if(error)throw error;}
