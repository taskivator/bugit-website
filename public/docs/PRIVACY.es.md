# Política de Privacidad — BugIt

Copyright (c) 2026 Taskivator. All Rights Reserved.

**Última actualización: 1 de agosto de 2026**

Esta política explica qué datos personales se tratan cuando utiliza el sitio web de
BugIt (bugit.dev), el BugIt Portal (gestión de cuenta, compra y licencias) y el
software BugIt QA Agent, así como las opciones y los derechos que le asisten. Está
redactada en lenguaje claro y pretende ser fiel a cómo funciona realmente el producto.

## Quién es responsable de sus datos

BugIt opera bajo el nombre comercial **Taskivator / BugIt**. El contacto operativo
para todas las cuestiones y solicitudes de privacidad es **support@bugit.dev**.

**El titular ha optado por no publicar los datos personales de identificación del
responsable del tratamiento. Esto sigue constituyendo un riesgo de cumplimiento legal
aceptado y no ha recibido aprobación legal externa.** Un nombre comercial por sí solo
no satisface la obligación legal de identificar al responsable del tratamiento; por
tanto, esa obligación **no** se considera cumplida por esta política. Por esta razón
no se publican los datos registrados de identidad del responsable del tratamiento;
cuando la ley le dé derecho a ellos, puede solicitarlos en support@bugit.dev.

## La versión breve

- El **software QA Agent se ejecuta en su equipo.** Sus informes de errores,
  especificaciones, glosario, capturas de pantalla, código, configuración y tickets
  **no** se envían a Taskivator.
- Para gestionar su cuenta, su compra, su licencia y el soporte, el **sitio web y el
  Portal** tratan un conjunto limitado de datos personales (su correo electrónico,
  registros de compra, licencias y activaciones de dispositivos, y mensajes de
  soporte), utilizando los proveedores de servicios que se enumeran a continuación.
- **No** vendemos sus datos personales. La medición publicitaria está **desactivada
  de forma predeterminada** y solo se ejecuta con su consentimiento.

## Qué envía el software QA Agent a Taskivator

BugIt utiliza **activación basada en el navegador**: usted inicia sesión en el BugIt
Portal desde su navegador y aprueba el dispositivo; **no hay ninguna clave de
licencia** que introducir, pegar o almacenar. Desde su dispositivo, el software solo
envía datos de licencia/actualización:

- un **registro firmado de titularidad / activación de dispositivo** derivado de ese
  inicio de sesión en el Portal (para que su dispositivo pueda autorizarse y
  reverificarse) y la versión de la aplicación,
- una **huella de dispositivo anónima, sometida a hash unidireccional**: un hash de
  16 caracteres derivado de atributos básicos del equipo; no puede revertirse para
  identificarle a usted ni a su hardware, y
- **solo si establece una durante la configuración inicial**, una etiqueta breve de
  dispositivo/plaza que usted elija para poder distinguir las autorizaciones de
  dispositivos de una cuenta Team. Nunca se exige que sea real y nunca se verifica. Si
  no establece ninguna, no se envía nada.

Estos datos se envían únicamente al servicio de licencias de Taskivator, para
activar/verificar su plaza y comprobar si hay una versión más reciente disponible.

## Qué permanece por completo en su dispositivo

- Sus especificaciones, glosario, estilo interno y correcciones aprendidas
- Su `config.json` y sus archivos de proyecto locales
- Sus tokens de API (guardados en el almacén de credenciales de su sistema
  operativo, nunca en un archivo y nunca transmitidos a Taskivator)

Nada de esto se transmite a ningún sitio.

## Qué se envía únicamente a los servicios que *usted* conecta

Para redactar y registrar un ticket, el texto de su informe se envía al modelo de IA
que usted utiliza (GitHub Copilot, o su propia clave de OpenAI/Anthropic) y al gestor
de seguimiento en el que registra la incidencia (como Jira o Azure DevOps). Esa es la
IA y las herramientas que **usted** eligió y conectó; nunca se enrutan a través de
Taskivator, ni se copian a él, ni las ve Taskivator, que no es el responsable del
tratamiento de esos servicios. Con ellos solo se intercambian los metadatos
necesarios para registrar la incidencia (identificador/URL del asunto y el contenido
que usted apruebe).

## Datos personales que tratamos, y por qué (sitio web + Portal)

