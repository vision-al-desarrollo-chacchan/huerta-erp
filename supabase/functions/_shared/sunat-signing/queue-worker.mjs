/** Lote global de dos trabajos; no hay reenvíos después de iniciar transmisión. */
export async function processQueueBatch({claim,run,finish}) {
 const jobs=await claim();
 let completed=0;
 await Promise.all(jobs.map(async job=>{
  let state='blocked';
  try {
   const response=await run(job);
   const body=await response.json();
   if(response.ok && ['aceptado','observado','rechazado','anulado'].includes(body.estado))state='done';
   else if(response.ok && ['enviando','incierto'].includes(body.estado))state='consult';
  }catch{/* Una caída no autoriza un reenvío. */}
  await finish(job,state);completed++;
 }));
 return {processed:completed};
}
