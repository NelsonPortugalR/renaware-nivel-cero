/* Prueba de comportamiento en Chromium real (Playwright). Nivel Cero solo toma asistencia: los mensajes
   de WhatsApp a los nuevos se mandan desde Bienvenida (renaware-bienvenida), y aquí solo se enlaza.
   Supabase se reemplaza por un servidor falso que calcula lo mismo que
   n0_inscritos_json (plazo, clases válidas, logro, estado, Empiece Ya),
   así que lo que se verifica es la página: flujo, textos y que no salte nada.
   Uso: node pruebas/prueba.js   (deja capturas en /tmp/n0-*.png) */
const fs = require("fs");
const path = require("path");
const pw = require("/opt/npm-tools/node_modules/playwright/index.js");

const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const HOY = "2026-10-21"; // miércoles: hay clase de 4:00 p. m.
const SB = "https://kiexpdaaoegbtesqmaff.supabase.co/rest/v1/rpc/";

/* ---------------- servidor falso ---------------- */
function addDays(iso, n) { return new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10); }
const ANCLA = "2025-12-25"; // jueves: los períodos van de jueves a miércoles, 14 días
function pIdx(f) { return Math.floor((Date.parse(f + "T00:00:00Z") - Date.parse(ANCLA + "T00:00:00Z")) / (14 * 864e5)); }
function pIni(i) { return addDays(ANCLA, i * 14); }
function pbObj(st, i) {
  const cierre = addDays(pIni(i), 13), c = st.cargados[cierre];
  return { desde: pIni(i), cierre, anio: c ? c.anio : +cierre.slice(0, 4), pb: c ? c.pb : ((i % 26) + 26) % 26 + 1, cargado: c ? c.estado : null };
}
let uid = 100;
function nuevoId() { return "00000000-0000-4000-8000-" + String(++uid).padStart(12, "0"); }

function estadoInicial() {
  const cfg = { clases_meta: 5, dias_plazo: 30, premio: "Botella de acero inoxidable", trato: "usted",
    horarios: [{ dia: 2, hora: "09:30" }, { dia: 3, hora: "16:00" }, { dia: 5, hora: "16:30" }] };
  const ins = [
    { id: "a", nombre: "ANA LUCIA QUISPE MAMANI", celular: "959111222", afiliador: "ROSA HILDA ZEBALLOS HUANCA", fecha_inscripcion: "2026-10-01", origen: "registro", estado_registro: "procesado", codigo: "1770001" },
    { id: "b", nombre: "Bruno Díaz Chávez", celular: "959333444", afiliador: "Portugal Research International", fecha_inscripcion: "2026-10-15", origen: "registro", estado_registro: "nuevo", codigo: null },
    { id: "c", nombre: "CARMEN ROSA TTITO CCAMA", celular: null, afiliador: "Henry Gallegos Ccahuana", fecha_inscripcion: "2026-09-10", origen: "registro", estado_registro: "procesado", codigo: "1769950" },
    { id: "d", nombre: "DORIS PAREDES DE LA CRUZ", celular: "959555666", afiliador: "Henry Gallegos Ccahuana", fecha_inscripcion: "2026-08-05", origen: "registro", estado_registro: "procesado", codigo: "1768000" },
    { id: "e", nombre: "Elena Segunda Landazuri Mosquera", celular: "959777888", afiliador: "ROSA HILDA ZEBALLOS HUANCA", fecha_inscripcion: "2026-09-22", origen: "registro", estado_registro: "procesado", codigo: "1769990" },
    { id: "f", nombre: "FANNY QUISPE CHAUCCA", celular: "+51 959 999 000", afiliador: "Portugal Research International", fecha_inscripcion: "2026-09-25", origen: "registro", estado_registro: "procesado", codigo: "1770543" },
    { id: "g", nombre: "Gloria Maritza Maron Limachi", celular: "959123123", afiliador: "JULIA BEATRIZ MARON LIMACHI", fecha_inscripcion: "2026-09-23", origen: "registro", estado_registro: "procesado", codigo: "1769733" },
    { id: "h", nombre: "HUGO PRUEBA DUPLICADO", celular: null, afiliador: null, fecha_inscripcion: "2026-10-10", origen: "registro", estado_registro: "nuevo", codigo: null }
  ];
  const estado = {
    e: { botella_entregada_en: "2026-10-10" },
    h: { excluido: true }
  };
  // clases martes / miércoles / viernes desde el 23 de setiembre
  const clases = [];
  const fechas = [["2026-09-23", "16:00"], ["2026-09-25", "16:30"], ["2026-09-29", "09:30"], ["2026-09-30", "16:00"], ["2026-10-02", "16:30"],
                  ["2026-10-06", "09:30"], ["2026-10-07", "16:00"], ["2026-10-09", "16:30"], ["2026-10-14", "16:00"], ["2026-10-16", "16:30"], ["2026-10-20", "09:30"], ["2026-10-16", "09:30"]];
  fechas.forEach(function (x, i) { clases.push({ id: "k" + i, fecha: x[0], hora: x[1], tema: i === 0 ? "Bienvenida" : null, tipo: "capacitacion", borrada: false }); });
  const asis = [];
  function marca(ins, ks) { ks.forEach(function (k) { asis.push({ clase: "k" + k, ins: ins, presente: true }); }); }
  marca("a", [5, 6, 7, 9]);              // 4 de 5, en curso
  marca("c", [0, 1]);                    // venció con 2
  marca("e", [0, 1, 2, 3, 4]);           // logró, botella entregada, ganó Empiece Ya
  marca("f", [1, 2, 3, 4, 5]);           // logró, botella por entregar
  marca("g", [0, 1, 2, 3, 4, 10]);       // logró, ganó Empiece Ya antes de recibir botella
  const U = "Utensilio 1.5L + Botella Acero Inoxidable";
  const ganadores = [
    { codigo: "1769990", nombre: "LANDAZURI MOSQUERA ELENA SEGUNDA", fecha: "2026-09-30", anio: 2026, pb: 20, origen: "pdf", premios: U, niveles: [{ n: 1, anio: 2026, pb: 20 }] },
    { codigo: "1769733", nombre: "MARON LIMACHI GLORIA MARITZA", fecha: "2026-09-30", anio: 2026, pb: 20, origen: "pdf", premios: U, niveles: [{ n: 1, anio: 2026, pb: 20 }] },
    { codigo: "1700000", nombre: "PEREZ VILCA ROSA", fecha: "2026-08-19", anio: 2026, pb: 17, origen: "pdf", premios: U + " · Multi Cooker", niveles: [{ n: 1, anio: 2026, pb: 17 }, { n: 2, anio: 2026, pb: 18 }] },
    { codigo: "1600000", nombre: "MAMANI APAZA JUAN CARLOS", fecha: "2026-06-10", anio: 2026, pb: 12, origen: "pdf", premios: U + " · Multi Cooker · Extractor Nutrex Press · Viaje a Miami",
      niveles: [{ n: 1, anio: 2026, pb: 12 }, { n: 2, anio: 2026, pb: 14 }, { n: 3, anio: 2026, pb: 16 }, { n: 4, anio: 2026, pb: 18 }] },
    { codigo: "1500000", nombre: "CONDORI LUZ MARINA", fecha: "2025-11-26", anio: 2025, pb: 24, origen: "historico", premios: null, niveles: [] }
  ];
  const cargados = { "2025-11-26": { anio: 2025, pb: 24, estado: "Historico" } };
  for (let i = 9; i <= 19; i++) cargados[addDays(pIni(i), 13)] = { anio: 2026, pb: i + 1, estado: "Oficial" };
  return { cfg, ins, estado, clases, asis, ganadores, cargados, mensajes: [], token: "tok-valido", llamadas: [] };
}