| Datos | Por qué (finalidad) | Base jurídica (GDPR/UK GDPR) |
|-------|---------------------|------------------------------|
| Correo de la cuenta + datos de autenticación | Crear y proteger su cuenta, iniciar su sesión, MFA de administrador | Contrato; interés legítimo (seguridad de la cuenta) |
| Titularidades / licencias | Entregar y verificar lo que ha comprado | Contrato |
| Activaciones de dispositivos (huella con hash, etiqueta opcional, versión del SO/de la app) | Aplicar los límites por dispositivo/plaza; permitirle gestionar dispositivos | Contrato |
| Pertenencia a un Team + invitaciones | Prestar el plan Team (hasta 5 miembros) | Contrato |
| Registros de compra / pedido | Cumplir la venta, recibos, emisión de licencias | Contrato; obligación legal (contabilidad) |
| Datos de pago | Cobrar el pago (gestionado por Stripe — no almacenamos los números de tarjeta completos) | Contrato |
| Reembolsos / disputas / contracargos | Gestionar reembolsos y disputas de pago | Contrato; obligación legal |
| Registros fiscales | Cumplir obligaciones fiscales/contables | Obligación legal |
| Correspondencia de soporte | Responder a sus preguntas y prestar soporte | Contrato; interés legítimo |
| Registros de seguridad, de log y de auditoría de administración | Detectar abusos, proteger cuentas, mantener una pista de auditoría | Interés legítimo (seguridad) |
| Configuración de proveedor/gestor que usted guarda | Permitirle conectar Jira/Azure DevOps, etc.; almacenamos metadatos de conexión, no sus datos en esas herramientas | Contrato |
| Opciones de consentimiento (cookies/anuncios, y su retirada) | Respetar y acreditar sus decisiones | Consentimiento; obligación legal (prueba) |
| Analítica del sitio web | Comprender el rendimiento general del sitio (sin cookies) | Interés legítimo |
| Medición publicitaria | Comprender si los anuncios generan compras | Consentimiento (desactivada de forma predeterminada) |
| Consentimiento UE/RU de entrega inmediata / desistimiento | Acreditar su reconocimiento en el momento de la compra | Obligación legal; contrato |

## Proveedores de servicios (encargados del tratamiento) y transferencias internacionales

Utilizamos los siguientes proveedores para operar BugIt. Cada uno trata datos
personales únicamente para prestarnos su servicio. Cuando se transfieren datos
personales fuera del EEE/del Reino Unido, nos basamos en el Anexo de Tratamiento de
Datos del proveedor y, cuando procede, en las Cláusulas Contractuales Tipo (o un
mecanismo de transferencia equivalente).

| Proveedor | Finalidad | Categorías de datos | Ubicación probable del tratamiento | Base de la transferencia | Conservación / eliminación |
|-----------|-----------|---------------------|-------------------------------------|--------------------------|-----------------------------|
| **Supabase** | Base de datos + autenticación (cuentas, titularidades, dispositivos, pedidos, registros de auditoría) | Datos de cuenta, titularidad, dispositivo, pedido y log | Estados Unidos o UE (región del proyecto) | Anexo de tratamiento + Cláusulas Contractuales Tipo cuando proceda | Se conserva mientras su cuenta esté activa; se elimina o anonimiza cuando deja de ser necesario (véase la tabla de conservación) |
| **Stripe** | Procesamiento de pagos, reembolsos, disputas, cálculo de impuestos | Datos de pago, facturación y transacción | Estados Unidos + global | Anexo de tratamiento + Cláusulas Contractuales Tipo | Conservado por Stripe según su política y los requisitos legales/contables |
| **Cloudflare** | Entrega del sitio web, seguridad, analítica web sin cookies | Datos de red/técnicos; analítica agregada | Red edge global | Anexo de tratamiento + Cláusulas Contractuales Tipo | De corta duración; la analítica es agregada y sin cookies |
| **Vercel** | Alojamiento de la aplicación del sitio web/Portal | Datos de solicitud/técnicos | Estados Unidos + global | Anexo de tratamiento + Cláusulas Contractuales Tipo | Registros operativos conservados a corto plazo |
| **Resend** | Envío de correo transaccional (recibos, licencia, soporte) | Dirección de correo, metadatos del mensaje | Estados Unidos | Anexo de tratamiento + Cláusulas Contractuales Tipo | Conservado según la política del proveedor; registros de entrega a corto plazo |
| **Google Ads** | Medición publicitaria (solo con consentimiento) | Valor de compra, moneda, referencia de pedido no identificativa | Estados Unidos + global | Anexo de tratamiento + Cláusulas Contractuales Tipo | Solo con consentimiento; no se comparte contenido de errores ni datos de tarjeta |

