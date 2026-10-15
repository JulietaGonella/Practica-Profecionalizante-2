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
import { TableroAdministrador } from './components/Admin/TableroAdministrador';
import { TableroRepartidor } from './components/Repartidor/TableroRepartidor';
import { TableroCliente } from './components/Cliente/TableroCliente';
import { NotificationMenu } from './components/Common/NotificationMenu'; 
import './components/Local/css/Local.css';
import { Icon, Spinner, Badge, Banner } from './components/Local/LocalUI';
import './components/Cliente/CSS/Cliente.css'; // 👈 Importación correcta de los estilos unificados de cliente
import './index.css';

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
    <div className="sd-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* 🟢 PANEL DE PEDIDOS EN CURSO */}
      <section className="sd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', backgroundColor: 'var(--sd-surface)', border: '1px solid var(--sd-border)', borderRadius: 'var(--sd-radius-card)', boxShadow: 'var(--sd-shadow-sm)' }}>
        <h2 style={{ color: 'var(--sd-navy)', fontSize: '1.25rem', fontWeight: 700 }}>
          📍 Pedidos en Curso
        </h2>

        {loadingPedidos ? (
          <div className="sd-state"><div className="sd-spinner"></div><p>Buscando pedidos activos...</p></div>
        ) : pedidosEnCurso.length === 0 ? (
          <p className="admin-muted">
            No tienes ningún pedido activo en este momento.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pedidosEnCurso.map((orden) => (
              <div
                key={orden.IDorden}
                className="sd-order-item"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--sd-tint-info)',
                  border: '1px solid var(--sd-line-info)',
                  borderRadius: 'var(--sd-radius-ctl)',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <strong style={{ color: 'var(--sd-navy)' }}>Pedido #{orden.IDorden}</strong> —{' '}
                  <span style={{ color: 'var(--sd-info)', fontWeight: 700 }}>
                    {orden.estado_orden}
                  </span>

                  <p className="admin-muted" style={{ margin: '4px 0 0 0', fontSize: '0.875rem' }}>
                    Total: ${Number(orden.total).toFixed(2)}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/cliente/seguimiento/${orden.IDorden}`)}
                  className="admin-btn admin-btn--primary admin-btn--sm"
                >
                  🚴 Ver Seguimiento
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Menú de Accesos Rápidos */}
      <section className="sd-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', backgroundColor: 'var(--sd-surface)', border: '1px solid var(--sd-border)', borderRadius: 'var(--sd-radius-card)', boxShadow: 'var(--sd-shadow-sm)' }}>
        <h2 style={{ color: 'var(--sd-navy)', fontSize: '1.25rem', fontWeight: 700 }}>
          Menú de Accesos Rápidos
        </h2>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/cliente/locales/')}
            className="admin-btn admin-btn--outline"
          >
            🏪 Explorar Locales
          </button>

          <button
            onClick={() => navigate('/cliente/pedidos')}
            className="admin-btn admin-btn--outline"
          >
            📦 Historial de Pedidos
          </button>

          <button
            onClick={() => navigate('/cliente/perfil')}
            className="admin-btn admin-btn--outline"
          >
            👤 Configurar Mi Perfil
          </button>

          <button
            onClick={() => navigate('/cliente/tablero')}
            className="admin-btn admin-btn--info-soft"
          >
            📊 Mi Tablero
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
    <div className="local-panel local-scope">

      {loadingLocal ? (
        <div className="local-state" role="status" style={{ marginBottom: '20px' }}>
          <Spinner />
          <p>Cargando datos del local...</p>
        </div>
      ) : errorLocal ? (
        <div style={{ marginBottom: '20px' }}>
          <Banner tipo="error">{errorLocal}</Banner>
        </div>
      ) : local && (
        <header className="local-header">
          {/* Acciones superiores sobre el banner */}
          <div className="local-header__actions">
            <NotificationMenu />
            <LogoutButton />
          </div>

          {/* Portada del local */}
          <div
            className="local-header__banner"
            style={{
              backgroundImage: local.banner_url
                ? `linear-gradient(to bottom, rgba(23,36,58,0.25), rgba(23,36,58,0.85)), url(${resolverUrl(local.banner_url)})`
                : 'linear-gradient(135deg, #17243A 0%, #284666 100%)'
            }}
          >
            <div className="local-header__content">

              {/* Logo del comercio */}
              <div className="local-header__logo">
                <img
                  src={
                    local.logo_url
                      ? resolverUrl(local.logo_url)
                      : 'https://placehold.co/100x100?text=Logo'
                  }
                  alt={local.nombre}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://placehold.co/100x100?text=Logo';
                  }}
                />
              </div>

              {/* Datos del local */}
              <div className="local-header__info">
                <h1>{local.nombre}</h1>
                <p className="local-header__meta">
                  <span><Icon name="pin" size={14} /> {local.direccion}</span>
                  {local.telefono && (
                    <span><Icon name="phone" size={14} /> {local.telefono}</span>
                  )}
                </p>
              </div>

              {/* Fachada y control del estado operativo */}
              <div className="local-status-card">
                {local.foto_url && (
                  <img
                    src={resolverUrl(local.foto_url)}
                    alt="Fachada"
                  />
                )}

                <div>
                  <div className="local-status-card__label">
                    Estado del comercio
                  </div>
                  {localEstaAbierto ? (
                    <Badge tone="success" dot>Abierto</Badge>
                  ) : (
                    <Badge tone="error" dot>Cerrado</Badge>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleEstado}
                  className={`local-btn local-btn--sm ${local.esta_operativo ? 'local-btn--danger' : 'local-btn--success'}`}
                >
                  <Icon name={local.esta_operativo ? 'pause' : 'play'} size={14} />
                  {local.esta_operativo ? 'Pausar recepción' : 'Activar recepción'}
                </button>
              </div>

            </div>
          </div>
        </header>
      )}

      {/* Pestañas de navegación de local */}
      <nav className="local-tabs" aria-label="Secciones del local">
        <button
          type="button"
          onClick={() => setSeccionActiva('comandera')}
          className={seccionActiva === 'comandera' ? 'active' : ''}
          aria-current={seccionActiva === 'comandera' ? 'page' : undefined}
        >
          <Icon name="clipboard" />
          Comandera de pedidos
        </button>

        <button
          type="button"
          onClick={() => setSeccionActiva('productos')}
          className={seccionActiva === 'productos' ? 'active' : ''}
          aria-current={seccionActiva === 'productos' ? 'page' : undefined}
        >
          <Icon name="utensils" />
          Gestión de productos
        </button>

        <button
          type="button"
          onClick={() => setSeccionActiva('horarios')}
          className={seccionActiva === 'horarios' ? 'active' : ''}
          aria-current={seccionActiva === 'horarios' ? 'page' : undefined}
        >
          <Icon name="calendar" />
          Horarios de atención
        </button>

        <button
          type="button"
          onClick={() => setSeccionActiva('perfil')}
          className={seccionActiva === 'perfil' ? 'active' : ''}
          aria-current={seccionActiva === 'perfil' ? 'page' : undefined}
        >
          <Icon name="store" />
          Perfil del comercio
        </button>
      </nav>

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
    <div className="admin-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <header className="admin-header">
        <div>
          <h1>Panel de Entregas del Repartidor 🚴</h1>
          <p>Pedidos disponibles y tracking en tiempo real.</p>
        </div>
        <LogoutButton />
      </header>

      <section className="admin-card" style={{ padding: '2rem', marginTop: '1.5rem' }}>
        <h2>¡Bienvenido a tu panel!</h2>
        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={() => navigate('/repartidor/tablero')}
            className="admin-btn admin-btn--primary"
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
    <div className="admin-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <header className="admin-header">
        <div>
          <h1>Panel de Administración General 🛡️</h1>
          <p>Gestión global de locales, usuarios y validaciones.</p>
        </div>
        <LogoutButton />
      </header>

      <section className="admin-card" style={{ padding: '2rem', marginTop: '1.5rem' }}>
        <h2>¡Bienvenido a tu panel!</h2>
        <div style={{ marginTop: '1.5rem' }}>
          <button
            onClick={() => navigate('/admin/tablero')}
            className="admin-btn admin-btn--primary"
          >
            📊 Ir al Tablero General
          </button>
        </div>
      </section>
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
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />

          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/recuperar-password" element={<SolicitarRecuperacionPage />} />
            <Route path="/restablecer-password" element={<RestablecerPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/actualizar-password-inicial" element={<ActualizarPasswordInicialPage />} />
            </Route>

            {/* Rutas del Cliente */}
            <Route element={<ProtectedRoute allowedRoles={['cliente']} />}>
              <Route element={<ClienteGuard />}>
                <Route element={<ClienteLayout />}>
                  <Route path="/cliente/inicio" element={<ClienteInicio />} />
                  <Route path="/cliente/pedidos" element={<MisPedidos />} />
                  <Route path="/cliente/perfil" element={<MiPerfil />} />
                  <Route path="/cliente/carrito" element={<CarritoPage />} />
                  <Route path="/cliente/locales/*" element={<CatalogoCliente />} />
                  <Route path="/cliente/tablero" element={<TableroCliente />} />
                  <Route path="/cliente/seguimiento/:ordenId" element={<SeguimientoPedido />} />
                </Route>
              </Route>

              <Route
                path="/cliente/direcciones"
                element={<MisDireccionesManager onSuccessRedirect="/cliente/inicio" />}
              />
            </Route>

            {/* Rutas del Local */}
            <Route element={<ProtectedRoute allowedRoles={['local', 'administrador local']} />}>
              <Route path="/local/inicio" element={<LocalInicio />} />
            </Route>

            {/* Rutas del Repartidor */}
            <Route element={<ProtectedRoute allowedRoles={['repartidor']} />}>
              <Route path="/repartidor/inicio" element={<PanelRepartidor />} />
              <Route path="/repartidor/orden/:ordenId" element={<DetallePedidoRepartidor />} />
              <Route path="/repartidor/tablero" element={<TableroRepartidor />} />
            </Route>

            {/* Rutas del Administrador */}
            <Route element={<ProtectedRoute allowedRoles={['administrador']} />}>
              <Route path="/admin/inicio" element={<PanelAdministrador />} />
              <Route path="/admin/crear-cuenta" element={<CrearCuentaPerfilAdmin />} />
              <Route path="/admin/crear-admin" element={<CrearAdminForm />} />
              <Route path="/admin/tablero" element={<TableroAdministrador />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}