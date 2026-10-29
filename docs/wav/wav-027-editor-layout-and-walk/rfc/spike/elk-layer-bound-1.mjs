import ELK from 'elkjs/lib/elk.bundled.js';
const elk = new ELK();
function boxes(n, prefix){ return Array.from({length:n},(_,i)=>({id:prefix+i,width:120,height:60})); }
async function run(label, opts, graph){
  const g = JSON.parse(JSON.stringify(graph)); g.layoutOptions = {...g.layoutOptions, ...opts};
  const r = await elk.layout(g);
  const rows = {};
  (function walk(n, depth){ for (const c of n.children||[]) { if(!c.children) { const key=(c.parent||'')+Math.round(c.y); } walk(c,depth+1);} })(r,0);
  // report per container: distinct y of leaf children
  const out=[];
  (function walk(n, name){ const leaves=(n.children||[]).filter(c=>!c.children); if(leaves.length){ const ys={}; leaves.forEach(c=>{ys[Math.round(c.y)]=(ys[Math.round(c.y)]||0)+1}); out.push(name+': '+leaves.length+' leaves, rows(y)='+Object.keys(ys).length+' maxPerRow='+Math.max(...Object.values(ys))+' w='+Math.round(n.width||0)); } for(const c of n.children||[]) if(c.children) walk(c,c.id); })(r,'root');
  console.log('## '+label+'  total '+Math.round(r.width)+'x'+Math.round(r.height)); out.forEach(l=>console.log('  '+l));
}
const base = {'elk.algorithm':'layered','elk.direction':'DOWN','elk.hierarchyHandling':'INCLUDE_CHILDREN','elk.edgeRouting':'ORTHOGONAL','elk.spacing.nodeNode':'28','elk.layered.spacing.nodeNodeBetweenLayers':'56','elk.spacing.edgeNode':'20'};
const cg = n=>({'elk.layered.layering.strategy':'COFFMAN_GRAHAM','elk.layered.layering.coffmanGraham.layerBound':String(n)});
// A: 20 unlinked flat boxes
const flat = {id:'root',layoutOptions:base,children:boxes(20,'a')};
// B: nested: 3 containers of 12 unlinked children each, plus 2 links across
const nested = {id:'root',layoutOptions:base,children:[0,1,2].map(i=>({id:'c'+i,layoutOptions:{'elk.padding':'[top=44,left=14,bottom=14,right=14]'},children:boxes(12,'c'+i+'_')})),edges:[{id:'e1',sources:['c0_0'],targets:['c1_0']},{id:'e2',sources:['c1_1'],targets:['c2_1']}]};
// C: linked chain graph with fan-out
const fan = {id:'root',layoutOptions:base,children:[{id:'hub',width:120,height:60},...boxes(15,'f')],edges:Array.from({length:15},(_,i)=>({id:'fe'+i,sources:['hub'],targets:['f'+i]}))};
for (const [name,g] of [['flat 20 unlinked',flat],['nested 3x12 + 2 links',nested],['fan-out 1->15',fan]]) {
  await run(name+' / today',{},g);
  await run(name+' / CG bound 4 (root only)',cg(4),g);
  // set on every container too
  const g2=JSON.parse(JSON.stringify(g)); (function s(n){ for(const c of n.children||[]) if(c.children){ c.layoutOptions={...c.layoutOptions,...cg(4)}; s(c);} })(g2);
  await run(name+' / CG bound 4 (root + containers)',cg(4),g2);
  await run(name+' / direction RIGHT',{'elk.direction':'RIGHT'},g);
}
