const express = require("express");
const wppconnect = require("@wppconnect-team/wppconnect");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001", // Reemplaza con la URL de tu front-end
    methods: ["GET", "POST"],
  },
});

app.use(bodyParser.json());
app.use(cors());
let client;
let datosAPI = [];

async function consumir_api(codigo) {
  const datos = new FormData();
  datos.append("codigo", codigo);
  const config = {
    method: "GET",
  };
  const respuesta = await fetch(
    `https://multilaptops.net/api/productosdisp?token=j6UWgtktboQBFD4G`,
    config
  );
  const data = await respuesta.json();
  await aplanar(data.datos);
}

async function aplanar(productos) {
  let datosFinal = [];
  for (let key in productos) {
    let producto = productos[key];
    let obj = {
      id_producto: producto.id_producto,
      cantidad: producto.cantidad,
      descripcion_producto: producto.descripcion_producto,
      nombre_linea: producto.nombre_linea,
      nombre_marca: producto.nombre_marca,
      nombre_modelo: producto.nombre_modelo,
      nombre_subcategoria: producto.nombre_subcategoria,
      referencia_producto: producto.referencia_producto,
      titulo_categoria: producto.titulo_categoria,
      titulo_departamento: producto.titulo_departamento,
      valor_precio: producto.costo_avg,
      simbolo_moneda: producto.simbolo_moneda,
      ruta_img: producto.imagenes[0]?.ruta_img || null,
    };

    for (let espKey in producto.especificacion) {
      let especificacion = producto.especificacion[espKey];
      let textoSinEspacios = especificacion.cualidad.split(" ").join("");
      let textoSinParentesis = textoSinEspacios.replace(/[()]/g, "");
      obj[textoSinParentesis] = especificacion.referencia_esp;
    }

    datosFinal.push(obj);
  }

  datosAPI = datosFinal;
  console.log(datosAPI);
  return datosFinal;
}

// Crear una sesión de WPPConnect
wppconnect
  .create({
    session: "sessionName",
    headless: false,
    useChrome: true,
  })
  .then((newClient) => {
    client = newClient;
    start(client);
  })
  .catch((error) => {
    console.log(error);
  });

function start(client) {
  client.onMessage(async (message) => {
    console.log("contacto", message.from);
    console.log("mensaje", message.body);
    console.log("Nombre", message.notifyName);

    // Emitir evento de nuevo mensaje
    io.emit("new_message", {
      from: message.from,
      body: message.body,
      notifyName: message.notifyName,
    });
  });
}

app.post("/send-message", async (req, res) => {
  const { number, action, data } = req.body;
  console.log(number, action, data);
  try {
    switch (action) {
      case "promocion":
        await promocionFlow(number);
        break;
      case "producto":
        await reenviaProductoSKU(data, false, number);
        break;
      case "ubicacion":
        await reenviarUbicacion(number);
        break;
      case "procesoCompra":
        await reenviarProcesoCompra(number);
        break;
      case "formasPago":
        await reenviarFormasPago(number);
        break;
      case "chatGPT":
        await asistenteGPT(number);
        break;
      default:
        res.send({ status: "error", error: "Acción no válida" });
        return;
    }
    res.send({ status: "success" });
  } catch (error) {
    res.send({ status: "error", error });
  }
});

server.listen(3000, () => {
  console.log("Server is running on port 3000");
});

async function promocionFlow(contactId) {
  const contact = `591${contactId}@c.us`;

  await client.sendText(
    contact,
    `¡Compra ahora! No dejes que se agoten las existencias.`
  );

  const imagen1 =
    "https://multilaptops.net/recursos/imagenes/productos/banner/301744/2078365941.jpg";
  const productoTexto1 = [
    `👉🏻 Revisa nuestra tienda y descubre imágenes en alta resolución de este increíble equipo.`,
    ``,
    `*Samsung 100205* Intel Core i5-1235U 4,40 Ghz, 10-cores, 12a Gen. RAM 8GB/512GB SSD NVMe, 15,6 IPS FULLHD, Win11 Original, Español, Metálico`,
    ``,
    `💸 Bs. 5200.00 - Solo hasta agotar stock`,
    `🔗 Consíguelo aquí: https://multilaptops.net/producto/100205?t=wab&mkt=siat`,
  ].join("\n");
  await client.sendImage(contact, imagen1, "Samsung 100205", productoTexto1);
}

