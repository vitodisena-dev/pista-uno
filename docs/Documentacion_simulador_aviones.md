# Construye un simulador con fuentes verificables

Biblioteca inicial para un videojuego realista de aviones. Consulta: 18 de noviembre de 2026.

La base reunida permite estudiar e implementar la dinámica de vuelo, pero **todavía no contiene los datos completos para reproducir cinco aeronaves con alta fidelidad**. La propuesta actual es comenzar con avionetas y desarrollar primero una sola; después, extender el mismo núcleo a Cessna 152, Cessna 172, Piper PA-28, Diamond DA40 y Cirrus SR22. Las variantes, motores y aviónica siguen pendientes. Se conservaron **22 PDF oficiales o académicos, un ZIP de datos y seis archivos técnicos de JSBSim**, además de índices y notas. Ninguno de los cinco aviones tiene aquí un AFM/POH íntegro descargado. Los estudios de cazas y transportes sirven como referencias matemáticas y para una fase posterior. Esta es una biblioteca inicial ampliable, no un inventario mundial de manuales.

## Cinco candidatos necesitan una variante y su manual

La elección práctica propuesta es explorar primero una **C172 de configuración definida**, siempre que se obtengan su documentación autorizada y datos suficientes de dinámica. La DA40 es otra candidata, pero su checklist público no acredita que dispongamos de un mejor modelo físico. Esta recomendación es una decisión de alcance, no una comparación de fidelidad medida.

