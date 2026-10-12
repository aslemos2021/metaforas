// @ts-check
/**
 * Edição do documento, sem tela: criar, mover, redimensionar, aninhar,
 * ligar, alterar e apagar elementos e fluxos, e cuidar dos diagramas.
 *
 * Cada operação recebe um documento e devolve outro, novo; o que entrou não
 * muda. O documento devolvido é conferido (`validar`): uma operação que o
 * deixaria inválido lança um Error com a explicação, e nada muda. Os campos
 * que o editor não conhece atravessam as operações sem se perder.
 *
 * As posições que as operações recebem são do diagrama (absolutas); o
 * documento guarda posições relativas à interface, e a conversão é daqui.
 */
import {
  LADOS, NOME_DO_TIPO, TAMANHO_PADRAO, caixasAbsolutas, contem, indexar, podeConter, validar,
} from './modelo.js';

/** @typedef {import('./modelo.js').Documento} Documento */
/** @typedef {import('./modelo.js').Diagrama} Diagrama */
/** @typedef {import('./modelo.js').Elemento} Elemento */
/** @typedef {import('./modelo.js').Fluxo} Fluxo */
/** @typedef {import('./modelo.js').Ponta} Ponta */
/** @typedef {import('./modelo.js').Tipo} Tipo */
/** @typedef {import('./modelo.js').Caixa} Caixa */
/** @typedef {{x: number, y: number}} Ponto */

/** Menor tamanho a que se pode reduzir um elemento. */
export const TAMANHO_MINIMO = 12;

/** Prefixo dos ids novos, por tipo. */
const PREFIXO = /** @type {Record<Tipo|'fluxo', string>} */ ({
  estatico: 'e', virtual: 'v', mecanico: 'm', decisao: 'd', juncao: 'j', anotacao: 'a', fluxo: 'f',
});

/**
 * Copia o documento, acha o diagrama, aplica a mudança e confere o resultado.
 * @template T
 * @param {Documento} doc @param {string} did
 * @param {(d: Diagrama, novo: Documento) => T} muda
 * @returns {{documento: Documento, resultado: T}}
 */
function editar(doc, did, muda) {
  const novo = structuredClone(doc);
  const d = novo.diagramas.find((x) => x.id === did);
  if (!d) throw new Error(`Não há diagrama "${did}".`);
  const resultado = muda(d, novo);
  confere(novo);
  return { documento: novo, resultado };
}

/** @param {Documento} doc */
function confere(doc) {
  const { erros } = validar(doc);
  if (erros.length) throw new Error(erros.join('; '));
}

/** @param {Diagrama} d @param {string} id */
function pega(d, id) {
  const e = d.elementos.find((x) => x.id === id);
  if (!e) throw new Error(`Não há elemento "${id}".`);
  return e;
}

/**
 * Um id que ainda não existe no diagrama (elementos e fluxos juntos).
 * @param {Diagrama} d @param {Tipo|'fluxo'} tipo
 */
export function novoId(d, tipo) {
  const usados = new Set([...d.elementos.map((e) => e.id), ...d.fluxos.map((f) => f.id)]);
  const p = PREFIXO[tipo];
  let n = 1;
  while (usados.has(`${p}${n}`)) n++;
  return `${p}${n}`;
}

/** @param {number} v */
const arred = (v) => Math.round(v);

/**
 * A interface mais interna que contém a caixa inteira, entre os registros
 * do diagrama. `fora` são ids que não contam (o próprio elemento que se
 * arrasta, e o que está dentro dele).
 * @param {Diagrama} d @param {Caixa} c @param {Iterable<string>} [fora]
 * @returns {string|undefined}
 */
export function interfaceQueContem(d, c, fora = []) {
  const excluidos = new Set(fora);
  const idx = indexar(d);
  const caixas = caixasAbsolutas(d);
  /** @type {string|undefined} */
  let melhor;
  let profundidade = -1;
  for (const e of d.elementos) {
    if (!podeConter(e.tipo) || excluidos.has(e.id)) continue;
    if ([...excluidos].some((x) => contem(d, x, e.id, idx))) continue;
    const ce = /** @type {Caixa} */ (caixas.get(e.id));
    const dentro = c.x >= ce.x && c.y >= ce.y && c.x + c.w <= ce.x + ce.w && c.y + c.h <= ce.y + ce.h;
    if (!dentro) continue;
    let p = 0;
    for (let a = e; a.pai; a = /** @type {Elemento} */ (idx.get(a.pai))) p++;
    if (p > profundidade) {
      melhor = e.id;
      profundidade = p;
    }
  }
  return melhor;
}

