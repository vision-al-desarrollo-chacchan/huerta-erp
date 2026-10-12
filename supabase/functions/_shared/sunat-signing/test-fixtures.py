"""Certificados efímeros de prueba; nunca se guardan claves ni se envían a SUNAT."""
import datetime, json
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
now = datetime.datetime.now(datetime.timezone.utc)
def fixture(ruc='20123456789', expired=False, future=False, bits=2048):
    key = rsa.generate_private_key(public_exponent=65537, key_size=bits)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'SOLO PRUEBAS HUERTA'), x509.NameAttribute(NameOID.SERIAL_NUMBER, ruc)])
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now + datetime.timedelta(days=1) if future else now - datetime.timedelta(days=2))
            .not_valid_after(now - datetime.timedelta(days=1) if expired else now + datetime.timedelta(days=2))
            .sign(key, hashes.SHA256()))
    return dict(certificatePem=cert.public_bytes(serialization.Encoding.PEM).decode(),
                privateKeyPem=key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode())
print(json.dumps(dict(valid=fixture(), other=fixture('20999999999'), expired=fixture(expired=True), future=fixture(future=True), weak=fixture(bits=1024))))