| Candidato | Qué se localizó oficialmente | Qué falta para empezar su modelo |
|---|---|---|
| Cessna 152 | Ruta de acceso a publicaciones mediante [Textron 1View](https://download.txtav.com/webCDN/1VIEW_UsersGuide.pdf). Se guardó la guía de acceso. | AFM/POH de la configuración elegida; datos de dinámica y propulsión. No se confirmó un PDF completo gratuito del fabricante. |
| Cessna 172 | La misma ruta oficial de [Textron 1View](https://download.txtav.com/webCDN/1VIEW_UsersGuide.pdf). | Fijar variante, año, motor y aviónica; obtener el AFM/POH aplicable. La guía guardada no es un POH. |
| Piper PA-28 | [Piper Technical Publications](https://www.piper.com/technical-publications/) ofrece vías para PIM de referencia y ePOH/publicaciones. | Elegir una variante concreta de la familia; obtener los documentos aplicables. No se realizó compra. |
| Diamond DA40 | [Checklist oficial DA40-180](https://www.diamondaircraft.com/fileadmin/diamondaircraft/service-and-support/Pilot_Training_Austria/Checklists/checklists_DA40_180/DA40_180_Conventional_Cockpit/DA40_180_STAR_Checklist_Edit_17_A4.pdf), edición 2015, guardado. | AFM íntegro y revisión aplicable. El enlace identificado falló por certificado/timeout; su contenido no quedó confirmado. El checklist no sustituye al AFM. |
| Cirrus SR22 | [Catálogo oficial de publicaciones SR22](https://store.cirrusaircraft.com/pro-shop-retail-products/tech-pubs/sr22-all/5637148448.c?domain=store.cirrusaircraft.com), con configuraciones distintas. | Elegir generación, motor y aviónica; obtener el POH adecuado. Se verificó un producto de la tienda, sin PDF libre confirmado. |

**AFM** identifica el manual aprobado aplicable; el **POH** es el manual del piloto y puede incorporar el AFM aprobado. Un **PIM** es una referencia genérica no serializada. FCOM y AMM amplían operación y mantenimiento de sistemas; no son bases aerodinámicas completas. Estas distinciones evitan mezclar datos de aviones o revisiones diferentes. ([FAA, manuales y documentos](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak), [Piper](https://www.piper.com/technical-publications/))

## Nueve fuentes forman la biblioteca de trabajo

Conviene leer por función: comportamiento esperado, ecuaciones, implementación y comprobación. La siguiente selección es el punto de entrada; los portales ofrecen material adicional enlazado en las notas.

| Fuente esencial | Para qué usarla | Qué quedó guardado |
|---|---|---|
| [FAA Pilot’s Handbook of Aeronautical Knowledge](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak) | Controles, sistemas, instrumentos, masas y prestaciones; vocabulario común del proyecto. | PDF completo, FAA-H-8083-25C. |
| [FAA Airplane Flying Handbook](https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/airplane_handbook) | Referencia del comportamiento esperado y de futuras misiones/tutoriales del juego. | Sólo capítulo 3; el libro completo queda enlazado. |
| [FAA Weight & Balance Handbook](https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/FAA-H-8083-1.pdf) | Masas, momentos y centro de gravedad. | PDF completo. |
| [MIT 16.333: Aircraft Stability and Control](https://ocw.mit.edu/courses/16-333-aircraft-stability-and-control-fall-2004/pages/lecture-notes/) | Equilibrio, ejes, cuaterniones, fuerzas, derivadas y respuesta al viento. | Cuatro notas: clases 1, 3, 4 y 14. |
| [U.S. Standard Atmosphere, 1976](https://ntrs.nasa.gov/citations/19770009539) | Ambiente de referencia reproducible para cálculos y pruebas. | PDF NASA/NOAA/USAF. |
| [NASA NESC: 6DOF check-cases](https://nescacademy.nasa.gov/flightsim/2015) | Detectar errores de ejes, unidades, integración y entorno mediante casos definidos. | Dos volúmenes del informe. Modelos y erratas adicionales quedan en el portal. |
| [JSBSim: manual y repositorio](https://jsbsim-team.github.io/jsbsim-reference-manual/) | Evaluar un núcleo físico configurable para fuerzas, controles, propulsión y tren. | README, licencias y dos XML de referencia; no un simulador completo. |
| [NASA CR-96008, Teper](https://ntrs.nasa.gov/citations/19690022405) | Ejemplos de geometría, masas, inercia y derivadas; incluye Navion. | PDF histórico. Sus condiciones limitadas no validan las cinco avionetas. |
| [UIUC: perfiles y hélices](https://m-selig.ae.illinois.edu/props/propDB.html) | Comprender datos experimentales y relaciones de empuje/potencia. | Volumen 2 de perfiles y ZIP de pequeñas hélices. No son mapas de las hélices reales de los cinco candidatos. |

Para clima, se añadió el [FAA Aviation Weather Handbook](https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/faa-h-8083-28b-aviation-weather-handbook). La atmósfera estándar proporciona una referencia; el viento y la meteorología variable requieren modelos propios. Para el primer prototipo se recomienda comenzar con condiciones reproducibles y aumentar su complejidad después de comprobar la dinámica básica.

## La física necesita datos que el POH no resuelve

Un avión simulado requiere **seis grados de libertad**: tres traslaciones y tres rotaciones. El estado integra posición, velocidad, orientación y velocidades angulares a partir de fuerzas y momentos. Las notas MIT y los casos NASA describen convenciones y comprobaciones; la arquitectura siguiente es una síntesis propuesta para el videojuego. ([MIT](https://ocw.mit.edu/courses/16-333-aircraft-stability-and-control-fall-2004/pages/lecture-notes/), [NASA NESC](https://nescacademy.nasa.gov/flightsim/2015))

| Bloque por aeronave | Datos necesarios | Cómo obtenerlos o contrastarlos |
|---|---|---|
| Geometría y masas | Superficies de referencia, dimensiones, masa, centro de gravedad y tensor de inercia. | AFM/POH, documentos técnicos y datos experimentales aplicables. La inercia no se deduce sólo de la masa total. |
| Aerodinámica | Fuerzas y momentos frente a ángulo de ataque, resbalamiento, velocidad y mandos; amortiguamiento. | Ensayos, datos publicados y estimaciones de análisis que se documenten y calibren. |
| Configuración | Efectos de flaps, combustible, cargas y posiciones de mandos; límites y actuadores. | Manuales y datos de la variante concreta. |
| Motor y hélice | Potencia, consumo, respuesta temporal, régimen, avance y paso cuando corresponda. | Mapas y documentación de la combinación real motor-hélice; no copiar datos de pequeñas hélices UIUC. |
| Pérdida y postpérdida | Curvas no lineales, momentos y límites del rango representado. | Datos específicos; no extrapolar una recta de sustentación ni prometer barrenas precisas sin evidencia. |
| Suelo y tren | Puntos de contacto, suspensión, rozamiento, ruedas y frenos. | Geometría, documentación y calibración. El estudio NASA HSCT aporta método, no parámetros de una avioneta. |
| Ambiente y cabina | Densidad, presión, temperatura, viento; sensores, instrumentos y sistemas. | Atmósfera estándar, modelos de viento y manuales de equipos/configuración. |

**XFOIL, AVL y VSPAERO sirven para producir o estudiar datos antes de jugar.** XFOIL analiza perfiles 2D; AVL estima características de superficies sustentadoras y estabilidad; VSPAERO trabaja a partir de geometría OpenVSP. Sus límites no justifican precisión en pérdida profunda. Una implementación puede interpolar tablas durante la partida en vez de ejecutar un análisis aerodinámico complejo en cada imagen. Esto es una recomendación de diseño, no un resultado de rendimiento medido. ([XFOIL](https://web.mit.edu/drela/Public/web/xfoil/), [AVL](https://web.mit.edu/drela/Public/web/avl/), [NASA VSPAERO](https://www.nasa.gov/reference/openvsp-vspaero-basics/))

La cadena propuesta es **mandos → actuadores → física con intervalo fijo → estado del avión → instrumentos, sonido e imagen**. El motor físico y el gráfico deben intercambiar ejes y unidades de forma explícita y tener una sola autoridad para integrar posición y orientación. JSBSim es una opción para evaluar; el motor gráfico todavía no se ha elegido. ([JSBSim](https://github.com/JSBSim-Team/jsbsim), [Unity, pasos fijos](https://docs.unity.com/en-us/engine/6000.3/manual/scripting/managing-time-and-frame-rate/fixed-updates))

## Una aeronave validada debe preceder a las otras cuatro

La secuencia propuesta reduce la incertidumbre antes de multiplicar cabinas y contenidos. Su objetivo es un prototipo medible; no se fijó una tolerancia de precisión porque faltan variante y datos de referencia.

| Etapa | Entrega concreta | Criterio para avanzar |
|---|---|---|
| Definir el primer avión | Ficha de variante, motor, hélice, aviónica, masas y fuentes. | Documentos aplicables identificados y vacíos anotados; objetivo de fidelidad delimitado. |
| Comprobar la dinámica sin gráficos | Estado, ambiente y fuerzas/momentos registrados en archivos. | Ejes, unidades y condiciones iniciales consistentes; resultados reproducibles. |
| Verificar el cálculo | Comparaciones con un subconjunto pertinente de casos NASA NESC y sus correcciones. | Trayectorias y errores registrados; estabilidad razonable al reducir el intervalo de integración. |
| Ajustar prestaciones del avión | Pruebas de equilibrio, crucero, ascenso, consumo y comportamiento en pista. | Comparación con AFM/POH bajo las mismas condiciones de masa, temperatura, altura y configuración. |
| Validar respuesta y límites | Respuesta a mandos, amortiguamiento, configuraciones y rango próximo a pérdida. | Datos experimentales cuando existan; incertidumbre y límites representados de forma explícita. |
| Completar la experiencia | Cabina, instrumentos, sonido, terreno y controles del jugador. | Lecturas coherentes con el estado físico; el dibujo no altera los resultados de la simulación. |
| Ampliar a cinco | Un paquete de datos y sistemas por variante. | Cada aeronave repite su propia validación; no se presenta como otro avión cambiando sólo la apariencia. |

**Verificar el cálculo no es validar el avión.** Coincidir con una esfera o con el F-16 de NASA ayuda a comprobar el programa, pero no demuestra que una C172 vuele correctamente. Los datos usados para ajustar deben distinguirse de los reservados para evaluar el resultado. ([NASA NESC](https://nescacademy.nasa.gov/flightsim/2015))

JSBSim permite estudiar una dinámica independiente de gráficos y tiene un [ejemplo de integración con Unreal](https://github.com/JSBSim-Team/jsbsim/blob/master/UnrealEngine/README.md). Su README atribuye la referencia al equipo de simulación de Epic. No se verificó un plugin oficial equivalente para Unity; su documentación de pasos fijos es una referencia de arquitectura, no una integración de JSBSim lista para usar. El [substepping de Unreal](https://dev.epicgames.com/documentation/en-us/unreal-engine/physics-sub-stepping-in-unreal-engine) pertenece a su propia física y no configura automáticamente un integrador externo.

## El catálogo ampliado conserva métodos y futuros reactores

Estos documentos amplían la biblioteca. Los parámetros de una aeronave de investigación no deben transferirse a una avioneta ni a otra variante sin justificación.

| Fuente primaria | Utilidad y alcance | Estado |
|---|---|---|
| [NASA CR-1998-206937, Dryden/HARV](https://ntrs.nasa.gov/api/citations/19980028448/downloads/19980028448.pdf) | Modelos estadísticos de turbulencia e implementaciones comparadas; no meteorología completa. | PDF guardado. |
| [NASA TM-1999-209531, tren y suelo HSCT](https://ntrs.nasa.gov/citations/20000011601) | Métodos de contacto, suspensión y respuesta en pista; parámetros de otro avión. | PDF guardado. |
| [UIUC Airfoil Coordinates](https://m-selig.ae.illinois.edu/ads/coord_database.html) | Geometría de perfiles 2D; no fuerzas y momentos del avión completo. | Enlace al catálogo. |
| [UIUC Wind Tunnel Data](https://m-selig.ae.illinois.edu/pd.html) | Experimentos de perfiles a bajos Reynolds; conservar límites y condiciones de uso. | Un volumen guardado; catálogo enlazado. |
| [XFOIL](https://web.mit.edu/drela/Public/web/xfoil/), [AVL](https://web.mit.edu/drela/Public/web/avl/) y [OpenVSP/VSPAERO](https://www.nasa.gov/reference/openvsp-vspaero-basics/) | Herramientas para generar y contrastar estimaciones; no ejecutadas en esta investigación. | Documentación enlazada. |
| [JSBSim.xsd](https://github.com/JSBSim-Team/jsbsim/blob/master/JSBSim.xsd) y [FGFDMExec.h](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/src/FGFDMExec.h) | Formato de configuración y API de ejecución; no suministran los datos del avión. | Enlaces oficiales. |
| [FlightGear: modelos de dinámica](https://flightgear.gitlab.io/getstart/next/en/HTML/getstart-ench2.html) | Contexto de JSBSim, YASim y dinámica externa. | Manual enlazado. |
| [NASA TP-1538, F-16](https://ntrs.nasa.gov/citations/19800005879) | Banco histórico con datos de pérdida/postpérdida de configuración definida. No representa todo F-16 moderno. | PDF guardado; fase futura. |
| [NASA TM-107601, F/A-18 base](https://ntrs.nasa.gov/citations/19920024293) y [TM-110216, HARV](https://ntrs.nasa.gov/citations/19960027892) | Dinámica, actuadores, control y versión de investigación modificada. No equivalen a un Hornet de serie actual. | Dos PDF guardados; fase futura. |
| [NASA TCM/GTM](https://ntrs.nasa.gov/citations/20110014509) y [GTM_DesignSim](https://github.com/nasa/GTM_DesignSim) | Transporte genérico y simulación de investigación. No son datos validados de A320, 737 o 747. | Informe guardado; repositorio enlazado. |
| [NASA CR-2144, handling qualities](https://ntrs.nasa.gov/citations/19730003312) | Datos históricos de varias aeronaves, incluido B747; deben casar configuración y condiciones. | PDF guardado; fase futura. |

El manual histórico [JSBSim PDF de 2011](https://jsbsim.sourceforge.net/JSBSimReferenceManual.pdf) pudo consultarse en web, pero su descarga devolvió 403: queda enlazado, sin archivo guardado. La documentación HTML actual tiene secciones incompletas; debe contrastarse con una versión concreta del código. Digital DATCOM quedó como pista no verificada y no se cuenta como documento obtenido.

## Drive conserva los originales y hace visibles los pendientes

La [biblioteca de Drive](https://drive.google.com/drive/folders/1vqRnNGqqRyYjqdarXL9XAXQQBKQvTOCK) está organizada en [manuales y acceso por aeronave](https://drive.google.com/drive/folders/1Y8qTUjY4e7JKqWHjp1kZwMmu6-iqGHad), [física y aerodinámica](https://drive.google.com/drive/folders/1HV7Rnxoa-RSU8_LXvL9ZcXYP_vetwtV7), [motor de simulación](https://drive.google.com/drive/folders/15ytYaR9SWrvl_8eoWH8qBSyUaHSN30JB) y [notas y fuentes](https://drive.google.com/drive/folders/193RtKYrK8egQ0JaDRtjE0GfAiipcTw4y). Los manifiestos registran enlaces originales, estado de descarga, tamaños y hashes cuando corresponde.

| Material reunido | Alcance real |
|---|---|
| 6 PDF de manuales y acceso | PHAK completo, Weight & Balance, Weather, AFH capítulo 3, checklist DA40-180 y guía Textron 1View. No son seis POH de avión. |
| 16 PDF de física | Cuatro notas MIT, dos volúmenes NESC, atmósfera, perfiles UIUC y ocho informes NASA adicionales. |
| 1 ZIP de datos | UIUC Propeller Database, para pequeñas hélices y comparación metodológica. |
| 6 archivos técnicos del motor | Dos licencias, dos README y XML de F-16/737. Los XML solos no incluyen dependencias, cabina ni un avión completo para el juego. |
| Índices, manifiestos y notas | Disponibilidad por avioneta, procedencia de archivos, fuentes ampliadas y vacíos. |

El acceso público permite investigar, pero no concede automáticamente derechos para incorporar código, datos o manuales en un producto. La biblioteca **JSBSim se presenta como LGPL 2.1**, el ejemplo Unreal tiene licencia **MIT** y los modelos F-16/737 declaran **GPL** en sus encabezados. C172p y 737 contienen además avisos de no venta que requieren aclaración antes de plantear su distribución comercial. No se resolvió aquí la compatibilidad de un paquete final. ([JSBSim COPYING](https://github.com/JSBSim-Team/jsbsim/blob/master/COPYING), [Unreal LICENSE](https://github.com/JSBSim-Team/jsbsim/blob/master/UnrealEngine/LICENSE.txt), [C172p](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/c172p/c172p.xml), [737](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/737/737.xml))

Los datos experimentales de perfiles UIUC incluyen condiciones de atribución y distribución; XFOIL y AVL tienen sus propias licencias. Estudiar documentación, generar resultados con una herramienta e incorporar su código son usos distintos. Los originales guardados son material de investigación y no un paquete de recursos autorizado para distribuir con el videojuego. ([UIUC](https://m-selig.ae.illinois.edu/pd.html), [XFOIL](https://web.mit.edu/drela/Public/web/xfoil/), [AVL](https://web.mit.edu/drela/Public/web/avl/))

La siguiente decisión útil es **fijar una variante y obtener su AFM/POH aplicable antes de construir cinco cabinas**. Después se debe cerrar una ficha que marque cada dato como medido, publicado, estimado o pendiente. Esa trazabilidad permitirá ampliar el proyecto sin confundir una aproximación de diseño con una característica comprobada del avión.
