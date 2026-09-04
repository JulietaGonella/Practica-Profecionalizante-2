import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importación de rutas de módulos
import authRoutes from './auth/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import localesRoutes from './routes/locales.routes.js';
import productosRoutes from './routes/products.routes.js';
import ordenesRoutes from './routes/orders.routes.js';
import repartidoresRoutes from './routes/repartidores.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import clienteRoutes from './routes/clientes.routes.js';
import adminRoutes from './routes/admin.routes.js';
import categoriasComercialesRoutes from './routes/categoriasComerciales.routes.js';

dotenv.config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Montaje de rutas API
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/clientes', clientesRoutes);
app.use('/locales', localesRoutes);
app.use('/products', productosRoutes);
app.use('/orders', ordenesRoutes);
app.use('/repartidores', repartidoresRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/clientes', clienteRoutes);
app.use('/admin', adminRoutes);
app.use('/categorias-comerciales', categoriasComercialesRoutes);
app.use('/uploads', express.static('uploads'));

// Manejo de rutas inexistentes (404)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Middleware centralizado de errores (500)
app.use((err, req, res, next) => {
  console.error('❌ Error no controlado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor', detalles: err.message });
});

export default app;