
(() => {
  "use strict";

  const CLAVE = "lector_escolar_registro_v2";
  const idsPermitidos = new Set([1, 2, 3, 4]);
  const letras = ["A", "B", "C", "D"];
  const TIEMPO_CONFIRMACION = 1000;

  let pregunta = 1;
  let registros = {};
  let candidatos = new Map();

  try {
    registros = JSON.parse(localStorage.getItem(CLAVE) || "{}");
  } catch (e) {
    registros = {};
  }

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(registros));
      return true;
    } catch (e) {
      alert("No se pudo guardar. Revisa el almacenamiento.");
      return false;
    }
  }

  const panel = document.createElement("section");
  panel.className = "card noprint";
  panel.innerHTML = `
    <h2>Registro de respuestas - V2</h2>
    <p>Las respuestas se confirman tras 1 segundo estable.</p>
    <label>Pregunta:
      <input id="reg-pregunta" type="number"
        min="1" max="200" value="1"
        style="width:75px;padding:9px">
    </label>
    <p id="reg-estado">Preparando registro...</p>
    <table>
      <thead>
        <tr>
          <th>Tarjeta</th>
          <th>Respuesta guardada</th>
          <th>Corregir</th>
        </tr>
      </thead>
      <tbody id="reg-tabla"></tbody>
    </table>
    <p>
      <button id="reg-csv">Exportar CSV</button>
      <button id="reg-borrar" style="background:#a33434">
        Borrar pregunta actual
      </button>
    </p>
    <small>
      Los datos se guardan únicamente en este navegador.
      No borres los datos de Chrome antes de exportarlos.
    </small>
  `;

  const zona = document.querySelector("#results");
  const tarjeta = zona && zona.closest(".card");

  if (!tarjeta) {
    console.error("No se encontró la tabla del lector.");
    return;
  }

  tarjeta.insertAdjacentElement("afterend", panel);

  const campo = document.getElementById("reg-pregunta");
  const tabla = document.getElementById("reg-tabla");
  const estado = document.getElementById("reg-estado");

  function claveRegistro(id) {
    return pregunta + ":" + id;
  }

  function actualizarTabla() {
    tabla.replaceChildren();
    let total = 0;

    for (const id of idsPermitidos) {
      const clave = claveRegistro(id);
      const valor = registros[clave] || "";
      if (valor) total++;

      const fila = document.createElement("tr");

      const numero = document.createElement("td");
      numero.textContent = id;

      const respuesta = document.createElement("td");
      respuesta.textContent = valor || "Pendiente";

      const correccion = document.createElement("td");
      const selector = document.createElement("select");

      ["", ...letras].forEach(letra => {
        const opcion = document.createElement("option");
        opcion.value = letra;
        opcion.textContent = letra || "Sin respuesta";
        selector.appendChild(opcion);
      });

      selector.value = valor;
      selector.addEventListener("change", () => {
        if (selector.value) {
          registros[clave] = selector.value;
        } else {
          delete registros[clave];
        }
        candidatos.delete(id);
        guardar();
        actualizarTabla();
      });

      correccion.appendChild(selector);
      fila.append(numero, respuesta, correccion);
      tabla.appendChild(fila);
    }

    estado.textContent =
      "Pregunta " + pregunta + ": " + total +
      " de 4 respuestas guardadas";
  }

  campo.addEventListener("change", () => {
    const numero = Number(campo.value);
    pregunta = Number.isInteger(numero)
      ? Math.max(1, Math.min(200, numero))
      : 1;
    campo.value = pregunta;
    candidatos.clear();
    actualizarTabla();
  });

  function leerTarjetas() {
    const visibles = new Map();

    document.querySelectorAll("#results tr").forEach(fila => {
      const celdas = fila.querySelectorAll("td");
      if (celdas.length !== 2) return;

      const id = Number(celdas[0].textContent.trim());
      const respuesta = celdas[1].textContent.trim();

      if (idsPermitidos.has(id) && letras.includes(respuesta)) {
        visibles.set(id, respuesta);
      }
    });

    const ahora = Date.now();
    let huboCambios = false;

    for (const [id, respuesta] of visibles) {
      const clave = claveRegistro(id);

      if (registros[clave]) {
        candidatos.delete(id);
        continue;
      }

      const anterior = candidatos.get(id);

      if (!anterior || anterior.respuesta !== respuesta) {
        candidatos.set(id, {
          respuesta: respuesta,
          desde: ahora
        });
      } else if (ahora - anterior.desde >= TIEMPO_CONFIRMACION) {
        registros[clave] = respuesta;
        candidatos.delete(id);
        huboCambios = true;
      }
    }

    for (const id of candidatos.keys()) {
      if (!visibles.has(id)) candidatos.delete(id);
    }

    if (huboCambios && guardar()) actualizarTabla();
  }

  setInterval(leerTarjetas, 200);

  document.getElementById("reg-borrar").onclick = () => {
    if (!confirm("¿Borrar las respuestas de la pregunta " +
      pregunta + "?")) return;

    for (const id of idsPermitidos) {
      delete registros[claveRegistro(id)];
    }

    candidatos.clear();
    guardar();
    actualizarTabla();
  };

  document.getElementById("reg-csv").onclick = () => {
    const filas = [
      ["Pregunta", "Tarjeta", "Respuesta"]
    ];

    Object.entries(registros).forEach(([clave, respuesta]) => {
      const [numero, id] = clave.split(":");
      filas.push([Number(numero), Number(id), respuesta]);
    });

    filas.splice(1, filas.length - 1,
      ...filas.slice(1).sort((a, b) =>
        a[0] - b[0] || a[1] - b[1]
      )
    );

    const contenido = "\uFEFF" +
      filas.map(f => f.join(",")).join("\r\n");

    const archivo = new Blob([contenido], {
      type: "text/csv;charset=utf-8"
    });

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "respuestas_lector_escolar.csv";
    enlace.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  actualizarTabla();
})();
