// @ts-check
/**
 * O documento do editor: a estrutura da notação de Metáforas.
 *
 * Este módulo não desenha e não conhece a página. Descreve, confere e
 * migra documentos. O formato está explicado em docs/formato.md e a
 * notação em docs/notacao.md.
 */

export const FORMATO = 'metaforas';
export const VERSAO = 2;

/** @typedef {'estatico'|'virtual'|'mecanico'} Registro */
/** @typedef {Registro|'decisao'|'juncao'|'anotacao'} Tipo */
/** @typedef {'topo'|'esquerda'|'baixo'|'direita'} Lado */

/** @type {readonly Registro[]} */
export const REGISTROS = ['estatico', 'virtual', 'mecanico'];
/** @type {readonly Tipo[]} */
export const TIPOS = ['estatico', 'virtual', 'mecanico', 'decisao', 'juncao', 'anotacao'];
/** @type {readonly Lado[]} */
export const LADOS = ['topo', 'esquerda', 'baixo', 'direita'];

/**
 * @typedef {object} Elemento
 * @property {string} id
 * @property {Tipo} tipo
 * @property {string} [pai]      id do elemento que serve de interface a este (aninhamento)
 * @property {number} x          posição relativa ao canto superior esquerdo do pai (ou do diagrama)
 * @property {number} y
 * @property {number} [w]        largura; se faltar, vale o tamanho padrão do tipo
 * @property {number} [h]        altura; idem
 * @property {string} [legenda]  nome que só informa quem lê (Fatorial, M); vai no canto
 * @property {string} [rotulo]   nome que integra o objeto em cena (x, x-1, n, -1, ?); vai no centro
 * @property {string} [texto]    o texto de uma anotação
 */

/**
 * @typedef {object} Ponta
 * @property {string} elemento
 * @property {Lado} lado
 */

/**
 * @typedef {object} Fluxo
 * @property {string} id
 * @property {Ponta} de
 * @property {Ponta} para
 * @property {string} [rotulo]      s ou n, nas saídas de uma decisão
 * @property {Registro} [registro]  cor escolhida, só para o fluxo sem destinatário (ver corDoFluxo)
 */

/**
 * @typedef {object} Diagrama
 * @property {string} id
 * @property {string} [titulo]
 * @property {Elemento[]} elementos
 * @property {Fluxo[]} fluxos
 */

/**
 * @typedef {object} Documento
 * @property {'metaforas'} formato
 * @property {number} versao
 * @property {string} [titulo]
 * @property {string} [descricao]
 * @property {Diagrama[]} diagramas
 */

/** @typedef {{x: number, y: number, w: number, h: number}} Caixa */

/** Tamanho de cada tipo quando o elemento não diz o seu. */
export const TAMANHO_PADRAO = /** @type {Record<Tipo, {w: number, h: number}>} */ ({
  estatico: { w: 70, h: 46 },
  virtual: { w: 200, h: 150 },
  mecanico: { w: 46, h: 40 },
  decisao: { w: 64, h: 64 },
  juncao: { w: 10, h: 10 },
  anotacao: { w: 120, h: 32 },
});

/** Nomes para a interface. */
export const NOME_DO_TIPO = /** @type {Record<Tipo, string>} */ ({
  estatico: 'estático',
  virtual: 'virtual',
  mecanico: 'mecânico',
  decisao: 'decisão',
  juncao: 'junção',
  anotacao: 'anotação',
});

/** Por onde se entra ou se sai, para a interface. */
export const POR_ONDE = /** @type {Record<Lado, string>} */ ({
  topo: 'por cima',
  esquerda: 'pela esquerda',
  baixo: 'por baixo',
  direita: 'pela direita',
});

/**
 * Regra da notação: por onde se entra numa máquina virtual diz como se entra.
 * Por cima, como algoritmo; pela esquerda, como entrada.
 * @type {Partial<Record<Lado, string>>}
 */
export const ENTRADA_EM_VIRTUAL = {
  topo: 'como algoritmo',
  esquerda: 'como entrada',
};

/**
 * O que quer dizer sair de uma máquina virtual por um lado.
 * @type {Partial<Record<Lado, string>>}
 */
export const SAIDA_DE_VIRTUAL = {
  topo: 'o código da máquina, tomado como valor',
};

