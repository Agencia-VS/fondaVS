# Cómo usar FondaVS

## Celulares como controles y rivales CPU

Este es el modo para jugar mirando el computador o proyector y usando tu celular como control. Admite **1 persona + 3 CPU**, **2 personas + 2 CPU** y **3 personas + 1 CPU**, en cualquiera de los cuatro juegos.

1. En el **computador**, pulsar **Jugar con celulares + CPU**, entrar a `/operator` y crear una **sala online**. La sala conecta automáticamente en esa misma ventana.
2. Cada persona escanea el QR con su **celular**, elige un equipo y toca **Estoy listo**. Puede hacerlo mientras conecta; **Listo confirmado** significa que la sala recibió la preparación.
3. En el computador, elegir juego y pulsar **Iniciar juego**. **Completar equipos libres con CPU** ya viene activado para practicar; se puede cambiar su dificultad.
4. La cancha aparece en la misma ventana del computador. Jugar desde el celular. **Volver al panel** permite administrar sin detener el motor; **Ver cancha en esta pantalla** vuelve al juego. Mantener esa ventana visible.

Los cuatro equipos siempre participan. Las rondas con CPU son prácticas: muestran su resultado, pero no suman puntos al campeonato. La CPU no ocupa cuentas ni plazas de jugadores. Si un celular conectado se pierde, la partida pausa hasta reconectarlo; no se sustituye a esa persona por CPU. Para cambiar participantes, terminar o cancelar la ronda primero.

## Jugar desde dos casas

Ambas personas ven **la misma sala y la misma partida**, cada una en su computador, mientras usan sus celulares como controles. No hace falta compartir pantalla por videollamada.

1. El operador crea o abre la sala en su computador. El panel y la cancha usan la misma ventana; la sala se activa automáticamente.
2. En el panel → **Otra pantalla**, pulsa **Copiar enlace de pantalla** y lo envía a la otra persona.
3. La otra persona abre ese enlace (`/watch/CÓDIGO`) en su computador. Es una vista compartida que recibe la partida; no requiere la cuenta del operador ni ocupa un equipo.
4. Ambos escanean el QR con sus celulares o ingresan el mismo código de sala desde el inicio de la app. Cada uno elige un equipo distinto y toca **Estoy listo**.
5. El operador deja activado **Completar equipos libres con CPU** e inicia: juegan dos personas y dos CPU. Para probar solo, basta con conectar tu celular: juegas contra tres CPU.

Primero aplicar el [SQL de pantallas compartidas](../supabase/migrations/202609090002_spectators.sql), después de la migración inicial. Se utilizan las mismas variables de entorno del proyecto. La sala debe ser online; **Explorar la demo** solo conecta pestañas del mismo navegador.

La pantalla principal debe seguir abierta y visible. Las vistas compartidas pueden cerrarse o recargarse sin pausar al resto. Si pierden conexión muestran **Esperando a la sala**. Las pantallas reciben el mismo estado, con el retraso normal de Internet; rayuela es especialmente sensible a ese retraso.

En el evento presencial se usa exactamente este flujo, con un solo proyector para todos. No hace falta abrir vistas compartidas.

## Qué hace el operador

Es quien crea y administra la sala: selecciona juegos, inicia, pausa, reanuda, cancela y libera equipos entre rondas. Su computador mantiene abierta la pantalla principal. **Puede ser uno de los jugadores** y usar su propio celular como control; no hace falta una quinta persona.

El panel y la cancha están en una sola ventana: al iniciar se muestra el juego con botones para pausar y volver al panel. Puedes proyectar esa ventana. Ocultarla pausa el juego y requiere reanudar; las vistas adicionales no afectan a la partida al ocultarse.

## Práctica individual en una pantalla

1. Abrir la app y tocar **Jugar contra la CPU**, o entrar directamente a `/solo`.
2. Elegir **Creative, Lab, Sports o Media**. Tú controlas esa área; las otras tres son CPU.
3. Elegir juego y dificultad: **Suave**, **Al medio** o **Brava**.
4. Pulsar **Jugar contra la CPU**. Tras la cuenta regresiva, jugar mirando la cancha y usando los botones de la misma pantalla o el teclado.
5. Al terminar, ver el resultado y pedir la revancha con **Volver a jugar**, o elegir otro juego.

