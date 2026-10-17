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
  código Rena Ware, Empiece Ya, botella y un WhatsApp con el mensaje que toca
  (cuánto le falta y hasta cuándo, o que recoja su botella).
- **Botellas**: por entregar, entregadas, a descontar en el Empiece Ya, y las
  que vienen dentro del Empiece Ya porque lo ganó antes de recibirla.
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

## Cómo está hecho

Un solo `index.html`, sin librerías ni build. Llama a Supabase
`kiexpdaaoegbtesqmaff` por RPC con la clave publicable; los datos los protege
la sesión de admin (`admin_login`, la misma clave del panel).

- Tablas: `n0_config`, `n0_clases`, `n0_asistencias`, `n0_estado`,
  `n0_inscritos_manual`. Vista `n0_inscritos`. RLS activo, sin acceso directo.
- Funciones con sesión: `n0_datos`, `n0_clase_guardar`, `n0_clase_borrar`,
  `n0_marcar`, `n0_estado_guardar`, `n0_manual_guardar`, `n0_manual_borrar`.
  El cálculo vive en `n0_inscritos_json` (interna, sin permisos públicos).
- Nada se borra de verdad: desmarcar pone `presente = false`, borrar una clase
  la marca `borrada`, borrar un inscrito a mano lo marca `borrado`.
  (Además, en este entorno el SQL con `delete` pide confirmación manual.)

## Pruebas

```bash
node pruebas/prueba.js   # Chromium real con un Supabase falso; 70+ aserciones y capturas en /tmp/n0-*.png
```

## Despliegue

Cloudflare Pages, directorio raíz, sin comando de build. Al tener la URL:

```sql
insert into plataforma_modulos (id, nombre, descripcion, url, roles, orden, activo)
values ('nivel-cero', 'Nivel Cero', 'Asistencia a capacitaciones y botella de acero de los nuevos.',
        'https://<proyecto>.pages.dev', array['admin','asistente'], 5, true)
on conflict (id) do update set url = excluded.url;
```
