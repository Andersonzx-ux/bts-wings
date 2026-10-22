# WINGS — BTS (player)

Player estático (HTML/CSS/JS puro) feito só para o álbum *Wings* (2016, 15 faixas).
Funciona no GitHub Pages: suba a pasta inteira.

## Estrutura
- `index.html`, `css/style.css`, `js/` (player.js, ui.js, app.js)
- `data/album.js` — títulos, durações, quem canta, arquivo de áudio e letras
- `assets/cover.jpg` — capa; `assets/motifs/` — os 4 círculos da capa (fundo)
- `assets/fonts/` — Quantico, Cormorant Garamond e Inter (OFL, licenças incluídas)

## Áudio e letras
- Coloque os arquivos em `audio/01.flac` … `audio/15.flac` (ou mude `audio` em cada faixa).
- Letras em `lyrics` de cada faixa: texto simples ou LRC (`[01:23.45]linha`) para sincronizar.

## Tradução da letra
- Em cada faixa, `translation` recebe a tradução. Pode ser LRC com os mesmos tempos da original (casa pelo tempo, tolerância ~0,8 s) ou texto simples com uma linha por linha cantada (linhas em branco são ignoradas).
- O botão **PT** na caixa de letra liga/desliga a tradução (a escolha fica salva). Ele só aparece nas faixas que têm tradução.

## Como o design funciona
- **Dois mundos** (ideia de *Demian*): luz (#FDFDFD / #0F0F0F) e sombra (negativo). A troca é um círculo que cresce a partir do botão que a causou (View Transitions; sem suporte, troca direto). Auto: tocando = sombra, parado = luz.
- **Fundo**: cada faixa mostra em escala gigante um círculo da capa (`motif`), numa posição e tamanho próprios (`POSES` em `js/ui.js`). Gira devagar enquanto toca.
- **Lista**: o marcador de cada faixa é o círculo da capa do seu tipo (solo = glitch, grupo = listras, unit = círculo liso, intro/interlude = escuro).
- **Cabeçalho de pôster**: WINGS na largura toda, com a capa recortada só nos círculos pousada sobre as letras.
- **Player**: play grande domina; título em serifada itálica; barra listrada.
- **Letra**: coluna maior e fixa; botão de tela cheia (Esc sai).
- **Textura**: grão sobre a tela e bordas levemente irregulares (filtro SVG `#rough`).

## Avisos
- Durações vieram da Wikipedia; confira com seus arquivos.
- Os círculos vêm de uma capa de 640 px: foram ampliados e reforçados em contraste (`scripts`/Pillow), mas com uma capa maior ficariam ainda melhores.
- `awards` e `technicalCredits` vazios escondem os botões correspondentes.
