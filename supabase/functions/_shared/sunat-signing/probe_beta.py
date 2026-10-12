"""Envío manual de UNA factura ficticia a SUNAT beta; producción no configurable."""
import argparse, base64, io, json, urllib.request, urllib.error, zipfile
from pathlib import Path
from lxml import etree
from validate_xml import validate
ENDPOINT = 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService'
TEST_RUC = '20123456789'
NS = {'cbc':'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2', 'cac':'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'}
def parse_xml(data):
    if len(data)>5_000_000 or b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper(): raise ValueError('XML no admitido')
    return etree.fromstring(data, etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False))
def parse_response(data, document_id):
    root=parse_xml(data)
    faults=root.xpath('//*[local-name()="Fault"]')
    if faults:
        fault=faults[0]
        return {'status':'SOAP_FAULT', 'code':fault.xpath('string(./*[local-name()="faultcode"])'), 'description':fault.xpath('string(./*[local-name()="faultstring"])')}
    responses=root.xpath('//*[local-name()="applicationResponse"]')
    if len(responses)!=1: raise ValueError('Respuesta sin CDR único')
    encoded=''.join(responses[0].itertext()).strip()
    decoded=base64.b64decode(encoded,validate=True)
    if len(decoded)>5_000_000: raise ValueError('CDR fuera de rango')
    with zipfile.ZipFile(io.BytesIO(decoded)) as archive:
        files=[entry for entry in archive.infolist() if not entry.is_dir()]
        if len(files)!=1 or files[0].file_size>5_000_000 or files[0].is_dir() or not files[0].filename.endswith('.xml'): raise ValueError('ZIP CDR no admitido: ' + repr([(f.filename, f.file_size) for f in files]))
        cdr=parse_xml(archive.read(files[0]))
    response=cdr.findall('cac:DocumentResponse/cac:Response',NS)
    if len(response)!=1: raise ValueError('CDR sin respuesta única')
    identifier=response[0].findtext('cbc:ReferenceID',namespaces=NS)
    if identifier!=document_id: raise ValueError('CDR corresponde a otro documento')
    code=response[0].findtext('cbc:ResponseCode',namespaces=NS)
    if code is None or not code.isdigit(): raise ValueError('Código CDR inválido')
    return {'status':'ACCEPTED_BETA' if code=='0' else 'REJECTED_BETA', 'code':code, 'description':response[0].findtext('cbc:Description',namespaces=NS), 'notes':cdr.findall('cbc:Note',NS) and [n.text for n in cdr.findall('cbc:Note',NS)] or []}
def probe(xml, schema, certificate, output_dir=None):
    validate(xml,schema,certificate)
    data=Path(xml).read_bytes();root=parse_xml(data)
    ruc=root.findtext('cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID',namespaces=NS)
    name=root.findtext('cac:AccountingSupplierParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName',namespaces=NS)
    document_type=root.findtext('cbc:InvoiceTypeCode',namespaces=NS)
    identifier=root.findtext('cbc:ID',namespaces=NS)
    if ruc!=TEST_RUC or name!='EMPRESA DE PRUEBA SAC' or document_type!='01' or identifier!='F001-1': raise ValueError('Solo se permite la factura ficticia fija de las pruebas')
    filename=f'{TEST_RUC}-01-{identifier}'
    zipped=io.BytesIO()
    with zipfile.ZipFile(zipped,'w',zipfile.ZIP_DEFLATED) as archive: archive.writestr(filename+'.xml',data)
    content=base64.b64encode(zipped.getvalue()).decode()
    soap=f'''<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">
<soapenv:Header><wsse:Security soapenv:mustUnderstand="1" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><wsse:UsernameToken><wsse:Username>{TEST_RUC}MODDATOS</wsse:Username><wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">MODDATOS</wsse:Password></wsse:UsernameToken></wsse:Security></soapenv:Header>
<soapenv:Body><ser:sendBill><fileName>{filename}.zip</fileName><contentFile>{content}</contentFile></ser:sendBill></soapenv:Body></soapenv:Envelope>'''
    request=urllib.request.Request(ENDPOINT,data=soap.encode(),headers={'Content-Type':'text/xml; charset=utf-8','SOAPAction':'urn:sendBill'})
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs): return None
    opener=urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request,timeout=30) as response:
            status=response.status;body=response.read(5_000_001)
    except urllib.error.HTTPError as error:
        status=error.code;body=error.read(5_000_001)
    result=parse_response(body,identifier)
    result.update(http_status=status,environment='beta',document=filename)
    if output_dir is not None:
        output_dir.mkdir(parents=True,exist_ok=True)
        (output_dir/'soap-response.xml').write_bytes(body)
        (output_dir/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    return result
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('xml',type=Path);parser.add_argument('--schema',required=True,type=Path);parser.add_argument('--certificate',required=True,type=Path)
    parser.add_argument('--output-dir',type=Path)
    args=parser.parse_args()
    try: print(json.dumps(probe(args.xml,args.schema,args.certificate,args.output_dir),ensure_ascii=False))
    except Exception as error:
        print(json.dumps({'status':'PROBE_FAILED','error_type':type(error).__name__,'detail':str(error)},ensure_ascii=False));raise SystemExit(1)
