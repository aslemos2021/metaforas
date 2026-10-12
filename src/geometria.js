// @ts-check
/**
 * Geometria do desenho: portas (onde um fluxo toca um elemento) e rotas
 * ortogonais entre portas. Funções puras, sem DOM, testadas em
 * tests/geometria.test.mjs.
 */
import { ancestrais, caixasAbsolutas, contem, indexar } from './modelo.js';
import { TOCO, medidaDaLegenda } from './notacao.js';

/** @typedef {import('./modelo.js').Diagrama} Diagrama */
/** @typedef {import('./modelo.js').Elemento} Elemento */
/** @typedef {import('./modelo.js').Fluxo} Fluxo */
/** @typedef {import('./modelo.js').Ponta} Ponta */
/** @typedef {import('./modelo.js').Lado} Lado */
/** @typedef {import('./modelo.js').Caixa} Caixa */
/** @typedef {{x: number, y: number}} Ponto */

/** Para onde aponta cada lado, de dentro para fora. */
export const NORMAL = /** @type {Record<Lado, Ponto>} */ ({
  topo: { x: 0, y: -1 },
  baixo: { x: 0, y: 1 },
  esquerda: { x: -1, y: 0 },
  direita: { x: 1, y: 0 },
});

const EPS = 0.01;

/** @param {Caixa} c */
export function centro(c) {
  return { x: c.x + c.w / 2, y: c.y + c.h / 2 };
}

/**
 * O meio de um lado da caixa. Serve para retângulos, para os vértices do
 * losango e para os extremos da elipse. Na junção, todos os lados dão no centro.
 * @param {Caixa} c @param {string} tipo @param {Lado} lado @returns {Ponto}
 */
export function meioDoLado(c, tipo, lado) {
  if (tipo === 'juncao') return centro(c);
  switch (lado) {
    case 'topo': return { x: c.x + c.w / 2, y: c.y };
    case 'baixo': return { x: c.x + c.w / 2, y: c.y + c.h };
    case 'esquerda': return { x: c.x, y: c.y + c.h / 2 };
    case 'direita': return { x: c.x + c.w, y: c.y + c.h / 2 };
  }
}

/**
 * Leva um ponto até um lado da caixa, sem chegar perto dos cantos.
 * @param {Caixa} c @param {Lado} lado @param {Ponto} p @param {number} folga
 */
function projeta(c, lado, p, folga) {
  const limita = (/** @type {number} */ v, /** @type {number} */ a, /** @type {number} */ b) =>
    a > b ? (a + b) / 2 : Math.min(b, Math.max(a, v));
  switch (lado) {
    case 'topo': return { x: limita(p.x, c.x + folga, c.x + c.w - folga), y: c.y };
    case 'baixo': return { x: limita(p.x, c.x + folga, c.x + c.w - folga), y: c.y + c.h };
    case 'esquerda': return { x: c.x, y: limita(p.y, c.y + folga, c.y + c.h - folga) };
    case 'direita': return { x: c.x + c.w, y: limita(p.y, c.y + folga, c.y + c.h - folga) };
  }
}

/**
 * A caixa da legenda de um elemento, em coordenadas do diagrama.
 * @param {Diagrama} d @param {Elemento} e @param {Map<string, Caixa>} caixas @param {Map<string, Elemento>} idx
 * @returns {Caixa|null}
 */
export function caixaDaLegenda(d, e, caixas, idx) {
  if (!e.legenda) return null;
  const c = /** @type {Caixa} */ (caixas.get(e.id));
  const m = medidaDaLegenda(e.legenda, e.tipo, c.w, c.h, ancestrais(d, e.id, idx).length);
  return { x: c.x + m.x, y: c.y + m.y, w: m.w, h: m.h };
}

