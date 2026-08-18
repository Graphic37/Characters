const fs=require('fs');
const P='parts/';
const order=['a_core.js','b_kit.js','c_layout.js','d_world.js','e_fx.js','g_load.js','f_app.js'];
const js=order.map(f=>fs.readFileSync(P+f,'utf8')).join('\n\n');
fs.writeFileSync('bundle.mjs', js);
const shell=fs.readFileSync(P+'shell.html','utf8');
if(!shell.includes('/*__BUNDLE__*/')) throw new Error('no token');
fs.writeFileSync('ashen_depths_v1.html', shell.replace('/*__BUNDLE__*/', js));
console.log('bundle', (js.length/1024).toFixed(1)+'KB', 'html', (fs.statSync('ashen_depths_v1.html').size/1024).toFixed(1)+'KB');
