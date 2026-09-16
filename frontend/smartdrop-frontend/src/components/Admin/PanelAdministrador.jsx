import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoutButton } from '../LogoutButton';
import { useAuth } from '../../context/AuthContext';
import {
  getUsuariosAdmin,
  getLocalesAdmin,
  toggleActivoLocalAdmin,
  actualizarLocalAdmin,
  getRepartidoresAdmin,
  validarRepartidorAdmin,
  getSolicitudesVehiculosAdmin,
  evaluarSolicitudVehiculoAdmin,
  getClientesAdmin,
  getHorariosLocalAdmin,
  eliminarUsuarioAdmin,
  getHistorialClienteAdmin,
  getAlertasDocumentacionAdmin,
  getVehiculosPendientesBajaAdmin,
  aprobarBajaVehiculoAdmin,
  rechazarBajaVehiculoAdmin
} from '../../api/adminService';
import { BarraBusquedaFiltro } from './BarraBusquedaFiltro';
import { CambiarPasswordModal } from '../CambiarPasswordModal'

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado'
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const resolverImagenLocal = (ruta) => (
  ruta
    ? (ruta.startsWith('http') ? ruta : `${API_BASE_URL}${ruta}`)
    : ''
);

const TablaConScrollSuperior = ({ children, minWidth = '1100px' }) => {
  const scrollSuperiorRef = useRef(null);
  const scrollTablaRef = useRef(null);

  const sincronizarDesdeSuperior = (e) => {
    if (scrollTablaRef.current) {
      scrollTablaRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const sincronizarDesdeTabla = (e) => {
    if (scrollSuperiorRef.current) {
      scrollSuperiorRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <>
      <div
        ref={scrollSuperiorRef}
        onScroll={sincronizarDesdeSuperior}
        style={{ overflowX: 'auto', overflowY: 'hidden', height: '16px' }}
        aria-label="Desplazamiento horizontal de la tabla"
      >
        <div style={{ width: minWidth, height: '1px' }} />
      </div>
      <div
        ref={scrollTablaRef}
        onScroll={sincronizarDesdeTabla}
        style={{ overflowX: 'auto' }}
      >
        {children}
      </div>
    </>
  );
};

export const PanelAdministrador = () => {
  const navigate = useNavigate();
  const { user: usuarioActual } = useAuth();

  const [seccion, setSeccion] = useState('usuarios');
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [repartidores, setRepartidores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);
  const [localEditando, setLocalEditando] = useState(null);

  const [formLocal, setFormLocal] = useState({
    nombre: '',
    direccion: '',
    latitud: '',
    longitud: '',
    IDusuario: ''
  });

  const [localHorariosAbiertos, setLocalHorariosAbiertos] = useState(null);
  const [horariosConsultados, setHorariosConsultados] = useState([]);
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [errorHorarios, setErrorHorarios] = useState('');
  const [repartidorSeleccionado, setRepartidorSeleccionado] = useState(null);
  const [solicitudesVehiculos, setSolicitudesVehiculos] = useState([]);
  const [documentacionVehiculo, setDocumentacionVehiculo] = useState(null);
  const [alertasDoc, setAlertasDoc] = useState([]);
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const [paginaRepartidores, setPaginaRepartidores] = useState(1);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [registrosPorPagina, setRegistrosPorPagina] = useState(5);
  const [busqueda, setBusqueda] = useState('');
  const [clienteHistorialSeleccionado, setClienteHistorialSeleccionado] = useState(null);
  const [historialPedidos, setHistorialPedidos] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [mostrarCambioPass, setMostrarCambioPass] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState('');
  const [vehiculosBaja, setVehiculosBaja] = useState([]);
  const [vehiculoARechazarBaja, setVehiculoARechazarBaja] = useState(null);
  const [motivoRechazoBaja, setMotivoRechazoBaja] = useState('');
  const [solicitudARechazar, setSolicitudARechazar] = useState(null);
  const [motivoRechazoSolicitud, setMotivoRechazoSolicitud] = useState('');

  // --- BÚSQUEDA Y FILTRADO DE DATOS ---
  const term = busqueda.trim().toLowerCase();

  const usuariosFiltrados = usuarios.filter((u) => {
    if (!term) return true;
    return (
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.rol?.toLowerCase().includes(term)
    );
  });

  const localesFiltrados = locales.filter((l) => {
    if (!term) return true;
    return (
      l.nombre?.toLowerCase().includes(term) ||
      l.direccion?.toLowerCase().includes(term)
    );
  });

  const repartidoresFiltrados = repartidores.filter((r) => {
    if (!term) return true;
    return (
      r.username?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.dni?.toLowerCase().includes(term) ||
      r.tipo_vehiculo?.toLowerCase().includes(term)
    );
  });

  const clientesFiltrados = clientes.filter((c) => {
    if (!term) return true;
    const nombreCompleto = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
    return (
      c.username?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.telefono?.toLowerCase().includes(term) ||
      c.direccion?.toLowerCase().includes(term) ||
      nombreCompleto.includes(term)
    );
  });

  // --- CÁLCULO DE PAGINACIÓN SOBRE LOS FILTRADOS ---
  const totalPaginasRepartidores = Math.max(
    1,
    Math.ceil(repartidoresFiltrados.length / registrosPorPagina)
  );
  const totalPaginasUsuarios = Math.max(
    1,
    Math.ceil(usuariosFiltrados.length / registrosPorPagina)
  );
  const totalPaginasClientes = Math.max(
    1,
    Math.ceil(clientesFiltrados.length / registrosPorPagina)
  );

  const repartidoresVisibles = repartidoresFiltrados.slice(
    (paginaRepartidores - 1) * registrosPorPagina,
    paginaRepartidores * registrosPorPagina
  );
  const usuariosVisibles = usuariosFiltrados.slice(
    (paginaUsuarios - 1) * registrosPorPagina,
    paginaUsuarios * registrosPorPagina
  );
  const clientesVisibles = clientesFiltrados.slice(
    (paginaClientes - 1) * registrosPorPagina,
    paginaClientes * registrosPorPagina
  );

  const cambiarRegistrosPorPagina = (e) => {
    setRegistrosPorPagina(Number(e.target.value));
    setPaginaUsuarios(1);
    setPaginaRepartidores(1);
    setPaginaClientes(1);
  };

  const localSeleccionado = locales.find(
    (local) =>
      String(local.id) === String(localEditando) ||
      String(local.id) === String(localHorariosAbiertos)
  );

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        usuariosData,
        localesData,
        repartidoresData,
        clientesData,
        solicitudesData,
        alertasData,
        bajasData // 👈 Agregado
      ] = await Promise.all([
        getUsuariosAdmin(),
        getLocalesAdmin(),
        getRepartidoresAdmin(),
        getClientesAdmin(),
        getSolicitudesVehiculosAdmin(),
        getAlertasDocumentacionAdmin(),
        getVehiculosPendientesBajaAdmin() // 👈 Petición al endpoint de bajas
      ]);

      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setLocales(Array.isArray(localesData) ? localesData : []);
      setRepartidores(Array.isArray(repartidoresData) ? repartidoresData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setSolicitudesVehiculos(Array.isArray(solicitudesData) ? solicitudesData : []);
      setAlertasDoc(Array.isArray(alertasData) ? alertasData : []);
      setVehiculosBaja(Array.isArray(bajasData) ? bajasData : []); // 👈 Guardar en estado

      setPaginaUsuarios(1);
      setPaginaRepartidores(1);
      setPaginaClientes(1);
    } catch (err) {
      console.error('Error cargando datos administrativos:', err);
      setError(err.response?.data?.error || 'No se pudieron cargar los datos administrativos.');
    } finally {
      setLoading(false);
    }
  };

  const consultarHistorialCliente = async (cliente) => {
    try {
      setClienteHistorialSeleccionado(cliente);
      setHistorialPedidos([]);
      setErrorHistorial('');
      setLoadingHistorial(true);

      const data = await getHistorialClienteAdmin(cliente.IDusuario);
      setHistorialPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error consultando historial del cliente:', err);
      setErrorHistorial(
        err.response?.data?.error || 'No se pudo obtener el historial de pedidos.'
      );
    } finally {
      setLoadingHistorial(false);
    }
  };

  const cerrarHistorialCliente = () => {
    setClienteHistorialSeleccionado(null);
    setHistorialPedidos([]);
    setErrorHistorial('');
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    setBusqueda('');
  }, [seccion]);

  const handleEliminarUsuario = async (usuario) => {
    if (Number(usuario.id) === Number(usuarioActual?.id)) {
      alert('No podés eliminar tu propia cuenta.');
      return;
    }

    const confirmar = window.confirm(
      `¿Seguro que querés eliminar al usuario "${usuario.username}"?`
    );

    if (!confirmar) return;

    try {
      setProcesandoId(`eliminar-usuario-${usuario.id}`);
      await eliminarUsuarioAdmin(usuario.id);
      await cargarDatos();
      alert('Usuario eliminado correctamente.');
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'No se pudo eliminar el usuario.'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleToggleLocal = async (local) => {
    try {
      setProcesandoId(`local-${local.id}`);
      await toggleActivoLocalAdmin(local.id);
      await cargarDatos();
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'No se pudo cambiar el estado administrativo del local.'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleValidarRepartidor = async (repartidor) => {
    try {
      setProcesandoId(`repartidor-${repartidor.id}`);
      await validarRepartidorAdmin(repartidor.id, Number(repartidor.validado) === 0 ? 1 : 0);
      await cargarDatos();
    } catch (err) {
      alert(
        err.response?.data?.error ||
        'No se pudo cambiar la validación del repartidor.'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAprobarBaja = async (idVehiculo) => {
    const confirmar = window.confirm('¿Estás seguro de aprobar la baja definitiva de este vehículo? Se desvinculará del repartidor.');
    if (!confirmar) return;

    try {
      setProcesandoId(`baja-${idVehiculo}`);
      await aprobarBajaVehiculoAdmin(idVehiculo);
      await cargarDatos();
      alert('✅ Baja de vehículo aprobada correctamente.');
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo procesar la baja del vehículo.');
    } finally {
      setProcesandoId(null);
    }
  };

  const iniciarRechazoBaja = (idVehiculo) => {
    setVehiculoARechazarBaja(idVehiculo);
    setMotivoRechazoBaja('');
  };

  const confirmarRechazoBaja = async (e) => {
    e.preventDefault();
    if (!motivoRechazoBaja.trim()) {
      alert('El motivo del rechazo es obligatorio.');
      return;
    }

    try {
      setProcesandoId(`baja-rechazar-${vehiculoARechazarBaja}`);
      await rechazarBajaVehiculoAdmin(vehiculoARechazarBaja, motivoRechazoBaja.trim());
      await cargarDatos();
      setVehiculoARechazarBaja(null);
      setMotivoRechazoBaja('');
      alert('❌ La solicitud de baja del vehículo fue rechazada correctamente.');
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo rechazar la baja del vehículo.');
    } finally {
      setProcesandoId(null);
    }
  };

  const abrirDetalleRepartidor = (repartidor) => {
    setRepartidorSeleccionado(repartidor);
  };

  const cerrarDetalleRepartidor = () => {
    setRepartidorSeleccionado(null);
  };

  const resolverDocumento = (ruta) => (
    ruta ? (ruta.startsWith('http') ? ruta : `${API_BASE_URL}${ruta}`) : ''
  );

  const evaluarSolicitudVehiculo = async (solicitud, estado) => {
    if (estado === 'RECHAZADO') {
      // En lugar de prompt, abrimos nuestro propio modal de motivo
      setSolicitudARechazar(solicitud);
      setMotivoRechazoSolicitud('');
      return;
    }

    try {
      setProcesandoId(`vehiculo-${solicitud.id}`);
      await evaluarSolicitudVehiculoAdmin(solicitud.id, estado, '');
      await cargarDatos();
      if (documentacionVehiculo?.id === solicitud.id) setDocumentacionVehiculo(null);
      alert('✅ Solicitud procesada correctamente.');
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo evaluar la solicitud.');
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarRechazoSolicitud = async (e) => {
    e.preventDefault();
    if (!motivoRechazoSolicitud.trim()) {
      alert('El motivo del rechazo es obligatorio.');
      return;
    }

    try {
      setProcesandoId(`vehiculo-${solicitudARechazar.id}`);
      await evaluarSolicitudVehiculoAdmin(solicitudARechazar.id, 'RECHAZADO', motivoRechazoSolicitud.trim());
      await cargarDatos();
      if (documentacionVehiculo?.id === solicitudARechazar.id) setDocumentacionVehiculo(null);
      setSolicitudARechazar(null);
      setMotivoRechazoSolicitud('');
      alert('❌ La solicitud fue rechazada correctamente.');
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo rechazar la solicitud.');
    } finally {
      setProcesandoId(null);
    }
  };
  const iniciarEdicionLocal = (local) => {
    setLocalEditando(local.id);
    setFormLocal({
      nombre: local.nombre || '',
      direccion: local.direccion || '',
      latitud: local.latitud ?? '',
      longitud: local.longitud ?? '',
      IDusuario: local.IDusuario ?? ''
    });
  };

  const cancelarEdicionLocal = () => {
    setLocalEditando(null);
    setFormLocal({
      nombre: '',
      direccion: '',
      latitud: '',
      longitud: '',
      IDusuario: ''
    });
  };

  const handleFormLocalChange = (e) => {
    const { name, value } = e.target;
    setFormLocal((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const guardarCambiosLocal = async (e) => {
    e.preventDefault();
    if (localEditando === null) return;

    try {
      setProcesandoId(`editar-local-${localEditando}`);

      await actualizarLocalAdmin(localEditando, {
        nombre: formLocal.nombre.trim(),
        direccion: formLocal.direccion.trim(),
        latitud: Number(formLocal.latitud),
        longitud: Number(formLocal.longitud),
        IDusuario: Number(formLocal.IDusuario)
      });

      await cargarDatos();
      cancelarEdicionLocal();

      alert('✅ Local actualizado correctamente.');
    } catch (err) {
      console.error('Error al actualizar local:', err);

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'No se pudieron guardar los cambios del local.'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const consultarHorariosLocal = async (local) => {
    try {
      setLocalHorariosAbiertos(local.id);
      setHorariosConsultados([]);
      setErrorHorarios('');
      setLoadingHorarios(true);

      const data = await getHorariosLocalAdmin(local.id);
      setHorariosConsultados(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al consultar horarios del local:', err);

      setErrorHorarios(
        err.response?.data?.error ||
        'No se pudieron obtener los horarios del local.'
      );
    } finally {
      setLoadingHorarios(false);
    }
  };

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Panel de Administración 🛡️</h1>
          <p style={{ color: '#666' }}>Gestión general del sistema SmartDrop</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setMostrarCambioPass(true)}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: '#495057',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔑 Cambiar Contraseña
          </button>

          <LogoutButton />
        </div>
      </header>

      {/* 👈 4. BANNER DE ALERTAS DE DOCUMENTACIÓN VENCIDA O POR VENCER */}
      {alertasDoc.length > 0 && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            border: '1px solid #ffc9c9',
            borderRadius: '10px',
            backgroundColor: '#fff5f5'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, color: '#c92a2a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚠️ Alertas de Documentación Vencida / Por Vencer
            </h3>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#c92a2a', backgroundColor: '#ffe3e3', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
              {alertasDoc.length} Alerta(s)
            </span>
          </div>

          <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.8rem' }}>
            {alertasDoc.map((alerta, index) => {
              const esHoy = alerta.estado === 'VENCE_HOY';

              return (
                <div
                  key={`${alerta.repartidor_id}-${alerta.documento}-${index}`}
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.8rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#fff',
                    borderLeft: `5px solid ${esHoy ? '#f59f00' : '#e03131'}`,
                    borderTop: '1px solid #ffc9c9',
                    borderRight: '1px solid #ffc9c9',
                    borderBottom: '1px solid #ffc9c9',
                    borderRadius: '6px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{alerta.repartidor}</strong>
                    <small style={{ display: 'block', color: '#666' }}>
                      {alerta.vehiculo} · {alerta.email}
                    </small>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                      📄 <strong>{alerta.documento}:</strong> {alerta.fecha_vencimiento}
                    </span>

                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        backgroundColor: esHoy ? '#f59f00' : '#e03131'
                      }}
                    >
                      {esHoy ? '⏳ VENCE HOY' : '❌ VENCIDO'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Renderizado condicional del modal de cambio de clave */}
      {mostrarCambioPass && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justify: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '12px', maxWidth: '400px', width: '100%' }}>
            <CambiarPasswordModal
              esObligatorio={false}
              onClose={() => setMostrarCambioPass(false)}
            />
          </div>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justify: 'flex-end',
          gap: '10px',
          marginBottom: '1.5rem'
        }}
      >
        <button
          onClick={() => navigate('/admin/crear-cuenta')}
          style={{
            padding: '0.7rem 1rem',
            backgroundColor: '#1c7ed6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ➕ Crear cuenta y perfil
        </button>

        <button
          onClick={() => navigate('/admin/crear-admin')}
          style={{
            padding: '0.7rem 1rem',
            backgroundColor: '#1c7ed6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ➕ Crear admin
        </button>
      </div>

      <nav
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '1.5rem'
        }}
      >
        <button
          onClick={() => setSeccion('usuarios')}
          style={{
            padding: '0.8rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: seccion === 'usuarios' ? '#1c7ed6' : '#e9ecef',
            color: seccion === 'usuarios' ? '#fff' : '#333'
          }}
        >
          👥 Usuarios
        </button>

        <button
          onClick={() => setSeccion('locales')}
          style={{
            padding: '0.8rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: seccion === 'locales' ? '#2b8a3e' : '#e9ecef',
            color: seccion === 'locales' ? '#fff' : '#333'
          }}
        >
          🏪 Locales
        </button>

        <button
          onClick={() => setSeccion('repartidores')}
          style={{
            padding: '0.8rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: seccion === 'repartidores' ? '#d9480f' : '#e9ecef',
            color: seccion === 'repartidores' ? '#fff' : '#333'
          }}
        >
          🚴 Repartidores
        </button>

        <button
          onClick={() => setSeccion('clientes')}
          style={{
            padding: '0.8rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: seccion === 'clientes' ? '#7048e8' : '#e9ecef',
            color: seccion === 'clientes' ? '#fff' : '#333'
          }}
        >
          🧑‍🤝‍🧑 Clientes
        </button>
      </nav>

      <BarraBusquedaFiltro
        busqueda={busqueda}
        setBusqueda={(valor) => {
          setBusqueda(valor);
          setPaginaUsuarios(1);
          setPaginaRepartidores(1);
          setPaginaClientes(1);
        }}
        placeholder={`Buscar en ${seccion}...`}
      />

      {loading ? (
        <p>⏳ Cargando información...</p>
      ) : error ? (
        <p style={{ color: '#e03131' }}>{error}</p>
      ) : (
        <>
          {seccion === 'usuarios' && (
            <section>
              <h2>👥 Gestión de usuarios</h2>

              {usuarios.length === 0 ? (
                <p>No hay usuarios registrados.</p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      margin: '1rem 0 0.5rem'
                    }}
                  >
                    <small style={{ color: '#666' }}>
                      Mostrando {(paginaUsuarios - 1) * registrosPorPagina + 1} - {Math.min(paginaUsuarios * registrosPorPagina, usuarios.length)} de {usuarios.length}
                    </small>
                    <label style={{ fontSize: '0.9rem' }}>
                      Ver{' '}
                      <select value={registrosPorPagina} onChange={cambiarRegistrosPorPagina}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>{' '}
                      registros
                    </label>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginTop: '1rem'
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#e9ecef' }}>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>ID</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Usuario</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Rol</th>
                          <th style={{ padding: '0.8rem' }}>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {usuariosVisibles.map((usuario) => (
                          <tr
                            key={usuario.id}
                            style={{ borderBottom: '1px solid #dee2e6' }}
                          >
                            <td style={{ padding: '0.8rem' }}>{usuario.id}</td>
                            <td style={{ padding: '0.8rem' }}>{usuario.username}</td>
                            <td style={{ padding: '0.8rem' }}>{usuario.email}</td>
                            <td style={{ padding: '0.8rem' }}>{usuario.rol}</td>
                            <td style={{ padding: '0.8rem' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  justifyContent: 'center',
                                  flexWrap: 'wrap'
                                }}
                              >
                                {Number(usuario.id) !== Number(usuarioActual?.id) && (
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarUsuario(usuario)}
                                    disabled={
                                      procesandoId === `eliminar-usuario-${usuario.id}`
                                    }
                                    style={{
                                      padding: '0.45rem 0.7rem',
                                      border: 'none',
                                      borderRadius: '6px',
                                      backgroundColor:
                                        procesandoId === `eliminar-usuario-${usuario.id}`
                                          ? '#868e96'
                                          : '#e03131',
                                      color: '#fff',
                                      cursor: 'pointer',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {procesandoId === `eliminar-usuario-${usuario.id}`
                                      ? '⏳ Eliminando...'
                                      : '🗑️ Eliminar'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setPaginaUsuarios((pagina) => Math.max(1, pagina - 1))} disabled={paginaUsuarios === 1}>
                      Anterior
                    </button>
                    <span>Página {paginaUsuarios} de {totalPaginasUsuarios}</span>
                    <button type="button" onClick={() => setPaginaUsuarios((pagina) => Math.min(totalPaginasUsuarios, pagina + 1))} disabled={paginaUsuarios === totalPaginasUsuarios}>
                      Siguiente
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {seccion === 'locales' && (
            <section>
              <h2>🏪 Gestión de locales</h2>

              {locales.length === 0 ? (
                <p>No hay locales registrados.</p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '1rem'
                  }}
                >
                  {locales.map((local) => (
                    <article
                      key={local.id}
                      style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '10px',
                        padding: '1rem',
                        backgroundColor: '#fff'
                      }}
                    >
                      <h3>{local.nombre}</h3>

                      <p>
                        <strong>Dirección:</strong> {local.direccion}
                      </p>

                      <p>
                        <strong>Estado administrativo:</strong>{' '}
                        <span
                          style={{
                            color: Number(local.es_activo) === 1
                              ? '#2b8a3e'
                              : '#e03131',
                            fontWeight: 'bold'
                          }}
                        >
                          {Number(local.es_activo) === 1
                            ? 'Activo'
                            : 'Inactivo'}
                        </span>
                      </p>

                      <p>
                        <strong>Recepción:</strong>{' '}
                        {Number(local.esta_operativo) === 1
                          ? 'Operativa'
                          : 'Cerrada temporalmente'}
                      </p>

                      <div
                        style={{
                          marginTop: '1rem',
                          padding: '0.8rem',
                          backgroundColor: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '7px'
                        }}
                      >
                        <strong>Información del perfil del local</strong>

                        <p style={{ margin: '0.5rem 0 0' }}>
                          <strong>Teléfono:</strong>{' '}
                          {local.telefono || 'No informado'}
                        </p>

                        <p style={{ margin: '0.35rem 0 0' }}>
                          <strong>Costo de envío:</strong>{' '}
                          {local.costo_envio_base !== null && local.costo_envio_base !== undefined
                            ? `$${Number(local.costo_envio_base).toFixed(2)}`
                            : 'No informado'}
                        </p>

                        <p style={{ margin: '0.35rem 0 0' }}>
                          <strong>Preparación promedio:</strong>{' '}
                          {local.tiempo_preparacion_promedio
                            ? `${local.tiempo_preparacion_promedio} minutos`
                            : 'No informado'}
                        </p>

                        <p style={{ margin: '0.35rem 0 0' }}>
                          <strong>Horarios:</strong>{' '}
                          {local.horarios?.length
                            ? `${local.horarios.length} turno(s) configurado(s)`
                            : 'Sin horarios configurados'}
                        </p>
                      </div>

                      <div style={{ marginTop: '1rem' }}>
                        <strong>Imágenes del perfil</strong>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '0.5rem',
                            marginTop: '0.5rem'
                          }}
                        >
                          {[
                            ['Logo', local.logo_url],
                            ['Banner', local.banner_url],
                            ['Foto', local.foto_url]
                          ].map(([etiqueta, ruta]) => {
                            const imagen = resolverImagenLocal(ruta);

                            return (
                              <div key={etiqueta} style={{ textAlign: 'center' }}>
                                {imagen ? (
                                  <img
                                    src={imagen}
                                    alt={`${etiqueta} de ${local.nombre}`}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                    style={{
                                      width: '100%',
                                      height: '70px',
                                      objectFit: 'cover',
                                      borderRadius: '5px',
                                      border: '1px solid #dee2e6'
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      height: '70px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      backgroundColor: '#e9ecef',
                                      borderRadius: '5px',
                                      color: '#868e96',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    Sin imagen
                                  </div>
                                )}
                                <small style={{ display: 'block', marginTop: '0.25rem' }}>
                                  {etiqueta}
                                </small>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '0.7rem',
                          flexWrap: 'wrap',
                          marginTop: '1rem'
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleLocal(local)}
                          disabled={procesandoId === `local-${local.id}`}
                          style={{
                            flex: 1,
                            minWidth: '140px',
                            padding: '0.6rem 1rem',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor:
                              Number(local.es_activo) === 1
                                ? '#e03131'
                                : '#2b8a3e',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {procesandoId === `local-${local.id}`
                            ? '⏳ Procesando...'
                            : Number(local.es_activo) === 1
                              ? 'Deshabilitar local'
                              : 'Habilitar local'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLocalHorariosAbiertos(null);
                            iniciarEdicionLocal(local);
                          }}
                          style={{
                            flex: 1,
                            minWidth: '140px',
                            padding: '0.6rem 1rem',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#1c7ed6',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          ✏️ Editar datos administrativos
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLocalEditando(null);
                            consultarHorariosLocal(local);
                          }}
                          disabled={loadingHorarios && localHorariosAbiertos === local.id}
                          style={{
                            flex: 1,
                            minWidth: '140px',
                            padding: '0.6rem 1rem',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#845ef7',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          📅 Ver horarios
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {localEditando !== null && localSeleccionado && (
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    justify: 'center',
                    alignItems: 'center',
                    padding: '1rem',
                    zIndex: 2000
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '650px',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1.2rem'
                      }}
                    >
                      <div>
                        <h2 style={{ margin: 0 }}>✏️ Editar datos administrativos</h2>
                        <p style={{ margin: '0.3rem 0 0', color: '#666' }}>
                          {localSeleccionado.nombre}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={cancelarEdicionLocal}
                        disabled={procesandoId === `editar-local-${localEditando}`}
                        style={{
                          border: 'none',
                          backgroundColor: '#f1f3f5',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          fontSize: '1.1rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <form
                      onSubmit={guardarCambiosLocal}
                      style={{
                        display: 'grid',
                        gap: '1rem'
                      }}
                    >
                      <label>
                        <strong>Nombre del local</strong>
                        <input
                          name="nombre"
                          value={formLocal.nombre}
                          onChange={handleFormLocalChange}
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          required
                          style={{
                            width: '100%',
                            padding: '0.7rem',
                            marginTop: '0.35rem',
                            boxSizing: 'border-box',
                            border: '1px solid #ced4da',
                            borderRadius: '6px'
                          }}
                        />
                      </label>

                      <label>
                        <strong>Dirección</strong>
                        <input
                          name="direccion"
                          value={formLocal.direccion}
                          onChange={handleFormLocalChange}
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          required
                          style={{
                            width: '100%',
                            padding: '0.7rem',
                            marginTop: '0.35rem',
                            boxSizing: 'border-box',
                            border: '1px solid #ced4da',
                            borderRadius: '6px'
                          }}
                        />
                      </label>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.8rem'
                        }}
                      >
                        <label>
                          <strong>Latitud</strong>
                          <input
                            name="latitud"
                            type="number"
                            step="any"
                            value={formLocal.latitud}
                            onChange={handleFormLocalChange}
                            disabled={procesandoId === `editar-local-${localEditando}`}
                            required
                            style={{
                              width: '100%',
                              padding: '0.7rem',
                              marginTop: '0.35rem',
                              boxSizing: 'border-box',
                              border: '1px solid #ced4da',
                              borderRadius: '6px'
                            }}
                          />
                        </label>

                        <label>
                          <strong>Longitud</strong>
                          <input
                            name="longitud"
                            type="number"
                            step="any"
                            value={formLocal.longitud}
                            onChange={handleFormLocalChange}
                            disabled={procesandoId === `editar-local-${localEditando}`}
                            required
                            style={{
                              width: '100%',
                              padding: '0.7rem',
                              marginTop: '0.35rem',
                              boxSizing: 'border-box',
                              border: '1px solid #ced4da',
                              borderRadius: '6px'
                            }}
                          />
                        </label>
                      </div>

                      <div
                        style={{
                          padding: '0.8rem',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                          border: '1px solid #dee2e6'
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          <strong>Usuario asociado:</strong>{' '}
                          {localSeleccionado.usuario_admin ||
                            `ID ${localSeleccionado.IDusuario}`}
                        </p>

                        <p style={{ margin: '0.4rem 0 0' }}>
                          <strong>Email:</strong>{' '}
                          {localSeleccionado.email_admin || 'No informado'}
                        </p>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          color: '#1864ab',
                          fontSize: '0.85rem'
                        }}
                      >
                        Solo podés modificar el nombre, la dirección y la ubicación
                        del local. El teléfono, las imágenes, el costo de envío y el
                        tiempo de preparación se gestionan desde el perfil del local.
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: '#1864ab',
                          fontSize: '0.85rem'
                        }}
                      >
                        📍 Por ahora podés modificar las coordenadas manualmente. En el
                        futuro se seleccionarán colocando un pin en el mapa.
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          gap: '0.8rem',
                          marginTop: '0.5rem'
                        }}
                      >
                        <button
                          type="button"
                          onClick={cancelarEdicionLocal}
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          style={{
                            flex: 1,
                            padding: '0.8rem',
                            border: 'none',
                            borderRadius: '7px',
                            backgroundColor: '#6c757d',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          style={{
                            flex: 1,
                            padding: '0.8rem',
                            border: 'none',
                            borderRadius: '7px',
                            backgroundColor:
                              procesandoId === `editar-local-${localEditando}`
                                ? '#868e96'
                                : '#2b8a3e',
                            color: '#fff',
                            cursor:
                              procesandoId === `editar-local-${localEditando}`
                                ? 'not-allowed'
                                : 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {procesandoId === `editar-local-${localEditando}`
                            ? '⏳ Guardando...'
                            : '💾 Guardar cambios'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {localHorariosAbiertos !== null && localSeleccionado && (
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    justify: 'center',
                    alignItems: 'center',
                    padding: '1rem',
                    zIndex: 2000
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '650px',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.2rem'
                      }}
                    >
                      <div>
                        <h2 style={{ margin: 0 }}>📅 Horarios de atención</h2>
                        <p style={{ margin: '0.3rem 0 0', color: '#666' }}>
                          {localSeleccionado.nombre}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setLocalHorariosAbiertos(null);
                          setHorariosConsultados([]);
                          setErrorHorarios('');
                        }}
                        disabled={loadingHorarios}
                        style={{
                          border: 'none',
                          backgroundColor: '#f1f3f5',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          fontSize: '1.1rem',
                          cursor: loadingHorarios ? 'not-allowed' : 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {loadingHorarios ? (
                      <div
                        style={{
                          padding: '2rem',
                          textAlign: 'center',
                          color: '#7048e8',
                          fontWeight: 'bold'
                        }}
                      >
                        ⏳ Cargando horarios...
                      </div>
                    ) : errorHorarios ? (
                      <div
                        style={{
                          padding: '1rem',
                          backgroundColor: '#fff5f5',
                          color: '#c92a2a',
                          border: '1px solid #ffc9c9',
                          borderRadius: '8px'
                        }}
                      >
                        {errorHorarios}
                      </div>
                    ) : horariosConsultados.length === 0 ? (
                      <div
                        style={{
                          padding: '1rem',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '8px',
                          color: '#666'
                        }}
                      >
                        Este local todavía no tiene horarios configurados.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem'
                        }}
                      >
                        {DIAS_SEMANA.map((dia, diaIndex) => {
                          const horariosDelDia = horariosConsultados.filter(
                            (horario) =>
                              Number(horario.dia_semana) === diaIndex
                          );

                          return (
                            <div
                              key={dia}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.8rem',
                                backgroundColor: '#f8f7ff',
                                border: '1px solid #e5dbff',
                                borderRadius: '7px'
                              }}
                            >
                              <strong>{dia}</strong>

                              {horariosDelDia.length === 0 ? (
                                <span style={{ color: '#e03131' }}>
                                  Cerrado
                                </span>
                              ) : (
                                <div style={{ textAlign: 'right' }}>
                                  {horariosDelDia.map((horario) => (
                                    <div key={horario.id || `${diaIndex}-${horario.hora_apertura}`}>
                                      <span
                                        style={{
                                          color: Number(horario.es_activo) === 1
                                            ? '#2b8a3e'
                                            : '#d9480f',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        {String(horario.hora_apertura).slice(0, 5)}
                                        {' - '}
                                        {String(horario.hora_cierre).slice(0, 5)}
                                      </span>

                                      {Number(horario.es_activo) !== 1 && (
                                        <small
                                          style={{
                                            display: 'block',
                                            color: '#d9480f'
                                          }}
                                        >
                                          Horario inactivo
                                        </small>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setLocalHorariosAbiertos(null);
                        setHorariosConsultados([]);
                        setErrorHorarios('');
                      }}
                      disabled={loadingHorarios}
                      style={{
                        width: '100%',
                        marginTop: '1.2rem',
                        padding: '0.8rem',
                        border: 'none',
                        borderRadius: '7px',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        cursor: loadingHorarios ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {seccion === 'repartidores' && (
            <section>
              <h2>🚴 Gestión de repartidores</h2>

              <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ffe066', borderRadius: '10px', backgroundColor: '#fff9db' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#795000' }}>📄 Solicitudes de vehículos pendientes</h3>
                    <p style={{ margin: '0.35rem 0 0', color: '#856404' }}>
                      Revisá la documentación antes de aprobar un vehículo.
                    </p>
                  </div>
                  <strong style={{ color: '#795000' }}>{solicitudesVehiculos.length} pendiente(s)</strong>
                </div>

                {solicitudesVehiculos.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.7rem', marginTop: '1rem' }}>
                    {solicitudesVehiculos.map((solicitud) => (
                      <div key={solicitud.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.8rem', backgroundColor: '#fff', border: '1px solid #ffe066', borderRadius: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <strong>
                              {[solicitud.nombre, solicitud.apellido].filter(Boolean).join(' ') || solicitud.username}
                            </strong>

                            {/* 🏷️ Badge distintivo según el tipo de solicitud */}
                            {solicitud.estado === 'PENDIENTE_BAJA' ? (
                              <span style={{ backgroundColor: '#ffe3e3', color: '#e03131', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                ❌ Solicitud de Baja
                              </span>
                            ) : Number(solicitud.es_nuevo_vehiculo) === 1 ? (
                              <span style={{ backgroundColor: '#e7f5ff', color: '#1c7ed6', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                🆕 Solicitud de Nuevo Vehículo
                              </span>
                            ) : (
                              <span style={{ backgroundColor: '#fff9db', color: '#f59f00', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                📄 Solicitud de Nueva Documentación
                              </span>
                            )}
                          </div>

                          <div style={{ color: '#666', fontSize: '0.9rem' }}>
                            {solicitud.tipo_vehiculo} · {solicitud.marca || 'Sin marca'} {solicitud.modelo || ''} {solicitud.patente ? `· ${solicitud.patente}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => setDocumentacionVehiculo(solicitud)}>
                            👁️ Ver detalle
                          </button>

                          <button
                            type="button"
                            onClick={() => evaluarSolicitudVehiculo(solicitud, 'APROBADO')}
                            disabled={procesandoId === `vehiculo-${solicitud.id}`}
                            style={{ backgroundColor: solicitud.estado === 'PENDIENTE_BAJA' ? '#e03131' : '#2b8a3e', color: '#fff', border: 'none', borderRadius: '5px', padding: '0.5rem 0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            {solicitud.estado === 'PENDIENTE_BAJA' ? '✅ Confirmar Baja' : '✅ Aprobar'}
                          </button>

                          {/* Botón de Rechazo Dinámico según el tipo de solicitud */}
                          <button
                            type="button"
                            onClick={() => evaluarSolicitudVehiculo(solicitud, 'RECHAZADO')}
                            disabled={procesandoId === `vehiculo-${solicitud.id}`}
                            style={{
                              backgroundColor: solicitud.estado === 'PENDIENTE_BAJA' ? '#d9480f' : '#e03131',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '5px',
                              padding: '0.5rem 0.7rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            {solicitud.estado === 'PENDIENTE_BAJA'
                              ? '❌ Rechazar Baja'
                              : Number(solicitud.es_nuevo_vehiculo) === 1
                                ? '❌ Rechazar Vehículo Nuevo'
                                : '❌ Rechazar Solicitud'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ❌ SECCIÓN DE SOLICITUDES DE BAJA DE VEHÍCULOS */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #ffc9c9', borderRadius: '10px', backgroundColor: '#fff5f5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#c92a2a' }}>❌ Solicitudes de Baja de Vehículos</h3>
                    <p style={{ margin: '0.35rem 0 0', color: '#666' }}>
                      Vehículos que los repartidores solicitaron dar de baja.
                    </p>
                  </div>
                  <strong style={{ color: '#c92a2a' }}>{vehiculosBaja.length} pendiente(s)</strong>
                </div>

                {vehiculosBaja.length > 0 && (
                  <div style={{ display: 'grid', gap: '0.7rem', marginTop: '1rem' }}>
                    {vehiculosBaja.map((baja) => {
                      const idVehiculoBaja = baja.id || baja.IDvehiculo;

                      return (
                        <div
                          key={idVehiculoBaja}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.8rem', backgroundColor: '#fff', border: '1px solid #ffc9c9', borderRadius: '8px' }}
                        >
                          <div>
                            <strong>{[baja.nombre, baja.apellido].filter(Boolean).join(' ') || baja.username}</strong>
                            <div style={{ color: '#666', fontSize: '0.9rem' }}>
                              {baja.tipo_vehiculo} · {baja.marca || ''} {baja.modelo || ''} {baja.patente ? `(${baja.patente})` : ''} · Email: {baja.email}
                            </div>
                          </div>

                          {/* Contenedor de Botones de Acción */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => handleAprobarBaja(idVehiculoBaja)}
                              disabled={procesandoId === `baja-${idVehiculoBaja}` || procesandoId === `baja-rechazar-${idVehiculoBaja}`}
                              style={{ backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '5px', padding: '0.5rem 0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              {procesandoId === `baja-${idVehiculoBaja}` ? '⏳ Procesando...' : '✅ Aprobar Baja'}
                            </button>

                            <button
                              type="button"
                              onClick={() => iniciarRechazoBaja(idVehiculoBaja)}
                              disabled={procesandoId === `baja-${idVehiculoBaja}` || procesandoId === `baja-rechazar-${idVehiculoBaja}`}
                              style={{ backgroundColor: '#e03131', color: '#fff', border: 'none', borderRadius: '5px', padding: '0.5rem 0.9rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              ❌ Rechazar Baja
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {vehiculoARechazarBaja !== null && (
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    justify: 'center',
                    alignItems: 'center',
                    padding: '1rem',
                    zIndex: 3500
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#c92a2a' }}>
                        {solicitudARechazar?.es_nuevo_vehiculo
                          ? '❌ Rechazar Alta de Vehículo Nuevo'
                          : '❌ Motivo del rechazo de la solicitud'}
                      </h3>

                      <button
                        type="button"
                        onClick={() => setSolicitudARechazar(null)}
                        style={{
                          border: 'none',
                          backgroundColor: '#f1f3f5',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={confirmarRechazoBaja}>
                      <label style={{ display: 'block', marginBottom: '1rem' }}>
                        <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Ingresá el motivo por el cual se rechaza la baja del vehículo:
                        </span>
                        <textarea
                          value={motivoRechazoBaja}
                          onChange={(e) => setMotivoRechazoBaja(e.target.value)}
                          rows={4}
                          required
                          placeholder="Ej: La documentación presentada sigue vigente..."
                          style={{
                            width: '100%',
                            padding: '0.7rem',
                            boxSizing: 'border-box',
                            border: '1px solid #ced4da',
                            borderRadius: '6px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </label>

                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button
                          type="button"
                          onClick={() => setVehiculoARechazarBaja(null)}
                          style={{
                            flex: 1,
                            padding: '0.7rem',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#6c757d',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={procesandoId === `baja-rechazar-${vehiculoARechazarBaja}`}
                          style={{
                            flex: 1,
                            padding: '0.7rem',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#e03131',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {procesandoId === `baja-rechazar-${vehiculoARechazarBaja}` ? '⏳ Procesando...' : 'Confirmar Rechazo'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {solicitudARechazar !== null && (
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    justify: 'center',
                    alignItems: 'center',
                    padding: '1rem',
                    zIndex: 3500
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '500px',
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#c92a2a' }}>❌ Motivo del rechazo de la solicitud</h3>
                      <button
                        type="button"
                        onClick={() => setSolicitudARechazar(null)}
                        style={{ border: 'none', backgroundColor: '#f1f3f5', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={confirmarRechazoSolicitud}>
                      <label style={{ display: 'block', marginBottom: '1rem' }}>
                        <span style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          Ingresá el motivo por el cual se rechaza esta solicitud:
                        </span>
                        <textarea
                          value={motivoRechazoSolicitud}
                          onChange={(e) => setMotivoRechazoSolicitud(e.target.value)}
                          rows={4}
                          required
                          placeholder="Ej: La documentación adjunta no es legible..."
                          style={{
                            width: '100%',
                            padding: '0.7rem',
                            boxSizing: 'border-box',
                            border: '1px solid #ced4da',
                            borderRadius: '6px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </label>

                      <div style={{ display: 'flex', gap: '0.8rem' }}>
                        <button
                          type="button"
                          onClick={() => setSolicitudARechazar(null)}
                          style={{
                            flex: 1,
                            padding: '0.7rem',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#6c757d',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={procesandoId === `vehiculo-${solicitudARechazar.id}`}
                          style={{
                            flex: 1,
                            padding: '0.7rem',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: '#e03131',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                          }}
                        >
                          {procesandoId === `vehiculo-${solicitudARechazar.id}` ? '⏳ Procesando...' : 'Confirmar Rechazo'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {repartidores.length === 0 ? (
                <p>No hay repartidores registrados.</p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      margin: '1rem 0 0.5rem'
                    }}
                  >
                    <small style={{ color: '#666' }}>
                      Mostrando {(paginaRepartidores - 1) * registrosPorPagina + 1} - {Math.min(paginaRepartidores * registrosPorPagina, repartidores.length)} de {repartidores.length}
                    </small>
                    <label style={{ fontSize: '0.9rem' }}>
                      Ver{' '}
                      <select value={registrosPorPagina} onChange={cambiarRegistrosPorPagina}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>{' '}
                      registros
                    </label>
                  </div>

                  <TablaConScrollSuperior minWidth="1150px">
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginTop: '1rem'
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#e9ecef' }}>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>
                            ID
                          </th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>
                            Usuario
                          </th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>
                            Email
                          </th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>
                            DNI
                          </th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>
                            Vehículo
                          </th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>
                            Disponibilidad
                          </th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>
                            Validación
                          </th>
                          <th style={{ padding: '0.8rem' }}>
                            Acciones
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {repartidoresVisibles.map((rep) => (
                          <tr
                            key={rep.id}
                            style={{ borderBottom: '1px solid #dee2e6' }}
                          >
                            <td style={{ padding: '0.8rem' }}>{rep.id}</td>
                            <td style={{ padding: '0.8rem' }}>{rep.username}</td>
                            <td style={{ padding: '0.8rem' }}>{rep.email}</td>
                            <td style={{ padding: '0.8rem' }}>{rep.dni}</td>

                            {/* Visualización ajustada en tabla principal */}
                            <td style={{ padding: '0.8rem' }}>
                              {rep.tipo_vehiculo ? (
                                <div>
                                  <strong>{rep.tipo_vehiculo}</strong>
                                  {(() => {
                                    const esBici = rep.tipo_vehiculo.toLowerCase().includes('bici');
                                    const detalles = [rep.marca, rep.modelo].filter(Boolean).join(' ');

                                    if (esBici) {
                                      return detalles ? (
                                        <small style={{ display: 'block', color: '#666' }}>
                                          {detalles}
                                        </small>
                                      ) : null;
                                    }

                                    return (
                                      <small style={{ display: 'block', color: '#666' }}>
                                        {detalles} {rep.patente ? `(${rep.patente})` : ''}
                                      </small>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span style={{ color: '#868e96' }}>Sin vehículo</span>
                              )}
                            </td>

                            <td style={{ padding: '0.8rem' }}>
                              <span
                                style={{
                                  color:
                                    Number(rep.disponible) === 1
                                      ? '#2b8a3e'
                                      : '#6c757d',
                                  fontWeight: 'bold'
                                }}
                              >
                                {Number(rep.disponible) === 1
                                  ? '🟢 Disponible'
                                  : '⚪ No disponible'}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem' }}>
                              <span
                                style={{
                                  color: Number(rep.validado) === 1 ? '#2b8a3e' : '#d9480f',
                                  fontWeight: 'bold'
                                }}
                              >
                                {Number(rep.validado) === 1 ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td style={{ padding: '0.8rem' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: '0.5rem',
                                  flexWrap: 'wrap'
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => abrirDetalleRepartidor(rep)}
                                  style={{
                                    padding: '0.45rem 0.7rem',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor: '#1c7ed6',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  👁️ Ver detalle
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleValidarRepartidor(rep)}
                                  disabled={procesandoId === `repartidor-${rep.id}`}
                                  style={{
                                    padding: '0.45rem 0.7rem',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor:
                                      Number(rep.validado) === 1
                                        ? '#e03131'
                                        : '#2b8a3e',
                                    color: '#fff',
                                    cursor:
                                      procesandoId === `repartidor-${rep.id}`
                                        ? 'not-allowed'
                                        : 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {procesandoId === `repartidor-${rep.id}`
                                    ? '⏳ Procesando...'
                                    : Number(rep.validado) === 1
                                      ? '❌ Invalidar'
                                      : '✅ Validar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TablaConScrollSuperior>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setPaginaRepartidores((pagina) => Math.max(1, pagina - 1))} disabled={paginaRepartidores === 1}>
                      Anterior
                    </button>
                    <span>Página {paginaRepartidores} de {totalPaginasRepartidores}</span>
                    <button type="button" onClick={() => setPaginaRepartidores((pagina) => Math.min(totalPaginasRepartidores, pagina + 1))} disabled={paginaRepartidores === totalPaginasRepartidores}>
                      Siguiente
                    </button>
                  </div>
                </>
              )}

              {documentacionVehiculo && (
                <div
                  role="dialog"
                  aria-modal="true"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 4000,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    justify: 'center',
                    alignItems: 'center',
                    padding: '1rem'
                  }}
                >
                  <div style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '10px', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0 }}>📄 Detalle de Solicitud de Vehículo</h3>
                      <button type="button" onClick={() => setDocumentacionVehiculo(null)}>✕</button>
                    </div>

                    {/* Indicador de Tipo de Solicitud */}
                    <div style={{
                      padding: '0.8rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      backgroundColor: Number(documentacionVehiculo.es_nuevo_vehiculo) === 1 ? '#e7f5ff' : '#fff9db',
                      border: Number(documentacionVehiculo.es_nuevo_vehiculo) === 1 ? '1px solid #74c0fc' : '1px solid #ffe066'
                    }}>
                      <strong>Tipo de Solicitud: </strong>
                      <h4 style={{ marginTop: '1.2rem', marginBottom: '0.5rem' }}>
                        {Number(documentacionVehiculo.es_nuevo_vehiculo) === 1
                          ? 'Documentación Completa Presentada para el Alta'
                          : 'Archivos y Fechas de Vencimiento Actualizados'}
                      </h4>
                    </div>

                    <p>
                      <strong>Repartidor:</strong>{' '}
                      {[documentacionVehiculo.nombre, documentacionVehiculo.apellido].filter(Boolean).join(' ') || documentacionVehiculo.username}
                    </p>

                    <p>
                      <strong>Vehículo:</strong> {documentacionVehiculo.tipo_vehiculo} · {documentacionVehiculo.marca || 'Sin marca'} {documentacionVehiculo.modelo || ''} {documentacionVehiculo.patente ? `(${documentacionVehiculo.patente})` : ''}
                    </p>

                    {/* Sección de Documentos y Fechas de Vencimiento */}
                    {/* Sección de Documentos y Fechas de Vencimiento */}
                    <h4 style={{ marginTop: '1.2rem', marginBottom: '0.5rem' }}>
                      {documentacionVehiculo.es_nuevo_vehiculo
                        ? 'Documentación Presentada'
                        : 'Archivos y Vencimientos Actualizados'}
                    </h4>

                    {(() => {
                      // 1. Mapeamos la lista completa de documentos disponibles
                      const listaDocumentos = [
                        {
                          etiqueta: 'Cédula Verde',
                          ruta: documentacionVehiculo.cedula_url,
                          vencimiento: documentacionVehiculo.fecha_vencimiento_cedula
                        },
                        {
                          etiqueta: 'Seguro Obligatorio',
                          ruta: documentacionVehiculo.seguro_url,
                          vencimiento: documentacionVehiculo.fecha_vencimiento_seguro
                        },
                        {
                          etiqueta: 'Licencia de Conducir',
                          ruta: documentacionVehiculo.licencia_url,
                          vencimiento: documentacionVehiculo.fecha_vencimiento_licencia
                        }
                      ];

                      // 2. Si no es un vehículo nuevo, filtramos para mostrar SOLO aquellos campos que incluyan un nuevo archivo o fecha
                      const documentosAMostrar = documentacionVehiculo.es_nuevo_vehiculo
                        ? listaDocumentos
                        : listaDocumentos.filter(doc => Boolean(doc.ruta) || Boolean(doc.vencimiento));

                      if (documentosAMostrar.length === 0) {
                        return (
                          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666', fontStyle: 'italic' }}>
                            No se adjuntaron nuevos archivos ni fechas de vencimiento en esta solicitud.
                          </div>
                        );
                      }

                      return documentosAMostrar.map(({ etiqueta, ruta, vencimiento }) => {
                        const url = resolverDocumento(ruta);
                        const fechaFormateada = vencimiento ? new Date(vencimiento).toLocaleDateString('es-AR') : null;
                        const estaVencido = vencimiento ? new Date(vencimiento) < new Date() : false;

                        return (
                          <div
                            key={etiqueta}
                            style={{
                              marginBottom: '1rem',
                              padding: '0.8rem',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px',
                              backgroundColor: !documentacionVehiculo.es_nuevo_vehiculo ? '#fffde7' : '#fff' // Resaltado especial si es actualización
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong>{etiqueta}</strong>

                              {/* Fecha de vencimiento si fue enviada */}
                              {vencimiento && (
                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: estaVencido ? '#e03131' : '#2b8a3e' }}>
                                  Vence: {fechaFormateada} {estaVencido ? '(⚠️ VENCIDO)' : ''}
                                </span>
                              )}
                            </div>

                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '0.35rem', color: '#1c7ed6', fontWeight: '500' }}>
                                🔗 Abrir nuevo archivo enviado
                              </a>
                            ) : (
                              <p style={{ color: '#868e96', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                                {documentacionVehiculo.es_nuevo_vehiculo ? 'No presentado' : 'Sin nuevo archivo adjunto (Mantiene anterior)'}
                              </p>
                            )}

                            {url && /\.(jpg|jpeg|png|gif|webp)$/i.test(url) && (
                              <img
                                src={url}
                                alt={etiqueta}
                                style={{ maxWidth: '100%', maxHeight: '180px', display: 'block', marginTop: '0.5rem', objectFit: 'contain', borderRadius: '4px' }}
                              />
                            )}
                          </div>
                        );
                      });
                    })()}

                    {/* Botones de Evaluación en el Modal */}
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
                      <button
                        type="button"
                        onClick={() => evaluarSolicitudVehiculo(documentacionVehiculo, 'APROBADO')}
                        disabled={procesandoId === `vehiculo-${documentacionVehiculo.id}`}
                        style={{
                          flex: 1,
                          backgroundColor:
                            documentacionVehiculo.estado === 'PENDIENTE_BAJA'
                              ? '#e03131'
                              : '#2b8a3e',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.7rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        {documentacionVehiculo.estado === 'PENDIENTE_BAJA'
                          ? '✅ Aprobar Baja (Eliminar/Desactivar vehículo)'
                          : `✅ Aprobar ${documentacionVehiculo.es_nuevo_vehiculo
                            ? 'Vehículo'
                            : 'Renovación'
                          }`}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          evaluarSolicitudVehiculo(documentacionVehiculo, 'RECHAZADO')
                        }
                        disabled={procesandoId === `vehiculo-${documentacionVehiculo.id}`}
                        style={{
                          flex: 1,
                          backgroundColor: '#6c757d',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.7rem',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Rechazar Solicitud
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de detalle de repartidor ajustado */}
              {repartidorSeleccionado && (() => {
                const vehiculoActivo = repartidorSeleccionado.vehiculos?.find(
                  (v) => Number(v.id) === Number(repartidorSeleccionado.IDvehiculo_activo)
                ) || repartidorSeleccionado;

                const tipoVehiculo = vehiculoActivo?.tipo_vehiculo || repartidorSeleccionado.tipo_vehiculo;
                const esBici = tipoVehiculo?.toLowerCase().includes('bici');

                return (
                  <div
                    role="dialog"
                    aria-modal="true"
                    onClick={cerrarDetalleRepartidor}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 3000,
                      backgroundColor: 'rgba(0, 0, 0, 0.55)',
                      display: 'flex',
                      justify: 'center',
                      alignItems: 'center',
                      padding: '1rem'
                    }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        backgroundColor: '#fff',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          marginBottom: '1.2rem'
                        }}
                      >
                        <div>
                          <h2 style={{ margin: 0 }}>🚴 Detalle del repartidor</h2>
                          <p style={{ margin: '0.3rem 0 0', color: '#666' }}>
                            Repartidor #{repartidorSeleccionado.id}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={cerrarDetalleRepartidor}
                          style={{
                            border: 'none',
                            backgroundColor: '#f1f3f5',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            fontSize: '1.1rem',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '0.8rem'
                        }}
                      >
                        <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Usuario</strong>
                          <p style={{ margin: '0.3rem 0 0' }}>{repartidorSeleccionado.username || 'No informado'}</p>
                        </div>

                        <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Email</strong>
                          <p style={{ margin: '0.3rem 0 0' }}>{repartidorSeleccionado.email || 'No informado'}</p>
                        </div>

                        <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>DNI</strong>
                          <p style={{ margin: '0.3rem 0 0' }}>{repartidorSeleccionado.dni || 'No informado'}</p>
                        </div>

                        {/* Tipo de Vehículo Activo */}
                        <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Tipo de vehículo</strong>
                          <p style={{ margin: '0.3rem 0 0' }}>{tipoVehiculo || 'No informado'}</p>
                        </div>

                        {/* Marca: en Auto/Moto siempre; en Bici SOLO si tiene valor */}
                        {(!esBici || vehiculoActivo?.marca) && (
                          <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <strong>Marca</strong>
                            <p style={{ margin: '0.3rem 0 0' }}>{vehiculoActivo?.marca || 'No informada'}</p>
                          </div>
                        )}

                        {/* Modelo: en Auto/Moto siempre; en Bici SOLO si tiene valor */}
                        {(!esBici || vehiculoActivo?.modelo) && (
                          <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <strong>Modelo</strong>
                            <p style={{ margin: '0.3rem 0 0' }}>{vehiculoActivo?.modelo || 'No informado'}</p>
                          </div>
                        )}

                        {/* Patente: se muestra SOLO en Auto / Moto */}
                        {!esBici && (
                          <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                            <strong>Patente</strong>
                            <p style={{ margin: '0.3rem 0 0' }}>{vehiculoActivo?.patente || 'No informada'}</p>
                          </div>
                        )}

                        <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Disponibilidad</strong>
                          <p
                            style={{
                              margin: '0.3rem 0 0',
                              color: Number(repartidorSeleccionado.disponible) === 1 ? '#2b8a3e' : '#6c757d',
                              fontWeight: 'bold'
                            }}
                          >
                            {Number(repartidorSeleccionado.disponible) === 1 ? '🟢 Disponible' : '⚪ No disponible'}
                          </p>
                        </div>

                        <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Estado de validación</strong>
                          <p
                            style={{
                              margin: '0.3rem 0 0',
                              color: Number(repartidorSeleccionado.validado) === 1 ? '#2b8a3e' : '#d9480f',
                              fontWeight: 'bold'
                            }}
                          >
                            {Number(repartidorSeleccionado.validado) === 1 ? '✅ Validado' : '⏳ Pendiente de validación'}
                          </p>
                        </div>

                        <div style={{ padding: '0.9rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Fecha de registro</strong>
                          <p style={{ margin: '0.3rem 0 0' }}>
                            {repartidorSeleccionado.creado_en
                              ? new Date(repartidorSeleccionado.creado_en).toLocaleString('es-AR')
                              : 'No informada'}
                          </p>
                        </div>
                      </div>

                      {(repartidorSeleccionado.latitud !== null ||
                        repartidorSeleccionado.longitud !== null) && (
                          <div
                            style={{
                              marginTop: '1rem',
                              padding: '1rem',
                              backgroundColor: '#e7f5ff',
                              borderRadius: '8px',
                              color: '#1864ab'
                            }}
                          >
                            <strong>Última ubicación registrada</strong>
                            <p style={{ margin: '0.4rem 0 0', fontFamily: 'monospace' }}>
                              Latitud: {repartidorSeleccionado.latitud ?? 'No disponible'}<br />
                              Longitud: {repartidorSeleccionado.longitud ?? 'No disponible'}
                            </p>
                            {repartidorSeleccionado.ultima_ubicacion && (
                              <small>
                                Última actualización:{' '}
                                {new Date(repartidorSeleccionado.ultima_ubicacion).toLocaleString('es-AR')}
                              </small>
                            )}
                          </div>
                        )}

                      {/* Lista de todos los vehículos asociados */}
                      {/* Lista de todos los vehículos asociados */}
                      <div style={{ marginTop: '1.2rem' }}>
                        <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1.1rem' }}>
                          🚗 Vehículos Asociados y Estado Documental
                        </h3>

                        {(!repartidorSeleccionado.vehiculos ||
                          repartidorSeleccionado.vehiculos.length === 0) ? (
                          <div style={{ padding: '0.8rem', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
                            El repartidor no posee vehículos registrados.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {repartidorSeleccionado.vehiculos.map((v) => {
                              const esActivo =
                                Number(repartidorSeleccionado.IDvehiculo_activo) === Number(v.id);

                              const esBici =
                                v.tipo_vehiculo?.toLowerCase().includes('bici');

                              return (
                                <div
                                  key={v.id}
                                  style={{
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: esActivo
                                      ? '2px solid #1c7ed6'
                                      : '1px solid #dee2e6',
                                    backgroundColor: esActivo
                                      ? '#f8f9fa'
                                      : '#ffffff'
                                  }}
                                >

                                  {/* CABECERA DEL VEHÍCULO */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      flexWrap: 'wrap',
                                      gap: '0.5rem'
                                    }}
                                  >
                                    <strong style={{ fontSize: '1rem' }}>
                                      {v.tipo_vehiculo} · {v.marca} {v.modelo}{' '}
                                      {v.patente ? `(${v.patente})` : ''}
                                    </strong>

                                    {/* Badges de Estado */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        alignItems: 'center',
                                        flexWrap: 'wrap'
                                      }}
                                    >
                                      {/* Vehículo activo actual */}
                                      {/* Badges de Estado diferenciados */}
                                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {esActivo && (
                                          <span style={{ backgroundColor: '#1c7ed6', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            ACTIVO ACTUAL
                                          </span>
                                        )}

                                        {/* Diferenciación entre Baja y Rechazado */}
                                        {v.estado === 'BAJA' || (Number(v.activo) === 0 && !v.motivo_rechazo) ? (
                                          <span style={{ backgroundColor: '#ffe3e3', color: '#e03131', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            ❌ Vehículo dado de baja
                                          </span>
                                        ) : v.estado === 'RECHAZADO' || v.motivo_rechazo ? (
                                          <span style={{ backgroundColor: '#fff5f5', color: '#c92a2a', border: '1px solid #ffc9c9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            🚫 Vehículo Rechazado
                                          </span>
                                        ) : (
                                          <span style={{ backgroundColor: '#d3f9d8', color: '#2b8a3e', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            Activo ({v.estado || 'PENDIENTE'})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {v.motivo_rechazo && (
                                    <p style={{ margin: '0.5rem 0 0', color: '#e03131', fontSize: '0.85rem' }}>
                                      <strong>Motivo de rechazo:</strong> {v.motivo_rechazo}
                                    </p>
                                  )}

                                  {/* Estado de Documentación y Fechas de Vencimiento */}
                                  {!esBici && (
                                    <div style={{ marginTop: '0.8rem', borderTop: '1px solid #e9ecef', paddingTop: '0.8rem' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <small style={{ fontWeight: 'bold', color: '#495057', fontSize: '0.9rem' }}>
                                          Estado de Documentación:
                                        </small>

                                        <span
                                          style={{
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '4px',
                                            backgroundColor: v.documentacion_valida ? '#e6fcf5' : '#fff5f5',
                                            color: v.documentacion_valida ? '#0ca678' : '#e03131',
                                            border: `1px solid ${v.documentacion_valida ? '#96f2d7' : '#ffc9c9'}`
                                          }}
                                        >
                                          {v.documentacion_valida ? '✅ VÁLIDA / VIGENTE' : '⚠️ INVÁLIDA O CON VENCIMIENTOS'}
                                        </span>
                                      </div>

                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', fontSize: '0.85rem' }}>
                                        {/* Licencia */}
                                        <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: v.licencia_vencida ? '#fff5f5' : '#f8f9fa', border: `1px solid ${v.licencia_vencida ? '#ffc9c9' : '#dee2e6'}` }}>
                                          <div><strong>Licencia:</strong></div>
                                          <div style={{ color: v.licencia_vencida ? '#e03131' : '#2b8a3e', fontWeight: 'bold' }}>
                                            Vence: {v.fecha_vencimiento_licencia || 'N/A'} {v.licencia_vencida ? '(VENCIDA)' : ''}
                                          </div>
                                          {v.licencia_url ? (
                                            <a href={resolverDocumento(v.licencia_url)} target="_blank" rel="noreferrer" style={{ color: '#1c7ed6', textDecoration: 'underline', fontSize: '0.8rem' }}>
                                              🔗 Ver archivo
                                            </a>
                                          ) : (
                                            <span style={{ color: '#868e96', fontSize: '0.8rem' }}>Sin adjunto</span>
                                          )}
                                        </div>

                                        {/* Seguro */}
                                        <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: v.seguro_vencida ? '#fff5f5' : '#f8f9fa', border: `1px solid ${v.seguro_vencido ? '#ffc9c9' : '#dee2e6'}` }}>
                                          <div><strong>Seguro:</strong></div>
                                          <div style={{ color: v.seguro_vencido ? '#e03131' : '#2b8a3e', fontWeight: 'bold' }}>
                                            Vence: {v.fecha_vencimiento_seguro || 'N/A'} {v.seguro_vencido ? '(VENCIDO)' : ''}
                                          </div>
                                          {v.seguro_url ? (
                                            <a href={resolverDocumento(v.seguro_url)} target="_blank" rel="noreferrer" style={{ color: '#1c7ed6', textDecoration: 'underline', fontSize: '0.8rem' }}>
                                              🔗 Ver archivo
                                            </a>
                                          ) : (
                                            <span style={{ color: '#868e96', fontSize: '0.8rem' }}>Sin adjunto</span>
                                          )}
                                        </div>

                                        {/* Cédula */}
                                        <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: v.cedula_vencida ? '#fff5f5' : '#f8f9fa', border: `1px solid ${v.cedula_vencida ? '#ffc9c9' : '#dee2e6'}` }}>
                                          <div><strong>Cédula:</strong></div>
                                          <div style={{ color: v.cedula_vencida ? '#e03131' : '#2b8a3e', fontWeight: 'bold' }}>
                                            Vence: {v.fecha_vencimiento_cedula || 'N/A'} {v.cedula_vencida ? '(VENCIDA)' : ''}
                                          </div>
                                          {v.cedula_url ? (
                                            <a href={resolverDocumento(v.cedula_url)} target="_blank" rel="noreferrer" style={{ color: '#1c7ed6', textDecoration: 'underline', fontSize: '0.8rem' }}>
                                              🔗 Ver archivo
                                            </a>
                                          ) : (
                                            <span style={{ color: '#868e96', fontSize: '0.8rem' }}>Sin adjunto</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={cerrarDetalleRepartidor}
                        style={{
                          width: '100%',
                          marginTop: '1.2rem',
                          padding: '0.8rem',
                          border: 'none',
                          borderRadius: '7px',
                          backgroundColor: '#6c757d',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          {seccion === 'clientes' && (
            <section>
              <h2>🧑‍🤝‍🧑 Gestión de clientes</h2>

              {clientes.length === 0 ? (
                <p>No hay clientes registrados.</p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      margin: '1rem 0 0.5rem'
                    }}
                  >
                    <small style={{ color: '#666' }}>
                      Mostrando {(paginaClientes - 1) * registrosPorPagina + 1} - {Math.min(paginaClientes * registrosPorPagina, clientes.length)} de {clientes.length}
                    </small>
                    <label style={{ fontSize: '0.9rem' }}>
                      Ver{' '}
                      <select value={registrosPorPagina} onChange={cambiarRegistrosPorPagina}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>{' '}
                      registros
                    </label>
                  </div>

                  <TablaConScrollSuperior minWidth="1150px">
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        marginTop: '1rem'
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: '#e9ecef' }}>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>ID</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Usuario</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Nombre completo</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Email</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Teléfono</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Dirección</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Coordenadas</th>
                          <th style={{ padding: '0.8rem', textAlign: 'left' }}>Registro</th>
                          <th style={{ padding: '0.8rem', textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {clientesVisibles.map((cliente) => (
                          <tr
                            key={cliente.id}
                            style={{ borderBottom: '1px solid #dee2e6' }}
                          >
                            <td style={{ padding: '0.8rem' }}>{cliente.id}</td>
                            <td style={{ padding: '0.8rem' }}>{cliente.username}</td>
                            <td style={{ padding: '0.8rem' }}>
                              {[cliente.nombre, cliente.apellido].filter(Boolean).join(' ') || 'No informado'}
                            </td>
                            <td style={{ padding: '0.8rem' }}>{cliente.email}</td>
                            <td style={{ padding: '0.8rem' }}>{cliente.telefono || 'No informado'}</td>
                            <td style={{ padding: '0.8rem' }}>
                              <div>{cliente.direccion}</div>
                              {(cliente.piso || cliente.departamento) && (
                                <small style={{ color: '#666' }}>
                                  {cliente.piso ? `Piso ${cliente.piso}` : ''}
                                  {cliente.departamento ? ` - Depto. ${cliente.departamento}` : ''}
                                </small>
                              )}
                              {cliente.referencia && (
                                <small style={{ display: 'block', color: '#666' }}>
                                  Ref.: {cliente.referencia}
                                </small>
                              )}
                            </td>
                            <td style={{ padding: '0.8rem' }}>
                              {cliente.latitud !== null && cliente.longitud !== null ? (
                                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                  {Number(cliente.latitud).toFixed(6)}<br />
                                  {Number(cliente.longitud).toFixed(6)}
                                </span>
                              ) : (
                                <span style={{ color: '#868e96' }}>No asignadas</span>
                              )}
                            </td>
                            <td style={{ padding: '0.8rem' }}>
                              {cliente.creado_en
                                ? new Date(cliente.creado_en).toLocaleDateString('es-AR')
                                : 'No informado'}
                            </td>
                            <td style={{ padding: '0.8rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => consultarHistorialCliente(cliente)}
                                style={{
                                  padding: '0.45rem 0.7rem',
                                  border: 'none',
                                  borderRadius: '6px',
                                  backgroundColor: '#7048e8',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                📜 Ver pedidos
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TablaConScrollSuperior>

                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setPaginaClientes((pagina) => Math.max(1, pagina - 1))} disabled={paginaClientes === 1}>
                      Anterior
                    </button>
                    <span>Página {paginaClientes} de {totalPaginasClientes}</span>
                    <button type="button" onClick={() => setPaginaClientes((pagina) => Math.min(totalPaginasClientes, pagina + 1))} disabled={paginaClientes === totalPaginasClientes}>
                      Siguiente
                    </button>
                  </div>
                </>
              )}

              {/* Modal del Historial de Pedidos */}
              {clienteHistorialSeleccionado && (
                <div
                  role="dialog"
                  aria-modal="true"
                  onClick={cerrarHistorialCliente}
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 3000,
                    backgroundColor: 'rgba(0, 0, 0, 0.55)',
                    display: 'flex',
                    justify: 'center',
                    alignItems: 'center',
                    padding: '1rem'
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      maxWidth: '700px',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      backgroundColor: '#fff',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                      <div>
                        <h2 style={{ margin: 0 }}>📜 Historial de Pedidos</h2>
                        <p style={{ margin: '0.3rem 0 0', color: '#666' }}>
                          Cliente: {[clienteHistorialSeleccionado.nombre, clienteHistorialSeleccionado.apellido].filter(Boolean).join(' ') || clienteHistorialSeleccionado.username}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={cerrarHistorialCliente}
                        style={{
                          border: 'none',
                          backgroundColor: '#f1f3f5',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          fontSize: '1.1rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {loadingHistorial ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#7048e8', fontWeight: 'bold' }}>
                        ⏳ Cargando historial de pedidos...
                      </div>
                    ) : errorHistorial ? (
                      <div style={{ padding: '1rem', backgroundColor: '#fff5f5', color: '#c92a2a', borderRadius: '8px' }}>
                        {errorHistorial}
                      </div>
                    ) : historialPedidos.length === 0 ? (
                      <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666', textAlign: 'center' }}>
                        Este cliente aún no ha realizado ningún pedido.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f3f5' }}>
                            <th style={{ padding: '0.6rem', textAlign: 'left' }}>Orden #</th>
                            <th style={{ padding: '0.6rem', textAlign: 'left' }}>Fecha</th>
                            <th style={{ padding: '0.6rem', textAlign: 'left' }}>Local(es)</th>
                            <th style={{ padding: '0.6rem', textAlign: 'left' }}>Estado</th>
                            <th style={{ padding: '0.6rem', textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historialPedidos.map((pedido) => (
                            <tr key={pedido.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                              <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>#{pedido.id}</td>
                              <td style={{ padding: '0.6rem', fontSize: '0.9rem' }}>
                                {pedido.creado_en ? new Date(pedido.creado_en).toLocaleString('es-AR') : '-'}
                              </td>
                              <td style={{ padding: '0.6rem', fontSize: '0.9rem' }}>{pedido.locales || 'N/A'}</td>
                              <td style={{ padding: '0.6rem' }}>
                                <span
                                  style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold',
                                    backgroundColor: pedido.estado === 'Entregado' ? '#d3f9d8' : pedido.estado === 'Cancelado' ? '#ffe3e3' : '#e7f5ff',
                                    color: pedido.estado === 'Entregado' ? '#2b8a3e' : pedido.estado === 'Cancelado' ? '#e03131' : '#1c7ed6'
                                  }}
                                >
                                  {pedido.estado}
                                </span>
                              </td>
                              <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 'bold' }}>
                                ${Number(pedido.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <button
                      type="button"
                      onClick={cerrarHistorialCliente}
                      style={{
                        width: '100%',
                        marginTop: '1.2rem',
                        padding: '0.8rem',
                        border: 'none',
                        borderRadius: '7px',
                        backgroundColor: '#6c757d',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};