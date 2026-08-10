# Agente de QA de BugIt — Visión general

> **Aviso sobre la traducción.** Este documento se ha traducido automáticamente y no ha sido revisado por hablantes nativos. La versión en inglés es la que prevalece: en caso de discrepancia, rige el texto en inglés. Para consultar la redacción más precisa y actualizada, acuda al documento en inglés.

BugIt es un agente comercial de Copilot para VS Code que convierte notas de prueba sin procesar en informes de errores coherentes. Redacta borradores localmente en tu espacio de trabajo y escribe en los servicios conectados solo tras la vista previa y la confirmación.

## Flujo de trabajo principal

- Captura notas de reproducción preliminares, registros, capturas de pantalla y el comportamiento esperado.
- Redacta un informe estructurado con título, gravedad, entorno, pasos y evidencias.
- Busca posibles duplicados en el gestor de incidencias conectado.
- Previsualiza y aprueba el destino y el contenido final antes de cualquier escritura externa.
- Añade comentarios de verificación después de volver a probar una corrección.

## Privacidad y control

- BugIt no envía a Taskivator ninguna analítica de producto ni telemetría de tickets.
- Tu proveedor de IA conectado y las integraciones habilitadas procesan únicamente el contenido que decides enviarles.
- Las solicitudes de licencia y de actualización utilizan datos de licencia y un identificador de dispositivo unidireccional, no el contenido de los tickets.
- El modo de simulación (dry-run) impide que los ayudantes de Python incluidos escriban datos, pero aún así debes revisar las acciones externas de MCP.
- Los archivos de configuración nunca deben contener valores de credenciales.

## Niveles de integración

- Archiva con una credencial que creas en tu propia cuenta, certificado contra una cuenta real: Jira Cloud, Azure DevOps, GitHub Issues, GitLab Issues, Bugzilla, YouTrack, Linear, Shortcut, ClickUp, Asana y Trello. Los once, a través de la API de cada gestor.
- Fuente de conocimiento guiada: Confluence Cloud a través de Atlassian Rovo MCP, con inicio de sesión en el navegador.
- Fuente de conocimiento guiada, de solo lectura: Confluence Cloud a través de Atlassian Rovo MCP, con inicio de sesión en el navegador. Sentry y Notion siguen siendo experimentales hasta que pasen sus comprobaciones en vivo.
- Solo orientación de configuración: servidores compatibles proporcionados por la organización para herramientas de fallos, gestión de pruebas, comunicaciones y servicios de conocimiento.
- No compatible con la configuración automática: conectores de almacenamiento S3, Google Drive y Azure Blob.

## Alcance de la versión

- BugIt es la versión comercial publicada actual, con mantenimiento activo.
- Windows 11, VS Code, GitHub Copilot y Python 3.10 a 3.13 constituyen el entorno cualificado para la versión.
- La Guía del usuario completa y la Visión general están disponibles en PDF en inglés y en todos los idiomas admitidos: previsualízalas o descárgalas a continuación.

## Políticas

- Lee la [declaración de privacidad](/public/docs/PRIVACY.md).
- Consulta la [guía de seguridad](/public/docs/SECURITY.md).
