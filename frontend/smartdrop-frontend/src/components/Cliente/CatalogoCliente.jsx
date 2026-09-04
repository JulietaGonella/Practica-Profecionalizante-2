// src/components/Cliente/CatalogoCliente.jsx
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getLocales, getProductos } from '../../api/catalogService';
import { LocalesLista } from './LocalesLista';
import { ProductosLocal } from './ProductosLocal';
import { DetalleProducto } from './DetalleProducto';

export const CatalogoCliente = ({ onAgregarAlCarrito }) => {
  const [locales, setLocales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      setError('');

      try {
        const [localesData, productosData] = await Promise.all([
          getLocales(),
          getProductos()
        ]);

        // Cargar todos los locales retornados por la API
        setLocales(localesData);
        setProductos(productosData.filter((p) => Boolean(p.disponible)));
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('No se pudieron obtener los datos del servidor.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  if (loading) return <div>⏳ Cargando datos...</div>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <Routes>
      <Route path="/" element={<LocalesLista locales={locales} />} />
      <Route path="locales" element={<LocalesLista locales={locales} />} />
      <Route 
        path="local/:localId" 
        element={<ProductosLocal locales={locales} productos={productos} />} 
      />
      <Route 
        path="producto/:productoId" 
        element={<DetalleProducto onAgregarAlCarrito={onAgregarAlCarrito} />} 
      />
    </Routes>
  );
};