// Testes do modelo do documento. Uso: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  VERSAO, abrir, ancestrais, caixasAbsolutas, contem, corDoFluxo, migrar, novoDocumento, registroDoFluxo, temDestinatario, validar,
} from '../src/modelo.js';

const exemplo = await readFile(new URL('../exemplos/artigo.json', import.meta.url), 'utf8');

/** Um documento mínimo com um diagrama, para estragar em cada teste. */
function base() {
  return {
    formato: 'metaforas',
    versao: VERSAO,
    diagramas: [{
      id: 'd',
      elementos: [
        { id: 'fora', tipo: 'virtual', x: 0, y: 0, w: 300, h: 200, legenda: 'Fora' },
        { id: 'dentro', tipo: 'virtual', pai: 'fora', x: 50, y: 40, w: 100, h: 80 },
        { id: 'j', tipo: 'juncao', pai: 'fora', x: 20, y: 75 },
        { id: 'x', tipo: 'estatico', x: -80, y: 70, rotulo: 'x' },
      ],
      fluxos: [
        { id: 'f1', de: { elemento: 'j', lado: 'topo' }, para: { elemento: 'dentro', lado: 'topo' } },
        { id: 'f2', de: { elemento: 'j', lado: 'baixo' }, para: { elemento: 'dentro', lado: 'esquerda' } },
        { id: 'f3', de: { elemento: 'x', lado: 'direita' }, para: { elemento: 'j', lado: 'esquerda' } },
      ],
    }],
  };
}

const errosDe = (doc) => validar(doc).erros.join('\n');

test('o documento de exemplo abre sem erros nem avisos', () => {
  const { documento, erros, avisos } = abrir(exemplo);
  assert.deepEqual(erros, []);
  assert.deepEqual(avisos, []);
  assert.ok(documento);
  assert.ok(documento.diagramas.some((d) => d.id === 'tabela-1'));
  assert.ok(documento.diagramas.some((d) => d.id === 'figura-4'));
});

test('a Tabela 1 tem as nove combinações de interface e objeto', () => {
  const { documento } = abrir(exemplo);
  const t = documento.diagramas.find((d) => d.id === 'tabela-1');
  const pares = new Set(
    t.elementos.filter((e) => e.pai).map((e) => `${t.elementos.find((p) => p.id === e.pai).tipo}/${e.tipo}`),
  );
  for (const i of ['estatico', 'virtual', 'mecanico']) {
    for (const o of ['estatico', 'virtual', 'mecanico']) assert.ok(pares.has(`${i}/${o}`), `falta ${i}/${o}`);
  }
});

test('o exemplo de docs/formato.md é um documento válido', async () => {
  const md = await readFile(new URL('../docs/formato.md', import.meta.url), 'utf8');
  const bloco = md.match(/```json\n([\s\S]*?)```/);
  assert.ok(bloco, 'não achei o bloco json');
  const { documento, erros } = abrir(bloco[1]);
  assert.deepEqual(erros, []);
  assert.ok(documento);
});

test('um documento novo é válido', () => {
  assert.deepEqual(validar(novoDocumento()).erros, []);
});

test('o documento mínimo é válido', () => {
  assert.deepEqual(validar(base()), { erros: [], avisos: [] });
});

test('acusa id repetido', () => {
  const doc = base();
  doc.diagramas[0].elementos[1].id = 'fora';
  assert.match(errosDe(doc), /id repetido/);
});

test('acusa pai que não existe', () => {
  const doc = base();
  doc.diagramas[0].elementos[1].pai = 'ninguem';
  assert.match(errosDe(doc), /não existe/);
});

test('decisão, junção e anotação não servem de interface', () => {
  const doc = base();
  doc.diagramas[0].elementos[1].pai = 'j';
  assert.match(errosDe(doc), /não pode servir de interface/);
});

test('acusa aninhamento circular', () => {
  const doc = base();
  doc.diagramas[0].elementos[0].pai = 'dentro';
  assert.match(errosDe(doc), /circular/);
});

test('acusa fluxo com ponta solta ou lado desconhecido', () => {
  const doc = base();
  doc.diagramas[0].fluxos[0].para.elemento = 'nada';
  doc.diagramas[0].fluxos[1].de.lado = 'diagonal';
  const erros = errosDe(doc);
  assert.match(erros, /não aponta para um elemento existente/);
  assert.match(erros, /lado desconhecido/);
});

test('acusa tipo e registro desconhecidos', () => {
  const doc = base();
  doc.diagramas[0].elementos[3].tipo = 'atalho';
  doc.diagramas[0].fluxos[0].registro = 'roxo';
  const erros = errosDe(doc);
  assert.match(erros, /tipo desconhecido/);
  assert.match(erros, /registro desconhecido/);
});

test('avisa quando um objeto passa das bordas da sua interface', () => {
  const doc = base();
  doc.diagramas[0].elementos[1].x = 260;
  const { erros, avisos } = validar(doc);
  assert.deepEqual(erros, []);
  assert.match(avisos.join('\n'), /passa das bordas/);
});

test('migrar recusa o que não é documento, e versões futuras', () => {
  assert.throws(() => migrar({ formato: 'outro', versao: 1 }), /Não é um documento/);
  assert.throws(() => migrar({ formato: 'metaforas', versao: VERSAO + 1 }), /versão/);
  assert.throws(() => migrar({ formato: 'metaforas', versao: 0 }), /inválida/);
});

