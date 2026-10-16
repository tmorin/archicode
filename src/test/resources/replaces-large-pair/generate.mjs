#!/usr/bin/env node
// Generates the invented harbour of `replaces-large-pair`: three plateaus of manifests, the workspace that lists them and the planted answers.
//
//   node src/test/resources/replaces-large-pair/generate.mjs [--sweep [--fp]]
//
// `--sweep` also prints what other thresholds would do to this pair (a re-reading of the kernel's rule; at the kernel's own values it lists the same 169 pairs ReplacesLargePairTest records);
// `--fp` adds the false positives by level of the tree. Neither changes the files.
//
// The output is committed; this script is kept next to it so that the pair reads as a recipe and can be rebuilt (the same seed gives the same bytes).
//   plateaus/10_before          the harbour as it was: persons, systems (containers, components), environments (nodes), about five hundred elements.
//   plateaus/20_after           the harbour a year later, with renames, moves, splits, merges, decoys, plain additions and removals, and NO `replaces`:
//                               the pair the candidates of the kernel are measured on (ReplacesLargePairTest).
//   plateaus/30_after-declared  the same plateau where the author wrote `replaces` for every planted answer. `archicode diff` lists the candidates only
//                               for a plateau that uses `replaces`, and a split is only a split once it is declared: this is the one gap.md is read on.
//   answers.json                the planted answers: the pairs that ARE one thing said twice (`same`), and the false friends planted on purpose
//                               (`notSame`: they look alike, they are not). Any other pair of a removed and a new element is also "not the same".
// Everything is invented (a harbour); nothing comes from a real workspace.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- a small seeded generator, so that the pair is the same on every run
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261016);
const pick = (list) => list[Math.floor(rng() * list.length)];
const shuffled = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const kebab = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---- the model: a tree of elements; the target is a clone of the base that the scenarios then change
let side = 'base';
function make(kind, id, name, description, extra = {}) {
  return {
    side,
    kind,
    id,
    name,
    description,
    qualifiers: extra.qualifiers || [],
    rels: [], // { dest: element, label }
    applications: [], // elements (technology layer)
    children: [],
    parent: null,
    layer: null,
    noun: extra.noun || null,
    origin: null, // target only: the element of the base this one is the clone of
    from: [], // target only: the elements of the base it stands for through a split or a merge
    scenario: null
  };
}
function add(parent, child) {
  child.parent = parent;
  parent.children.push(child);
  return child;
}
const ref = (e) => (e.parent ? ref(e.parent) + '.' + e.id : e.id);
function* walk(e) {
  yield e;
  for (const c of e.children) yield* walk(c);
}
const alive = (e) => !e.parent || (e.parent.children.includes(e) && alive(e.parent));