/**
 * Cria um elemento. A posição é do diagrama; `pai`, se vier, é a interface.
 * @param {Documento} doc @param {string} did
 * @param {{tipo: Tipo, x: number, y: number, w?: number, h?: number, pai?: string,
 *   legenda?: string, rotulo?: string, texto?: string}} dados
 * @returns {{documento: Documento, id: string}}
 */
export function criarElemento(doc, did, dados) {
  const { documento, resultado } = editar(doc, did, (d) => {
    if (!(dados.tipo in TAMANHO_PADRAO)) throw new Error(`Tipo desconhecido "${dados.tipo}".`);
    const id = novoId(d, dados.tipo);
    /** @type {Elemento} */
    const e = { id, tipo: dados.tipo, x: arred(dados.x), y: arred(dados.y) };
    if (dados.pai) {
      const pai = pega(d, dados.pai);
      if (!podeConter(pai.tipo)) throw new Error(`${NOME_DO_TIPO[pai.tipo]} não pode servir de interface.`);
      const cp = /** @type {Caixa} */ (caixasAbsolutas(d).get(pai.id));
      e.pai = pai.id;
      e.x = arred(dados.x - cp.x);
      e.y = arred(dados.y - cp.y);
    }
    if (dados.w !== undefined) e.w = arred(dados.w);
    if (dados.h !== undefined) e.h = arred(dados.h);
    if (dados.tipo === 'anotacao') e.texto = dados.texto ?? 'texto';
    for (const k of /** @type {const} */ (['legenda', 'rotulo', 'texto'])) if (dados[k]) e[k] = dados[k];
    d.elementos.push(e);
    return id;
  });
  return { documento, id: resultado };
}

/**
 * Move elementos. Os objetos dentro de uma interface vão com ela; um
 * elemento cuja interface também se move não se move duas vezes.
 * @param {Documento} doc @param {string} did @param {string[]} ids
 * @param {number} dx @param {number} dy
 */
export function mover(doc, did, ids, dx, dy) {
  return editar(doc, did, (d) => {
    const idx = indexar(d);
    const todos = new Set(ids);
    for (const id of todos) {
      const e = pega(d, id);
      if ([...todos].some((o) => o !== id && contem(d, o, id, idx))) continue;
      e.x = arred(e.x + dx);
      e.y = arred(e.y + dy);
    }
  }).documento;
}

/**
 * Dá a um elemento uma nova caixa (do diagrama). Os objetos dentro dele
 * ficam onde estavam no desenho.
 * @param {Documento} doc @param {string} did @param {string} id @param {Caixa} caixa
 */
export function redimensionar(doc, did, id, caixa) {
  return editar(doc, did, (d) => {
    const e = pega(d, id);
    if (e.tipo === 'juncao') throw new Error('A junção não muda de tamanho.');
    const antes = /** @type {Caixa} */ (caixasAbsolutas(d).get(id));
    const w = Math.max(TAMANHO_MINIMO, arred(caixa.w));
    const h = Math.max(TAMANHO_MINIMO, arred(caixa.h));
    const dx = arred(caixa.x) - antes.x;
    const dy = arred(caixa.y) - antes.y;
    e.x = arred(e.x + dx);
    e.y = arred(e.y + dy);
    e.w = w;
    e.h = h;
    for (const f of d.elementos) {
      if (f.pai !== id) continue;
      f.x = arred(f.x - dx);
      f.y = arred(f.y - dy);
    }
  }).documento;
}

/**
 * Põe um elemento dentro de outra interface, ou fora de todas (`pai`
 * indefinido). O elemento fica onde estava no desenho.
 * @param {Documento} doc @param {string} did @param {string} id @param {string|undefined} pai
 */
