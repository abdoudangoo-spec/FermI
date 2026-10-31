// ═══════════════════════════════════════════════════════════
//  src/components/ui.jsx — Bibliothèque de composants FermI
// ═══════════════════════════════════════════════════════════
import { forwardRef, useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, Modal, ActivityIndicator,
  RefreshControl, KeyboardAvoidingView, Platform, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, makeStyles, toneColors, TONE_ICON, space, radius, type } from '../theme';

export function Icon({ name, size = 20, color, style }) {
  const { c } = useTheme();
  return <Ionicons name={name} size={size} color={color || c.textSub} style={style} accessible={false} />;
}

const useUi = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: c.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  headerText: { flex: 1 },
  title: { ...type.title, color: c.text },
  subtitle: { ...type.caption, color: c.textMuted, marginTop: 2 },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  footer: { padding: space.lg, backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, gap: space.sm },
  card: { backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  sectionTitle: { ...type.label, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  listBody: { flex: 1 },
  listTitle: { ...type.body, color: c.text },
  listSub: { ...type.caption, color: c.textMuted, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { ...type.caption, fontWeight: '600' },
  statLabel: { ...type.caption, color: c.textMuted },
  statValue: { ...type.title, ...type.numeric, color: c.text, marginTop: 2 },
  statUnit: { ...type.caption, color: c.textMuted },
  barBg: { height: 6, borderRadius: radius.pill, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: radius.pill },
  btn: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm, borderWidth: 1 },
  btnSm: { minHeight: 40, paddingHorizontal: space.md },
  btnText: { ...type.heading },
  iconBtn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tabsWrap: { backgroundColor: c.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  tab: { flexGrow: 1, minWidth: 88, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, borderBottomWidth: 2 },
  tabText: { ...type.label },
  label: { ...type.label, color: c.textSub, marginBottom: 6 },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: space.md, color: c.text, fontSize: 16 },
  inputMulti: { minHeight: 96, paddingTop: space.md, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldMsg: { ...type.caption, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheetWrap: { width: '100%', maxHeight: '90%' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: radius.lg + 4, borderTopRightRadius: radius.lg + 4, maxHeight: '100%' },
  sheetGrab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, marginTop: space.sm },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingVertical: space.sm },
  sheetTitle: { ...type.title, color: c.text, flex: 1 },
  sheetBody: { padding: space.lg, paddingBottom: space.xl, gap: space.xs },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: space.lg },
  optionText: { ...type.body, color: c.text, flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, borderRadius: radius.md, padding: space.md },
  bannerText: { ...type.body, flex: 1 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md, paddingVertical: 10 },
  kvKey: { ...type.body, color: c.textSub },
  kvVal: { ...type.body, color: c.text, flexShrink: 1, textAlign: 'right' },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: { width: 48, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  stepInput: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700' },
}));

