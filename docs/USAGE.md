# Cómo usar FondaVS

## Probar tú contra la CPU

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
| Memorice         | Flechas para mover el cursor y VOLTEAR para buscar una pareja      | Flechas y espacio                                                                  |

Los botones se activan cuando corresponde tu turno. La CPU juega sus turnos automáticamente, incluidos los partidos de penales entre otros equipos. En penales tienes cinco segundos y, si no eliges, se usa el centro. Cada equipo disputa una semifinal y luego la final o el tercer puesto.

**Pausar** congela la partida y **Reanudar** la continúa. Cambiar de pestaña también pausa; al volver hay que reanudar. **Elegir otro juego** descarta la ronda incompleta. No cambies de equipo durante una ronda; vuelve a la selección para hacerlo.

La CPU corre a un ritmo variable y puede tropezar; lanza con un margen de error y recuerda un número limitado de cartas ya reveladas. En penales elige a ciegas en todas las dificultades, sin conocer tu selección.

Este modo no necesita Supabase, variables de entorno ni una cuenta. Sus resultados solo suman al marcador de práctica de esa página, se reinician al recargar y nunca se guardan en el campeonato del evento. Después de descargar la página no necesita conexión para jugar; recargarla o abrirla por primera vez sí requiere acceder al sitio.

## Jugar en el evento con celulares

Primero completar [la configuración de Supabase y Vercel](SETUP.md).

1. **Operador:** entrar a `/operator` con su correo y contraseña, y crear una sala.
2. **Proyector:** desde el panel, abrir el proyector y dejar esa ventana visible en la pantalla del público.
3. **Jugadores:** escanear el QR del proyector o ingresar el código de seis caracteres en el inicio de la app.
4. **Equipos:** cada representante elige un equipo, ingresa su nombre y pulsa **Estoy listo**. Hay una plaza por equipo.
5. **Ronda:** cuando están los cuatro preparados, el operador selecciona juego y pulsa **Iniciar juego**. Los celulares muestran únicamente sus controles; la acción se ve en el proyector.
6. **Puntaje:** con **Ensayo** activado se practica sin modificar el campeonato. Al apagarlo, las rondas terminadas suman puntos y se guardan.
7. **Continuar:** el operador puede pausar, reanudar, cambiar de juego o liberar la plaza de un representante entre rondas.

El operador administra desde el panel y la ventana del proyector mantiene la partida. Si se cierra el proyector, se conservan los resultados confirmados y hay que repetir la ronda incompleta. Antes del evento, ensayar con los cuatro celulares y la red que se usará ese día.

## Demo de varios controles

**Explorar la demo** abre una sala de ensayo entre pestañas del mismo navegador. Sirve para revisar panel, proyector y controles sin Supabase. Hay que abrir los cuatro controles manualmente: los rivales automáticos están en **Jugar contra la CPU**. La demo de pestañas no conecta teléfonos distintos.
