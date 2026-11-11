# SISTEMA — Caçador

Abra `index.html` no navegador para usar no computador.

## Usar no celular como app (PWA)
O PWA só funciona com o site hospedado em HTTPS (abrir o arquivo direto não instala).

1. Hospede a pasta de graça:
   - **GitHub Pages:** crie um repositório, envie todos os arquivos desta pasta, vá em Settings > Pages e escolha a branch main.
   - **Netlify Drop:** arraste a pasta em app.netlify.com/drop.
2. No Android, abra o link no Chrome > menu ⋮ > **Instalar app**.
   No iPhone, abra no Safari > Compartilhar > **Adicionar à Tela de Início**.

## Gerar o .apk
1. Com o site hospedado, acesse **pwabuilder.com** e cole o link.
2. Clique em **Package for stores > Android** e baixe o pacote.
3. Dentro do zip há o arquivo `.apk` para instalar direto no celular
   (ative "instalar apps desconhecidos"). A Play Store exige conta de desenvolvedor (US$ 25).

## Backup
O progresso fica salvo só no aparelho. Em **Status > Dados** use "Exportar progresso"
para guardar um arquivo e "Importar progresso" para restaurar ou levar para outro aparelho.
Navegador e app instalado têm progressos separados: use exportar/importar para passar de um para o outro.

## Ajustes
- XP por missão, níveis e ranks: início de `js/app.js` (`XP`, `RANKS`, `LEVEL_XP`).
- Se mudar qualquer arquivo depois de hospedar, aumente o número em `sw.js` (`CACHE = 'sistema-v1'`).
