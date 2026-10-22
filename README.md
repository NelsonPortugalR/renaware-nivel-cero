# Nivel Cero · Equipo Arequipa

Arranque antes del Empiece Ya: quien asiste a **5 capacitaciones en sus
primeros 30 días** gana la **botella de acero**, que es el adelanto del
Empiece Ya. Si después gana el Empiece Ya, ese premio se entrega sin botella.

## Qué hace

- **Asistencia**: propone la clase de hoy según el horario (martes 9:30,
  miércoles 4:00 p. m., viernes 4:30 p. m.) y se marca con un toque a quien
  llegó. Solo aparecen quienes tienen el plazo abierto en la fecha de la clase;
  los demás se pueden mostrar, pero no suman. Clases pasadas se crean con su
  fecha para cargar asistencias en papel.
- **Inscritos**: en curso, lograron, vencieron. Cada uno con sus clases, plazo,
  código Rena Ware, Empiece Ya y botella. En la ficha se agregan clases: una
  guardada de su plazo con un toque, u otro día con solo la fecha (si ese día no
  hay clase, se crea con la hora habitual o sin hora, y tema opcional). Cada
  clase se puede quitar.
- **Botellas**: por entregar, entregadas, a descontar en el Empiece Ya, y las
  que vienen dentro del Empiece Ya porque lo ganó antes de recibirla.

Los **mensajes de WhatsApp** a los nuevos (bienvenida y seguimiento de sus 30
días) ya no se mandan desde aquí: van en
[Bienvenida](https://renaware-bienvenida.pages.dev), que lee estas mismas
clases. La ficha tiene *Abrir en Bienvenida* (`#a=<id>`) y en Botellas,
*Avisar* abre ahí el mensaje para que recoja su botella (`#a=<id>&paso=recoger`;
la fila dice si ya se le avisó). Se abre ya con sesión: `traspaso_crear_admin`
da un código de un solo uso (3 minutos) que Bienvenida canjea en la función
edge `traspaso`; si falla, va el enlace simple.
- **Empiece Ya**: ganadores de WV08 por año y por nivel (I, II, III, Miami),
  agrupados por período, cruzados con el Nivel Cero: quién lo hizo (y su
  botella), quién ganó sin completar las 5 clases y quién es de antes o no
  está en el registro. Abajo, tus inscritos: ganaron, en plazo, esperando
  resultados, no ganaron.
- **Números**: inscritos, cuántos van, cuántos logran (sobre quienes ya
  cerraron su plazo), embudo hasta el Empiece Ya, comparación de Empiece Ya
  con y sin Nivel Cero, por mes, por horario y por afiliador.

## Reglas que respeta

- La lista sale de las afiliaciones del registro (`registros`, tipo
  `afiliacion`); se puede agregar a mano a quien se afilió por otro lado.
- El plazo va de la fecha de inscripción a 30 días después, ambos incluidos.
  El inicio se puede corregir por persona.
- Cuenta clases distintas dentro del plazo. Logra el día de su 5.ª clase.
- *Sin seguimiento*: quien cerró su plazo antes de la primera clase
  registrada. No entra en los porcentajes. Si se cargan clases anteriores,
  pasa a contar solo.
- Empiece Ya: se cruza por código Rena Ware con `eya_asesores`; sin código,
  por nombre dentro de WV08 y solo si hay una coincidencia única. Se ignora un
  Empiece Ya de más de 14 días antes de la inscripción.
- Plazo del Empiece Ya: el período (PB, de jueves a miércoles) en que se
  inscribió y dos más. Si no aparece entre los ganadores hasta el cierre del
  tercero, no ganó; mientras ese resultado no esté cargado como oficial, queda
  *esperando resultados*.
- Niveles leídos de los premios (`eya_premios.items`): I = utensilio 1.5L +
  botella, II = Multi Cooker (antes cocina de inducción), III = Nutrex Press u
  Olla a Presión 8L desde el programa del 3 de setiembre (antes Juego Chef I),
  Miami = viaje; en el programa de inicios de 2026 el III también fue el Filtro de
  Agua RWF-228. El detalle de premios existe desde el PB01 de 2026; antes solo
  está el histórico de ganadores.
- En la pestaña Empiece Ya, «actualizados al …» abre el estado de la carga
  (`eya_estado_carga()`): qué cierres están oficiales, preliminares, solo con
  ganadores o faltan.

## Cómo está hecho

Un solo `index.html`, sin librerías ni build. Llama a Supabase
`kiexpdaaoegbtesqmaff` por RPC con la clave publicable; los datos los protege
la sesión de admin (`admin_login`, la misma clave del panel).

- Tablas: `n0_config`, `n0_clases`, `n0_asistencias`, `n0_estado`,
  `n0_inscritos_manual`. Vista `n0_inscritos`. RLS activo, sin acceso directo.
  `n0_mensajes` y `n0_plantillas` (y el trato de `n0_estado` y `n0_config`)
  guardan los mensajes; los usa Bienvenida por sus funciones `wa_bv_*`.
- Funciones con sesión: `n0_datos`, `n0_clase_guardar`, `n0_clase_borrar`,
  `n0_marcar`, `n0_estado_guardar`, `n0_manual_guardar`, `n0_manual_borrar`,
  y `traspaso_crear_admin` para abrir Bienvenida.
  El cálculo vive en `n0_inscritos_json` (interna, sin permisos públicos).
- Nada se borra de verdad: desmarcar pone `presente = false`, borrar una clase
  la marca `borrada`, borrar un inscrito a mano lo marca `borrado`.
  (Además, en este entorno el SQL con `delete` pide confirmación manual.)

## Pruebas

```bash
node pruebas/prueba.js   # Chromium real con un Supabase falso; 110+ aserciones y capturas en /tmp/n0-*.png
```

## Despliegue

En línea en **https://renaware-nivel-cero.pages.dev**. Cloudflare Pages conectado
a este repo: directorio raíz, sin comando de build; cada push a `main` publica.
Registrado en `plataforma_modulos` con:

```sql
insert into plataforma_modulos (id, nombre, descripcion, url, roles, orden, activo)
values ('nivel-cero', 'Nivel Cero', 'Asistencia a capacitaciones y botella de acero de los nuevos.',
        'https://renaware-nivel-cero.pages.dev', array['admin','asistente'], 5, true)
on conflict (id) do update set url = excluded.url;
```
