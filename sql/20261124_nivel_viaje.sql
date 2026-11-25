-- 24/11/2026 · Nivel Cero: el nivel de viaje del Empiece Ya ya no es solo «Viaje a Miami».
-- Aplicado con execute_sql el 24/11/2026. Copia para el repo (regla 7 de claude/plataforma.md).
--
-- En el PB23 de 2026 el viaje pasó a ser a Guanacaste. En n0_datos el nivel 4 era la lista fija
-- array['Viaje a Miami']; ahora es todo ítem de categoría «viaje» del catálogo del Empiece Ya
-- (eya_items), así un destino nuevo solo se agrega al catálogo (ver
-- empiece-ya/sql/20261124_guanacaste_y_premios.sql) y no hay que tocar esta función.
--
-- Se parcha la definición viva (otro chat pudo haberla cambiado): si el ancla no está, falla
-- sin cambiar nada.
DO $$
declare d text; antes text;
begin
  d := pg_get_functiondef('public.n0_datos(uuid)'::regprocedure);
  antes := d;
  d := replace(d, '(4, array[''Viaje a Miami''])',
                  '(4, (select array_agg(i.item::text) from public.eya_items i where i.categoria = ''viaje''))');
  d := replace(d, '4 = viaje a Miami', '4 = viaje (todo ítem de categoría viaje en eya_items: Miami, Guanacaste...)');
  if d = antes or position('array[''Viaje a Miami'']' in d) > 0 then
    raise exception 'n0_datos: no se encontró el nivel 4';
  end if;
  execute d;
end $$;
