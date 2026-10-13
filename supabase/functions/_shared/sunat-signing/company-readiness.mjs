/** Diagnóstico sin secretos. Las banderas de configuración no sustituyen al certificado almacenado. */
export function companyReadiness({company,certificate,sol,series,review,productionEnabled,now=Date.now()}) {
 const missing=[];
 if(!company?.activa||! /^[0-9]{11}$/.test(company.ruc??'')||!company.nombre?.trim()||!company.direccion?.trim())missing.push('RUC, razón social y dirección fiscal guardados');
 const certificateValid=!!(certificate?.ruc===company?.ruc&&certificate?.huella&&Date.parse(certificate.vence_at)>now);
 if(!certificateValid)missing.push('certificado digital vigente correspondiente al RUC');
 const solReady=!!(sol?.ruc===company?.ruc&&sol?.envelope);
 if(!solReady)missing.push('usuario y clave SOL guardados para el RUC');
 for(const [type,prefix]of [['factura','F'],['boleta','B']]){
  if((series??[]).filter(s=>s.tipo_documento===type&&s.activa&&new RegExp('^'+prefix+'[A-Z0-9]{3}$').test(s.serie)&&Number.isSafeInteger(Number(s.siguiente_numero))&&Number(s.siguiente_numero)>=1&&Number(s.siguiente_numero)<=99999999).length!==1)missing.push(`una serie activa válida de ${type} para esta sucursal`);
 }
 const reviewed=!!(certificateValid&&review?.aprobada&&review.revisada_at&&review.ruc===company?.ruc&&review.certificado_huella===certificate?.huella);
 if(!reviewed)missing.push('validación de la primera emisión real con este RUC y certificado');
 if(!productionEnabled)missing.push('habilitación del envío real del servicio');
 return {canActivate:missing.length===0,missing,certificateValid,solReady,reviewed,productionEnabled:!!productionEnabled};
}
