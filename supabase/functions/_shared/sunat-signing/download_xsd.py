"""Descarga manual y verificada del paquete XSD oficial; no envía comprobantes."""
import argparse, hashlib, io, urllib.request, zipfile
from pathlib import Path
URL = 'https://cpe.sunat.gob.pe/sites/default/files/inline-files/Archivos%20XSD%20%281%29.zip'
SHA256 = '5cac9d9353521340fbc15d23f465a4946b004535b9ff411541c87da01694dbd5'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
with urllib.request.urlopen(URL, timeout=30) as response:
    data = response.read(5_000_001)
if len(data) > 5_000_000 or hashlib.sha256(data).hexdigest() != SHA256:
    raise ValueError('El paquete oficial cambió o está incompleto; revisar antes de actualizar el hash.')
root = args.destination.resolve()
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    if sum(entry.file_size for entry in archive.infolist()) > 50_000_000:
        raise ValueError('Paquete fuera de rango')
    for entry in archive.infolist():
        if not entry.filename.startswith('Archivos XSD/2.1/') or not entry.filename.endswith('.xsd'):
            continue
        target = (root / entry.filename).resolve()
        if not target.is_relative_to(root):
            raise ValueError('Ruta XSD inválida')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(archive.read(entry))
print('XSD UBL 2.1 descargado y checksum verificado.')
