// src/components/Cliente/CatalogoCliente.jsx
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { getLocales, getProductos } from '../../api/catalogService';
import { LocalesLista } from './LocalesLista';
import { ProductosLocal } from './ProductosLocal';
import { DetalleProducto } from './DetalleProducto';
import './CSS/Cliente.css'; // 👈 Importamos los estilos unificados del cliente

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

  if (loading) {
    return (
      <div className="sd-container">
        <div className="sd-state">
          <span className="sd-spinner"></span>
          <p>Cargando establecimientos y productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sd-container">
        <div className="sd-state sd-state--error">
          <span>⚠️ {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-container">
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
    </div>
  );
};