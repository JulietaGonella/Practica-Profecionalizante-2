import { pool } from '../config/db.js';

// Obtener todas las categorías comerciales ordenadas alfabéticamente
export const getCategoriasComercialesService = async () => {
    const [rows] = await pool.query(
        `SELECT id, nombre, descripcion 
     FROM categorias_comerciales 
     ORDER BY nombre ASC`
    );
    return rows;
};

// Crear una nueva categoría comercial
export const createCategoriaComercialService = async (nombre, descripcion = null) => {
    if (!nombre || !nombre.trim()) {
        throw new Error('El nombre de la categoría comercial es obligatorio.');
    }

    const nombreLimpio = nombre.trim();

    // Verificar si ya existe una categoría comercial con el mismo nombre
    const [existing] = await pool.query(
        `SELECT id, nombre FROM categorias_comerciales WHERE LOWER(nombre) = LOWER(?)`,
        [nombreLimpio]
    );

    if (existing.length > 0) {
        return existing[0]; // Si ya existe, retornamos la categoría encontrada
    }

    // Insertar la nueva categoría
    const [result] = await pool.query(
        `INSERT INTO categorias_comerciales (nombre, descripcion) VALUES (?, ?)`,
        [nombreLimpio, descripcion ? descripcion.trim() : null]
    );

    return {
        id: result.insertId,
        nombre: nombreLimpio,
        descripcion: descripcion ? descripcion.trim() : null
    };
};