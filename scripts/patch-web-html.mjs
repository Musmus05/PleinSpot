import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const htmlPath = path.join(projectRoot, 'dist', 'index.html');
const description =
  'Comparez les prix des carburants autour de vous et trouvez rapidement la station-service la moins chere avec PleinSpot.';
const gtmId = 'GTM-WRLNH7QH';

const gtmHeadScript = `    <!-- Google Tag Manager -->
    <script>
      (function (w, d, s, l, i) {
        w[l] = w[l] || [];
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        var f = d.getElementsByTagName(s)[0],
          j = d.createElement(s),
          dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f.parentNode.insertBefore(j, f);
      })(window, document, 'script', 'dataLayer', '${gtmId}');
    </script>
    <!-- End Google Tag Manager -->`;

const gtmBodyNoscript = `    <!-- Google Tag Manager (noscript) -->
    <noscript>
      <iframe
        src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
        height="0"
        width="0"
        style="display: none; visibility: hidden"
      ></iframe>
    </noscript>
    <!-- End Google Tag Manager (noscript) -->`;

let html = await readFile(htmlPath, 'utf8');

html = html.replace(/<html lang="[^"]*">/, '<html lang="fr">');
html = html.replace(/<title>.*?<\/title>/, '<title>PleinSpot</title>');
html = html.replace(/<meta name="description"[^>]*>\s*/g, '');
html = html.replace('</head>', `  <meta name="description" content="${description}">\n${gtmHeadScript}\n</head>`);
html = html.replace(
  /<noscript>\s*You need to enable JavaScript to run this app\.\s*<\/noscript>/,
  `<noscript>Pour utiliser PleinSpot, activez JavaScript dans votre navigateur.</noscript>`,
);

if (!html.includes(`ns.html?id=${gtmId}`)) {
  html = html.replace('<body>', `<body>\n${gtmBodyNoscript}`);
}

await writeFile(htmlPath, html, 'utf8');