**No** vendemos datos personales, y la medición publicitaria nunca recibe sus
informes de errores, el contenido del software BugIt ni los datos de la tarjeta de
pago.

## Cuánto tiempo conservamos los datos (conservación)

Cuando un plazo no está fijado por ley, conservamos los datos solo el tiempo
necesario para la finalidad y después los eliminamos o anonimizamos.

| Categoría | Conservación |
|-----------|--------------|
| Cuentas | Mientras estén activas; eliminadas/anonimizadas tras la eliminación de la cuenta (sujeto a retenciones legales) |
| Registros de autenticación | Mientras la cuenta esté activa |
| Titularidades / licencias | Durante la vigencia de la licencia y un período limitado posterior para soporte y disputas |
| Dispositivos / activaciones | Mientras la titularidad esté activa; se liberan cuando elimina un dispositivo o finaliza la licencia |
| Pertenencias a Team / invitaciones | Mientras la licencia Team esté activa; las invitaciones caducan |
| Pagos | Durante la vigencia de la licencia más el período exigido para contabilidad/impuestos |
| Reembolsos / disputas / contracargos | Durante el período necesario para gestionarlos y acreditarlos, más los períodos contables |
| Registros fiscales / contables | Según lo exija la legislación fiscal aplicable (por ejemplo, hasta 7 años) |
| Registros de seguridad | Un período limitado suficiente para la seguridad y la detección de abusos |
| Registros de auditoría de administración | Conservados como registro de integridad durante un período limitado |
| Correspondencia de soporte | Mientras sea necesaria para atenderle y un período limitado posterior |
| Consentimiento de marketing | Mientras el consentimiento se mantenga y después como prueba |
| Retiradas de consentimiento | Conservadas como prueba de que se respetó una decisión |
| Copias de seguridad de cuentas eliminadas | Purgadas de las copias de seguridad rutinarias dentro de la rotación normal de copias tras la eliminación |

## Cookies y publicidad

El sitio web utiliza únicamente cookies esenciales para funcionar. Las cookies no
esenciales (publicitarias) están **desactivadas de forma predeterminada** y solo se
cargan si usted opta por ellas a través del banner de cookies o de las **Preferencias
de cookies**. Utilizamos Cloudflare Web Analytics, que no usa cookies y no le rastrea
entre sitios. Puede cambiar o retirar su elección en cualquier momento.

## Sus derechos

Según dónde resida (por ejemplo, bajo el GDPR de la UE/RU o la APPI de Japón), puede
tener derecho a:

- **Acceder** a los datos personales que tenemos sobre usted
- **Rectificar** datos inexactos
- **Suprimir** sus datos (y su cuenta)
- **Limitar** u **oponerse a** determinados tratamientos
- **Portabilidad**: recibir determinados datos en un formato portátil
- **Retirar el consentimiento** (p. ej., la medición publicitaria) en cualquier
  momento, sin afectar al tratamiento lícito previo

Para ejercer cualquiera de estos derechos, escriba a **support@bugit.dev** desde la
dirección de su cuenta. También puede **eliminar su cuenta** para borrar sus datos
(sujeto a los registros que debemos conservar por ley, como los registros fiscales).
Responderemos dentro del plazo exigido por la legislación aplicable.

**Reclamaciones.** Si se encuentra en el EEE, puede reclamar ante su autoridad local
de protección de datos; en el Reino Unido, ante la Information Commissioner's Office
(ico.org.uk); en Japón, ante la Personal Information Protection Commission
(ppc.go.jp). Le agradeceríamos la oportunidad de resolver primero su inquietud en
support@bugit.dev.

## Cambios

Podemos actualizar esta política a medida que el producto o la ley cambien; la fecha
de «última actualización» anterior refleja la versión vigente. Documentos
relacionados: la divulgación de Transacciones Comerciales (特定商取引法に基づく表記 —
información conforme a la Ley japonesa sobre Transacciones Comerciales Específicas) y
la Política de Reembolsos.

## Contacto

Preguntas o solicitudes de privacidad: **support@bugit.dev**. También puede abrir un
ticket de soporte desde su panel de BugIt en **bugit.dev**.
