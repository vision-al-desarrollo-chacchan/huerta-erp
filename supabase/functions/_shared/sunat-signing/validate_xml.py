"""Validación local XSD y verificación criptográfica independiente, sin red."""
import argparse, base64, copy, hashlib
from pathlib import Path
from lxml import etree
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
DS = 'http://www.w3.org/2000/09/xmldsig#'
NS = {'ds': DS}
def validate(xml_path, schema_path, cert_path):
    data = Path(xml_path).read_bytes()
    if len(data) > 5_000_000 or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('XML no admitido')
    parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False)
    root = etree.fromstring(data, parser)
    schema = etree.XMLSchema(etree.parse(str(schema_path), parser))
    schema.assertValid(root)
    signatures = root.findall('.//ds:Signature', NS)
    if len(signatures) != 1:
        raise ValueError('Se requiere una firma')
    signature = signatures[0]
    info = signature.find('ds:SignedInfo', NS)
    references = info.findall('ds:Reference', NS)
    if len(references) != 1 or references[0].get('URI') != '':
        raise ValueError('Referencia inválida')
    reference = references[0]
    c14n = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
    if info.find('ds:CanonicalizationMethod', NS).get('Algorithm') != c14n or info.find('ds:SignatureMethod', NS).get('Algorithm') != 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256' or reference.find('ds:DigestMethod', NS).get('Algorithm') != 'http://www.w3.org/2001/04/xmlenc#sha256':
        raise ValueError('Algoritmos no admitidos')
    transforms = [n.get('Algorithm') for n in reference.findall('ds:Transforms/ds:Transform', NS)]
    if transforms != [DS + 'enveloped-signature', c14n]:
        raise ValueError('Transformaciones inválidas')
    unsigned = copy.deepcopy(root)
    node = unsigned.find('.//ds:Signature', NS)
    parent = node.getparent()
    if node.tail:
        previous = node.getprevious()
        if previous is None: parent.text = (parent.text or '') + node.tail
        else: previous.tail = (previous.tail or '') + node.tail
    parent.remove(node)
    canonical = etree.tostring(unsigned, method='c14n', exclusive=False, with_comments=False)
    digest = base64.b64decode(reference.findtext('ds:DigestValue', namespaces=NS), validate=True)
    if hashlib.sha256(canonical).digest() != digest:
        raise ValueError('Digest del documento inválido')
    certificate = x509.load_pem_x509_certificate(Path(cert_path).read_bytes())
    signature_value = base64.b64decode(signature.findtext('ds:SignatureValue', namespaces=NS), validate=True)
    certificate.public_key().verify(signature_value, etree.tostring(info, method='c14n', exclusive=False, with_comments=False), padding.PKCS1v15(), hashes.SHA256())
    return True
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('xml', type=Path)
    parser.add_argument('--schema', required=True, type=Path)
    parser.add_argument('--certificate', required=True, type=Path)
    args = parser.parse_args()
    validate(args.xml, args.schema, args.certificate)
    print('CORRECTO: XSD oficial y firma criptográfica independiente. No acredita aceptación SUNAT.')
