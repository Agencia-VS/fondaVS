# Configuración de Supabase y Vercel

## Supabase

Usar primero un proyecto o rama de ensayo. La migración crea tablas `fonda_*` y políticas específicas en `realtime.messages`. Revisar políticas existentes si se comparte proyecto: las políticas permisivas se combinan con OR y una regla general podría anular el aislamiento esperado.

1. Ejecutar `supabase/migrations/202609090001_fonda.sql` en SQL Editor o mediante el flujo de migraciones.
2. Habilitar **Anonymous Sign-Ins** en Authentication para los jugadores.
3. Crear en Authentication → Users una cuenta de operador con correo confirmado y contraseña. Agregar su correo a `OPERATOR_EMAILS` en el servidor.
4. Desactivar **Allow public access** en Realtime Settings. Todos los canales del código son privados.
5. Verificar que no existan otras políticas que permitan leer/escribir cualquier canal. La aplicación utiliza heartbeats propios y no necesita Presence.
6. Configurar las cuatro variables de `.env.example`, conservando la clave secreta únicamente en servidor.

No se necesita publicar tablas en Postgres Changes: el movimiento usa Broadcast. Las API verifican el JWT con `auth.getUser` antes de acceder a datos con la credencial de servidor.

Fuentes: [sesiones anónimas](https://supabase.com/docs/guides/auth/auth-anonymous), [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) y [Broadcast](https://supabase.com/docs/guides/realtime/broadcast).

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
