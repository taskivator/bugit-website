# Primeros pasos con BugIt

BugIt convierte notas de prueba preliminares en informes de errores revisados dentro de VS Code. Windows 11 con VS Code y GitHub Copilot es la ruta de cliente cualificada para la versión.

## Antes de empezar

- Instala la versión más reciente de VS Code e inicia sesión en GitHub Copilot.
- Instala un intérprete de Python 3.10 a 3.13 cualificado para la versión.
- Descarga BugIt desde el panel de tu cuenta y descomprímelo en una carpeta local.
- Mantén las claves de licencia, los tokens, los datos de clientes y el código fuente privado fuera del chat y de los archivos de configuración.

## Activa y configura

- Abre la carpeta descomprimida de BugIt como un espacio de trabajo de confianza en VS Code.
- En Copilot Chat, selecciona el Agente de QA de BugIt y escribe `Activate`.
- Introduce la clave de licencia únicamente en el mensaje enmascarado del terminal.
- Escribe `Begin setup` y elige solo las integraciones que usa tu equipo.
- Deja que BugIt verifique el servicio y el proyecto seleccionados antes de registrar un ticket.

## Estado de la conexión

- Jira Cloud y Confluence Cloud utilizan la ruta guiada de Atlassian Rovo MCP y requieren autenticación en el navegador, además de comprobaciones de capacidad en vivo.
- Azure DevOps utiliza la vista previa pública del MCP remoto de Microsoft con alcance de organización y requiere verificación en vivo.
- Sentry, GitHub, Linear y Notion son experimentales hasta que se cumplan los requisitos previos de sus servicios y superen las comprobaciones en vivo.
- Otros servicios mencionados requieren un servidor MCP compatible proporcionado por la organización. BugIt ofrece orientación de configuración, pero no distribuye ni prueba esos servidores.

## Tu primer informe

- Describe el problema en lenguaje sencillo, indicando dónde ocurrió y con qué frecuencia.
- Responde a las preguntas necesarias para completar los pasos de reproducción.
- Revisa la vista previa, especialmente los datos privados, la gravedad, el proyecto y los archivos adjuntos.
- Confirma solo cuando el destino y el ticket final sean correctos.

## Obtén ayuda

Ejecuta primero `Check status` o `Check readiness` en el agente de BugIt. Si el problema persiste, abre un ticket de soporte desde el panel de tu cuenta de BugIt sin incluir secretos ni material confidencial del proyecto.
