# Configuración de Supabase y Vercel

## Probar ahora contra la CPU

Abrir `/solo` o **Jugar contra la CPU** desde el inicio. Funciona sin variables de entorno, cuenta, SQL, proyector ni otros controles. Elegir equipo, juego y dificultad; los otros tres equipos juegan automáticamente. Ver [Uso de la app](USAGE.md).

## SQL listo para copiar

El único archivo necesario es [202609090001_fonda.sql](../supabase/migrations/202609090001_fonda.sql). En Supabase → **SQL Editor → New query**, pegar el archivo completo y pulsar **Run**. Ejecutarlo una sola vez en un proyecto nuevo: incluye tablas, índices, funciones y políticas de Realtime dentro de una transacción. No hay que reemplazar correos, UUID ni claves dentro del SQL.

Si ya se aplicó la primera versión de esta migración, **no volver a ejecutarla**. El modo CPU no necesita nuevas tablas ni migraciones adicionales.

## Supabase

Usar primero un proyecto o rama de ensayo. La migración crea tablas `fonda_*` y políticas específicas en `realtime.messages`. Revisar políticas existentes si se comparte proyecto: las políticas permisivas se combinan con OR y una regla general podría anular el aislamiento esperado.

1. Ejecutar `supabase/migrations/202609090001_fonda.sql` en SQL Editor o mediante el flujo de migraciones.
2. Habilitar **Anonymous Sign-Ins** en Authentication para los jugadores.
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

## Validación online pendiente

1. Entrar a `/operator`, crear una sala y abrir el host en una ventana visible.
2. Conectar cuatro celulares, elegir equipos y tocar **Estoy listo**.
3. Verificar elecciones secretas en penales y rechazo de un quinto representante.
4. Terminar una ronda con ensayo apagado y comprobar una única fila de resultado.
5. Recargar el host y comprobar la conservación del marcador.
6. Desconectar un control, reconectarlo y reanudar; cerrar el host y repetir la ronda incompleta.

La prueba SQL local no valida la configuración del servicio Realtime hospedado. Este ensayo debe pasar antes del evento.
