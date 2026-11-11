// Publishes the built site (dist/) to the gh-pages branch, which GitHub Pages serves.
// Run it with `npm run deploy`. It builds first, and replaces the whole gh-pages branch each time.
const { execFileSync } = require('node:child_process');
const { existsSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();

if (!existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html is missing: run the build first');
const remote = git(['remote', 'get-url', 'origin'], root);
const sha = git(['rev-parse', '--short', 'HEAD'], root);

writeFileSync(path.join(dist, '.nojekyll'), ''); // serve the files as they are
// dist is ignored by the main repo, so a throwaway repository inside it holds just the site
if (existsSync(path.join(dist, '.git'))) throw new Error('dist/.git already exists: remove it and try again');
git(['init', '-q', '-b', 'gh-pages'], dist);
git(['add', '-A'], dist);
git(['commit', '-q', '-m', `Deploy ${sha}`], dist);
try {
  git(['push', '-f', remote, 'gh-pages'], dist);
} finally {
  require('node:fs').rmSync(path.join(dist, '.git'), { recursive: true, force: true });
}
console.log(`Published ${sha} to the gh-pages branch of ${remote}`);
