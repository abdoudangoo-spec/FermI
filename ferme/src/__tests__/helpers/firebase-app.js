const apps = [];
module.exports = { initializeApp: (c) => { const a = { options: c }; apps.push(a); return a; }, getApps: () => apps, getApp: () => apps[0] };