export function aninhar(doc, did, id, pai) {
  return editar(doc, did, (d) => {
    const e = pega(d, id);
    if (e.pai === pai) return;
    const caixas = caixasAbsolutas(d);
    const c = /** @type {Caixa} */ (caixas.get(id));
    if (pai === undefined) {
      delete e.pai;
      e.x = c.x;
      e.y = c.y;
      return;
    }
    const p = pega(d, pai);
    if (!podeConter(p.tipo)) throw new Error(`${NOME_DO_TIPO[p.tipo]} não pode servir de interface.`);
    if (pai === id || contem(d, id, pai)) throw new Error('Um elemento não pode ficar dentro de si mesmo.');
    const cp = /** @type {Caixa} */ (caixas.get(pai));
    e.pai = pai;
    e.x = c.x - cp.x;
    e.y = c.y - cp.y;
  }).documento;
}

/**
 * Liga dois elementos por um fluxo. Na saída de uma decisão, o fluxo ganha
 * o rótulo que ainda falta (s, depois n).
 * @param {Documento} doc @param {string} did @param {Ponta} de @param {Ponta} para
 * @returns {{documento: Documento, id: string}}
 */
export function ligar(doc, did, de, para) {
  const { documento, resultado } = editar(doc, did, (d) => {
    for (const p of [de, para]) {
      pega(d, p.elemento);
      if (!LADOS.includes(p.lado)) throw new Error(`Lado desconhecido "${p.lado}".`);
    }
    const repetido = d.fluxos.some((f) =>
      f.de.elemento === de.elemento && f.de.lado === de.lado && f.para.elemento === para.elemento && f.para.lado === para.lado);
    if (repetido) throw new Error('Esse fluxo já existe.');
    const id = novoId(d, 'fluxo');
    /** @type {Fluxo} */
    const f = { id, de: { elemento: de.elemento, lado: de.lado }, para: { elemento: para.elemento, lado: para.lado } };
    if (pega(d, de.elemento).tipo === 'decisao') {
      const usados = new Set(d.fluxos.filter((g) => g.de.elemento === de.elemento).map((g) => g.rotulo));
      const falta = ['s', 'n'].find((r) => !usados.has(r));
      if (falta) f.rotulo = falta;
    }
    d.fluxos.push(f);
    return id;
  });
  return { documento, id: resultado };
}

/**
 * Muda campos de um elemento ou de um fluxo. Um valor `undefined` ou texto
 * vazio apaga o campo. Não serve para id, tipo, pai e posição, que têm as
 * suas operações.
 * @param {Documento} doc @param {string} did @param {string} id
 * @param {Record<string, unknown>} campos
 */
export function alterar(doc, did, id, campos) {
  return editar(doc, did, (d) => {
    /** @type {Record<string, unknown>|undefined} */
    const alvo = d.elementos.find((e) => e.id === id) ?? d.fluxos.find((f) => f.id === id);
    if (!alvo) throw new Error(`Não há "${id}" no diagrama.`);
    for (const [k, v] of Object.entries(campos)) {
      if (['id', 'tipo', 'pai', 'x', 'y'].includes(k)) throw new Error(`"${k}" não se muda por aqui.`);
      if (v === undefined || v === '') delete alvo[k];
      else alvo[k] = structuredClone(v);
    }
  }).documento;
}

/**
 * Apaga elementos e fluxos. Com um elemento vão o que está dentro dele e os
 * fluxos que o tocam.
 * @param {Documento} doc @param {string} did @param {string[]} ids
 */
export function apagar(doc, did, ids) {
  return editar(doc, did, (d) => {
    const idx = indexar(d);
    const elementos = new Set(ids.filter((id) => idx.has(id)));
    for (const e of d.elementos) {
      if ([...elementos].some((a) => contem(d, a, e.id, idx))) elementos.add(e.id);
    }
    const fluxos = new Set(ids.filter((id) => !idx.has(id)));
    d.elementos = d.elementos.filter((e) => !elementos.has(e.id));
    d.fluxos = d.fluxos.filter((f) =>
      !fluxos.has(f.id) && !elementos.has(f.de.elemento) && !elementos.has(f.para.elemento));
  }).documento;
}

// Diagramas

/** @param {Documento} doc */
function novoIdDeDiagrama(doc) {
  const usados = new Set(doc.diagramas.map((d) => d.id));
  let n = doc.diagramas.length + 1;
  while (usados.has(`d${n}`)) n++;
  return `d${n}`;
}

/** @param {Documento} doc @param {string} did */
function indiceDoDiagrama(doc, did) {
  const i = doc.diagramas.findIndex((d) => d.id === did);
  if (i < 0) throw new Error(`Não há diagrama "${did}".`);
  return i;
}

