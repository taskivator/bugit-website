# Seguridad

> **Aviso sobre la traducción.** Este documento se ha traducido automáticamente y no ha sido revisado por hablantes nativos. La versión en inglés es la que prevalece: en caso de discrepancia, rige el texto en inglés. Para la redacción más precisa y actualizada, acude al documento en inglés.

BugIt QA Agent es un asistente en el que las decisiones las toma una persona (human in the loop). Solo actúa a través de tu sesión de VS Code y de las integraciones que actives.

## Cómo te protege BugIt
- **Nada se escribe sin confirmación.** Cada creación, comentario, adjunto o notificación que lleve tu informe se muestra antes en vista previa; los envíos irreversibles requieren que escribas FILE IT. El texto del chat por sí solo nunca envía nada, y un simple «sí» no basta. Una excepción: una prueba de conexión que inicias tú con `notify connect`, `notify test` o `notify doctor --live` envía un mensaje de prueba fijo sin vista previa, al canal que indiques o, si no indicas ninguno, a todos los canales que tengas activados. No lleva contenido de ningún informe, y el modo dry run la bloquea.
- **Dry run = solo lectura, en todos los lugares donde ocurre tu trabajo.** `QA_AGENT_DRY_RUN=1` impide que BugIt escriba en tus sistemas de seguimiento y también que lea de ellos: ningún ticket, ningún comentario, ningún adjunto, ninguna notificación y ninguna credencial guardada desbloqueada. Una excepción, que afecta a BugIt y no a tus datos: los comandos que ejecutas a propósito para licenciar o actualizar esta instalación siguen llegando al servidor de licencias de BugIt, y `tools/update.py` sigue instalando la versión firmada que descarga, porque un equipo cuyo shell lleva esta variable de forma permanente tiene que poder recibir igualmente una corrección de seguridad. Decir «dry run» en el chat le pide al asistente que se detenga, lo cual es útil pero no ofrece la misma garantía: solo la variable de entorno establece el modo que el código hace cumplir.
- **Ningún secreto en archivos.** `config.json` solo contiene organizaciones y URL; los tokens se guardan en el almacén de credenciales de tu sistema operativo. El validador señala todo lo que parezca un secreto. `redact.py` hace lo posible por eliminar de los borradores correos electrónicos, tokens y direcciones IP.
- **Desactivado por defecto.** Todas las integraciones vienen desactivadas; nada se conecta ni envía nada hasta que tú lo decidas.
- **La salida son datos.** El texto de páginas, tickets y fallos se trata como datos, no como órdenes, así que las instrucciones inyectadas se señalan y se muestran, pero no se obedecen.

## Límites conocidos
- El bloqueo de escritura lo aplica el agente, no el sistema operativo; la variable de entorno solo detiene de forma estricta las herramientas auxiliares de Python incluidas. Ejecútalo en un entorno de ejecución de confianza.
- El agente llega a todo lo que conectes, y el alcance de las credenciales = el alcance del daño posible. Usa tokens con **privilegios mínimos**.
- La mayoría de los sistemas de seguimiento no pueden eliminar de verdad una incidencia; por eso ahí «deshacer» está limitado por diseño.

## Lista de comprobación para reforzar la seguridad
1. Usa una cuenta de servicio dedicada y con privilegios mínimos para cada sistema de seguimiento.
2. Guarda los tokens en el almacén del sistema operativo; nunca los pegues en `config.json`.
3. Ejecuta `python tools/validate_config.py` después de la configuración para detectar filtraciones y errores de configuración.
4. Inicia solo los servidores MCP que uses; detén el resto.

## Cómo informar de una vulnerabilidad
Escribe a **support@bugit.dev** con los pasos para reproducirla. No abras una incidencia pública para informar de problemas de seguridad.