test('campos desconhecidos atravessam a abertura sem se perder', () => {
  const doc = base();
  doc.extra = { qualquer: 'coisa' };
  doc.diagramas[0].elementos[0].ideia = 'para depois';
  const { documento } = abrir(JSON.stringify(doc));
  assert.deepEqual(documento.extra, { qualquer: 'coisa' });
  assert.equal(documento.diagramas[0].elementos[0].ideia, 'para depois');
});

test('abrir explica JSON inválido', () => {
  const { documento, erros } = abrir('{ isto não é json');
  assert.equal(documento, null);
  assert.match(erros[0], /JSON/);
});

test('posições são relativas à interface', () => {
  const d = base().diagramas[0];
  const c = caixasAbsolutas(d);
  assert.deepEqual(c.get('dentro'), { x: 50, y: 40, w: 100, h: 80 });
  assert.deepEqual(c.get('j'), { x: 20, y: 75, w: 10, h: 10 });
  d.elementos[0].x = 100;
  assert.equal(caixasAbsolutas(d).get('dentro').x, 150);
});

test('ancestrais e contem seguem o aninhamento', () => {
  const d = base().diagramas[0];
  assert.deepEqual(ancestrais(d, 'dentro').map((e) => e.id), ['fora']);
  assert.ok(contem(d, 'fora', 'dentro'));
  assert.ok(!contem(d, 'dentro', 'fora'));
  assert.ok(!contem(d, 'fora', 'x'));
});

test('cor do fluxo: o destino decide', () => {
  const d = base().diagramas[0];
  const [f1, f2, f3] = d.fluxos;
  assert.equal(registroDoFluxo(d, f1), 'virtual'); // entra por cima: vira código
  assert.equal(registroDoFluxo(d, f2), 'estatico'); // entra pela esquerda: continua entrada
  assert.equal(registroDoFluxo(d, f3), 'mecanico'); // chega à junção, cujos ramos discordam
  d.fluxos.splice(0, 1);
  assert.equal(registroDoFluxo(d, f3), 'estatico'); // a junção é transparente
});

test('cor do fluxo nas figuras do artigo', () => {
  const { documento } = abrir(exemplo);
  const cores = {
    // f4: a saída de -1 entra pela esquerda do Fatorial interno
    'figura-2a': { f1: 'mecanico', f3: 'mecanico', f4: 'estatico', f5: 'mecanico', f7: 'mecanico', f9: 'mecanico', f10: 'virtual' },
    // f4 e f6: o vermelho é materializado pelo preto (-1, e a decisão através da junção)
    'figura-2b': { f4: 'mecanico', f6: 'mecanico' },
    'figura-4': { f1: 'mecanico', f2: 'estatico', f3: 'mecanico', f5: 'mecanico', f7: 'mecanico', f8: 'virtual' },
    'figura-8': { f8: 'virtual', f9: 'mecanico', f6: 'estatico', f7: 'virtual' },
  };
  for (const [id, esperado] of Object.entries(cores)) {
    const d = documento.diagramas.find((x) => x.id === id);
    for (const [fid, reg] of Object.entries(esperado)) {
      const f = d.fluxos.find((x) => x.id === fid);
      assert.equal(registroDoFluxo(d, f), reg, `${id} ${fid}: ${corDoFluxo(d, f).motivo}`);
    }
  }
});

test('sem destinatário, a cor é escolha do documento', () => {
  const d = base().diagramas[0];
  const saida = { id: 's', de: { elemento: 'j', lado: 'direita' }, para: { elemento: 'fora', lado: 'direita' } };
  d.fluxos.push(saida);
  assert.ok(!temDestinatario(d, saida));
  assert.equal(registroDoFluxo(d, saida), 'mecanico');
  saida.registro = 'virtual';
  assert.equal(registroDoFluxo(d, saida), 'virtual');
});

test('avisa do registro num fluxo que tem destinatário', () => {
  const doc = base();
  doc.diagramas[0].fluxos[0].registro = 'estatico';
  const { erros, avisos } = validar(doc);
  assert.deepEqual(erros, []);
  assert.match(avisos.join('\n'), /registro é ignorado/);
});

test('migração 1 -> 2: saem traço, seta e o registro dos fluxos com destinatário', () => {
  const v1 = base();
  v1.versao = 1;
  const d = v1.diagramas[0];
  d.elementos[3].traco = 'fino';
  d.fluxos[0].seta = false;
  d.fluxos[1].registro = 'estatico';
  d.fluxos.push({ id: 's', de: { elemento: 'j', lado: 'direita' }, para: { elemento: 'fora', lado: 'direita' }, registro: 'virtual', ideia: 'x' });
  const { documento, erros, avisos } = abrir(JSON.stringify(v1));
  assert.deepEqual(erros, []);
  assert.deepEqual(avisos, []);
  assert.equal(documento.versao, 2);
  const [e3, f1, f2, s] = [documento.diagramas[0].elementos[3], ...documento.diagramas[0].fluxos.slice(0, 2), documento.diagramas[0].fluxos[3]];
  assert.ok(!('traco' in e3));
  assert.ok(!('seta' in f1));
  assert.ok(!('registro' in f2));
  assert.equal(s.registro, 'virtual'); // sem destinatário: fica
  assert.equal(s.ideia, 'x');
});
