// glossary.js — the technical words of the explanations, explained where
// they appear: glossify(element) turns the first mention of each known term
// in its text into a small button that opens a one-sentence definition.
// Bilingual data (English source, German in Swiss orthography).

import { getLanguage } from '../i18n.js';

const ENTRIES = [
  { en: ['LC4/LPLC2', 'LC4', 'LPLC2', 'looming detectors', 'threat detectors'],
    de: ['LC4/LPLC2', 'LC4', 'LPLC2', 'Annäherungsdetektoren', 'Bedrohungsdetektoren'],
    title: { en: 'LC4 and LPLC2', de: 'LC4 und LPLC2' },
    text: { en: 'Visual projection neurons of the optic lobes that respond to an object approaching on a collision course (looming). They excite the giant fiber.',
      de: 'Visuelle Projektionsneuronen der optischen Loben, die auf ein Objekt auf Kollisionskurs antworten (Annäherung). Sie erregen die Riesenfaser.' } },
  { en: ['giant fibers', 'giant fiber', 'DNp01'], de: ['Riesenfasern', 'Riesenfaser', 'DNp01'],
    title: { en: 'Giant fiber (DNp01)', de: 'Riesenfaser (DNp01)' },
    text: { en: 'A pair of descending neurons with the largest axons in the fly brain. A single spike launches the escape: a jump with the middle legs, then flight.',
      de: 'Ein Paar absteigender Neuronen mit den dicksten Axonen im Fliegengehirn. Ein einziger Spike löst die Flucht aus: ein Sprung mit den Mittelbeinen, dann der Flug.' } },
  { en: ['DNp09'], de: ['DNp09'],
    title: { en: 'DNp09', de: 'DNp09' },
    text: { en: 'A pair of descending neurons whose activity starts and sustains forward walking.',
      de: 'Ein Paar absteigender Neuronen, deren Aktivität das Vorwärtslaufen startet und aufrechterhält.' } },
  { en: ['DNa01/02', 'DNa01', 'DNa02'], de: ['DNa01/02', 'DNa01', 'DNa02'],
    title: { en: 'DNa01 and DNa02', de: 'DNa01 und DNa02' },
    text: { en: 'Descending steering neurons: a difference between the left and the right cells turns the fly.',
      de: 'Absteigende Lenkneuronen: Ein Unterschied zwischen den linken und rechten Zellen lässt die Fliege abbiegen.' } },
  { en: ['MDN'], de: ['MDN'],
    title: { en: 'MDN, the moonwalker neurons', de: 'MDN, die Moonwalker-Neuronen' },
    text: { en: 'Descending neurons whose activity makes the fly walk backward.',
      de: 'Absteigende Neuronen, deren Aktivität die Fliege rückwärts laufen lässt.' } },
  { en: ['DNg11'], de: ['DNg11'],
    title: { en: 'DNg11', de: 'DNg11' },
    text: { en: 'Descending neurons that drive grooming with the front legs in this model.',
      de: 'Absteigende Neuronen, die in diesem Modell das Putzen mit den Vorderbeinen antreiben.' } },
  { en: ['DNg12'], de: ['DNg12'],
    title: { en: 'DNg12', de: 'DNg12' },
    text: { en: 'Descending neurons that drive head grooming; touch neurons of the antenna reach them through relay cells.',
      de: 'Absteigende Neuronen, die das Kopfputzen antreiben; Berührungsneuronen des Fühlers erreichen sie über Relaiszellen.' } },
  { en: ["Johnston's organ", 'JO-A/B', 'JO-C/D/E', 'JO-F'], de: ['Johnston-Organ', 'JO-A/B', 'JO-C/D/E', 'JO-F'],
    title: { en: "Johnston's organ", de: 'Johnston-Organ' },
    text: { en: "The fly's hearing and wind organ in the antenna: JO-A/B respond to sound vibrations, JO-C/D/E to slow deflections such as wind, JO-F to touch.",
      de: 'Das Hör- und Windorgan der Fliege im Fühler: JO-A/B antworten auf Schallschwingungen, JO-C/D/E auf langsame Auslenkungen wie Wind, JO-F auf Berührung.' } },
  { en: ['proboscis'], de: ['Rüssels', 'Rüssel'],
    title: { en: 'Proboscis', de: 'Rüssel' },
    text: { en: "The fly's mouthpart. Extending it is the first step of feeding; taste neurons on its tip decide.",
      de: 'Das Mundwerkzeug der Fliege. Es auszufahren ist der erste Schritt des Fressens; Geschmacksneuronen an seiner Spitze entscheiden.' } },
  { en: ['SEZ'], de: ['SEZ'],
    title: { en: 'Subesophageal zone (SEZ)', de: 'Unterschlundzone (SEZ)' },
    text: { en: 'The lower part of the brain where taste input arrives and the motor neurons for feeding sit.',
      de: 'Der untere Teil des Gehirns, wo Geschmacksinformation ankommt und die Motoneuronen des Fressens liegen.' } },
  { en: ['descending neurons', 'descending neuron'], de: ['absteigende Neuronen', 'absteigenden Neuronen', 'absteigendes Neuron'],
    title: { en: 'Descending neurons', de: 'Absteigende Neuronen' },
    text: { en: 'Neurons that carry commands from the brain to the nerve cord, which moves the legs and wings.',
      de: 'Neuronen, die Befehle vom Gehirn zum Bauchmark tragen, das Beine und Flügel bewegt.' } },
  { en: ['spikes', 'spike'], de: ['Spikes', 'Spike'],
    title: { en: 'Spike', de: 'Spike' },
    text: { en: "A brief electrical impulse of a neuron. In the model: the moment its membrane crosses threshold, after which it is reset.",
      de: 'Ein kurzer elektrischer Impuls eines Neurons. Im Modell: der Moment, in dem seine Membran die Schwelle überschreitet; danach wird sie zurückgesetzt.' } },
  { en: ['synapses', 'synapse'], de: ['Synapsen', 'Synapse'],
    title: { en: 'Synapse', de: 'Synapse' },
    text: { en: 'A contact through which one neuron passes signals to another. The connectome counts them for every pair of cells.',
      de: 'Eine Kontaktstelle, über die ein Neuron Signale an ein anderes weitergibt. Das Konnektom zählt sie für jedes Zellpaar.' } },
  { en: ['connectome'], de: ['Konnektom'],
    title: { en: 'Connectome', de: 'Konnektom' },
    text: { en: 'The wiring diagram of a nervous system: every neuron and its synapses, reconstructed from electron-microscope images.',
      de: 'Der Schaltplan eines Nervensystems: jedes Neuron und seine Synapsen, rekonstruiert aus elektronenmikroskopischen Bildern.' } },
  { en: ['mushroom body', 'Kenyon cells'], de: ['Pilzkörper', 'Pilzkörpers', 'Kenyon-Zellen'],
    title: { en: 'Mushroom body', de: 'Pilzkörper' },
    text: { en: 'A brain centre for learning and memory; Kenyon cells carry odour and other sensory information, dopamine neurons teach them.',
      de: 'Ein Hirnzentrum für Lernen und Gedächtnis; Kenyon-Zellen tragen Duft- und andere Sinnesinformation, Dopaminneuronen bringen ihnen bei.' } },
  { en: ['central complex'], de: ['Zentralkomplex'],
    title: { en: 'Central complex', de: 'Zentralkomplex' },
    text: { en: 'A brain centre for orientation and navigation, with a compass-like map of the heading.',
      de: 'Ein Hirnzentrum für Orientierung und Navigation, mit einer kompassartigen Karte der Richtung.' } },
  { en: ['optic lobes', 'optic lobe'], de: ['optischen Loben', 'optischer Lobus', 'optischen Lobus'],
    title: { en: 'Optic lobes', de: 'Optische Loben' },
    text: { en: 'The two large visual centres beside the central brain, one behind each compound eye.',
      de: 'Die zwei grossen Sehzentren neben dem Zentralhirn, je eines hinter jedem Facettenauge.' } },
];