function servidor(st) {
  function fila(p) {
    const e = st.estado[p.id] || {};
    const inicio = e.fecha_inicio || p.fecha_inscripcion;
    const vence = addDays(inicio, st.cfg.dias_plazo);
    const codigo = e.codigo_rw || p.codigo || null;
    const mias = st.asis.filter(a => a.ins === p.id && a.presente)
      .map(a => st.clases.find(c => c.id === a.clase)).filter(c => c && !c.borrada)
      .sort((x, y) => (x.fecha + x.hora).localeCompare(y.fecha + y.hora));
    const val = mias.filter(c => c.fecha >= inicio && c.fecha <= vence);
    const primera = st.clases.filter(c => !c.borrada).map(c => c.fecha).sort()[0] || null;
    const meta = st.cfg.clases_meta;
    let estado;
    if (e.excluido) estado = "excluido";
    else if (val.length >= meta) estado = "logro";
    else if (HOY <= vence) estado = "en_curso";
    else if (!primera || vence < primera) estado = "sin_seguimiento";
    else estado = "vencio";
    const w = codigo && st.ganadores.find(g => g.codigo === codigo);
    const eyr = w && w.fecha >= addDays(inicio, -14) ? { fecha: w.fecha, anio: w.anio, pb: w.pb, por: "codigo", codigo: w.codigo, premios: w.premios } : null;
    // Empiece Ya: período en que ingresó y dos más
    const i0 = pIdx(inicio), fin = pbObj(st, i0 + 2);
    let eyEstado;
    if (eyr) eyEstado = "gano";
    else if (HOY <= fin.cierre) eyEstado = "en_plazo";
    else if (!fin.cargado) eyEstado = "esperando";
    else eyEstado = fin.cargado === "Oficial" || fin.cargado === "Historico" ? "no_gano" : "preliminar";
    return {
      id: p.id, origen: p.origen, nombre: p.nombre, celular: p.celular, dni: p.dni || null, afiliador: p.afiliador,
      fecha_inscripcion: p.fecha_inscripcion, estado_registro: p.estado_registro || null,
      inicio, inicio_editado: !!e.fecha_inicio, vence, codigo, codigo_editado: !!e.codigo_rw,
      excluido: !!e.excluido, nota: e.nota || null,
      botella_entregada_en: e.botella_entregada_en || null, ey_descontado_en: e.ey_descontado_en || null,
      asistencias: mias.map(c => ({ c: c.id, v: c.fecha >= inicio && c.fecha <= vence })),
      validas: val.length, total: mias.length,
      logro_fecha: val.length >= meta ? val[meta - 1].fecha : null,
      estado, ey: eyr, pb_ingreso: pbObj(st, i0), ey_fin: fin, ey_estado: eyEstado,
      trato: e.trato || null,
      mensajes: st.mensajes.filter(m => m.ins === p.id && !m.anulado).map(m => ({ id: m.id, paso: m.paso, modo: m.modo, en: m.en }))
    };
  }
  function n(k) { return st.asis.filter(a => a.clase === k.id && a.presente).length; }
  function claseOut(k) { return { id: k.id, fecha: k.fecha, hora: k.hora, tema: k.tema, tipo: k.tipo, n: n(k) }; }
  function datos() {
    const vivas = st.clases.filter(c => !c.borrada);
    const ult = Object.keys(st.cargados).sort().pop();
    return {
      hoy: HOY, pb_hoy: pbObj(st, pIdx(HOY)), config: st.cfg,
      primera_clase: vivas.map(c => c.fecha).sort()[0] || null,
      ey_hasta: ult ? Object.assign({ fecha: ult }, st.cargados[ult]) : null,
      ey_wv08: st.ganadores.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre)),
      clases: vivas.slice().sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora)).map(claseOut),
      inscritos: st.ins.filter(p => !p.borrado).map(fila).sort((a, b) => b.fecha_inscripcion.localeCompare(a.fecha_inscripcion))
    };
  }
  function falla(msg) { const e = new Error(msg); e.pg = true; throw e; }
  function sesion(a) { if (a.p_token !== st.token) falla("Sesion invalida"); }
  const rutas = {
    admin_login(a) { if (a.p_clave !== "clave-buena") falla("Clave incorrecta"); return st.token; },
    n0_datos(a) { sesion(a); return datos(); },
    n0_clase_guardar(a) {
      sesion(a);
      if (!a.p_fecha) falla("Falta la fecha de la clase");
      const hora = String(a.p_hora || "").slice(0, 5);
      if (!/^\d{2}:\d{2}$/.test(hora)) falla("La hora no es valida");
      let k;
      if (!a.p_id) {
        k = st.clases.find(c => c.fecha === a.p_fecha && c.hora === hora);
        if (k) { if (k.borrada) { k.borrada = false; k.tema = a.p_tema; k.tipo = a.p_tipo; } else k.tema = a.p_tema || k.tema; }
        else { k = { id: nuevoId(), fecha: a.p_fecha, hora, tema: a.p_tema || null, tipo: a.p_tipo || "capacitacion", borrada: false }; st.clases.push(k); }
      } else {
        k = st.clases.find(c => c.id === a.p_id && !c.borrada);
        if (!k) falla("La clase no existe");
        if (st.clases.some(c => c.id !== k.id && !c.borrada && c.fecha === a.p_fecha && c.hora === hora)) falla("Ya hay una clase ese dia a esa hora");
        Object.assign(k, { fecha: a.p_fecha, hora, tema: a.p_tema || null, tipo: a.p_tipo });
      }
      return claseOut(k);
    },
    n0_clase_borrar(a) {
      sesion(a);
      const k = st.clases.find(c => c.id === a.p_id && !c.borrada);
      if (!k) falla("La clase no existe");
      k.borrada = true;
      st.asis.filter(x => x.clase === k.id).forEach(x => { x.presente = false; });
      return { ok: true };
    },
    n0_marcar(a) {
      sesion(a);
      const k = st.clases.find(c => c.id === a.p_clase && !c.borrada);
      if (!k) falla("La clase no existe");
      const p = st.ins.find(x => x.id === a.p_inscrito && !x.borrado);
      if (!p) falla("La persona no existe");
      let r = st.asis.find(x => x.clase === k.id && x.ins === p.id);
      if (a.p_presente) {
        if (k.fecha > HOY) falla("Esa clase todavia no ocurre");
        if (r) r.presente = true; else st.asis.push({ clase: k.id, ins: p.id, presente: true });
      } else if (r) r.presente = false;
      return { clase_id: k.id, n: n(k), inscrito: fila(p) };
    },
    n0_estado_guardar(a) {
      sesion(a);
      const p = st.ins.find(x => x.id === a.p_inscrito && !x.borrado);
      if (!p) falla("La persona no existe");
      const c = a.p_cambios || {};
      if ("codigo_rw" in c && c.codigo_rw && !/^\d{4,7}$/.test(String(c.codigo_rw).replace(/\D/g, ""))) falla("El codigo de Rena Ware tiene de 4 a 7 digitos");
      const e = st.estado[p.id] || (st.estado[p.id] = {});
      Object.keys(c).forEach(function (key) { e[key] = c[key] === "" ? null : c[key]; });
      return fila(p);
    },
    n0_manual_guardar(a) {
      sesion(a);
      const d = a.p_datos || {};
      if (!d.nombre || d.nombre.trim().split(/\s+/).length < 2) falla("Escribe nombre y apellido");
      let cel = String(d.celular || "").replace(/\D/g, "");
      if (cel.length === 11 && cel.startsWith("51")) cel = cel.slice(2);
      if (cel && !/^9\d{8}$/.test(cel)) falla("El celular debe tener 9 digitos y empezar con 9");
      if (!d.fecha_inscripcion) falla("Falta la fecha de inscripcion");
      let p;
      if (a.p_id) {
        p = st.ins.find(x => x.id === a.p_id && x.origen === "manual" && !x.borrado);
        if (!p) falla("Solo se editan los inscritos agregados a mano");
      } else { p = { id: nuevoId(), origen: "manual" }; st.ins.push(p); }
      Object.assign(p, { nombre: d.nombre.trim(), celular: cel || null, afiliador: d.afiliador || null,
        fecha_inscripcion: d.fecha_inscripcion, codigo: (d.codigo_rw || "").replace(/\D/g, "") || null, dni: d.dni || null });
      return fila(p);
    },
    n0_manual_borrar(a) {
      sesion(a);
      const p = st.ins.find(x => x.id === a.p_id && x.origen === "manual" && !x.borrado);
      if (!p) falla("Solo se borran los inscritos agregados a mano");
      p.borrado = true;
      st.asis.filter(x => x.ins === p.id).forEach(x => { x.presente = false; });
      return { ok: true };
    }
  };
  return function (fn, args) {
    st.llamadas.push(fn);
    if (!rutas[fn]) return { status: 404, body: { message: "Funcion no existe: " + fn } };
    try { return { status: 200, body: rutas[fn](args) }; }
    catch (e) { if (e.pg) return { status: 400, body: { code: "P0001", details: null, hint: null, message: e.message } }; throw e; }
  };
}

