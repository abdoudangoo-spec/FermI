// ═══════════════════════════════════════════════════════════
//  src/components/FormSheet.jsx — Formulaire modal piloté par configuration
//  Validation intégrée, erreurs par champ, état « envoi en cours ».
// ═══════════════════════════════════════════════════════════
import { Fragment, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { Sheet, Field, Select, Stepper, Button, Banner, Row, Checkbox } from './ui';
import { rules, validate, toNumber } from '../utils/validation';
import { maskDateInput, todayStr } from '../utils/dates';
import { space, useTheme } from '../theme';

function valeursInitiales(fields, initial) {
  const v = {};
  for (const f of fields) {
    if (initial && initial[f.name] !== undefined) v[f.name] = initial[f.name];
    else if (f.default !== undefined) v[f.name] = typeof f.default === 'function' ? f.default() : f.default;
    else if (f.type === 'checkbox') v[f.name] = false;
    else if (f.type === 'custom') v[f.name] = null;
    else v[f.name] = f.type === 'stepper' ? (f.min ?? 0) : '';
  }
  return v;
}

function schemaDepuisChamps(fields, values) {
  const schema = {};
  for (const f of fields) {
    if (f.show && !f.show(values)) continue;
    const r = [];
    if (f.type === 'checkbox') { if (f.required) r.push((x) => (x ? null : f.requiredMessage || 'Ce choix est obligatoire')); }
    else if (f.required) r.push(rules.required(f.label));
    if (f.type === 'number' || f.type === 'integer') {
      r.push(rules.nombre(f.label, { min: f.min ?? 0, max: f.max ?? 1e9, entier: f.type === 'integer' }));
      if (f.positive) r.push(rules.positif(f.label));
    } else if (f.type === 'date') r.push(rules.date(f.label, { futur: f.futur !== false }));
    else if (f.type === 'phone') r.push(rules.phone);
    else if (f.type === 'email') r.push(rules.email);
    else if (f.type === 'text' || f.type === 'multiline') r.push(rules.maxLen(f.maxLen || (f.type === 'multiline' ? 2000 : 200), f.label));
    if (f.rules) r.push(...f.rules);
    if (r.length) schema[f.name] = r;
  }
  return schema;
}

/** Convertit les chaînes numériques en nombres et nettoie le texte. */
function nettoyerValeurs(fields, values) {
  const out = {};
  for (const f of fields) {
    if (f.show && !f.show(values)) continue;
    const raw = values[f.name];
    if (f.type === 'number' || f.type === 'integer') out[f.name] = String(raw ?? '').trim() === '' ? null : toNumber(raw);
    else if (f.type === 'stepper') out[f.name] = Number(raw) || 0;
    else if (typeof raw === 'string') out[f.name] = raw.trim();
    else out[f.name] = raw;
  }
  return out;
}

export function FormSheet({
  visible, onClose, title, fields, initial, submitLabel = 'Enregistrer', onSubmit,
  check, intro, variant = 'primary',
}) {
  const { c } = useTheme();
  const [values, setValues] = useState(() => valeursInitiales(fields, initial));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  useEffect(() => {
    if (visible) { setValues(valeursInitiales(fields, initial)); setErrors({}); setFormError(null); setBusy(false); }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (name, val) => {
    setValues((v) => ({ ...v, [name]: val }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async () => {
    if (busy) return;
    const res = validate(values, schemaDepuisChamps(fields, values));
    const extra = check ? check(nettoyerValeurs(fields, values)) || {} : {};
    const all = { ...res.errors, ...extra };
    if (Object.keys(all).length > 0) { setErrors(all); setFormError('Corrigez les champs indiqués.'); return; }
    setBusy(true);
    setFormError(null);
    try {
      const r = await onSubmit(nettoyerValeurs(fields, values));
      if (!mounted.current) return;
      setBusy(false);
      if (r && r.error) setFormError(r.error);
      else onClose();
    } catch (e) {
      if (!mounted.current) return;
      setBusy(false);
      setFormError("Une erreur est survenue. Vos données n'ont pas été enregistrées.");
    }
  };

  const renderField = (f) => {
    const common = { label: f.label, error: errors[f.name], optional: !f.required && f.type !== 'stepper' && f.type !== 'select' };
    const val = values[f.name];
    switch (f.type) {
      case 'checkbox':
        return (
          <Checkbox checked={!!val} onChange={(x) => set(f.name, x)} error={errors[f.name]}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.text }}>{f.label}</Text>
            {errors[f.name] ? <Text style={{ fontSize: 12.5, color: c.danger }}>{errors[f.name]}</Text> : null}
          </Checkbox>
        );
      case 'custom':
        return f.render(values, (x) => set(f.name, x), errors[f.name]);
      case 'select':
        return <Select {...common} optional={false} value={val} options={typeof f.options === 'function' ? f.options(values) : f.options} onChange={(x) => set(f.name, x)} />;
      case 'stepper':
        return <Stepper label={f.label} value={Number(val) || 0} min={typeof f.min === 'function' ? f.min(values) : f.min} max={typeof f.max === 'function' ? f.max(values) : f.max} step={f.step} error={errors[f.name]} onChange={(x) => set(f.name, x)} />;
      case 'date':
        return (
          <Field {...common} value={val} onChangeText={(t) => set(f.name, maskDateInput(t))} keyboardType="number-pad" placeholder="AAAA-MM-JJ" maxLength={10}
            hint="Format AAAA-MM-JJ" right={<Button label="Aujourd'hui" size="sm" variant="ghost" onPress={() => set(f.name, todayStr())} style={{ marginLeft: 4 }} />} />
        );
      case 'number':
        return <Field {...common} value={String(val ?? '')} onChangeText={(t) => set(f.name, t.replace(/[^\d.,]/g, '').slice(0, 14))} keyboardType="decimal-pad" placeholder={f.placeholder} hint={f.hint} />;
      case 'integer':
        return <Field {...common} value={String(val ?? '')} onChangeText={(t) => set(f.name, t.replace(/\D/g, '').slice(0, 9))} keyboardType="number-pad" placeholder={f.placeholder} hint={f.hint} />;
      case 'phone':
        return <Field {...common} value={val} onChangeText={(t) => set(f.name, t)} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder={f.placeholder} hint={f.hint} maxLength={20} />;
      case 'email':
        return <Field {...common} value={val} onChangeText={(t) => set(f.name, t)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder={f.placeholder} />;
      case 'multiline':
        return <Field {...common} value={val} onChangeText={(t) => set(f.name, t)} multiline maxLength={f.maxLen || 2000} placeholder={f.placeholder} hint={f.hint} />;
      default:
        return <Field {...common} value={val} onChangeText={(t) => set(f.name, t)} placeholder={f.placeholder} hint={f.hint} maxLength={f.maxLen || 200} autoCapitalize={f.autoCapitalize || 'sentences'} />;
    }
  };

  const visibles = fields.filter((f) => !f.show || f.show(values));
  const blocs = [];
  for (let i = 0; i < visibles.length; i += 1) {
    const f = visibles[i];
    const suivant = visibles[i + 1];
    if (f.half && suivant && suivant.half) { blocs.push([f, suivant]); i += 1; } else blocs.push([f]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={busy ? () => {} : onClose}
      title={title}
      footer={<Button label={submitLabel} onPress={submit} loading={busy} variant={variant} />}
    >
      {intro ? <Text style={{ fontSize: 14, lineHeight: 20, color: c.textSub, marginBottom: space.sm }}>{intro}</Text> : null}
      {formError ? <Banner tone="danger" text={formError} style={{ marginBottom: space.sm }} /> : null}
      <View style={{ gap: space.lg }}>
        {blocs.map((b) => (
          <Fragment key={b.map((f) => f.name).join('+')}>
            {b.length === 2 ? (
              <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>{renderField(b[0])}</View>
                <View style={{ flex: 1 }}>{renderField(b[1])}</View>
              </Row>
            ) : renderField(b[0])}
          </Fragment>
        ))}
      </View>
    </Sheet>
  );
}
