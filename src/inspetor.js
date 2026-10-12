// @ts-check
/**
 * Inspetor: mostra a estrutura que o documento guarda sobre o que está
 * selecionado (registro, interface, objetos, lados, cor do fluxo e o porquê)
 * e deixa editar os nomes, o texto, os lados e o rótulo dos fluxos.
 *
 * Não guarda estado: recebe o diagrama e a seleção, preenche o painel, e
 * chama `alterar` quando um campo muda.
 */
import {
  ENTRADA_EM_VIRTUAL, LADOS, NOME_DO_TIPO, POR_ONDE, SAIDA_DE_VIRTUAL, corDoFluxo, filhos, indexar, temDestinatario,
} from './modelo.js';
import { NOME_DA_COR } from './notacao.js';

/** @typedef {import('./modelo.js').Diagrama} Diagrama */
/** @typedef {import('./modelo.js').Elemento} Elemento */
/** @typedef {import('./modelo.js').Fluxo} Fluxo */
/** @typedef {import('./modelo.js').Ponta} Ponta */
/** @typedef {import('./modelo.js').Registro} Registro */

const FORMA = {
  estatico: 'elipse vermelha',
  virtual: 'retângulo azul de cantos arredondados',
  mecanico: 'retângulo preto',
  decisao: 'losango',
  juncao: 'ponto preto',
  anotacao: 'texto',
};

/** Que campos de nome cada tipo tem, e para quê. */
const CAMPOS = /** @type {Record<string, {campo: 'legenda'|'rotulo'|'texto', nome: string, dica: string, linhas: number}[]>} */ ({
  estatico: [
    { campo: 'rotulo', nome: 'rótulo', dica: 'nome que integra o objeto (x, x-1, n)', linhas: 2 },
    { campo: 'legenda', nome: 'legenda', dica: 'nome só para quem lê, no canto', linhas: 1 },
  ],
  virtual: [
    { campo: 'legenda', nome: 'legenda', dica: 'nome da máquina, só para quem lê (Fatorial)', linhas: 1 },
    { campo: 'rotulo', nome: 'rótulo', dica: 'nome que integra o objeto, no centro', linhas: 2 },
  ],
  mecanico: [
    { campo: 'rotulo', nome: 'rótulo', dica: 'operador ou constante (-1, *)', linhas: 2 },
    { campo: 'legenda', nome: 'legenda', dica: 'nome só para quem lê (M)', linhas: 1 },
  ],
  decisao: [{ campo: 'rotulo', nome: 'rótulo', dica: '? ou =1', linhas: 1 }],
  juncao: [],
  anotacao: [{ campo: 'texto', nome: 'texto', dica: 'texto para quem lê, como (x>1)', linhas: 2 }],
});

/**
 * @typedef {object} Acoes
 * @property {(id: string, campos: Record<string, unknown>) => void} alterar
 */

/**
 * @param {HTMLElement} painel @param {Diagrama} d @param {string[]} selecao @param {Acoes} acoes
 */
