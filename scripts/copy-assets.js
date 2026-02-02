import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const srcDir = 'src';
const distDir = process.argv[2] || 'dist/chrome';

function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function copyFile(src, dest) {
  const destDir = dirname(dest);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  copyFileSync(src, dest);
}

// Copy manifest.json with modifications for dist
const manifest = JSON.parse(
  (await import('fs')).readFileSync(join(srcDir, 'manifest.json'), 'utf-8')
);

// Update paths for built files
manifest.background.service_worker = 'service-worker.js';
manifest.content_scripts[0].js = ['content-scripts/content-script.js'];
manifest.web_accessible_resources[0].resources = ['content-scripts/page-context.js'];

(await import('fs')).writeFileSync(
  join(distDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Copy icons
copyDir(join(srcDir, 'icons'), join(distDir, 'icons'));

// Copy HTML files
copyFile(join(srcDir, 'popup/popup.html'), join(distDir, 'popup/popup.html'));
copyFile(join(srcDir, 'options/options.html'), join(distDir, 'options/options.html'));

// Copy CSS files
copyFile(join(srcDir, 'popup/popup.css'), join(distDir, 'popup/popup.css'));
copyFile(join(srcDir, 'options/options.css'), join(distDir, 'options/options.css'));

console.log('Assets copied to', distDir);
