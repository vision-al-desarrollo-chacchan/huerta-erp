/** SOLO beta: identidad y certificado ficticios fijos. Nunca credenciales reales. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import { buildReceiptSummary } from '../../../../src/services/sunat/build-receipt-summary.ts';
import { signSunatXml } from './sign-xml.mjs';
import { sendSignedReceiptSummary, consultReceiptTicket } from './live-transport.mjs';
const date=new Date(Date.now()-5*60*60*1000).toISOString().slice(0,10);
const summaryId=`RC-${date.replaceAll('-','')}-${randomInt(1,100000)}`;
const fixture=JSON.parse(execFileSync('python',[fileURLToPath(new URL('./test-fixtures.py',import.meta.url))],{encoding:'utf8'})).valid;
const draft={issuerRuc:'20123456789',issuerName:'EMPRESA FICTICIA',issuerAddress:'AV. PRUEBA',documentType:'03',series:'B001',number:1,issueDate:date,currency:'PEN',receiverDocumentType:'1',receiverDocumentNumber:'12345678',receiverName:'CLIENTE FICTICIO',items:[{description:'Producto ficticio',quantity:1,unitPrice:11.8}]};
const xml=signSunatXml({xml:buildReceiptSummary(draft,summaryId,date),...fixture});
const credentials={ruc:'20123456789',username:'MODDATOS',password:'MODDATOS'};
const folder=mkdtempSync(join(tmpdir(),'huerta-summary-beta-'));
const transport=async(url,options)=>{
 if(url!=='https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'||options.redirect!=='error')throw new Error('Destino no permitido.');
 const request=join(folder,'request.xml'),response=join(folder,'response.xml');
 writeFileSync(request,options.body,{mode:0o600});
 const code=execFileSync('curl',['-sS','--max-time','30','-X','POST','-H',options.headers['Content-Type']?'Content-Type: '+options.headers['Content-Type']:'Content-Type: text/xml','-H','SOAPAction: '+options.headers.SOAPAction,'--data-binary','@'+request,'-o',response,'-w','%{http_code}',url],{encoding:'utf8',timeout:35000});
 return new Response(readFileSync(response),{status:Number(code)});
};
try {
 const sent=await sendSignedReceiptSummary({xml,ruc:credentials.ruc,summaryId,credentials,environment:'beta'},transport);
 console.log(JSON.stringify({environment:'beta',summaryId,status:sent.status,ticket:sent.ticket,message:sent.message}));
 const result=await consultReceiptTicket({ticket:sent.ticket,summaryId,credentials,environment:'beta'},transport);
 console.log(JSON.stringify({environment:'beta',summaryId,status:result.status,code:result.code,message:result.message}));
} finally {rmSync(folder,{recursive:true,force:true});}
