# Política de Privacidade — BugIt

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Última atualização: 1 de agosto de 2026**

Esta política explica quais dados pessoais são tratados quando você usa o site do
BugIt (bugit.dev), o BugIt Portal (gerenciamento de conta, compra e licenças) e o
software BugIt QA Agent, bem como as escolhas e os direitos que você tem. Ela é escrita
em linguagem clara e pretende ser fiel ao modo como o produto realmente funciona.

## Quem é responsável pelos seus dados

O BugIt é operado sob o nome comercial **Taskivator / BugIt**. O contato operacional
para todas as questões e solicitações de privacidade é **support@bugit.dev**.

**O proprietário optou por não publicar os dados pessoais de identificação do
controlador de dados. Isso permanece um risco de conformidade legal aceito e não
recebeu aprovação jurídica externa.** Um nome comercial isoladamente não cumpre a
obrigação legal de identificar o controlador de dados; portanto, essa obrigação
**não** é considerada cumprida por esta política. Por esse motivo, os dados
registrados de identidade do controlador não são publicados; quando a lei lhe der
direito a eles, você pode solicitá-los em support@bugit.dev.

## A versão curta

- O **software QA Agent é executado na sua máquina.** Seus relatórios de bug,
  especificações, glossário, capturas de tela, código, configurações e tickets **não**
  são enviados à Taskivator.
- Para operar sua conta, sua compra, sua licença e o suporte, o **site e o Portal**
  tratam um conjunto limitado de dados pessoais (seu e-mail, registros de compra,
  licenças e ativações de dispositivos e mensagens de suporte), usando os provedores
  de serviço listados abaixo.
- **Não** vendemos seus dados pessoais. A medição de publicidade fica **desativada por
  padrão** e é executada somente com o seu consentimento.

## O que o software QA Agent envia à Taskivator

O BugIt usa **ativação baseada em navegador** — você faz login no BugIt Portal no seu
navegador e aprova o dispositivo; **não há nenhuma chave de licença** para inserir,
colar ou armazenar. Do seu dispositivo, o software envia apenas dados de
licença/atualização:

- um **registro assinado de direito de uso / ativação de dispositivo** proveniente
  desse login no Portal (para que o seu dispositivo possa ser autorizado e
  reverificado) e a versão do aplicativo,
- uma **impressão digital de dispositivo anônima, com hash de mão única** — um hash de
  16 caracteres derivado de atributos básicos da máquina; ele não pode ser revertido
  para identificar você ou o seu hardware, e
- **somente se você definir um durante a configuração inicial**, um rótulo curto de
  dispositivo/assento que você escolher, para que as autorizações de dispositivos de
  uma conta Team possam ser diferenciadas. Nunca é exigido que seja real e nunca é
  verificado. Se você não definir um, nada é enviado.

Esses dados vão apenas para o serviço de licenças da Taskivator, para ativar/verificar
o seu assento e verificar se há uma versão mais nova disponível.

## O que permanece inteiramente no seu dispositivo

- Suas especificações, glossário, estilo da casa e correções aprendidas
- Seu `config.json` e os arquivos de projeto locais
- Seus tokens de API (mantidos no armazenamento de credenciais do seu sistema
  operacional — nunca em um arquivo e nunca transmitidos à Taskivator)

Nada disso é transmitido para lugar algum.

## O que vai apenas para os serviços que *você* conecta

Para redigir e registrar um ticket, o texto do seu relatório é enviado ao modelo de IA
que você usa (GitHub Copilot, ou a sua própria chave OpenAI/Anthropic) e ao tracker no
qual você registra (como o Jira ou o Azure DevOps). Essa é a IA e as ferramentas que
**você** escolheu e conectou — nada disso é encaminhado pela, copiado para, ou visto
pela Taskivator, que não é a controladora desses serviços. Apenas os metadados
necessários para o registro (id/URL do item e o conteúdo que você aprovar) são
trocados com eles.

## Dados pessoais que tratamos, e por quê (site + Portal)

