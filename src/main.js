// @ts-check
/**
 * Liga as partes na página: o documento e o seu histórico, a tela, o
 * inspetor, as barras, a paleta e o teclado. Todo passo de edição passa por
 * `aplicar`, que o registra no histórico, guarda no navegador e redesenha.
 */
import { NOME_DO_TIPO, VERSAO, abrir, indexar, novoDocumento, validar } from './modelo.js';
import {
  Historico, alterar, alterarDiagrama, apagar, apagarDiagrama, criarDiagrama, duplicarDiagrama, mover,
  reordenarDiagrama,
} from './edicao.js';
import { baixar, exportarSVG, guardarNoNavegador, lerArquivo, lerDoNavegador, nomeDeArquivo, paraJSON } from './arquivo.js';
import { ligarTela } from './tela.js';
import { mostrarInspetor } from './inspetor.js';

/** @typedef {import('./modelo.js').Documento} Documento */
/** @typedef {import('./modelo.js').Tipo} Tipo */

const EXEMPLO = 'exemplos/artigo.json';

/** @param {string} id */
const pega = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} id */
const botao = (id) => /** @type {HTMLButtonElement} */ (pega(id));
/** @param {string} id */
const entrada = (id) => /** @type {HTMLInputElement} */ (pega(id));
const seletor = /** @type {HTMLSelectElement} */ (pega('diagramas'));
const painel = pega('inspetor');
const estado = pega('estado');
const legenda = pega('legenda-do-diagrama');

/** @type {Historico} */
let historico = new Historico(novoDocumento());
let did = '';
/** @type {string[]} */
let selecao = [];
/** @type {Tipo|null} */
let modo = null;
let aviso = '';
let guardado = true;

const doc = () => historico.atual;
const diagrama = () => doc().diagramas.find((d) => d.id === did) ?? doc().diagramas[0];

const tela = ligarTela(pega('tela'), {
  documento: doc,
  diagramaId: () => did,
  selecao: () => selecao,
  selecionar: (ids) => {
    selecao = ids;
    desenhar();
  },
  aplicar,
  modo: () => modo,
  fimDoModo: () => escolherModo(null),
  avisar,
  editarNome: (id) => {
    selecao = [id];
    desenhar();
    /** @type {HTMLElement|null} */ (painel.querySelector('input, textarea'))?.focus();
  },
});

/**
 * Um passo de edição: entra no histórico, vai para o navegador, e a tela se refaz.
 * @param {Documento} novo @param {string[]} [novaSelecao]
 */
function aplicar(novo, novaSelecao) {
  historico.registrar(novo);
  if (novaSelecao) selecao = novaSelecao;
  depoisDeMudar();
}

function depoisDeMudar() {
  if (!doc().diagramas.some((d) => d.id === did)) did = doc().diagramas[0].id;
  const d = diagrama();
  const ids = new Set([...d.elementos.map((e) => e.id), ...d.fluxos.map((f) => f.id)]);
  selecao = selecao.filter((id) => ids.has(id));
  guardado = guardarNoNavegador(doc());
  aviso = '';
  desenhar();
}

/** @param {string} mensagem */
function avisar(mensagem) {
  aviso = mensagem;
  mostrarEstado();
}

/** @param {() => Documento} operacao */
function tenta(operacao) {
  try {
    aplicar(operacao());
  } catch (e) {
    avisar(/** @type {Error} */ (e).message);
  }
}

function desenhar() {
  const d = diagrama();
  did = d.id;
  seletor.replaceChildren(...doc().diagramas.map((x, i) => {
    const op = document.createElement('option');
    op.value = x.id;
    op.textContent = x.titulo ? x.titulo.split(':')[0] : `${i + 1}. ${x.id}`;
    return op;
  }));
  seletor.value = did;
  entrada('titulo-do-documento').value = doc().titulo ?? '';
  entrada('titulo-do-diagrama').value = d.titulo ?? '';
  legenda.textContent = d.titulo ?? '';
  const i = doc().diagramas.indexOf(d);
  botao('diagrama-antes').disabled = i === 0;
  botao('diagrama-depois').disabled = i === doc().diagramas.length - 1;
  botao('desfazer').disabled = !historico.podeDesfazer;
  botao('refazer').disabled = !historico.podeRefazer;
  botao('apagar').disabled = !selecao.length;
  for (const b of document.querySelectorAll('.paleta [data-tipo]')) {
    b.setAttribute('aria-pressed', String(b.getAttribute('data-tipo') === modo));
  }
  if (location.hash !== `#${did}`) history.replaceState(null, '', `#${did}`);
  tela.mostrar();
  mostrarInspetor(painel, d, selecao, {
    alterar: (id, campos) => tenta(() => alterar(doc(), did, id, campos)),
  });
  mostrarEstado();
}

