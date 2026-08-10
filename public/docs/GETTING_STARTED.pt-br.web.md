# Primeiros passos com o BugIt

> **Aviso sobre a tradução.** Este documento foi traduzido automaticamente e não passou por revisão de falantes nativos. A versão em inglês é a que prevalece: em caso de divergência, vale o texto em inglês. Para a redação mais precisa e atual, consulte o documento em inglês.

O BugIt transforma anotações informais de teste em relatórios de bug revisados dentro do VS Code. Windows 11 com VS Code e GitHub Copilot é o caminho de cliente qualificado para a versão.

## Antes de começar

- Instale a versão mais recente do VS Code e faça login no GitHub Copilot.
- Instale um interpretador Python 3.10 a 3.13 qualificado para a versão.
- Baixe o BugIt no painel da sua conta e descompacte-o em uma pasta local.
- Mantenha tokens, dados de clientes e código-fonte privado fora do chat e dos arquivos de configuração.

## Ative e configure

- Abra a pasta descompactada do BugIt como um workspace confiável do VS Code.
- No Copilot Chat, selecione o Agente de QA do BugIt e digite `Activate` (acrescente `--solo` ou `--team` se a sua conta tiver ambos).
- O BugIt abre o BugIt Portal no seu navegador. Entre com a sua própria conta BugIt: a sua senha permanece no navegador e nunca é digitada no VS Code.
- Escolha o direito Solo ou Team para esta máquina e, em seguida, revise e aprove este dispositivo.
- Volte ao VS Code. O BugIt conclui a autorização automaticamente: não há nenhuma chave de licença para copiar, colar ou exibir.
- Digite `Begin setup` e escolha somente as integrações que a sua equipe utiliza.
- Deixe o BugIt verificar o serviço e o projeto selecionados antes de registrar um ticket.

## Gerencie seu acesso

- Uma instalação usa um único direito ativo por vez. Para mudar esta máquina para outro direito Solo ou Team, digite `Switch license` e aprove novamente no navegador; se cancelar, o seu direito atual é mantido.
- `Deactivate` remove o direito apenas desta máquina. Assentos, dispositivos, associações, funções e cobrança são gerenciados no Portal, não no VS Code.
- O acesso Team é por pessoa: cada membro entra com a sua própria conta BugIt e uma associação ativa. Não há nenhuma chave compartilhada nem login compartilhado.
- Após uma verificação on-line bem-sucedida, o BugIt continua funcionando off-line por até 72 horas, tanto no Solo quanto no Team, e aplica o estado mais recente do Portal assim que se reconecta.
- As atualizações são autorizadas pelo seu direito assinado, então baixar uma nova versão nunca pede uma chave.

## Status da conexão

- O BugIt registra em onze rastreadores pela API REST de cada um, com uma credencial criada por você na sua própria conta: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana e Trello. A configuração verifica a conexão antes de você depender dela.
- O Confluence Cloud se conecta como fonte de conhecimento pelo caminho guiado do Atlassian Rovo MCP, que usa login no navegador.
- O Confluence Cloud se conecta como fonte de conhecimento pelo caminho guiado do Atlassian Rovo MCP, com login no navegador. Sentry e Notion são experimentais até que seus pré-requisitos e verificações ao vivo passem.
- Outros serviços citados exigem um servidor MCP compatível fornecido pela organização. O BugIt dá orientação de configuração, mas não entrega nem testa esses servidores.

## Seu primeiro relatório

- Descreva o problema em linguagem simples, incluindo onde ele ocorreu e com que frequência.
- Responda a quaisquer perguntas necessárias para completar os passos de reprodução.
- Revise a pré-visualização, especialmente dados privados, severidade, projeto e anexos.
- Confirme somente quando o destino e o ticket final estiverem corretos.

## Obtenha ajuda

Execute `Check status` ou `Check readiness` no agente do BugIt primeiro. Se o problema persistir, abra um ticket de suporte no painel da sua conta BugIt sem incluir segredos ou material confidencial do projeto. O suporte é oferecido apenas em inglês.
