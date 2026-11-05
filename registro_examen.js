
(() => {
  "use strict";

  const CLAVE = "lector_escolar_examenes_respuestas_v1";
  const TOTAL = 34;
  const CONFIRMACION_MS = 1000;
  const letras = ["A", "B", "C", "D"];

  let datos = { activo: "", examenes: {} };
  let candidatos = new Map();
  let pregunta = 1;

  try {
    const guardado = JSON.parse(
      localStorage.getItem(CLAVE) || "null"
    );
    if (guardado &&
        typeof guardado.examenes === "object" &&
        guardado.examenes !== null &&
        !Array.isArray(guardado.examenes)) {
      datos = guardado;
    }
  } catch (e) {
    console.warn("No se pudo leer el registro anterior", e);
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch (e) {
      alert("No se pudo guardar. Exporta un respaldo.");
      return false;
    }
  }

  function examenActual() {
    return datos.examenes[datos.activo] || null;
  }

  const zona = document.querySelector("#results");
  const contenedor = zona && zona.closest(".card");

  if (!contenedor) {
    console.error("No se encontró el lector de tarjetas.");
    return;
  }

  const panel = document.createElement("section");
  panel.className = "card noprint";

  panel.innerHTML = `
    <h2>Registro independiente por examen - V3</h2>

    <label>Seleccionar examen</label>
    <select id="rex-examen"
      style="width:100%;padding:10px"></select>

    <p>
      <input id="rex-nombre"
        placeholder="Nombre del nuevo examen"
        maxlength="100"
        style="width:95%;padding:10px">
      <button id="rex-crear">Crear examen</button>
    </p>

    <label>Número de pregunta</label>
    <input id="rex-pregunta" type="number"
      min="1" max="200" value="1"
      style="width:85px;padding:10px">

    <p id="rex-estado">Preparando...</p>

    <table>
      <thead>
        <tr>
          <th>Tarjeta</th>
          <th>Respuesta guardada</th>
          <th>Corregir</th>
        </tr>
      </thead>
      <tbody id="rex-tabla"></tbody>
    </table>

    <p>
      <button id="rex-csv">
        Exportar CSV del examen
      </button>
      <button id="rex-respaldo">
        Respaldo de todos los exámenes
      </button>
    </p>

    <p>
      <button id="rex-borrar"
        style="background:#a33434">
        Borrar pregunta actual
      </button>
    </p>

    <small>
      Cada examen tiene sus propias respuestas.
      Los datos permanecen en este navegador.
      Exporta respaldos periódicamente.
    </small>
  `;

  contenedor.insertAdjacentElement("afterend", panel);

  const zonaFinalizar = document.createElement("div");
  zonaFinalizar.style.marginTop = "15px";

  zonaFinalizar.innerHTML = `
    <button id="rex-finalizar"
      style="background:#a33434">
      Finalizar examen
    </button>
    <p id="rex-cierre-estado"></p>
  `;

  panel.appendChild(zonaFinalizar);

  const $ = id => document.getElementById(id);

  function clave(id) {
    return pregunta + ":" + id;
  }

  function refrescarExamenes() {
    const selector = $("rex-examen");
    selector.replaceChildren();

    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = "Selecciona un examen";
    selector.appendChild(inicial);

    for (const [id, examen] of
         Object.entries(datos.examenes)) {
      const opcion = document.createElement("option");
      opcion.value = id;
      
opcion.textContent = examen.finalizado
  ? "🔒 FINALIZADO - " + examen.nombre
  : "🟢 ABIERTO - " + examen.nombre;

      selector.appendChild(opcion);
    }

    if (!examenActual()) datos.activo = "";
    selector.value = datos.activo;
    refrescarTabla();
  }

  function refrescarTabla() {
    const tabla = $("rex-tabla");
    tabla.replaceChildren();

    const examen = examenActual();
    const activo = Boolean(examen);

    $("rex-pregunta").disabled = !activo;
    $("rex-csv").disabled = !activo;
    
    const cerrado = Boolean(examen?.finalizado);

    $("rex-borrar").disabled = !activo || cerrado;
    $("rex-finalizar").disabled = !activo || cerrado;
    $("start").disabled = !activo || cerrado;

    $("rex-finalizar").textContent = cerrado
      ? "Examen finalizado"
      : "Finalizar examen";

    $("rex-cierre-estado").textContent = cerrado
      ? "Evaluación cerrada. Respuestas protegidas."
      : "Evaluación disponible para registrar respuestas.";


    if (!examen) {
      $("rex-estado").textContent =
        "Crea o selecciona un examen para comenzar.";
      return;
    }

    let total = 0;

    for (let id = 1; id <= TOTAL; id++) {
      const key = clave(id);
      const valor = examen.respuestas[key] || "";

      if (valor) total++;

      const fila = document.createElement("tr");

      const numero = document.createElement("td");
      numero.textContent = id;

      const respuesta = document.createElement("td");
      respuesta.textContent = valor || "Pendiente";

      const correccion = document.createElement("td");
      const selector = document.createElement("select");

      selector.style.padding = "7px";

      ["", ...letras].forEach(letra => {
        const opcion = document.createElement("option");
        opcion.value = letra;
        opcion.textContent = letra || "Sin respuesta";
        selector.appendChild(opcion);
      });

      selector.value = valor;
selector.disabled = Boolean(examen.finalizado);
      selector.onchange = () => {
        if (examen.finalizado) return;
        const anterior = examen.respuestas[key];

        if (selector.value) {
          examen.respuestas[key] = selector.value;
        } else {
          delete examen.respuestas[key];
        }

        if (!guardar()) {
          if (anterior) {
            examen.respuestas[key] = anterior;
          } else {
            delete examen.respuestas[key];
          }
        }

        candidatos.delete(id);
        refrescarTabla();
      };

      correccion.appendChild(selector);
      fila.append(numero, respuesta, correccion);
      tabla.appendChild(fila);
    }

    $("rex-estado").textContent =
      "Examen: " + examen.nombre +
      " | Pregunta " + pregunta +
      " | " + total + " de 34 respuestas guardadas";
  }

  $("rex-crear").onclick = () => {
    const nombre = $("rex-nombre").value.trim();

    if (!nombre) {
      alert("Escribe el nombre del examen.");
      return;
    }

    if (Object.values(datos.examenes)
      .some(e => e.nombre.toLowerCase() ===
                 nombre.toLowerCase())) {
      alert("Ya existe un examen con ese nombre.");
      return;
    }

    const id = "ex_" + Date.now() + "_" +
      Math.random().toString(36).slice(2, 8);

    datos.examenes[id] = {
      nombre: nombre,
      respuestas: {}
    };

    datos.activo = id;

    if (!guardar()) {
      delete datos.examenes[id];
      datos.activo = "";
      return;
    }

    pregunta = 1;
    candidatos.clear();
    $("rex-pregunta").value = 1;
    $("rex-nombre").value = "";

    refrescarExamenes();
  };

  $("rex-examen").onchange = e => {
    datos.activo = e.target.value;

    if (!guardar()) return;

    pregunta = 1;
    candidatos.clear();
    $("rex-pregunta").value = 1;
    refrescarTabla();
  };

  $("rex-pregunta").onchange = e => {
    const n = Number(e.target.value);

    pregunta = Number.isInteger(n)
      ? Math.max(1, Math.min(200, n))
      : 1;

    e.target.value = pregunta;
    candidatos.clear();
    refrescarTabla();
  };

  function leerTarjetas() { const video = document.getElementById("video");
const camaraActiva = video?.srcObject?.getVideoTracks()
  .some(t => t.readyState === "live");

if (!camaraActiva) {
  candidatos.clear();
  return;
}
    
    const examen = examenActual();

    if (!examen || examen.finalizado) {
      candidatos.clear();
      return;
    }


    const visibles = new Map();

    document.querySelectorAll("#results tr")
      .forEach(fila => {
        const celdas = fila.querySelectorAll("td");
        if (celdas.length !== 2) return;

        const id = Number(
          celdas[0].textContent.trim()
        );

        const respuesta =
          celdas[1].textContent.trim();

        if (Number.isInteger(id) &&
            id >= 1 && id <= TOTAL &&
            letras.includes(respuesta)) {
          visibles.set(id, respuesta);
        }
      });

    const ahora = Date.now();
    let cambios = false;

    for (const [id, respuesta] of visibles) {
      const key = clave(id);

      if (examen.respuestas[key]) {
        candidatos.delete(id);
        continue;
      }

      const anterior = candidatos.get(id);

      if (!anterior ||
          anterior.respuesta !== respuesta) {
        candidatos.set(id, {
          respuesta: respuesta,
          desde: ahora
        });
      } else if (
        ahora - anterior.desde >= CONFIRMACION_MS
      ) {
        examen.respuestas[key] = respuesta;
        candidatos.delete(id);
        cambios = true;
      }
    }

    for (const id of candidatos.keys()) {
      if (!visibles.has(id)) {
        candidatos.delete(id);
      }
    }

    if (cambios) {
      if (guardar()) {
        refrescarTabla();
      } else {
        alert("Error de guardado. Detén la lectura.");
      }
    }
  }

  setInterval(leerTarjetas, 200);

  $("rex-borrar").onclick = () => {
    const examen = examenActual();
    if (!examen || examen.finalizado) return;

    if (!confirm(
      "¿Borrar las respuestas de la pregunta " +
      pregunta + " del examen " + examen.nombre + "?"
    )) return;

    const respaldo = {...examen.respuestas};

    for (let id = 1; id <= TOTAL; id++) {
      delete examen.respuestas[clave(id)];
    }

    if (!guardar()) {
      examen.respuestas = respaldo;
    }

    candidatos.clear();
    refrescarTabla();
  };

  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], {
      type: tipo
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  $("rex-csv").onclick = () => {
    const examen = examenActual();
    if (!examen) return;

    const filas = [
      ["Pregunta", "Tarjeta", "Respuesta"]
    ];

    for (const [key, respuesta] of
         Object.entries(examen.respuestas)) {
      const [numero, tarjeta] =
        key.split(":").map(Number);

      filas.push([numero, tarjeta, respuesta]);
    }

    const datosCSV = filas.slice(1).sort(
      (a, b) => a[0] - b[0] || a[1] - b[1]
    );

    function csvValor(v) {
      return '"' + String(v)
        .replace(/"/g, '""') + '"';
    }

    const contenido = "\uFEFF" +
      [filas[0], ...datosCSV]
        .map(f => f.join(","))
        .join("\r\n");

    descargar(
      "respuestas_examen_" +
        datos.activo + ".csv",
      contenido,
      "text/csv;charset=utf-8"
    );
  };

  $("rex-respaldo").onclick = () => {
    descargar(
      "respaldo_respuestas_examenes.json",
      JSON.stringify(datos, null, 2),
      "application/json"
    );
  };

  // MISION 28: IMPORTAR EXAMEN DESDE CHROMEBOOK

  const bloqueImportar = document.createElement("div");
  bloqueImportar.style.cssText =
    "border:2px solid #164f91;padding:14px;" +
    "border-radius:10px;margin-bottom:15px";

  bloqueImportar.innerHTML = `
    <h3>Importar examen desde Chromebook</h3>
    <p>Selecciona el archivo JSON exportado
    desde el administrador de exámenes.</p>
    <input type="file" id="rex-importar"
      accept=".json,application/json"
      style="max-width:100%">
    <p id="rex-importar-estado"></p>
  `;

  panel.prepend(bloqueImportar);

  $("rex-importar").addEventListener(
    "change", async evento => {

    const archivo = evento.target.files[0];
    if (!archivo) return;

    try {
      const nuevo = JSON.parse(await archivo.text());

      if (
        !nuevo ||
        typeof nuevo.id !== "string" ||
        !nuevo.id.trim() ||
        typeof nuevo.nombre !== "string" ||
        !nuevo.nombre.trim() ||
        !Array.isArray(nuevo.preguntas) ||
        nuevo.preguntas.length < 1 ||
        nuevo.preguntas.length > 200
      ) {
        throw Error("El archivo no es un examen válido.");
      }

      const camposValidos = [
        "Lenguajes",
        "Saberes y Pensamiento Científico",
        "Ética, Naturaleza y Sociedades",
        "De lo Humano y lo Comunitario"
      ];

      for (const p of nuevo.preguntas) {
        if (
          !p ||
          !camposValidos.includes(p.campo) ||
          !["A","B","C","D"].includes(p.correcta) ||
          typeof p.enunciado !== "string" ||
          !p.enunciado.trim() ||
          !p.opciones ||
          ["A","B","C","D"].some(
            letra =>
              typeof p.opciones[letra] !== "string" ||
              !p.opciones[letra].trim()
          )
        ) {
          throw Error(
            "El examen contiene preguntas inválidas."
          );
        }
      }

      const id = "importado_" + nuevo.id;

      if (datos.examenes[id]) {
        datos.activo = id;
        pregunta = 1;
        candidatos.clear();
        $("rex-pregunta").value = 1;
        guardar();
        refrescarExamenes();

        $("rex-importar-estado").textContent =
          "Este examen ya estaba importado. " +
          "Se conservaron sus respuestas.";
        return;
      }

      const activoAnterior = datos.activo;

      datos.examenes[id] = {
        nombre: nuevo.nombre,
        origenId: nuevo.id,
        preguntas: nuevo.preguntas,
        respuestas: {}
      };

      datos.activo = id;

      if (!guardar()) {
        delete datos.examenes[id];
        datos.activo = activoAnterior;
        throw Error("No se pudo guardar el examen.");
      }

      pregunta = 1;
      candidatos.clear();
      $("rex-pregunta").value = 1;

      refrescarExamenes();

      $("rex-importar-estado").textContent =
        "Examen importado: " + nuevo.nombre +
        " | Preguntas: " + nuevo.preguntas.length;

    } catch (error) {
      $("rex-importar-estado").textContent =
        "Error: " + error.message;
    } finally {
      evento.target.value = "";
    }
  });

  // MISION 30: PREGUNTAS Y NAVEGACION

  const vista = document.createElement("div");
  vista.style.cssText =
    "background:#eef4ff;padding:15px;" +
    "border-radius:12px;margin:15px 0";

  panel.prepend(vista);

  function mostrarPregunta() {
    vista.replaceChildren();

    const examen = examenActual();
    if (!examen) {
      vista.textContent = "Selecciona un examen.";
      return;
    }

    const preguntas = examen.preguntas;

    if (!Array.isArray(preguntas) ||
        preguntas.length === 0) {
      vista.textContent =
        "Este examen no tiene preguntas importadas.";
      return;
    }

    const titulo = document.createElement("h3");
    titulo.textContent = examen.nombre;
    vista.appendChild(titulo);

    const numero = document.createElement("p");
    numero.textContent =
      "Pregunta " + pregunta +
      " de " + preguntas.length;
    vista.appendChild(numero);

    const p = preguntas[pregunta - 1];

    if (p) {
      const campo = document.createElement("small");
      campo.textContent = p.campo;
      vista.appendChild(campo);

      const enunciado = document.createElement("h3");
      enunciado.textContent = p.enunciado;
      vista.appendChild(enunciado);

      for (const letra of ["A","B","C","D"]) {
        const opcion = document.createElement("p");
        opcion.textContent =
          letra + ") " + p.opciones[letra];
        vista.appendChild(opcion);
      }
    } else {
      const aviso = document.createElement("p");
      aviso.textContent =
        "Selecciona una pregunta válida del examen.";
      vista.appendChild(aviso);
    }

    const anterior = document.createElement("button");
    anterior.textContent = "← Anterior";
    anterior.disabled = pregunta <= 1;

    const siguiente = document.createElement("button");
    siguiente.textContent = "Siguiente →";
    siguiente.disabled = pregunta >= preguntas.length;

    function cambiarPregunta(nuevoNumero) {
      // Detener la cámara antes de cambiar de reactivo
      document.getElementById("stop")?.click();

      const entrada = $("rex-pregunta");
      entrada.value = nuevoNumero;
      entrada.dispatchEvent(new Event("change"));
    }

    anterior.onclick = () =>
      cambiarPregunta(pregunta - 1);

    siguiente.onclick = () =>
      cambiarPregunta(pregunta + 1);

    vista.append(anterior, siguiente);
  }

  // Actualizar la vista cuando cambian las respuestas,
  // el examen seleccionado o la pregunta.

  const observador = new MutationObserver(() => {
    mostrarPregunta();
  });

  observador.observe($("rex-estado"), {
    childList: true,
    characterData: true,
    subtree: true
  });

  mostrarPregunta();

  // MISION 34: FINALIZAR EXAMEN

  $("rex-finalizar").onclick = () => {
    const examen = examenActual();

    if (!examen || examen.finalizado) return;

    const confirmar = confirm(
      "¿Finalizar el examen " + examen.nombre +
      "?\n\nSe bloquearán las respuestas y " +
      "no podrás modificarlas desde este lector."
    );

    if (!confirmar) return;

    // Detener la cámara
    $("stop").click();
    candidatos.clear();

    // Marcar el examen como finalizado
    examen.finalizado = new Date().toISOString();

    if (!guardar()) {
      delete examen.finalizado;
      refrescarTabla();
      alert("No se pudo finalizar. Intenta nuevamente.");
      return;
    }

    refrescarTabla();

    alert(
      "Examen finalizado correctamente.\n" +
      "Exporta el CSV y el respaldo JSON."
    );
  };

  refrescarExamenes();
})();
