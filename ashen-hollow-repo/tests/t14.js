// the footer still builds, and the filter mechanism survives its widget
const fs=require('fs'), vm=require('vm');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('work.html','utf8');
const R={};

// 1. the footer markup: coin, spacer, SORT — and no input
const a=src.indexOf("'<div class=\"footer-row\">'+");
const b=src.indexOf("$('#rightDock').appendChild(invPanel);");
const frag=src.slice(a,b);
R.footerHasInput = /<input/.test(frag);
R.footerHasSort  = /id="btnSort"/.test(frag);
R.footerHasCoin  = /class="coin"/.test(frag);

// 2. the dim rule still reads S.filter
const dim=src.match(/if\(S\.filter && [^\n]*\n/);
R.dimRule = dim ? dim[0].trim().slice(0,60)+'...' : 'MISSING';

// 3. setItemFilter drives it end to end
const ia=src.indexOf('window.setItemFilter=function(text){');
const ib=src.indexOf('function drawInv(){');
const code=src.slice(ia,ib);
let refreshed=0;
const sb={console,S:{filter:'PRELOADED-STALE'},refreshAll:()=>refreshed++};
sb.window=sb; vm.createContext(sb);
vm.runInContext(code+'\nthis.F=window.setItemFilter;',sb,{filename:'f.js'});
R.staleFilterClearedOnBoot = sb.S.filter === '';
R.setReturns = sb.F('  Bow  ');
R.stored = sb.S.filter;
R.refreshCalled = refreshed;
R.clears = sb.F('');
console.log(JSON.stringify(R,null,1));
