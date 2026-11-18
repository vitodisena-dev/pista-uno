# Software e integración para el simulador

## ¿Qué documentación reduce la carga de implementar desde cero?

### Takeaway
La orientación más reciente del usuario favorece empezar con avionetas y mantener un objetivo de realismo tipo Microsoft Flight Simulator. C152, C172, PA28, DA40 y SR22 son una propuesta de cinco aeronaves para estudiar, no selección cerrada. Recomiendo construir primero una sola; JSBSim merece evaluarse como núcleo físico común. El motor gráfico sigue sin elegirse y no se ha construido el videojuego. La investigación de F-16 y transportes queda como referencia para verificación matemática y una posible fase futura.

### Cited Findings

Catálogo de fuentes primarias. Los enlaces indicados como verificados se abrieron y devolvieron contenido durante esta investigación; la comprobación no equivale a una auditoría completa de software.

| Fuente | Acceso comprobado | Qué aporta al proyecto | Límite que conviene conocer |
|---|---|---|---|
| [JSBSim Reference Manual en línea](https://jsbsim-team.github.io/jsbsim-reference-manual/) | HTML público verificado | Índice de conceptos, ejes, unidades, propiedades, fuerzas, cuaterniones y ecuaciones de movimiento. | Documentación comunitaria en desarrollo; algunas páginas están sin completar. |
| [JSBSim Reference Manual PDF](https://jsbsim.sourceforge.net/JSBSimReferenceManual.pdf) | PDF público verificado, 158 páginas | Manual de usuario, programación, configuración XML y casos de estudio. | Edición identificada dentro del documento como 2011; contrastar sintaxis con código y esquema actuales. |
| [Repositorio oficial JSBSim](https://github.com/JSBSim-Team/jsbsim) | GitHub público verificado mediante su README | Biblioteca C++ de dinámica no lineal de seis grados de libertad; controles, aerodinámica, propulsión y tren configurables en XML; posibilidad de ejecución sin gráficos. | El propio proyecto describe sus aviones reales como aproximaciones para educación o entretenimiento, no datos propietarios del fabricante. |
| [Esquema oficial JSBSim.xsd](https://github.com/JSBSim-Team/jsbsim/blob/master/JSBSim.xsd) | Código/XML público verificado | Estructura de archivos de aerodinámica, masa, propulsión, tanques, contactos y mandos. | Un esquema de formato no suministra los coeficientes reales de un avión. |
| [Cabecera del ejecutivo FGFDMExec](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/src/FGFDMExec.h) | Código documentado público verificado | API de carga de modelos, inicialización, ejecución, propiedades y paso temporal. | Es referencia de implementación; fijar una versión del repositorio para desarrollar. |
| [Modelo C172p de JSBSim](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/c172p/c172p.xml) | XML público verificado | Referencia de estructura: masas, geometría, controles, hélice/motor y funciones aerodinámicas. | El encabezado informa de estimaciones, validación limitada y aviso de no venta. No se descargó con el paquete de seis archivos; no proponerlo como avión listo para distribución comercial. |
| [Modelo F-16 de JSBSim](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/f16/f16.xml) | XML público verificado | Configuración identificada como F-16A Block-32; cita NASA TP-1538 y expone masa, inercias, controles y aerodinámica. | Su encabezado declara GPL para el modelo, diferente de la biblioteca; datos públicos y sin aval del fabricante. No es un modelo oficial de Lockheed Martin. |
| [Modelo 737 de JSBSim](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/737/737.xml) | XML público verificado | Ejemplo de transporte bimotor, tren, tanques y funciones aerodinámicas. | Se declara BETA y GPL pero también contiene aviso de no venta; no presentarlo como modelo comercial listo para redistribuir. No identifica una variante precisa de 737 en su descripción. |
| [JSBSim for Unreal: UEReferenceApp](https://github.com/JSBSim-Team/jsbsim/blob/master/UnrealEngine/README.md) | README público verificado | Ejemplo de integración de JSBSim con Unreal; el texto atribuye su creación al equipo de simulación de Epic en Antoinette Project. Incluye pasos de compilación y una referencia para Linux/macOS. | Es una aplicación de referencia deliberadamente sencilla; comprobar compatibilidad con la versión elegida de Unreal. |
| [FlightGear Manual, §2.4 Flight Dynamics Models](https://flightgear.gitlab.io/getstart/next/en/HTML/getstart-ench2.html) | Manual HTML público verificado | Explica alternativas de dinámica, incluyendo JSBSim y YASim, y visualización con una dinámica externa. | YASim usa geometría como entrada, según el manual; no afirmar que toda integración FlightGear tenga la misma licencia que JSBSim. |
| [Unity: Fixed updates](https://docs.unity.com/en-us/engine/6000.3/manual/scripting/managing-time-and-frame-rate/fixed-updates) | Manual oficial público verificado | Cómo separar pasos de física del número de imágenes por segundo, acumulación de pasos y coste de CPU. | No es un plugin de JSBSim para Unity ni proporciona un avión. |
| [Unreal: Physics Sub-Stepping](https://dev.epicgames.com/documentation/en-us/unreal-engine/physics-sub-stepping-in-unreal-engine) | Manual oficial público verificado | Subpasos, estabilidad, coste y tratamiento de callbacks de colisión en el motor. | Esta física de Unreal y el integrador de JSBSim son componentes diferentes; no suponer que activar subpasos haga correcta una integración externa. |
| [NASA NESC: 6-DOF Flight Simulation Check-cases](https://nescacademy.nasa.gov/flightsim/2015) | Portal público verificado | Informes, modelos DAVE-ML, condiciones iniciales y trayectorias de referencia descargables para comparación numérica. | Verifica ecuaciones de movimiento y entorno; no certifica por sí solo la aerodinámica de una aeronave comercial. |
| [Laminar Research: How X-Plane Works](https://www.x-plane.com/desktop/how-x-plane-works/) | Explicación oficial pública verificada | Descripción conceptual de dividir superficies en elementos, calcular fuerzas locales y sumarlas. | Página explicativa y promocional: no adoptar sus comparaciones de superioridad como conclusión independiente ni copiar código propietario. |

- El manual en línea explica que JSBSim utiliza tablas y funciones algebraicas para modelar características aerodinámicas y de control, con propiedades que conectan sus subsistemas. — [Conceptos de simulación JSBSim](https://jsbsim-team.github.io/jsbsim-reference-manual/user/concepts/simulation/)
- El XML de ejemplo c172p contiene funciones de fuerzas por ejes y tablas de efecto suelo, además de términos dependientes de mandos y velocidades angulares. — [c172p.xml](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/c172p/c172p.xml)
- La API ofrece `Setdt` para el intervalo de integración, `RunIC` para inicializar y `Run` para ejecutar los modelos programados. — [FGFDMExec.h](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/src/FGFDMExec.h)
- La página «Authoring configuration files» del manual en línea sólo muestra contenido pendiente; por eso no debe presentarse como guía completa para crear aviones. — [Página verificada](https://jsbsim-team.github.io/jsbsim-reference-manual/user/authoring-config-files/)

### Inferences

- Recomendación: comparar tres alcances, sin declarar un ganador universal. (1) Física simplificada propia para un juego accesible: fuerzas básicas y ayudas de control deliberadas. (2) Modelo de coeficientes/tablas con JSBSim para un simulador de avión específico: requiere datos aerodinámicos y calibración. (3) Modelo de elementos/superficies para experimentar con geometrías: requiere perfiles, velocidades locales y correcciones de interacción. Ninguna elección garantiza realismo sin datos y validación. Esta clasificación se infiere de la flexibilidad documentada por JSBSim y los métodos descritos por FlightGear/Laminar, no de un ensayo comparativo realizado aquí.
- Para las cinco avionetas propuestas (C152, C172, PA28, DA40, SR22), separar motor físico compartido de cinco paquetes de datos, propulsión, mandos y sistemas. Construir una primera aeronave y validar despegue, ascenso, crucero y aterrizaje antes de extender a las restantes. El F-16 público/NASA sirve como banco de pruebas matemático y los jets como fase futura, sin convertir ese conjunto de datos en el modelo de una avioneta. Esto es una recomendación de alcance; no es evidencia de que estén cubiertas las cinco aeronaves por modelos reutilizables completos.
- Arquitectura propuesta: entradas del mando → controles/actuadores → dinámica con intervalo fijo → estado de aeronave → instrumentos, sonido y dibujo interpolado. Mantener conversión explícita de unidades/ejes. Elegir una sola autoridad para posición y orientación: si JSBSim integra el vuelo, evitar que otra física del motor integre simultáneamente el mismo avión. Estas son recomendaciones de diseño; no funcionalidades que el ejemplo Unreal garantice ya resueltas.

### Gaps

- No se encontró ni verificó en esta investigación un plugin oficial equivalente de JSBSim para Unity. Es viable estudiar una integración mediante biblioteca nativa, pero no debe presentarse como integración lista para usar.
- Dos URLs de documentación API indexadas bajo `jsbsim-team.github.io/jsbsim/classJSBSim_1_1...` devolvieron 404 al abrirse; usar las cabeceras verificadas del repositorio, no listarlas como documentos disponibles.
- Un PDF oficial Garmin DA42NG apareció en búsquedas, pero no pudo extraerse por tamaño; no se incluye como fuente inspeccionada de sistemas. Esa parte corresponde mejor al catálogo de manuales.

## ¿Qué fuentes sirven para validación?

### Takeaway
Separar verificación del programa y validación del avión. Las pruebas NASA ayudan a descubrir errores matemáticos; las tablas de un AFM/POH y los datos experimentales del avión elegido permiten comprobar si el resultado corresponde a esa aeronave.

### Cited Findings

- NASA NESC publicó escenarios predefinidos, modelos, condiciones iniciales y trayectorias para comparar siete herramientas, incluyendo casos de esfera, viento, cizalladura y F-16. El informe final tiene dos volúmenes: resumen y apéndices detallados. — [Portal NASA NESC y descargas](https://nescacademy.nasa.gov/flightsim/2015)
- El proyecto JSBSim ofrece salida a archivo y ejecución por lotes, útiles para comparar trayectorias sin gráficos. — [README oficial JSBSim](https://github.com/JSBSim-Team/jsbsim/blob/master/README.md)
- El manual de JSBSim documenta archivos de aeronaves, scripts, controles y procedimientos de ajuste; su alcance explícitamente no sustituye un tratado de derivación completa de dinámica de vuelo. — [Manual PDF, edición 2011](https://jsbsim.sourceforge.net/JSBSimReferenceManual.pdf)

### Inferences

- Secuencia propuesta para prototipo: 1) Elegir avión y nivel de realismo. 2) Crear ficha de masas, geometría, motor, hélice, mandos y fuentes. 3) Ejecutar dinámica sin gráficos y comprobar ejes, unidades, gravedad y condiciones iniciales. 4) Comparar un subconjunto de casos NASA. 5) Calibrar crucero, ascenso, consumo, velocidades de pérdida y distancias de pista con datos del avión elegido y mismas condiciones de peso, altura y temperatura. 6) Añadir cabina, mandos y escenario. 7) Incorporar viento, fallas, postpérdida y sistemas complejos según evidencia disponible.
- Registrar errores relativos/absolutos y condiciones de cada prueba permite distinguir una diferencia por ambiente o masa de un defecto del modelo. Ajustar la frecuencia hasta que las trayectorias converjan razonablemente, en lugar de prometer que una cifra fija de Hz sirve para todos los aviones.
- Datos que suelen hacer falta para un modelo detallado: tensor de inercia, curvas de fuerza y momento con ángulo de ataque/resbalamiento/Mach, derivadas de amortiguamiento y mandos, efectos de flaps/tren, mapas motor/hélice y comportamiento postpérdida. No deducir que poseer un POH elimina estas carencias.

### Gaps

- Hay una propuesta de cinco avionetas, pero no se fijaron variantes ni motorizaciones y no se dispone de conjuntos experimentales completos; no se puede prometer una tolerancia de precisión ni validar los cinco modelos todavía.
- Una comprobación directa de rutas presuntas `aircraft/747/747.xml` y `aircraft/f18/f18.xml` no entregó un modelo verificable. Esto no demuestra que no existan alternativas; no se incluye soporte listo para F/A-18, A320 o 747 como hallazgo confirmado.
- Una coincidencia con pruebas de esfera o F-16 NASA no demuestra fidelidad de una avioneta distinta.

## ¿Qué hay que revisar antes de distribuir código y modelos?

### Takeaway
La licencia del motor de física, la del ejemplo de integración y los avisos de cada aeronave deben distinguirse. La biblioteca JSBSim se presenta como LGPL 2.1, el ejemplo Unreal como MIT y los XML F-16/737 declaran GPL en sus propios encabezados; el 737 además contiene un aviso de no venta.

### Cited Findings

- El README presenta la biblioteca y el módulo Python como LGPL 2.1 y el archivo `COPYING` incluye el texto de esa licencia. — [README oficial](https://github.com/JSBSim-Team/jsbsim/blob/master/README.md), [COPYING](https://github.com/JSBSim-Team/jsbsim/blob/master/COPYING)
- El ejemplo Unreal tiene un archivo de licencia MIT separado. — [UnrealEngine/LICENSE.txt](https://github.com/JSBSim-Team/jsbsim/blob/master/UnrealEngine/LICENSE.txt)
- El C172p contiene un aviso explícito de no venta y aclara que no es avalado por el fabricante. No inferir permiso comercial de la licencia general del motor físico. — [C172p XML](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/c172p/c172p.xml)
- El modelo F-16 declara `GPL (General Public License)` y cita NASA TP-1538; su encabezado no fija una versión numérica de GPL. — [F-16 XML](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/f16/f16.xml)
- El modelo 737 también declara GPL, pero su nota añade la frase exacta «This model is not to be sold». Es una combinación de avisos que se debe aclarar antes de redistribuirlo comercialmente; no resolver aquí esa inconsistencia como si fuera una autorización. — [737 XML](https://raw.githubusercontent.com/JSBSim-Team/jsbsim/master/aircraft/737/737.xml)
- El manual de 2011 explica que el encabezado de cada modelo puede recoger licencia, referencias, notas y limitaciones. — [Manual PDF, sección 3.1.1](https://jsbsim.sourceforge.net/JSBSimReferenceManual.pdf)

### Inferences

- Para el catálogo final basta una nota concreta: «acceso público no equivale a permiso para incorporar o redistribuir; comprobar cada documento, código y modelo». No hace falta ampliar esto a una asesoría legal general ni presentar impedimentos hipotéticos como decisiones ya tomadas.
- Antes de comprometer un juego comercial, seleccionar una versión de la biblioteca y modelos con permisos compatibles comprobados; revisar obligaciones del modo de distribución y conservar atribuciones. Los avisos particulares del C172p y del 737 requieren aclaración o un modelo propio/alternativo antes de plantear su venta. Revisar GPL del modelo F-16 de forma separada de LGPL de la biblioteca.

### Gaps

- No se auditó el conjunto de modelos de JSBSim ni los recursos de FlightGear. No afirmar una única licencia para todos los archivos, cabinas, texturas y sonidos.
- No se evaluó compatibilidad jurídica de una distribución final Unity/Unreal/JSBSim concreta, porque aún no existe una arquitectura ni paquete final decidido.
