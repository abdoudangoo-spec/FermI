module.exports = { getNetworkStateAsync: async () => ({ isConnected: !globalThis.__offline, isInternetReachable: !globalThis.__offline }) };
