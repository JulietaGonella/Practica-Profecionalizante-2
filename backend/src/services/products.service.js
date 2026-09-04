import { pool } from '../config/db.js';

// Helper para obtener las opciones y grupos de un producto
const obtenerOpcionesProducto = async (productoId) => {
  const [grupos] = await pool.query(
    `SELECT id, nombre, min_seleccion, max_seleccion, obligatorio, permitir_cantidad
     FROM grupos_opciones
     WHERE producto_id = ?`,
    [productoId]
  );

  for (const grupo of grupos) {
    const [opciones] = await pool.query(
      `SELECT id, nombre, precio_adicional, disponible
       FROM opciones_producto
       WHERE grupo_id = ?`,
      [grupo.id]
    );
    grupo.opciones = opciones;
  }

  return grupos;
};

export const createProductService = async (data, userId) => {
  const {
    nombre,
    precio,
    disponible,
    tiempo_preparacion_min,
    IDcategoria,
    IDcategoria_comercial,
    imagen_url, // 👈 Nuevo campo
    ingredientes,
    grupos_opciones
  } = data;

  if (!nombre || precio === undefined || !IDcategoria) {
    throw new Error('Faltan campos obligatorios (nombre, precio, IDcategoria)');
  }

  const [categoriaExiste] = await pool.query(
    `SELECT id FROM categorias_productos WHERE id = ?`,
    [IDcategoria]
  );

  if (categoriaExiste.length === 0) {
    throw new Error('La categoría técnica especificada no existe en el sistema');
  }

  if (IDcategoria_comercial) {
    const [categoriaComercialExiste] = await pool.query(
      `SELECT id FROM categorias_comerciales WHERE id = ?`,
      [IDcategoria_comercial]
    );
    if (categoriaComercialExiste.length === 0) {
      throw new Error('La categoría comercial especificada no existe en el sistema');
    }
  }

  if (isNaN(precio) || Number(precio) <= 0) {
    throw new Error('El precio del producto debe ser mayor a 0');
  }

  if (tiempo_preparacion_min !== undefined && (isNaN(tiempo_preparacion_min) || Number(tiempo_preparacion_min) <= 0)) {
    throw new Error('El tiempo de preparación debe ser un valor positivo en minutos');
  }

  const valDisponible = disponible !== undefined ? (disponible ? 1 : 0) : 1;

  const [[localUser]] = await pool.query(
    `SELECT id FROM locales WHERE IDusuario = ?`,
    [userId]
  );

  if (!localUser) {
    throw new Error('El usuario autenticado no tiene ningún local asociado');
  }

  const IDlocal = localUser.id;

  const [nameExists] = await pool.query(
    `SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?) AND IDlocal = ?`,
    [nombre.trim(), IDlocal]
  );

  if (nameExists.length > 0) {
    throw new Error('Ya existe un producto con este nombre en tu local');
  }

  if (ingredientes && !Array.isArray(ingredientes)) {
    throw new Error('El campo ingredientes debe ser un arreglo de objetos');
  }

  if (grupos_opciones && !Array.isArray(grupos_opciones)) {
    throw new Error('El campo grupos_opciones debe ser un arreglo de objetos');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO productos
     (IDlocal, nombre, precio, disponible, tiempo_preparacion_min, IDcategoria, IDcategoria_comercial, imagen_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        IDlocal,
        nombre.trim(),
        Number(precio),
        valDisponible,
        tiempo_preparacion_min ? Number(tiempo_preparacion_min) : 15,
        IDcategoria || null,
        IDcategoria_comercial || null,
        imagen_url || null // 👈 Guardar imagen_url
      ]
    );
    const productId = result.insertId;

    if (ingredientes && ingredientes.length > 0) {
      const processedIngredients = new Set();

      for (const item of ingredientes) {
        if (typeof item !== 'object' || item === null) continue;

        const nombreIngrediente = item.nombre ? String(item.nombre).trim().toLowerCase() : null;
        const cantidad = item.cantidad ? String(item.cantidad).trim() : null;

        if (!nombreIngrediente || processedIngredients.has(nombreIngrediente)) continue;
        processedIngredients.add(nombreIngrediente);

        const [existing] = await connection.query(
          `SELECT id FROM alimentos WHERE LOWER(nombre) = ?`,
          [nombreIngrediente]
        );

        let alimentoId;
        if (existing.length > 0) {
          alimentoId = existing[0].id;
        } else {
          const [resAlimento] = await connection.query(
            `INSERT INTO alimentos (nombre) VALUES (?)`,
            [nombreIngrediente]
          );
          alimentoId = resAlimento.insertId;
        }

        await connection.query(
          `INSERT INTO productos_ingredientes (producto_id, alimento_id, cantidad)
           VALUES (?, ?, ?)`,
          [productId, alimentoId, cantidad]
        );
      }
    }

    if (grupos_opciones && grupos_opciones.length > 0) {
      for (const grupo of grupos_opciones) {
        if (!grupo.nombre) continue;

        const [resGrupo] = await connection.query(
          `INSERT INTO grupos_opciones (producto_id, nombre, min_seleccion, max_seleccion, obligatorio, permitir_cantidad)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            productId,
            String(grupo.nombre).trim(),
            grupo.min_seleccion ?? 1,
            grupo.max_seleccion ?? 1,
            grupo.obligatorio !== undefined ? (grupo.obligatorio ? 1 : 0) : 1,
            grupo.permitir_cantidad ? 1 : 0
          ]
        );

        const grupoId = resGrupo.insertId;

        if (grupo.opciones && Array.isArray(grupo.opciones)) {
          for (const opcion of grupo.opciones) {
            if (!opcion.nombre) continue;

            // Integración de la validación de opciones con disponibilidad
            if (opcion.id) {
              await connection.query(
                `UPDATE opciones_producto 
                 SET nombre = ?, precio_adicional = ?, disponible = ?
                 WHERE id = ? AND grupo_id = ?`,
                [
                  String(opcion.nombre).trim(),
                  opcion.precio_adicional ? Number(opcion.precio_adicional) : 0.00,
                  opcion.disponible !== undefined ? (opcion.disponible ? 1 : 0) : 1,
                  opcion.id,
                  grupoId
                ]
              );
            } else {
              await connection.query(
                `INSERT INTO opciones_producto (grupo_id, nombre, precio_adicional, disponible)
                 VALUES (?, ?, ?, ?)`,
                [
                  grupoId,
                  String(opcion.nombre).trim(),
                  opcion.precio_adicional ? Number(opcion.precio_adicional) : 0.00,
                  opcion.disponible !== undefined ? (opcion.disponible ? 1 : 0) : 1
                ]
              );
            }
          }
        }
      }
    }

    await connection.commit();

    return {
      id: productId,
      IDlocal,
      nombre: nombre.trim(),
      precio: Number(precio),
      disponible: valDisponible,
      tiempo_preparacion_min: tiempo_preparacion_min || 15,
      IDcategoria: IDcategoria || null,
      IDcategoria_comercial: IDcategoria_comercial || null,
      ingredientes: ingredientes || [],
      grupos_opciones: grupos_opciones || [],
      message: 'Producto creado correctamente'
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getProductsService = async () => {
  const [products] = await pool.query(
    `SELECT 
       p.id, 
       p.IDlocal,
       p.nombre, 
       p.precio, 
       p.disponible, 
       p.tiempo_preparacion_min, 
       p.imagen_url, -- 👈 AGREGAR ESTA LÍNEA AQUÍ
       p.IDcategoria,
       cp.nombre AS categoria_tecnica,
       cp.nivel_sensibilidad,
       p.IDcategoria_comercial,
       cc.nombre AS categoria, 
       l.nombre AS local
     FROM productos p
     JOIN locales l ON p.IDlocal = l.id
     LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
     LEFT JOIN categorias_comerciales cc ON p.IDcategoria_comercial = cc.id`
  );

  for (const p of products) {
    const [ingredientes] = await pool.query(
      `SELECT a.nombre, pi.cantidad
       FROM productos_ingredientes pi
       JOIN alimentos a ON pi.alimento_id = a.id
       WHERE pi.producto_id = ?`,
      [p.id]
    );
    p.ingredientes = ingredientes;
    p.grupos_opciones = await obtenerOpcionesProducto(p.id);
  }

  return products;
};

export const getProductByIdService = async (id) => {
  const [rows] = await pool.query(
    `SELECT 
       p.id, 
       p.IDlocal,
       p.nombre, 
       p.precio, 
       p.disponible, 
       p.tiempo_preparacion_min, 
       p.imagen_url, -- 👈 Asegurar la presencia de imagen_url
       p.IDcategoria,
       cp.nombre AS categoria_tecnica,
       cp.nivel_sensibilidad,
       p.IDcategoria_comercial,
       cc.nombre AS categoria,
       l.nombre AS local_nombre,
       l.es_activo AS local_es_activo,
       l.esta_operativo AS local_esta_operativo
     FROM productos p
     JOIN locales l ON p.IDlocal = l.id
     LEFT JOIN categorias_productos cp ON p.IDcategoria = cp.id
     LEFT JOIN categorias_comerciales cc ON p.IDcategoria_comercial = cc.id
     WHERE p.id = ?`,
    [id]
  );

  if (rows.length === 0) return null;

  const product = rows[0];

  const [horarios] = await pool.query(
    `SELECT dia_semana, hora_apertura, hora_cierre, es_activo 
     FROM horarios_local 
     WHERE IDlocal = ? AND es_activo = 1`,
    [product.IDlocal]
  );

  product.local = {
    id: product.IDlocal,
    nombre: product.local_nombre,
    es_activo: product.local_es_activo,
    esta_operativo: product.local_esta_operativo,
    horarios: horarios
  };

  const [ingredientes] = await pool.query(
    `SELECT a.nombre, pi.cantidad
     FROM productos_ingredientes pi
     JOIN alimentos a ON pi.alimento_id = a.id
     WHERE pi.producto_id = ?`,
    [id]
  );

  product.ingredientes = ingredientes;
  product.grupos_opciones = await obtenerOpcionesProducto(id);

  return product;
};

export const updateProductService = async (id, data, userId) => {
  const [[producto]] = await pool.query(
    `SELECT IDlocal FROM productos WHERE id = ?`,
    [id]
  );

  if (!producto) return null;

  const [[localUser]] = await pool.query(
    `SELECT id FROM locales WHERE IDusuario = ?`,
    [userId]
  );

  if (!localUser || localUser.id !== producto.IDlocal) {
    throw new Error('No tenés permisos para modificar productos de este local.');
  }

  const {
    nombre,
    precio,
    disponible,
    tiempo_preparacion_min,
    IDcategoria,
    IDcategoria_comercial,
    imagen_url, // 👈 AGREGAR ESTA LÍNEA AQUÍ
    ingredientes,
    grupos_opciones
  } = data;

  if (precio !== undefined && (isNaN(precio) || Number(precio) <= 0)) {
    throw new Error('El precio del producto debe ser mayor a 0');
  }

  if (tiempo_preparacion_min !== undefined && (isNaN(tiempo_preparacion_min) || Number(tiempo_preparacion_min) <= 0)) {
    throw new Error('El tiempo de preparación debe ser un valor positivo en minutos');
  }

  if (nombre) {
    const [nameExists] = await pool.query(
      `SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?) AND IDlocal = ? AND id != ?`,
      [nombre.trim(), producto.IDlocal, id]
    );

    if (nameExists.length > 0) {
      throw new Error('Ya existe otro producto con este nombre en tu local');
    }
  }

  if (IDcategoria) {
    const [categoriaExiste] = await pool.query(
      `SELECT id FROM categorias_productos WHERE id = ?`,
      [IDcategoria]
    );
    if (categoriaExiste.length === 0) {
      throw new Error('La categoría técnica especificada no existe en el sistema');
    }
  }

  if (IDcategoria_comercial) {
    const [categoriaComercialExiste] = await pool.query(
      `SELECT id FROM categorias_comerciales WHERE id = ?`,
      [IDcategoria_comercial]
    );
    if (categoriaComercialExiste.length === 0) {
      throw new Error('La categoría comercial especificada no existe en el sistema');
    }
  }

  let nuevaImagenUrl = producto.imagen_url; // Mantener la existente por defecto
  if (imagen_url !== undefined && imagen_url !== '') {
    nuevaImagenUrl = imagen_url;
  } else if (imagen_url === '') {
    nuevaImagenUrl = null; // Si se envía vacío intencionalmente, limpia la imagen
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Actualizar los datos del producto
    await connection.query(
      `UPDATE productos
   SET
     nombre = COALESCE(?, nombre),
     precio = COALESCE(?, precio),
     disponible = IF(? IS NOT NULL, ?, disponible),
     tiempo_preparacion_min = COALESCE(?, tiempo_preparacion_min),
     IDcategoria = COALESCE(?, IDcategoria),
     IDcategoria_comercial = COALESCE(?, IDcategoria_comercial),
     imagen_url = ?
   WHERE id = ?`,
      [
        nombre ? nombre.trim() : null,
        precio !== undefined ? precio : null,
        disponible !== undefined ? disponible : null,
        disponible !== undefined ? (disponible ? 1 : 0) : null,
        tiempo_preparacion_min !== undefined ? tiempo_preparacion_min : null,
        IDcategoria !== undefined ? IDcategoria : null,
        IDcategoria_comercial !== undefined ? IDcategoria_comercial : null,
        nuevaImagenUrl,
        id
      ]
    );

    // 2️⃣ Actualizar ingredientes si se enviaron
    if (ingredientes !== undefined && Array.isArray(ingredientes)) {
      await connection.query(`DELETE FROM productos_ingredientes WHERE producto_id = ?`, [id]);

      const processedIngredients = new Set();

      for (const item of ingredientes) {
        const nombreIngrediente = item.nombre ? item.nombre.trim().toLowerCase() : null;
        const cantidad = item.cantidad || null;

        if (!nombreIngrediente || processedIngredients.has(nombreIngrediente)) continue;
        processedIngredients.add(nombreIngrediente);

        const [existing] = await connection.query(
          `SELECT id FROM alimentos WHERE LOWER(nombre) = ?`,
          [nombreIngrediente]
        );

        let alimentoId;
        if (existing.length > 0) {
          alimentoId = existing[0].id;
        } else {
          const [resAlimento] = await connection.query(
            `INSERT INTO alimentos (nombre) VALUES (?)`,
            [nombreIngrediente]
          );
          alimentoId = resAlimento.insertId;
        }

        await connection.query(
          `INSERT INTO productos_ingredientes (producto_id, alimento_id, cantidad)
           VALUES (?, ?, ?)`,
          [id, alimentoId, cantidad]
        );
      }
    }

    // 3️⃣ Sincronizar Grupos de Opciones
    if (grupos_opciones !== undefined && Array.isArray(grupos_opciones)) {
      for (const grupo of grupos_opciones) {
        if (!grupo.nombre) continue;

        let grupoId = grupo.id;

        if (grupoId) {
          await connection.query(
            `UPDATE grupos_opciones 
             SET nombre = ?, min_seleccion = ?, max_seleccion = ?, obligatorio = ?, permitir_cantidad = ?
             WHERE id = ? AND producto_id = ?`,
            [
              String(grupo.nombre).trim(),
              grupo.min_seleccion ?? 1,
              grupo.max_seleccion ?? 1,
              grupo.obligatorio ? 1 : 0,
              grupo.permitir_cantidad ? 1 : 0,
              grupoId,
              id
            ]
          );
        } else {
          const [resGrupo] = await connection.query(
            `INSERT INTO grupos_opciones (producto_id, nombre, min_seleccion, max_seleccion, obligatorio, permitir_cantidad)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              id,
              String(grupo.nombre).trim(),
              grupo.min_seleccion ?? 1,
              grupo.max_seleccion ?? 1,
              grupo.obligatorio ? 1 : 0,
              grupo.permitir_cantidad ? 1 : 0
            ]
          );
          grupoId = resGrupo.insertId;
        }

        if (grupo.opciones && Array.isArray(grupo.opciones)) {
          for (const opcion of grupo.opciones) {
            if (!opcion.nombre) continue;

            if (opcion.id) {
              await connection.query(
                `UPDATE opciones_producto 
                 SET nombre = ?, precio_adicional = ?, disponible = ?
                 WHERE id = ? AND grupo_id = ?`,
                [
                  String(opcion.nombre).trim(),
                  opcion.precio_adicional ? Number(opcion.precio_adicional) : 0.00,
                  opcion.disponible !== undefined ? (opcion.disponible ? 1 : 0) : 1,
                  opcion.id,
                  grupoId
                ]
              );
            } else {
              await connection.query(
                `INSERT INTO opciones_producto (grupo_id, nombre, precio_adicional, disponible)
                 VALUES (?, ?, ?, ?)`,
                [
                  grupoId,
                  String(opcion.nombre).trim(),
                  opcion.precio_adicional ? Number(opcion.precio_adicional) : 0.00,
                  opcion.disponible !== undefined ? (opcion.disponible ? 1 : 0) : 1
                ]
              );
            }
          }
        }
      }
    }

    await connection.commit();

    return {
      id,
      message: 'Producto actualizado correctamente'
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteProductService = async (productId) => {
  const [product] = await pool.query(
    `SELECT id, nombre FROM productos WHERE id = ?`,
    [productId]
  );

  if (product.length === 0) {
    throw new Error('El producto que intentas eliminar no existe');
  }

  const [ordenesAsociadas] = await pool.query(
    `SELECT id FROM detalle_orden WHERE IDproducto = ? LIMIT 1`,
    [productId]
  );

  if (ordenesAsociadas.length > 0) {
    throw new Error('No se puede eliminar el producto porque ya forma parte del historial de pedidos.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(`DELETE FROM productos_ingredientes WHERE producto_id = ?`, [productId]);
    await connection.query(`DELETE FROM grupos_opciones WHERE producto_id = ?`, [productId]);
    await connection.query(`DELETE FROM productos WHERE id = ?`, [productId]);

    await connection.commit();

    return { message: `El producto "${product[0].nombre}" fue eliminado correctamente por el administrador.` };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const toggleDisponibleProductService = async (productId, userId) => {
  // 1. Convertir IDs a números para evitar problemas de tipos
  const pId = Number(productId);
  const uId = Number(userId);

  if (isNaN(pId) || isNaN(uId)) {
    throw new Error('Identificadores inválidos.');
  }

  // 2. Obtener producto
  const [[producto]] = await pool.query(
    `SELECT id, IDlocal, disponible FROM productos WHERE id = ?`,
    [pId]
  );

  if (!producto) throw new Error('Producto no encontrado');

  // 3. Obtener local asociado al usuario autenticado
  const [[localUser]] = await pool.query(
    `SELECT id FROM locales WHERE IDusuario = ?`,
    [uId]
  );

  if (!localUser) {
    throw new Error('El usuario autenticado no tiene un local asignado.');
  }

  // 4. Verificación estricta de propiedad
  if (Number(localUser.id) !== Number(producto.IDlocal)) {
    throw new Error('No tenés permisos sobre este producto.');
  }

  // 5. Parsear estado disponible flexiblemente (Maneja Buffer, String o Number)
  let estadoActual = 0;
  if (producto.disponible !== null && producto.disponible !== undefined) {
    if (typeof producto.disponible === 'object' && producto.disponible.data) {
      estadoActual = producto.disponible.data[0] === 1 ? 1 : 0;
    } else {
      estadoActual = Number(producto.disponible) === 1 ? 1 : 0;
    }
  }

  // 6. Alternar estado (1 -> 0 / 0 -> 1)
  const nuevoEstado = estadoActual === 1 ? 0 : 1;

  await pool.query(
    `UPDATE productos SET disponible = ? WHERE id = ?`,
    [nuevoEstado, pId]
  );

  return {
    id: producto.id,
    IDlocal: producto.IDlocal,
    disponible: nuevoEstado,
    message: `Producto ${nuevoEstado === 1 ? 'activado' : 'pausado'} correctamente`
  };
};

export const toggleDisponibleOpcionService = async (opcionId, userId) => {
  const oId = Number(opcionId);
  const uId = Number(userId);

  // Verificar pertenencia del local mediante la relación opcion -> grupo -> producto
  const [[opcion]] = await pool.query(
    `SELECT op.id, op.disponible, p.IDlocal 
     FROM opciones_producto op
     JOIN grupos_opciones go ON op.grupo_id = go.id
     JOIN productos p ON go.producto_id = p.id
     WHERE op.id = ?`,
    [oId]
  );

  if (!opcion) throw new Error('Opción no encontrada');

  const [[localUser]] = await pool.query(
    `SELECT id FROM locales WHERE IDusuario = ?`,
    [uId]
  );

  if (!localUser || Number(localUser.id) !== Number(opcion.IDlocal)) {
    throw new Error('No tenés permisos para modificar esta opción.');
  }

  let estadoActual = 0;
  if (opcion.disponible !== null && opcion.disponible !== undefined) {
    if (typeof opcion.disponible === 'object' && opcion.disponible.data) {
      estadoActual = opcion.disponible.data[0] === 1 ? 1 : 0;
    } else {
      estadoActual = Number(opcion.disponible) === 1 ? 1 : 0;
    }
  }

  const nuevoEstado = estadoActual === 1 ? 0 : 1;

  await pool.query(
    `UPDATE opciones_producto SET disponible = ? WHERE id = ?`,
    [nuevoEstado, oId]
  );

  return {
    id: oId,
    disponible: nuevoEstado,
    message: `Opción ${nuevoEstado === 1 ? 'activada' : 'pausada'} correctamente`
  };
};