# Política de Privacidade do BugIt

> **Aviso sobre a tradução.** Este documento foi traduzido automaticamente e não passou por revisão de falantes nativos. A versão em inglês é a que prevalece: em caso de divergência, vale o texto em inglês. Para a redação mais precisa e atual, consulte o documento em inglês.

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Última atualização: 26 de setembro de 2026**

Esta política explica quais dados pessoais tratamos quando você usa o site do BugIt
(bugit.dev), o BugIt Portal (gerenciamento de conta, compra e licenças) e o software
BugIt QA Agent, bem como as escolhas e os direitos que você tem.

## Operador e contato de privacidade

O BugIt é operado sob o nome comercial Taskivator. Dúvidas sobre privacidade,
solicitações relativas a dados pessoais e pedidos da razão social e dos dados de
contato comerciais do operador podem ser enviados para
[support@bugit.dev](mailto:support@bugit.dev). As informações solicitadas sobre o
operador são fornecidas sem demora.

## Em resumo

- O software BugIt é executado na sua própria máquina. Seus relatórios de bugs,
  especificações, glossários, capturas de tela, código, configurações e tickets não
  são transmitidos à Taskivator.
- Para operar sua conta, sua compra, sua licença e o suporte, o site e o Portal
  tratam uma quantidade limitada de dados pessoais.
- Não vendemos dados pessoais. A medição de publicidade fica desativada por padrão e
  só funciona se você a ativar.

## O que o software BugIt envia para nós

O BugIt é ativado pelo navegador: você entra no BugIt Portal e aprova o dispositivo.
Não há chave de licença para digitar ou guardar. Do seu dispositivo, o software envia
somente o necessário para operar sua licença:

- um **identificador de instalação**, que distingue esta cópia do BugIt para que uma alteração
  na sua licença seja aplicada à instalação correta,
- uma **impressão digital do dispositivo com hash**: um hash unidirecional de 16 caracteres de
  atributos estáveis da máquina, usado para reconhecer o mesmo computador para limites de
  dispositivos e prevenção de fraude. Recebemos o hash, nunca os atributos que o originaram,
- um **rótulo do dispositivo**, que é o nome de rede do seu computador, para que você possa
  reconhecer e diferenciar os seus próprios dispositivos na sua conta,
- o **nome do sistema operacional** e sua versão, e a **versão do BugIt**, para que possamos
  informar se há uma versão mais recente,
- o **filtro de plano** que você escolheu ao iniciar a ativação: Solo, Team ou nenhuma
  preferência. Ele apenas reduz a lista de licenças que o Portal oferece para você
  aprovar. Nunca nomeia uma licença específica, e o BugIt nunca envia um identificador
  de direito de uso, de time, de associação ou de assento: essa escolha é sua, com você
  conectado, no seu navegador,
- **material de ativação** de curta duração: um valor aleatório criado para aquela única
  solicitação, mantido apenas em memória e nunca gravado em disco. Ele comprova que a aprovação
  que você deu no navegador pertence àquela solicitação e não pode ser reutilizada.
- o **token de aprovação de uso único** do link que o seu navegador abriu. Ele volta
  para nós enquanto o BugIt espera a sua aprovação e mais uma vez para concluir a
  ativação. Fomos nós que o emitimos, ele vale só para aquela ativação e não diz nada
  sobre você.
- um **segredo de confirmação** por ativação: um segundo valor aleatório, gerado no seu
  dispositivo e guardado no armazenamento protegido do seu sistema operacional. Recebemos o
  hash dele ao ativar e novamente em uma verificação posterior, se o seu dispositivo ainda
  não tiver um. Se o seu acesso for retirado da sua conta depois disso, o próprio valor é
  enviado uma vez, para que possamos saber que este dispositivo recebeu a retirada.

Em troca, o seu dispositivo recebe um **direito de uso assinado** que registra o que você está
licenciado a usar e até quando.

Esses dados vão para o serviço de licenças da Taskivator, para ativar e verificar seu
assento e para checar se há uma versão mais recente.

## O que permanece no seu dispositivo

- Suas especificações, glossários, estilo editorial e correções aprendidas
- Seu arquivo `config.json` e seus arquivos locais de projeto
- Seus tokens de API, guardados no cofre de credenciais do sistema operacional

Essas informações não são transmitidas à Taskivator.

## O que vai para os serviços que você conecta