/**
 * Onde um fluxo toca um elemento, e em que direção está andando ali.
 *
 * Quando o elemento é interface do que está na outra ponta (o fluxo chega à
 * borda de uma máquina vindo de dentro dela, ou sai da borda para dentro),
 * a porta fica alinhada com a outra ponta, para a linha sair reta, mas
 * longe da legenda; e a direção se inverte, porque o fluxo atravessa a borda
 * pelo lado de dentro.
 *
 * @param {Diagrama} d @param {Map<string, Caixa>} caixas @param {Map<string, Elemento>} idx
 * @param {Ponta} ponta @param {Ponta} outra @param {'de'|'para'} papel
 * @returns {{ponto: Ponto, direcao: Ponto}}
 */
export function porta(d, caixas, idx, ponta, outra, papel) {
  const el = /** @type {Elemento} */ (idx.get(ponta.elemento));
  const c = /** @type {Caixa} */ (caixas.get(ponta.elemento));
  const n = NORMAL[ponta.lado];
  const deDentro = contem(d, ponta.elemento, outra.elemento, idx);
  let ponto = meioDoLado(c, el.tipo, ponta.lado);
  if (deDentro) {
    ponto = pontoPorDentro(d, caixas, idx, el, ponta.lado, outra);
  } else {
    // Se outro fluxo chega a esta mesma borda por dentro, os dois se encontram no mesmo ponto.
    const encontro = d.fluxos
      .flatMap((f) => [[f.de, f.para], [f.para, f.de]])
      .find(([p, q]) => p.elemento === el.id && p.lado === ponta.lado && contem(d, el.id, q.elemento, idx));
    if (encontro) ponto = pontoPorDentro(d, caixas, idx, el, ponta.lado, encontro[1]);
  }
  // Saindo, anda para fora; chegando, anda para dentro. Pelo lado de dentro, o contrário.
  const sinal = (papel === 'de') !== deDentro ? 1 : -1;
  return { ponto, direcao: { x: n.x * sinal || 0, y: n.y * sinal || 0 } };
}

/**
 * O ponto da borda de uma interface onde chega um fluxo vindo de dentro:
 * alinhado com a outra ponta, longe dos cantos e da legenda.
 * @param {Diagrama} d @param {Map<string, Caixa>} caixas @param {Map<string, Elemento>} idx
 * @param {Elemento} el @param {Lado} lado @param {Ponta} outra
 */
function pontoPorDentro(d, caixas, idx, el, lado, outra) {
  const c = /** @type {Caixa} */ (caixas.get(el.id));
  const outro = /** @type {Elemento} */ (idx.get(outra.elemento));
  const alvo = meioDoLado(/** @type {Caixa} */ (caixas.get(outra.elemento)), outro.tipo, outra.lado);
  const folga = Math.min(c.w, c.h) / 5;
  let ponto = projeta(c, lado, alvo, folga);
  const leg = lado === 'topo' ? caixaDaLegenda(d, el, caixas, idx) : null;
  if (leg && ponto.x > leg.x - TOCO && ponto.x < leg.x + leg.w + TOCO && leg.x - TOCO >= c.x + folga) {
    ponto = { x: leg.x - TOCO, y: ponto.y };
  }
  return ponto;
}

/** @param {Ponto} p @param {Ponto} d @param {number} k */
function anda(p, d, k) {
  return { x: p.x + d.x * k, y: p.y + d.y * k };
}

/** Tira pontos repetidos e pontos no meio de um trecho reto. @param {Ponto[]} pts */
export function simplifica(pts) {
  /** @type {Ponto[]} */
  const s = [];
  for (const p of pts) {
    const u = s[s.length - 1];
    if (u && Math.abs(u.x - p.x) < EPS && Math.abs(u.y - p.y) < EPS) continue;
    s.push(p);
  }
  for (let i = s.length - 2; i > 0; i--) {
    const a = s[i - 1], b = s[i], c = s[i + 1];
    const mesmoX = Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS;
    const mesmoY = Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS;
    if (mesmoX || mesmoY) s.splice(i, 1);
  }
  return s;
}