async function reenviaProductoSKU(data, isReflow, contactId) {
  const array = data.split(",");
  const contact = `591${contactId}@c.us`;

  for (const elemento of array) {
    let datosproducto = await producto(elemento);
    if (datosproducto) {
      if (!datosproducto.ruta_img) {
        await client.sendText(
          contact,
          `
-----------------------------------
*Código SKU:* ${datosproducto.id_producto}
*Producto:* ${datosproducto.nombre_marca} ${datosproducto.nombre_linea}
*Procesador:* ${datosproducto.Procesador}
*Memoria RAM:* ${datosproducto.MemoriaRAM}
*Almacenamiento:* ${datosproducto.UnidaddeestadosolidoSSD}
*Pantalla:* ${datosproducto.Pantalla}
*Gráficos:* ${datosproducto.Gráficos}
-----------------------------------
*Precio:* Actualizado solo en la Web ⬇️ 
*Más detalles:* https://multilaptops.net/producto/${datosproducto.id_producto}
-----------------------------------`
        );
      } else {
        const fotoProdeuctoUno = `https://multilaptops.net/${datosproducto.ruta_img}`;
        await client.sendImage(
          contact,
          fotoProdeuctoUno,
          "Producto",
          `
-----------------------------------
*Código SKU:* ${datosproducto.id_producto}
*Producto:* ${datosproducto.nombre_marca} ${datosproducto.nombre_linea}
*Procesador:* ${datosproducto.Procesador}
*Memoria RAM:* ${datosproducto.MemoriaRAM}
*Almacenamiento:* ${datosproducto.UnidaddeestadosolidoSSD}
*Pantalla:* ${datosproducto.Pantalla}
*Gráficos:* ${datosproducto.Gráficos}
-----------------------------------
*Precio:* Actualizado solo en la Web ⬇️ 
*Más detalles:* https://multilaptops.net/producto/${datosproducto.id_producto}
-----------------------------------`
        );
      }
    }
  }
}

async function reenviarUbicacion(contactId) {
  const contact = `591${contactId}@c.us`;
  const imagen =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/mapa-uyustus2.webp";
  const texto = [
    `👉 Visítanos en *Multilaptops* - Ubicados en Calle Uyustus #990 (Esquina Calatayud, primera casa bajando por la acera izquierda), La Paz - Bolivia`,
    ``,
    `▸ Atendemos con cita previa de lunes a sábado.`,
    `▸ Durante feriados y días festivos, solo atendemos compras previamente confirmadas.`,
    ``,
    `Encuentra nuestra ubicación aquí: https://goo.gl/maps/g3gX5UsfrCkL2r7g8`,
    ``,
    `🚩 Recuerda agendar tu visita para una mejor atención. ¡Te esperamos con gusto! 😊`,
  ].join("\n");
  await client.sendImage(contact, imagen, "Ubicación", texto);
}