| Juego            | Botones                                                            | Teclado                                                                            |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Carrera de sacos | IZQ y DER alternados; cada pareja avanza un paso                   | Flechas ← → o A / D                                                                |
| Rayuela          | LANZAR cuando el cursor esté cerca de la cuerda central            | Espacio                                                                            |
| Penales          | Elegir una de las cinco zonas, para chutar o atajar según el turno | 1 arriba izquierda, 2 arriba derecha, 3 centro, 4 abajo izquierda, 5 abajo derecha |
| Memorice (6×5)   | Flechas para mover el cursor y VOLTEAR para buscar una pareja      | Flechas y espacio                                                                  |

Los botones se activan cuando corresponde tu turno. La CPU juega sus turnos automáticamente, incluidos los partidos de penales entre otros equipos. En penales tienes cinco segundos y, si no eliges, se usa el centro. Cada equipo disputa una semifinal y luego la final o el tercer puesto.

**Pausar** congela la partida y **Reanudar** la continúa. Cambiar de pestaña también pausa; al volver hay que reanudar. **Elegir otro juego** descarta la ronda incompleta. No cambies de equipo durante una ronda; vuelve a la selección para hacerlo.

La CPU corre a un ritmo variable y puede tropezar; lanza con un margen de error y recuerda un número limitado de cartas ya reveladas. En penales elige a ciegas en todas las dificultades, sin conocer tu selección.

Este modo no necesita Supabase, variables de entorno ni una cuenta. Sus resultados solo suman al marcador de práctica de esa página, se reinician al recargar y nunca se guardan en el campeonato del evento. Después de descargar la página no necesita conexión para jugar; recargarla o abrirla por primera vez sí requiere acceder al sitio.

## Jugar en el evento con celulares

La pantalla del proyector ya usa la composición 2.5D: capas de fondo, puestos de fonda, cancha en perspectiva y sombras de contacto. Los controles y las reglas siguen siendo los mismos; no hace falta instalar nada en los celulares.

Primero completar [la configuración de Supabase y Vercel](SETUP.md).

1. **Operador:** entrar a `/operator` con su correo y contraseña, y crear una sala.
2. **Computador/proyector:** la sala ya está activa. Al iniciar, la cancha aparece en esa misma ventana; dejarla visible en la pantalla del público.
3. **Jugadores:** escanear el QR del proyector o ingresar el código de seis caracteres en el inicio de la app.
4. **Equipos:** cada representante elige un equipo, ingresa su nombre y pulsa **Estoy listo**. Hay una plaza por equipo.
5. **Ronda:** para jugar cuatro humanos, desactivar **Completar equipos libres con CPU**. Cuando están los cuatro preparados, seleccionar juego y pulsar **Iniciar juego**. Los celulares muestran únicamente sus controles; la acción se ve en el proyector.
6. **Puntaje:** con **Ensayo** activado se practica sin modificar el campeonato. Al apagarlo, las rondas terminadas suman puntos y se guardan.
7. **Continuar:** el operador puede pausar, reanudar, cambiar de juego o liberar la plaza de un representante entre rondas.

El operador administra y muestra la cancha desde la misma ventana. Si se cierra esa sala, se conservan los resultados confirmados y hay que repetir la ronda incompleta. Antes del evento, ensayar con los cuatro celulares y la red que se usará ese día.

## Si «Estoy listo» no se confirma

Puedes pulsarlo mientras conecta. **Listo · esperando confirmación** conserva tu intención, pero el juego no comienza hasta que la sala la confirme. Si tarda, comprobar que el operador tenga abierta la sala y pulsar **Reconectar control** en el celular; el equipo y la preparación se conservan. Si otra ventana ya administra la sala, volver a ella o cerrarla, esperar seis segundos y pulsar **Reconectar sala**.

Si aparece un error de Realtime, se muestra su estado para distinguir un problema de conexión de uno de permisos. Ver [configuración](SETUP.md). Abrir una vista compartida por sí sola no inicia la sala.

## Demo de varios controles

**Explorar la demo** abre una sala de ensayo entre pestañas del mismo navegador. Sirve para revisar panel, proyector, vista compartida y controles sin Supabase. Se pueden abrir entre uno y cuatro controles manualmente y activar **Completar equipos libres con CPU**. La demo de pestañas no conecta teléfonos ni casas distintas.
