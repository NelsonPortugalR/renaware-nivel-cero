/* Prueba de comportamiento en Chromium real (Playwright).
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
let uid = 100;
function nuevoId() { return "00000000-0000-4000-8000-" + String(++uid).padStart(12, "0"); }

function estadoInicial() {
  const cfg = { clases_meta: 5, dias_plazo: 30, premio: "Botella de acero inoxidable",
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
                  ["2026-10-06", "09:30"], ["2026-10-07", "16:00"], ["2026-10-09", "16:30"], ["2026-10-14", "16:00"], ["2026-10-16", "16:30"], ["2026-10-20", "09:30"]];
  fechas.forEach(function (x, i) { clases.push({ id: "k" + i, fecha: x[0], hora: x[1], tema: i === 0 ? "Bienvenida" : null, tipo: "capacitacion", borrada: false }); });
  const asis = [];
  function marca(ins, ks) { ks.forEach(function (k) { asis.push({ clase: "k" + k, ins: ins, presente: true }); }); }
  marca("a", [5, 6, 7, 9]);              // 4 de 5, en curso
  marca("c", [0, 1]);                    // venció con 2
  marca("e", [0, 1, 2, 3, 4]);           // logró, botella entregada, ganó Empiece Ya
  marca("f", [1, 2, 3, 4, 5]);           // logró, botella por entregar
  marca("g", [0, 1, 2, 3, 4, 10]);       // logró, ganó Empiece Ya antes de recibir botella
  const ey = {
    "1769990": { fecha: "2026-10-14", anio: 2026, pb: 21, codigo: "1769990", premios: "Utensilio de 1.5L + Botella de Acero Inoxidable" },
    "1769733": { fecha: "2026-10-14", anio: 2026, pb: 21, codigo: "1769733", premios: "Utensilio de 1.5L + Botella de Acero Inoxidable" }
  };
  return { cfg, ins, estado, clases, asis, ey, token: "tok-valido", llamadas: [] };
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
    const eyr = codigo && st.ey[codigo] && st.ey[codigo].fecha >= addDays(inicio, -14) ? Object.assign({ por: "codigo" }, st.ey[codigo]) : null;
    return {
      id: p.id, origen: p.origen, nombre: p.nombre, celular: p.celular, dni: p.dni || null, afiliador: p.afiliador,
      fecha_inscripcion: p.fecha_inscripcion, estado_registro: p.estado_registro || null,
      inicio, inicio_editado: !!e.fecha_inicio, vence, codigo, codigo_editado: !!e.codigo_rw,
      excluido: !!e.excluido, nota: e.nota || null,
      botella_entregada_en: e.botella_entregada_en || null, ey_descontado_en: e.ey_descontado_en || null,
      asistencias: mias.map(c => ({ c: c.id, v: c.fecha >= inicio && c.fecha <= vence })),
      validas: val.length, total: mias.length,
      logro_fecha: val.length >= meta ? val[meta - 1].fecha : null,
      estado, ey: eyr
    };
  }
  function n(k) { return st.asis.filter(a => a.clase === k.id && a.presente).length; }
  function claseOut(k) { return { id: k.id, fecha: k.fecha, hora: k.hora, tema: k.tema, tipo: k.tipo, n: n(k) }; }
  function datos() {
    const vivas = st.clases.filter(c => !c.borrada);
    return {
      hoy: HOY, config: st.cfg,
      primera_clase: vivas.map(c => c.fecha).sort()[0] || null,
      ey_hasta: { fecha: "2026-10-14", anio: 2026, pb: 21, estado: "Oficial" },
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
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
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
  const wa = await page.locator('.fila.ins[data-id="b"] a.wa').getAttribute("href");
  bien("WhatsApp con mensaje armado", /^https:\/\/wa\.me\/51959333444\?text=/.test(wa) && /qu%C3%A9%20gusto|qué gusto/.test(decodeURIComponent(wa)) === true, wa);
  bien("mensaje con el plazo", /hasta el sábado 14 de noviembre/.test(decodeURIComponent(wa)), decodeURIComponent(wa));
  await page.click('button.chip[data-f="logro"]');
  await espera(150);
  await page.click('button.chip[data-f="todos"]');
  await espera(150);
  await page.screenshot({ path: "/tmp/n0-5-inscritos.png", fullPage: true });
  await page.click('button.chip[data-f="logro"]');
  await espera(150);
  await page.locator('.fila.ins[data-id="a"] .cuerpo').click();
  await espera(250);
  await page.screenshot({ path: "/tmp/n0-6-ficha.png" });
  const ficha = await page.locator(".modal").innerText();
  bien("ficha con su estado", /Logró el 21 oct/.test(ficha) && /5 de 5/.test(ficha), ficha.slice(0, 300));
  bien("ficha con su código y Empiece Ya", /1770001/.test(ficha) && /Aún no figura/.test(ficha));
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

  /* 7 · botellas */
  await page.click('button.tab[data-tab="botellas"]');
  await espera(200);
  const bot = await page.locator("main").innerText();
  bien("por entregar: Fanny", /Por entregar\s*1/i.test(bot) && /Fanny Quispe Chaucca/.test(bot), bot.slice(0, 400));
  bien("descontar: Elena", /Descontar en su Empiece Ya\s*1/i.test(bot) && /Elena Segunda/.test(bot));
  bien("viene con el Empiece Ya: Gloria", /Su botella viene con el Empiece Ya\s*1/i.test(bot) && /Gloria Maritza/.test(bot));
  bien("entregadas: Ana y Elena", /Entregadas\s*2/i.test(bot));
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
  bien("comparación con Empiece Ya", /Con Nivel Cero/.test(num) || /Todavía no hay a quién medir/.test(num));
  bien("tabla por mes", /oct 2026/.test(num) && /set 2026/.test(num) && /ago 2026/.test(num) && /1 sin seguimiento/.test(num));
  bien("horarios y afiliadores", /Asistencia por horario/i.test(num) && /Por quién los afilió/i.test(num));
  bien("explica a los sin seguimiento", /1 inscrito de antes del 23 set/.test(num), num.slice(-300));
  bien("enlaza al portal de Empiece Ya", (await page.locator('a[href="https://empiece-ya.nelson1614.workers.dev"]').count()) === 1);
  await page.screenshot({ path: "/tmp/n0-4-numeros.png", fullPage: true });

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
    for (const t of ["asistencia", "inscritos", "botellas", "numeros"]) {
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
