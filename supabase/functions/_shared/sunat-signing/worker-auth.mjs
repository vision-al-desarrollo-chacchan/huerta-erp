/** Signed, short-lived, single-use requests; no permanent credential travels through pg_net. */
export async function verifyWorkerRequest(req, key, consume, now = Date.now()) {
 const timestamp=req.headers.get('x-sunat-worker-time'),nonce=req.headers.get('x-sunat-worker-nonce'),signature=req.headers.get('x-sunat-worker-signature');
 if(!/^\d{13}$/.test(timestamp??'')||! /^[0-9a-f-]{36}$/.test(nonce??'')||! /^[0-9a-f]{64}$/.test(signature??'')||Math.abs(now-Number(timestamp))>60000)return false;
 const secret=await key();
 const encoder=new TextEncoder();
 const cryptoKey=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,encoder.encode(`${timestamp}:${nonce}`)));
 const expected=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
 let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^signature.charCodeAt(i);
 return diff===0 && await consume(nonce, Number(timestamp));
}