/** @param {unknown} t @returns {t is Registro} */
export function ehRegistro(t) {
  return REGISTROS.includes(/** @type {Registro} */ (t));
}

/** Só os três registros podem servir de interface (conter outros elementos). */
export const podeConter = ehRegistro;

/** @param {Elemento} e */
export function tamanho(e) {
  const p = TAMANHO_PADRAO[e.tipo] ?? { w: 0, h: 0 };
  return { w: e.w ?? p.w, h: e.h ?? p.h };
}

/** @param {Diagrama} d @returns {Map<string, Elemento>} */
export function indexar(d) {
  return new Map(d.elementos.map((e) => [e.id, e]));
}

/** @param {Diagrama} d @param {string|undefined} id */
export function filhos(d, id) {
  return d.elementos.filter((e) => e.pai === id);
}

/**
 * A cadeia de interfaces de um elemento, do pai até o mais externo.
 * @param {Diagrama} d @param {string} id @param {Map<string, Elemento>} [idx]
 */
export function ancestrais(d, id, idx = indexar(d)) {
  const cadeia = [];
  const vistos = new Set([id]);
  let atual = idx.get(id);
  while (atual?.pai && !vistos.has(atual.pai)) {
    vistos.add(atual.pai);
    atual = idx.get(atual.pai);
    if (!atual) break;
    cadeia.push(atual);
  }
  return cadeia;
}

/** Se `a` é interface (direta ou não) de `b`. */
export function contem(/** @type {Diagrama} */ d, /** @type {string} */ a, /** @type {string} */ b, idx = indexar(d)) {
  return ancestrais(d, b, idx).some((e) => e.id === a);
}

/**
 * Caixa de cada elemento em coordenadas do diagrama.
 * @param {Diagrama} d @returns {Map<string, Caixa>}
 */
export function caixasAbsolutas(d) {
  const idx = indexar(d);
  /** @type {Map<string, Caixa>} */
  const caixas = new Map();
  /** @param {Elemento} e @param {Set<string>} caminho @returns {Caixa} */
  const calcula = (e, caminho) => {
    const pronta = caixas.get(e.id);
    if (pronta) return pronta;
    const { w, h } = tamanho(e);
    let x = e.x;
    let y = e.y;
    const pai = e.pai ? idx.get(e.pai) : undefined;
    if (pai && !caminho.has(pai.id)) {
      caminho.add(e.id);
      const cp = calcula(pai, caminho);
      x += cp.x;
      y += cp.y;
    }
    const c = { x, y, w, h };
    caixas.set(e.id, c);
    return c;
  };
  for (const e of d.elementos) calcula(e, new Set());
  return caixas;
}

/**
 * Se o fluxo chega a alguém. Não chega quando termina na borda da sua própria
 * interface, vista de dentro: é o resultado que sai da máquina.
 * @param {Diagrama} d @param {Fluxo} f @param {Map<string, Elemento>} [idx]
 */
export function temDestinatario(d, f, idx = indexar(d)) {
  return !contem(d, f.para.elemento, f.de.elemento, idx);
}

/**
 * Componente preto sem nada dentro: o mecânico vazio e a decisão. O que entra
 * nele é incorporado.
 * @param {Diagrama} d @param {Elemento|undefined} e
 */
function pretoVazio(d, e) {
  return !!e && (e.tipo === 'decisao' || (e.tipo === 'mecanico' && !filhos(d, e.id).length));
}

/**
 * Se o que passa pelo fluxo vem de um componente preto sem nada dentro.
 * A junção é transparente: vale o que chega a ela.
 * @param {Diagrama} d @param {Ponta} de @param {Map<string, Elemento>} idx @param {Set<string>} vistos
 * @returns {boolean}
 */
function vemDePreto(d, de, idx, vistos) {
  const e = idx.get(de.elemento);
  if (e?.tipo !== 'juncao') return pretoVazio(d, e);
  if (vistos.has(e.id)) return false;
  vistos.add(e.id);
  const chegam = d.fluxos.filter((g) => g.para.elemento === e.id);
  return chegam.length > 0 && chegam.every((g) => vemDePreto(d, g.de, idx, vistos));
}