// ---- the vocabulary of the harbour
const TOPICS = [
  ['Berth', 'berth', 'Berth Allocation'], ['Tide', 'tide', 'Tide Forecast'], ['Pilot', 'pilot', 'Pilot Dispatch'], ['Tug', 'tug', 'Tug Operations'],
  ['Crane', 'crane', 'Crane Scheduling'], ['Customs', 'customs', 'Customs Clearance'], ['Manifest', 'manifest', 'Cargo Manifests'], ['Yard', 'yard', 'Container Yard'],
  ['Rail', 'rail', 'Rail Link'], ['Gate', 'gate', 'Gate Control'], ['Fuel', 'fuel', 'Bunkering'], ['Waste', 'waste', 'Waste Reception'],
  ['Ferry', 'ferry', 'Ferry Ticketing'], ['Crew', 'crew', 'Crew Visas'], ['Inspection', 'inspection', 'Safety Inspections'], ['Weather', 'weather', 'Weather Stations'],
  ['Tariff', 'tariff', 'Tariff Billing'], ['Dredging', 'dredging', 'Dredging Works'], ['Terminal', 'terminal', 'Passenger Terminal'], ['Lock', 'lock', 'Lock Gates'],
  ['Fire', 'fire', 'Fire Brigade'], ['Mooring', 'mooring', 'Mooring Lines'], ['Cold', 'cold-store', 'Cold Storage'], ['Police', 'police', 'Port Police'],
  ['Quay', 'quay', 'Quay Maintenance'], ['Buoy', 'buoy', 'Buoy Network'], ['Lighthouse', 'lighthouse', 'Lighthouse Service'], ['Salvage', 'salvage', 'Salvage Office'],
  ['Visitor', 'visitor', 'Visitor Centre'], ['Fishing', 'fishing', 'Fish Market'], ['Pollution', 'pollution', 'Pollution Control'], ['Lease', 'lease', 'Land Leases'],
  ['Parking', 'parking', 'Truck Parking']
];
const FUNCTIONS = [
  'Registry', 'Planner', 'Gateway', 'Notifier', 'Archive Store', 'Reporter', 'Validator', 'Tracker', 'Importer', 'Exporter', 'Dashboard', 'Auditor',
  'Scheduler', 'Billing', 'Search', 'Sync', 'Alerts', 'Forms', 'Calendar', 'Statistics'
];
const VERBS = ['Keeps', 'Computes', 'Publishes', 'Checks', 'Records', 'Collects', 'Forwards', 'Validates', 'Archives', 'Schedules', 'Reconciles', 'Tracks', 'Summarises', 'Converts'];
const OBJECTS = ['records', 'requests', 'schedules', 'readings', 'statements', 'notices', 'permits', 'queues', 'counts', 'reports', 'bookings', 'incidents'];
const PURPOSES = [
  'for the harbour master', 'before the vessel leaves the quay', 'for the shipping agents', 'every night', 'for the customs officers', 'during the morning tide',
  'for the terminal operators', 'for the safety office', 'whenever a vessel arrives', 'for the duty officer', 'for the quay planners', 'at the end of each shift'
];
const LABELS = ['reads from', 'sends to', 'asks', 'notifies', 'publishes to', 'fetches from', 'reports to', 'synchronises with'];
const QUALIFIERS = ['Java', 'Python', 'PostgreSQL', 'REST', 'Kafka', 'React', 'Go'];
const COMPONENTS = [
  ['Parser', ['Reads the incoming files and turns them into records.', 'Splits a file of the shipping lines into lines and fields.']],
  ['Mapper', ['Maps the fields of a record to the ones the other systems expect.', 'Renames and converts the fields on their way out.']],
  ['Cache', ['Keeps the latest answers close to the callers.', 'Remembers the last lookups so that the database rests.']],
  ['Queue', ['Holds the messages until they are handled.', 'Lines up the jobs and hands them out one by one.']],
  ['Rules', ['Applies the rules of the harbour to each record.', 'Decides what is allowed from the regulations in force.']],
  ['Store', ['Writes the records to the database.', 'Saves what the service learns and reads it back.']],
  ['Client', ['Calls the other systems of the harbour.', 'Talks to the partners over their own interfaces.']],
  ['Formatter', ['Prints the records as pages and files.', 'Lays out the results for the screen and for the printer.']],
  ['Scanner', ['Watches the incoming folder for new files.', 'Looks for new documents every few minutes.']]
];
// the free part of a description is drawn from pools big enough that two unrelated descriptions of the bulk share little more than their small words:
// the boilerplate that real workspaces do have is planted on purpose (BOILERPLATE), not left to the pools
const ROLES = [
  'harbour master', 'shipping agents', 'customs officers', 'terminal operators', 'safety office', 'duty officer', 'quay planners', 'port police', 'ferry crews',
  'tug captains', 'pilots on duty', 'crane drivers', 'yard supervisors', 'rail dispatchers', 'fuel suppliers', 'waste contractors', 'ship chandlers', 'harbour auditors',
  'weather desk', 'dredging teams', 'lock keepers', 'fire crews', 'ticket office', 'visa clerks', 'lease managers', 'fishing boats', 'cold store staff', 'night watch',
  'port authority board', 'insurance surveyors'
];
const ACTIONS = [
  'warns', 'informs', 'reminds', 'alerts', 'updates', 'notifies', 'copies', 'summarises', 'flags', 'compares', 'rates', 'sorts', 'stamps', 'counts', 'weighs', 'lists', 'maps',
  'ranks', 'signs', 'files'
];
const THINGS = [
  'late arrivals', 'missing papers', 'open permits', 'unpaid fees', 'full berths', 'broken sensors', 'long queues', 'rough seas', 'heavy loads', 'expired licences',
  'duplicate entries', 'night shifts', 'damaged goods', 'urgent requests', 'extra charges', 'spare slots', 'blocked gates', 'idle cranes', 'wrong weights', 'old records',
  'changed plans', 'empty tanks', 'new vessels', 'tide changes', 'fog warnings', 'lost keys', 'spill reports', 'cargo holds', 'crew lists', 'safety notes'
];
const WHENS = ['each morning', 'before noon', 'after every storm', 'twice a day', 'at low tide', 'once a week', 'on request', 'at dusk', 'during the winter', 'after each call', 'on Mondays', 'each hour'];
const describe = (noun) => `${pick(VERBS)} the ${noun} ${pick(OBJECTS)} for the ${pick(ROLES)} and ${pick(ACTIONS)} the ${pick(THINGS)} ${pick(WHENS)}.`;
const NODES = [
  ['Edge Cluster', 'Receives the traffic from outside and hands it to the applications.'],
  ['Database Primary', 'Holds the main copy of the data and takes the writes.'],
  ['Database Replica', 'Holds a copy of the data for the reads and the reports.'],
  ['Message Broker', 'Carries the messages between the applications.'],
  ['Batch Runner', 'Runs the nightly jobs and the long computations.'],
  ['File Share', 'Stores the documents and the files exchanged with partners.'],
  ['Reverse Proxy', 'Sits in front of the web applications and terminates the encryption.'],
  ['Cache Cluster', 'Keeps the hot data in memory for the applications.'],
  ['Identity Server', 'Signs the users in and tells the applications who they are.'],
  ['Job Scheduler', 'Starts the periodic jobs at the right time.'],
  ['Monitoring Stack', 'Collects the metrics and the logs and raises the alarms.'],
  ['Backup Vault', 'Keeps the copies of the data far from the machines they come from.']
];
const ENVS = [
  ['prod', 'Production', 7], ['preprod', 'Pre-production', 6], ['staging', 'Staging', 6], ['test', 'Test Lab', 6], ['training', 'Training', 5], ['dr', 'Disaster Recovery', 4],
  ['qa', 'Quality Assurance', 5], ['sandbox', 'Sandbox', 5]
];
const PERSONS = [
  ['harbour-master', 'Harbour Master', 'Runs the harbour and answers for everything that happens in it.'],
  ['pilot', 'Pilot', 'Brings the vessels in and out of the harbour.'],
  ['shipping-agent', 'Shipping Agent', 'Books the berths and the services for the vessel of a shipping line.'],
  ['customs-officer', 'Customs Officer', 'Checks the cargo and the crew of every vessel that arrives.'],
  ['terminal-operator', 'Terminal Operator', 'Loads and unloads the vessels at a terminal.'],
  ['quay-planner', 'Quay Planner', 'Plans which vessel goes to which quay and when.'],
  ['auditor', 'Auditor', 'Reviews the accounts of the port authority.'],
  ['ferry-passenger', 'Ferry Passenger', 'Travels on a ferry and buys a ticket.']
];
// false friends: a container that goes away and one that appears elsewhere, which share most of the words of their description without being one thing
const BOILERPLATE = [
  ['Roster Interface', 'Exposes the interface of the pilot roster to the other systems of the harbour.', 'Tide Feed', 'Exposes the interface of the tide table to the other systems of the harbour.'],
  ['Agent Digest', 'Sends a daily summary of the berth bookings to the shipping agents.', 'Fuel Mailer', 'Sends a daily summary of the fuel orders to the shipping agents.'],
  ['Quay Watch', 'Warns the duty officer when a tug is late.', 'Lock Alarm', 'Warns the duty officer when a lock gate is stuck.'],
  ['Hull Ledger', 'Keeps the history of every hull inspection for the harbour auditors.', 'Boarding Log', 'Keeps the history of every pilot boarding for the harbour auditors.'],
  ['Permit Check', 'Checks every incoming cargo manifest against the customs tariff.', 'Waste Check', 'Checks every outgoing waste declaration against the harbour regulations.'],
  ['Vessel Counter', 'Counts the vessels that enter the harbour every hour and shows the total on the screen.', 'Truck Counter', 'Counts the trucks that enter the terminal every hour and shows the total on the screen.'],
  ['Crane Health', 'Collects the readings of the sensors on the cranes and stores them for later.', 'Buoy Health', 'Collects the readings of the sensors on the buoys and stores them for later.'],
  ['Queue Board', 'Shows the vessels waiting at the entrance and their expected time of entry.', 'Shift Board', 'Shows the crews waiting at the dock and their expected time of duty.'],
  ['Berth Map', 'Draws the berths on a map of the harbour.', 'Rail Map', 'Draws the railway sidings on a map of the harbour.'],
  ['Fee Calculator', 'Computes the port fees of a vessel from its size and its time at the quay.', 'Rent Calculator', 'Computes the rent of a plot from its surface and the length of the lease.'],
  ['Night Report', 'Prints the list of the vessels that stay in the harbour overnight.', 'Day Report', 'Prints the list of the lorries that stay in the car park overnight.'],
  ['Slot Offer', 'Offers a free slot to the next vessel in the queue.', 'Seat Offer', 'Offers a free seat to the next passenger in the queue.']
];
// short descriptions: two words are too few to compare, three are enough
const SHORT = [
  ['Stamp Counter', 'Stores data', 'Pier Index', 'Stores data'],
  ['Sign Writer', 'Sends mail', 'Flag Locker', 'Sends mail'],
  ['Bell Ringer', 'Keeps a log', 'Chart Press', 'Keeps a log'],
  ['Rope Check', 'Prints the page', 'Wharf Copy', 'Prints the page']
];

