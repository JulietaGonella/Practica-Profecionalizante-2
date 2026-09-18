// src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LogoutButton } from './components/LogoutButton';
import { CatalogoCliente } from './components/Cliente/CatalogoCliente';
import { MisPedidos } from './components/Cliente/MisPedidos';
import { CarritoPage } from './pages/Cliente/CarritoPage';
import { CartFloatingButton } from './components/Cliente/CartFloatingButton';
import { CartProvider, useCart } from './context/CartContext';
import { MiPerfil } from './components/Cliente/MiPerfil';
import { getMiLocal, toggleOperativoLocal } from './api/localService';
import { ComanderaLocal } from './components/Local/ComanderaLocal';
import { GestionMenuLocal } from './components/Local/GestionMenuLocal';
import { GestionHorariosLocal } from './components/Local/GestionHorariosLocal';
import { PerfilLocal } from './components/Local/PerfilLocal';
import { SeguimientoPedido } from './components/Cliente/SeguimientoPedido';
import { getMisPedidos } from './api/ordersService';
import { PanelRepartidor } from './components/Repartidor/PanelRepartidor';
import { DetallePedidoRepartidor } from './components/Repartidor/DetallePedidoRepartidor';
import { estaLocalAbierto } from './utils/horarios';
import { PanelAdministrador } from './components/Admin/PanelAdministrador';
import { CrearCuentaPerfilAdmin } from './components/Admin/CrearCuentaPerfil';
import { CrearAdminForm } from './components/Admin/CrearCuentaAdmin';
import { MisDireccionesManager } from './components/Cliente/MisDirecciones';
import { ClienteLayout } from './components/Cliente/ClienteLayout';
import { ActualizarPasswordInicialPage } from './pages/ActualizarPasswordInicialPage';
import { SolicitarRecuperacionPage } from './pages/SolicitarRecuperacionPage';
import { RestablecerPasswordPage } from './pages/RestablecerPasswordPage';
import { ClienteGuard } from './components/Cliente/ClienteGuard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 🔝 Componente helper para resetear el scroll arriba en cada cambio de ruta
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};


// 🛒 INICIO CLIENTE
const ClienteInicio = () => {
  const navigate = useNavigate();

  const [pedidosEnCurso, setPedidosEnCurso] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);

  useEffect(() => {
    const cargarPedidosEnCurso = async () => {
      try {
        const data = await getMisPedidos();

        const activos = (Array.isArray(data) ? data : []).filter(
          (p) => p.IDestado !== 3 && p.IDestado !== 6
        );

        setPedidosEnCurso(activos);
      } catch (err) {
        console.error('Error al cargar pedidos activos:', err);
      } finally {
        setLoadingPedidos(false);
      }
    };

    cargarPedidosEnCurso();
  }, []);

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1000px',
        margin: '0 auto'
      }}
    >

      {/* 🟢 PANEL DE PEDIDOS EN CURSO */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>📍 Pedidos en Curso</h2>

        {loadingPedidos ? (
          <p>⏳ Buscando pedidos activos...</p>
        ) : pedidosEnCurso.length === 0 ? (
          <p style={{ color: '#666' }}>
            No tienes ningún pedido activo en este momento.
          </p>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '1rem'
            }}
          >
            {pedidosEnCurso.map((orden) => (
              <div
                key={orden.IDorden}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: '#e7f5ff',
                  border: '1px solid #74c0fc',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <strong>Pedido #{orden.IDorden}</strong> —{' '}
                  <span
                    style={{
                      color: '#1c7ed6',
                      fontWeight: 'bold'
                    }}
                  >
                    {orden.estado_orden}
                  </span>

                  <p
                    style={{
                      margin: '0.2rem 0 0 0',
                      fontSize: '0.9rem',
                      color: '#555'
                    }}
                  >
                    Total: ${Number(orden.total).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() =>
                    navigate(`/cliente/seguimiento/${orden.IDorden}`)
                  }
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: '#1c7ed6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🚴 Ver Seguimiento
                </button>
              </div>
            ))}
          </div>
        )}
      </section>


      <section style={{ marginTop: '2rem' }}>
        <h2>Menú de Accesos Rápidos</h2>

        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={() => navigate('/cliente/locales/')}
            style={{
              padding: '0.7rem 1.4rem',
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontWeight: 'bold'
            }}
          >
            🏪 Explorar Locales
          </button>

          <button
            onClick={() => navigate('/cliente/pedidos')}
            style={{
              padding: '0.7rem 1.4rem',
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontWeight: 'bold'
            }}
          >
            📦 Historial de Pedidos
          </button>

          <button
            onClick={() => navigate('/cliente/perfil')}
            style={{
              padding: '0.7rem 1.4rem',
              cursor: 'pointer',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontWeight: 'bold'
            }}
          >
            👤 Configurar Mi Perfil
          </button>
        </div>
      </section>

    </div>
  );
};