/**
 * A cor de um fluxo, dada pelo registro, e o porquê. A cor concorda com o
 * uso, e é o destino que decide (André, 12/10/2026; docs/notacao.md):
 *
 * 1. sem destinatário (o resultado que sai pela borda da máquina): a cor que
 *    o documento escolher, ou preto;
 * 2. chega a uma junção: a junção é transparente, vale a cor do que sai dela;
 *    preto se os ramos discordarem;
 * 3. chega a um componente preto sem nada dentro: é incorporado, preto;
 * 4. um objeto vermelho recebe a saída de um componente preto: é materializado
 *    por ele, preto;
 * 5. entra por cima: vira código, azul;
 * 6. entra pela esquerda: continua entrada, vermelho;
 * 7. nos demais casos, preto.
 *
 * @param {Diagrama} d @param {Fluxo} f @param {Map<string, Elemento>} [idx]
 * @returns {{registro: Registro, motivo: string}}
 */
export function corDoFluxo(d, f, idx = indexar(d)) {
  return cor(d, f, idx, new Set());
}

/**
 * @param {Diagrama} d @param {Fluxo} f @param {Map<string, Elemento>} idx @param {Set<string>} vistos
 * @returns {{registro: Registro, motivo: string}}
 */
function cor(d, f, idx, vistos) {
  if (!temDestinatario(d, f, idx)) {
    return f.registro
      ? { registro: f.registro, motivo: 'sem destinatário; cor escolhida no documento' }
      : { registro: 'mecanico', motivo: 'sem destinatário; preto, se o documento não escolhe outra' };
  }
  const destino = idx.get(f.para.elemento);
  if (destino?.tipo === 'juncao') {
    if (vistos.has(destino.id)) return { registro: 'mecanico', motivo: 'junções em ciclo' };
    vistos.add(destino.id);
    const ramos = d.fluxos.filter((g) => g.de.elemento === destino.id).map((g) => cor(d, g, idx, vistos).registro);
    if (ramos.length && ramos.every((r) => r === ramos[0])) {
      return { registro: ramos[0], motivo: 'passa pela junção; vale a cor do que sai dela' };
    }
    return { registro: 'mecanico', motivo: ramos.length ? 'na junção, os ramos discordam' : 'junção sem saída' };
  }
  if (pretoVazio(d, destino)) return { registro: 'mecanico', motivo: 'é incorporado a um componente preto' };
  if (destino?.tipo === 'estatico' && vemDePreto(d, f.de, idx, new Set())) {
    return { registro: 'mecanico', motivo: 'é materializado pelo componente preto de onde sai' };
  }
  if (f.para.lado === 'topo') return { registro: 'virtual', motivo: 'entra por cima; vira código' };
  if (f.para.lado === 'esquerda') return { registro: 'estatico', motivo: 'entra pela esquerda; continua entrada' };
  return { registro: 'mecanico', motivo: `entra ${POR_ONDE[f.para.lado]}` };
}

/**
 * O registro do que passa por um fluxo, que decide a sua cor.
 * @param {Diagrama} d @param {Fluxo} f @param {Map<string, Elemento>} [idx]
 * @returns {Registro}
 */
export function registroDoFluxo(d, f, idx = indexar(d)) {
  return corDoFluxo(d, f, idx).registro;
}

/** @param {string} [titulo] @returns {Documento} */
export function novoDocumento(titulo = 'Sem título') {
  return {
    formato: FORMATO,
    versao: VERSAO,
    titulo,
    diagramas: [{ id: 'd1', titulo: 'Diagrama 1', elementos: [], fluxos: [] }],
  };
}

/**
 * Migrações: MIGRACOES[n] leva um documento da versão n para a n+1.
 * Cada migração recebe e devolve o objeto lido do JSON e preserva os campos
 * que não conhece.
 * @type {Record<number, (doc: any) => any>}
 */
