# Configuración de Supabase y Vercel

## Probar ahora contra la CPU

Abrir `/solo` o **Jugar contra la CPU** desde el inicio. Funciona sin variables de entorno, cuenta, SQL, proyector ni otros controles. Elegir equipo, juego y dificultad; los otros tres equipos juegan automáticamente. Ver [Uso de la app](USAGE.md).

## SQL listo para copiar

En Supabase → **SQL Editor → New query**, pegar cada archivo completo y pulsar **Run**, en este orden:

1. [202609090001_fonda.sql](../supabase/migrations/202609090001_fonda.sql): migración inicial. **Solo para un proyecto que todavía no la tenga**; crea tablas, índices, funciones y políticas de Realtime.
2. [202609090002_spectators.sql](../supabase/migrations/202609090002_spectators.sql): habilita las pantallas compartidas para jugar desde distintas casas. Aplicar también en proyectos existentes que ya tengan la primera migración. Se puede repetir; conserva equipos y resultados.
3. [202609090003_realtime_permissions.sql](../supabase/migrations/202609090003_realtime_permissions.sql): restaura los permisos de los canales privados de operador, jugadores y espectadores. Aplicar en proyectos existentes. Se puede repetir y no borra datos.
4. [202609090004_duplex_channel_reads.sql](../supabase/migrations/202609090004_duplex_channel_reads.sql): permite que operador y jugador se suscriban a los dos canales privados del miembro, manteniendo la escritura en una sola dirección. Aplicar después del tercero; se puede repetir y no borra datos.

No hay que reemplazar correos, UUID ni claves dentro de los archivos.

En el proyecto existente, ejecutar el segundo archivo si todavía falta y ejecutar siempre el tercero y el cuarto. No hay variables de entorno nuevas.

## Supabase

Usar primero un proyecto o rama de ensayo. La migración crea tablas `fonda_*` y políticas específicas en `realtime.messages`. Revisar políticas existentes si se comparte proyecto: las políticas permisivas se combinan con OR y una regla general podría anular el aislamiento esperado.

1. Ejecutar las migraciones anteriores en orden, omitiendo la inicial si ya está aplicada.
2. Habilitar **Anonymous Sign-Ins** en Authentication para los jugadores y las pantallas compartidas.
3. Crear en Authentication → Users una cuenta de operador con correo confirmado y contraseña. Agregar su correo a `OPERATOR_EMAILS` en el servidor.
4. Desactivar **Allow public access** en Realtime Settings. Todos los canales del código son privados.
5. Verificar que no existan otras políticas que permitan leer/escribir cualquier canal. La aplicación utiliza heartbeats propios y no necesita Presence.
6. Configurar las cuatro variables de `.env.example`, conservando la clave secreta únicamente en servidor.

### Si el control muestra “sesión anónima”

Ese mensaje lo entrega la aplicación cuando `signInAnonymously()` es rechazado. En el mismo proyecto cuya URL está en `NEXT_PUBLIC_SUPABASE_URL`, abrir **Authentication → Sign In / Providers → Anonymous Sign-Ins** y activarlo. Comprobar también que CAPTCHA no esté bloqueando el flujo anónimo y que la clave pública pertenezca a esa URL. Como las variables `NEXT_PUBLIC_` se incorporan durante el build, guardar los cambios en Vercel y crear un nuevo deployment. La pantalla ahora muestra el código exacto devuelto por Supabase para distinguir estos casos.

La documentación oficial confirma que `signInAnonymously()` crea un usuario autenticado temporal y que Anonymous Sign-Ins debe estar habilitado en el proyecto: [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous).

No se necesita publicar tablas en Postgres Changes: el movimiento usa Broadcast. Las API verifican el JWT con `auth.getUser` antes de acceder a datos con la credencial de servidor.

### Variables exactas

| Variable                               | Valor                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto, como `https://<project-ref>.supabase.co`                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave `sb_publishable_…`; también acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` con la clave `anon` heredada               |
| `SUPABASE_SECRET_KEY`                  | Clave `sb_secret_…`; también acepta `SUPABASE_SERVICE_ROLE_KEY` con la clave `service_role` heredada. Solo servidor |
| `OPERATOR_EMAILS`                      | Correo del operador creado en Authentication → Users. Varios correos separados por comas                            |

`OPERATOR_EMAILS` autoriza cuentas existentes; no crea usuarios ni contraseñas. La contraseña se define al crear el usuario en Supabase Auth y se utiliza para ingresar en `/operator`.

Fuentes: [sesiones anónimas](https://supabase.com/docs/guides/auth/auth-anonymous), [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization), [claves API](https://supabase.com/docs/guides/getting-started/api-keys) y [Broadcast](https://supabase.com/docs/guides/realtime/broadcast).

## Vercel

Importar `Agencia-VS/fondaVS` con preset **Next.js**, Node **22.x**, instalación `npm ci` y build `npm run build`. No requiere Socket.IO ni configurar WebSockets en Functions.

Configurar las variables en el entorno Preview. Las variables `NEXT_PUBLIC_` se incorporan al cliente durante el build: cambiarlas requiere un nuevo despliegue. Mantener separados los datos de ensayo y evento cuando se configure producción.

Comprobar que los teléfonos pueden abrir la URL elegida. La protección del despliegue Preview podría mostrar una pantalla de acceso de Vercel antes del juego. El acceso al despliegue y los permisos de Supabase son controles distintos.

## Corrección del flujo de entrada

La sala del operador ahora activa el motor automáticamente y muestra la cancha en esa misma ventana al iniciar. La corrección de preparación y reconexión **no requiere SQL ni variables nuevas**. Para visitantes de otras casas se conserva la migración de espectadores anterior. Tras desplegar, cerrar las ventanas de versiones anteriores y volver a abrir la app.

## Corrección de autenticación Realtime

Antes de crear un canal privado, el cliente espera que el JWT de la sesión quede instalado en Realtime. Si Supabase rechaza un canal, el control muestra si falló el estado, la entrada o la respuesta, junto con el detalle entregado por el servicio. Aplicar la tercera migración para restaurar las políticas alojadas y la cuarta para autorizar la suscripción de ambos extremos de cada canal privado sin ampliar quién puede escribir.

## Validación online pendiente

1. Entrar a `/operator` desde el computador y crear una sala. Ver **Sala conectada** sin abrir otra ventana.
2. Conectar un celular, elegir equipo y tocar **Estoy listo**. Esperar **Listo confirmado**, iniciar desde el computador y comprobar la cancha en la misma ventana con tres CPU.
3. Cancelar o terminar, conectar un segundo celular y comprobar dos humanos y dos CPU. Terminar una práctica y verificar que no modifica el campeonato.
4. Abrir el enlace de **Otra pantalla** en un computador de otra casa, sin la cuenta del operador. Verificar que muestra la misma partida y no ocupa equipo. Cerrar y reabrir esa vista: la sala del operador debe seguir funcionando.
5. Conectar cuatro celulares, desactivar la CPU y verificar elecciones secretas en penales y rechazo de un quinto representante.
6. Terminar una ronda con ensayo apagado y comprobar una única fila de resultado.
7. Recargar la sala del operador y comprobar la conservación del marcador.
8. Entrar desde un celular antes de abrir el panel y marcar **Estoy listo**: debe confirmarse al abrir la sala, sin volver a pulsar. Desconectar un control, usar **Reconectar control** y reanudar; cerrar la sala del operador y repetir la ronda incompleta.

La prueba SQL local no valida la configuración del servicio Realtime hospedado. Este ensayo debe pasar antes del evento.
