# Primeros pasos con BugIt

BugIt convierte notas de prueba preliminares en informes de errores revisados dentro de VS Code. Windows 11 con VS Code y GitHub Copilot es la ruta de cliente cualificada para la versión.

## Antes de empezar

- Instala la versión más reciente de VS Code e inicia sesión en GitHub Copilot.
- Instala un intérprete de Python 3.10 a 3.13 cualificado para la versión.
- Descarga BugIt desde el panel de tu cuenta y descomprímelo en una carpeta local.
- Mantén los tokens, los datos de clientes y el código fuente privado fuera del chat y de los archivos de configuración.

## Activa y configura

- Abre la carpeta descomprimida de BugIt como un espacio de trabajo de confianza en VS Code.
- En Copilot Chat, selecciona el Agente de QA de BugIt y escribe `Activate` (añade `--solo` o `--team` si tu cuenta tiene ambos).
- BugIt abre el BugIt Portal en tu navegador. Inicia sesión con tu propia cuenta de BugIt: tu contraseña permanece en el navegador y nunca se introduce en VS Code.
- Elige la titularidad Solo o Team para este equipo y luego revisa y aprueba este dispositivo.
- Vuelve a VS Code. BugIt completa la autorización automáticamente: no hay ninguna clave de licencia que copiar, pegar ni mostrar.
- Escribe `Begin setup` y elige solo las integraciones que usa tu equipo.
- Deja que BugIt verifique el servicio y el proyecto seleccionados antes de registrar un ticket.

## Gestiona tu acceso

- Una instalación usa una única titularidad activa a la vez. Para cambiar este equipo a otra titularidad Solo o Team, escribe `Switch license` y vuelve a aprobar en el navegador; si cancelas, se mantiene tu titularidad actual.
- `Deactivate` elimina la titularidad solo de este equipo. Los asientos, dispositivos, membresías, roles y la facturación se gestionan en el Portal, no en VS Code.
- El acceso Team es por persona: cada miembro inicia sesión con su propia cuenta de BugIt y una membresía activa. No hay ninguna clave compartida ni un inicio de sesión compartido.
- Tras una comprobación en línea correcta, BugIt sigue funcionando sin conexión hasta 72 horas, tanto en Solo como en Team, y aplica el último estado del Portal en cuanto se vuelve a conectar.
- Las actualizaciones se autorizan con tu titularidad firmada, así que descargar una nueva versión nunca pide una clave.

## Estado de la conexión

- Jira Cloud y Azure DevOps envían directamente a través de la API REST del gestor de incidencias, con un token de API que creas en tu propia cuenta. La configuración verifica la conexión antes de que dependas de ella.
- Confluence Cloud se conecta como fuente de conocimiento mediante la ruta guiada de Atlassian Rovo MCP, que usa inicio de sesión en el navegador.
- Sentry, GitHub, Linear y Notion son experimentales hasta que se cumplan los requisitos previos de sus servicios y superen las comprobaciones en vivo.
- Otros servicios mencionados requieren un servidor MCP compatible proporcionado por la organización. BugIt ofrece orientación de configuración, pero no distribuye ni prueba esos servidores.

## Tu primer informe

- Describe el problema en lenguaje sencillo, indicando dónde ocurrió y con qué frecuencia.
- Responde a las preguntas necesarias para completar los pasos de reproducción.
- Revisa la vista previa, especialmente los datos privados, la gravedad, el proyecto y los archivos adjuntos.
- Confirma solo cuando el destino y el ticket final sean correctos.

## Obtén ayuda

Ejecuta primero `Check status` o `Check readiness` en el agente de BugIt. Si el problema persiste, abre un ticket de soporte desde el panel de tu cuenta de BugIt sin incluir secretos ni material confidencial del proyecto. El soporte se ofrece únicamente en inglés.
