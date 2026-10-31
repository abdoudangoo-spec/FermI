const g = globalThis.__fb || (globalThis.__fb = {});
g.users = g.users || new Map(); g.listeners = g.listeners || [];
const auth = { currentUser: null };
const notify = () => g.listeners.forEach((cb) => cb(auth.currentUser));
const mk = (email, pw, extra = {}) => ({ uid: 'uid_' + (g.users.size + 1), email, emailVerified: false, displayName: null, photoURL: null, phoneNumber: null, reload: async () => {}, _pw: pw, ...extra });
const err = (code) => Object.assign(new Error(code), { code });
module.exports = {
  initializeAuth: () => auth, getAuth: () => auth, getReactNativePersistence: () => ({}),
  createUserWithEmailAndPassword: async (a, email, pw) => {
    if (g.users.has(email)) throw err('auth/email-already-in-use');
    const u = mk(email, pw); g.users.set(email, u); auth.currentUser = u; notify(); return { user: u };
  },
  signInWithEmailAndPassword: async (a, email, pw) => {
    const u = g.users.get(email); if (!u || u._pw !== pw) throw err('auth/invalid-credential');
    auth.currentUser = u; notify(); return { user: u };
  },
  signOut: async () => { auth.currentUser = null; notify(); },
  sendPasswordResetEmail: async (a, email) => { if (!g.users.has(email)) throw err('auth/user-not-found'); g.reset = email; },
  sendEmailVerification: async () => { g.verifSent = (g.verifSent || 0) + 1; },
  updateProfile: async (u, p) => Object.assign(u, p),
  onAuthStateChanged: (a, cb) => { g.listeners.push(cb); Promise.resolve().then(() => cb(auth.currentUser)); return () => { g.listeners = g.listeners.filter((x) => x !== cb); }; },
  EmailAuthProvider: { credential: (email, pw) => ({ email, pw }) },
  reauthenticateWithCredential: async (u, c) => { if (u._pw !== c.pw) throw err('auth/wrong-password'); },
  updatePassword: async (u, pw) => { u._pw = pw; },
  signInWithPhoneNumber: async () => ({ confirm: async (code) => { if (code !== '123456') throw err('auth/invalid-verification-code'); const u = mk(null, null, { phoneNumber: '+22790000000' }); auth.currentUser = u; notify(); return { user: u }; } }),
  deleteUser: async (u) => { g.users.delete(u.email); g.deleted = u.uid; auth.currentUser = null; notify(); },
};
