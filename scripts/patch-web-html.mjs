import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const htmlPath = path.join(projectRoot, 'dist', 'index.html');
const description =
  'Comparez les prix des carburants autour de vous et trouvez rapidement la station-service la moins chere avec PleinSpot.';
const googleTagId = 'G-M2T76TW4ZJ';

const googleTagScript = `    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${googleTagId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', '${googleTagId}');
    </script>`;

let html = await readFile(htmlPath, 'utf8');

html = html.replace(/<html lang="[^"]*">/, '<html lang="fr">');
html = html.replace(/<title>.*?<\/title>/, '<title>PleinSpot</title>');
html = html.replace(/<meta\s+name="description"[\s\S]*?>\s*/g, '');
html = html.replace(/<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->\s*/g, '');
html = html.replace(/<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->\s*/g, '');
html = html.replace(/<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\s*/g, '');
html = html.replace(/<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];[\s\S]*?gtag\('config', '[^']+'\);\s*<\/script>\s*/g, '');
html = html.replace('</head>', `  <meta name="description" content="${description}">\n${googleTagScript}\n</head>`);
html = html.replace(
  /<noscript>\s*You need to enable JavaScript to run this app\.\s*<\/noscript>/,
  `<noscript>Pour utiliser PleinSpot, activez JavaScript dans votre navigateur.</noscript>`,
);

await writeFile(htmlPath, html, 'utf8');
