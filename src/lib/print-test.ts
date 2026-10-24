export function renderPrintTest(doc: Document, config: { area: string; printerName: string; widthMm: number }) {
  const width = config.widthMm === 58 ? 58 : 80;
  const main = doc.createElement('main');
  for (const [tag, value] of [['h1', 'HUERTA ERP'], ['h2', `PRUEBA ${config.area.toUpperCase()}`], ['p', new Date().toLocaleString('es-PE')],
    ['p', `Ticketera: ${config.printerName || 'Sin nombre'}`], ['p', `Ancho: ${width} mm`], ['strong', 'IMPRESIÓN CORRECTA']]) {
    const element = doc.createElement(tag); element.textContent = value; main.appendChild(element);
  }
  const style = doc.createElement('style');
  style.textContent = `@page{size:${width}mm auto;margin:4mm}body{font-family:Arial;text-align:center;margin:0}main{width:${width - 8}mm}`;
  doc.head.appendChild(style);
  while (doc.body.firstChild) doc.body.removeChild(doc.body.firstChild);
  doc.body.appendChild(main);
}
