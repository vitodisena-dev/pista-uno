# Manuales oficiales para cinco avionetas

## ¿Dónde conseguir manuales oficiales?

### Takeaway
La selección vigente es Cessna 152, Cessna 172, Piper PA-28, Diamond DA40 y Cirrus SR22, con variantes todavía por fijar. Esta biblioteca no puede ser “todos los manuales”: algunos documentos se distribuyen mediante suscripción o compra, y los cambios de generación, motorización y aviónica requieren manuales distintos. La tabla distingue páginas verificadas de archivos realmente descargados; no se usaron repositorios de filtraciones.

### Cited Findings

| Fuente primaria | Verificación y acceso | Uso en el videojuego |
|---|---|---|
| [FAA Aviation Handbooks & Manuals](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation) | Catálogo oficial abierto y verificado. Contiene manuales generales y sus adendas. | Índice principal de formación, instrumentos, sistemas, meteorología y pesos. |
| [FAA Pilot’s Handbook of Aeronautical Knowledge, FAA-H-8083-25C](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak) | Página oficial abierta y PDF completo descargado. | Conceptos, controles, instrumentos, sistemas, masas y prestaciones. Caps. 3–12 especialmente útiles. |
| [FAA Airplane Flying Handbook, FAA-H-8083-3C](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook) | Página oficial abierta; se seleccionó capítulo 3 para descarga, no el libro de 260 MB. | Comportamiento esperado del avión; usar como referencia de diseño de maniobras y tutoriales. |
| [FAA Weight & Balance Handbook, FAA-H-8083-1B](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-1.pdf) | Enlace validado desde catálogo FAA; PDF descargado, no lectura integral. | Carga, momentos y centro de gravedad. |
| [FAA Aviation Weather Handbook, FAA-H-8083-28B](https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/faa-h-8083-28b-aviation-weather-handbook) | Página oficial abierta; PDF descargado. | Referencia para efectos atmosféricos y presentación del clima. |
| [Cessna / Textron 1View](https://download.txtav.com/webCDN/1VIEW_UsersGuide.pdf) | Guía oficial descargada. Explica que el acceso a los manuales requiere registro y suscripción activa. La guía no es un POH. | Ruta autorizada para obtener documentación C152/C172, mantenimiento y cableado. |
| [Piper Technical Publications](https://www.piper.com/technical-publications/) | Página oficial abierta. PIM de referencia mediante distribuidor; ePOH y otras publicaciones mediante Veryon. | Ruta autorizada para PA-28 Warrior/Archer/Arrow según variante seleccionada. |
| [Diamond Flight Training Checklists](https://www.diamondaircraft.com/en/service-and-support/diamond-flight-training/checklists/) | Página oficial abierta; incluye DA40-180 y DA40 NG con diferencias de aviónica. | Fuente para estados de sistemas, interacciones y flujos del cockpit. No sustituye el AFM. |
| [Diamond DA40-180 checklist, edición 17 de 2015](https://www.diamondaircraft.com/fileadmin/diamondaircraft/service-and-support/Pilot_Training_Austria/Checklists/checklists_DA40_180/DA40_180_Conventional_Cockpit/DA40_180_STAR_Checklist_Edit_17_A4.pdf) | PDF oficial abierto íntegro por herramienta web; descarga registrada en manifiesto. | Referencia de controles y acciones, NO datos suficientes para calibrar toda la dinámica. |
| [Cirrus SR22 FAA POH, P/N 13772-002 Perspective](https://store.cirrusaircraft.com/sr22-faa-poh-13772-002%2C-perspective/5637329126.p) | Página oficial abierta; producto físico, sin PDF libre confirmado. La tienda describe su aplicabilidad a seriales y aviónica. | Ruta oficial para prestaciones y sistemas de una configuración histórica concreta. |
| [Cirrus catálogo SR22](https://store.cirrusaircraft.com/pro-shop-retail-products/tech-pubs/sr22-all/5637148448.c?domain=store.cirrusaircraft.com) | Página oficial verificada en búsqueda. Distingue Avidyne, Perspective, 3600 lb y Perspective+. | Evitar mezclar SR22 de generaciones distintas o SR22T turbo con SR22. |

### Inferences
- C172 es una elección práctica para un primer prototipo si se consigue el manual autorizado de la variante elegida, pero no se halló un POH C172 gratuito alojado por el fabricante en esta búsqueda. Su popularidad no sustituye conseguir datos de dinámica.
- DA40 tiene un checklist oficial público comprobado, pero esto por sí solo NO lo hace mejor documentado para física: su AFM completo no pudo descargarse en esta sesión. No conviene elegirlo únicamente por disponer del checklist.
- Primero fijar una variante exacta entre C172 y DA40; adquirir/obtener AFM/POH autorizado y contrastar disponibilidad de coeficientes antes de decidir el avión de referencia.

### Gaps
- C152/C172: POH/AFM completo oficial gratuito no confirmado. Registrar año, variante, motor y aviónica antes de adquirir documentación.
- PA-28: no hay un único manual para toda la familia. PIM/POH íntegro oficial gratuito no confirmado; compra no realizada.
- DA40-180: enlace oficial identificado https://support.diamond-air.at/fileadmin/uploads/files/after_sales_support/DA40-180/Airplane_Flight_Manual/Basic_Manual/60101e-r10-complete.pdf ; la herramienta web agotó tiempo, las descargas HTTPS fallaron por certificado no verificable y HTTP agotó tiempo. El contenido de esta revisión no se confirmó y no debe presentarse como descargado.
- SR22: el portal histórico crl/service.cirrusaircraft.com no abrió; el catálogo nuevo sí. No se descargó un POH de terceros ni se compró uno. La disponibilidad de descarga puede ser distinta para propietarios o usuarios del portal de formación.
- Este bloque no identifica un conjunto completo de derivadas aerodinámicas de ninguna de las cinco avionetas.

## ¿Qué datos extraer para crear y calibrar el simulador?

### Takeaway
Los manuales sirven para construir sistemas y contrastar prestaciones publicadas; no equivalen a un modelo matemático completo del avión. Debe quedar trazabilidad entre cada dato, variante y condición de ensayo.

### Cited Findings
- PHAK dedica capítulos separados a controles, sistemas, instrumentos, peso y balance, y prestaciones; el capítulo 9 trata los propios manuales. [FAA PHAK](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak)
- Piper describe los PIM como versiones no serializadas para referencia; los documentos de una aeronave concreta se piden por número de serie. [Piper Technical Publications](https://www.piper.com/technical-publications/)
- El checklist Diamond advierte que no reemplaza el AFM ni contiene necesariamente todos sus procedimientos. [Diamond DA40 checklist](https://www.diamondaircraft.com/fileadmin/diamondaircraft/service-and-support/Pilot_Training_Austria/Checklists/checklists_DA40_180/DA40_180_Conventional_Cockpit/DA40_180_STAR_Checklist_Edit_17_A4.pdf)

### Inferences
- Extraer por avión: geometría y superficies de referencia; masas y brazos; combustible útil; límites estructurales y de motor; velocidades características; despegue, aterrizaje, ascenso y crucero; consumo; posiciones de flaps y tren; topología de electricidad/combustible; indicaciones y alarmas. Mantener peso, altitud de presión, temperatura, configuración, viento y unidades junto a cada tabla.
- Calibrar la física usando las tablas como puntos de validación; no convertir velocidades o rendimientos resumidos en coeficientes universales.
- Para realismo alto harán falta fuentes adicionales de estabilidad y control, inercias, dependencia de ángulo de ataque y resbalamiento, pérdida y pospérdida, fuerzas de mando, hélice, amortiguamiento y comportamiento del tren. Los investigadores de física cubren la metodología y los datos públicos relacionados.

### Gaps
- Ningún AFM/POH de una avioneta seleccionada fue confirmado como contenedor de todas esas derivadas. No inventarlas ni transferirlas de un avión militar, otra variante o un modelo comunitario sin justificar incertidumbre.

## ¿Qué diferencia hay entre AFM, POH, FCOM y AMM?

### Takeaway
Para avionetas el foco es AFM/POH/PIM, más manuales de equipos y sistemas. Los documentos de transporte comercial quedan para una fase posterior.

### Cited Findings
- AFM/POH y documentos complementarios: referencia general oficial en [PHAK, capítulo 9](https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-9-flight-manuals-and-other-documents). La página se verificó; no se leyó aquí el capítulo integral.
- PIM es una versión genérica o no serializada para referencia; no incluye necesariamente los datos únicos del avión. [Piper Owner Publications](https://www.piper.com/wp-content/uploads/2022/01/753-755-Owner-Publications-Catalog.pdf)
- FCOM contiene información de sistemas e instrucciones operativas ampliadas: ejemplo oficial del fabricante [Pilatus PC-24 Operational Documents](https://play.google.com/store/apps/details?hl=en&id=com.pilatus.pc_24).
- AMM y otros manuales técnicos se distribuyen por servicios de fabricantes: [Boeing Data & Services Marketplace](https://services.boeing.com/maintenance/tech-ops/data-services-marketplace).
- Los documentos públicos [Boeing Airport Planning](https://www.boeing.com/commercial/airports/plan-manuals) describen geometría, características y operaciones aeroportuarias; no son AFM ni FCOM y no deben etiquetarse como manuales de vuelo.
- Un ejemplo de POH público fuera de la selección vigente, [ICON A5](https://www.iconaircraft.com/POH/ICA016024-A_POH-A5-ALL-CHAPTERS-ISSUE-A%20-1-.pdf), incluye restricciones expresas de reproducción. Acceso gratuito no implica permiso de redistribución ni de reproducir sus gráficos dentro del videojuego.

### Inferences
- AFM: documento aprobado que especifica limitaciones e información de operación de la configuración aplicable. POH: manual del piloto, que puede incorporar el AFM aprobado; no asumir que cada página tiene la misma condición de aprobación.
- AMM: referencia de mantenimiento y funcionamiento técnico; útil para sistemas y fallos del juego. FCOM: operación de tripulación y explicación de sistemas, especialmente transportes.
- Mantener los originales como biblioteca privada de investigación y registrar derechos; no empaquetar manuales completos en el videojuego sin la autorización correspondiente. No se ha auditado licencia por licencia.

### Gaps
- No se adquirieron licencias, suscripciones ni permisos de reproducción; sólo se reunieron documentos y enlaces públicos. Airbus/Boeing y aviones de combate no son el foco actual de cinco avionetas.
