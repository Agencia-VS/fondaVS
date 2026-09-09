# Operar la fonda

1. Probar la versión en la red, computador y proyector definitivos. Mantener los equipos con batería y desactivar suspensión del computador.
2. Crear sala y abrir host en una ventana visible. Usar escritorio extendido para administrar desde otra pantalla.
3. Activar audio y pantalla completa. El audio necesita una interacción inicial del operador.
4. Conectar cuatro teléfonos con QR; elegir equipos y tocar **Estoy listo**.
5. Ensayar cada juego y revisar especialmente la respuesta de rayuela.
6. Desactivar **Ensayo sin puntos** al iniciar el campeonato.

El panel permite elegir, iniciar, pausar, reanudar y cancelar. Para repetir una ronda incompleta, cancelarla primero. La cruz junto a un equipo libera su plaza entre rondas; el antiguo representante debe volver a entrar si quiere una nueva sesión.

El operador puede jugar desde su propio celular. Para ensayar con menos personas, activar **Completar equipos libres con CPU**: con uno o dos celulares listos se juega contra tres o dos CPU, respectivamente. Estas rondas no suman al campeonato. Para el evento de cuatro equipos humanos, desactivar esta opción.

Si los jugadores están en casas distintas, usar **Otra pantalla → Copiar enlace de pantalla**. Cada invitado abre esa vista en su computador y entra al mismo código desde su celular. Solo se abre un **proyector principal**; las demás pantallas usan el enlace compartido y pueden cerrarse sin detener la partida. Requiere la migración `202609090002_spectators.sql`. Ver [guía de uso](USAGE.md).

Si un teléfono se desconecta, reconectarlo y reanudar. Si falla el transporte del host, cancelar y repetir cuando la red esté estable. Si se cierra el host, abrirlo de nuevo, esperar el vencimiento de la concesión anterior y repetir la ronda incompleta. Los puntos confirmados se conservan.

## Validación presencial pendiente

- Cuatro celulares físicos y una ronda completa de cada juego con puntos.
- Safari/iPhone y Chrome/Android si estarán presentes.
- Un quinto teléfono intentando ocupar un equipo reservado.
- Desconexión de control, recarga del host y conservación del marcador.
- Visibilidad del proyector, controles legibles y ausencia de gestos que interfieran.
- Retraso y variación entre equipos en rayuela. Si son excesivos, ajustar red o mecánica antes del evento.

El arte inicial es pixel art dibujado con código y puede ajustarse después de revisar esta versión.
