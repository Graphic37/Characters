// per-map spine health: attributable, persisted, worst-first
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('work.html','utf8');
const R={};
const a=src.indexOf("const SPINE_MAPS_KEY='ashenSpineMaps_v1';");
const b=src.indexOf('function buildSpine(nav, mapName){');

const store={};
const logs=[];
const sb={ console:{ log:(...x)=>logs.push(x.join(' ')), table:()=>{} },
  localStorage:{ getItem:(k)=>store[k]||null, setItem:(k,v)=>{store[k]=v;} },
  SPINE:{ pts:[], total:0, blocked:0, detours:0, cut:false, built:0, rejected:0 },
  ahErr:()=>{} };
sb.window=sb;
vm.createContext(sb);
vm.runInContext(src.slice(a,b)+
  '\nthis.N=spineNoteMap; this.L=spineMapsLoad; this.T=window.ahSpineMaps;',
  sb, {filename:'m.js'});

const build=(map, blocked, detours, cut, pts, total)=>{
  Object.assign(sb.SPINE, {blocked, detours, cut, pts:new Array(pts), total});
  sb.N(map);
};
// a healthy map built 10 times, and a bad one cut most times
for(let i=0;i<10;i++) build('Drowned Cathedral', 0, 0, false, 40, 120);
for(let i=0;i<8;i++)  build('Sunken Cisterns', 3, 1, i<6, 22, 70);
for(let i=0;i<5;i++)  build('Blackreach Crypt', 1, 1, false, 35, 100);

const m=sb.L();
R.recorded = Object.keys(m).sort();
R.healthy = m['Drowned Cathedral'];
R.bad = m['Sunken Cisterns'];
R.badCutRate = Math.round(m['Sunken Cisterns'].cuts / m['Sunken Cisterns'].builds*100);
R.persisted = !!store['ashenSpineMaps_v1'];

logs.length=0;
sb.T();
R.worstFirst = logs[1].indexOf('Sunken Cisterns')>=0;
R.flagsTheRoute = logs.some(l=>/THE ROUTE, NOT AUTO/.test(l));
R.healthyNotFlagged = !logs.filter(l=>/Drowned/.test(l))[0].match(/THE ROUTE/);
R.sample = logs.slice(0,4);

// accumulates rather than overwrites
build('Drowned Cathedral', 2, 1, false, 40, 120);
R.accumulates = { builds:sb.L()['Drowned Cathedral'].builds,
                  blocked:sb.L()['Drowned Cathedral'].blocked };

// the run record carries it
R.runRecordCarries = /spineCut:!!\(window\.SPINE && SPINE\.cut\)/.test(src)
                  && /map:\(window\.SPINE && SPINE\.map\)\|\|null/.test(src);
R.f8ShowsRoute = /spine route: '\+\(SPINE\.map\|\|'\?'\)/.test(src);
R.buildNamesTheMap = /buildSpine\(nav, \(d&&d\.name\)\|\|'unnamed'\)/.test(src);
console.log(JSON.stringify(R,null,1));