// ---- the base
const persons = PERSONS.map(([id, name, description]) => Object.assign(make('person', id, name, description), { layer: 'application' }));
const systems = TOPICS.map(([word, noun, title], i) => {
  const s = Object.assign(make('system', kebab(title), title, `Looks after the ${noun} side of the harbour.`, { noun }), { layer: 'application' });
  const size = [11, 12, 10, 13, 11, 12, 12, 11, 10, 12, 11, 12, 12, 11, 12, 8, 12, 12, 14, 14, 12, 12, 13, 11, 12, 12, 11, 11, 10, 10, 10, 10, 10][i];
  for (const f of shuffled(FUNCTIONS).slice(0, size)) {
    const name = `${word} ${f}`;
    const c = make('container', kebab(name), name, describe(noun), { qualifiers: rng() < 0.4 ? [pick(QUALIFIERS)] : [], noun });
    add(s, c);
    if (rng() < 0.1) addComponents(c, 2 + Math.floor(rng() * 2));
  }
  return s;
});
function addComponents(c, n) {
  const have = new Set(c.children.map((x) => x.name));
  for (const [name, descriptions] of shuffled(COMPONENTS)) {
    if (c.children.length >= n) break;
    if (!have.has(name)) add(c, make('component', kebab(name), name, pick(descriptions)));
  }
}
const containersOf = (s) => s.children.filter((c) => c.kind === 'container');
const allContainers = () => systems.flatMap(containersOf);
for (const s of systems) {
  for (const c of containersOf(s)) {
    for (let k = 1 + Math.floor(rng() * 3); k > 0; k--) {
      const dest = pick(rng() < 0.7 ? containersOf(s) : allContainers());
      const label = pick(LABELS);
      if (dest !== c && !c.rels.some((r) => r.dest === dest && r.label === label)) c.rels.push({ dest, label });
    }
  }
}
for (const p of persons) for (const dest of shuffled(allContainers()).slice(0, 3)) p.rels.push({ dest, label: pick(['uses', 'orders from', 'looks at']) });
const envs = ENVS.map(([id, name, count]) => {
  const e = Object.assign(make('environment', id, name, `The ${name.toLowerCase()} machines of the harbour.`), { layer: 'technology' });
  for (const [nodeName, description] of shuffled(NODES).slice(0, count)) {
    const n = Object.assign(make('node', kebab(nodeName), nodeName, description), { layer: 'technology' });
    n.applications = shuffled(allContainers()).slice(0, 2 + Math.floor(rng() * 3));
    add(e, n);
  }
  return e;
});
const S = systems;
const E = Object.fromEntries(envs.map((e) => [e.id, e]));
const node = (env, index) => env.children[index];

// what the scenarios choose in the base (and the base elements they plant for the decoys), before the target is cloned
const used = new Set();
function take(system, n, { comps = false } = {}) {
  let free = containersOf(system).filter((c) => !used.has(c) && (!comps || c.children.length > 0));
  if (free.length < n && comps) {
    for (const c of containersOf(system).filter((c) => !used.has(c) && c.children.length === 0).slice(0, n - free.length)) addComponents(c, 2);
    free = containersOf(system).filter((c) => !used.has(c) && c.children.length > 0);
  }
  if (free.length < n) throw new Error('not enough containers in ' + system.name);
  const chosen = free.slice(0, n);
  chosen.forEach((c) => used.add(c));
  return chosen;
}
const planted = new Set();
function plant(parent, kind, name, description, id = kebab(name)) {
  const e = Object.assign(make(kind, id, name, description, { noun: parent.noun }), { layer: parent.layer });
  planted.add(e);
  return add(parent, e);
}
function ensureRels(e, n) {
  for (const dest of shuffled(allContainers())) {
    if (e.rels.length >= n) break;
    if (dest !== e && !e.rels.some((r) => r.dest === dest)) e.rels.push({ dest, label: pick(LABELS) });
  }
}