/** Direção de um trecho ortogonal, ou null se ele for oblíquo. @param {Ponto} a @param {Ponto} b */
export function direcaoDoTrecho(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) < EPS && Math.abs(dy) >= EPS) return { x: 0, y: Math.sign(dy) };
  if (Math.abs(dy) < EPS && Math.abs(dx) >= EPS) return { x: Math.sign(dx), y: 0 };
  return null;
}

/** @param {Ponto} a @param {Ponto} b */
const iguais = (a, b) => a.x === b.x && a.y === b.y;

/**
 * Uma rota é boa se todos os trechos são horizontais ou verticais, se sai na
 * direção da porta de saída, chega na direção da porta de chegada e nunca
 * volta sobre si mesma.
 * @param {Ponto[]} s @param {Ponto} d1 @param {Ponto} d2
 */
export function rotaValida(s, d1, d2) {
  if (s.length < 2) return false;
  const dirs = [];
  for (let i = 0; i < s.length - 1; i++) {
    const d = direcaoDoTrecho(s[i], s[i + 1]);
    if (!d) return false;
    dirs.push(d);
  }
  if (!iguais(dirs[0], d1) || !iguais(dirs[dirs.length - 1], d2)) return false;
  for (let i = 0; i < dirs.length - 1; i++) {
    if (dirs[i].x === -dirs[i + 1].x && dirs[i].y === -dirs[i + 1].y) return false;
  }
  return true;
}

/** @param {Ponto[]} s */
function comprimento(s) {
  let t = 0;
  for (let i = 0; i < s.length - 1; i++) t += Math.abs(s[i + 1].x - s[i].x) + Math.abs(s[i + 1].y - s[i].y);
  return t;
}

/**
 * Se um trecho horizontal ou vertical atravessa o interior de uma caixa.
 * @param {Ponto} a @param {Ponto} b @param {Caixa} c
 */
export function atravessa(a, b, c) {
  const f = 1; // tocar a borda não conta
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return x1 > c.x + f && x0 < c.x + c.w - f && y1 > c.y + f && y0 < c.y + c.h - f;
}

/**
 * @typedef {object} Obstaculo
 * @property {Caixa} caixa
 * @property {'livre'|'origem'|'destino'} papel  origem e destino podem ser tocados no primeiro e no último trecho
 */

/** Quantas vezes a rota atravessa obstáculos. @param {Ponto[]} s @param {Obstaculo[]} obstaculos */
function travessias(s, obstaculos) {
  let n = 0;
  const ultimo = s.length - 2;
  for (let i = 0; i < s.length - 1; i++) {
    for (const o of obstaculos) {
      if (o.papel === 'origem' && i === 0) continue;
      if (o.papel === 'destino' && i === ultimo) continue;
      if (atravessa(s[i], s[i + 1], o.caixa)) n++;
    }
  }
  return n;
}

/**
 * Rota ortogonal de p1 (andando na direção d1) até p2 (chegando na direção d2).
 * Experimenta formas simples (reta, L, Z, U), com o trecho do meio passando
 * também ao lado de cada obstáculo, e fica com a que atravessa menos
 * obstáculos; depois, com a de menos dobras; depois, com a mais curta.
 * @param {Ponto} p1 @param {Ponto} d1 @param {Ponto} p2 @param {Ponto} d2
 * @param {Obstaculo[]} [obstaculos]
 * @returns {Ponto[]}
 */
