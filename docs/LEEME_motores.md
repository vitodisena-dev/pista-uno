# Documentación de JSBSim para el simulador

La orientación actual del proyecto es empezar con avionetas, una primero. Los XML de jets conservados aquí son referencias para pruebas o una fase futura. La propuesta C152, C172, PA28, DA40 y SR22 aún requiere fijar variantes y documentar sus modelos.

Esta carpeta contiene seis archivos originales públicos descargados el 18 de noviembre de 2026: dos licencias, dos README y dos modelos XML de referencia. El manifiesto registra origen, estado, tamaño y huella SHA-256.

Los XML F-16 y 737 son referencias parciales: necesitan otros archivos de motores, sistemas y recursos y no incluyen un avión completo listo para un videojuego. No se han compilado ni validado.

- La biblioteca se presenta como LGPL 2.1: ver `JSBSim_COPYING_LGPL_2_1.txt`.
- El ejemplo Unreal tiene licencia MIT separada: ver `JSBSim_Unreal_LICENSE_MIT.txt`.
- El XML F-16 declara GPL en su encabezado. No especifica versión numérica allí.
- El XML 737 declara GPL y además contiene un aviso de no venta. Esa combinación requiere aclaración antes de reutilizarlo en una distribución comercial. Su descripción sólo dice Boeing 737 y su estado es BETA.

El manual PDF histórico pudo consultarse en línea, pero la descarga directa devolvió HTTP 403. No se ha creado ni incluido una copia PDF local. Enlace: [JSBSim Reference Manual, edición 2011](https://jsbsim.sourceforge.net/JSBSimReferenceManual.pdf).

Documentación web recomendada: [manual en línea de JSBSim](https://jsbsim-team.github.io/jsbsim-reference-manual/) y [esquema XML](https://github.com/JSBSim-Team/jsbsim/blob/master/JSBSim.xsd). La página de autoría de archivos del manual en línea figura como pendiente; contrastar con código y ejemplos.

Fuentes exactas de cada archivo: `manifest_motores.json`. La biblioteca física, los datos de cada avión y la cabina/sistemas se deben desarrollar y comprobar por separado. La investigación actual cubre fuentes, no construcción del juego ni autorización de distribución comercial.

Como referencia adicional para avionetas, el [XML C172p público](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/c172p/c172p.xml) se pudo leer, pero no forma parte de estas seis descargas. Su encabezado incluye aviso de no venta y reconoce datos estimados/validación limitada; no presentarlo como avión comercial listo para incorporar.
