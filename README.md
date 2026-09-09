# FondaVS

Cuatro equipos, un proyector y celulares como controles. MVP de fonda para **Creative, Lab, Sports y Media**, construido con Next.js, React, TypeScript, Canvas 2D y Supabase.

## Incluido

- Sala del operador con código/QR, plazas exclusivas y cancha en la misma ventana. Se activa al abrirla.
- Carrera de sacos, rayuela, penales con playoff y memorice.
- Ensayos sin puntos, ranking, pausa y cancelación de rondas.
- Acciones con confirmación, deduplicación y canales privados.
- Resultados confirmados persistentes y concesión de host única.
- Modo individual contra tres CPU: cuatro juegos, tres dificultades, teclado y controles táctiles en una pantalla.
- Salas con celulares y CPU: 1 humano + 3 CPU, 2 + 2 o 3 + 1, con proyector separado.
- Pantallas compartidas de una misma sala para jugar desde distintas casas.
- Demo entre pestañas del mismo navegador, sin credenciales.
- Migración SQL, reglas RLS y pruebas automáticas.

**Estado:** implementación inicial revisable. Falta configurar y ensayar el proyecto Supabase real y probar los dispositivos/red del evento. Los tests locales no sustituyen esa validación.

## Ejecutar

Node.js 22 o superior; se recomienda 22 LTS para coincidir con CI.

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000` y selecciona **Jugar contra la CPU** (ruta `/solo`). Elige equipo, juego y dificultad: puedes jugar inmediatamente, sin variables de entorno ni Supabase. Los resultados se acumulan solo en esa página y se reinician al recargar. [Guía de uso](docs/USAGE.md).

Para revisar el flujo del evento, selecciona **Explorar la demo**. La sala conecta automáticamente. Abre entre uno y cuatro controles desde el panel; al iniciar, la cancha aparece en esa misma ventana. Cada control elige equipo y toca **Estoy listo**. **Completar equipos libres con CPU** viene activado para practicar con menos de cuatro personas.

La demo usa BroadcastChannel y almacenamiento local. **Funciona entre pestañas del mismo navegador/origen; no conecta teléfonos distintos ni es un modo offline de producción.** Sus datos nunca se guardan en Supabase.

## Configurar online

Sigue [docs/SETUP.md](docs/SETUP.md): ejecutar las migraciones, activar sesiones anónimas, configurar canales privados y crear un operador confirmado. Si el proyecto ya funciona, aplicar solo [202609090002_spectators.sql](supabase/migrations/202609090002_spectators.sql) para habilitar las pantallas compartidas; no cambian las variables de entorno.

| Variable                               | Uso                                                                 |
| -------------------------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto                                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública; admite también la clave `anon` heredada              |
| `SUPABASE_SECRET_KEY`                  | Solo servidor; clave secreta o `service_role` heredada              |
| `OPERATOR_EMAILS`                      | Solo servidor; correos confirmados autorizados, separados por comas |

Copiar `.env.example` a `.env.local` y configurar las mismas variables en Vercel. Nunca subir `.env.local` ni exponer claves secretas con `NEXT_PUBLIC_`.

Importar el repositorio en Vercel, preset Next.js, Node 22.x, instalación `npm ci` y build `npm run build`. Abrir `/operator` para crear una sala online.

## Rutas

| Ruta              | Uso                                               |
| ----------------- | ------------------------------------------------- |
| `/`               | Entrada por código o demo                         |
| `/solo`           | Un jugador y tres CPU, cancha y controles juntos  |
| `/operator`       | Acceso del operador                               |
| `/control/[code]` | Sala activa, administración y cancha              |
| `/host/[code]`    | Vista adicional (enlaces anteriores)              |
| `/watch/[code]`   | Vista compartida del proyector, sin ocupar equipo |
| `/play/[code]`    | Equipo y control móvil                            |

«Estoy listo» puede marcarse mientras conecta. «Listo confirmado» aparece cuando la sala recibe la preparación. El celular ofrece **Reconectar control**, y el panel **Reconectar sala**. Esta corrección no añade SQL ni variables.

## Verificación

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Las pruebas SQL usan PGlite (Postgres embebido) con Auth/Realtime simulados y verifican el acceso de espectadores solo a lectura del estado de su sala. Los tests de CPU completan los cuatro juegos y verifican elecciones ciegas, memoria, pausa, desconexiones y prácticas sin puntos. E2E recorre el modo individual y salas de demo con cuatro controles o uno/dos controles con CPU y otra pantalla sincronizada. Ejecutar sin variables de Supabase para cubrir también el estado sin configuración. El entorno CI funciona así. `npm run format` aplica Prettier.

## Arquitectura y operación

El computador del organizador valida las reglas. Supabase transporta eventos y conserva resultados; no hay salas en memoria de Vercel Functions. El celular envía acciones, no puntajes. Los sprites y escenarios se dibujan en Canvas, separado del paquete móvil.

- [Reglas](docs/RULES.md)
- [Cómo usar la app](docs/USAGE.md)
- [Arquitectura y recuperación](docs/ARCHITECTURE.md)
- [Guía del operador](docs/OPERATIONS.md)

La ventana de la sala del operador (`/control`) debe permanecer visible y el computador despierto. Al pulsar **Iniciar juego**, esa misma ventana muestra la cancha; las vistas adicionales (`/watch` y `/host`) solo observan. Si se cierra, se conservan los resultados confirmados y se repite la ronda incompleta. Un corte del transporte requiere cancelar esa ronda; un control desconectado pausa hasta reconectar.

Rayuela puntúa al llegar el comando al host y sigue siendo sensible a la red. El operador es confiable en este modelo; no es un sistema con arbitraje independiente para premios monetarios. No hay migración automática de host ni respaldo offline de la sala online.