export function rota(p1, d1, p2, d2, obstaculos = []) {
  const a = anda(p1, d1, TOCO);
  const b = anda(p2, d2, -TOCO);
  // Canais por onde o trecho do meio pode passar; os afastados servem para voltar atrás.
  const xs = new Set([(p1.x + p2.x) / 2, (a.x + b.x) / 2, a.x, b.x, a.x - 2 * TOCO, a.x + 2 * TOCO]);
  const ys = new Set([(p1.y + p2.y) / 2, (a.y + b.y) / 2, a.y, b.y, a.y - 2 * TOCO, a.y + 2 * TOCO]);
  for (const { caixa: c } of obstaculos) {
    xs.add(c.x - TOCO); xs.add(c.x + c.w + TOCO);
    ys.add(c.y - TOCO); ys.add(c.y + c.h + TOCO);
  }
  /** @type {Ponto[][]} */
  const candidatas = [
    [p1, p2],
    [p1, { x: p2.x, y: p1.y }, p2],
    [p1, { x: p1.x, y: p2.y }, p2],
    [p1, a, { x: b.x, y: a.y }, b, p2],
    [p1, a, { x: a.x, y: b.y }, b, p2],
  ];
  for (const x of xs) {
    candidatas.push([p1, { x, y: p1.y }, { x, y: p2.y }, p2]);
    candidatas.push([p1, a, { x, y: a.y }, { x, y: b.y }, b, p2]);
  }
  for (const y of ys) {
    candidatas.push([p1, { x: p1.x, y }, { x: p2.x, y }, p2]);
    candidatas.push([p1, a, { x: a.x, y }, { x: b.x, y }, b, p2]);
  }
  /** @type {{s: Ponto[], custo: number}|null} */
  let melhor = null;
  for (const c of candidatas) {
    const s = simplifica(c);
    if (!rotaValida(s, d1, d2)) continue;
    const custo = travessias(s, obstaculos) * 1e9 + (s.length - 2) * 1e6 + comprimento(s);
    if (!melhor || custo < melhor.custo) melhor = { s, custo };
  }
  return melhor ? melhor.s : simplifica([p1, a, { x: a.x, y: b.y }, b, p2]);
}

/**
 * Os elementos que a rota de um fluxo deve contornar: todos, menos as
 * interfaces que envolvem uma das pontas (o fluxo corre dentro delas).
 * @param {Diagrama} d @param {Fluxo} f @param {Map<string, Caixa>} caixas @param {Map<string, Elemento>} idx
 * @returns {Obstaculo[]}
 */
export function obstaculosDoFluxo(d, f, caixas, idx) {
  /** @type {Obstaculo[]} */
  const lista = [];
  for (const e of d.elementos) {
    if (e.id !== f.de.elemento && contem(d, e.id, f.de.elemento, idx)) continue;
    if (e.id !== f.para.elemento && contem(d, e.id, f.para.elemento, idx)) continue;
    // A interface vista de dentro também não é obstáculo: o fluxo chega à borda por dentro.
    if (e.id === f.de.elemento && contem(d, e.id, f.para.elemento, idx)) continue;
    if (e.id === f.para.elemento && contem(d, e.id, f.de.elemento, idx)) continue;
    const papel = e.id === f.de.elemento ? 'origem' : e.id === f.para.elemento ? 'destino' : 'livre';
    lista.push({ caixa: /** @type {Caixa} */ (caixas.get(e.id)), papel });
  }
  // As legendas também ficam no caminho, mesmo as das interfaces por onde o fluxo corre.
  for (const e of d.elementos) {
    const leg = caixaDaLegenda(d, e, caixas, idx);
    if (leg) lista.push({ caixa: leg, papel: 'livre' });
  }
  return lista;
}

/**
 * A rota de um fluxo, em coordenadas do diagrama.
 * @param {Diagrama} d @param {Fluxo} f
 * @param {Map<string, Caixa>} [caixas] @param {Map<string, Elemento>} [idx]
 */
export function rotaDoFluxo(d, f, caixas = caixasAbsolutas(d), idx = indexar(d)) {
  const s = porta(d, caixas, idx, f.de, f.para, 'de');
  const c = porta(d, caixas, idx, f.para, f.de, 'para');
  return rota(s.ponto, s.direcao, c.ponto, c.direcao, obstaculosDoFluxo(d, f, caixas, idx));
}

/**
 * Caixa que envolve uma lista de caixas e pontos.
 * @param {Array<Caixa|Ponto>} coisas @returns {Caixa}
 */
export function envolve(coisas) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of coisas) {
    const w = 'w' in c ? c.w : 0, h = 'h' in c ? c.h : 0;
    x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y);
    x1 = Math.max(x1, c.x + w); y1 = Math.max(y1, c.y + h);
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