// the choices
const pickFor = {};
pickFor.r1Lone = [0, 1, 2, 3, 4].map((i) => take(S[i], 1)[0]);
pickFor.r1Among = [take(S[5], 3), take(S[6], 2)].flat();
pickFor.r2Among = take(S[7], 2);
pickFor.r2Lone = [take(S[8], 1)[0], take(S[9], 1)[0]];
pickFor.r2Touched = take(S[10], 3);
pickFor.r2TouchedLone = take(S[11], 1)[0];
pickFor.r3Among = take(S[12], 3);
pickFor.r3Lone = [take(S[13], 1)[0], take(S[14], 1)[0]];
for (const c of containersOf(S[15]).slice(0, 3)) addComponents(c, 2); // the renamed system has components to carry along
containersOf(S[15]).forEach((c) => used.add(c));
pickFor.g2 = take(S[16], 2, { comps: true });
pickFor.noiseGone16 = take(S[16], 2);
pickFor.noiseGone17 = take(S[17], 3);
pickFor.moveFrom = take(S[18], 9);
pickFor.moveBack = take(S[19], 4);
pickFor.split20 = take(S[20], 3);
pickFor.split21 = take(S[21], 2);
for (const c of [...pickFor.split20, ...pickFor.split21]) ensureRels(c, 3);
pickFor.merge22 = take(S[22], 7);
pickFor.merge23 = take(S[23], 1)[0];
pickFor.d2Gone = ['Gate Pass', 'Entry Permit', 'Visitor Badge', 'Dock Ticket'].map((n) => plant(S[23], 'container', n, describe('gate')));
pickFor.d3Gone = BOILERPLATE.map(([name, description]) => plant(S[25], 'container', name, description));
pickFor.d4Gone = ['Archive', 'Calendar', 'Statistics', 'Search', 'Forms', 'Alerts'].map((n) => plant(S[27], 'container', n, describe('quay')));
pickFor.d5Gone = SHORT.map(([name, description]) => plant(S[24], 'container', name, description));
pickFor.d2Cross = plant(S[24], 'container', 'Message Broker', describe('mooring')); // same name as a node: another layer
pickFor.d2Cross2 = plant(S[24], 'container', 'File Share', describe('mooring'));
pickFor.d1Container = [29, 30, 31, 32].map((i) => take(S[i], 1)[0]);
pickFor.d1Component = [29, 30, 31, 32].map((i) => {
  const [c] = take(S[i], 1, { comps: true });
  return c;
});
const personFerry = persons.find((p) => p.id === 'ferry-passenger');
const personAuditor = persons.find((p) => p.id === 'auditor');
const qaGone = node(E.qa, 0);
const sandboxGone = node(E.sandbox, 0);

// ---- the target: a clone of the base, then the planted changes
side = 'target';
const clones = new Map();
function clone(e, parent) {
  const c = make(e.kind, e.id, e.name, e.description, { qualifiers: [...e.qualifiers], noun: e.noun });
  c.layer = e.layer;
  c.origin = e;
  c.rels = e.rels.map((r) => ({ ...r }));
  c.applications = [...e.applications];
  if (parent) add(parent, c);
  clones.set(e, c);
  for (const child of e.children) clone(child, c);
  return c;
}
const targetRoots = [...persons, ...systems, ...envs].map((r) => clone(r, null));
const T = (e) => clones.get(e);
const redirect = new Map();
const decoys = []; // { from: base element, to: target element, trap }

function rename(base, { id, name, description, scenario }) {
  const c = T(base);
  if (id !== undefined) c.id = id;
  if (name !== undefined) c.name = name;
  if (description !== undefined) c.description = description;
  c.scenario = scenario;
  return c;
}
function move(base, newParent, scenario, change = {}) {
  const c = T(base);
  c.parent.children.splice(c.parent.children.indexOf(c), 1);
  add(newParent, c);
  Object.assign(c, change);
  c.scenario = scenario;
  return c;
}
function drop(base) {
  const c = T(base);
  const list = c.parent ? c.parent.children : targetRoots;
  list.splice(list.indexOf(c), 1);
}
function freshRoot(kind, id, name, description, scenario) {
  const f = Object.assign(make(kind, id, name, description), { layer: 'application', scenario });
  targetRoots.push(f);
  return f;
}
function fresh(parent, kind, id, name, description, scenario, extra = {}) {
  const f = Object.assign(make(kind, id, name, description, { noun: parent.noun }), { layer: parent.layer, scenario });
  Object.assign(f, extra);
  return add(parent, f);
}
function split(base, halves, scenario) {
  const parent = T(base).parent;
  drop(base);
  const made = halves.map((h, i) => {
    const f = fresh(parent, base.kind, h.id, h.name, h.description, scenario, { from: [base] });
    f.rels = base.rels.filter((_, k) => k % halves.length === i).map((r) => ({ ...r }));
    return f;
  });
  redirect.set(base, made);
}
function merge(bases, spec, scenario, parent = T(bases[0]).parent) {
  for (const b of bases) drop(b);
  const f = fresh(parent, bases[0].kind, spec.id, spec.name, spec.description, scenario, { from: [...bases] });
  for (const b of bases) for (const r of b.rels) if (!f.rels.some((x) => x.dest === r.dest && x.label === r.label)) f.rels.push({ ...r });
  for (const b of bases) redirect.set(b, [f]);
}

