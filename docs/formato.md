# O formato do documento

Um documento é um arquivo JSON. O formato é do editor; a notação que ele guarda
está em `notacao.md`. Os tipos estão escritos em JSDoc em `src/modelo.js`, que é
a referência quando este texto e o código discordarem.

## Exemplo

```json
{
  "formato": "metaforas",
  "versao": 1,
  "titulo": "Um exemplo",
  "diagramas": [
    {
      "id": "figura-4",
      "titulo": "Figura 4: Não-autoaceitadorRE? (Recursivamente Enumerável).",
      "elementos": [
        {"id": "v2", "tipo": "virtual", "x": 20, "y": 20, "w": 748, "h": 460, "legenda": "Não-autoaceitadorRE?"},
        {"id": "v1", "tipo": "virtual", "pai": "v2", "x": 116, "y": 133, "w": 291, "h": 260},
        {"id": "j1", "tipo": "juncao", "pai": "v2", "x": 59, "y": 229},
        {"id": "d1", "tipo": "decisao", "pai": "v2", "x": 407, "y": 233, "w": 68, "h": 61, "rotulo": "?"},
        {"id": "e1", "tipo": "estatico", "pai": "v2", "x": 491, "y": 166, "w": 45, "h": 43, "rotulo": "n", "traco": "fino"}
      ],
      "fluxos": [
        {"id": "f1", "de": {"elemento": "v2", "lado": "esquerda"}, "para": {"elemento": "j1", "lado": "esquerda"}, "seta": false},
        {"id": "f2", "de": {"elemento": "j1", "lado": "baixo"}, "para": {"elemento": "v1", "lado": "esquerda"}, "registro": "estatico"},
        {"id": "f8", "de": {"elemento": "j1", "lado": "topo"}, "para": {"elemento": "v1", "lado": "topo"}},
        {"id": "f3", "de": {"elemento": "d1", "lado": "topo"}, "para": {"elemento": "e1", "lado": "esquerda"}, "rotulo": "s", "seta": false}
      ]
    }
  ]
}
```

## Documento

| campo | | |
|---|---|---|
| `formato` | sempre `"metaforas"` | |
| `versao` | número inteiro; hoje, 1 | |
| `titulo`, `descricao` | texto | opcionais |
| `diagramas` | lista de diagramas | um documento pode ter vários, como um artigo tem várias figuras |

## Diagrama

`id` (único no documento), `titulo` (opcional), `elementos` e `fluxos`.

## Elemento

| campo | | |
|---|---|---|
| `id` | texto, único no diagrama (elementos e fluxos juntos) | |
| `tipo` | `estatico`, `virtual`, `mecanico`, `decisao`, `juncao` ou `anotacao` | os três primeiros são os registros |
| `pai` | id da interface (aninhamento) | só um registro pode ser pai |
| `x`, `y` | posição do canto superior esquerdo, **relativa ao pai** (ou ao diagrama, sem pai) | mover a interface move os objetos |
| `w`, `h` | tamanho | opcionais; cada tipo tem um padrão (`TAMANHO_PADRAO`) |
| `legenda` | nome da máquina, só para quem lê; vai no canto | |
| `rotulo` | nome que integra o objeto; vai no centro | `\n` quebra a linha |
| `texto` | o texto de uma anotação | |
| `traco` | `"fino"` | ver as perguntas em aberto |

## Fluxo

| campo | | |
|---|---|---|
| `id` | texto, único no diagrama | |
| `de`, `para` | `{"elemento": id, "lado": "topo" \| "esquerda" \| "baixo" \| "direita"}` | anotações não recebem fluxos |
| `rotulo` | `s` ou `n`, nas saídas de uma decisão | |
| `registro` | `estatico`, `virtual` ou `mecanico`: o que passa, e a cor | opcional; sem ele, vale a regra: azul quando o fluxo entra ou sai pelo topo de uma máquina virtual, preto no resto |
| `seta` | `false` para não ter ponta de seta | opcional |

Uma ponta pode ser a borda de uma interface vista de dentro: em
`{"de": {"elemento": "v2", "lado": "esquerda"}, "para": {"elemento": "j1", ...}}`,
com `j1` dentro de `v2`, o fluxo entra pela borda esquerda de `v2` e vai até `j1`.

A rota da linha não é guardada: o desenho a calcula (`src/geometria.js`).

## Regras para mudar o formato

1. O editor preserva os campos que não conhece. Quem abre e salva um documento
   não pode perder nada.
2. Toda mudança que um editor antigo não entenderia sobe a `versao` e ganha uma
   migração em `MIGRACOES` (`src/modelo.js`), com teste.
3. A notação muda primeiro em `notacao.md`, com o André; o formato vem depois.
