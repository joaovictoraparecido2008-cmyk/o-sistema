# Como gerar o APK do SISTEMA (sem instalar nada)

O GitHub compila o app sozinho, de graça. Leva uns 5 a 10 minutos.

## 1. Criar o repositório
1. Entre em **github.com** (crie uma conta gratuita se não tiver).
2. Clique em **+ > New repository**, dê o nome `sistema`, deixe **Private** se quiser e clique em **Create repository**.

## 2. Enviar os arquivos
1. Extraia este zip no computador.
2. No repositório novo, clique em **uploading an existing file**.
3. Arraste **todo o conteúdo** da pasta extraída (as pastas `android`, `www`, `.github` e os arquivos soltos).
   Não envie a pasta `node_modules` (ela nem vem no zip).
4. Clique em **Commit changes**.

> Se a pasta `.github` ficou de fora (no Mac ela fica escondida; use Cmd+Shift+. no Finder):
> clique em **Add file > Create new file**, digite o nome `.github/workflows/build-apk.yml`
> e cole o conteúdo do arquivo `build-apk.yml` que está dentro dessa pasta.

## 3. Baixar o APK
1. Abra a aba **Actions** do repositório. O trabalho "Gerar APK" começa sozinho.
   Se não começar, clique em **Gerar APK > Run workflow**.
2. Quando ficar com o ✔ verde, abra a execução e, em **Artifacts**, baixe **SISTEMA-apk**.
3. Extraia o zip: dentro está o `app-debug.apk`.

## 4. Instalar no celular
1. Passe o `app-debug.apk` para o celular (cabo, Drive, WhatsApp...).
2. Toque no arquivo e permita **instalar apps desconhecidos** quando o Android pedir.
3. Abra o **SISTEMA**.

O APK é de "debug" (assinado com a chave de testes), serve para uso pessoal.
Para publicar na Play Store seria preciso gerar uma versão assinada (release).

## Atualizar o app depois
Altere os arquivos dentro da pasta `www` (o site), envie para o repositório e o GitHub gera um APK novo.
O progresso salvo no celular é mantido se você instalar o novo APK por cima do antigo.

## Backup
Em **Status > Dados > Exportar progresso** o app salva o arquivo e abre o menu de compartilhar do Android
(Drive, WhatsApp, e-mail...). Guarde esse arquivo antes de desinstalar o app ou trocar de celular.

## Se o build falhar
Abra a execução com ✖ na aba Actions, clique no passo em vermelho e copie a mensagem de erro para mim.
