/**
 * Combined server: Express API + Next.js frontend on a single port.
 * This is the entry point for Hostinger (or any single-process deployment).
 *
 * - All /api/* requests → Express (backend/server.js)
 * - All /uploads/* requests → Express static
 * - Everything else → Next.js (frontend/)
 */
const path = require('path');

// Resolve 'next' from the frontend's node_modules
const next = require(require.resolve('next', { paths: [path.join(__dirname, 'frontend')] }));

const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';

async function main() {
  // 1. Prepare Next.js
  const nextApp = next({ dev, dir: path.join(__dirname, 'frontend') });
  const nextHandler = nextApp.getRequestHandler();
  await nextApp.prepare();
  console.log('[Next.js] ready');

  // 2. Prepare Express backend (DB schema init, but no listen)
  const expressApp = require('./backend/server');
  await expressApp.prepare();
  console.log('[Express] API ready');

  // 3. Add Next.js as the catch-all AFTER all Express /api routes
  expressApp.all('*', (req, res) => {
    return nextHandler(req, res);
  });

  // 4. Listen on one port
  expressApp.listen(PORT, () => {
    console.log(`\n✓ sosyal-medya.net running on port ${PORT}`);
    console.log(`  Frontend: http://localhost:${PORT}`);
    console.log(`  API:      http://localhost:${PORT}/api/*\n`);
    expressApp.startBackgroundJobs();
  });
}

main().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