// 🏪 INICIO LOCAL
const LocalInicio = () => {
  const [local, setLocal] = useState(null);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [errorLocal, setErrorLocal] = useState('');
  const [, actualizarReloj] = useState(0);

  // Estado de la pestaña activa
  const [seccionActiva, setSeccionActiva] = useState('comandera');

  const resolverUrl = (path) =>
    path ? (path.startsWith('http') ? path : `${API_BASE_URL}${path}`) : '';

  const cargarMiLocal = async () => {
    setLoadingLocal(true);
    try {
      const data = await getMiLocal();
      setLocal(data);
    } catch (err) {
      console.error('Error al cargar datos del local:', err);
      setErrorLocal('No se pudo obtener la información de tu local.');
    } finally {
      setLoadingLocal(false);
    }
  };

  const localEstaAbierto = local
    ? estaLocalAbierto(local, local.horarios)
    : false;

  useEffect(() => {
    cargarMiLocal();
    const intervalo = setInterval(() => {
      actualizarReloj((valor) => valor + 1);
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const handleToggleEstado = async () => {
    if (!local) return;
    try {
      const resultado = await toggleOperativoLocal(local.id);
      setLocal((prev) => ({
        ...prev,
        esta_operativo: resultado.esta_operativo
      }));
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'Error al cambiar la recepción de pedidos'
      );
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1150px', margin: '0 auto' }}>

      {/* ========================================================= */}
      {/* 🖼️ ENCABEZADO PERSISTENTE DEL LOCAL (BANNER + FOTOS + INFO) */}
      {/* ========================================================= */}
      {loadingLocal ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>⏳ Cargando datos del local...</div>
      ) : errorLocal ? (
        <p style={{ color: 'red' }}>{errorLocal}</p>
      ) : local && (
        <div
          style={{
            position: 'relative',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
          }}
        >
          {/* 1. PORTADA / BANNER DE FONDO */}
          <div
            style={{
              height: '180px',
              backgroundImage: local.banner_url
                ? `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url(${resolverUrl(local.banner_url)})`
                : 'linear-gradient(135deg, #1c7ed6 0%, #0c8599 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '1.5rem',
              position: 'relative'
            }}
          >
            {/* Botón de Cerrar Sesión en la esquina superior derecha */}
            <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
              <LogoutButton />
            </div>

            {/* Contenido Principal del Encabezado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', width: '100%', flexWrap: 'wrap' }}>

              {/* 2. LOGO DEL COMERCIO */}
              <div
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  border: '3px solid #fff',
                  backgroundColor: '#fff',
                  overflow: 'hidden',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                  flexShrink: 0
                }}
              >
                <img
                  src={
                    local.logo_url
                      ? resolverUrl(local.logo_url)
                      : 'https://placehold.co/100x100?text=Logo'
                  }
                  alt={local.nombre}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://placehold.co/100x100?text=Logo';
                  }}
                />
              </div>

              {/* Textos del Local */}
              <div style={{ flex: 1, minWidth: '220px' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                  {local.nombre}
                </h1>
                <p style={{ margin: '0.3rem 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                  📍 {local.direccion} {local.telefono ? `• 📞 ${local.telefono}` : ''}
                </p>
              </div>

              {/* 3. FACHADA Y CONTROL DE ESTADO OPERATIVO */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.8rem 1.2rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                {local.foto_url && (
                  <img
                    src={resolverUrl(local.foto_url)}
                    alt="Fachada"
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid #fff'
                    }}
                  />
                )}

                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                    Estado del Comercio:
                  </div>
                  <span
                    style={{
                      backgroundColor: localEstaAbierto ? '#2b8a3e' : '#c92a2a',
                      color: '#fff',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      display: 'inline-block'
                    }}
                  >
                    {localEstaAbierto ? '🟢 Abierto' : '🔴 Cerrado'}
                  </span>
                </div>

                <button
                  onClick={handleToggleEstado}
                  style={{
                    padding: '0.5rem 0.9rem',
                    backgroundColor: local.esta_operativo ? '#e03131' : '#099268',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {local.esta_operativo ? 'Pausar Recepción' : 'Activar Recepción'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📌 PESTAÑAS DE NAVEGACIÓN (CONMUTADOR DE VISTAS) */}
      {/* ========================================================= */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          borderBottom: '2px solid #e9ecef',
          paddingBottom: '0.5rem'
        }}
      >
        <button
          onClick={() => setSeccionActiva('comandera')}
          style={{
            padding: '0.7rem 1.3rem',
            backgroundColor: seccionActiva === 'comandera' ? '#007bff' : '#f8f9fa',
            color: seccionActiva === 'comandera' ? '#fff' : '#495057',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📋 Comandera de Pedidos
        </button>

        <button
          onClick={() => setSeccionActiva('productos')}
          style={{
            padding: '0.7rem 1.3rem',
            backgroundColor: seccionActiva === 'productos' ? '#007bff' : '#f8f9fa',
            color: seccionActiva === 'productos' ? '#fff' : '#495057',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🍕 Gestión de Productos
        </button>

        <button
          onClick={() => setSeccionActiva('horarios')}
          style={{
            padding: '0.7rem 1.3rem',
            backgroundColor: seccionActiva === 'horarios' ? '#007bff' : '#f8f9fa',
            color: seccionActiva === 'horarios' ? '#fff' : '#495057',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📅 Horarios de Atención
        </button>

        <button
          onClick={() => setSeccionActiva('perfil')}
          style={{
            padding: '0.7rem 1.3rem',
            backgroundColor: seccionActiva === 'perfil' ? '#007bff' : '#f8f9fa',
            color: seccionActiva === 'perfil' ? '#fff' : '#495057',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🏪 Perfil del Comercio
        </button>
      </div>

      {/* ========================================================= */}
      {/* 🔄 RENDERIZADO DINÁMICO DE SECCIONES */}
      {/* ========================================================= */}
      {seccionActiva === 'comandera' && <ComanderaLocal />}
      {seccionActiva === 'productos' && local && <GestionMenuLocal localId={local.id} />}
      {seccionActiva === 'horarios' && <GestionHorariosLocal />}
      {seccionActiva === 'perfil' && local && <PerfilLocal />}

    </div>
  );
};


// 🚴 INICIO REPARTIDOR
const RepartidorInicio = () => {

  const navigate = useNavigate();

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1000px',
        margin: '0 auto'
      }}
    >

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}
      >

        <h1>
          Panel de Entregas del Repartidor 🚴
        </h1>

        <LogoutButton />

      </header>


      <section style={{ marginTop: '2rem' }}>

        <h2>
          ¡Bienvenido a tu panel!
        </h2>

        <p>
          Pedidos disponibles y tracking en tiempo real.
        </p>

        <div style={{ marginTop: '1.5rem' }}>

          <button
            onClick={() =>
              navigate('/repartidor/tablero')
            }
            style={{
              padding: '0.6rem 1.2rem',
              cursor: 'pointer'
            }}
          >
            📊 Ir al Tablero de Estadísticas
          </button>

        </div>

      </section>

    </div>
  );
};


// 🛡️ INICIO ADMINISTRADOR
const AdminInicio = () => {

  const navigate = useNavigate();

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1000px',
        margin: '0 auto'
      }}
    >

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}
      >

        <h1>
          Panel de Administración General 🛡️
        </h1>

        <LogoutButton />

      </header>


      <section style={{ marginTop: '2rem' }}>

        <h2>
          ¡Bienvenido a tu panel!
        </h2>

        <p>
          Gestión global de locales, usuarios y validaciones.
        </p>

        <div style={{ marginTop: '1.5rem' }}>

          <button
            onClick={() =>
              navigate('/admin/tablero')
            }
            style={{
              padding: '0.6rem 1.2rem',
              cursor: 'pointer'
            }}
          >
            📊 Ir al Tablero General
          </button>

        </div>

      </section>

    </div>
  );
};


// 📊 TABLERO DE ESTADÍSTICAS
const TableroEstadisticas = ({ rol }) => {

  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem' }}>

      <h2>
        📊 Tablero de Estadísticas y Métricas ({rol})
      </h2>

      <p>
        Sector en desarrollo para reportes interactivos.
      </p>

      <button onClick={() => navigate(-1)}>
        ⬅ Volver al Inicio
      </button>

    </div>
  );
};


// =============================================
// APP PRINCIPAL
// =============================================

export default function App() {

  const { agregarAlCarrito } = useCart();

  return (

    <AuthProvider>

      <BrowserRouter>

        {/* 🔝 Resetea la posición del scroll */}
        <ScrollToTop />

        <Routes>

          {/* 🔓 RUTAS PÚBLICAS DE AUTENTICACIÓN */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/recuperar-password" element={<SolicitarRecuperacionPage />} />
          <Route path="/restablecer-password" element={<RestablecerPasswordPage />} />

          {/* 🔒 RUTA DE CAMBIO DE CONTRASEÑA (Protegida para usuarios autenticados) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/actualizar-password-inicial" element={<ActualizarPasswordInicialPage />} />
          </Route>

          {/* 🛒 RUTAS DEL CLIENTE */}
          <Route element={<ProtectedRoute allowedRoles={['cliente']} />}>

            {/* 1. Guardia de inicio: Intercepta el login y valida coordenadas antes de mostrar nada */}
            <Route element={<ClienteGuard />}>

              {/* Rutas con panel y barra de navegación */}
              <Route element={<ClienteLayout />}>
                <Route path="/cliente/inicio" element={<ClienteInicio />} />
                <Route path="/cliente/pedidos" element={<MisPedidos />} />
                <Route path="/cliente/perfil" element={<MiPerfil />} />
                <Route path="/cliente/carrito" element={<CarritoPage />} />
                <Route path="/cliente/locales/*" element={<CatalogoCliente onAgregarAlCarrito={agregarAlCarrito} />} />
                <Route path="/cliente/tablero" element={<TableroEstadisticas rol="Cliente" />} />
                <Route path="/cliente/seguimiento/:ordenId" element={<SeguimientoPedido />} />
              </Route>

            </Route>

            {/* 2. Pantalla de direcciones AISLADA (Sin Navbar ni panel de la tienda) */}
            <Route
              path="/cliente/direcciones"
              element={<MisDireccionesManager onSuccessRedirect="/cliente/inicio" />}
            />

          </Route>


          {/* 🏪 RUTAS DEL LOCAL */}
          <Route element={<ProtectedRoute allowedRoles={['local', 'administrador local']} />} >
            <Route path="/local/inicio" element={<LocalInicio />} />
          </Route>

          {/* 🚴 RUTAS DEL REPARTIDOR */}
          <Route element={<ProtectedRoute allowedRoles={['repartidor']} />}>
            <Route path="/repartidor/inicio" element={<PanelRepartidor />} />
            <Route path="/repartidor/orden/:ordenId" element={<DetallePedidoRepartidor />} />
            <Route path="/repartidor/tablero" element={<TableroEstadisticas rol="Repartidor" />} />
          </Route>

          {/* 🛡️ RUTAS DEL ADMINISTRADOR */}
          <Route element={<ProtectedRoute allowedRoles={['administrador']} />}>
            <Route path="/admin/inicio" element={<PanelAdministrador />} />
            <Route path="/admin/crear-cuenta" element={<CrearCuentaPerfilAdmin />} />
            <Route path="/admin/crear-admin" element={<CrearAdminForm />} />
            <Route path="/admin/tablero" element={<TableroEstadisticas rol="Administrador" />} />
          </Route>

          {/* 🔄 REDIRECCIÓN POR DEFECTO */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

      </BrowserRouter>

    </AuthProvider>
  );
}