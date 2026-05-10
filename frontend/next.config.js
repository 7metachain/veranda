/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Privy pulls in @react-native-async-storage as a transitive dep that we
  // don't actually need on web. Telling Next to bundle these from source
  // avoids the pnpm-vendor-chunk hash mismatch that produces:
  //   "Cannot find module './vendor-chunks/@privy-io+react-auth@...'"
  transpilePackages: [
    "@privy-io/react-auth",
    "@privy-io/server-auth",
  ],
  webpack: (config, { isServer }) => {
    // snarkjs / circomlibjs touch a few node-only globals; alias them out
    // for the browser build so client-side proof generation still works.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    // Stub react-native + AsyncStorage on the server build — privy's
    // dependency tree references them but only the web entry point runs here.
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-native": false,
        "@react-native-async-storage/async-storage": false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
