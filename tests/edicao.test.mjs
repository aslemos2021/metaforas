// Testes da edição do documento. Uso: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { caixasAbsolutas, novoDocumento, validar } from '../src/modelo.js';
import {
  Historico, aninhar, alterar, alterarDiagrama, apagar, apagarDiagrama, criarDiagrama, criarElemento,
  duplicarDiagrama, interfaceQueContem, ligar, mover, redimensionar, reordenarDiagrama,
} from '../src/edicao.js';

/** Uma máquina com uma máquina dentro, uma junção e um valor fora. */
function base() {
  return {
    formato: 'metaforas',
    versao: 2,
    diagramas: [{
      id: 'd',
      extra: 'preservado',
      elementos: [
        { id: 'fora', tipo: 'virtual', x: 100, y: 100, w: 300, h: 200, legenda: 'Fora' },
        { id: 'dentro', tipo: 'virtual', pai: 'fora', x: 50, y: 40, w: 100, h: 80, ideia: 'x' },
        { id: 'j', tipo: 'juncao', pai: 'fora', x: 20, y: 75 },
        { id: 'x', tipo: 'estatico', x: 0, y: 170, rotulo: 'x' },
      ],
      fluxos: [
        { id: 'f1', de: { elemento: 'j', lado: 'topo' }, para: { elemento: 'dentro', lado: 'topo' } },
        { id: 'f2', de: { elemento: 'x', lado: 'direita' }, para: { elemento: 'j', lado: 'esquerda' } },
      ],
    }],
  };
}

const diagrama = (doc) => doc.diagramas[0];
const el = (doc, id) => diagrama(doc).elementos.find((e) => e.id === id);
const caixa = (doc, id) => caixasAbsolutas(diagrama(doc)).get(id);

test('criar: id novo, posição relativa à interface', () => {
  const doc = base();
  const { documento, id } = criarElemento(doc, 'd', { tipo: 'mecanico', x: 300, y: 250, pai: 'fora', rotulo: '-1' });
  assert.equal(id, 'm1');
  assert.deepEqual({ ...el(documento, id) }, { id: 'm1', tipo: 'mecanico', x: 200, y: 150, pai: 'fora', rotulo: '-1' });
  assert.equal(diagrama(doc).elementos.length, 4, 'o documento de entrada não muda');
  assert.deepEqual(validar(documento).erros, []);
});

test('criar: anotação nasce com texto; decisão não serve de interface', () => {
  const { documento, id } = criarElemento(base(), 'd', { tipo: 'anotacao', x: 0, y: 0 });
  assert.equal(el(documento, id).texto, 'texto');
  const comDecisao = criarElemento(base(), 'd', { tipo: 'decisao', x: 0, y: 0 });
  assert.throws(() => criarElemento(comDecisao.documento, 'd', { tipo: 'estatico', x: 0, y: 0, pai: comDecisao.id }), /interface/);
});

test('mover leva os objetos junto, e não move duas vezes', () => {
  const doc = mover(base(), 'd', ['fora', 'dentro'], 10, -5);
  assert.deepEqual(caixa(doc, 'fora'), { x: 110, y: 95, w: 300, h: 200 });
  assert.deepEqual(caixa(doc, 'dentro'), { x: 160, y: 135, w: 100, h: 80 });
  assert.equal(el(doc, 'dentro').x, 50);
});

test('redimensionar pela esquerda deixa os objetos onde estavam', () => {
  const antes = caixa(base(), 'dentro');
  const doc = redimensionar(base(), 'd', 'fora', { x: 80, y: 100, w: 320, h: 200 });
  assert.deepEqual(caixa(doc, 'fora'), { x: 80, y: 100, w: 320, h: 200 });
  assert.deepEqual(caixa(doc, 'dentro'), antes);
  assert.throws(() => redimensionar(base(), 'd', 'j', { x: 0, y: 0, w: 40, h: 40 }), /junção/);
  assert.equal(caixa(redimensionar(base(), 'd', 'x', { x: 0, y: 0, w: 1, h: 1 }), 'x').w, 12);
});

test('aninhar e desaninhar mantêm o lugar no desenho', () => {
  const antes = caixa(base(), 'x');
  let doc = aninhar(base(), 'd', 'x', 'dentro');
  assert.equal(el(doc, 'x').pai, 'dentro');
  assert.deepEqual(caixa(doc, 'x'), antes);
  doc = aninhar(doc, 'd', 'x', undefined);
  assert.ok(!('pai' in el(doc, 'x')));
  assert.deepEqual(caixa(doc, 'x'), antes);
  assert.throws(() => aninhar(base(), 'd', 'fora', 'dentro'), /dentro de si/);
  assert.throws(() => aninhar(base(), 'd', 'x', 'j'), /interface/);
});

