# Arquitectura

| Módulo                             | Responsabilidad                                           |
| ---------------------------------- | --------------------------------------------------------- |
| `src/game`                         | Reglas puras, tiempos, clasificación y proyección pública |
| `src/lib/realtime/host.ts`         | Autoridad de partida y confirmación de resultados         |
| `src/lib/realtime/player.ts`       | Cola de acciones, reintentos y respuesta del control      |
| `src/lib/realtime/bus.ts`          | Supabase Broadcast o demo explícita con BroadcastChannel  |
| `src/app/api/rooms`                | JWT, rol y operaciones breves de gestión                  |
| `supabase/migrations`              | Integridad SQL, RLS y concesión de host                   |
| `src/components/stage`             | Renderizado Canvas local, separado del móvil              |
| `src/components/stage/scene25d.ts` | Capas de profundidad 2.5D y sombras sin runtime 3D        |

No hay estado vivo de sala en memoria de Vercel Functions. El computador del organizador ejecuta el motor y genera los sprites mediante código.

## Capa visual 2.5D

La escena del proyector usa una composición de cámara fija: fondo lejano, fonda intermedia, cancha en perspectiva, personajes y un ribete en primer plano. `scene25d.ts` dibuja estas capas con Canvas 2D, extrusiones de panel y sombras de contacto. El resultado conserva el estilo pixel-art y añade profundidad sin introducir Three.js, WebGL, modelos descargables ni tráfico adicional.

El motor (`src/game/engine.ts`), el tipo `PublicRound`, las acciones móviles y la CPU no conocen esta capa. Por eso un futuro render de Blender puede sustituir un prop por un sprite horneado sin cambiar reglas, red, Supabase o la ruta `/solo`. El contrato de diseño y la aprobación pendiente viven en `docs/room/fonda-25d/`.

## Mensajes

Cada acción incluye versión, miembro, época de host, ronda, turno y secuencia. El equipo se deriva de su canal autorizado. El host deduplica antes de aplicar reglas; si falta una secuencia espera su reintento. También confirma los comandos rechazados para que la cola avance.

El control reintenta cada 350 ms con la misma secuencia. Se admiten hasta 12 acciones pendientes y 12 acciones por segundo por jugador. Los mensajes de rondas o turnos anteriores se confirman sin aplicarlos.

Heartbeats cada segundo, desconexión a los cuatro segundos y estado público hasta diez veces por segundo. La lectura de milisegundos del control es RTT de aplicación, no latencia unidireccional. La baraja oculta y las elecciones de penales no reveladas se excluyen del estado común.

Canales privados: `state`, `control`, `in:<memberId>`, `out:<memberId>`. RLS autoriza cada dirección de envío y recepción. La aplicación comprueba además la pertenencia del miembro antes de ejecutar el comando.

## Persistencia y recuperación

Índices únicos parciales y bloqueo de la sala garantizan una plaza por equipo y una plaza por usuario. Reasignar crea una nueva sesión y revoca el ID anterior. El host actualiza los miembros y deja de escuchar los canales revocados; no depende de que una conexión abierta reevalúe RLS inmediatamente.

La concesión de host dura seis segundos y se renueva cada dos. El motor deja de aceptar entradas a los cinco segundos sin renovación. Una nueva toma de control incrementa la época. Al recargar puede ser necesario esperar hasta que venza la concesión anterior.

Resultado único por ronda y transición a espera se confirman en una transacción. Los ensayos no crean resultados y tienen referencia de confirmación para admitir reintentos.

Ocultar la ventana del host pausa. Perder su transporte exige cancelar y repetir la ronda incompleta. Cerrar el host conserva únicamente el campeonato confirmado. El organizador es confiable: esta arquitectura no proporciona arbitraje remoto independiente.

Los tests SQL ejecutan la migración en PGlite, con `auth.uid` y `realtime.topic` simulados. La conexión al servicio real sigue requiriendo validación.

## CPU en salas con controles móviles

`Host` crea un `CpuPlayer` por equipo libre al iniciar una práctica con CPU. La lista humana se fija con los miembros devueltos por `begin`, después del bloqueo de la sala; se vuelve a comprobar que estén listos para evitar que una incorporación concurrente comparta equipo con un bot. Los bots usan el mismo motor y reciben exclusivamente `PublicRound`. No se crean usuarios ni miembros de Supabase para ellos.

Solo los participantes humanos deben enviar heartbeats. Perder uno pausa la ronda; nunca lo reemplaza automáticamente un bot. Cancelar descarta las instancias CPU y permite cambiar participantes. El host fuerza `practice: true` al usar esta opción y el SQL existente confirma la práctica sin insertar resultados del campeonato.

## Pantallas compartidas

`/host/[code]` sigue siendo la única autoridad y mantiene su concesión. `/watch/[code]` monta `WatchScreen`, que registra al visitante mediante la API y se suscribe al estado público. `ProjectorScreen` comparte el Canvas, temporizadores, marcador y audio entre ambas vistas. Una pantalla compartida no ejecuta el motor, CPU ni comandos del operador; su visibilidad no pausa al host.

La migración `202609090002_spectators.sql` añade `fonda_spectators`. Solo la API con credencial de servidor registra el `user.id` del JWT verificado, para la sala del enlace. RLS concede únicamente recepción de `state`; no envío, acceso a elecciones privadas, canales de controles ni concesión del host. Los visitantes pueden usar sesiones anónimas y no consumen plazas de equipo.

Las vistas ajustan los relojes de dibujo y temporizadores según `sentAt` del host. Esto corrige diferencias del reloj del computador, pero no elimina el retraso de transporte. Después de cuatro segundos sin estado una vista muestra espera de conexión. Las escenas siguen llegando desde el host, sin emisión de vídeo ni un segundo motor que pueda divergir.

## Modo individual

La ruta `/solo` ejecuta `SoloSession` en el navegador: reutiliza el motor de reglas y el Canvas del evento, y coloca el control humano junto a la cancha. No crea una sala ni inicializa clientes de Supabase. Tres instancias de `CpuPlayer` reciben exclusivamente `PublicRound`; las cartas ocultas, las elecciones secretas y la semilla del playoff nunca se entregan al rival.

Las semillas de los rivales son independientes de la semilla del tablero. El programador de CPU usa tiempos y acciones del mismo motor: no modifica pasos, cartas ni puntajes directamente. Cada CPU mantiene su propia memoria limitada de cartas vistas. `GamePad` y `controlState` se comparten con los celulares para conservar reglas y controles consistentes.

El reloj avanza cada 50 ms; Canvas dibuja por `requestAnimationFrame`. Al ocultar la pestaña se pausa explícitamente y la reanudación desplaza los plazos del motor. Los resultados se registran una sola vez por ID en el estado de React y se descartan al recargar; nunca se confirman mediante la API del campeonato.