// ── Écran ───────────────────────────────────────────────────
export function Screen({
  title, subtitle, onBack, right, children, scroll = true, onRefresh, refreshing = false,
  footer, padded = true, edges = ['top'], below,
}) {
  const { c } = useTheme();
  const s = useUi();
  return (
    <SafeAreaView style={s.screen} edges={edges}>
      {title ? (
        <View style={s.header}>
          {onBack ? <IconButton icon="chevron-back" label="Retour" onPress={onBack} /> : null}
          <View style={s.headerText}>
            <Text style={s.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
          {right || null}
        </View>
      ) : null}
      {below || null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[s.content, !padded && { padding: 0 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Surfaces ────────────────────────────────────────────────
export function Card({ children, style, tone }) {
  const { c } = useTheme();
  const s = useUi();
  const t = tone ? toneColors(c, tone) : null;
  return <View style={[s.card, t && { backgroundColor: t.bg, borderColor: t.fg + '55' }, style]}>{children}</View>;
}

export function Section({ title, action, onAction }) {
  const { c } = useTheme();
  const s = useUi();
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle} accessibilityRole="header">{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={[type.label, { color: c.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Divider() {
  const s = useUi();
  return <View style={s.divider} />;
}

export function ListItem({ icon, title, subtitle, right, onPress, tone, destructive }) {
  const { c } = useTheme();
  const s = useUi();
  const col = destructive ? c.danger : tone ? toneColors(c, tone).fg : c.primary;
  const body = (
    <View style={s.listItem}>
      {icon ? (
        <View style={[s.iconBtn, { backgroundColor: destructive ? c.dangerSoft : tone ? toneColors(c, tone).bg : c.primarySoft, width: 40, height: 40 }]}>
          <Icon name={icon} size={20} color={col} />
        </View>
      ) : null}
      <View style={s.listBody}>
        <Text style={[s.listTitle, destructive && { color: c.danger }]}>{title}</Text>
        {subtitle ? <Text style={s.listSub}>{subtitle}</Text> : null}
      </View>
      {right || null}
      {onPress ? <Icon name="chevron-forward" size={18} color={c.textMuted} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} android_ripple={{ color: c.surfaceAlt }}>
      {body}
    </Pressable>
  );
}

export function KeyValue({ label, value, tone }) {
  const { c } = useTheme();
  const s = useUi();
  return (
    <View style={s.kv}>
      <Text style={s.kvKey}>{label}</Text>
      <Text style={[s.kvVal, tone ? { color: toneColors(c, tone).fg, fontWeight: '600' } : null]}>{value}</Text>
    </View>
  );
}

export function Pill({ label, tone = 'neutral', icon }) {
  const { c } = useTheme();
  const s = useUi();
  const t = toneColors(c, tone);
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      {icon ? <Icon name={icon} size={13} color={t.fg} /> : null}
      <Text style={[s.pillText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, unit, tone, style }) {
  const { c } = useTheme();
  const s = useUi();
  return (
    <View style={[{ flex: 1 }, style]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, tone ? { color: toneColors(c, tone).fg } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}{unit ? <Text style={s.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, max = 100, tone = 'primary' }) {
  const { c } = useTheme();
  const s = useUi();
  const pct = max > 0 ? Math.min(100, Math.max(0, (Number(value) / max) * 100)) : 0;
  return (
    <View style={s.barBg} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: toneColors(c, tone).fg }]} />
    </View>
  );
}

export function Avatar({ name, uri, size = 56 }) {
  const { c } = useTheme();
  const s = useUi();
  const initiale = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={{ fontSize: size * 0.42, fontWeight: '700', color: c.primary }}>{initiale}</Text>
      )}
    </View>
  );
}

// ── Boutons ─────────────────────────────────────────────────
export function Button({ label, onPress, variant = 'primary', icon, loading = false, disabled = false, size = 'md', style, accessibilityLabel }) {
  const { c } = useTheme();
  const s = useUi();
  const inactive = disabled || loading;
  const palette = {
    primary:   { bg: c.primary,    fg: c.onPrimary, bd: c.primary },
    secondary: { bg: c.surface,    fg: c.primary,   bd: c.border },
    danger:    { bg: c.danger,     fg: '#FFFFFF',   bd: c.danger },
    dangerOutline: { bg: c.surface, fg: c.danger,   bd: c.danger },
    ghost:     { bg: 'transparent', fg: c.primary,  bd: 'transparent' },
  }[variant] || { bg: c.primary, fg: c.onPrimary, bd: c.primary };
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        s.btn, size === 'sm' && s.btnSm,
        { backgroundColor: palette.bg, borderColor: palette.bd, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={palette.fg} /> : (
        <>
          {icon ? <Icon name={icon} size={18} color={palette.fg} /> : null}
          <Text style={[s.btnText, { color: palette.fg }]} numberOfLines={1}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone, size = 22, style }) {
  const { c } = useTheme();
  const s = useUi();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [s.iconBtn, { backgroundColor: pressed ? c.surfaceAlt : 'transparent' }, style]}>
      <Icon name={icon} size={size} color={tone ? toneColors(c, tone).fg : c.text} />
    </Pressable>
  );
}

// ── Navigation locale ───────────────────────────────────────
export function Tabs({ tabs, active, onSelect }) {
  const { c } = useTheme();
  const s = useUi();
  return (
    <View style={s.tabsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1 }}>
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <Pressable key={t.id} onPress={() => onSelect(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
              style={[s.tab, { borderBottomColor: on ? c.primary : 'transparent' }]}>
              <Text style={[s.tabText, { color: on ? c.primary : c.textMuted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ── Champs ──────────────────────────────────────────────────
export const Field = forwardRef(function Field({ label, error, hint, optional, multiline, right, style, ...props }, ref) {
  const { c } = useTheme();
  const s = useUi();
  const [focus, setFocus] = useState(false);
  return (
    <View>
      {label ? <Text style={s.label}>{label}{optional ? <Text style={{ color: c.textMuted, fontWeight: '400' }}> · facultatif</Text> : null}</Text> : null}
      <View style={s.inputRow}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={c.textMuted}
          multiline={multiline}
          selectionColor={c.primary}
          {...props}
          onFocus={(e) => { setFocus(true); if (props.onFocus) props.onFocus(e); }}
          onBlur={(e) => { setFocus(false); if (props.onBlur) props.onBlur(e); }}
          style={[s.input, { flex: 1 }, multiline && s.inputMulti, focus && { borderColor: c.primary, borderWidth: 2 }, error ? { borderColor: c.danger } : null, style]}
        />
        {right || null}
      </View>
      {error ? <Text style={[s.fieldMsg, { color: c.danger }]} accessibilityLiveRegion="polite">{error}</Text>
        : hint ? <Text style={[s.fieldMsg, { color: c.textMuted }]}>{hint}</Text> : null}
    </View>
  );
});

export const PasswordField = forwardRef(function PasswordField({ label = 'Mot de passe', nouveau = false, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  const { c } = useTheme();
  return (
    <Field
      ref={ref}
      label={label}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={nouveau ? 'new-password' : 'current-password'}
      textContentType={nouveau ? 'newPassword' : 'password'}
      right={(
        <Pressable onPress={() => setVisible((v) => !v)} accessibilityRole="button" accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          style={{ position: 'absolute', right: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textMuted} />
        </Pressable>
      )}
      {...props}
      style={[{ paddingRight: 48 }, props.style]}
    />
  );
});

export function Select({ label, value, options, onChange, error, placeholder = 'Choisir…', optional }) {
  const { c } = useTheme();
  const s = useUi();
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => o.value === value);
  return (
    <View>
      {label ? <Text style={s.label}>{label}{optional ? <Text style={{ color: c.textMuted, fontWeight: '400' }}> · facultatif</Text> : null}</Text> : null}
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label || 'Sélection'} : ${sel ? sel.label : 'non choisi'}`}
        style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: space.sm }, error ? { borderColor: c.danger } : null]}>
        <Text style={{ flex: 1, fontSize: 16, color: sel ? c.text : c.textMuted }} numberOfLines={1}>{sel ? sel.label : placeholder}</Text>
        <Icon name="chevron-down" size={18} color={c.textMuted} />
      </Pressable>
      {error ? <Text style={[s.fieldMsg, { color: c.danger }]}>{error}</Text> : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label || 'Sélectionner'} scroll>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={String(o.value)} onPress={() => { onChange(o.value); setOpen(false); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[s.option, on && { backgroundColor: c.primarySoft }]}>
              <Text style={[s.optionText, on && { color: c.primary, fontWeight: '700' }]}>{o.label}</Text>
              {on ? <Icon name="checkmark" size={20} color={c.primary} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

export function Stepper({ label, value, onChange, min = 0, max = 99999, step = 1, error }) {
  const { c } = useTheme();
  const s = useUi();
  const [txt, setTxt] = useState(String(value));
  useEffect(() => { setTxt(String(value)); }, [value]);
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const commit = () => {
    const n = parseInt(txt, 10);
    const v = Number.isFinite(n) ? clamp(n) : clamp(min);
    setTxt(String(v));
    onChange(v);
  };
  return (
    <View>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.stepRow}>
        <Pressable onPress={() => onChange(clamp(value - step))} accessibilityRole="button" accessibilityLabel={`Diminuer ${label || ''}`} style={s.stepBtn}>
          <Icon name="remove" size={22} color={c.text} />
        </Pressable>
        <TextInput
          value={txt}
          onChangeText={(t) => setTxt(t.replace(/[^\d]/g, '').slice(0, 9))}
          onEndEditing={commit}
          onBlur={commit}
          keyboardType="number-pad"
          accessibilityLabel={label}
          style={[s.input, s.stepInput, { color: c.text }, error ? { borderColor: c.danger } : null]}
          selectTextOnFocus
        />
        <Pressable onPress={() => onChange(clamp(value + step))} accessibilityRole="button" accessibilityLabel={`Augmenter ${label || ''}`} style={[s.stepBtn, { backgroundColor: c.primarySoft, borderColor: c.primarySoft }]}>
          <Icon name="add" size={22} color={c.primary} />
        </Pressable>
      </View>
      {error ? <Text style={[s.fieldMsg, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

// ── Feuille modale ──────────────────────────────────────────
export function Sheet({ visible, onClose, title, children, footer, scroll = true }) {
  const s = useUi();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.overlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" accessibilityRole="button" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetWrap}>
          <View style={s.sheet}>
            <View style={s.sheetGrab} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle} numberOfLines={2} accessibilityRole="header">{title}</Text>
              <IconButton icon="close" label="Fermer" onPress={onClose} />
            </View>
            {scroll ? (
              <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : <View style={s.sheetBody}>{children}</View>}
            {footer ? <View style={[s.footer, { borderTopWidth: 0 }]}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Messages ────────────────────────────────────────────────
export function Banner({ text, tone = 'info', onClose, action, onAction, style }) {
  const { c } = useTheme();
  const s = useUi();
  const t = toneColors(c, tone);
  return (
    <View style={[s.banner, { backgroundColor: t.bg }, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name={TONE_ICON[tone] || 'information-circle'} size={20} color={t.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[s.bannerText, { color: c.text }]}>{text}</Text>
        {action ? (
          <Pressable onPress={onAction} accessibilityRole="button" style={{ marginTop: 6 }}>
            <Text style={[type.label, { color: t.fg }]}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {onClose ? <IconButton icon="close" label="Masquer" onPress={onClose} size={18} style={{ width: 28, height: 28 }} /> : null}
    </View>
  );
}

export function Row({ children, gap = space.sm, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Checkbox({ checked, onChange, children, error }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.sm, minHeight: 44 }}>
      <View style={{
        width: 24, height: 24, borderRadius: 6, borderWidth: 2, marginTop: 1,
        borderColor: error ? c.danger : checked ? c.primary : c.textMuted,
        backgroundColor: checked ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked ? <Icon name="checkmark" size={16} color={c.onPrimary} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: space.md,
        borderRadius: radius.pill, borderWidth: 1,
        borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.surface,
      }}>
      {icon ? <Icon name={icon} size={16} color={selected ? c.primary : c.textSub} /> : null}
      <Text style={[type.label, { color: selected ? c.primary : c.textSub }]}>{label}</Text>
    </Pressable>
  );
}

/** Zone défilante paddée, pour les contenus d'onglets (la barre de titre est fournie par l'écran parent). */
export function Content({ children, onRefresh, refreshing = false }) {
  const { c } = useTheme();
  const s = useUi();
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function ChipRow({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
      {options.map((o) => <Chip key={o.id} label={o.label} selected={value === o.id} onPress={() => onChange(o.id)} />)}
    </ScrollView>
  );
}
