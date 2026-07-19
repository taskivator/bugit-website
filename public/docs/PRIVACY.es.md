# Privacidad — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Un resumen en lenguaje sencillo de lo que el Software recopila y lo que no. Todo se
ejecuta en su propia máquina.

## Qué envía el Software a Taskivator

Lo único que el Software nos envía son **datos de licencia/actualización**:

- su **clave de licencia**,
- una **huella de dispositivo anónima y con hash unidireccional**: un hash de 16
  caracteres derivado de atributos básicos de la máquina. No puede revertirse para
  identificarle a usted ni a su hardware, y
- **solo si define una en la configuración inicial**, una etiqueta de puesto breve
  que usted eligió, para poder distinguir los puestos de una licencia Team (p. ej.,
  un nombre, un nombre de usuario o un correo electrónico; nunca es obligatorio que
  sea real, y nunca se verifica). Si no define ninguna, sencillamente no se envía
  nunca.

Estos datos van únicamente al servidor de licencias de Taskivator, y solo para
activar/verificar su puesto y comprobar si hay disponible una versión más reciente.

## Qué permanece por completo en su dispositivo

- Sus especificaciones, glosario, estilo propio y correcciones aprendidas
- Su `config.json` y sus archivos de proyecto locales
- Sus tokens de API (guardados en el almacén de credenciales de su sistema
  operativo)

Nada de esto se transmite a ningún sitio.

## Qué va únicamente a los servicios que *usted* conecta

Para redactar y registrar un ticket, el texto de su reporte se envía al modelo de IA
que usted utiliza (GitHub Copilot, o su propia clave de OpenAI/Anthropic) y al
tracker en el que lo registra (como Jira o Azure DevOps). Se trata de la IA y las
herramientas que **usted** eligió y conectó: nunca se enruta a través de, se copia a,
ni es visto por Taskivator.

## Credenciales

Los tokens de API residen en el almacén de credenciales de su sistema operativo:
nunca en un archivo, y nunca se transmiten a Taskivator.

## Analítica del sitio web

BugIt utiliza Cloudflare Web Analytics para conocer el rendimiento general del sitio web y el número de visitas. Este servicio está diseñado sin cookies de seguimiento entre sitios.

Con su permiso, también podemos utilizar la medición de Google Ads para saber si nuestra publicidad genera compras. Puede gestionar sus opciones en cualquier momento desde Preferencias de cookies.

Cuando la medición de compras está activada, es posible que se utilice información limitada de la transacción, como el valor de la compra, la moneda y una referencia de pedido única, para la atribución. El contenido de los informes de errores, los datos de la tarjeta de pago y la información introducida en el software BugIt no se comparten con Google Ads.

Estas herramientas de medición se aplican únicamente al sitio web y al portal de BugIt. El software BugIt no utiliza la medición de Google Ads ni envía telemetría del producto.

## Contacto

¿Preguntas sobre privacidad? Visite **bugit.dev** y abra un ticket de soporte desde
su panel de BugIt: estaremos encantados de ayudarle.
