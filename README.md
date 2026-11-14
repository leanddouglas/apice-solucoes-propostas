# Ápice Soluções — Fachadas em 3D e gerador de propostas

Site estático (HTML, CSS e JavaScript puro) para apresentar a edificação em 3D ao cliente e gerar propostas/orçamentos de fachada em PDF. Não precisa de instalação nem de compilação.

## Como abrir

- **Mais simples:** dê dois cliques em `index.html`. Funciona offline, porque o Three.js está incluído na pasta `vendor/`.
- **Recomendado (servidor local):** na pasta do projeto, rode `python3 -m http.server 8000` e acesse `http://localhost:8000`.

Navegadores testados: Chrome/Edge atuais. Firefox e Safari recentes também devem funcionar (WebGL é necessário para o 3D. Sem ele, o orçamento continua funcionando).

## O que o site faz

1. **Animação "da planta ao 3D"** (botão **Ver construção**): planta baixa em linhas técnicas sobre fundo azul, estrutura em arame com cotas em metros, extrusão pavimento a pavimento e transição para o modelo realista, com materiais, luz, sombras suaves e reflexos no vidro. Respeita a opção do sistema "reduzir movimento".
2. **Gerador de proposta**: dados do cliente e da obra, dimensões da edificação, fachadas incluídas, desconto de vãos, serviço, acabamento e cor. O modelo 3D muda na hora e a área medida é calculada automaticamente.
3. **Itens e valores**: itens automáticos (quantidade = área medida), itens do catálogo ou em branco, desconto (% ou R$), impostos (%), total em R$.
4. **Proposta para imprimir ou salvar em PDF**: botão **Visualizar proposta** e depois **Imprimir / Salvar PDF**. Inclui uma imagem do modelo 3D, o número da proposta, os itens, os totais, as condições e as linhas de assinatura.
5. **Salvar, abrir, duplicar e excluir** propostas (ficam no navegador), **exportar/importar JSON** e **backup** de todas as propostas.

## Onde editar dados da empresa e preços

Tudo fica em **`js/config.js`**:

- `empresa`: nome, slogan, CNPJ, telefone, e-mail, site, endereço, responsável técnico e registro (CREA/CAU).
- `empresa.logoUrl`: para usar o logotipo em imagem, coloque o arquivo em `assets/` (ex.: `assets/logo.png`) e informe o caminho. Se ficar vazio, aparece a marca em texto.
- `servicos`: serviços principais e preço por m².
- `acabamentos`: acabamentos (ACM, pele de vidro, porcelanato, pastilha, textura, concreto e tijolinho), preço por m² e cor padrão.
- `itensExtras`: itens do botão "Adicionar item" (mobilização, andaime, balancim, ART etc.).
- `padroes`: dimensões iniciais, validade, prazo, forma de pagamento, impostos e observações.
- `prefixoProposta`: prefixo da numeração (ex.: `APC-2026-0001`).
- `precosSaoExemplo`: enquanto estiver `true`, a proposta impressa mostra a faixa "MODELO — VALORES DE EXEMPLO". **Todos os preços que vêm no arquivo são valores de exemplo.** Cadastre os preços reais e mude para `false`.

Depois de editar, salve o arquivo e recarregue a página.

## Como hospedar

É um site estático. Basta publicar a pasta inteira:

- **Netlify (arrastar e soltar):** acesse app.netlify.com/drop e arraste a pasta `apice-solucoes`.
- **GitHub Pages:** crie um repositório, envie os arquivos para a branch `main` (ou `gh-pages`) e, em *Settings → Pages*, escolha a branch e a pasta raiz.
- **Cloudflare Pages / Vercel:** novo projeto estático, sem comando de build e com a pasta de saída na raiz.

As propostas salvas ficam no navegador de cada computador. Use **Exportar todas (backup)** para levá-las para outro computador.

## Estrutura

```
index.html            página
css/styles.css        visual (tela)
css/print.css         impressão / PDF da proposta
js/config.js          dados da empresa, preços de exemplo e padrões  ← edite aqui
js/building.js        modelo 3D paramétrico e animação planta → 3D
js/app.js             formulário, cálculos, proposta, salvar/importar
vendor/               Three.js r170 (licença MIT) empacotado para uso offline
assets/               ícone e (opcional) seu logotipo
screenshots/          capturas e vídeo da animação (documentação)
```

O arquivo `vendor/three.bundle.min.js` foi gerado a partir de `vendor/three.bundle.entry.js` com
`npx esbuild three.bundle.entry.js --bundle --minify --format=iife --outfile=three.bundle.min.js` (three@0.170.0). Só é preciso refazer isso se for atualizar a versão do Three.js.
