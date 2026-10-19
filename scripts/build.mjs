import {copyFileSync,readFileSync,writeFileSync} from 'node:fs';
for(const f of ['index.html','style.css']) copyFileSync(`src/${f}`,`dist/${f}`);
const engine=readFileSync('dist/engine.js','utf8').replace(/^export /gm,'');
const ui=readFileSync('dist/ui.js','utf8').replace(/^import .*?;\n/m,'');
const html=readFileSync('dist/index.html','utf8').replace('<link rel="stylesheet" href="style.css">',()=>`<style>${readFileSync('dist/style.css','utf8')}</style>`).replace('<script type="module" src="ui.js"></script>',()=>`<script type="module">${engine}\n${ui}</script>`);
writeFileSync('Little_World.html',html);
