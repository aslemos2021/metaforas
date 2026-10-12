# CLAUDE.md

Instruções para o Claude, e para quem mais trabalhar neste repositório.

## O projeto

Um editor de diagramas para a notação de *Metáforas para explicar a computação
como ciência empírica* (André Souza Lemos, manuscrito, 2023). Começa como
editor e depois vai para direções que ainda não se sabem. Por isso o documento
guarda a estrutura da notação, e não só o desenho.

O André é o autor da notação e quem decide o que ela é. Trabalha com o Claude
num Projeto do Claude Code: cada tarefa é uma conversa nova, que começa por
este arquivo.

## Antes de mexer

1. Leia `docs/notacao.md` (a gramática confirmada, o que está fora, as perguntas
   em aberto) e `docs/formato.md` (o documento JSON).
2. Veja as últimas entradas de `docs/decisoes.md`.
3. O manuscrito de *Metáforas* e o *Ensaio.pptx* (os desenhos originais, feitos
   no PowerPoint) estão na Library do Projeto. Quando o assunto for uma figura,
   olhe a figura.

## Princípios

1. **A notação é do André.** Não acrescente elementos, cores, formas ou regras
   por conta própria. O que está fora por enquanto continua fora até ele dizer.
   Se um desenho não couber na gramática, isso vira uma pergunta para ele (e
   uma entrada em "Perguntas em aberto"), não uma extensão.
2. **Estrutura antes de desenho.** O documento diz o que cada coisa é (registro),
   o que está dentro do quê (interface e objeto), por onde cada fluxo entra e sai
   (lado), e os nomes nos seus dois papéis (legenda e rótulo). O desenho é
   calculado a partir disso (`src/desenho.js`, `src/geometria.js`), nunca o
   contrário. Antes de guardar algo só visual no documento, pergunte se não é
   estrutura disfarçada.
3. **Não é linguagem de programação.** O artigo recusa que os diagramas sejam
   tomados como especificação ou como código "que mereceria uma interpretação
   operacional". O modelo não tem semântica de execução. Um executor, se vier,
   será pensado com o André como um projeto à parte.
4. **Evoluir sem perder.** O formato tem `versao` e migrações (`src/modelo.js`).
   O editor preserva os campos que não conhece. Mudou o formato: suba a versão,
   escreva a migração e o teste, atualize `docs/formato.md`.
5. **O vocabulário é o do artigo.** registro, estático, virtual, mecânico,
   interface, objeto, legenda, rótulo, decisão, junção, fluxo, lado, anotação.
   Código, comentários, testes e mensagens de commit em português; nomes de
   variáveis e valores do JSON sem acento (`estatico`, `decisao`).
6. **A página continua simples de publicar.** Nada de etapa de build nem de
   dependências no navegador: o que está no `main` é o que o GitHub Pages serve.
   Dependências de desenvolvimento (TypeScript, Playwright) não vão para a página.

## Como está organizado

```
index.html, estilo.css   a página
src/modelo.js            tipos (JSDoc), regras, validação, migração; não desenha
src/notacao.js           cores, traços, fontes e medidas da notação, num lugar só
src/geometria.js         portas e rotas ortogonais dos fluxos; funções puras
src/desenho.js           diagrama -> <svg>; sem estado
src/inspetor.js          clique num elemento mostra a estrutura que o documento guarda
src/main.js              liga tudo na página
exemplos/artigo.json     Tabela 1 e Figuras 1, 2 e 4 a 8, para ver e para testar
docs/                    notação, formato, decisões
tests/                   unidades (node:test) e página (Playwright)
ferramentas/servidor.mjs servidor local (módulos ES não abrem de file://)
```

## Como trabalhar

- Rodar localmente: `node ferramentas/servidor.mjs` e abrir http://localhost:8000.
  `#figura-4` no endereço abre direto um diagrama.
- Conferir tudo: `npm test`, que roda o `tsc` (tipos), `node --test` (unidades) e
  `tests/pagina.mjs` (Chromium). Nas sessões na nuvem, `tsc` e Playwright já
  estão instalados; se faltar o `tsc`, `npm install`.
- Depois de mexer no desenho, olhe as capturas que o teste da página salva em
  `tests/capturas/` e compare com as figuras do artigo. Mostre ao André o que
  mudou (uma captura vale mais que a descrição).
- Commits pequenos, em português, no imperativo ("Desenha a junção por cima das
  linhas"). Não faça commit com teste falhando.
- Decisões que mudam o rumo vão para `docs/decisoes.md`, com data e autoria.
- Ao terminar uma tarefa, diga em poucas linhas o que mudou, o que ficou de fora
  e qual seria o próximo passo.

## Estado

O esqueleto mostra os exemplos e um inspetor, mas ainda não edita.

**Próximo: a v0.** Critério de aceite (André): redesenhar no editor a Tabela 1 e
as Figuras 1 a 11, dentro da gramática confirmada; salvar o documento; exportar
SVG. Um caminho possível, a combinar com ele:

1. Paleta para criar elementos dos seis tipos; selecionar, mover (com os objetos
   dentro) e redimensionar.
2. Aninhar e desaninhar arrastando para dentro e para fora de uma interface.
3. Ligar fluxos de um lado a outro; rótulos `s` e `n` nas saídas da decisão.
4. Editar legenda, rótulo, texto; apagar; desfazer e refazer.
5. Vários diagramas no documento.
6. Abrir e salvar `.json`; guardar o trabalho no navegador para não perdê-lo.
7. Exportar SVG (talvez com o documento embutido, para poder reabrir).
8. Redesenhar as figuras com o editor; o que não couber vira pergunta.
