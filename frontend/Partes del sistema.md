3. Gestión de Repartidores
- ver el tema de cuando se vence la licencia, seguro y cedula.

Para implementar la verificación y edición del vencimiento de la **Licencia**, **Seguro** y **Cédula** desde el rol de Administrador, el Backend necesita exponer dos cosas clave:

1. **Incluir las fechas de vencimiento** (`fecha_vencimiento_licencia`, `fecha_vencimiento_seguro`, `fecha_vencimiento_cedula`) en las consultas que devuelven repartidores o vehículos.
2. **Crear un endpoint en el Backend** para que el Administrador pueda actualizar o cargar estas fechas directamente desde la interfaz.

---

### Paso 1: Actualizar la consulta en el Service del Backend

En el servicio que lista los repartidores (o en la consulta donde obtienes los vehículos de los repartidores para el panel Admin), asegurate de incluir los campos de vencimiento de la tabla `vehiculos_repartidor`.

En tu archivo donde tengas la consulta de repartidores/vehículos para Admin, la consulta SQL a `vehiculos_repartidor` debe seleccionar:

```sql
SELECT 
  v.id,
  v.IDrepartidor,
  v.IDtipo_vehiculo,
  v.marca,
  v.modelo,
  v.anio,
  v.patente,
  v.seguro_vigente,
  v.licencia_vigente,
  v.cedula_url,
  v.seguro_url,
  v.licencia_url,
  v.fecha_vencimiento_licencia,
  v.fecha_vencimiento_seguro,
  v.fecha_vencimiento_cedula,
  v.estado,
  v.motivo_rechazo,
  v.activo
FROM vehiculos_repartidor v

```

Y podés aprovechar el Helper reutilizable que ya tenés en `admin.service.js` para retornar el estado computado en la respuesta:

```javascript
// admin.service.js
export const evaluarEstadoDocumentacion = (vehiculo) => {
  const hoy = new Date();
  
  const licenciaVencida = vehiculo.fecha_vencimiento_licencia 
    ? new Date(vehiculo.fecha_vencimiento_licencia) < hoy 
    : false;

  const seguroVencido = vehiculo.fecha_vencimiento_seguro 
    ? new Date(vehiculo.fecha_vencimiento_seguro) < hoy 
    : false;

  const cedulaVencida = vehiculo.fecha_vencimiento_cedula 
    ? new Date(vehiculo.fecha_vencimiento_cedula) < hoy 
    : false;

  const tieneDocumentosVencidos = licenciaVencida || seguroVencido || cedulaVencida;

  return {
    licenciaVencida,
    seguroVencido,
    cedulaVencida,
    documentacionValida: !tieneDocumentosVencidos
  };
};

```

---

### Paso 2: Crear el servicio para actualizar vencimientos

Agregá esta función en tu servicio del Backend (ej. `admin.service.js` o `repartidores.service.js`):

```javascript
// Actualizar fechas de vencimiento de un vehículo por parte del Admin
export const actualizarVencimientosVehiculoService = async (vehiculoId, fechas) => {
  const {
    fecha_vencimiento_licencia,
    fecha_vencimiento_seguro,
    fecha_vencimiento_cedula
  } = fechas;

  await pool.query(
    `
    UPDATE vehiculos_repartidor
    SET 
      fecha_vencimiento_licencia = ?,
      fecha_vencimiento_seguro = ?,
      fecha_vencimiento_cedula = ?
    WHERE id = ?
    `,
    [
      fecha_vencimiento_licencia || null,
      fecha_vencimiento_seguro || null,
      fecha_vencimiento_cedula || null,
      vehiculoId
    ]
  );

  return { message: 'Fechas de vencimiento actualizadas correctamente.' };
};

```

---

### Paso 3: Agregar el Controlador

En `admin.controller.js` agregá:

```javascript
export const actualizarVencimientosVehiculo = async (req, res) => {
  try {
    const { id } = req.params; // ID del vehículo
    const resultado = await actualizarVencimientosVehiculoService(id, req.body);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

```

---

### Paso 4: Registrar la ruta administrativa

En `admin.routes.js`, vinculá el nuevo endpoint (asegurándote de que tenga los middlewares de autenticación de Admin):

```javascript
router.put('/vehiculos/:id/vencimientos', actualizarVencimientosVehiculo);

```

---

### Resumen de lo que debemos hacer a continuación:

1. Revisa o agrega estos métodos en tu **Backend** (Service, Controller y Routes).
2. Una vez listo el Backend, agregaremos la función API en `adminService.js` del cliente React y adaptaremos la interfaz en `PanelAdministrador_2.jsx` para mostrar alertas visuales (badges de *"Vencido"* / *"Vigente"*) e incorporar inputs de fecha (`<input type="date">`) dentro del modal del vehículo para que el Admin pueda editar las fechas.