// R1. an id is renamed and the name stays (the name tells); alone under the parent the lone-sibling rule tells too
pickFor.r1Lone.forEach((c) => rename(c, { id: c.id + '-service', scenario: 'rename-id-only-lone' }));
pickFor.r1Among.forEach((c) => rename(c, { id: c.id + '-v2', scenario: 'rename-id-only-among-others' }));
// R2. id and name are renamed, the description is kept as it was or touched up
pickFor.r2Among.forEach((c) => rename(c, { id: c.id + '-hub', name: c.name + ' Hub', scenario: 'rename-description-kept' }));
pickFor.r2Lone.forEach((c) => rename(c, { id: c.id + '-core', name: c.name + ' Core', scenario: 'rename-description-kept-lone' }));
{
  const [a, b, c] = pickFor.r2Touched;
  const desk = (x, description) => rename(x, { id: x.id + '-desk', name: x.name + ' Desk', description, scenario: 'rename-description-touched-up' });
  desk(a, a.description.replace(/^\w+/, 'Handles'));
  desk(b, b.description.replace(/\.$/, ' and the port authority.'));
  desk(c, c.description.replace(/^(\w+) the (\w+)/, '$1 all the $2'));
  const d = pickFor.r2TouchedLone;
  rename(d, { id: d.id + '-desk', name: d.name + ' Desk', description: d.description.replace(/ (\w+) (\w+)\.$/, ' $2 $1.'), scenario: 'rename-description-touched-up-lone' });
}
// R3. everything is renamed and the description written again: nothing tells, unless the element is alone under its parent
pickFor.r3Among.forEach((c) => rename(c, { id: c.id + '-next', name: c.name + ' Next', description: describe(c.noun), scenario: 'rename-rewritten' }));
pickFor.r3Lone.forEach((c) => rename(c, { id: c.id + '-next', name: c.name + ' Next', description: describe(c.noun), scenario: 'rename-rewritten-lone' }));
// G1. a system is renamed: description kept, every container and component changes reference and keeps its name
rename(S[15], { id: S[15].id + '-office', name: S[15].name + ' Office', scenario: 'system-renamed' });
// G2. containers with components are renamed: one rewritten, one with only its id changed
rename(pickFor.g2[0], { id: pickFor.g2[0].id + '-next', name: pickFor.g2[0].name + ' Next', description: describe(pickFor.g2[0].noun), scenario: 'container-renamed-with-components' });
rename(pickFor.g2[1], { id: pickFor.g2[1].id + '-2', scenario: 'container-renamed-with-components' });
// N. unrelated removals and additions, several of each in the same system (no lone sibling): nothing should tell
pickFor.noiseGone16.forEach(drop);
fresh(T(S[16]), 'container', 'harbour-radio', 'Harbour Radio', 'Relays the calls of the vessels to the quay offices.', 'unrelated');
fresh(T(S[16]), 'container', 'visitor-map', 'Visitor Map', 'Draws the quays on a map for the visitors.', 'unrelated');
pickFor.noiseGone17.forEach(drop);
fresh(T(S[17]), 'container', 'swell-model', 'Swell Model', 'Predicts the height of the waves at the entrance of the harbour.', 'unrelated');
fresh(T(S[17]), 'container', 'lost-property', 'Lost Property', 'Lists the objects found on the quays and gives them back.', 'unrelated');
fresh(T(S[17]), 'container', 'parking-permits', 'Parking Permits', 'Issues the permits of the staff who park near the terminals.', 'unrelated');
// M. moves from a system to another
pickFor.moveFrom.slice(0, 6).forEach((c) => move(c, T(S[19]), 'moved-name-kept'));
pickFor.moveFrom.slice(6, 9).forEach((c) => move(c, T(S[19]), 'moved-renamed-rewritten', { id: c.id + '-x', name: c.name + ' X', description: describe(c.noun) }));
pickFor.moveBack.forEach((c) => move(c, T(S[18]), 'moved-renamed-description-kept', { id: c.id + '-moved', name: c.name + ' Moved' }));
// S. splits: one container becomes two (or three)
{
  const [a, b, c] = pickFor.split20;
  const [d, e] = pickFor.split21;
  split(a, [
    { id: a.id + '-intake', name: a.name + ' Intake', description: a.description.replace(/\.$/, ' as they come in.') },
    { id: a.id + '-follow-up', name: a.name + ' Follow-up', description: 'Chases the missing items and closes the files.' }
  ], 'split-one-half-keeps-the-description');
  split(b, [
    { id: b.id + '-live', name: 'Live ' + b.name.split(' ')[0], description: `Shows what is happening now ${pick(PURPOSES)}.` },
    { id: b.id + '-past', name: 'Past ' + b.name.split(' ')[0], description: `Keeps what happened before ${pick(PURPOSES)}.` }
  ], 'split-new-names-new-descriptions');
  split(c, [
    { id: c.id + '-live', name: c.name, description: 'Takes over the part that has to stay in the harbour.' },
    { id: c.id + '-archive', name: c.name + ' Archive', description: 'Keeps the old items for the auditors.' }
  ], 'split-one-half-keeps-the-name');
  split(d, [
    { id: d.id + '-one', name: d.name + ' One', description: d.description },
    { id: d.id + '-two', name: d.name + ' Two', description: d.description.replace(/^\w+/, 'Mirrors') }
  ], 'split-both-halves-keep-the-description');
  split(e, [
    { id: e.id + '-north', name: 'North ' + e.name, description: describe(e.noun) },
    { id: e.id + '-south', name: 'South ' + e.name, description: describe(e.noun) },
    { id: e.id + '-quay', name: 'Quay ' + e.name, description: describe(e.noun) }
  ], 'split-in-three');
}
// U. merges: two containers become one (the last one across two systems)
{
  const [a, b, c, d, e, f, g] = pickFor.merge22;
  merge([a, b], { id: a.id + '-and-' + b.id.split('-').pop(), name: a.name, description: describe(a.noun) }, 'merge-keeps-the-name-of-one');
  merge([c, d], { id: c.id + '-all', name: c.name + ' All', description: c.description.replace(/\.$/, ' and the rest.') }, 'merge-keeps-the-description-of-one');
  merge([e, f], { id: 'combined-' + e.id.split('-').pop(), name: 'Combined ' + e.name.split(' ').pop(), description: describe(e.noun) }, 'merge-new-name-new-description');
  merge([g, pickFor.merge23], { id: g.id + '-joint', name: g.name + ' Joint', description: pickFor.merge23.description }, 'merge-across-systems');
}

