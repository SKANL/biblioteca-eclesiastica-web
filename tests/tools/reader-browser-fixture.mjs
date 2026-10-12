// Build an isolated browser fixture from the actual components, without a server.
// node tests/tools/reader-browser-fixture.mjs <existing temporary directory>
// Open reader.html in a browser, simulate reduced motion with matchMedia, then
// await window.runReaderRegression(). Next navigation is mocked; components are real.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import webpackModule from "next/dist/compiled/webpack/webpack.js";
const { webpack } = webpackModule;
const output = process.argv[2];
if (!output || !fs.statSync(output).isDirectory()) throw new Error("An existing temporary directory is required");
const root = fileURLToPath(new URL("../../", import.meta.url));
for (const name of ["components/ReaderToolbar.tsx", "components/ReaderImage.tsx", "lib/reader-image.ts", "lib/reader-matches.ts", "lib/ui.ts", "lib/prefs.ts", "components/usePref.ts"]) {
  const destination = path.join(output, name.replace(/\.tsx?$/, ".js"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, ts.transpileModule(fs.readFileSync(path.join(root, name), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText);
}
fs.writeFileSync(path.join(output, "lib/api.js"), "exports.mediaUrl = value => value;");
fs.writeFileSync(path.join(output, "lib/utils.js"), "exports.numeroFromRef = value => value ? Number(value.split('/').pop()) : null; exports.countLabel = (n, one, many) => n + ' ' + (n === 1 ? one : many);");
fs.writeFileSync(path.join(output, "link.js"), "exports.default = props => require('react').createElement('a', props);");
fs.writeFileSync(path.join(output, "navigation.js"), `
const React = require('react');
exports.useRouter = () => ({push: href => { window.lastNavigation = href; }});
exports.useSearchParams = () => {
  const [search, setSearch] = React.useState(location.search);
  React.useEffect(() => {
    const update = () => setSearch(location.search);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return new URLSearchParams(search);
};
for (const method of ['replaceState','pushState']) {
  const original = history[method].bind(history);
  history[method] = (...args) => { original(...args); window.dispatchEvent(new Event('popstate')); };
}
`);
fs.writeFileSync(path.join(output, "entry.js"), `
const React = require('react');
const {createRoot} = require('react-dom/client');
const {flushSync} = require('react-dom');
const Toolbar = require('./components/ReaderToolbar').default;
const ReaderImage = require('./components/ReaderImage').default;
const {markRanges,matchIndex}=require('./lib/reader-matches');
const {useSearchParams}=require('./navigation');
const root = createRoot(document.getElementById('fixture'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async predicate => { for (let i=0;i<100;i++) { if(predicate()) return; await wait(20); } throw new Error('Timed out'); };
const checks = [];
function check(name, condition) { if (!condition) throw new Error(name); checks.push(name); }
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="2400"><rect width="600" height="2400" fill="white"/><text x="20" y="2000">Tall page fixture</text></svg>');
let props = {libroId:'fixture',numero:1,refAnterior:null,refSiguiente:'fixture/pagina/2',imagenUrl:image,imagenAncho:600,imagenAlto:2400,bloques:[{bbox_norm:[.1,.8,.3,.05],texto:'match',bbox:[]}],bloqueIdx:0,query:'gracia',matches:[{inicio:0,fin:6,rects:[[.1,.8,.3,.05]],precision:'exacta',fuente:'pypdfium2',advertencia:null}]};
let calls = [];
const originalScroll = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function(options) { calls.push({target:this.dataset.target,id:this.id,options}); originalScroll.call(this,options); };
function FixtureText() {
  const active=matchIndex(useSearchParams().get('coincidencia'),props.matches?.length || 0);
  return React.createElement('article',{style:{marginTop:40},dangerouslySetInnerHTML:{__html:markRanges('gracia fe gracia fe',props.matches || [],active)}});
}
const renderToolbar = () => flushSync(() => root.render(React.createElement(React.Fragment,null,React.createElement(Toolbar, props),React.createElement(FixtureText))));
window.runReaderRegression = async () => {
  history.replaceState(null,'','?ver=imagen&bloque=0&q=gracia');
  renderToolbar();
  await until(() => calls.length > 0);
  await wait(100);
  check('scroll waits for loaded highlight, not whole figure', !!calls[0].target && !!document.querySelector('[data-target]'));
  check('reduced motion uses instant scrolling', calls.at(-1).options.behavior === 'instant');
  const rect = document.querySelector('[data-target]').getBoundingClientRect();
  check('bottom match on tall page is centered in viewport', Math.abs((rect.top+rect.bottom)/2-innerHeight/2)<3);
  check('image toolbar does not stick over content', getComputedStyle(document.querySelector('#fixture > div > div')).position !== 'sticky');
  check('next-page link preserves image and query, discards stale block', document.querySelector('[rel=next]').getAttribute('href').includes('q=gracia&ver=imagen') && !document.querySelector('[rel=next]').getAttribute('href').includes('bloque='));
  const firstTarget = calls.at(-1).target;
  calls=[]; props={...props,numero:2}; renderToolbar();
  await until(() => calls.length > 0);
  check('soft page change with same block resynchronizes scroll', calls.at(-1).target !== firstTarget);
  calls=[]; props={...props,matches:[{...props.matches[0],rects:[[.1,.1,.3,.05]]}]}; renderToolbar();
  await until(() => calls.length > 0);
  check('geometry change with same page and block resynchronizes scroll', calls.length > 0);
  const toggle = [...document.querySelectorAll('button')].find(button => button.textContent === 'Ocultar imagen');
  toggle.click(); await until(() => !document.querySelector('img'));
  check('hide writes explicit text state to URL', new URLSearchParams(location.search).get('ver') === 'texto');
  history.replaceState(null,'','?ver=imagen&bloque=0');
  await until(() => !!document.querySelector('[data-target]'));
  check('URL-driven restore shows original image', !!document.querySelector('img'));
  calls=[]; props={...props,imagenUrl:image+'%20',numero:3}; renderToolbar();
  await until(() => calls.length > 0);
  check('new source scrolls only after its own load', calls.at(-1).target.includes('%20'));
  props={...props,query:'gracia',matches:[
    {inicio:0,fin:6,precision:'exacta',fuente:'pypdfium2',advertencia:null,rects:[[.1,.8,.3,.002],[.1,.82,.1,.002]]},
    {inicio:10,fin:16,precision:'exacta',fuente:'pypdfium2',advertencia:null,rects:[[.1,.2,.1,.002]]},
  ]}; calls=[]; renderToolbar();
  await until(() => document.querySelectorAll('[data-target]').length === 2);
  check('multiline match renders separate exact rectangles', document.querySelectorAll('[data-target]').length === 2 && document.getElementById('fixture').textContent.includes('Geometría de glifos nativos'));
  check('glyph height is not enlarged to a minimum height', !document.querySelector('[data-target]').className.includes('min-h') && document.querySelector('[data-target]').style.height === '0.2%');
  const nextMatch=[...document.querySelectorAll('a')].find(link=>link.textContent==='Coincidencia siguiente');
  check('next match is a real URL with query and image state', nextMatch.getAttribute('href').includes('coincidencia=1') && nextMatch.getAttribute('href').includes('ver=imagen'));
  calls=[]; history.pushState(null,'',new URL(nextMatch.getAttribute('href'),'https://fixture.invalid').search);
  await until(() => document.querySelectorAll('[data-target]').length === 1 && calls.length > 0);
  check('match navigation changes geometry and scroll target', document.querySelector('[data-target]').style.top==='20%' && document.getElementById('fixture').textContent.includes('Coincidencia 2 de 2'));
  check('only available match directions are actionable', ![...document.querySelectorAll('a')].some(link=>link.textContent==='Coincidencia siguiente') && [...document.querySelectorAll('a')].some(link=>link.textContent==='Coincidencia anterior'));
  calls=[]; history.replaceState(null,'','?ver=texto&q=gracia&coincidencia=1');
  await until(()=>calls.some(call=>call.id==='coincidencia-1'));
  check('text match navigation scrolls the selected Unicode range', document.querySelector('mark[aria-current]').id==='coincidencia-1');
  history.replaceState(null,'','?ver=imagen&q=gracia');
  await until(()=>document.querySelectorAll('[data-target]').length===2);
  props={...props,matches:[{inicio:0,fin:6,precision:'bloque',fuente:'opendataloader',advertencia:'Caja aproximada',rects:[[.1,.2,.4,.1]]}]}; renderToolbar();
  await until(() => document.getElementById('fixture').textContent.includes('Ubicación aproximada de bloque'));
  check('coarse geometry is visibly labeled and dashed', document.querySelector('[data-target]').className.includes('outline-dashed'));
  props={...props,matches:[{inicio:0,fin:6,precision:'sin_localizar',fuente:null,advertencia:'Sin geometría',rects:[]}]}; renderToolbar();
  check('unlocatable text has no stale block overlay', !document.querySelector('[data-target]') && document.getElementById('fixture').textContent.includes('Sin ubicación en imagen'));
  props={...props,imagenUrl:null}; renderToolbar();
  check('no-image page retains text matches and recovery message', !document.querySelector('img') && document.getElementById('fixture').textContent.includes('no tiene imagen original disponible'));
  flushSync(() => root.render(React.createElement(ReaderImage,{src:'data:image/png;base64,broken',alt:'Missing image'})));
  await until(() => document.getElementById('fixture').textContent.includes('No se pudo cargar'));
  check('image failure exposes retry', document.querySelector('button').textContent.includes('Reintentar'));
  flushSync(() => document.querySelector('button').click());
  check('retry creates a new image request', document.querySelector('img').getAttribute('src').includes('retry=1'));
  // A fresh URL avoids pre-hydration completion from the earlier cached image.
  const recoveredImage = image + '%20%20';
  flushSync(() => root.render(React.createElement(ReaderImage,{src:recoveredImage,alt:'Recovered image'})));
  check('legacy dimensions reserve approximate space', document.querySelector('#fixture > div').style.aspectRatio === '0.75 / 1' && document.getElementById('fixture').textContent.includes('aproximado'));
  await until(() => document.querySelector('img')?.naturalWidth > 0 && !document.getElementById('fixture').textContent.includes('Cargando'));
  check('new source resets previous failure without retaining retry', !document.querySelector('img').getAttribute('src').includes('retry='));
  document.getElementById('results').textContent=JSON.stringify(checks,null,2);
  return checks;
};
window.showReaderMatches = () => {
  props={...props,imagenUrl:image,query:'"gracia fe"',matches:[{inicio:0,fin:9,precision:'exacta',fuente:'pypdfium2',advertencia:null,rects:[[.1,.8,.3,.005],[.1,.82,.1,.005]]}]};
  history.replaceState(null,'','?ver=imagen&q=%22gracia+fe%22'); renderToolbar();
};
`);
webpack({ mode: "development", devtool: false, entry: path.join(output, "entry.js"),
  output: { path: output, filename: "bundle.js" },
  resolve: { modules: [path.join(root, "node_modules")], alias: {
    "@": output, "next/link": path.join(output, "link.js"), "next/navigation": path.join(output, "navigation.js"),
  } },
}, (error, stats) => {
  if (error || stats.hasErrors()) { console.error(error || stats.toString({ all: false, errors: true })); process.exitCode = 1; return; }
  fs.writeFileSync(path.join(output, "reader.html"), `<!doctype html><html lang="es"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reader regression fixture</title><style>body{margin:0}#fixture{width:700px;max-width:100%;margin:100px auto}img{display:block;width:100%;height:auto}.relative{position:relative}.absolute{position:absolute}#results{margin:100px auto;min-height:100vh;white-space:pre-wrap}</style><div id="fixture"></div><pre id="results"></pre><script>${fs.readFileSync(path.join(output, "bundle.js"), "utf8")}</script></html>`);
  console.log(path.join(output, "reader.html"));
});