async function reenviarProcesoCompra(contactId) {
  const contact = `591${contactId}@c.us`;

  await client.sendText(contact, `*¿Como comprar en Multilaptops?* 🛒💻`);
  await client.sendText(
    contact,
    [
      `Comprar en Multilaptops es fácil, cómodo y rápido: olvídate de los bloqueos, marchas y tráfico. `,
      ``,
      `Nuestra tienda en línea multi.bz está abierta 24/7 🕒, permitiéndote explorar, realizar tus pedidos, compras y reservas a cualquier hora y desde cualquier lugar. 📦🛍️`,
    ].join("\n")
  );

  const imagen1 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/procesocompra-2/1.webp";
  const texto1 = [
    `▸ Elige el producto que deseas comprar`,
    `▸ Envíanos el código SKU del producto elegido`,
  ].join("\n");
  await client.sendImage(contact, imagen1, "Paso 1", texto1);
  const imagen2 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/procesocompra-2/2.webp";
  const texto2 = [
    `Comprueba la disponibilidad del producto:`,
    ``,
    `✅ Disponible`,
    `🔜 Preorden`,
    `💻 Exclusivo online`,
    `🚚 En tránsito`,
  ].join("\n");
  await client.sendImage(contact, imagen2, "Paso 2", texto2);

  const imagen3 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/procesocompra-2/3.webp";
  const texto3 = [
    `Rellena el formulario con tus datos personales: nombre completo, número de identificación y número de celular. 📝`,
  ].join("\n");
  await client.sendImage(contact, imagen3, "Paso 3", texto3);

  const imagen4 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/procesocompra-2/4.2.webp";
  const texto4 = [
    `Selecciona tu método de entrega preferido:`,
    ``,
    `✈️ *Envío nacional*: Si te encuentras en otro departamento o ciudad, elige esta opción y te lo enviaremos.`,
  ].join("\n");
  await client.sendImage(contact, imagen4, "Paso 4.2", texto4);
}

async function reenviarFormasPago(contactId) {
  const contact = `591${contactId}@c.us`;

  await client.sendText(contact, `*¿Como pagar en Multilaptops?* 🛒💻`);
  await client.sendText(
    contact,
    [
      `Puedes realizar el pago de tus compras con 💳 diferentes medios y combinarlos en caso de que lo requieras 🛍️ `,
    ].join("\n")
  );

  const imagen1 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/formaspago/1.webp";
  const texto1 = [
    ``,
    `*Transferencia bancaria:*`,
    `▸ Seleccionando este medio de pago se desplegará toda la información con las cuentas habilitadas.`,
    `▸ Una vez realizado la transferencia, debe subir el comprobante de pago.`,
  ].join("\n");
  await client.sendImage(contact, imagen1, "Transferencia", texto1);

  const imagen2 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/formaspago/2.webp";
  const texto2 = [
    ``,
    `*Tarjeta de débito/crédito:* `,
    `▸ Para realizar el pago mediante este medio debe tener habilitado su tarjeta para compras por internet y configurar los parámetros de importe máximo en la aplicación de su banco.`,
    `▸ Utilizar este método de pago aplica un cargo adicional del 2% sobre el valor total.`,
  ].join("\n");
  await client.sendImage(contact, imagen2, "Tarjeta", texto2);

  const imagen3 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/formaspago/3.webp";
  const texto3 = [``, `*QR:* `, `▸ Paga con QR de forma fácil y rápida`].join(
    "\n"
  );
  await client.sendImage(contact, imagen3, "QR", texto3);

  const imagen4 =
    "https://multilaptops.net/recursos/imagenes/tiendaonline/formaspago/4.webp";
  const texto4 = [
    ``,
    `*Efectivo:*`,
    `▸ Los pagos en efectivo se realizan de forma presencial al momento de entrega del pedido en su domicilio o del retiro en tienda de acuerdo a lo programado.`,
    `▸  Puede pagar en las siguientes monedas: dólares americanos USD, moneda nacional Bolivianos BOB.`,
  ].join("\n");
  await client.sendImage(contact, imagen4, "Efectivo", texto4);
}

async function asistenteGPT(contactId) {
  const contact = `591${contactId}@c.us`;
  await client.sendText(contact, `Hola soy tu asistente virtual`);
}

function producto(codigo) {
  return datosAPI.find((elemento) => elemento.id_producto === codigo);
}

consumir_api(777);
