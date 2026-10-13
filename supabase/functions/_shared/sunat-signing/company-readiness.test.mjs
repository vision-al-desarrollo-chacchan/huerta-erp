import test from 'node:test';
import assert from 'node:assert/strict';
import { companyReadiness } from './company-readiness.mjs';
const input={company:{ruc:'20123456789',nombre:'EMPRESA FICTICIA',direccion:'AV. PRUEBA',activa:true},certificate:{ruc:'20123456789',huella:'huella-ficticia',vence_at:'2099-01-01T00:00:00Z'},sol:{ruc:'20123456789',envelope:'ficticio'},series:[{tipo_documento:'factura',serie:'F001',activa:true,siguiente_numero:1},{tipo_documento:'boleta',serie:'B001',activa:true,siguiente_numero:1}],review:{ruc:'20123456789',certificado_huella:'huella-ficticia',aprobada:true,revisada_at:'2026-10-13'},productionEnabled:true};
test('solo permite activar si coinciden todos los requisitos',()=>{
 assert.equal(companyReadiness(input).canActivate,true);
 for(const patch of [{company:{...input.company,ruc:null}},{company:{...input.company,direccion:''}},{certificate:{...input.certificate,vence_at:'2000-01-01'}},{certificate:{...input.certificate,ruc:'20999999999'}},{sol:{...input.sol,ruc:'20999999999'}},{review:{...input.review,certificado_huella:'otra'}},{review:{...input.review,aprobada:false}},{productionEnabled:false},{series:input.series.slice(1)}])assert.equal(companyReadiness({...input,...patch}).canActivate,false);
});
test('serie duplicada o correlativo inválido bloquean activación',()=>{
 assert.equal(companyReadiness({...input,series:[...input.series,input.series[0]]}).canActivate,false);
 assert.equal(companyReadiness({...input,series:input.series.map(s=>({...s,siguiente_numero:0}))}).canActivate,false);
});
test('no devuelve sobres, clave SOL, huella ni datos fiscales',()=>{
 const result=JSON.stringify(companyReadiness(input));
 for(const secret of ['huella-ficticia','20123456789','EMPRESA FICTICIA','ficticio'])assert.ok(!result.includes(secret));
});