let cache = { lang: null, re: null, map: null };
function matcher() {
  const lang = getLanguage() === 'de' ? 'de' : 'en';
  if (cache.lang === lang) return cache;
  const map = new Map();
  for (const e of ENTRIES) for (const term of e[lang] ?? e.en) map.set(term.toLowerCase(), e);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const terms = [...map.keys()].sort((a, b) => b.length - a.length).map(esc);
  cache = { lang, map, re: new RegExp(`(^|[^\\p{L}\\p{N}])(${terms.join('|')})(?=$|[^\\p{L}\\p{N}])`, 'giu') };
  return cache;
}

let pop = null;
function close() { if (pop) pop.hidden = true; }
function show(anchor, entry) {
  const lang = getLanguage() === 'de' ? 'de' : 'en';
  if (!pop) {
    pop = document.createElement('div');
    pop.className = 'gloss-pop';
    pop.setAttribute('role', 'tooltip');
    document.body.append(pop);
    document.addEventListener('pointerdown', (ev) => { if (!pop.hidden && !pop.contains(ev.target) && !ev.target.closest?.('.term')) close(); }, true);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  }
  const b = document.createElement('b'), s = document.createElement('span');
  b.textContent = entry.title[lang]; s.textContent = entry.text[lang];
  pop.replaceChildren(b, s);
  pop.hidden = false;
  // beside the word, inside the window (read once, on the tap)
  const r = anchor.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 20);
  pop.style.width = `${w}px`;
  const left = Math.max(10, Math.min(window.innerWidth - w - 10, r.left));
  const below = r.bottom + 8, h = pop.offsetHeight;
  pop.style.left = `${left}px`;
  pop.style.top = `${below + h > window.innerHeight - 10 ? Math.max(10, r.top - h - 8) : below}px`;
}

function termButton(word, entry) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'term';
  b.textContent = word;
  b.addEventListener('click', (ev) => { ev.stopPropagation(); ev.preventDefault(); if (pop && !pop.hidden && pop.dataset.term === entry.title.en) { close(); return; } show(b, entry); pop.dataset.term = entry.title.en; });
  return b;
}

// Marks the first mention of each known term inside `root` (text only; not
// inside buttons, links or tags). Returns `root`.
export function glossify(root) {
  if (!root) return root;
  const { re, map } = matcher();
  const seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('button, a, .tag, .term, input, textarea, .k') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const text = node.nodeValue;
    const parts = [];
    let last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      const start = m.index + m[1].length, word = m[2], entry = map.get(word.toLowerCase());
      if (!entry || seen.has(entry)) continue;
      seen.add(entry);
      parts.push(text.slice(last, start), termButton(word, entry));
      last = start + word.length;
    }
    if (!parts.length) continue;
    parts.push(text.slice(last));
    node.replaceWith(...parts.filter((p) => p !== ''));
  }
  return root;
}
