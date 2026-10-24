import test from 'node:test';import assert from 'node:assert/strict';
import { DOMImplementation, XMLSerializer } from '@xmldom/xmldom';
import { beginOperation, finishOperation } from '../../../../src/lib/durable-operation.ts';
import { renderPrintTest } from '../../../../src/lib/print-test.ts';
test('lost response and reload reuse the same key and original payload; users have isolated requests',()=>{
 const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const first=beginOperation(storage,'user-a:cash-1',{items:[1]});
 const retry=beginOperation(storage,'user-a:cash-1',{items:[2]});
 assert.deepEqual(retry,first);
 assert.notEqual(beginOperation(storage,'user-b:cash-1',{items:[1]}).key,first.key);
 finishOperation(storage,'user-a:cash-1','wrong-key');assert.ok(values.has('user-a:cash-1'));
 finishOperation(storage,'user-a:cash-1',first.key);assert.notEqual(beginOperation(storage,'user-a:cash-1',{items:[1]}).key,first.key);
});
test('printer names containing HTML serialize as text, never executable elements',()=>{
 const doc=new DOMImplementation().createDocument(null,'html');
 const head=doc.createElement('head'),body=doc.createElement('body');doc.documentElement.appendChild(head);doc.documentElement.appendChild(body);
 Object.defineProperties(doc,{head:{value:head},body:{value:body}});
 renderPrintTest(doc,{area:'cocina',printerName:'<img src=x onerror="alert(1)"><script>bad()</script>',widthMm:999});
 assert.equal(doc.getElementsByTagName('img').length,0);assert.equal(doc.getElementsByTagName('script').length,0);
 const xml=new XMLSerializer().serializeToString(doc);assert.ok(xml.includes('&lt;img'));assert.ok(xml.includes('size:80mm'));
});