function mostrarEstado() {
  const { avisos } = validar(doc());
  const partes = [
    `${doc().diagramas.length} diagrama(s)`,
    `formato ${doc().formato}, versão ${VERSAO}`,
    guardado ? 'guardado neste navegador' : 'não consegui guardar no navegador: salve o documento',
    avisos.length ? `${avisos.length} aviso(s): ${avisos.join('; ')}` : 'sem erros nem avisos',
  ];
  if (modo) partes.unshift(`clique no desenho para criar: ${NOME_DO_TIPO[modo]} (Esc cancela)`);
  estado.textContent = partes.join(' · ');
  estado.classList.toggle('erro', !!aviso);
  if (aviso) estado.textContent = `${aviso} · ${estado.textContent}`;
}

/** @param {Tipo|null} tipo */
function escolherModo(tipo) {
  modo = tipo;
  desenhar();
}

/**
 * Troca o documento inteiro (novo, aberto, exemplos). Entra no histórico
 * como qualquer passo: dá para desfazer.
 * @param {Documento} novo @param {string} [diagramaInicial]
 */
function trocarDocumento(novo, diagramaInicial) {
  did = diagramaInicial && novo.diagramas.some((d) => d.id === diagramaInicial) ? diagramaInicial : novo.diagramas[0].id;
  selecao = [];
  aplicar(novo);
}

/** @param {string} texto @param {string} [diagramaInicial] */
function abrirTexto(texto, diagramaInicial) {
  const r = lerArquivo(texto);
  if (!r.documento) {
    avisar(`Não consegui abrir: ${r.erros.join('; ')}`);
    return false;
  }
  trocarDocumento(r.documento, r.diagrama ?? diagramaInicial);
  return true;
}

async function carregarExemplo() {
  const resposta = await fetch(EXEMPLO);
  if (!resposta.ok) throw new Error(`${resposta.status} ${resposta.statusText}`);
  return resposta.text();
}

// Barras

botao('novo').addEventListener('click', () => trocarDocumento(novoDocumento()));
botao('abrir').addEventListener('click', () => entrada('arquivo').click());
entrada('arquivo').addEventListener('change', async () => {
  const arquivo = entrada('arquivo').files?.[0];
  if (arquivo) abrirTexto(await arquivo.text());
  entrada('arquivo').value = '';
});
botao('salvar').addEventListener('click', () => {
  baixar(`${nomeDeArquivo(doc().titulo, 'metaforas')}.json`, paraJSON(doc()), 'application/json');
});
botao('exportar').addEventListener('click', () => {
  baixar(`${nomeDeArquivo(diagrama().titulo, did)}.svg`, exportarSVG(doc(), did), 'image/svg+xml');
});
botao('exemplos').addEventListener('click', async () => {
  try {
    abrirTexto(await carregarExemplo(), location.hash.slice(1));
  } catch (e) {
    avisar(`Não consegui carregar ${EXEMPLO}: ${/** @type {Error} */ (e).message}`);
  }
});
botao('desfazer').addEventListener('click', () => {
  historico.desfazer();
  depoisDeMudar();
});
botao('refazer').addEventListener('click', () => {
  historico.refazer();
  depoisDeMudar();
});
botao('apagar').addEventListener('click', apagarSelecao);
entrada('titulo-do-documento').addEventListener('change', () => {
  const novo = structuredClone(doc());
  const v = entrada('titulo-do-documento').value;
  if (v) novo.titulo = v;
  else delete novo.titulo;
  aplicar(novo);
});

seletor.addEventListener('change', () => mostrarDiagrama(seletor.value));
addEventListener('hashchange', () => mostrarDiagrama(location.hash.slice(1)));
botao('diagrama-novo').addEventListener('click', () => {
  const r = criarDiagrama(doc(), did);
  did = r.id;
  selecao = [];
  aplicar(r.documento);
});
botao('diagrama-duplicar').addEventListener('click', () => {
  const r = duplicarDiagrama(doc(), did);
  did = r.id;
  selecao = [];
  aplicar(r.documento);
});
botao('diagrama-antes').addEventListener('click', () =>
  tenta(() => reordenarDiagrama(doc(), did, doc().diagramas.indexOf(diagrama()) - 1)));
