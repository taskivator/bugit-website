# Primeiros passos com o BugIt

O BugIt transforma anotações informais de teste em relatórios de bug revisados dentro do VS Code. Windows 11 com VS Code e GitHub Copilot é o caminho de cliente qualificado para a versão.

## Antes de começar

- Instale a versão mais recente do VS Code e faça login no GitHub Copilot.
- Instale um interpretador Python 3.10 a 3.13 qualificado para a versão.
- Baixe o BugIt no painel da sua conta e descompacte-o em uma pasta local.
- Mantenha chaves de licença, tokens, dados de clientes e código-fonte privado fora do chat e dos arquivos de configuração.

## Ative e configure

- Abra a pasta descompactada do BugIt como um workspace confiável do VS Code.
- No Copilot Chat, selecione o Agente de QA do BugIt e digite `Activate`.
- Insira a chave de licença apenas no prompt mascarado do terminal.
- Digite `Begin setup` e escolha somente as integrações que a sua equipe utiliza.
- Deixe o BugIt verificar o serviço e o projeto selecionados antes de registrar um ticket.

## Status da conexão

- O Jira Cloud e o Confluence Cloud usam o caminho guiado do Atlassian Rovo MCP e exigem autenticação no navegador, além de verificações de capacidade ao vivo.
- O Azure DevOps usa a prévia pública do MCP remoto da Microsoft com escopo de organização e exige verificação ao vivo.
- Sentry, GitHub, Linear e Notion são experimentais até que seus pré-requisitos de serviço e as verificações ao vivo sejam aprovados.
- Outros serviços mencionados exigem um servidor MCP compatível fornecido pela organização. O BugIt oferece orientação de configuração, mas não fornece nem testa esses servidores.

## Seu primeiro relatório

- Descreva o problema em linguagem simples, incluindo onde ele ocorreu e com que frequência.
- Responda a quaisquer perguntas necessárias para completar os passos de reprodução.
- Revise a pré-visualização, especialmente dados privados, severidade, projeto e anexos.
- Confirme somente quando o destino e o ticket final estiverem corretos.

## Obtenha ajuda

Execute `Check status` ou `Check readiness` no agente do BugIt primeiro. Se o problema persistir, abra um ticket de suporte no painel da sua conta BugIt sem incluir segredos ou material confidencial do projeto.