"""Pruebas de lectura SOAP/CDR; no realizan solicitudes de red."""
import base64, io, unittest, zipfile
from probe_beta import parse_response
CBC='urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
CAC='urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2'
def response(code='0', identifier='F001-1', duplicate=False):
    cdr=f'<ApplicationResponse xmlns:cbc="{CBC}" xmlns:cac="{CAC}"><cac:DocumentResponse><cac:Response><cbc:ReferenceID>{identifier}</cbc:ReferenceID><cbc:ResponseCode>{code}</cbc:ResponseCode><cbc:Description>Prueba</cbc:Description></cac:Response></cac:DocumentResponse></ApplicationResponse>'
    data=io.BytesIO()
    with zipfile.ZipFile(data,'w') as archive:
        archive.writestr('cdr/',b'')
        archive.writestr('cdr/R-prueba.xml',cdr)
        if duplicate:archive.writestr('otro.xml',cdr)
    encoded=base64.b64encode(data.getvalue()).decode()
    return f'<Envelope><Body><applicationResponse>{encoded}</applicationResponse></Body></Envelope>'.encode()
class ResponseTests(unittest.TestCase):
    def test_accepted_with_directory(self):self.assertEqual(parse_response(response(),'F001-1')['status'],'ACCEPTED_BETA')
    def test_rejected(self):self.assertEqual(parse_response(response('2001'),'F001-1')['status'],'REJECTED_BETA')
    def test_other_document(self):
        with self.assertRaises(ValueError):parse_response(response(identifier='F001-2'),'F001-1')
    def test_duplicate_files(self):
        with self.assertRaises(ValueError):parse_response(response(duplicate=True),'F001-1')
    def test_soap_fault(self):self.assertEqual(parse_response(b'<Envelope><Fault><faultcode>3030</faultcode><faultstring>Prueba</faultstring></Fault></Envelope>','F001-1')['code'],'3030')
    def test_invalid_response(self):
        for xml in [b'<Envelope/>',b'<Envelope><applicationResponse>invalid</applicationResponse></Envelope>',b'<!DOCTYPE Envelope><Envelope/>']:
            with self.assertRaises(ValueError):parse_response(xml,'F001-1')
if __name__=='__main__':unittest.main()