const MIGRACOES = {
  // 1 -> 2 (respostas do André, 12/10/2026): a espessura do traço não tem
  // significado, a seta vai em todos os fluxos, e a cor do fluxo passa a ser
  // calculada pelo destino. Saem "traco", "seta" e o "registro" dos fluxos que
  // têm destinatário; fica o registro do fluxo sem destinatário, que é escolha.
  1: (doc) => {
    const novo = { ...doc, versao: 2 };
    if (Array.isArray(doc.diagramas)) {
      novo.diagramas = doc.diagramas.map((/** @type {any} */ d) => {
        if (!Array.isArray(d?.elementos) || !Array.isArray(d?.fluxos)) return d;
        const elementos = d.elementos.map((/** @type {any} */ e) => {
          const { traco, ...resto } = e ?? {};
          return resto;
        });
        const semRegistro = { ...d, elementos };
        const fluxos = d.fluxos.map((/** @type {any} */ f) => {
          const { seta, ...resto } = f ?? {};
          if (resto.registro !== undefined && resto.de && resto.para && temDestinatario(semRegistro, resto)) {
            delete resto.registro;
          }
          return resto;
        });
        return { ...d, elementos, fluxos };
      });
    }
    return novo;
  },
};

/**
 * Traz um objeto lido de um arquivo para a versão atual do formato.
 * Lança erro se não for um documento deste editor, ou se for de uma versão
 * mais nova do que esta.
 * @param {any} obj @returns {Documento}
 */
export function migrar(obj) {
  if (!obj || typeof obj !== 'object' || obj.formato !== FORMATO) {
    throw new Error(`Não é um documento de ${FORMATO} (falta "formato": "${FORMATO}").`);
  }
  let v = obj.versao;
  if (!Number.isInteger(v) || v < 1) throw new Error('Versão do formato inválida.');
  if (v > VERSAO) {
    throw new Error(`O documento é da versão ${v} do formato; este editor só conhece até a ${VERSAO}.`);
  }
  let doc = obj;
  while (v < VERSAO) {
    const migracao = MIGRACOES[v];
    if (!migracao) throw new Error(`Falta a migração da versão ${v} para a ${v + 1}.`);
    doc = migracao(doc);
    v = doc.versao;
  }
  return doc;
}

/**
 * Confere a estrutura de um documento. Erros tornam o documento inutilizável;
 * avisos apontam coisas estranhas que o editor ainda consegue mostrar.
 * @param {Documento} doc
 * @returns {{erros: string[], avisos: string[]}}
 */
export function validar(doc) {
  /** @type {string[]} */ const erros = [];
  /** @type {string[]} */ const avisos = [];
  if (doc.formato !== FORMATO) erros.push(`formato deveria ser "${FORMATO}"`);
  if (doc.versao !== VERSAO) erros.push(`versão ${doc.versao} (esperada ${VERSAO}; migre antes)`);
  if (!Array.isArray(doc.diagramas)) {
    erros.push('falta a lista "diagramas"');
    return { erros, avisos };
  }
  const idsDiagramas = new Set();
  for (const d of doc.diagramas) {
    const onde = `diagrama ${d?.id ?? '(sem id)'}`;
    if (typeof d?.id !== 'string' || !d.id) erros.push(`${onde}: falta id`);
    else if (idsDiagramas.has(d.id)) erros.push(`${onde}: id repetido`);
    idsDiagramas.add(d?.id);
    if (!Array.isArray(d?.elementos) || !Array.isArray(d?.fluxos)) {
      erros.push(`${onde}: faltam as listas "elementos" e "fluxos"`);
      continue;
    }
    validarDiagrama(d, onde, erros, avisos);
  }
  return { erros, avisos };
}

/**
 * @param {Diagrama} d @param {string} onde
 * @param {string[]} erros @param {string[]} avisos
 */
