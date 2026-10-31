// ═══════════════════════════════════════════════════════════
//  src/components/states.jsx — Les 4 états d'écran indispensables
//  Chargement · Succès · Erreur · Vide
// ═══════════════════════════════════════════════════════════
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, makeStyles, toneColors, space, radius, type } from '../theme';
import { Icon, Button } from './ui';

const useStyles = makeStyles((c) => ({
  full: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  compact: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxl, paddingHorizontal: space.lg },
  circle: { width: 80, height: 80, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  title: { ...type.title, color: c.text, textAlign: 'center' },
  message: { ...type.body, color: c.textSub, textAlign: 'center', marginTop: space.sm, maxWidth: 340 },
  actions: { width: '100%', maxWidth: 340, marginTop: space.xl, gap: space.sm },
}));

function Wrapper({ full, children }) {
  const s = useStyles();
  if (full) return <SafeAreaView style={s.full} edges={['top', 'bottom']}>{children}</SafeAreaView>;
  return <View style={s.compact}>{children}</View>;
}

// 1 ── Chargement
export function LoadingState({ label = 'Chargement…', full = false }) {
  const { c } = useTheme();
  const s = useStyles();
  return (
    <Wrapper full={full}>
      <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite" style={{ alignItems: 'center' }}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[s.message, { marginTop: space.lg }]}>{label}</Text>
      </View>
    </Wrapper>
  );
}

// 2 ── Succès
export function SuccessState({ title, message, primaryLabel, onPrimary, secondaryLabel, onSecondary, full = true }) {
  const { c } = useTheme();
  const s = useStyles();
  const t = toneColors(c, 'success');
  return (
    <Wrapper full={full}>
      <View style={[s.circle, { backgroundColor: t.bg }]}><Icon name="checkmark" size={40} color={t.fg} /></View>
      <Text style={s.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={s.message}>{message}</Text> : null}
      <View style={s.actions}>
        {primaryLabel ? <Button label={primaryLabel} onPress={onPrimary} /> : null}
        {secondaryLabel ? <Button label={secondaryLabel} onPress={onSecondary} variant="ghost" /> : null}
      </View>
    </Wrapper>
  );
}

// 3 ── Erreur
export function ErrorState({
  title = 'Une erreur est survenue', message = 'Vérifiez votre connexion puis réessayez.',
  onRetry, retryLabel = 'Réessayer', secondaryLabel, onSecondary, full = false,
}) {
  const { c } = useTheme();
  const s = useStyles();
  const t = toneColors(c, 'danger');
  return (
    <Wrapper full={full}>
      <View style={[s.circle, { backgroundColor: t.bg }]}><Icon name="alert-circle-outline" size={40} color={t.fg} /></View>
      <Text style={s.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={s.message} accessibilityLiveRegion="polite">{message}</Text> : null}
      <View style={s.actions}>
        {onRetry ? <Button label={retryLabel} icon="refresh" onPress={onRetry} /> : null}
        {secondaryLabel ? <Button label={secondaryLabel} onPress={onSecondary} variant="ghost" /> : null}
      </View>
    </Wrapper>
  );
}

// 4 ── Vide
export function EmptyState({ icon = 'file-tray-outline', title, message, actionLabel, onAction, full = false }) {
  const { c } = useTheme();
  const s = useStyles();
  const t = toneColors(c, 'primary');
  return (
    <Wrapper full={full}>
      <View style={[s.circle, { backgroundColor: t.bg }]}><Icon name={icon} size={36} color={t.fg} /></View>
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.message}>{message}</Text> : null}
      {actionLabel ? <View style={s.actions}><Button label={actionLabel} onPress={onAction} /></View> : null}
    </Wrapper>
  );
}

/** Aiguillage : chargement → erreur → vide → contenu. */
export function AsyncView({ loading, error, onRetry, isEmpty, empty, children, loadingLabel }) {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (isEmpty && empty) return <EmptyState {...empty} />;
  return children;
}
