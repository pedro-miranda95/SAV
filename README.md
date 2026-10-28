# PALS em Cenários

Treino dos algoritmos PALS / SAV pediátrico com cenários clínicos aleatórios. Cada cenário sorteia idade, peso, causa e evolução, por isso as doses e o caminho no algoritmo mudam sempre. Respondes por voz ou por escrito, e a app marca automaticamente os itens que disseste.

**Algoritmos:** Abordagem Sistemática · Paragem Cardiorrespiratória · Bradicardia com Pulso · Taquiarritmia com Pulso · Choque Sético · Cuidados Após RCE.

## Funcionalidades

- Cenários gerados ao acaso, com doses calculadas para o peso do doente
- Monitor com traçado de ECG e sinais vitais (com os valores normais para a idade)
- **Resposta por voz** (pt-PT): os itens mencionados ficam marcados; nas escolhas, diz "opção dois", "sim" ou "não"
- **Modo mãos-livres:** a app lê o passo em voz alta e fica à escuta; diz "seguinte" para avançar
- Funciona como app no telemóvel (PWA): instalável e com funcionamento offline
- Histórico e pontuação guardados no próprio dispositivo (não há servidor)

## Publicar no GitHub Pages (5 minutos)

1. Cria uma conta em [github.com](https://github.com), se ainda não tiveres.
2. Cria um repositório novo **público**, por exemplo `pals-cenarios`.
3. Carrega todos os ficheiros desta pasta: **Add file → Upload files**. Arrasta o conteúdo da pasta, incluindo a pasta `icons` e o ficheiro `.nojekyll`.
4. Vai a **Settings → Pages**. Em *Build and deployment*, escolhe *Deploy from a branch*, depois a branch `main` e a pasta `/ (root)`. Clica em **Save**.
5. Ao fim de 1 a 2 minutos, a app fica disponível em `https://<o-teu-utilizador>.github.io/pals-cenarios/`.

Partilha esse link. No telemóvel:
- **Android (Chrome):** menu ⋮ → *Instalar app*.
- **iPhone (Safari):** Partilhar → *Adicionar ao ecrã principal*.

### Microfone

O reconhecimento de voz usa a Web Speech API do browser e só funciona por HTTPS (o GitHub Pages já usa HTTPS).

- **Funciona:** Chrome (Android, Windows, Mac) e Safari (iPhone/iPad, iOS 14.5 ou mais recente).
- **Não funciona:** Firefox. Nesse caso, a resposta escrita funciona na mesma.
- No Chrome, o reconhecimento é feito na cloud da Google, por isso precisa de internet.

## Estrutura

| Ficheiro | O que tem |
|---|---|
| `index.html` | Página base |
| `styles.css` | Aspeto (tema claro/escuro, mobile-first) |
| `logic.js` | **Cenários e algoritmos**: geradores, doses, textos. É aqui que se acrescentam casos. |
| `app.js` | Interface, voz, leitura em voz alta, PWA |
| `sw.js` | Funcionamento offline |
| `manifest.webmanifest`, `icons/` | Instalação como app |

### Acrescentar um caso clínico

Em `logic.js`, cada algoritmo tem uma lista de casos (por exemplo, `causes` em `genPCR` e `cs` em `genBradi`). Copia um caso existente e altera o texto, a causa e os grupos etários. Os passos e as doses são gerados a partir daí.

Depois de alterares os ficheiros, aumenta a `VERSION` em `sw.js` (por exemplo, `pals-v3`). Assim, os telemóveis que já instalaram a app recebem a atualização.

## Aviso

Ferramenta de estudo **não oficial**. Os algoritmos, doses e valores de referência estão resumidos a partir do material PALS da American Heart Association (edição 2025). Não substitui o manual, a formação certificada nem o julgamento clínico. O material original da AHA está protegido por direitos de autor: não carregues os PDFs do curso para este repositório.
