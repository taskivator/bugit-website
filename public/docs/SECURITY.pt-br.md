# Segurança

> **Aviso sobre a tradução.** Este documento foi traduzido automaticamente e não passou por revisão de falantes nativos. A versão em inglês é a que prevalece: em caso de divergência, vale o texto em inglês. Para a redação mais precisa e atual, consulte o documento em inglês.

O BugIt QA Agent é um assistente em que as decisões ficam com uma pessoa (human in the loop). Ele só age por meio da sua sessão do VS Code e das integrações que você ativar.

## Como o BugIt protege você
- **Nenhuma gravação sem confirmação.** Toda criação, comentário, anexo ou notificação que leva o seu relatório é mostrado antes em pré-visualização; envios irreversíveis exigem que você digite FILE IT. O texto do chat sozinho nunca envia nada, e um simples "sim" não basta. Uma exceção: um teste de conexão que você mesmo inicia com `notify connect`, `notify test` ou `notify doctor --live` envia uma mensagem de teste fixa sem pré-visualização, para o canal que você indicar ou, se não indicar nenhum, para todos os canais que você ativou. Ela não leva nenhum conteúdo de relatório, e o dry run a bloqueia.
- **Dry run = somente leitura, em todo lugar onde o seu trabalho acontece.** `QA_AGENT_DRY_RUN=1` impede o BugIt de gravar nos seus rastreadores e também de ler deles: nenhum ticket, nenhum comentário, nenhum anexo, nenhuma notificação e nenhuma credencial salva desbloqueada. Uma exceção, que diz respeito ao próprio BugIt e não aos seus dados: comandos que você executa deliberadamente para licenciar ou atualizar esta instalação continuam chegando ao servidor de licenças do próprio BugIt, e `tools/update.py` continua instalando a versão assinada que baixa, porque uma máquina cujo shell mantém essa variável permanentemente ainda precisa poder receber uma correção de segurança. Dizer "dry run" no chat pede ao assistente que espere, o que é útil, mas não é a mesma garantia: só a variável de ambiente define o modo que o código aplica.
- **Nenhum segredo em arquivos.** O `config.json` guarda apenas organizações e URLs; os tokens ficam no armazenamento de credenciais do seu sistema operacional. O validador sinaliza tudo o que parecer um segredo. O `redact.py` faz o possível para remover e-mails, tokens e endereços IP dos rascunhos.
- **Desligado por padrão.** Toda integração vem desativada; nada se conecta nem envia nada até que você opte por isso.
- **Saída é dado.** Textos de páginas, tickets e falhas são tratados como dados, não como comandos, então instruções injetadas são sinalizadas e exibidas, não obedecidas.

## Limites conhecidos
- O bloqueio de gravação é aplicado pelo agente, não pelo sistema operacional; a variável de ambiente só interrompe de forma rígida os utilitários Python incluídos. Execute-o em um ambiente de execução confiável.
- O agente alcança tudo o que você conectar, e o escopo das credenciais = o tamanho do estrago possível. Use tokens de **privilégio mínimo**.
- A maioria dos rastreadores não consegue excluir de fato uma issue; por isso, ali o "desfazer" é limitado por design.

## Lista de verificação para reforçar a segurança
1. Use uma conta de serviço dedicada e de privilégio mínimo para cada rastreador.
2. Mantenha os tokens no armazenamento do sistema operacional; nunca os cole no `config.json`.
3. Execute `python tools/validate_config.py` depois da configuração para detectar vazamentos e erros de configuração.
4. Inicie apenas os servidores MCP que você usa; pare os demais.

## Como relatar uma vulnerabilidade
Envie um e-mail para **support@bugit.dev** com os passos para reproduzi-la. Não abra uma issue pública para relatos de segurança.
