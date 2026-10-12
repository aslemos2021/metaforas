# metaforas

Editor de diagramas para a notação de *Metáforas para explicar a computação como
ciência empírica*, de André Souza Lemos.

Na notação, um código ou valor em posição de inércia é uma elipse vermelha
(estático); a máquina virtual que aparece quando um algoritmo é posto a
funcionar, um retângulo azul de cantos arredondados (virtual); operadores e
arquiteturas, retângulos pretos (mecânico). Um elemento dentro de outro faz do
de fora a interface do de dentro. Os diagramas não são especificações nem
programas: são, nas palavras do artigo, "como a projeção em três dimensões de um
objeto de quatro dimensões ou mais".

**Estado:** a caminho da v0. O editor cria, move, aninha, redimensiona, liga,
renomeia e apaga; desfaz e refaz; guarda o trabalho no navegador; abre e salva o
documento (`.json`) e exporta cada diagrama em SVG, com o documento dentro (o SVG
reabre no editor). Ao clicar num elemento, o inspetor mostra a estrutura que o
documento guarda sobre ele. Falta redesenhar no editor as figuras do artigo.

Como usar: escolha um tipo na paleta e clique no desenho para criar; soltar um
elemento dentro de um registro o põe dentro; para ligar, arraste de um dos
pontos que aparecem nos lados de um elemento até outro. Teclado: `Delete` apaga,
`Ctrl+Z` desfaz, `Ctrl+Shift+Z` refaz, setas movem (com `Shift`, de 10 em 10),
`Esc` limpa a seleção, clique duplo edita o nome.

- A notação: [docs/notacao.md](docs/notacao.md)
- O formato do documento: [docs/formato.md](docs/formato.md)
- As decisões: [docs/decisoes.md](docs/decisoes.md)

## Rodar

A página publicada fica em https://aslemos2021.github.io/metaforas/ (quando o
GitHub Pages estiver ativo).

Localmente, com Node 20 ou mais novo:

```sh
node ferramentas/servidor.mjs    # depois, abrir http://localhost:8000
npm test                         # tipos, unidades e a página num navegador
```

A página usa módulos JavaScript, que o navegador não carrega a partir de um
arquivo aberto direto do disco; por isso o servidor.

## Licença

[CC0 1.0](LICENSE): domínio público. A notação é de André Souza Lemos. Os textos
de referência não estão neste repositório.
