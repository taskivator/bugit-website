# Privacidade — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Um resumo em linguagem simples do que o Software coleta e do que não coleta. Tudo
é executado na sua própria máquina.

## O que o Software envia à Taskivator

A única coisa que o Software nos envia são **dados de licença/atualização**:

- sua **chave de licença**,
- uma **impressão digital de dispositivo anônima, com hash de mão única** — um hash
  de 16 caracteres derivado de atributos básicos da máquina. Ele não pode ser
  revertido para identificar você ou o seu hardware, e
- **somente se você definir um durante a configuração inicial**, um rótulo de
  assento curto que você escolheu, para que os assentos de uma licença Team possam
  ser diferenciados (por exemplo, um nome, um nome de usuário ou um e-mail — nunca
  precisa ser real, e nunca é verificado). Se você não definir um, ele simplesmente
  nunca é enviado.

Esses dados vão apenas para o servidor de licenças da Taskivator, e apenas para
ativar/verificar o seu assento e para checar se há uma versão mais nova disponível.
**Sem telemetria, sem analytics, sem rastreamento, sem publicidade — jamais.**

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

O site bugit.dev usa o Cloudflare Web Analytics, um serviço que prioriza a privacidade, para medir o desempenho das páginas e o número de visitas. Ele não usa cookies e não rastreia você entre sites.

Com o seu consentimento, o site também usa a medição do Google (Google Ads) para avaliar o desempenho da nossa publicidade. Ela fica desativada até você escolher Aceitar tudo ou ativar Publicidade no banner de cookies, e você pode alterar ou retirar sua escolha a qualquer momento pelo link Preferências de cookies no rodapé. Quando você permite, podemos compartilhar o valor, a moeda e uma referência de pedido não pessoal de uma compra para que uma venda possa ser atribuída a um anúncio. Nunca compartilhamos o conteúdo dos seus relatórios de bug, os dados do seu cartão de pagamento ou qualquer coisa que você digite no produto.

Isso se aplica apenas ao site. O Software em si não envia nenhum tipo de análise, publicidade ou rastreamento, como descrito acima.

## Contato

Dúvidas sobre privacidade? Acesse **bugit.dev** e abra um ticket de suporte a
partir do seu painel do BugIt — teremos prazer em ajudar.
