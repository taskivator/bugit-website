# Agente de QA do BugIt — Visão geral

O BugIt é um agente comercial do Copilot para VS Code que transforma anotações brutas de teste em relatórios de bug consistentes. Ele elabora rascunhos localmente no seu workspace e grava nos serviços conectados somente após a pré-visualização e a confirmação.

## Fluxo de trabalho principal

- Capture anotações informais de reprodução, logs, capturas de tela e o comportamento esperado.
- Elabore um relatório estruturado com título, severidade, ambiente, passos e evidências.
- Pesquise no rastreador conectado por possíveis duplicatas.
- Pré-visualize e aprove o destino e o conteúdo final antes de qualquer gravação externa.
- Adicione comentários de verificação depois que uma correção for retestada.

## Privacidade e controle

- O BugIt não envia nenhuma análise de produto nem telemetria de tickets para a Taskivator.
- O seu provedor de IA conectado e as integrações habilitadas processam apenas o conteúdo que você optar por enviar a eles.
- As solicitações de licença e de atualização usam dados de licença e um identificador de dispositivo unidirecional, não o conteúdo dos tickets.
- O modo dry-run impede que os utilitários Python incluídos gravem, mas você ainda deve revisar as ações externas de MCP.
- Os arquivos de configuração jamais devem conter valores de credenciais.

## Níveis de integração

- Guiado: Jira Cloud e Confluence Cloud por meio do Atlassian Rovo MCP.
- Prévia pública guiada: Azure DevOps por meio do serviço remoto de MCP da Microsoft.
- Experimental com verificação ao vivo: Sentry, GitHub, Linear e Notion.
- Somente orientação de configuração: servidores compatíveis fornecidos pela organização para outros rastreadores, ferramentas de crash, gerenciamento de testes, comunicações e serviços de conhecimento.
- Sem suporte na configuração automatizada: conectores de armazenamento S3, Google Drive e Azure Blob.

## Escopo da versão

- O BugIt é a versão comercial publicada atualmente, com manutenção ativa.
- Windows 11, VS Code, GitHub Copilot e Python 3.10 a 3.13 compõem o ambiente qualificado para a versão.
- O Guia do Usuário completo e a Visão geral estão disponíveis em PDF, em inglês e em todos os idiomas com suporte — pré-visualize ou baixe-os abaixo.

## Políticas

- Leia a [declaração de privacidade](/public/docs/PRIVACY.md).
- Consulte as [orientações de segurança](/public/docs/SECURITY.md).