// ---- the decoys: pairs that look alike and are not one thing
// D1. alone under a parent: an element goes away and an unrelated one appears (the lone-sibling rule says "same", the author would say "no")
{
  const names = [
    ['harbour-radar', 'Harbour Radar', 'Follows the vessels that are in the approaches of the harbour.'],
    ['guest-book', 'Guest Book', 'Lets the visitors of the port leave a message.'],
    ['ice-watch', 'Ice Watch', 'Reports the ice on the water in the winter months.'],
    ['staff-rota', 'Staff Rota', 'Lists who works on which shift at the port authority.']
  ];
  pickFor.d1Container.forEach((c, i) => {
    const parent = T(c).parent;
    drop(c);
    decoys.push({ from: c, to: fresh(parent, 'container', names[i][0], names[i][1], names[i][2], 'decoy'), trap: 'lone-sibling-different-thing' });
  });
  const comps = [
    ['translator', 'Translator', 'Translates the messages into the language of the vessel.'],
    ['printer', 'Printer', 'Prints the passes at the gate.'],
    ['reminder', 'Reminder', 'Reminds the agents of the documents they still owe.'],
    ['importer', 'Importer', 'Loads the files of the shipping lines.']
  ];
  pickFor.d1Component.forEach((c, i) => {
    const gone = c.children[0];
    drop(gone);
    decoys.push({ from: gone, to: fresh(T(c), 'component', comps[i][0], comps[i][1], comps[i][2], 'decoy'), trap: 'lone-sibling-different-thing' });
  });
}
// D2. the same name in another kind (a component, a person that becomes a container) or in another layer (a node): the layer and the kind are compared first
{
  const holders = containersOf(S[24]).filter((c) => !planted.has(c)).slice(0, 4);
  pickFor.d2Gone.forEach((c, i) => {
    drop(c);
    decoys.push({ from: c, to: fresh(T(holders[i]), 'component', kebab(c.name), c.name, 'Another thing, filed under the same name.', 'decoy'), trap: 'same-name-other-kind' });
  });
  drop(personFerry);
  decoys.push({ from: personFerry, to: fresh(T(S[24]), 'container', 'ferry-passenger', 'Ferry Passenger', 'Receives the passengers of a ferry at the terminal.', 'decoy'), trap: 'same-name-other-kind' });
  // the first environment that has no node of either name
  const home = T([E.dr, E.training, E.prod, E.preprod, E.staging, E.test].find((env) => ![pickFor.d2Cross, pickFor.d2Cross2].some((c) => env.children.some((n) => n.name === c.name))));
  for (const c of [pickFor.d2Cross, pickFor.d2Cross2]) {
    drop(c);
    decoys.push({ from: c, to: fresh(home, 'node', kebab(c.name), c.name, 'A machine, not a program.', 'decoy'), trap: 'same-name-other-layer' });
  }
}
// D3. close descriptions of unrelated things (boilerplate)
pickFor.d3Gone.forEach((c, i) => {
  drop(c);
  const [, , name, description] = BOILERPLATE[i];
  decoys.push({ from: c, to: fresh(T(S[26]), 'container', kebab(name), name, description, 'decoy'), trap: 'close-description-unrelated' });
});
// D4. two elements that share a name under different parents (nothing else in common)
pickFor.d4Gone.forEach((c) => {
  drop(c);
  decoys.push({ from: c, to: fresh(T(S[28]), 'container', c.id, c.name, describe('lock'), 'decoy'), trap: 'same-name-other-parent' });
});
// D5. descriptions too short to compare (two words), and just long enough (three words)
pickFor.d5Gone.forEach((c, i) => {
  drop(c);
  const [, , name, description] = SHORT[i];
  decoys.push({ from: c, to: fresh(T(S[23]), 'container', kebab(name), name, description, 'decoy'), trap: i < 2 ? 'short-description-two-words' : 'short-description-three-words' });
});

// ---- the persons: a rename that keeps the name, one that keeps the description, an unrelated pair
rename(persons[2], { id: 'agent', scenario: 'person-renamed-name-kept' });
rename(persons[5], { id: 'berth-planner', name: 'Berth Planner', scenario: 'person-renamed-description-kept' });
drop(personAuditor);
freshRoot('person', 'inspector', 'Inspector', 'Looks at the vessels before they are allowed to sail.', 'unrelated');

// ---- the technology: nodes renamed, moved, a whole environment renamed, and decoys
{
  // T1. a node id is renamed, the name stays
  [[E.prod, 0], [E.preprod, 0]].forEach(([env, i]) => rename(node(env, i), { id: node(env, i).id + '-main', scenario: 'node-renamed-id-only' }));
  // T2. a node is renamed, the description stays
  [[E.staging, 0], [E.test, 0]].forEach(([env, i]) => rename(node(env, i), { id: node(env, i).id + '-b', name: node(env, i).name + ' B', scenario: 'node-renamed-description-kept' }));
  // T3. a node moves to another environment that has none of that name
  const usedNodes = new Set([node(E.prod, 0), node(E.preprod, 0), node(E.staging, 0), node(E.test, 0), node(E.training, 0), node(E.training, 1), node(E.qa, 0), node(E.sandbox, 0)]);
  const free = (env, other) => env.children.find((n) => !usedNodes.has(n) && !other.children.some((x) => x.id === n.id));
  for (const [from, to] of [[E.prod, E.sandbox], [E.preprod, E.qa]]) {
    const n = free(from, to);
    usedNodes.add(n);
    move(n, T(to), 'node-moved-name-kept');
  }
  // T4. an environment is renamed: all its nodes change reference and keep their names
  rename(E.dr, { id: 'disaster-recovery', scenario: 'environment-renamed' });
  // T5. nodes renamed and described again
  [0, 1].forEach((i) => rename(node(E.training, i), { id: node(E.training, i).id + '-new', name: node(E.training, i).name + ' New', description: 'Does the same job with other words.', scenario: 'node-renamed-rewritten' }));
  // T6. the same name under two environments, unrelated
  for (let k = 0; k < 2; k++) {
    const gone = free(E.staging, E.test);
    usedNodes.add(gone);
    drop(gone);
    decoys.push({ from: gone, to: fresh(T(E.test), 'node', gone.id, gone.name, 'A different machine with the same name.', 'decoy'), trap: 'same-name-other-parent' });
  }
  // T7. alone under their environment
  drop(qaGone);
  decoys.push({ from: qaGone, to: fresh(T(E.qa), 'node', 'load-injector', 'Load Injector', 'Plays back the traffic of the busiest day.', 'decoy'), trap: 'lone-sibling-different-thing' });
  drop(sandboxGone);
  decoys.push({ from: sandboxGone, to: fresh(T(E.sandbox), 'node', 'mock-customs', 'Mock Customs', 'Answers like the customs service, for the tests of the partners.', 'decoy'), trap: 'lone-sibling-different-thing' });
}

// ---- relationships that really changed, so that the ones a split hands to its halves are not the only ones in the table
{
  const survivors = [];
  for (const r of targetRoots) for (const e of walk(r)) if (e.kind === 'container' && e.origin && e.from.length === 0 && ref(e) === ref(e.origin)) survivors.push(e);
  const pool = shuffled(survivors);
  // new: 24 relationships between containers that stayed where they were
  for (let i = 0; i < 24; i++) {
    const [a, b] = [pool[i], pool[pool.length - 1 - i]];
    if (a !== b && !a.rels.some((r) => r.dest === b)) a.rels.push({ dest: b, label: pick(['subscribes to', 'cross-checks with', 'mirrors']) });
  }
  // removed: 12 relationships of containers that stayed where they were
  for (let i = 24; i < 36; i++) {
    const removable = pool[i].rels.filter((r) => r.dest.side === 'base' && alive(T(r.dest)));
    if (removable.length) pool[i].rels.splice(pool[i].rels.indexOf(removable[0]), 1);
  }
  // the unrelated new containers talk to someone
  for (const r of targetRoots) for (const e of walk(r)) if (e.scenario === 'unrelated' && e.kind === 'container') e.rels.push({ dest: pick(pool), label: 'reads from' });
}

