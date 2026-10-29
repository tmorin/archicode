import ELK from 'elkjs/lib/elk.bundled.js';
const elk=new ELK();
const leaf=(id)=>({id,width:120,height:60});
const mk=(opts,cont)=>({id:'root',layoutOptions:{'elk.algorithm':'layered','elk.direction':'DOWN','elk.hierarchyHandling':'INCLUDE_CHILDREN','elk.spacing.nodeNode':'28','elk.layered.spacing.nodeNodeBetweenLayers':'56',...opts},
 children:[0,1,2].map(i=>({id:'c'+i,layoutOptions:{...cont},children:Array.from({length:12},(_,j)=>leaf('c'+i+'_'+j))}))});
const cg=n=>({'elk.layered.layering.strategy':'COFFMAN_GRAHAM','elk.layered.layering.coffmanGraham.layerBound':String(n)});
async function rep(label,g){const r=await elk.layout(g);const o=[];for(const c of r.children){const ys={};c.children.forEach(l=>{const y=Math.round(l.y);ys[y]=(ys[y]||0)+1});o.push(Object.values(ys).join('+'))}console.log(label.padEnd(46),'rows per container:',o.join(' | '),' total',Math.round(r.width)+'x'+Math.round(r.height))}
await rep('INCLUDE_CHILDREN, no bound',mk({},{}));
await rep('INCLUDE_CHILDREN, bound 4 on containers',mk({}, cg(4)));
await rep('INCLUDE_CHILDREN, bound 4 on root+containers',mk(cg(4), cg(4)));
await rep('INCLUDE_CHILDREN, bound 3 on root+containers',mk(cg(3), cg(3)));
await rep('SEPARATE_CHILDREN, bound 4 on containers',mk({'elk.hierarchyHandling':'SEPARATE_CHILDREN'}, cg(4)));
// with cross-container edges
const g=mk(cg(4),cg(4)); g.edges=[{id:'e1',sources:['c0_0'],targets:['c1_0']},{id:'e2',sources:['c0_5'],targets:['c2_3']},{id:'e3',sources:['c1_7'],targets:['c2_9']}];
await rep('INCLUDE_CHILDREN, bound 4, 3 cross-edges',g);
