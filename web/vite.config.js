import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dedupe the libraries Polotno relies on so the bundle carries a single copy of
// each. Without this, konva can end up bundled twice ("Several Konva instances"
// → "No stage is found for element ..."), because both this app and polotno pull
// it in and the pnpm layout resolves them to different paths.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
  resolve: {
    dedupe: ['konva', 'react', 'react-dom', 'mobx', 'mobx-state-tree'],
  },
});