/* ---------------- pruebas ---------------- */
let fallas = 0;
function bien(nombre, cond, extra) {
  if (!cond) fallas++;
  console.log((cond ? "ok    " : "FALLA ") + nombre + (extra !== undefined && !cond ? "  → " + extra : ""));
}

(async () => {
  const st = estadoInicial();
  const api = servidor(st);
  const nav = await pw.chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, timezoneId: "America/Lima" });
  await ctx.route("https://wa.me/**", r => r.fulfill({ status: 200, contentType: "text/html", body: "<p>WhatsApp</p>" }));
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date("2026-10-21T10:00:00-05:00"));   // miércoles 10 a. m.: la clase de hoy es a las 4 p. m.
  const errores = [];
  page.on("pageerror", e => errores.push(String(e)));
  // los 400 esperados (clave mala, validaciones) salen como "Failed to load resource": no son errores de la página
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errores.push(m.text()); });

  await page.route("https://nivel-cero.test/**", r => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: HTML }));
  await page.route(SB + "**", async r => {
    const fn = r.request().url().slice(SB.length);
    const res = api(fn, JSON.parse(r.request().postData() || "{}"));
    await r.fulfill({ status: res.status, contentType: "application/json", body: JSON.stringify(res.body) });
  });
  const txt = () => page.locator("body").innerText();
  const espera = ms => page.waitForTimeout(ms);
  const toast = () => page.locator("#toast").innerText();

  await page.goto("https://nivel-cero.test/");
  await espera(300);

  /* 1 · ingreso */
  bien("muestra el ingreso", await page.locator("#clave").isVisible());
  await page.fill("#clave", "mala");
  await page.click("button[type=submit]");
  await espera(300);
  bien("clave mala avisa", /Clave incorrecta/.test(await txt()));
  await page.fill("#clave", "clave-buena");
  await page.click("button[type=submit]");
  await espera(500);
  bien("entra y carga", /Nivel Cero/i.test(await txt()) && /Asistencia/i.test(await txt()));
  bien("guarda la sesión", (await page.evaluate(() => localStorage.getItem("n0-token"))) === "tok-valido");
  await page.screenshot({ path: "/tmp/n0-1-inicio.png", fullPage: true });

  /* 2 · clase de hoy */
  const empezar = page.locator("button", { hasText: "Empezar la clase de las 4:00 p. m." });
  bien("propone la clase de hoy por el horario", await empezar.count() === 1);
  bien("lista las clases anteriores", (await page.locator(".fila.clase").count()) >= 11);
  await empezar.click();
  await espera(500);
  bien("abre la toma de asistencia", /Miércoles 21 de octubre/.test(await txt()));
  const filas = await page.locator(".fila.asis").allInnerTexts();
  bien("solo salen quienes tienen el plazo abierto", filas.some(t => /Ana Lucia/.test(t)) && filas.some(t => /Bruno/.test(t)) && !filas.some(t => /Carmen/.test(t)) && !filas.some(t => /Hugo/.test(t)), filas.join(" | "));
  bien("ordenados por nombre", filas[0].indexOf("Ana Lucia") === 0, filas[0]);

  /* 3 · marcar: Ana llega a 5 */
  const scrollAntes = await page.evaluate(() => window.scrollY);
  await page.locator('.fila.asis[data-id="a"]').click();
  await espera(400);
  bien("marca y cuenta", (await page.locator(".contador b").innerText()) === "1");
  bien("avisa que ganó su botella", /Ana completó sus 5 clases/.test(await toast()), await toast());
  bien("la fila queda marcada", (await page.locator('.fila.asis[data-id="a"]').getAttribute("aria-pressed")) === "true");
  bien("la lista no salta", Math.abs((await page.evaluate(() => window.scrollY)) - scrollAntes) < 5);
  bien("pestaña Botellas se actualiza", /Botellas\s*3/i.test(await page.locator("nav.tabs").innerText()), await page.locator("nav.tabs").innerText());
  await page.locator('.fila.asis[data-id="a"]').click();
  await espera(400);
  bien("desmarca", (await page.locator(".contador b").innerText()) === "0" && (await page.locator('.fila.asis[data-id="a"]').getAttribute("aria-pressed")) === "false");
  await page.locator('.fila.asis[data-id="a"]').click();
  await espera(400);

  /* 4 · buscar y fuera de plazo */
  await page.fill('input[data-in="buscaAsis"]', "bruno");
  await espera(150);
  bien("busca sin tildes", (await page.locator(".fila.asis").count()) === 1);
  await page.fill('input[data-in="buscaAsis"]', "zzz");
  await espera(150);
  bien("búsqueda vacía", /Nadie con ese nombre/.test(await page.locator("#lista-asis").innerText()));
  await page.fill('input[data-in="buscaAsis"]', "");
  await page.check('input[data-in="fuera"]');
  await espera(150);
  bien("muestra fuera de plazo", /Fuera de su plazo/i.test(await page.locator("#lista-asis").innerText()) && /Carmen/.test(await page.locator("#lista-asis").innerText()));
  await page.uncheck('input[data-in="fuera"]');

  /* 5 · agregar a mano desde la clase */
  await page.click("text=+ Agregar a alguien que no está en la lista");
  await espera(200);
  bien("abre el alta a mano", await page.locator("#mNombre").isVisible());
  bien("propone la fecha de la clase", (await page.inputValue("#mFecha")) === HOY);
  await page.fill("#mNombre", "Solo");
  await page.click("text=Guardar");
  await espera(300);
  bien("valida nombre y apellido", /Escribe nombre y apellido/.test(await page.locator(".modal").innerText()));
  await page.fill("#mNombre", "María Pérez Soto");
  await page.fill("#mCelular", "987 654 321");
  await page.click("text=Guardar");
  await espera(500);
  bien("queda en la lista y marcada", (await page.locator(".contador b").innerText()) === "2" && /María Pérez Soto/.test(await page.locator("#lista-asis").innerText()));
  await page.screenshot({ path: "/tmp/n0-2-asistencia.png", fullPage: true });
  await page.setViewportSize({ width: 360, height: 760 });
  await page.screenshot({ path: "/tmp/n0-2b-asistencia-360.png" });
  await page.setViewportSize({ width: 390, height: 844 });

  /* 6 · inscritos y ficha */
  await page.click('button.tab[data-tab="inscritos"]');
  await espera(200);
  const chips = await page.locator(".chips").first().innerText();
  bien("cuenta por estado", /En curso\s*2/i.test(chips) && /Lograron\s*4/i.test(chips) && /Vencieron\s*1/i.test(chips), chips.replace(/\n/g, " "));
  bien("ya no hay «Por escribir»: abre en En curso", (await page.locator('button.chip[data-f="escribir"]').count()) === 0 && (await page.locator('button.chip.on[data-f="en_curso"]').count()) === 1);
  bien("la pestaña Inscritos no cuenta mensajes", !/Inscritos\s*\d/.test(await page.locator("nav.tabs").innerText()), await page.locator("nav.tabs").innerText());
  await page.click('button.chip[data-f="en_curso"]');
  await espera(150);
  bien("la lista ya no tiene botones de mensaje", (await page.locator(".fila.ins a.wa, [data-envio]").count()) === 0);
  await page.click('button.chip[data-f="logro"]');
  await espera(150);
  await page.click('button.chip[data-f="todos"]');
  await espera(150);
  await page.screenshot({ path: "/tmp/n0-5-inscritos.png", fullPage: true });
  await page.click('button.chip[data-f="logro"]');
  await espera(150);
  bien("marca en la lista a quien ganó el Empiece Ya", /Empiece Ya/i.test(await page.locator('.fila.ins[data-id="e"]').innerText()) &&
    /Empiece Ya/i.test(await page.locator('.fila.ins[data-id="g"]').innerText()) && !/Empiece Ya/i.test(await page.locator('.fila.ins[data-id="f"]').innerText()));
  await page.locator('.fila.ins[data-id="a"] .cuerpo').click();
  await espera(250);
  await page.screenshot({ path: "/tmp/n0-6-ficha.png" });
  const ficha = await page.locator(".modal").innerText();
  bien("ficha con su estado", /Logró el 21 oct/.test(ficha) && /5 de 5/.test(ficha), ficha.slice(0, 300));
  bien("ficha con su código", /1770001/.test(ficha));
  bien("Empiece Ya en plazo hasta su tercer período", /En plazo: puede ganarlo hasta el cierre del PB23 \(miércoles 11 de noviembre\)/.test(ficha), ficha);
  bien("dice en qué período ingresó", /Ingresó en el PB21 \(1 oct al 14 oct\)\. Tiene hasta el PB23 \(11 nov\)/.test(ficha), ficha);
  bien("los mensajes se mandan desde Bienvenida", (await page.locator('.modal .msj-sec a[href="https://renaware-bienvenida.pages.dev/#a=a"]').count()) === 1 &&
    /Abrir en Bienvenida/i.test(ficha) && (await page.locator(".modal .msj-caja, .modal [data-envio], .modal [data-a=tratoPersona]").count()) === 0, ficha);
  bien("queda el enlace para abrir su chat", (await page.locator('.modal a[href="https://wa.me/51959111222"]').count()) === 1);
  await page.click("text=Entregué hoy");
  await espera(400);
  bien("entrega la botella", /Entregada el 21 oct/.test(await page.locator(".modal").innerText()));
  await page.click(".modal >> text=Corregir inicio");
  await espera(150);
  bien("abre corregir inicio", await page.locator("#eInicio").isVisible());
  await page.click(".modal >> text=Cancelar");
  await page.click(".modal >> text=Cambiar");
  await page.fill("#eCodigo", "12");
  await page.click(".modal >> text=Guardar");
  await espera(300);
  bien("valida el código", /de 4 a 7 dígitos/.test(await toast()), await toast());
  await page.click('.x[aria-label="Cerrar"]');
  await espera(150);
  bien("cierra la ficha", (await page.locator(".modal").count()) === 0);

  /* 6b · agregar clases desde la ficha (Bruno, plazo del 15 oct al 14 nov) */
  await page.click('button.chip[data-f="en_curso"]');
  await espera(150);
  await page.locator('.fila.ins[data-id="b"] .cuerpo').click();
  await espera(250);
  await page.click(".modal >> text=+ Agregar clase");
  await espera(150);
  const chipsB = await page.locator(".caja-edit .chip").allInnerTexts();
  bien("propone las clases guardadas de su plazo", chipsB.length === 4 && chipsB.some(t => /20 oct/i.test(t)) && !chipsB.some(t => /14 oct/i.test(t)), chipsB.join(" | "));
  await page.click('.caja-edit .chip[data-c="k10"]');
  await espera(400);
  bien("agrega una clase guardada con un toque", /Clase agregada/.test(await toast()) && /1 de 5/.test(await page.locator(".modal").innerText()), await toast());
  bien("ya no la vuelve a proponer", (await page.locator('.caja-edit .chip[data-c="k10"]').count()) === 0 && (await page.locator(".caja-edit").count()) === 1);
  await page.fill("#eFechaClase", "2026-10-16");
  await page.click('button[data-a="sumarFecha"]');
  await espera(200);
  bien("si ese día hubo dos clases, pregunta cuál", /Ese día hay 2 clases/i.test(await page.locator(".caja-edit").innerText()));
  await page.click('.caja-edit .chip[data-c="k11"]');
  await espera(400);
  bien("suma la que eligió", /2 de 5/.test(await page.locator(".modal").innerText()) && st.asis.some(a => a.clase === "k11" && a.ins === "b" && a.presente));
  await page.fill("#eFechaClase", "2026-10-19");
  await page.fill("#eTemaClase", "Prospección");
  await page.click('button[data-a="sumarFecha"]');
  await espera(600);
  const lunes = st.clases.find(c => c.fecha === "2026-10-19" && !c.borrada);
  bien("un día sin clase la crea sin hora y con su tema", !!lunes && lunes.hora === "00:00" && lunes.tema === "Prospección", JSON.stringify(lunes));
  bien("y la suma", /3 de 5/.test(await page.locator(".modal").innerText()) && /sin hora · Prospección/i.test(await page.locator(".modal .clases-p").innerText()),
    await page.locator(".modal .clases-p").innerText());
  bien("limpia el tema", (await page.inputValue("#eTemaClase")) === "");
  await page.fill("#eFechaClase", "2026-10-13");
  await page.click('button[data-a="sumarFecha"]');
  await espera(600);
  const martes = st.clases.find(c => c.fecha === "2026-10-13" && !c.borrada);
  bien("con la hora habitual de ese día", !!martes && martes.hora === "09:30", JSON.stringify(martes));
  bien("avisa que fuera de su plazo no suma", /no suma/.test(await toast()) && /y 1 fuera de plazo/.test(await page.locator(".modal").innerText()), await toast());
  await page.screenshot({ path: "/tmp/n0-7-agregar-clase.png", fullPage: true });
  await page.fill("#eFechaClase", "2026-10-23");
  await page.click('button[data-a="sumarFecha"]');
  await espera(200);
  bien("no acepta un día que no llega", /todavía no llega/.test(await toast()), await toast());
  await page.fill("#eFechaClase", "2026-10-20");
  await page.click('button[data-a="sumarFecha"]');
  await espera(200);
  bien("no repite la clase que ya tiene", /Ya tiene marcada/.test(await toast()), await toast());
  await page.click('.modal .clases-p button[data-c="' + (martes && martes.id) + '"]');
  await espera(400);
  bien("quita una clase", /Clase quitada/.test(await toast()) && !/fuera de plazo/.test(await page.locator(".modal").innerText()) &&
    st.asis.some(a => martes && a.clase === martes.id && a.ins === "b" && !a.presente));
  await page.click(".caja-edit >> text=Listo");
  await espera(150);
  bien("cierra el panel", (await page.locator(".caja-edit").count()) === 0);
  await page.click('.x[aria-label="Cerrar"]');
  await espera(150);

  /* 6c · sin enlace a Bienvenida para quien ya no está entre los nuevos */
  await page.click('button.chip[data-f="todos"]');
  await espera(150);
  await page.locator('.fila.ins[data-id="d"] .cuerpo').click();
  await espera(200);
  bien("a quien se inscribió hace más de 45 días no lo manda a Bienvenida", (await page.locator(".modal .msj-sec").count()) === 0 && /Doris/.test(await page.locator(".modal").innerText()));
  await page.click('.x[aria-label="Cerrar"]');
  await espera(150);

  /* 7 · botellas */
  await page.click('button.tab[data-tab="botellas"]');
  await espera(200);
  const bot = await page.locator("main").innerText();
  bien("por entregar: Fanny", /Por entregar\s*1/i.test(bot) && /Fanny Quispe Chaucca/.test(bot), bot.slice(0, 400));
  bien("descontar: Elena", /Descontar en su Empiece Ya\s*1/i.test(bot) && /Elena Segunda/.test(bot));
  bien("viene con el Empiece Ya: Gloria", /Su botella viene con el Empiece Ya\s*1/i.test(bot) && /Gloria Maritza/.test(bot));
  bien("entregadas: Ana y Elena", /Entregadas\s*2/i.test(bot));
  const avisar = page.locator('.fila.bot a[href="https://renaware-bienvenida.pages.dev/#a=f&paso=recoger"]');
  bien("«Avisar» lleva a Bienvenida con el mensaje para recoger la botella", (await avisar.count()) === 1 && (await avisar.getAttribute("target")) === "_blank" && /Avisar/i.test(await avisar.innerText()));
  await page.click('button[data-a="descontar"]');
  await espera(400);
  const bot2 = await page.locator("main").innerText();
  bien("registra el descuento", !/Descontar en su Empiece Ya/i.test(bot2) && /descontada en su Empiece Ya/.test(bot2));
  await page.screenshot({ path: "/tmp/n0-3-botellas.png", fullPage: true });

  /* 8 · números */
  await page.click('button.tab[data-tab="numeros"]');
  await espera(200);
  const num = await page.locator("main").innerText();
  bien("sin NaN ni undefined", !/NaN|undefined|null/.test(num), num.match(/NaN|undefined|null/));
  bien("kpis", /Inscritos con seguimiento\s*7/i.test(num) && /Lograron el Nivel Cero\s*4/i.test(num), num.slice(0, 500));
  bien("tasa sobre cerrados", /80% de quienes cerraron su plazo/.test(num), num.slice(0, 600));
  bien("embudo", /Embudo/i.test(num) && /Lograron las 5/.test(num));
  bien("comparación con quienes cerraron su plazo del Empiece Ya", /Con Nivel Cero\s*100%\s*2 de 2 ganaron/i.test(num) && /Sin Nivel Cero\s*—\s*0 de 0/i.test(num), num.slice(num.indexOf("empuja"), num.indexOf("empuja") + 400));
  bien("tabla por mes", /oct 2026/.test(num) && /set 2026/.test(num) && /ago 2026/.test(num) && /1 sin seguimiento/.test(num));
  bien("horarios y afiliadores", /Asistencia por horario/i.test(num) && /Por quién los afilió/i.test(num));
  bien("explica a los sin seguimiento", /1 inscrito de antes del 23 set/.test(num), num.slice(-300));
  bien("enlaza al portal de Empiece Ya", (await page.locator('a[href="https://empiece-ya.nelson1614.workers.dev"]').count()) === 1);
  await page.screenshot({ path: "/tmp/n0-4-numeros.png", fullPage: true });

  /* 8b · Empiece Ya de WV08 */
  await page.click('button.tab[data-tab="ey"]');
  await espera(200);
  let eyt = await page.locator("main").innerText();
  bien("pestaña Empiece Ya de WV08", /Ganadores del Empiece Ya de tu equipo WV08, cargados hasta el PB20 \(30 set\)/.test(eyt), eyt.slice(0, 200));
  const anios = await page.locator("main .chips").first().innerText();
  bien("años con su cuenta", /2026\s*4/.test(anios) && /2025\s*1/.test(anios) && /Todos\s*5/i.test(anios), anios.replace(/\n/g, " "));
  const tiles = await page.locator(".niveles").innerText();
  bien("ganadores por nivel", /4\s*Ganadores/i.test(tiles) && /4\s*Nivel I\b/i.test(tiles) && /2\s*Nivel II\b/i.test(tiles) && /1\s*Nivel III/i.test(tiles) && /1\s*Miami/i.test(tiles), tiles.replace(/\n/g, " "));
  let cruce = await page.locator(".cruce").first().innerText();
  bien("cruce con el Nivel Cero", /2\s*hicieron el Nivel Cero/.test(cruce) && /0\s*ganaron sin completar las 5 clases/.test(cruce) && /2\s*de antes o fuera del registro/.test(cruce), cruce.replace(/\n/g, " "));
  const filasEY = await page.locator(".fila.gan").allInnerTexts();
  bien("lista los ganadores del año", filasEY.length === 4, filasEY.length);
  const fElena = filasEY.find(t => /Elena/.test(t)) || "", fGloria = filasEY.find(t => /Gloria/.test(t)) || "", fJuan = filasEY.find(t => /Juan Carlos/.test(t)) || "";
  bien("marca a quien hizo el Nivel Cero y su botella", /Nivel Cero/i.test(fElena) && /Hizo el Nivel Cero · botella entregada/.test(fElena) && /su botella va con el Empiece Ya/.test(fGloria), fElena + " / " + fGloria);
  bien("niveles con el período en que llegó", /Nivel I \(PB12\) · II \(PB14\) · III \(PB16\) · Miami \(PB18\)/.test(fJuan) && /No está en el registro de afiliaciones/.test(fJuan), fJuan);
  bien("agrupa por período", /PB20 · 30 set/i.test(eyt) && /PB12 · 10 jun/i.test(eyt));
  await page.screenshot({ path: "/tmp/n0-8-empiece-ya.png", fullPage: true });
  await page.click('.tnv[data-n="2"]');
  await espera(150);
  bien("filtra por nivel", (await page.locator(".fila.gan").count()) === 2 && /Nivel II/i.test(await page.locator("section.card").first().innerText()));
  await page.click('.tnv[data-n="2"]');
  await espera(150);
  bien("vuelve a todos", (await page.locator(".fila.gan").count()) === 4);
  await page.click('.cz[data-g="con"]');
  await espera(150);
  bien("toca el cruce y filtra", (await page.locator(".fila.gan").count()) === 2 && (await page.locator(".cz.on").count()) === 1);
  await page.locator('.fila.gan[data-id="e"]').click();
  await espera(250);
  bien("abre la ficha desde el ganador", /Ganó en el PB20 \(30 set\) · Nivel I/.test(await page.locator(".modal").innerText()), await page.locator(".modal").innerText());
  await page.click('.x[aria-label="Cerrar"]');
  await espera(100);
  await page.click('.cz[data-g="con"]');
  await espera(150);
  await page.click('main .chip[data-y="2025"]');
  await espera(150);
  eyt = await page.locator("main").innerText();
  bien("año anterior sin detalle del premio", (await page.locator(".fila.gan").count()) === 1 && /Nivel sin detalle/.test(eyt) && /1 ganador no tiene el detalle del premio \(se carga desde el PB10 de 2026\)/.test(eyt) && /PB24 de 2025/i.test(eyt), eyt.slice(0, 700));
  let plazo = await page.locator("section.bloque").last().innerText();
  bien("tus inscritos y su Empiece Ya", /2\s*ganaron/.test(plazo) && /4\s*en plazo/.test(plazo) && /1\s*esperando resultados/.test(plazo) && /1\s*no ganaron/.test(plazo), plazo.replace(/\n/g, " "));
  bien("dice qué resultados faltan", /Faltan los resultados oficiales del PB21/.test(plazo), plazo);

  /* 8c · ficha según su período */
  await page.click('button.tab[data-tab="inscritos"]');
  await page.click('button.chip[data-f="todos"]');
  await espera(150);
  await page.locator('.fila.ins[data-id="c"] .cuerpo').click();
  await espera(200);
  let fc = await page.locator(".modal").innerText();
  bien("plazo cerrado, esperando resultados", /Su plazo cerró\. Falta cargar los resultados del PB21/.test(fc) && /Ingresó en el PB19 \(3 set al 16 set\)\. Tiene hasta el PB21 \(14 oct\)/.test(fc), fc);
  await page.click('.x[aria-label="Cerrar"]');
  await page.locator('.fila.ins[data-id="d"] .cuerpo').click();
  await espera(200);
  fc = await page.locator(".modal").innerText();
  bien("no ganó si no aparece en sus tres períodos", /No ganó\. No aparece entre los ganadores hasta el PB18, su último período/.test(fc), fc);
  await page.click('.x[aria-label="Cerrar"]');

  /* 8d · llega el PB21: Carmen ganó sin completar sus 5 clases */
  st.cargados["2026-10-14"] = { anio: 2026, pb: 21, estado: "Oficial" };
  st.ganadores.push({ codigo: "1769950", nombre: "TTITO CCAMA CARMEN ROSA", fecha: "2026-10-14", anio: 2026, pb: 21, origen: "pdf",
    premios: "Utensilio 1.5L + Botella Acero Inoxidable · Multi Cooker", niveles: [{ n: 1, anio: 2026, pb: 21 }, { n: 2, anio: 2026, pb: 21 }] });
  await page.click('button[data-a="recargar"]');
  await espera(500);
  await page.click('button.tab[data-tab="ey"]');
  await page.click('main .chip[data-y="2026"]');
  await espera(150);
  eyt = await page.locator("main").innerText();
  cruce = await page.locator(".cruce").first().innerText();
  bien("al cargar el PB21 se actualiza solo", /cargados hasta el PB21/.test(eyt) && /1\s*ganaron sin completar las 5 clases/.test(cruce) && !/Faltan los resultados/.test(eyt), cruce.replace(/\n/g, " "));
  bien("muestra a quien ganó sin completar el Nivel Cero", /No completó el Nivel Cero · 2 de 5 clases/.test(eyt));
  plazo = await page.locator("section.bloque").last().innerText();
  bien("cuenta los resultados nuevos", /3\s*ganaron/.test(plazo) && /0\s*esperando resultados/.test(plazo), plazo.replace(/\n/g, " "));
  await page.click('.cz[data-g="sin"]');
  await espera(150);
  bien("filtra a quienes ganaron sin las 5 clases", (await page.locator(".fila.gan").count()) === 1 && /Carmen Rosa/i.test(await page.locator(".fila.gan").innerText()));
  await page.click('.cz[data-g="sin"]');
  await page.screenshot({ path: "/tmp/n0-9-empiece-ya-pb21.png", fullPage: true });

  /* 9 · editar y borrar una clase */
  await page.click('button.tab[data-tab="asistencia"]');
  await espera(150);
  bien("vuelve a la clase que estaba abierta", /Miércoles 21 de octubre/.test(await page.locator(".cab-clase").innerText()));
  await page.click("text=Editar o borrar la clase");
  await espera(200);
  bien("abre la edición con su hora", (await page.locator("#chipsHora .chip.on").innerText()).toLowerCase() === "4:00 p. m.");
  await page.fill("#fTema", "Demostración");
  await page.click("text=Guardar");
  await espera(400);
  bien("guarda el tema", /Demostración/.test(await page.locator(".cab-clase").innerText()));
  await page.click("text=Editar o borrar la clase");
  await espera(150);
  await page.click("text=Borrar esta clase");
  await espera(150);
  bien("pide confirmación", /¿Seguro\?/.test(await page.locator(".modal").innerText()));
  await page.click("text=Sí, borrar");
  await espera(500);
  bien("borra y vuelve a la lista", (await page.locator(".modal").count()) === 0 && !(await page.locator(".cab-clase").count()));
  bien("la clase ya no está", !st.clases.find(c => c.fecha === HOY && !c.borrada));

  /* 10 · nueva clase otro día con hora propia */
  await page.click("text=Otra hora u otro día");
  await espera(150);
  await page.fill("#fFecha", "2026-10-18");
  await page.dispatchEvent("#fFecha", "change");
  await espera(100);
  bien("domingo sin hora propuesta", (await page.locator("#chipsHora .chip.on").count()) === 0);
  await page.click("text=Crear y tomar asistencia");
  await espera(200);
  bien("pide la hora", /Elige la hora/.test(await page.locator(".modal").innerText()));
  await page.click('#chipsHora >> text=Otra hora');
  await page.fill("#fHora", "11:00");
  await page.click('.modal .chip[data-t="evento"]');
  await page.click("text=Crear y tomar asistencia");
  await espera(500);
  bien("crea el evento", /Domingo 18 de octubre/.test(await txt()) && /Evento/i.test(await page.locator(".cab-clase").innerText()) && /11:00 a\. m\./.test(await page.locator(".cab-clase").innerText()));

  /* 11 · ancho en celular chico */
  for (const w of [390, 360]) {
    await page.setViewportSize({ width: w, height: 800 });
    const caben = await page.evaluate(() => { const n = document.querySelector("nav.tabs"); return [n.scrollWidth, n.clientWidth]; });
    bien("caben las 5 pestañas a " + w + "px", caben[0] <= caben[1], caben.join(" / "));
    for (const t of ["asistencia", "inscritos", "botellas", "ey", "numeros"]) {
      await page.click('button.tab[data-tab="' + t + '"]');
      await espera(120);
      const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
      bien("sin scroll horizontal " + w + "px · " + t, ancho <= w, ancho);
    }
  }

  /* 12 · sesión vencida */
  st.token = "otro";
  await page.click('button[data-a="recargar"]');
  await espera(500);
  bien("sesión vencida vuelve al ingreso", await page.locator("#clave").isVisible() && /Tu sesión se cerró/.test(await txt()));
  bien("borra el token guardado", (await page.evaluate(() => localStorage.getItem("n0-token"))) === null);

  bien("sin errores en la consola", errores.length === 0, errores.slice(0, 3).join(" | "));
  await nav.close();
  console.log("\n" + (fallas ? fallas + " FALLAS" : "TODO OK") + " · llamadas al servidor: " + st.llamadas.length);
  process.exit(fallas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
