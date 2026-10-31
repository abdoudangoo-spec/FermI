import { toDateStr, parseDateStr, addDays, diffDays, maskDateInput, periodeDates, formatDateFR } from '../utils/dates';
import { formatNombre, sansEmoji } from '../utils/format';
import { rules, validate, toNumber, evaluerMotDePasse } from '../utils/validation';
import { validerUrlPi } from '../utils/piUrl';
import { escapeHtml } from '../utils/html';
import { messageErreur } from '../utils/errors';

describe('dates locales', () => {
  test('toDateStr / parseDateStr', () => {
    expect(toDateStr(new Date(2026, 9, 30))).toBe('2026-10-30');
    expect(parseDateStr('2026-02-30')).toBeNull();
    expect(parseDateStr('2024-02-29')).toBeTruthy();
    expect(parseDateStr('30/10/2026')).toBeNull();
  });
  test('calculs', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-10-01', '2026-10-30')).toBe(29);
    expect(periodeDates('mois', new Date(2026, 9, 30))).toEqual({ debut: '2026-10-01', fin: '2026-10-30' });
  });
  test('saisie masquée et affichage', () => {
    expect(maskDateInput('20261030')).toBe('2026-10-30');
    expect(maskDateInput('abc2026')).toBe('2026');
    expect(formatDateFR('2026-10-30')).toBe('30 oct. 2026');
  });
});

describe('format et texte', () => {
  test('formatNombre', () => {
    expect(formatNombre(1234567)).toBe('1\u202f234\u202f567');
    expect(formatNombre(-1500)).toBe('−1\u202f500');
    expect(formatNombre(12.5, 1)).toBe('12,5');
    expect(formatNombre(NaN)).toBe('0');
  });
  test('sansEmoji', () => {
    expect(sansEmoji('🚨 DANGER ⚡ chaleur')).toBe('DANGER chaleur');
  });
  test('escapeHtml neutralise les balises', () => {
    expect(escapeHtml('<img src=x onerror="a">&')).toBe('&lt;img src=x onerror=&quot;a&quot;&gt;&amp;');
  });
});

describe('validation', () => {
  test('nombres', () => {
    expect(toNumber('12,5')).toBe(12.5);
    expect(Number.isNaN(toNumber(''))).toBe(true);
    expect(rules.nombre('Poids', { max: 10 })('11')).toBe('Poids doit être ≤ 10');
    expect(rules.positif('Montant')('0')).toBe('Montant doit être supérieur à 0');
  });
  test('email, date, téléphone', () => {
    expect(rules.email('a@b')).toBe('Adresse email invalide');
    expect(rules.email('a@b.co')).toBeNull();
    expect(rules.date('Date', { futur: false })('2999-01-01')).toBe('Date ne peut pas être dans le futur');
    expect(rules.phone('abc')).toBe('Numéro de téléphone invalide');
  });
  test('validate renvoie la première erreur de chaque champ', () => {
    const r = validate({ a: '', b: 'x' }, { a: [rules.required('A')], b: [rules.required('B')] });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual({ a: 'A requis' });
  });
  test('politique de mot de passe', () => {
    expect(evaluerMotDePasse('abc').valide).toBe(false);
    expect(evaluerMotDePasse('motdepasse').valide).toBe(false);
    expect(evaluerMotDePasse('jean.dupont12345', 'jean.dupont@x.com').valide).toBe(false);
    expect(evaluerMotDePasse('Ferme2026Niger!').valide).toBe(true);
  });
});

describe('adresse du contrôleur IoT', () => {
  test('HTTP autorisé uniquement en réseau local', () => {
    expect(validerUrlPi('http://192.168.1.42:8080').ok).toBe(true);
    expect(validerUrlPi('http://192.168.1.42:8080/').url).toBe('http://192.168.1.42:8080');
    expect(validerUrlPi('http://poulailler.local').ok).toBe(true);
    expect(validerUrlPi('http://172.20.0.1').ok).toBe(true);
    expect(validerUrlPi('http://example.com').ok).toBe(false);
    expect(validerUrlPi('http://8.8.8.8').ok).toBe(false);
    expect(validerUrlPi('http://172.32.0.1').ok).toBe(false);
    expect(validerUrlPi('https://example.com').ok).toBe(true);
  });
  test('formats dangereux refusés', () => {
    expect(validerUrlPi('ftp://10.0.0.1').ok).toBe(false);
    expect(validerUrlPi('http://user@10.0.0.1').ok).toBe(false);
    expect(validerUrlPi('http://10.0.0.1:99999').ok).toBe(false);
    expect(validerUrlPi('').ok).toBe(false);
  });
});

describe('messages d\'erreur', () => {
  test('connexion : message identique pour compte inconnu et mauvais mot de passe', () => {
    expect(messageErreur({ code: 'auth/user-not-found' })).toBe(messageErreur({ code: 'auth/wrong-password' }));
  });
  test("aucun détail technique n'est exposé", () => {
    expect(messageErreur(new Error('SQLITE_CONSTRAINT: UNIQUE failed'))).toBe('Une erreur est survenue. Réessayez dans un instant.');
  });
});
