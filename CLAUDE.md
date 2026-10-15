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

## Como trabalhar com o André

- Escreva em português do Brasil.
- Ele quer atrito intelectual, não elogio. Se uma ideia dele (ou sua) tiver
  problema, diga, com argumentos; não concorde por concordar.
- Explique de forma acessível e bem sinalizada. O registro erudito dele não quer
  dizer que domine cada ferramenta que aparece (Git, GitHub, TypeScript,
  testes); explique o necessário na hora, sem jargão gratuito.
- Proponha, pergunte e implemente; a notação, só ele estende (ver Princípios).
- A escrita dele é peculiar, e a sua leitura tem idiossincrasias. Na dúvida
  sobre o que ele quer, pergunte.
- Não traga para cá o material de conversas anteriores entre vocês (leituras
  filosóficas dos textos dele, outros protótipos), a menos que ele peça.
- Trabalhe num branch e abra um pull request; ele faz o merge, ou pede que você
  faça. O que está no `main` é o que a página publica.
- Mostre o resultado com capturas de tela, não só com descrição.

## Antes de mexer

1. Leia `docs/notacao.md` (a gramática confirmada, o que está fora, as perguntas
   em aberto) e `docs/formato.md` (o documento JSON).
2. Veja as últimas entradas de `docs/decisoes.md`.
3. O manuscrito de *Metáforas* (`metaforas.pdf`), o *Ensaio.pptx* (os desenhos
   originais, feitos no PowerPoint) e o *Metáforas.pptx* (versão inicial do
   artigo) estão na Library do Projeto, não no repositório, que é público.
   Quando o assunto for uma figura, olhe a figura lá.

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
src/edicao.js            operações de edição (documento -> documento novo) e histórico
src/notacao.js           cores, traços, fontes e medidas da notação, num lugar só
src/geometria.js         portas e rotas ortogonais dos fluxos; funções puras
src/desenho.js           diagrama -> <svg>; sem estado
src/inspetor.js          mostra a estrutura do que está selecionado e edita os nomes
src/tela.js              a tela de edição: selecionar, mover, aninhar, redimensionar, ligar, criar
src/arquivo.js           .json, SVG exportado (com o documento dentro), cópia no navegador
src/main.js              estado, histórico, barras, paleta e teclado
exemplos/artigo.json     Tabela 1 e Figuras 1 a 11, para ver e para testar
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

O editor edita (passos 0 a 8 abaixo). Formato na versão 2, com a cor dos
fluxos calculada pelo destino. Ao abrir, a página mostra o que está guardado no
navegador; na primeira vez, as figuras do artigo.

**Em curso: a v0.** Critério de aceite (André): redesenhar no editor a Tabela 1
e as Figuras 1 a 11, dentro da gramática confirmada (as 9 a 11 sem reticências
nem Atalho); salvar o documento; exportar SVG. Plano aprovado pelo André em
12/10/2026; cada passo termina publicado e com testes:

0. ~~Respostas do André na notação: cor calculada, formato v2, inspetor.~~
1. ~~Núcleo de edição sem tela (`src/edicao.js`): criar, mover, redimensionar,
   aninhar, desaninhar, ligar, renomear, apagar; histórico para desfazer e
   refazer. Funções puras, que devolvem documento novo e válido.~~
2. ~~Selecionar, mover (com os objetos dentro) e redimensionar com o mouse;
   apagar; desfazer e refazer.~~
3. ~~Paleta dos seis tipos; soltar dentro de um registro aninha, arrastar para
   fora desaninha.~~
4. ~~Fluxos: arrastar de um lado a outro; `s`/`n` na saída da decisão.~~
5. ~~O inspetor edita: legenda, rótulo, texto, lados, cor do fluxo sem
   destinatário.~~
6. ~~Vários diagramas: criar, renomear, duplicar, reordenar, apagar.~~
7. ~~Abrir e salvar `.json`; guardar no navegador.~~
8. ~~Exportar SVG com o documento embutido (e reabrir o SVG).~~ Os passos 2 a
   8 esperam a experiência do André no uso.
9. Redesenhar a Tabela 1 e as Figuras 1 a 11 no editor; o que não couber vira
   pergunta. As que faltavam (3, 9, 10, 11) já estão em `exemplos/artigo.json`,
   escritas à mão; falta o André redesenhar no editor e dizer o que atrapalha.

Fora da v0: pontos de passagem nas rotas (só com o André; se uma rota ficar
ruim, melhora-se o cálculo), encostar como relação, grade, toque.