// ---- writing
const refOf = (e) => ref(e);
const baseRoots = [...persons, ...systems, ...envs];
const targetAlive = (e) => alive(e) && (e.parent || targetRoots.includes(e));
const baseSet = new Set();
for (const r of baseRoots) for (const e of walk(r)) baseSet.add(e);
const targetCloneOf = (e) => (e.side === 'base' ? T(e) : e);
function resolve(dest) {
  if (dest.side === 'target') return targetAlive(dest) ? dest : null;
  const options = redirect.get(dest);
  if (options) {
    redirect.set(dest, [...options.slice(1), options[0]]); // alternate between the pieces of a split
    return options[0];
  }
  const c = T(dest);
  return targetAlive(c) ? c : null;
}
const fromOf = (c) => (c.from.length ? c.from : c.origin && ref(c.origin) !== ref(c) ? [c.origin] : []);
const yamlText = (s) => JSON.stringify(s);

function emitElement(e, sideName, declared, indent, root) {
  const pad = ' '.repeat(indent);
  const lines = [];
  const head = root ? '' : '- ';
  const p = root ? pad : pad + '  ';
  const first = (text) => lines.push((root ? pad : pad + '- ') + text);
  const more = (text) => lines.push((root ? pad : pad + '  ') + text);
  const key = (name, text) => (lines.length === 0 ? first(`${name}: ${text}`) : more(`${name}: ${text}`));
  if (!root) key('kind', yamlText(e.kind));
  key('id', yamlText(e.id));
  key('name', yamlText(e.name));
  if (e.description) key('description', yamlText(e.description));
  if (e.qualifiers.length) {
    key('qualifiers', '');
    lines[lines.length - 1] = lines[lines.length - 1].replace(/: $/, ':');
    e.qualifiers.forEach((q) => lines.push(p + '  - ' + yamlText(q)));
  }
  if (declared && sideName === 'target') {
    const from = fromOf(e).map(refOf).sort();
    if (from.length) {
      key('replaces', '');
      lines[lines.length - 1] = lines[lines.length - 1].replace(/: $/, ':');
      from.forEach((r) => lines.push(p + '  - ' + yamlText(r)));
    }
  }
  void head;
  const resolveApp = (a) => (sideName === 'base' ? a : resolve(a));
  const apps = [...new Set(e.applications.map(resolveApp).filter(Boolean).map(refOf))].sort();
  if (apps.length) {
    key('applications', '');
    lines[lines.length - 1] = lines[lines.length - 1].replace(/: $/, ':');
    apps.forEach((a) => lines.push(p + '  - ' + yamlText(a)));
  }
  const rels = [];
  for (const r of e.rels) {
    const dest = sideName === 'base' ? r.dest : resolve(r.dest);
    if (dest && !rels.some((x) => x.dest === refOf(dest) && x.label === r.label)) rels.push({ dest: refOf(dest), label: r.label });
  }
  if (rels.length) {
    key('relationships', '');
    lines[lines.length - 1] = lines[lines.length - 1].replace(/: $/, ':');
    for (const r of rels) {
      lines.push(p + '  - destination: ' + yamlText(r.dest));
      lines.push(p + '    label: ' + yamlText(r.label));
    }
  }
  if (e.children.length) {
    key('elements', '');
    lines[lines.length - 1] = lines[lines.length - 1].replace(/: $/, ':');
    for (const c of e.children) lines.push(...emitElement(c, sideName, declared, indent + (root ? 2 : 4), false));
  }
  return lines;
}
function emitRoot(e, sideName, declared) {
  const header = ['header:', `  kind: "archicode.morin.io/${e.kind}"`, '  version: "1"', 'content:'];
  return header.concat(emitElement(e, sideName, declared, 2, true)).join('\n') + '\n';
}
function writePlateau(dir, roots, sideName, declared) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  for (const r of roots) fs.writeFileSync(path.join(dir, `${r.layer === 'technology' ? 'env' : r.kind}-${r.id}.yaml`), emitRoot(r, sideName, declared));
}
const plateaus = path.join(here, 'plateaus');
writePlateau(path.join(plateaus, '10_before'), baseRoots, 'base', false);
// resolve() rotates the pieces of a split, so the plain and the declared plateau must see the same rotation: reset it before each write
const snapshot = new Map([...redirect].map(([k, v]) => [k, [...v]]));
const reset = () => snapshot.forEach((v, k) => redirect.set(k, [...v]));
reset();
writePlateau(path.join(plateaus, '20_after'), targetRoots, 'target', false);
reset();
writePlateau(path.join(plateaus, '30_after-declared'), targetRoots, 'target', true);

// ---- the answers
const layerOf = (e) => (e.parent ? layerOf(e.parent) : e.layer);
const sortBy = (list) => list.sort((a, b) => ((a.layer ?? a.fromLayer) + a.from + a.to).localeCompare((b.layer ?? b.fromLayer) + b.from + b.to));

const scenarioOf = (e) => (e.scenario ? e.scenario : e.parent && scenarioOf(e.parent) ? scenarioOf(e.parent) + '/inside' : null);
const same = [];
for (const r of targetRoots) {
  for (const e of walk(r)) {
    for (const o of fromOf(e)) same.push({ layer: layerOf(e), from: ref(o), to: ref(e), scenario: scenarioOf(e) ?? 'unknown' });
  }
}
const notSame = decoys.map((d) => ({ fromLayer: layerOf(d.from), from: ref(d.from), toLayer: layerOf(d.to), to: ref(d.to), trap: d.trap }));
const baseRefs = new Set();
const targetRefs = new Set();
const dup = (set, e, what) => {
  const r = layerOf(e) + ':' + ref(e);
  if (set.has(r)) throw new Error('a reference is declared twice in the ' + what + ': ' + r);
  set.add(r);
};
for (const r of baseRoots) for (const e of walk(r)) dup(baseRefs, e, 'base');
for (const r of targetRoots) for (const e of walk(r)) dup(targetRefs, e, 'target');
for (const a of [...same, ...notSame]) {
  const [fromLayer, toLayer] = [a.fromLayer ?? a.layer, a.toLayer ?? a.layer];
  if (!baseRefs.has(fromLayer + ':' + a.from) || targetRefs.has(fromLayer + ':' + a.from)) throw new Error('not a removed element: ' + a.from);
  if (!targetRefs.has(toLayer + ':' + a.to) || baseRefs.has(toLayer + ':' + a.to)) throw new Error('not a new element: ' + a.to);
}
const count = (roots, layer) => roots.filter((r) => r.layer === layer).reduce((n, r) => n + [...walk(r)].length, 0);
const answers = {
  about:
    'The planted answers of the invented harbour in plateaus/10_before and plateaus/20_after. `same` lists the pairs (an element only the before plateau has, one only the after plateau has) that ARE one thing said twice: ' +
    'a rename, a move, a split or a merge, each with the scenario that planted it. `notSame` lists the false friends planted on purpose; any other pair of a removed and a new element is also not one thing. ' +
    'Generated by generate.mjs; the numbers a test records about them are in ReplacesLargePairTest.',
  elements: {
    before: { application: count(baseRoots, 'application'), technology: count(baseRoots, 'technology') },
    after: { application: count(targetRoots, 'application'), technology: count(targetRoots, 'technology') }
  },
  same: sortBy(same),
  notSame: sortBy(notSame)
};
fs.writeFileSync(path.join(here, 'answers.json'), JSON.stringify(answers, null, 2) + '\n');

