# Arquitectura

| Módulo                       | Responsabilidad                                           |
| ---------------------------- | --------------------------------------------------------- |
| `src/game`                   | Reglas puras, tiempos, clasificación y proyección pública |
| `src/lib/realtime/host.ts`   | Autoridad de partida y confirmación de resultados         |
| `src/lib/realtime/player.ts` | Cola de acciones, reintentos y respuesta del control      |
| `src/lib/realtime/bus.ts`    | Supabase Broadcast o demo explícita con BroadcastChannel  |
| `src/app/api/rooms`          | JWT, rol y operaciones breves de gestión                  |
| `supabase/migrations`        | Integridad SQL, RLS y concesión de host                   |
| `src/components/stage`       | Renderizado Canvas local, separado del móvil              |

No hay estado vivo de sala en memoria de Vercel Functions. El computador del organizador ejecuta el motor y genera los sprites mediante código.

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
