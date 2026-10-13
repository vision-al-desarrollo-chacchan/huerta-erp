import { useEffect, useRef, useState } from 'react';
import { getBillingConfiguration, type BillingConfig } from '../../services/electronic-billing';
import { getFiscalCompany, saveFiscalCompany, uploadFiscalCertificate, type FiscalCompany } from '../../services/sunat/company-setup';

const input = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 disabled:bg-slate-100';
const button = 'rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50';

export default function SunatCompanySetup({ onSaved }: { onSaved: () => Promise<void> }) {
  const [company, setCompany] = useState<FiscalCompany | null>(null);
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [checkedAt] = useState(() => Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let mounted = true;
    void Promise.all([getFiscalCompany(), getBillingConfiguration()]).then(([result, billing]) => {
      if (mounted) { setCompany(result.company); setCanEdit(result.canEdit); setConfig(billing); }
    }).catch(() => { if (mounted) setError('No se pudo cargar la configuración de esta empresa.'); });
    return () => { mounted = false; };
  }, []);
  const save = async () => {
    if (!company || !canEdit) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await saveFiscalCompany(company);
      await onSaved();
      setNotice('Datos fiscales guardados para esta empresa. La emisión real continúa desactivada.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron guardar los datos.'); }
    finally { setBusy(false); }
  };
  const upload = async () => {
    if (!file || !canEdit) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await uploadFiscalCertificate(file, password);
      setConfig(await getBillingConfiguration());
      await onSaved();
      setNotice('Certificado validado y guardado cifrado para esta empresa. La emisión no se activa automáticamente.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el certificado.'); }
    finally {
      setPassword(''); setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setBusy(false);
    }
  };
  const certificateCurrent = Boolean(config?.certificateConfigured && config.certificateExpiresAt && Date.parse(config.certificateExpiresAt + 'T23:59:59Z') > checkedAt);
  return <section className="space-y-5 rounded-2xl border bg-white p-5 md:p-6">
    <div><h2 className="text-xl font-black text-slate-950">Configura la facturación de tu empresa</h2><p className="mt-1 text-sm text-slate-600">Cada empresa utiliza su propio RUC, certificado y series. Guardar estos datos no activa la emisión.</p></div>
    <div className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">Emisión real pendiente de validación. La prueba beta usa datos ficticios y no tiene validez tributaria. Si tu negocio está en Nuevo RUS, conserva las pruebas ficticias y no configures facturas reales.</div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 font-semibold text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-700">{notice}</p>}
    {!company ? <p>Cargando datos fiscales…</p> : <>
      {!canEdit && <p className="text-sm text-slate-600">Solo el propietario o un administrador puede modificar esta configuración.</p>}
      <fieldset disabled={busy || !canEdit} className="space-y-4">
        <legend className="mb-3 font-black text-slate-950">1. Datos fiscales</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="RUC"><input className={input} inputMode="numeric" maxLength={11} value={company.ruc} onChange={e => setCompany({ ...company, ruc: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Razón social registrada en SUNAT"><input className={input} maxLength={200} value={company.legalName} onChange={e => setCompany({ ...company, legalName: e.target.value })} /></Field>
          <Field label="Dirección fiscal"><input className={input} maxLength={500} value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} /></Field>
        </div>
        <p className="text-xs text-slate-500">Estos datos actualizan el perfil de la empresa. Verifica que coincidan con su ficha RUC.</p>
        <button type="button" className={button} onClick={() => void save()}>Guardar datos fiscales</button>
      </fieldset>
      <fieldset disabled={busy || !canEdit} className="space-y-4 border-t pt-5">
        <legend className="pt-5 font-black text-slate-950">2. Certificado digital</legend>
        <p className="text-sm text-slate-600">{config?.certificateConfigured ? `Certificado: ${config.certificateName}. Vence: ${config.certificateExpiresAt || 'pendiente de verificar'}.` : 'Aún no se ha configurado un certificado para esta empresa.'}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Archivo PFX o P12 (máximo 2 MB)"><input ref={fileInput} type="file" accept=".pfx,.p12" className={input} onChange={e => setFile(e.target.files?.[0] ?? null)} /></Field>
          <Field label="Contraseña del certificado"><input type="password" autoComplete="new-password" className={input} value={password} onChange={e => setPassword(e.target.value)} /></Field>
        </div>
        <p className="text-xs text-slate-500">El servidor comprueba contraseña, vigencia y correspondencia con el RUC. La contraseña y el archivo se guardan cifrados; el vencimiento se obtiene del certificado.</p>
        <button type="button" disabled={!file || busy || !canEdit} className={button} onClick={() => void upload()}>Validar y guardar certificado</button>
      </fieldset>
    </>}
    <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
      <h3 className="font-black">3. Preparación para emitir</h3>
      <p>Datos fiscales: {company?.ruc && company.legalName && company.address ? 'registrados; requieren verificación SUNAT' : 'pendientes'}.</p>
      <p>Certificado: {certificateCurrent ? 'configurado y vigente' : 'pendiente o vencido'}.</p>
      <p>Series: configura boletas y facturas en «Series por sucursal».</p>
      <p>Credenciales SOL y envío real: pendientes de integración y validación.</p>
      <button type="button" disabled className={button}>Activación real pendiente</button>
    </div>
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>{children}</label>;
}