Para redigir e registrar um ticket, o texto do seu relatório é enviado ao provedor de
IA que você usa (GitHub Copilot, ou sua própria chave da OpenAI ou da Anthropic) e ao
rastreador em que você registra, como Jira ou Azure DevOps. São os serviços que você
escolheu e conectou, e as informações enviadas a eles não passam pela Taskivator nem
são copiadas para ela. Os provedores de IA e rastreadores conectados tratam as
informações segundo seus próprios termos e políticas de privacidade, portanto
recomendamos consultá-los antes de conectar um serviço.

## Dados pessoais que tratamos para o site e o Portal

- **Dados de conta e de acesso**, incluindo seu e-mail, para criar e proteger sua
  conta
- **Registros de compra e de pedido**, incluindo recibos e registros fiscais
- **Dados de pagamento**, tratados pelo nosso processador de pagamentos. Não
  armazenamos números completos de cartão.
- **Direitos de uso e licenças**, para entregar e verificar o que você comprou
- **Ativações de dispositivos**, incluindo o identificador de instalação, a impressão digital
  do dispositivo com hash, o rótulo do dispositivo e o nome do sistema operacional e a versão do
  BugIt, para que os limites de dispositivos funcionem e você possa gerenciar os seus próprios
  dispositivos
- **Participação em Team e convites**, para o plano Team
- **Reembolsos, contestações e estornos**, quando ocorrerem
- **Correspondência de suporte**, para podermos responder a você
- **Registros de segurança e administração**, para detectar abusos e manter uma
  trilha de auditoria
- **As configurações de conexão que você salva** para rastreadores como Jira ou
  Azure DevOps. Guardamos as configurações de conexão, não o conteúdo existente
  nessas ferramentas.
- **Suas escolhas de consentimento** sobre cookies e medição de publicidade,
  incluindo a retirada, e a confirmação registrada na finalização da compra onde um
  mercado a exige
- **Dados de rede registrados com algumas solicitações**: o endereço IP e o agente de
  usuário do navegador armazenados com a confirmação que você dá na finalização da
  compra, o endereço IP de onde vem uma solicitação de ativação, e o endereço IP e o
  agente de usuário de cada download do software

Usamos esses dados para fornecer e dar suporte ao produto que você comprou, receber o
pagamento e cumprir nossas obrigações fiscais e contábeis, manter contas e licenças
seguras e, quando você tiver consentido, medir a publicidade. Dependendo de onde você
mora, a base legal costuma ser a execução do nosso contrato com você, o cumprimento
de obrigação legal, nosso legítimo interesse em manter o serviço seguro ou o seu
consentimento.

## O assistente “Pergunte ao BugIt” no Portal

O Portal inclui o “Pergunte ao BugIt”, um assistente que responde a perguntas sobre o
BugIt e sobre a sua conta. Muitas respostas são preparadas com antecedência e redigidas
sem um modelo de IA. Quando o assistente redige uma resposta com seu modelo de IA, a sua
pergunta, a conversa até aquele momento e um resumo da sua conta são enviados à
Anthropic, que os trata em nosso nome para redigir a resposta. O resumo contém:

- seu nome e o e-mail com que você entra
- suas licenças: plano, status, datas de compra e de término, assentos, o nome que você
  tiver dado a elas e a chave de licença oculta, exceto o último grupo
- seus dispositivos: nome, sistema operacional, versão do BugIt e quando cada um foi
  visto pela última vez
- seu Team, se você fizer parte de um: nome, sua função, status e quando a licença dele
  termina
- seus pedidos: valores, datas de pagamento, reembolsos e estornos
- seus tickets de suporte: quantos estão abertos e os cinco tickets atualizados mais
  recentemente, qualquer que seja o status, cada um com assunto, status, categoria e os
  primeiros 600 caracteres da mensagem

O resumo nunca contém uma chave de licença completa nem os dados do seu cartão ou do seu
banco. O texto que você mesmo digita é enviado exatamente como você escreveu, por isso
pedimos que não digite no assistente dados de cartão, bancários ou outras informações
sensíveis. O assistente remove senhas e tokens de acesso reconhecíveis antes de qualquer
envio, mas não consegue reconhecer tudo.

A conversa fica guardada na aba do seu navegador e é apagada quando você sai da conta. Não a
armazenamos em nossos servidores, a menos que você envie um ticket de suporte pelo assistente
e opte por incluir a conversa. Para que um limite mensal de uso possa ser aplicado,
registramos quanto custam, a cada mês, as respostas com IA do assistente para a sua conta.