function validarDiagrama(d, onde, erros, avisos) {
  const ids = new Set();
  for (const e of d.elementos) {
    const aqui = `${onde}, elemento ${e?.id ?? '(sem id)'}`;
    if (typeof e?.id !== 'string' || !e.id) erros.push(`${aqui}: falta id`);
    else if (ids.has(e.id)) erros.push(`${aqui}: id repetido`);
    ids.add(e?.id);
    if (!TIPOS.includes(e?.tipo)) erros.push(`${aqui}: tipo desconhecido "${e?.tipo}"`);
    if (!Number.isFinite(e?.x) || !Number.isFinite(e?.y)) erros.push(`${aqui}: x e y precisam ser números`);
    for (const k of /** @type {const} */ (['w', 'h'])) {
      if (e?.[k] !== undefined && !(Number.isFinite(e[k]) && e[k] > 0)) erros.push(`${aqui}: ${k} precisa ser um número positivo`);
    }
    for (const k of /** @type {const} */ (['legenda', 'rotulo', 'texto'])) {
      if (e?.[k] !== undefined && typeof e[k] !== 'string') erros.push(`${aqui}: ${k} precisa ser texto`);
    }
  }
  const idx = indexar(d);
  for (const e of d.elementos) {
    if (e.pai === undefined) continue;
    const aqui = `${onde}, elemento ${e.id}`;
    const pai = idx.get(e.pai);
    if (!pai) erros.push(`${aqui}: o pai "${e.pai}" não existe`);
    else if (!podeConter(pai.tipo)) erros.push(`${aqui}: ${NOME_DO_TIPO[pai.tipo] ?? pai.tipo} não pode servir de interface`);
  }
  // ciclos de aninhamento
  for (const e of d.elementos) {
    const vistos = new Set([e.id]);
    let atual = e;
    while (atual.pai) {
      if (vistos.has(atual.pai)) {
        erros.push(`${onde}: aninhamento circular passando por ${e.id}`);
        break;
      }
      vistos.add(atual.pai);
      const prox = idx.get(atual.pai);
      if (!prox) break;
      atual = prox;
    }
  }
  if (!erros.length) {
    // só com a árvore de aninhamento bem formada
    for (const e of d.elementos) {
      if (!e.pai) continue;
      const pai = /** @type {Elemento} */ (idx.get(e.pai));
      const { w, h } = tamanho(e);
      const tp = tamanho(pai);
      if (e.x < 0 || e.y < 0 || e.x + w > tp.w || e.y + h > tp.h) {
        avisos.push(`${onde}: ${e.id} passa das bordas de ${pai.id}, que é a sua interface`);
      }
    }
  }
  for (const f of d.fluxos) {
    const aqui = `${onde}, fluxo ${f?.id ?? '(sem id)'}`;
    if (typeof f?.id !== 'string' || !f.id) erros.push(`${aqui}: falta id`);
    else if (ids.has(f.id)) erros.push(`${aqui}: id repetido`);
    ids.add(f?.id);
    for (const ponta of /** @type {const} */ (['de', 'para'])) {
      const p = f?.[ponta];
      const alvo = p ? idx.get(p.elemento) : undefined;
      if (!p || !alvo) erros.push(`${aqui}: a ponta "${ponta}" não aponta para um elemento existente`);
      else if (alvo.tipo === 'anotacao') erros.push(`${aqui}: anotações não recebem fluxos`);
      if (p && !LADOS.includes(p.lado)) erros.push(`${aqui}: lado desconhecido "${p.lado}" na ponta "${ponta}"`);
    }
    if (f?.de && f?.para && f.de.elemento === f.para.elemento && f.de.lado === f.para.lado) {
      erros.push(`${aqui}: começa e termina no mesmo lado do mesmo elemento`);
    }
    if (f?.registro !== undefined && !ehRegistro(f.registro)) erros.push(`${aqui}: registro desconhecido "${f.registro}"`);
    if (f?.rotulo !== undefined && typeof f.rotulo !== 'string') erros.push(`${aqui}: rotulo precisa ser texto`);
  }
  if (!erros.length) {
    for (const f of d.fluxos) {
      if (f.registro !== undefined && temDestinatario(d, f, idx)) {
        avisos.push(`${onde}, fluxo ${f.id}: tem destinatário, e a cor vem do destino; o registro é ignorado`);
      }
    }
  }
}

/**
 * Lê o texto de um arquivo: JSON, migração e conferência.
 * @param {string} texto
 * @returns {{documento: Documento|null, erros: string[], avisos: string[]}}
 */
export function abrir(texto) {
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch (e) {
    return { documento: null, erros: [`O arquivo não é JSON válido: ${/** @type {Error} */ (e).message}`], avisos: [] };
  }
  let doc;
  try {
    doc = migrar(obj);
  } catch (e) {
    return { documento: null, erros: [/** @type {Error} */ (e).message], avisos: [] };
  }
  const { erros, avisos } = validar(doc);
  return { documento: erros.length ? null : doc, erros, avisos };
}
