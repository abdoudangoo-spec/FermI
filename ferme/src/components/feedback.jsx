// ═══════════════════════════════════════════════════════════
//  src/components/feedback.jsx — Toasts + boîtes de confirmation
//  Remplace Alert.alert : cohérent, accessible, thémable.
// ═══════════════════════════════════════════════════════════
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Modal, Pressable, Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, makeStyles, toneColors, TONE_ICON, space, radius, type } from '../theme';
import { Icon, Button } from './ui';

const Ctx = createContext(null);
const NOOP = { toast: { success() {}, error() {}, info() {} }, confirm: async () => false };

const useStyles = makeStyles((c) => ({
  toast: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  toastText: { ...type.body, color: c.text, flex: 1 },
  overlay: { flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: { width: '100%', maxWidth: 380, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  dTitle: { ...type.title, color: c.text },
  dMsg: { ...type.body, color: c.textSub },
  dActions: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
}));

function Toast({ item, onHide }) {
  const s = useStyles();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onHide(item.id));
    }, item.tone === 'danger' ? 5000 : 3200);
    return () => clearTimeout(t);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const tc = toneColors(c, item.tone);
  return (
    <Animated.View style={[s.toast, { top: insets.top + space.sm, opacity, borderLeftWidth: 4, borderLeftColor: tc.fg }]} accessibilityLiveRegion="polite" accessibilityRole="alert" pointerEvents="box-none">
      <Icon name={TONE_ICON[item.tone] || 'information-circle'} size={22} color={tc.fg} />
      <Text style={s.toastText}>{item.message}</Text>
    </Animated.View>
  );
}

export function FeedbackProvider({ children }) {
  const s = useStyles();
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);
  const resolver = useRef(null);

  const show = useCallback((tone, message) => {
    idRef.current += 1;
    setToast({ id: idRef.current, tone, message: String(message || '') });
  }, []);

  const api = useMemo(() => ({
    toast: {
      success: (m) => show('success', m),
      error: (m) => show('danger', m),
      info: (m) => show('info', m),
    },
    confirm: (opts) => new Promise((resolve) => {
      resolver.current = resolve;
      setDialog(opts);
    }),
  }), [show]);

  const close = (value) => {
    setDialog(null);
    if (resolver.current) { resolver.current(value); resolver.current = null; }
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      {toast ? <Toast key={toast.id} item={toast} onHide={(id) => setToast((t) => (t && t.id === id ? null : t))} /> : null}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent>
        <View style={s.overlay} accessibilityViewIsModal>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} accessibilityLabel="Annuler" accessibilityRole="button" />
          {dialog ? (
            <View style={s.dialog}>
              <Text style={s.dTitle} accessibilityRole="header">{dialog.title}</Text>
              {dialog.message ? <Text style={s.dMsg}>{dialog.message}</Text> : null}
              <View style={s.dActions}>
                <Button label={dialog.cancelLabel || 'Annuler'} variant="secondary" onPress={() => close(false)} style={{ flex: 1 }} />
                <Button label={dialog.confirmLabel || 'Confirmer'} variant={dialog.destructive ? 'danger' : 'primary'} onPress={() => close(true)} style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

export const useToast = () => (useContext(Ctx) || NOOP).toast;
export const useConfirm = () => (useContext(Ctx) || NOOP).confirm;