test('interfaceQueContem acha a mais interna, sem contar quem se arrasta', () => {
  const d = diagrama(base());
  assert.equal(interfaceQueContem(d, { x: 160, y: 150, w: 10, h: 10 }), 'dentro');
  assert.equal(interfaceQueContem(d, { x: 110, y: 110, w: 10, h: 10 }), 'fora');
  assert.equal(interfaceQueContem(d, { x: 0, y: 0, w: 10, h: 10 }), undefined);
  assert.equal(interfaceQueContem(d, { x: 160, y: 150, w: 10, h: 10 }, ['dentro']), 'fora');
  assert.equal(interfaceQueContem(d, { x: 160, y: 150, w: 10, h: 10 }, ['fora']), undefined);
});

test('ligar: fluxo novo; na decisão, s e depois n', () => {
  let { documento: doc, id: dec } = criarElemento(base(), 'd', { tipo: 'decisao', x: 500, y: 100 });
  const um = ligar(doc, 'd', { elemento: dec, lado: 'topo' }, { elemento: 'x', lado: 'esquerda' });
  const dois = ligar(um.documento, 'd', { elemento: dec, lado: 'baixo' }, { elemento: 'dentro', lado: 'esquerda' });
  const fluxos = diagrama(dois.documento).fluxos;
  assert.equal(fluxos.find((f) => f.id === um.id).rotulo, 's');
  assert.equal(fluxos.find((f) => f.id === dois.id).rotulo, 'n');
  assert.equal(um.id, 'f3');
  assert.throws(() => ligar(base(), 'd', { elemento: 'j', lado: 'topo' }, { elemento: 'dentro', lado: 'topo' }), /já existe/);
  assert.throws(() => ligar(base(), 'd', { elemento: 'x', lado: 'topo' }, { elemento: 'x', lado: 'topo' }), /mesmo lado/);
});

test('alterar muda e apaga campos, e recusa o que tem operação própria', () => {
  let doc = alterar(base(), 'd', 'fora', { legenda: 'Fatorial', rotulo: 'F' });
  assert.equal(el(doc, 'fora').legenda, 'Fatorial');
  doc = alterar(doc, 'd', 'fora', { rotulo: '' });
  assert.ok(!('rotulo' in el(doc, 'fora')));
  doc = alterar(doc, 'd', 'f1', { rotulo: 'n' });
  assert.equal(diagrama(doc).fluxos[0].rotulo, 'n');
  assert.throws(() => alterar(base(), 'd', 'fora', { pai: 'x' }), /não se muda/);
  assert.throws(() => alterar(base(), 'd', 'fora', { w: -3 }), /positivo/);
});

test('apagar leva o que está dentro e os fluxos que tocam', () => {
  const doc = apagar(base(), 'd', ['fora']);
  assert.deepEqual(diagrama(doc).elementos.map((e) => e.id), ['x']);
  assert.deepEqual(diagrama(doc).fluxos, []);
  const soFluxo = apagar(base(), 'd', ['f1']);
  assert.deepEqual(diagrama(soFluxo).fluxos.map((f) => f.id), ['f2']);
});

test('campos desconhecidos atravessam as operações', () => {
  let doc = mover(base(), 'd', ['fora'], 1, 1);
  doc = aninhar(doc, 'd', 'x', 'fora');
  assert.equal(el(doc, 'dentro').ideia, 'x');
  assert.equal(diagrama(doc).extra, 'preservado');
});

test('diagramas: criar, duplicar, renomear, reordenar, apagar', () => {
  let doc = novoDocumento();
  const criado = criarDiagrama(doc);
  doc = criado.documento;
  assert.equal(doc.diagramas.length, 2);
  const dup = duplicarDiagrama(base(), 'd');
  assert.equal(dup.documento.diagramas.length, 2);
  assert.notEqual(dup.id, 'd');
  assert.deepEqual(dup.documento.diagramas[1].elementos, base().diagramas[0].elementos);
  doc = alterarDiagrama(doc, criado.id, { titulo: 'Figura 3' });
  assert.equal(doc.diagramas[1].titulo, 'Figura 3');
  doc = reordenarDiagrama(doc, criado.id, 0);
  assert.equal(doc.diagramas[0].id, criado.id);
  doc = apagarDiagrama(apagarDiagrama(doc, 'd1'), criado.id);
  assert.equal(doc.diagramas.length, 1, 'sempre fica um');
});

test('histórico: desfazer, refazer, e um passo novo apaga o refazer', () => {
  const a = base();
  const h = new Historico(a);
  const b = mover(a, 'd', ['x'], 5, 0);
  const c = mover(b, 'd', ['x'], 5, 0);
  h.registrar(b);
  h.registrar(c);
  assert.equal(h.desfazer(), b);
  assert.equal(h.desfazer(), a);
  assert.equal(h.desfazer(), a);
  assert.ok(!h.podeDesfazer);
  assert.equal(h.refazer(), b);
  const outro = mover(b, 'd', ['x'], 0, 9);
  h.registrar(outro);
  assert.ok(!h.podeRefazer);
  assert.equal(h.atual, outro);
});
