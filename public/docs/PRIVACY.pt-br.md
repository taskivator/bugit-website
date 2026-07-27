# Privacidade — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Um resumo em linguagem simples do que o Software coleta e do que não coleta. Tudo
é executado na sua própria máquina.

## O que o Software envia à Taskivator

O BugIt é ativado por meio do seu navegador web: você entra na sua própria conta
BugIt no Portal do BugIt e aprova este dispositivo. **Não há nenhuma chave de
licença** para inserir, colar ou compartilhar.

Para ativar e manter a sua licença válida, o Software envia apenas o necessário para
vincular o seu direito de uso a esta instalação e a este dispositivo — **dados de
licença/ativação**:

- um **identificador de instalação** — um valor aleatório criado uma única vez para
  esta instalação do BugIt. Ele não é derivado do seu hardware e não identifica você,
- uma **impressão digital de dispositivo anônima, com hash de mão única** — um hash
  de 16 caracteres derivado de atributos básicos da máquina. Ele não pode ser
  revertido para identificar você ou o seu hardware,
- um **rótulo de dispositivo** — o nome de host do seu computador, para que você
  possa reconhecer este dispositivo na sua conta e removê-lo do Portal quando quiser,
- o **nome do seu sistema operacional** e a **versão do BugIt**, para verificar a
  compatibilidade e se há uma atualização disponível, e
- **material de ativação** de curta duração — um desafio de uso único e um token de
  aprovação usados apenas para concluir o login, além de um hash de mão única de um
  segredo local de confirmação. O segredo em si nunca sai da sua máquina, e o desafio
  e o token brutos nunca são armazenados.

O login na sua conta acontece no seu navegador, no Portal. Em troca, o Portal emite
um **direito de uso assinado** vinculado a este dispositivo e a esta instalação, que
o Software verifica localmente.

Esses dados vão apenas para o Portal do BugIt, e apenas para ativar e verificar a sua
licença, gerenciar os seus dispositivos e checar se há uma versão mais nova
disponível. Quando você baixa uma atualização, o Portal também registra o download —
incluindo o endereço IP da solicitação e o user-agent do navegador — para fins de
segurança e prevenção de abuso.

## O que permanece inteiramente no seu dispositivo

- Suas especificações, glossário, estilo da casa e correções aprendidas
- Seu `config.json` e os arquivos de projeto locais
- Seus tokens de API (mantidos no armazenamento de credenciais do seu SO)

Nada disso é transmitido para lugar algum.

## O que vai apenas para os serviços que *você* conecta

Para redigir e registrar um ticket, o texto do seu relatório é enviado ao modelo de
IA que você usa (GitHub Copilot, ou a sua própria chave OpenAI/Anthropic) e ao
tracker no qual você registra (como o Jira ou o Azure DevOps). Essa é a IA e as
ferramentas que **você** escolheu e conectou — nada disso é encaminhado pela,
copiado para, ou visto pela Taskivator.

## Credenciais

Os tokens de API ficam no armazenamento de credenciais do seu sistema operacional —
nunca em um arquivo, e nunca transmitidos à Taskivator.

## Estatísticas do site

O BugIt usa o Cloudflare Web Analytics para entender o desempenho geral do site e o número de visitas. Esse serviço foi projetado sem cookies de rastreamento entre sites.

Com a sua permissão, também podemos usar a medição do Google Ads para entender se a nossa publicidade gera compras. Você pode gerenciar suas escolhas a qualquer momento nas Preferências de cookies.

Quando a medição de compras está ativada, informações limitadas da transação, como o valor da compra, a moeda e uma referência de pedido exclusiva, podem ser usadas para atribuição. O conteúdo dos relatórios de bug, os dados do cartão de pagamento e as informações inseridas no software BugIt não são compartilhados com o Google Ads.

Essas ferramentas de medição se aplicam apenas ao site e ao portal do BugIt. O software BugIt não usa a medição do Google Ads nem envia telemetria do produto.

## Contato

Dúvidas sobre privacidade? Acesse **bugit.dev** e abra um ticket de suporte a
partir do seu painel do BugIt — teremos prazer em ajudar.
