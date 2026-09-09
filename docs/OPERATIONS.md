# Operar la fonda

1. Probar la versión en la red, computador y proyector definitivos. Mantener los equipos con batería y desactivar suspensión del computador.
2. Crear o abrir la sala en el computador. Conecta automáticamente; mantener esa ventana visible. El panel y la cancha se alternan dentro de ella.
3. Activar audio y pantalla completa. El audio necesita una interacción inicial del operador.
4. Conectar cuatro teléfonos con QR; elegir equipos y tocar **Estoy listo**.
5. Ensayar cada juego y revisar especialmente la respuesta de rayuela.
6. Desactivar **Completar equipos libres con CPU** y **Ensayo sin puntos** al iniciar el campeonato con cuatro humanos.

El panel permite elegir, iniciar, pausar, reanudar y cancelar. Para repetir una ronda incompleta, cancelarla primero. La cruz junto a un equipo libera su plaza entre rondas; el antiguo representante debe volver a entrar si quiere una nueva sesión.

El operador puede jugar desde su propio celular. Para ensayar con menos personas, dejar activado **Completar equipos libres con CPU** (valor inicial): con uno o dos celulares listos se juega contra tres o dos CPU, respectivamente. Estas rondas no suman al campeonato. Para el evento de cuatro equipos humanos, desactivar esta opción.

Si los jugadores están en casas distintas, usar **Otra pantalla → Copiar enlace de pantalla**. Cada invitado abre esa vista en su computador y entra al mismo código desde su celular. Solo una ventana administra la sala; las demás pantallas usan el enlace compartido y pueden cerrarse sin detener la partida. Requiere la migración `202609090002_spectators.sql`. Ver [guía de uso](USAGE.md).

Si un teléfono se desconecta, pulsar **Reconectar control** y reanudar. **Estoy listo** se puede marcar antes de conectar; **Listo confirmado** indica que la sala ya lo recibió. Si falla la conexión de la sala, cancelar y repetir cuando la red esté estable. Si se cierra la ventana del operador, abrir esa sala de nuevo, esperar seis segundos si aparece el aviso de otra ventana y pulsar **Reconectar sala**. Repetir la ronda incompleta. Los puntos confirmados se conservan.

## Validación presencial pendiente

- Cuatro celulares físicos y una ronda completa de cada juego con puntos.
- Safari/iPhone y Chrome/Android si estarán presentes.
- Un quinto teléfono intentando ocupar un equipo reservado.
- Desconexión de control, recarga de la sala del operador y conservación del marcador.
- Visibilidad del proyector, controles legibles y ausencia de gestos que interfieran.
- Retraso y variación entre equipos en rayuela. Si son excesivos, ajustar red o mecánica antes del evento.

El arte inicial es pixel art dibujado con código y puede ajustarse después de revisar esta versión.