| Dados | Por quê (finalidade) | Base legal (GDPR/UK GDPR) |
|-------|----------------------|---------------------------|
| E-mail da conta + dados de autenticação | Criar e proteger sua conta, fazer seu login, MFA de administrador | Contrato; legítimo interesse (segurança da conta) |
| Direitos de uso / licenças | Entregar e verificar o que você comprou | Contrato |
| Ativações de dispositivos (impressão digital com hash, rótulo opcional, versão do SO/do app) | Aplicar os limites por dispositivo/assento; permitir que você gerencie dispositivos | Contrato |
| Participação em Team + convites | Fornecer o plano Team (até 5 membros) | Contrato |
| Registros de compra / pedido | Cumprir a venda, recibos, emissão de licença | Contrato; obrigação legal (contabilidade) |
| Dados de pagamento | Receber o pagamento (tratado pela Stripe — não armazenamos os números completos de cartão) | Contrato |
| Reembolsos / disputas / chargebacks | Tratar reembolsos e disputas de pagamento | Contrato; obrigação legal |
| Registros fiscais | Cumprir obrigações fiscais/contábeis | Obrigação legal |
| Correspondência de suporte | Responder às suas perguntas e prestar suporte | Contrato; legítimo interesse |
| Registros de segurança, de log e de auditoria de administração | Detectar abusos, proteger contas, manter uma trilha de auditoria | Legítimo interesse (segurança) |
| Configuração de provedor/tracker que você salva | Permitir que você conecte Jira/Azure DevOps etc.; armazenamos metadados de conexão, não os seus dados nessas ferramentas | Contrato |
| Escolhas de consentimento (cookies/anúncios e sua retirada) | Respeitar e comprovar suas escolhas | Consentimento; obrigação legal (comprovação) |
| Análise do site | Entender o desempenho geral do site (sem cookies) | Legítimo interesse |
| Medição de publicidade | Entender se os anúncios levam a compras | Consentimento (desativada por padrão) |
| Consentimento UE/RU de entrega imediata / arrependimento | Comprovar seu reconhecimento no checkout | Obrigação legal; contrato |

## Provedores de serviço (operadores) e transferências internacionais

Usamos os provedores a seguir para operar o BugIt. Cada um trata dados pessoais apenas
para nos prestar o seu serviço. Quando dados pessoais são transferidos para fora do
EEE/do Reino Unido, apoiamo-nos no Adendo de Tratamento de Dados do provedor e, quando
aplicável, nas Cláusulas Contratuais Padrão (ou em um mecanismo de transferência
equivalente).

| Provedor | Finalidade | Categorias de dados | Local provável de tratamento | Base da transferência | Retenção / exclusão |
|----------|------------|---------------------|------------------------------|-----------------------|----------------------|
| **Supabase** | Banco de dados + autenticação (contas, direitos de uso, dispositivos, pedidos, logs de auditoria) | Dados de conta, direito de uso, dispositivo, pedido e log | Estados Unidos e/ou UE (região do projeto) | Adendo de tratamento + Cláusulas Contratuais Padrão quando aplicável | Mantidos enquanto sua conta estiver ativa; excluídos ou anonimizados quando não forem mais necessários (ver a tabela de retenção) |
| **Stripe** | Processamento de pagamentos, reembolsos, disputas, cálculo de impostos | Dados de pagamento, faturamento e transação | Estados Unidos + global | Adendo de tratamento + Cláusulas Contratuais Padrão | Retidos pela Stripe conforme sua política e os requisitos legais/contábeis |
| **Cloudflare** | Entrega do site, segurança, análise web sem cookies | Dados de rede/técnicos; análise agregada | Rede edge global | Adendo de tratamento + Cláusulas Contratuais Padrão | De curta duração; a análise é agregada e sem cookies |
| **Vercel** | Hospedagem do aplicativo do site/Portal | Dados de requisição/técnicos | Estados Unidos + global | Adendo de tratamento + Cláusulas Contratuais Padrão | Logs operacionais mantidos por curto prazo |
| **Resend** | Envio de e-mail transacional (recibos, licença, suporte) | Endereço de e-mail, metadados da mensagem | Estados Unidos | Adendo de tratamento + Cláusulas Contratuais Padrão | Retidos conforme a política do provedor; logs de entrega por curto prazo |
| **Google Ads** | Medição de publicidade (somente com consentimento) | Valor da compra, moeda, referência de pedido não identificadora | Estados Unidos + global | Adendo de tratamento + Cláusulas Contratuais Padrão | Somente com consentimento; nenhum conteúdo de bug ou dado de cartão é compartilhado |