## Prestadores de serviços

Utilizamos prestadores de serviços para autenticação e hospedagem, processamento de
pagamentos, e-mail transacional, entrega e segurança do site, respostas com IA do assistente
do Portal e medição de publicidade baseada em consentimento. Esses prestadores tratam apenas
as informações necessárias para nos prestar seus serviços e não podem usá-las para fins
próprios.

Os principais prestadores são Supabase (contas e banco de dados), Stripe (pagamentos,
reembolsos e contestações), Vercel (hospedagem do Portal), Cloudflare (entrega e segurança do
site e análise sem cookies), Resend (e-mail transacional), Anthropic (respostas com IA do
assistente do Portal) e Google (medição de publicidade, somente com o seu consentimento).

Alguns desses prestadores operam fora do seu país, inclusive nos Estados Unidos.
Quando há transferência internacional de dados pessoais, apoiamo-nos nas cláusulas de
proteção de dados oferecidas pelo prestador.

A medição de publicidade nunca recebe seus relatórios de bugs, o conteúdo do software
BugIt nem os dados do seu cartão de pagamento.

## Por quanto tempo guardamos os dados

Guardamos dados pessoais apenas enquanto necessários à finalidade para a qual foram
coletados e, depois, os excluímos ou anonimizamos. Na prática:

- Registros de conta, licença e dispositivos são mantidos enquanto sua conta e sua
  licença estiverem ativas e por um período limitado depois, para podermos tratar
  suporte e contestações.
- Registros de pagamento, fiscais e contábeis são mantidos pelo período exigido por
  lei.
- Mensagens de suporte, registros de segurança e registros de consentimento são
  mantidos por um período limitado; os de consentimento servem como prova de que sua
  escolha foi respeitada.

Se você excluir sua conta, excluímos ou anonimizamos seus dados, exceto os registros
que somos obrigados a manter.

## Cookies e publicidade

O site usa cookies essenciais para funcionar. Cookies de publicidade ficam
desativados por padrão e só são carregados se você os ativar no aviso de cookies ou
em **Preferências de cookies**. Usamos o Cloudflare Web Analytics para acompanhar o
desempenho geral do site; ele funciona sem cookies e não rastreia você entre sites.
Você pode alterar ou retirar sua escolha a qualquer momento.

Os vídeos do site são incorporados do YouTube. Nada é solicitado ao YouTube até você tocar em reproduzir: até lá a página mostra apenas uma imagem servida por nós. Quando você toca em reproduzir, o player é carregado de youtube-nocookie.com, o host de privacidade reforçada do YouTube, e o Google recebe seu endereço IP e o vídeo escolhido para poder reproduzi-lo. Se você nunca tocar em reproduzir, a seção de vídeos não envia nada ao Google.

## Seus direitos

Dependendo de onde você mora, por exemplo sob o GDPR da UE ou do Reino Unido, a LGPD
brasileira ou a APPI japonesa, você pode ter o direito de acessar os dados pessoais
que mantemos sobre você, corrigi-los, excluí-los, restringir ou se opor a
determinados tratamentos, recebê-los em formato portável e retirar o consentimento a
qualquer momento, sem afetar o tratamento já realizado.

Para exercer qualquer um desses direitos, escreva para
[support@bugit.dev](mailto:support@bugit.dev) a partir do endereço da sua conta. Pelo
painel, você também pode baixar por conta própria uma cópia dos dados da sua conta, em
PDF ou em um arquivo JSON legível por máquina, e excluir sua conta. Responderemos dentro
do prazo exigido pela lei aplicável a você.

Se não ficar satisfeito, você pode apresentar reclamação à autoridade de proteção de
dados: no Brasil, à ANPD (gov.br/anpd); no EEE, à autoridade local; no Reino Unido, à
Information Commissioner's Office (ico.org.uk); no Japão, à Personal Information
Protection Commission (ppc.go.jp). Agradecemos a oportunidade de resolver sua questão
antes disso.

## Alterações

Podemos atualizar esta política conforme o produto ou a legislação mudarem. A data
acima indica a versão vigente. Consulte também a página
[Transações Comerciais](#/docs/commerce) (特定商取引法に基づく表記) e a
[Política de Reembolso](#/docs/refund).

## Contato

Dúvidas ou solicitações de privacidade:
[support@bugit.dev](mailto:support@bugit.dev).