// ---- `node generate.mjs --sweep`: the candidate rule of the kernel (compare.rs, `candidates()`) re-read in a few lines, to see what other thresholds would do
// to this pair. The kernel is the judge (ReplacesLargePairTest runs it); at the kernel's own values this must list exactly the pairs the kernel lists.
if (process.argv.includes('--sweep')) {
  const norm = (t) => (t ?? '').trim();
  const wordsOf = (t) => new Set(norm(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  const flat = (roots) => roots.flatMap((r) => [...walk(r)].map((e) => ({ e, layer: layerOf(e), ref: ref(e) })));
  const goneAll = flat(baseRoots).filter((x) => !targetRefs.has(x.layer + ':' + x.ref));
  const freshAll = flat(targetRoots).filter((x) => !baseRefs.has(x.layer + ':' + x.ref));
  const parentOf = (x) => (x.ref.includes('.') ? x.ref.slice(0, x.ref.lastIndexOf('.')) : null);
  const rule = ({ close = 0.6, least = 3, lone = true, names = 'all' }) => {
    const found = new Set();
    for (const layer of ['application', 'technology']) {
      const gone = goneAll.filter((x) => x.layer === layer);
      const fr = freshAll.filter((x) => x.layer === layer);
      const siblings = new Map();
      const bump = (x, i) => {
        const p = parentOf(x);
        if (p === null) return;
        const k = p + '|' + norm(x.e.kind);
        siblings.set(k, siblings.get(k) ?? [0, 0]);
        siblings.get(k)[i]++;
      };
      gone.forEach((x) => bump(x, 0));
      fr.forEach((x) => bump(x, 1));
      const nameCount = (list, x) => list.filter((y) => norm(y.e.kind) === norm(x.e.kind) && norm(y.e.name).toLowerCase() === norm(x.e.name).toLowerCase()).length;
      for (const a of gone) {
        for (const b of fr) {
          const kind = norm(a.e.kind);
          if (!kind || kind !== norm(b.e.kind)) continue;
          const name = norm(a.e.name).toLowerCase();
          let hit = false;
          if (names !== 'off' && name && name === norm(b.e.name).toLowerCase()) hit = names === 'all' || (nameCount(gone, a) === 1 && nameCount(fr, b) === 1);
          if (!hit && close > 0) {
            const [wa, wb] = [wordsOf(a.e.description), wordsOf(b.e.description)];
            if (wa.size >= least && wb.size >= least) {
              const common = [...wa].filter((w) => wb.has(w)).length;
              hit = common / new Set([...wa, ...wb]).size >= close;
            }
          }
          if (!hit && lone) {
            const [pa, pb] = [parentOf(a), parentOf(b)];
            const c = pa !== null && pa === pb ? siblings.get(pa + '|' + kind) : null;
            hit = !!c && c[0] === 1 && c[1] === 1;
          }
          if (hit) found.add(layer + ':' + a.ref + ' -> ' + layer + ':' + b.ref);
        }
      }
    }
    return found;
  };
  const sameKeys = new Set(same.map((a) => `${a.layer}:${a.from} -> ${a.layer}:${a.to}`));
  const plantedKeys = notSame.map((a) => `${a.fromLayer}:${a.from} -> ${a.toLayer}:${a.to}`);
  const row = (label, params) => {
    const found = rule(params);
    const tp = [...found].filter((k) => sameKeys.has(k)).length;
    const listed = plantedKeys.filter((k) => found.has(k)).length;
    console.log(
      `${label.padEnd(44)} found=${String(found.size).padStart(4)} tp=${String(tp).padStart(3)} fp=${String(found.size - tp).padStart(4)} fn=${String(sameKeys.size - tp).padStart(3)} ` +
        `precision=${(tp / found.size).toFixed(3)} recall=${(tp / sameKeys.size).toFixed(3)} planted-decoys-listed=${listed}/${plantedKeys.length}`
    );
  };
  row('kernel (close 0.6, least 3, lone, names all)', {});
  if (process.argv.includes('--fp')) {
    const found = rule({});
    const level = (k) => { const [from] = k.split(' -> '); const [layer, r] = from.split(':'); return layer + '/' + r.split('.').length; };
    const byLevel = {};
    for (const k of found) { const l = level(k); byLevel[l] ??= { tp: 0, fp: 0 }; byLevel[l][sameKeys.has(k) ? 'tp' : 'fp']++; }
    console.log(byLevel);
    const noDesc = rule({ close: 0 });
    for (const k of found) if (!sameKeys.has(k) && !noDesc.has(k) && !plantedKeys.includes(k)) console.log('FP description only:', k);
  }
  for (const close of [0.5, 0.7, 0.8, 0.9, 1.01]) row(`close ${close > 1 ? 'never' : close}`, { close });
  for (const least of [2, 4, 5, 6, 8]) row(`least ${least} words`, { least });
  row('lone-sibling rule off', { lone: false });
  row('name rule off', { names: 'off' });
  row('name rule only when the name is unique', { names: 'unique' });
  row('name unique + close 0.7', { names: 'unique', close: 0.7 });
  row('name unique + lone off', { names: 'unique', lone: false });
  row('description rule off', { close: 0 });
  row('name unique + description off + lone off', { names: 'unique', close: 0, lone: false });
}
console.log(JSON.stringify({ elements: answers.elements, same: same.length, notSame: notSame.length }));