**Não** vendemos dados pessoais, e a medição de publicidade nunca recebe seus
relatórios de bug, o conteúdo do software BugIt ou os detalhes do cartão de pagamento.

## Por quanto tempo mantemos os dados (retenção)

Quando um prazo não é fixado por lei, mantemos os dados apenas pelo tempo necessário à
finalidade e, em seguida, os excluímos ou anonimizamos.

| Categoria | Retenção |
|-----------|----------|
| Contas | Enquanto ativas; excluídas/anonimizadas após a exclusão da conta (sujeito a retenções legais) |
| Registros de autenticação | Enquanto a conta estiver ativa |
| Direitos de uso / licenças | Durante a vigência da licença e por um período limitado depois, para suporte e disputas |
| Dispositivos / ativações | Enquanto o direito de uso estiver ativo; liberados quando você remove um dispositivo ou a licença termina |
| Participações em Team / convites | Enquanto a licença Team estiver ativa; os convites expiram |
| Pagamentos | Durante a vigência da licença mais o período exigido para contabilidade/impostos |
| Reembolsos / disputas / chargebacks | Durante o período necessário para tratá-los e comprová-los, mais os períodos contábeis |
| Registros fiscais / contábeis | Conforme exigido pela legislação fiscal aplicável (por exemplo, até 7 anos) |
| Logs de segurança | Um período limitado suficiente para segurança e detecção de abusos |
| Logs de auditoria de administração | Retidos como registro de integridade por um período limitado |
| Correspondência de suporte | Enquanto necessária para atendê-lo e por um período limitado depois |
| Consentimento de marketing | Enquanto o consentimento permanecer e depois como comprovação |
| Retiradas de consentimento | Retidas como comprovação de que uma escolha foi respeitada |
| Backups de contas excluídas | Purgados dos backups de rotina dentro do ciclo normal de rotação de backups após a exclusão |

## Cookies e publicidade

O site usa apenas cookies essenciais para funcionar. Cookies não essenciais (de
publicidade) ficam **desativados por padrão** e só são carregados se você optar por
eles no banner de cookies ou nas **Preferências de cookies**. Usamos o Cloudflare Web
Analytics, que não usa cookies e não rastreia você entre sites. Você pode alterar ou
retirar sua escolha a qualquer momento.

## Seus direitos

Dependendo de onde você mora (por exemplo, sob o GDPR da UE/RU ou a APPI do Japão),
você pode ter o direito de:

- **Acessar** os dados pessoais que mantemos sobre você
- **Corrigir** dados imprecisos
- **Excluir** seus dados (e sua conta)
- **Restringir** ou **se opor a** determinados tratamentos
- **Portabilidade** — receber determinados dados em um formato portável
- **Retirar o consentimento** (por exemplo, da medição de publicidade) a qualquer
  momento, sem afetar o tratamento lícito anterior

Para exercer qualquer um desses direitos, envie um e-mail para **support@bugit.dev** a
partir do endereço da sua conta. Você também pode **excluir sua conta** para remover
seus dados (sujeito aos registros que devemos manter por lei, como registros fiscais).
Responderemos dentro do prazo exigido pela legislação aplicável.

**Reclamações.** Se você estiver no EEE, pode reclamar à sua autoridade local de
proteção de dados; no Reino Unido, ao Information Commissioner's Office (ico.org.uk);
no Japão, à Personal Information Protection Commission (ppc.go.jp). Agradeceríamos a
oportunidade de resolver primeiro a sua preocupação em support@bugit.dev.

## Alterações

Podemos atualizar esta política conforme o produto ou a lei mudar; a data de "última
atualização" acima reflete a versão atual. Documentos relacionados: a divulgação de
Transações Comerciais (特定商取引法に基づく表記 — informações nos termos da Lei
japonesa sobre Transações Comerciais Específicas) e a Política de Reembolso.

## Contato

Perguntas ou solicitações de privacidade: **support@bugit.dev**. Você também pode
abrir um ticket de suporte a partir do seu painel do BugIt em **bugit.dev**.