botao('diagrama-depois').addEventListener('click', () =>
  tenta(() => reordenarDiagrama(doc(), did, doc().diagramas.indexOf(diagrama()) + 1)));
botao('diagrama-apagar').addEventListener('click', () => {
  const i = doc().diagramas.indexOf(diagrama());
  const novo = apagarDiagrama(doc(), did);
  did = novo.diagramas[Math.max(0, i - 1)].id;
  selecao = [];
  aplicar(novo);
});
entrada('titulo-do-diagrama').addEventListener('change', () =>
  tenta(() => alterarDiagrama(doc(), did, { titulo: entrada('titulo-do-diagrama').value })));

for (const b of document.querySelectorAll('.paleta [data-tipo]')) {
  b.addEventListener('click', () => {
    const tipo = /** @type {Tipo} */ (b.getAttribute('data-tipo'));
    escolherModo(modo === tipo ? null : tipo);
  });
}

/** @param {string} id */
function mostrarDiagrama(id) {
  if (id === did || !doc().diagramas.some((d) => d.id === id)) return;
  did = id;
  selecao = [];
  desenhar();
}

function apagarSelecao() {
  if (!selecao.length) return;
  const ids = selecao;
  selecao = [];
  tenta(() => apagar(doc(), did, ids));
}

// Teclado

addEventListener('keydown', (ev) => {
  const alvo = /** @type {HTMLElement} */ (ev.target);
  const digitando = alvo.closest('input, textarea, select, [contenteditable]');
  const ctrl = ev.ctrlKey || ev.metaKey;
  if (ev.key === 'Escape') {
    if (digitando) {
      alvo.blur();
      return;
    }
    if (modo) escolherModo(null);
    else {
      selecao = [];
      desenhar();
    }
    return;
  }
  if (digitando) return;
  if (ctrl && ev.key.toLowerCase() === 'z') {
    ev.preventDefault();
    if (ev.shiftKey) historico.refazer();
    else historico.desfazer();
    depoisDeMudar();
  } else if (ctrl && ev.key.toLowerCase() === 'y') {
    ev.preventDefault();
    historico.refazer();
    depoisDeMudar();
  } else if (ev.key === 'Delete' || ev.key === 'Backspace') {
    ev.preventDefault();
    apagarSelecao();
  } else if (ev.key.startsWith('Arrow') && selecao.length) {
    const idx = indexar(diagrama());
    const ids = selecao.filter((id) => idx.has(id));
    if (!ids.length) return;
    ev.preventDefault();
    const passo = ev.shiftKey ? 10 : 1;
    const dx = ev.key === 'ArrowLeft' ? -passo : ev.key === 'ArrowRight' ? passo : 0;
    const dy = ev.key === 'ArrowUp' ? -passo : ev.key === 'ArrowDown' ? passo : 0;
    tenta(() => mover(doc(), did, ids, dx, dy));
  }
});
addEventListener('resize', () => tela.mostrar());

// Início: o que estava guardado no navegador; senão, as figuras do artigo.

async function iniciar() {
  const guardadoAntes = lerDoNavegador();
  let inicial = guardadoAntes ? abrir(guardadoAntes).documento : null;
  if (!inicial) {
    try {
      const r = abrir(await carregarExemplo());
      if (!r.documento) throw new Error(r.erros.join('; '));
      inicial = r.documento;
    } catch (e) {
      inicial = novoDocumento();
      aviso = `Não consegui carregar ${EXEMPLO}: ${/** @type {Error} */ (e).message}. A página precisa ser servida por HTTP (veja o README).`;
    }
  }
  historico = new Historico(inicial);
  const pedido = location.hash.slice(1);
  did = inicial.diagramas.some((d) => d.id === pedido) ? pedido : inicial.diagramas[0].id;
  const avisoInicial = aviso;
  guardado = guardarNoNavegador(inicial);
  desenhar();
  if (avisoInicial) avisar(avisoInicial);
  document.body.dataset.pronto = 'sim';
}

iniciar();