/**
 * Um diagrama vazio, depois de `depoisDe` (ou no fim).
 * @param {Documento} doc @param {string} [depoisDe]
 * @returns {{documento: Documento, id: string}}
 */
export function criarDiagrama(doc, depoisDe) {
  const novo = structuredClone(doc);
  const id = novoIdDeDiagrama(novo);
  const i = depoisDe ? indiceDoDiagrama(novo, depoisDe) + 1 : novo.diagramas.length;
  novo.diagramas.splice(i, 0, { id, titulo: `Diagrama ${novo.diagramas.length + 1}`, elementos: [], fluxos: [] });
  confere(novo);
  return { documento: novo, id };
}

/**
 * Uma cópia do diagrama, logo depois dele. Serve para desenhar o quadro
 * seguinte de uma sequência a partir do anterior.
 * @param {Documento} doc @param {string} did
 * @returns {{documento: Documento, id: string}}
 */
export function duplicarDiagrama(doc, did) {
  const novo = structuredClone(doc);
  const i = indiceDoDiagrama(novo, did);
  const copia = structuredClone(novo.diagramas[i]);
  copia.id = novoIdDeDiagrama(novo);
  copia.titulo = `${copia.titulo ?? did} (cópia)`;
  novo.diagramas.splice(i + 1, 0, copia);
  confere(novo);
  return { documento: novo, id: copia.id };
}

/**
 * Muda o título (ou outros campos) de um diagrama.
 * @param {Documento} doc @param {string} did @param {Record<string, unknown>} campos
 */
export function alterarDiagrama(doc, did, campos) {
  const novo = structuredClone(doc);
  /** @type {Record<string, unknown>} */
  const d = novo.diagramas[indiceDoDiagrama(novo, did)];
  for (const [k, v] of Object.entries(campos)) {
    if (['id', 'elementos', 'fluxos'].includes(k)) throw new Error(`"${k}" não se muda por aqui.`);
    if (v === undefined || v === '') delete d[k];
    else d[k] = structuredClone(v);
  }
  confere(novo);
  return novo;
}

/**
 * Leva um diagrama para outra posição na lista.
 * @param {Documento} doc @param {string} did @param {number} posicao
 */
export function reordenarDiagrama(doc, did, posicao) {
  const novo = structuredClone(doc);
  const i = indiceDoDiagrama(novo, did);
  const [d] = novo.diagramas.splice(i, 1);
  novo.diagramas.splice(Math.max(0, Math.min(posicao, novo.diagramas.length)), 0, d);
  return novo;
}

/**
 * Apaga um diagrama. O documento fica com pelo menos um.
 * @param {Documento} doc @param {string} did
 */
export function apagarDiagrama(doc, did) {
  const novo = structuredClone(doc);
  novo.diagramas.splice(indiceDoDiagrama(novo, did), 1);
  if (!novo.diagramas.length) novo.diagramas.push({ id: 'd1', titulo: 'Diagrama 1', elementos: [], fluxos: [] });
  return novo;
}

/**
 * Histórico para desfazer e refazer. Guarda documentos inteiros: são
 * pequenos, e assim cada passo é exatamente o que estava na tela.
 */
export class Historico {
  /** @param {Documento} doc @param {number} [limite] */
  constructor(doc, limite = 200) {
    /** @type {Documento[]} */ this.antes = [];
    /** @type {Documento[]} */ this.depois = [];
    this.atual = doc;
    this.limite = limite;
  }

  /** Um passo novo; o que havia para refazer se perde. @param {Documento} doc */
  registrar(doc) {
    if (doc === this.atual) return;
    this.antes.push(this.atual);
    if (this.antes.length > this.limite) this.antes.shift();
    this.depois = [];
    this.atual = doc;
  }

  get podeDesfazer() { return this.antes.length > 0; }
  get podeRefazer() { return this.depois.length > 0; }

  desfazer() {
    const doc = this.antes.pop();
    if (doc) {
      this.depois.push(this.atual);
      this.atual = doc;
    }
    return this.atual;
  }

  refazer() {
    const doc = this.depois.pop();
    if (doc) {
      this.antes.push(this.atual);
      this.atual = doc;
    }
    return this.atual;
  }
}
