import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html','style.css','app.js']) await copyFile(`public/${file}`, `dist/${file}`);
console.log('Website klaar in dist.');
