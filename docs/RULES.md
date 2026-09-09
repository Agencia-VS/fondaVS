# Reglas implementadas

| Juego    | Formato                                                       | Puntuación interna                            |
| -------- | ------------------------------------------------------------- | --------------------------------------------- |
| Sacos    | 30 pasos, máximo 90 segundos, cuatro simultáneos              | Llegada; luego pasos de quienes no terminan   |
| Rayuela  | 3 intentos por equipo, 10 segundos por intento                | 100 / 60 / 30 / 10 según cercanía; timeout: 0 |
| Penales  | Semifinales, tercer lugar y final; 3 tiros por equipo         | Zona distinta: gol; misma zona: atajada       |
| Memorice | 16 cartas, 8 parejas; turnos de 15 segundos; máximo 5 minutos | Una unidad por pareja y repetición de turno   |

Todas las rondas empiezan con tres segundos de cuenta regresiva. El ensayo sigue las mismas reglas sin sumar al campeonato.

## Sacos

IZQ → DER completa un paso. Se vuelve a empezar por IZQ. Repetir lado o empezar por DER provoca un tropiezo de un segundo y reinicia la secuencia. El transporte elimina los mensajes duplicados antes de evaluar el tropiezo.

## Rayuela

Orden Creative, Lab, Sports, Media, tres vueltas. Cursor sinusoidal con ciclo de tres segundos. Distancia normalizada absoluta al centro: hasta 0.10 otorga 100 puntos; hasta 0.25, 60; hasta 0.50, 30; resto, 10. Revelación de dos segundos. Se puntúa la posición al llegar el comando al host; no hay compensación exacta de latencia.

## Penales

Creative–Lab y Sports–Media en semifinales, luego tercer lugar y final. Cinco zonas, primera elección bloqueada, cinco segundos para elegir y centro por defecto para quienes no respondan. Si faltan ambos, resulta atajada.

Se alternan los roles. Se cierra antes si una ventaja es irreversible. Empate tras tres tiros cada uno: hasta tres parejas adicionales de muerte súbita, comparando después de igual cantidad de tiros. Si continúa empatado, sorteo anunciado para resolver el encuentro, sin registrarlo como gol.

## Memorice

La baraja se mezcla al iniciar y permanece oculta en el host. El cursor empieza en la primera carta disponible. No se puede repetir carta ni seleccionar una pareja encontrada. Los bordes no envuelven.

Dos cartas se revelan durante 1.5 segundos; una pareja suma y concede otro turno al equipo. Un fallo pasa al siguiente. Si vence el tiempo con una carta abierta, se oculta y cambia de equipo. No se aceptan entradas durante la revelación.

## Campeonato

Cada ronda confirmada reparte 4, 3, 2 y 1 puntos por puesto. Los empates reciben el promedio de las posiciones ocupadas: dos empatados en segundo reciben 2.5 cada uno. El reparto siempre suma 10 puntos.

Se acumulan todas las rondas confirmadas. Se puede repetir un juego para sumar otra ronda. Ensayos y cancelaciones no suman. El orden estable de equipos empatados en el marcador no declara un ganador único: si se necesita, el operador acuerda y ejecuta una ronda adicional.
