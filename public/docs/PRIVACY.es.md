# Privacidad — BugIt QA Agent

Copyright (c) 2026 Taskivator. All Rights Reserved.

Un resumen en lenguaje sencillo de lo que el Software recopila y lo que no. Todo se
ejecuta en su propia máquina.

## Qué envía el Software a Taskivator

BugIt se activa a través de su navegador web: usted inicia sesión en su propia
cuenta de BugIt en el Portal de BugIt y aprueba este dispositivo. No hay **ninguna
clave de licencia** que introducir, pegar ni compartir.

Para activar y mantener válida su licencia, el Software envía únicamente lo
necesario para vincular su derecho de uso a esta instalación y a este dispositivo
— **datos de licencia/activación**:

- un **identificador de instalación**: un valor aleatorio creado una sola vez para
  esta instalación de BugIt. No se deriva de su hardware y no le identifica,
- una **huella de dispositivo anónima y con hash unidireccional**: un hash de 16
  caracteres derivado de atributos básicos de la máquina. No puede revertirse para
  identificarle a usted ni a su hardware,
- una **etiqueta de dispositivo**: el nombre de host de su equipo, para que pueda
  reconocer este dispositivo en su cuenta y eliminarlo desde el Portal cuando
  quiera,
- el **nombre de su sistema operativo** y la **versión de BugIt**, para comprobar
  la compatibilidad y si hay una actualización disponible, y
- **material de activación** de corta duración: un desafío de un solo uso y un
  token de aprobación utilizados únicamente para completar el inicio de sesión,
  además de un hash unidireccional de un secreto de confirmación local. El secreto
  en sí nunca sale de su máquina, y el desafío y el token sin procesar nunca se
  almacenan.

El inicio de sesión de su cuenta ocurre en su navegador, en el Portal. A cambio,
el Portal emite un **derecho de uso firmado** vinculado a este dispositivo y a
esta instalación, que el Software verifica localmente.

Estos datos van únicamente al Portal de BugIt, y solo para activar y verificar su
licencia, gestionar sus dispositivos y comprobar si hay disponible una versión más
reciente. Cuando descarga una actualización, el Portal también registra la
descarga —incluida la dirección IP y el agente de usuario del navegador de la
solicitud— por seguridad y para la prevención de abusos.

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