export function mostrarInspetor(painel, d, selecao, acoes) {
  const idx = indexar(d);

  /** @param {string} id */
  const nome = (id) => {
    const e = idx.get(id);
    if (!e) return id;
    const n = e.legenda || e.rotulo || e.texto;
    return n ? `${n.replace(/\n/g, '')} (${NOME_DO_TIPO[e.tipo]})` : `${NOME_DO_TIPO[e.tipo]} sem nome [${id}]`;
  };

  /** @param {Ponta} p @param {'entra'|'sai'} sentido */
  const lado = (p, sentido) => {
    const e = idx.get(p.elemento);
    const base = `${sentido} ${POR_ONDE[p.lado]}`;
    const como = e?.tipo !== 'virtual' ? undefined
      : sentido === 'entra' ? ENTRADA_EM_VIRTUAL[p.lado] : SAIDA_DE_VIRTUAL[p.lado];
    return como ? `${base}, ${como}` : base;
  };

  if (!selecao.length) {
    painel.innerHTML = `<p class="dica">Clique num elemento ou num fluxo para ver a estrutura que o documento
      guarda sobre ele e editar os seus nomes. Para criar, escolha um tipo na paleta e clique no desenho.
      Para ligar, arraste de um dos pontos que aparecem nos lados de um elemento até outro elemento.</p>`;
    return;
  }
  if (selecao.length > 1) {
    painel.innerHTML = `<h2>${selecao.length} selecionados</h2>
      <p class="dica">${selecao.map((id) => esc(idx.has(id) ? nome(id) : `fluxo ${id}`)).join('<br>')}</p>`;
    return;
  }
  const id = selecao[0];
  const e = idx.get(id);
  const f = e ? undefined : d.fluxos.find((x) => x.id === id);
  painel.replaceChildren();
  if (e) descreveElemento(e);
  else if (f) descreveFluxo(f);

  /** @param {string} tag @param {Record<string, string>} [attrs] @param {string} [texto] */
  function cria(tag, attrs = {}, texto) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  /** Lista de definições com a estrutura. @param {[string, string][]} itens */
  function estrutura(itens) {
    const dl = cria('dl');
    for (const [k, v] of itens) {
      dl.append(cria('dt', {}, k));
      const dd = cria('dd');
      dd.innerHTML = v;
      dl.append(dd);
    }
    return dl;
  }

  /** @param {Elemento} e */
  function descreveElemento(e) {
    painel.append(cria('h2', {}, NOME_DO_TIPO[e.tipo]), cria('p', { class: 'forma' }, FORMA[e.tipo]));
    const form = cria('form', { class: 'campos', 'data-elemento': e.id });
    form.addEventListener('submit', (ev) => ev.preventDefault());
    for (const c of CAMPOS[e.tipo] ?? []) {
      const rotulo = cria('label');
      rotulo.append(cria('span', {}, c.nome));
      const entrada = /** @type {HTMLInputElement|HTMLTextAreaElement} */ (c.linhas > 1
        ? cria('textarea', { rows: String(c.linhas), name: c.campo })
        : cria('input', { type: 'text', name: c.campo }));
      entrada.value = e[c.campo] ?? '';
      entrada.title = c.dica;
      entrada.placeholder = c.dica;
      entrada.addEventListener('change', () => acoes.alterar(e.id, { [c.campo]: entrada.value }));
      rotulo.append(entrada);
      form.append(rotulo);
    }
    if (form.childElementCount) painel.append(form);

    /** @type {[string, string][]} */
    const itens = [];
    if (e.pai) itens.push(['interface', `${esc(nome(e.pai))}; este elemento é objeto dentro dela`]);
    const objs = filhos(d, e.id);
    if (objs.length) itens.push(['objetos', objs.map((o) => esc(nome(o.id))).join('<br>')]);
    const chegam = d.fluxos.filter((g) => g.para.elemento === e.id);
    const saem = d.fluxos.filter((g) => g.de.elemento === e.id);
    if (chegam.length) itens.push(['fluxos que chegam', chegam.map((g) => `de ${esc(nome(g.de.elemento))}; ${lado(g.para, 'entra')}`).join('<br>')]);
    if (saem.length) itens.push(['fluxos que saem', saem.map((g) => `para ${esc(nome(g.para.elemento))}; ${lado(g.de, 'sai')}`).join('<br>')]);
    itens.push(['id', `<code>${esc(e.id)}</code>`]);
    painel.append(estrutura(itens));
  }

  /** @param {Fluxo} f */
  function descreveFluxo(f) {
    const { registro, motivo } = corDoFluxo(d, f, idx);
    painel.append(cria('h2', {}, 'fluxo'));
    const form = cria('form', { class: 'campos', 'data-fluxo': f.id });
    form.addEventListener('submit', (ev) => ev.preventDefault());

    /** @param {string} rotulo @param {string} nomeDoCampo @param {[string, string][]} opcoes @param {string} valor @param {(v: string) => void} muda */
    const escolha = (rotulo, nomeDoCampo, opcoes, valor, muda) => {
      const l = cria('label');
      l.append(cria('span', {}, rotulo));
      const s = /** @type {HTMLSelectElement} */ (cria('select', { name: nomeDoCampo }));
      for (const [v, t] of opcoes) s.append(cria('option', { value: v }, t));
      s.value = valor;
      s.addEventListener('change', () => muda(s.value));
      l.append(s);
      form.append(l);
    };
    const lados = LADOS.map((l) => /** @type {[string, string]} */ ([l, POR_ONDE[l].replace(/^p\w+ /, '')]));
    escolha(`sai de ${nome(f.de.elemento)}`, 'de', lados, f.de.lado,
      (v) => acoes.alterar(f.id, { de: { ...f.de, lado: v } }));
    escolha(`chega a ${nome(f.para.elemento)}`, 'para', lados, f.para.lado,
      (v) => acoes.alterar(f.id, { para: { ...f.para, lado: v } }));
    if (idx.get(f.de.elemento)?.tipo === 'decisao' || f.rotulo) {
      escolha('rótulo', 'rotulo', [['', '(nenhum)'], ['s', 's'], ['n', 'n']], f.rotulo ?? '',
        (v) => acoes.alterar(f.id, { rotulo: v }));
    }
    if (!temDestinatario(d, f, idx)) {
      const cores = /** @type {Registro[]} */ (['mecanico', 'virtual', 'estatico']).map((r) =>
        /** @type {[string, string]} */ ([r, NOME_DA_COR[r]]));
      escolha('cor (sem destinatário, é escolha)', 'registro', cores, f.registro ?? 'mecanico',
        (v) => acoes.alterar(f.id, { registro: v === 'mecanico' ? undefined : v }));
    }
    painel.append(form);
    painel.append(estrutura([
      ['de', `${esc(nome(f.de.elemento))}; ${lado(f.de, 'sai')}`],
      ['para', `${esc(nome(f.para.elemento))}; ${lado(f.para, 'entra')}`],
      ['cor', `${NOME_DA_COR[registro]} (${NOME_DO_TIPO[registro]}): ${esc(motivo)}`],
      ['id', `<code>${esc(f.id)}</code>`],
    ]));
  }
}

/** Escapa para HTML; quebras de linha do desenho viram <br>. @param {string} s */
function esc(s) {
  return s
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
    .replace(/\n/g, '<br>');
}
