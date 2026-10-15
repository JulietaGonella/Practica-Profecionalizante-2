// src/components/Admin/PanelAdministrador.jsx
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
import { CambiarPasswordModal } from '../CambiarPasswordModal';
import { TableroAdministrador } from './TableroAdministrador';
import './CSS/Administrador.css';

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

// --- Iconos (trazos estilo Lucide, sin dependencias adicionales) ---
const ICONS = {
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  key: <><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></>,
  plus: <><path d="M5 12h14" /><path d="M12 5v14" /></>,
  dashboard: <><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  store: <><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M9 20v-6h6v6" /></>,
  bike: <><circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" /></>,
  car: <><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" /><circle cx="7" cy="17" r="2" /><path d="M9 17h6" /><circle cx="17" cy="17" r="2" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  pencil: <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />,
  calendar: <><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></>,
  eye: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  checkCircle: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  xCircle: <><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  file: <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  external: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  history: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  ban: <><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>,
  save: <><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></>,
  power: <><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.77.04" /></>,
  inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>
};

const Icon = ({ name, size = 16 }) => (
  <svg
    className="admin-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {ICONS[name]}
  </svg>
);

const Badge = ({ tone = 'neutral', icon, dot = false, children }) => (
  <span className={`admin-badge admin-badge--${tone}`}>
    {dot && <span className="admin-dot" aria-hidden="true" />}
    {icon && <Icon name={icon} size={12} />}
    {children}
  </span>
);

const Spinner = () => <span className="admin-spinner" aria-hidden="true" />;

// Solo visual: los textos de los avisos conservan sus emojis en la lógica,
// pero se muestran sin ellos porque la interfaz usa iconos.
const sinEmoji = (texto = '') =>
  String(texto)
    .replace(/[\u2300-\u23FF\u2600-\u27BF\u{1F300}-\u{1FAFF}\uFE0F\u200D]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const inicialDe = (texto) => String(texto || '?').trim().charAt(0).toUpperCase() || '?';

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

  // Estados para modales estéticos
  const [modalAviso, setModalAviso] = useState(null);
  const [modalConfirmacion, setModalConfirmacion] = useState(null);

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
        solicitudesPendientesData,
        solicitudesDocData,
        alertasData,
        bajasData
      ] = await Promise.all([
        getUsuariosAdmin(),
        getLocalesAdmin(),
        getRepartidoresAdmin(),
        getClientesAdmin(),
        getSolicitudesVehiculosAdmin('PENDIENTE'),
        getSolicitudesVehiculosAdmin('PENDIENTE_DOCUMENTACION'),
        getAlertasDocumentacionAdmin(),
        getVehiculosPendientesBajaAdmin()
      ]);

      const solicitudesCombinadas = [
        ...(Array.isArray(solicitudesPendientesData) ? solicitudesPendientesData : []),
        ...(Array.isArray(solicitudesDocData) ? solicitudesDocData : [])
      ];

      setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      setLocales(Array.isArray(localesData) ? localesData : []);
      setRepartidores(Array.isArray(repartidoresData) ? repartidoresData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setSolicitudesVehiculos(solicitudesCombinadas);
      setAlertasDoc(Array.isArray(alertasData) ? alertasData : []);
      setVehiculosBaja(Array.isArray(bajasData) ? bajasData : []);

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
      setModalAviso({
        titulo: '⚠️ Acción no permitida',
        mensaje: 'No podés eliminar tu propia cuenta.'
      });
      return;
    }

    setModalConfirmacion({
      titulo: '⚠️ Confirmar Eliminación',
      mensaje: `¿Seguro que querés eliminar al usuario "${usuario.username}"?`,
      onConfirm: async () => {
        setModalConfirmacion(null);
        try {
          setProcesandoId(`eliminar-usuario-${usuario.id}`);
          await eliminarUsuarioAdmin(usuario.id);
          await cargarDatos();
          setModalAviso({
            titulo: '✅ Éxito',
            mensaje: 'Usuario eliminado correctamente.'
          });
        } catch (err) {
          setModalAviso({
            titulo: '⚠️ Error',
            mensaje: err.response?.data?.error || 'No se pudo eliminar el usuario.'
          });
        } finally {
          setProcesandoId(null);
        }
      }
    });
  };

  const handleToggleLocal = async (local) => {
    try {
      setProcesandoId(`local-${local.id}`);
      await toggleActivoLocalAdmin(local.id);
      await cargarDatos();
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo cambiar el estado administrativo del local.'
      });
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
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo cambiar la validación del repartidor.'
      });
    } finally {
      setProcesandoId(null);
    }
  };

  const handleAprobarBaja = async (idVehiculo) => {
    setModalConfirmacion({
      titulo: '⚠️ Aprobar Baja de Vehículo',
      mensaje: '¿Estás seguro de aprobar la baja definitiva de este vehículo? Se desvinculará del repartidor.',
      onConfirm: async () => {
        setModalConfirmacion(null);
        try {
          setProcesandoId(`baja-${idVehiculo}`);
          await aprobarBajaVehiculoAdmin(idVehiculo);
          await cargarDatos();
          setModalAviso({
            titulo: '✅ Éxito',
            mensaje: '✅ Baja de vehículo aprobada correctamente.'
          });
        } catch (err) {
          setModalAviso({
            titulo: '⚠️ Error',
            mensaje: err.response?.data?.error || 'No se pudo procesar la baja del vehículo.'
          });
        } finally {
          setProcesandoId(null);
        }
      }
    });
  };

  const obtenerInfoVehiculo = (solicitudOVehiculo) => {
    if (!solicitudOVehiculo) {
      return { esBici: false, esMoto: false, esAuto: false, tieneDocumentacion: true, icono: '🚗', etiqueta: 'Vehículo' };
    }

    const v = solicitudOVehiculo.vehiculo || solicitudOVehiculo.documentacion_nueva || solicitudOVehiculo;

    const idTipo = Number(
      v.IDtipo_vehiculo ||
      v.id_tipo_vehiculo ||
      v.tipo_vehiculo_id ||
      solicitudOVehiculo.IDtipo_vehiculo ||
      solicitudOVehiculo.id_tipo_vehiculo ||
      (typeof v.tipo_vehiculo === 'object' ? v.tipo_vehiculo?.id : null)
    );

    const rawTipo = typeof v.tipo_vehiculo === 'object'
      ? (v.tipo_vehiculo?.nombre || v.tipo_vehiculo?.tipo)
      : (v.tipo_vehiculo || v.nombre_tipo || v.tipo || solicitudOVehiculo.tipo_vehiculo || '');

    const tipoTexto = String(rawTipo).toLowerCase().trim();

    const esBici = idTipo === 1 || idTipo === 2 || tipoTexto.includes('bici');
    const esMoto = idTipo === 3 || tipoTexto.includes('moto');
    const esAuto = idTipo === 4 || tipoTexto.includes('auto');

    const tieneDocumentacion = !esBici;

    let icono = '🚗';
    let etiqueta = 'Auto';

    if (esBici) {
      icono = '🚲';
      etiqueta = 'Bicicleta';
    } else if (esMoto) {
      icono = '🏍️';
      etiqueta = 'Motocicleta';
    }

    return { esBici, esMoto, esAuto, tieneDocumentacion, icono, etiqueta };
  };

  const iniciarRechazoBaja = (idVehiculo) => {
    setVehiculoARechazarBaja(idVehiculo);
    setMotivoRechazoBaja('');
  };

  const confirmarRechazoBaja = async (e) => {
    e.preventDefault();
    if (!motivoRechazoBaja.trim()) {
      setModalAviso({
        titulo: '⚠️ Dato Obligatorio',
        mensaje: 'El motivo del rechazo es obligatorio.'
      });
      return;
    }

    try {
      setProcesandoId(`baja-rechazar-${vehiculoARechazarBaja}`);
      await rechazarBajaVehiculoAdmin(vehiculoARechazarBaja, motivoRechazoBaja.trim());
      await cargarDatos();
      setVehiculoARechazarBaja(null);
      setMotivoRechazoBaja('');
      setModalAviso({
        titulo: '✅ Solicitud Rechazada',
        mensaje: '❌ La solicitud de baja del vehículo fue rechazada correctamente.'
      });
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo rechazar la baja del vehículo.'
      });
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
      setSolicitudARechazar(solicitud);
      setMotivoRechazoSolicitud('');
      return;
    }

    try {
      setProcesandoId(`vehiculo-${solicitud.id}`);
      await evaluarSolicitudVehiculoAdmin(solicitud.id, estado, '');
      await cargarDatos();
      if (documentacionVehiculo?.id === solicitud.id) setDocumentacionVehiculo(null);
      setModalAviso({
        titulo: '✅ Éxito',
        mensaje: '✅ Solicitud procesada correctamente.'
      });
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo evaluar la solicitud.'
      });
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarRechazoSolicitud = async (e) => {
    e.preventDefault();
    if (!motivoRechazoSolicitud.trim()) {
      setModalAviso({
        titulo: '⚠️ Dato Obligatorio',
        mensaje: 'El motivo del rechazo es obligatorio.'
      });
      return;
    }

    try {
      setProcesandoId(`vehiculo-${solicitudARechazar.id}`);

      const esNuevaDoc = solicitudARechazar.estado === 'PENDIENTE_DOCUMENTACION' || Number(solicitudARechazar.es_nuevo_vehiculo) === 0;
      const estadoEnvio = esNuevaDoc ? 'RECHAZADO_DOCUMENTACION' : 'RECHAZADO';

      await evaluarSolicitudVehiculoAdmin(
        solicitudARechazar.id,
        estadoEnvio,
        motivoRechazoSolicitud.trim()
      );

      await cargarDatos();
      if (documentacionVehiculo?.id === solicitudARechazar.id) setDocumentacionVehiculo(null);
      setSolicitudARechazar(null);
      setMotivoRechazoSolicitud('');
      setModalAviso({
        titulo: '✅ Solicitud Rechazada',
        mensaje: '❌ La solicitud fue rechazada correctamente.'
      });
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo rechazar la solicitud.'
      });
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

      setModalAviso({
        titulo: '✅ Éxito',
        mensaje: '✅ Local actualizado correctamente.'
      });
    } catch (err) {
      console.error('Error al actualizar local:', err);

      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || err.response?.data?.message || 'No se pudieron guardar los cambios del local.'
      });
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

  const tabs = [
    { id: 'tablero', etiqueta: 'Tablero general', icono: 'dashboard', total: null },
    { id: 'usuarios', etiqueta: 'Usuarios', icono: 'users', total: usuarios.length },
    { id: 'locales', etiqueta: 'Locales', icono: 'store', total: locales.length },
    { id: 'repartidores', etiqueta: 'Repartidores', icono: 'bike', total: repartidores.length },
    { id: 'clientes', etiqueta: 'Clientes', icono: 'user', total: clientes.length }
  ];

  const avisoExitoso = modalAviso?.titulo?.includes('✅');

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="admin-brand__mark" aria-hidden="true">
            <Icon name="shield" size={24} />
          </span>
          <div>
            <h1>Panel de administración</h1>
            <p>Gestión general del sistema SmartDrop</p>
          </div>
        </div>

        <div className="admin-header__actions">
          <button
            onClick={() => setMostrarCambioPass(true)}
            className="admin-btn admin-btn--outline"
          >
            <Icon name="key" />
            Cambiar contraseña
          </button>

          <LogoutButton />
        </div>
      </header>

      {/* BANNER DE ALERTAS DE DOCUMENTACIÓN VENCIDA O POR VENCER */}
      {alertasDoc.length > 0 && (
        <div className="admin-alert-banner" role="alert">
          <div className="admin-alert-banner__head">
            <h3 className="admin-alert-banner__title">
              <Icon name="alert" size={18} />
              Alertas de documentación vencida o por vencer
            </h3>
            <Badge tone="error">{alertasDoc.length} alerta(s)</Badge>
          </div>

          <div className="admin-alert-list">
            {alertasDoc.map((alerta, index) => {
              const esHoy = alerta.estado === 'VENCE_HOY';

              return (
                <div
                  key={`${alerta.repartidor_id}-${alerta.documento}-${index}`}
                  className={`admin-alert-item ${esHoy ? 'admin-alert-item--hoy' : ''}`}
                >
                  <div>
                    <strong>{alerta.repartidor}</strong>
                    <small style={{ display: 'block' }}>
                      {alerta.vehiculo} · {alerta.email}
                    </small>
                  </div>

                  <div className="admin-alert-item__meta">
                    <span>
                      <Icon name="file" size={14} /> <strong>{alerta.documento}:</strong> {alerta.fecha_vencimiento}
                    </span>

                    {esHoy ? (
                      <Badge tone="warning" icon="clock">Vence hoy</Badge>
                    ) : (
                      <Badge tone="error" icon="xCircle">Vencido</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Renderizado condicional del modal de cambio de clave */}
      {mostrarCambioPass && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-content" style={{ maxWidth: '400px' }}>
            <CambiarPasswordModal
              esObligatorio={false}
              onClose={() => setMostrarCambioPass(false)}
            />
          </div>
        </div>
      )}

      <div className="admin-toolbar">
        <nav className="admin-nav-tabs" aria-label="Secciones del panel">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeccion(tab.id)}
              className={`admin-tab-btn ${seccion === tab.id ? 'active' : ''}`}
              aria-current={seccion === tab.id ? 'page' : undefined}
            >
              <Icon name={tab.icono} />
              {tab.etiqueta}
              {!loading && tab.total !== null && (
                <span className="admin-tab-count">{tab.total}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-toolbar__actions">
          <button
            onClick={() => navigate('/admin/crear-cuenta')}
            className="admin-btn admin-btn--primary"
          >
            <Icon name="plus" />
            Crear cuenta y perfil
          </button>

          <button
            onClick={() => navigate('/admin/crear-admin')}
            className="admin-btn admin-btn--outline"
          >
            <Icon name="plus" />
            Crear admin
          </button>
        </div>
      </div>

      <div className="admin-search">
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
      </div>

      {loading ? (
        <div className="admin-state" role="status">
          <Spinner />
          Cargando información...
        </div>
      ) : error ? (
        <div className="admin-state admin-state--error" role="alert">
          <Icon name="alert" size={24} />
          {error}
        </div>
      ) : (
        <>
          {seccion === 'tablero' && <TableroAdministrador />}

          {seccion === 'usuarios' && (
            <section>
              <h2 className="admin-section-title">
                <span className="admin-section-title__icon"><Icon name="users" size={20} /></span>
                Gestión de usuarios
              </h2>

              {usuarios.length === 0 ? (
                <div className="admin-state">
                  <Icon name="inbox" size={28} />
                  No hay usuarios registrados.
                </div>
              ) : (
                <>
                  <div className="admin-table-meta">
                    <span>
                      Mostrando {(paginaUsuarios - 1) * registrosPorPagina + 1} - {Math.min(paginaUsuarios * registrosPorPagina, usuarios.length)} de {usuarios.length}
                    </span>
                    <label>
                      Ver
                      <select className="admin-select" value={registrosPorPagina} onChange={cambiarRegistrosPorPagina}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      registros
                    </label>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table admin-table--stack">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Usuario</th>
                          <th>Email</th>
                          <th>Rol</th>
                          <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {usuariosVisibles.length === 0 && (
                          <tr>
                            <td colSpan={5} className="admin-table__empty">No hay resultados para tu búsqueda.</td>
                          </tr>
                        )}

                        {usuariosVisibles.map((usuario) => (
                          <tr key={usuario.id}>
                            <td data-label="ID" className="admin-cell-num">{usuario.id}</td>
                            <td data-label="Usuario">
                              <div className="admin-user">
                                <span className="admin-avatar" aria-hidden="true">{inicialDe(usuario.username)}</span>
                                {usuario.username}
                              </div>
                            </td>
                            <td data-label="Email">{usuario.email}</td>
                            <td data-label="Rol"><Badge tone="neutral">{usuario.rol}</Badge></td>
                            <td data-label="Acciones">
                              <div className="admin-cell-actions-group">
                                {Number(usuario.id) !== Number(usuarioActual?.id) && (
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarUsuario(usuario)}
                                    disabled={
                                      procesandoId === `eliminar-usuario-${usuario.id}`
                                    }
                                    className="admin-btn admin-btn--sm admin-btn--danger-soft"
                                  >
                                    {procesandoId === `eliminar-usuario-${usuario.id}` ? (
                                      <><Spinner /> Eliminando...</>
                                    ) : (
                                      <><Icon name="trash" size={14} /> Eliminar</>
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="admin-pagination">
                    <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => setPaginaUsuarios((pagina) => Math.max(1, pagina - 1))} disabled={paginaUsuarios === 1}>
                      <Icon name="chevronLeft" size={14} /> Anterior
                    </button>
                    <span>Página <strong>{paginaUsuarios}</strong> de {totalPaginasUsuarios}</span>
                    <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => setPaginaUsuarios((pagina) => Math.min(totalPaginasUsuarios, pagina + 1))} disabled={paginaUsuarios === totalPaginasUsuarios}>
                      Siguiente <Icon name="chevronRight" size={14} />
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {seccion === 'locales' && (
            <section>
              <h2 className="admin-section-title">
                <span className="admin-section-title__icon"><Icon name="store" size={20} /></span>
                Gestión de locales
              </h2>

              {locales.length === 0 ? (
                <div className="admin-state">
                  <Icon name="inbox" size={28} />
                  No hay locales registrados.
                </div>
              ) : (
                <div className="admin-card-grid">
                  {locales.map((local) => (
                    <article key={local.id} className="admin-card">
                      <div>
                        <div className="admin-card__head">
                          <h3>{local.nombre}</h3>
                          {Number(local.es_activo) === 1 ? (
                            <Badge tone="success" icon="checkCircle">Activo</Badge>
                          ) : (
                            <Badge tone="error" icon="ban">Inactivo</Badge>
                          )}
                        </div>
                        <p className="admin-card__address">
                          <Icon name="pin" size={14} />
                          {local.direccion}
                        </p>
                      </div>

                      <dl className="admin-kv">
                        <div>
                          <dt>Estado administrativo</dt>
                          <dd>{Number(local.es_activo) === 1 ? 'Activo' : 'Inactivo'}</dd>
                        </div>
                        <div>
                          <dt>Recepción</dt>
                          <dd>
                            {Number(local.esta_operativo) === 1 ? (
                              <Badge tone="success" dot>Operativa</Badge>
                            ) : (
                              <Badge tone="neutral" icon="clock">Cerrada temporalmente</Badge>
                            )}
                          </dd>
                        </div>
                      </dl>

                      <div className="admin-card__section">
                        <h4 className="admin-section-label">Información del perfil del local</h4>
                        <dl className="admin-kv">
                          <div>
                            <dt>Teléfono</dt>
                            <dd>{local.telefono || 'No informado'}</dd>
                          </div>
                          <div>
                            <dt>Costo de envío</dt>
                            <dd>
                              {local.costo_envio_base !== null && local.costo_envio_base !== undefined
                                ? `$${Number(local.costo_envio_base).toFixed(2)}`
                                : 'No informado'}
                            </dd>
                          </div>
                          <div>
                            <dt>Preparación promedio</dt>
                            <dd>
                              {local.tiempo_preparacion_promedio
                                ? `${local.tiempo_preparacion_promedio} minutos`
                                : 'No informado'}
                            </dd>
                          </div>
                          <div>
                            <dt>Horarios</dt>
                            <dd>
                              {local.horarios?.length
                                ? `${local.horarios.length} turno(s) configurado(s)`
                                : 'Sin horarios configurados'}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="admin-card__section">
                        <h4 className="admin-section-label">Imágenes del perfil</h4>
                        <div className="admin-thumbs">
                          {[
                            ['Logo', local.logo_url],
                            ['Banner', local.banner_url],
                            ['Foto', local.foto_url]
                          ].map(([etiqueta, ruta]) => {
                            const imagen = resolverImagenLocal(ruta);

                            return (
                              <div key={etiqueta} className="admin-thumb">
                                {imagen ? (
                                  <img
                                    src={imagen}
                                    alt={`${etiqueta} de ${local.nombre}`}
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="admin-thumb__empty">Sin imagen</div>
                                )}
                                <small>{etiqueta}</small>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="admin-card__actions">
                        <button
                          type="button"
                          onClick={() => handleToggleLocal(local)}
                          disabled={procesandoId === `local-${local.id}`}
                          className={`admin-btn admin-btn--sm admin-btn--grow ${
                            Number(local.es_activo) === 1 ? 'admin-btn--danger-soft' : 'admin-btn--success'
                          }`}
                        >
                          {procesandoId === `local-${local.id}` ? (
                            <><Spinner /> Procesando...</>
                          ) : Number(local.es_activo) === 1 ? (
                            <><Icon name="power" size={14} /> Deshabilitar local</>
                          ) : (
                            <><Icon name="power" size={14} /> Habilitar local</>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLocalHorariosAbiertos(null);
                            iniciarEdicionLocal(local);
                          }}
                          className="admin-btn admin-btn--sm admin-btn--grow admin-btn--outline"
                        >
                          <Icon name="pencil" size={14} />
                          Editar datos administrativos
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLocalEditando(null);
                            consultarHorariosLocal(local);
                          }}
                          disabled={loadingHorarios && localHorariosAbiertos === local.id}
                          className="admin-btn admin-btn--sm admin-btn--grow admin-btn--outline"
                        >
                          <Icon name="calendar" size={14} />
                          Ver horarios
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {localEditando !== null && localSeleccionado && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal-content" role="dialog" aria-modal="true" aria-label="Editar datos administrativos">
                    <div className="admin-modal-head">
                      <div>
                        <h2>Editar datos administrativos</h2>
                        <p>{localSeleccionado.nombre}</p>
                      </div>

                      <button
                        type="button"
                        onClick={cancelarEdicionLocal}
                        disabled={procesandoId === `editar-local-${localEditando}`}
                        className="admin-icon-btn"
                        aria-label="Cerrar"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>

                    <form onSubmit={guardarCambiosLocal} className="admin-form">
                      <label className="admin-field">
                        <span>Nombre del local</span>
                        <input
                          name="nombre"
                          value={formLocal.nombre}
                          onChange={handleFormLocalChange}
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          required
                          className="admin-input"
                        />
                      </label>

                      <label className="admin-field">
                        <span>Dirección</span>
                        <input
                          name="direccion"
                          value={formLocal.direccion}
                          onChange={handleFormLocalChange}
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          required
                          className="admin-input"
                        />
                      </label>

                      <div className="admin-form-grid">
                        <label className="admin-field">
                          <span>Latitud</span>
                          <input
                            name="latitud"
                            type="number"
                            step="any"
                            value={formLocal.latitud}
                            onChange={handleFormLocalChange}
                            disabled={procesandoId === `editar-local-${localEditando}`}
                            required
                            className="admin-input"
                          />
                        </label>

                        <label className="admin-field">
                          <span>Longitud</span>
                          <input
                            name="longitud"
                            type="number"
                            step="any"
                            value={formLocal.longitud}
                            onChange={handleFormLocalChange}
                            disabled={procesandoId === `editar-local-${localEditando}`}
                            required
                            className="admin-input"
                          />
                        </label>
                      </div>

                      <div className="admin-info-item">
                        <span>Usuario asociado</span>
                        <div>
                          {localSeleccionado.usuario_admin ||
                            `ID ${localSeleccionado.IDusuario}`}
                        </div>
                        <span style={{ marginTop: '8px' }}>Email</span>
                        <div>{localSeleccionado.email_admin || 'No informado'}</div>
                      </div>

                      <p className="admin-inline-note admin-inline-note--info">
                        <Icon name="info" size={16} />
                        <span>
                          Solo podés modificar el nombre, la dirección y la ubicación
                          del local. El teléfono, las imágenes, el costo de envío y el
                          tiempo de preparación se gestionan desde el perfil del local.
                        </span>
                      </p>

                      <p className="admin-inline-note admin-inline-note--info">
                        <Icon name="pin" size={16} />
                        <span>
                          Por ahora podés modificar las coordenadas manualmente. En el
                          futuro se seleccionarán colocando un pin en el mapa.
                        </span>
                      </p>

                      <div className="admin-modal-foot">
                        <button
                          type="button"
                          onClick={cancelarEdicionLocal}
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          className="admin-btn admin-btn--outline admin-btn--grow"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={procesandoId === `editar-local-${localEditando}`}
                          className="admin-btn admin-btn--primary admin-btn--grow"
                        >
                          {procesandoId === `editar-local-${localEditando}` ? (
                            <><Spinner /> Guardando...</>
                          ) : (
                            <><Icon name="save" /> Guardar cambios</>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {localHorariosAbiertos !== null && localSeleccionado && (
                <div className="admin-modal-overlay">
                  <div className="admin-modal-content" role="dialog" aria-modal="true" aria-label="Horarios de atención">
                    <div className="admin-modal-head">
                      <div>
                        <h2>Horarios de atención</h2>
                        <p>{localSeleccionado.nombre}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setLocalHorariosAbiertos(null);
                          setHorariosConsultados([]);
                          setErrorHorarios('');
                        }}
                        disabled={loadingHorarios}
                        className="admin-icon-btn"
                        aria-label="Cerrar"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>

                    {loadingHorarios ? (
                      <div className="admin-state" role="status" style={{ border: 'none' }}>
                        <Spinner />
                        Cargando horarios...
                      </div>
                    ) : errorHorarios ? (
                      <div className="admin-inline-note admin-inline-note--error" role="alert">
                        {errorHorarios}
                      </div>
                    ) : horariosConsultados.length === 0 ? (
                      <div className="admin-inline-note">
                        Este local todavía no tiene horarios configurados.
                      </div>
                    ) : (
                      <div className="admin-day-list">
                        {DIAS_SEMANA.map((dia, diaIndex) => {
                          const horariosDelDia = horariosConsultados.filter(
                            (horario) =>
                              Number(horario.dia_semana) === diaIndex
                          );

                          return (
                            <div key={dia} className="admin-day-row">
                              <strong>{dia}</strong>

                              {horariosDelDia.length === 0 ? (
                                <span className="admin-text-error" style={{ fontWeight: 600 }}>
                                  Cerrado
                                </span>
                              ) : (
                                <div className="admin-day-row__times">
                                  {horariosDelDia.map((horario) => (
                                    <div key={horario.id || `${diaIndex}-${horario.hora_apertura}`}>
                                      <span
                                        className={`admin-day-row__time ${
                                          Number(horario.es_activo) === 1 ? '' : 'admin-day-row__time--off'
                                        }`}
                                      >
                                        {String(horario.hora_apertura).slice(0, 5)}
                                        {' - '}
                                        {String(horario.hora_cierre).slice(0, 5)}
                                      </span>

                                      {Number(horario.es_activo) !== 1 && (
                                        <small className="admin-day-row__note">
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

                    <div className="admin-modal-foot">
                      <button
                        type="button"
                        onClick={() => {
                          setLocalHorariosAbiertos(null);
                          setHorariosConsultados([]);
                          setErrorHorarios('');
                        }}
                        disabled={loadingHorarios}
                        className="admin-btn admin-btn--outline admin-btn--block"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {seccion === 'repartidores' && (
            <section>
              <h2 className="admin-section-title">
                <span className="admin-section-title__icon"><Icon name="bike" size={20} /></span>
                Gestión de repartidores
              </h2>

              <div className="admin-panel">
                <div className="admin-panel__head">
                  <div>
                    <h3 className="admin-panel__title">
                      <Icon name="file" size={18} />
                      Solicitudes de vehículos pendientes
                    </h3>
                    <p className="admin-panel__desc">
                      Revisá la documentación antes de aprobar un vehículo.
                    </p>
                  </div>
                  <Badge tone="warning">{solicitudesVehiculos.length} pendiente(s)</Badge>
                </div>

                {solicitudesVehiculos.length > 0 && (
                  <div className="admin-request-list">
                    {solicitudesVehiculos.map((solicitud) => {
                      const vehiculoObjeto = solicitud.vehiculo || solicitud.documentacion_nueva || solicitud;
                      const { esBici } = obtenerInfoVehiculo(vehiculoObjeto);

                      const tipoVehiculo =
                        solicitud.vehiculo?.tipo_vehiculo ||
                        solicitud.tipo_vehiculo ||
                        solicitud.documentacion_nueva?.tipo_vehiculo ||
                        '';

                      const marca =
                        solicitud.vehiculo?.marca ||
                        solicitud.marca ||
                        solicitud.documentacion_nueva?.marca ||
                        '';

                      const modelo =
                        solicitud.vehiculo?.modelo ||
                        solicitud.modelo ||
                        solicitud.documentacion_nueva?.modelo ||
                        '';

                      const patente =
                        solicitud.vehiculo?.patente ||
                        solicitud.patente ||
                        solicitud.documentacion_nueva?.patente ||
                        '';

                      const nombreRepartidor =
                        solicitud.repartidor?.nombre_completo ||
                        [solicitud.nombre, solicitud.apellido].filter(Boolean).join(' ') ||
                        solicitud.username ||
                        'Repartidor';

                      const infoVehiculo =
                        [
                          tipoVehiculo,
                          [marca, modelo].filter(Boolean).join(' '),
                          !esBici && patente ? `(${patente})` : null
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Sin datos de vehículo';

                      return (
                        <div key={solicitud.id} className="admin-request">
                          <div>
                            <div className="admin-request__title">
                              <strong>{nombreRepartidor}</strong>

                              {solicitud.estado === 'PENDIENTE_BAJA' ? (
                                <Badge tone="error" icon="xCircle">Solicitud de baja</Badge>
                              ) : solicitud.estado === 'PENDIENTE_DOCUMENTACION' ||
                                Number(solicitud.es_nuevo_vehiculo) === 0 ? (
                                <Badge tone="warning" icon="file">Nueva documentación</Badge>
                              ) : (
                                <Badge tone="info" icon="plus">Nuevo vehículo</Badge>
                              )}
                            </div>

                            <div className="admin-muted" style={{ fontSize: '0.875rem' }}>
                              {infoVehiculo}
                            </div>
                          </div>

                          <div className="admin-request__actions">
                            <button
                              type="button"
                              className="admin-btn admin-btn--sm admin-btn--outline"
                              onClick={() => setDocumentacionVehiculo(solicitud)}
                            >
                              <Icon name="eye" size={14} />
                              Ver detalle
                            </button>

                            <button
                              type="button"
                              onClick={() => evaluarSolicitudVehiculo(solicitud, 'APROBADO')}
                              disabled={procesandoId === `vehiculo-${solicitud.id}`}
                              className={`admin-btn admin-btn--sm ${
                                solicitud.estado === 'PENDIENTE_BAJA' ? 'admin-btn--danger' : 'admin-btn--success'
                              }`}
                            >
                              {procesandoId === `vehiculo-${solicitud.id}` ? (
                                <><Spinner /> Cargando...</>
                              ) : solicitud.estado === 'PENDIENTE_BAJA' ? (
                                <><Icon name="check" size={14} /> Confirmar baja</>
                              ) : (
                                <><Icon name="check" size={14} /> Aprobar</>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => evaluarSolicitudVehiculo(solicitud, 'RECHAZADO')}
                              disabled={procesandoId === `vehiculo-${solicitud.id}`}
                              className="admin-btn admin-btn--sm admin-btn--danger-soft"
                            >
                              {procesandoId === `vehiculo-${solicitud.id}` ? (
                                <><Spinner /> Cargando...</>
                              ) : (
                                <>
                                  <Icon name="x" size={14} />
                                  {solicitud.estado === 'PENDIENTE_BAJA'
                                    ? 'Rechazar baja'
                                    : Number(solicitud.es_nuevo_vehiculo) === 1
                                      ? 'Rechazar vehículo nuevo'
                                      : 'Rechazar solicitud'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN DE SOLICITUDES DE BAJA DE VEHÍCULOS */}
              <div className="admin-panel admin-panel--danger">
                <div className="admin-panel__head">
                  <div>
                    <h3 className="admin-panel__title">
                      <Icon name="xCircle" size={18} />
                      Solicitudes de baja de vehículos
                    </h3>
                    <p className="admin-panel__desc">
                      Vehículos que los repartidores solicitaron dar de baja.
                    </p>
                  </div>
                  <Badge tone="error">{vehiculosBaja.length} pendiente(s)</Badge>
                </div>

                {vehiculosBaja.length > 0 && (
                  <div className="admin-request-list">
                    {vehiculosBaja.map((baja) => {
                      const idVehiculoBaja = baja.id || baja.IDvehiculo;

                      return (
                        <div key={idVehiculoBaja} className="admin-request">
                          <div>
                            <strong>{[baja.nombre, baja.apellido].filter(Boolean).join(' ') || baja.username}</strong>
                            <div className="admin-muted" style={{ fontSize: '0.875rem' }}>
                              {baja.tipo_vehiculo} · {baja.marca || ''} {baja.modelo || ''} {baja.patente ? `(${baja.patente})` : ''} · Email: {baja.email}
                            </div>
                          </div>

                          <div className="admin-request__actions">
                            <button
                              type="button"
                              onClick={() => handleAprobarBaja(idVehiculoBaja)}
                              disabled={
                                procesandoId === `baja-${idVehiculoBaja}` ||
                                procesandoId === `baja-rechazar-${idVehiculoBaja}`
                              }
                              className="admin-btn admin-btn--sm admin-btn--success"
                            >
                              {procesandoId === `baja-${idVehiculoBaja}` ? (
                                <><Spinner /> Cargando...</>
                              ) : (
                                <><Icon name="check" size={14} /> Aprobar baja</>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => iniciarRechazoBaja(idVehiculoBaja)}
                              disabled={
                                procesandoId === `baja-${idVehiculoBaja}` ||
                                procesandoId === `baja-rechazar-${idVehiculoBaja}`
                              }
                              className="admin-btn admin-btn--sm admin-btn--danger-soft"
                            >
                              {procesandoId === `baja-rechazar-${idVehiculoBaja}` ? (
                                <><Spinner /> Cargando...</>
                              ) : (
                                <><Icon name="x" size={14} /> Rechazar baja</>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {vehiculoARechazarBaja !== null && (
                <div className="admin-modal-overlay" style={{ zIndex: 3500 }}>
                  <div className="admin-modal-content" role="dialog" aria-modal="true" style={{ maxWidth: '500px' }}>
                    <div className="admin-modal-head">
                      <h3 className="admin-text-error">
                        {solicitudARechazar?.es_nuevo_vehiculo
                          ? 'Rechazar alta de vehículo nuevo'
                          : 'Motivo del rechazo de la solicitud'}
                      </h3>

                      <button
                        type="button"
                        onClick={() => setVehiculoARechazarBaja(null)}
                        className="admin-icon-btn"
                        aria-label="Cerrar"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>

                    <form onSubmit={confirmarRechazoBaja}>
                      <label className="admin-field">
                        <span>Ingresá el motivo por el cual se rechaza la baja del vehículo:</span>
                        <textarea
                          value={motivoRechazoBaja}
                          onChange={(e) => setMotivoRechazoBaja(e.target.value)}
                          rows={4}
                          required
                          placeholder="Ej: La documentación presentada sigue vigente..."
                          className="admin-textarea"
                        />
                      </label>

                      <div className="admin-modal-foot">
                        <button
                          type="button"
                          onClick={() => setVehiculoARechazarBaja(null)}
                          className="admin-btn admin-btn--outline admin-btn--grow"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={procesandoId === `baja-rechazar-${vehiculoARechazarBaja}`}
                          className="admin-btn admin-btn--danger admin-btn--grow"
                        >
                          {procesandoId === `baja-rechazar-${vehiculoARechazarBaja}` ? (
                            <><Spinner /> Procesando...</>
                          ) : (
                            'Confirmar rechazo'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {solicitudARechazar !== null && (
                <div className="admin-modal-overlay" style={{ zIndex: 3500 }}>
                  <div className="admin-modal-content" role="dialog" aria-modal="true" style={{ maxWidth: '500px' }}>
                    <div className="admin-modal-head">
                      <h3 className="admin-text-error">Motivo del rechazo de la solicitud</h3>
                      <button
                        type="button"
                        onClick={() => setSolicitudARechazar(null)}
                        className="admin-icon-btn"
                        aria-label="Cerrar"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>

                    <form onSubmit={confirmarRechazoSolicitud}>
                      <label className="admin-field">
                        <span>Ingresá el motivo por el cual se rechaza esta solicitud:</span>
                        <textarea
                          value={motivoRechazoSolicitud}
                          onChange={(e) => setMotivoRechazoSolicitud(e.target.value)}
                          rows={4}
                          required
                          placeholder="Ej: La documentación adjunta no es legible..."
                          className="admin-textarea"
                        />
                      </label>

                      <div className="admin-modal-foot">
                        <button
                          type="button"
                          onClick={() => setSolicitudARechazar(null)}
                          className="admin-btn admin-btn--outline admin-btn--grow"
                        >
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={procesandoId === `vehiculo-${solicitudARechazar.id}`}
                          className="admin-btn admin-btn--danger admin-btn--grow"
                        >
                          {procesandoId === `vehiculo-${solicitudARechazar.id}` ? (
                            <><Spinner /> Procesando...</>
                          ) : (
                            'Confirmar rechazo'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {repartidores.length === 0 ? (
                <div className="admin-state">
                  <Icon name="inbox" size={28} />
                  No hay repartidores registrados.
                </div>
              ) : (
                <>
                  <div className="admin-table-meta">
                    <span>
                      Mostrando {(paginaRepartidores - 1) * registrosPorPagina + 1} - {Math.min(paginaRepartidores * registrosPorPagina, repartidores.length)} de {repartidores.length}
                    </span>
                    <label>
                      Ver
                      <select className="admin-select" value={registrosPorPagina} onChange={cambiarRegistrosPorPagina}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      registros
                    </label>
                  </div>

                  <TablaConScrollSuperior minWidth="1150px">
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>DNI</th>
                            <th>Vehículo</th>
                            <th>Disponibilidad</th>
                            <th>Validación</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>

                        <tbody>
                          {repartidoresVisibles.length === 0 && (
                            <tr>
                              <td colSpan={8} className="admin-table__empty">No hay resultados para tu búsqueda.</td>
                            </tr>
                          )}

                          {repartidoresVisibles.map((rep) => (
                            <tr key={rep.id}>
                              <td className="admin-cell-num">{rep.id}</td>
                              <td>
                                <div className="admin-user">
                                  <span className="admin-avatar" aria-hidden="true">{inicialDe(rep.username)}</span>
                                  {rep.username}
                                </div>
                              </td>
                              <td>{rep.email}</td>
                              <td>{rep.dni}</td>

                              <td>
                                {rep.tipo_vehiculo ? (
                                  <div>
                                    <strong>{rep.tipo_vehiculo}</strong>
                                    {(() => {
                                      const esBici = rep.tipo_vehiculo.toLowerCase().includes('bici');
                                      const detalles = [rep.marca, rep.modelo].filter(Boolean).join(' ');

                                      if (esBici) {
                                        return detalles ? (
                                          <small className="admin-cell-sub">{detalles}</small>
                                        ) : null;
                                      }

                                      return (
                                        <small className="admin-cell-sub">
                                          {detalles} {rep.patente ? `(${rep.patente})` : ''}
                                        </small>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  <span className="admin-muted">Sin vehículo</span>
                                )}
                              </td>

                              <td>
                                {Number(rep.disponible) === 1 ? (
                                  <Badge tone="success" dot>Disponible</Badge>
                                ) : (
                                  <Badge tone="neutral" dot>No disponible</Badge>
                                )}
                              </td>
                              <td>
                                {Number(rep.validado) === 1 ? (
                                  <Badge tone="success" icon="checkCircle">Validado</Badge>
                                ) : (
                                  <Badge tone="warning" icon="clock">Sin validar</Badge>
                                )}
                              </td>
                              <td>
                                <div className="admin-cell-actions-group">
                                  <button
                                    type="button"
                                    onClick={() => abrirDetalleRepartidor(rep)}
                                    className="admin-btn admin-btn--sm admin-btn--info-soft"
                                  >
                                    <Icon name="eye" size={14} />
                                    Ver detalle
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleValidarRepartidor(rep)}
                                    disabled={procesandoId === `repartidor-${rep.id}`}
                                    className={`admin-btn admin-btn--sm ${
                                      Number(rep.validado) === 1 ? 'admin-btn--danger-soft' : 'admin-btn--success'
                                    }`}
                                  >
                                    {procesandoId === `repartidor-${rep.id}` ? (
                                      <><Spinner /> Procesando...</>
                                    ) : Number(rep.validado) === 1 ? (
                                      <><Icon name="x" size={14} /> Invalidar</>
                                    ) : (
                                      <><Icon name="check" size={14} /> Validar</>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TablaConScrollSuperior>

                  <div className="admin-pagination">
                    <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => setPaginaRepartidores((pagina) => Math.max(1, pagina - 1))} disabled={paginaRepartidores === 1}>
                      <Icon name="chevronLeft" size={14} /> Anterior
                    </button>
                    <span>Página <strong>{paginaRepartidores}</strong> de {totalPaginasRepartidores}</span>
                    <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => setPaginaRepartidores((pagina) => Math.min(totalPaginasRepartidores, pagina + 1))} disabled={paginaRepartidores === totalPaginasRepartidores}>
                      Siguiente <Icon name="chevronRight" size={14} />
                    </button>
                  </div>
                </>
              )}

              {documentacionVehiculo && (() => {
                const {
                  id,
                  es_nuevo_vehiculo,
                  repartidor,
                  vehiculo,
                  documentacion_actual,
                  documentacion_nueva,
                  estado
                } = documentacionVehiculo;

                const vehiculoObjeto = vehiculo || documentacion_nueva || documentacionVehiculo;
                const { esBici, tieneDocumentacion, etiqueta } = obtenerInfoVehiculo(vehiculoObjeto);

                const formatearFecha = (fecha) => {
                  if (!tieneDocumentacion || !fecha) return null;
                  const d = new Date(fecha);
                  return isNaN(d.getTime()) ? null : d.toLocaleDateString('es-AR');
                };

                const esActualizacionDoc = estado === 'PENDIENTE_DOCUMENTACION' || Number(es_nuevo_vehiculo) === 0;

                let camposDocumento = tieneDocumentacion ? [
                  {
                    clave: 'cedula',
                    titulo: 'Cédula verde / azul',
                    actualUrl: documentacion_actual?.cedula_url,
                    actualVenc: formatearFecha(documentacion_actual?.fecha_vencimiento_cedula),
                    nuevaUrl: documentacion_nueva?.cedula_url || vehiculo?.cedula_url || documentacionVehiculo.cedula_url,
                    nuevaVenc: formatearFecha(documentacion_nueva?.fecha_vencimiento_cedula || vehiculo?.fecha_vencimiento_cedula || documentacionVehiculo.fecha_vencimiento_cedula),
                    rawActualVenc: documentacion_actual?.fecha_vencimiento_cedula,
                    rawNuevaVenc: documentacion_nueva?.fecha_vencimiento_cedula || vehiculo?.fecha_vencimiento_cedula || documentacionVehiculo.fecha_vencimiento_cedula,
                    rawActualUrl: documentacion_actual?.cedula_url,
                    rawNuevaUrl: documentacion_nueva?.cedula_url || vehiculo?.cedula_url || documentacionVehiculo.cedula_url,
                  },
                  {
                    clave: 'seguro',
                    titulo: 'Seguro obligatorio',
                    actualUrl: documentacion_actual?.seguro_url,
                    actualVenc: formatearFecha(documentacion_actual?.fecha_vencimiento_seguro),
                    nuevaUrl: documentacion_nueva?.seguro_url || vehiculo?.seguro_url || documentacionVehiculo.seguro_url,
                    nuevaVenc: formatearFecha(documentacion_nueva?.fecha_vencimiento_seguro || vehiculo?.fecha_vencimiento_seguro || documentacionVehiculo.fecha_vencimiento_seguro),
                    rawActualVenc: documentacion_actual?.fecha_vencimiento_seguro,
                    rawNuevaVenc: documentacion_nueva?.fecha_vencimiento_seguro || vehiculo?.fecha_vencimiento_seguro || documentacionVehiculo.seguro_url,
                    rawActualUrl: documentacion_actual?.seguro_url,
                    rawNuevaUrl: documentacion_nueva?.seguro_url || vehiculo?.seguro_url || documentacionVehiculo.seguro_url,
                  },
                  {
                    clave: 'licencia',
                    titulo: 'Licencia de conducir',
                    actualUrl: documentacion_actual?.licencia_url,
                    actualVenc: formatearFecha(documentacion_actual?.fecha_vencimiento_licencia),
                    nuevaUrl: documentacion_nueva?.licencia_url || vehiculo?.licencia_url || documentacionVehiculo.licencia_url,
                    nuevaVenc: formatearFecha(documentacion_nueva?.fecha_vencimiento_licencia || vehiculo?.fecha_vencimiento_licencia || documentacionVehiculo.fecha_vencimiento_licencia),
                    rawActualVenc: documentacion_actual?.fecha_vencimiento_licencia,
                    rawNuevaVenc: documentacion_nueva?.fecha_vencimiento_licencia || vehiculo?.fecha_vencimiento_licencia || documentacionVehiculo.fecha_vencimiento_licencia,
                    rawActualUrl: documentacion_actual?.licencia_url,
                    rawNuevaUrl: documentacion_nueva?.licencia_url || vehiculo?.licencia_url || documentacionVehiculo.licencia_url,
                  }
                ] : [];

                if (esActualizacionDoc && tieneDocumentacion) {
                  camposDocumento = camposDocumento.filter(doc => {
                    const cambioVencimiento = Boolean(doc.rawNuevaVenc) && doc.rawNuevaVenc !== doc.rawActualVenc;
                    const cambioUrl = Boolean(doc.rawNuevaUrl) && doc.rawNuevaUrl !== doc.rawActualUrl;

                    const existeEnObjetoNuevo = Boolean(
                      documentacion_nueva && (
                        (doc.clave === 'cedula' && (documentacion_nueva.fecha_vencimiento_cedula || documentacion_nueva.cedula_url)) ||
                        (doc.clave === 'seguro' && (documentacion_nueva.fecha_vencimiento_seguro || documentacion_nueva.seguro_url)) ||
                        (doc.clave === 'licencia' && (documentacion_nueva.fecha_vencimiento_licencia || documentacion_nueva.licencia_url))
                      )
                    );

                    return cambioVencimiento || cambioUrl || existeEnObjetoNuevo;
                  });
                }

                return (
                  <div className="admin-modal-overlay" style={{ zIndex: 4000 }}>
                    <div className="admin-modal-content" role="dialog" aria-modal="true" style={{ maxWidth: '850px' }}>

                      <div className="admin-modal-head">
                        <h3>
                          {esActualizacionDoc
                            ? 'Evaluación de actualización de documentación'
                            : 'Evaluación de alta de vehículo nuevo'}
                        </h3>
                        <button type="button" onClick={() => setDocumentacionVehiculo(null)} className="admin-icon-btn" aria-label="Cerrar">
                          <Icon name="x" size={18} />
                        </button>
                      </div>

                      <div className="admin-info-grid" style={{ marginBottom: '20px' }}>
                        <div className="admin-info-item">
                          <span>Repartidor</span>
                          <div>{repartidor?.nombre_completo || [documentacionVehiculo.nombre, documentacionVehiculo.apellido].filter(Boolean).join(' ') || documentacionVehiculo.username}</div>
                          <small className="admin-cell-sub">{repartidor?.email || documentacionVehiculo.email}</small>
                        </div>
                        <div className="admin-info-item">
                          <span>Vehículo</span>
                          <div>
                            <Icon name={esBici ? 'bike' : 'car'} size={16} /> {etiqueta} - {vehiculo?.marca || documentacionVehiculo.marca || ''} {vehiculo?.modelo || documentacionVehiculo.modelo || ''}
                          </div>
                          <small className="admin-cell-sub">
                            {tieneDocumentacion
                              ? `Patente: ${vehiculo?.patente || documentacionVehiculo.patente || 'Sin registrar'}`
                              : 'Sin patente requerida (Bicicleta)'}
                          </small>
                        </div>
                      </div>

                      {!tieneDocumentacion ? (
                        <div className="admin-inline-note admin-inline-note--info admin-inline-note--center" style={{ justifyContent: 'center' }}>
                          <Icon name="bike" size={16} />
                          <span><strong>Vehículo tipo bicicleta:</strong> no requiere patente, documentación obligatoria ni fechas de vencimiento.</span>
                        </div>
                      ) : camposDocumento.length === 0 ? (
                        <div className="admin-inline-note admin-inline-note--center" style={{ backgroundColor: 'var(--sd-tint-warning)', borderColor: 'var(--sd-line-warning)', color: 'var(--sd-warning)' }}>
                          <Icon name="alert" size={16} /> No se detectaron documentos nuevos o modificados para esta solicitud.
                        </div>
                      ) : (
                        <div className="admin-stack">
                          {camposDocumento.map((doc) => {
                            const urlArchivo = doc.nuevaUrl || doc.actualUrl;
                            const vencimiento = doc.nuevaVenc || doc.actualVenc;

                            return (
                              <div key={doc.titulo} className="admin-doc-card">
                                <h4><Icon name="file" size={16} /> {doc.titulo}</h4>
                                <div className="admin-doc-card__body">
                                  <p>
                                    <strong>Fecha de vencimiento:</strong> {vencimiento || 'No especificada'}
                                  </p>
                                  {urlArchivo ? (
                                    <a href={resolverDocumento(urlArchivo)} target="_blank" rel="noreferrer" className="admin-link">
                                      <Icon name="external" size={14} /> Ver archivo adjunto
                                    </a>
                                  ) : (
                                    <span className="admin-muted">Sin archivo adjunto</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="admin-modal-foot">
                        <button type="button" onClick={() => evaluarSolicitudVehiculo(documentacionVehiculo, 'APROBADO')} disabled={procesandoId === `vehiculo-${id}`} className="admin-btn admin-btn--success admin-btn--grow">
                          <Icon name="check" /> Aprobar solicitud
                        </button>
                        <button type="button" onClick={() => evaluarSolicitudVehiculo(documentacionVehiculo, 'RECHAZADO')} disabled={procesandoId === `vehiculo-${id}`} className="admin-btn admin-btn--danger admin-btn--grow">
                          <Icon name="x" /> Rechazar solicitud
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })()}

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
                    className="admin-modal-overlay"
                    style={{ zIndex: 3000 }}
                  >
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="admin-modal-content"
                    >
                      <div className="admin-modal-head">
                        <div>
                          <h2>Detalle del repartidor</h2>
                          <p>Repartidor #{repartidorSeleccionado.id}</p>
                        </div>

                        <button
                          type="button"
                          onClick={cerrarDetalleRepartidor}
                          className="admin-icon-btn"
                          aria-label="Cerrar"
                        >
                          <Icon name="x" size={18} />
                        </button>
                      </div>

                      <div className="admin-info-grid">
                        <div className="admin-info-item">
                          <span>Usuario</span>
                          <p>{repartidorSeleccionado.username || 'No informado'}</p>
                        </div>

                        <div className="admin-info-item">
                          <span>Email</span>
                          <p>{repartidorSeleccionado.email || 'No informado'}</p>
                        </div>

                        <div className="admin-info-item">
                          <span>DNI</span>
                          <p>{repartidorSeleccionado.dni || 'No informado'}</p>
                        </div>

                        <div className="admin-info-item">
                          <span>Tipo de vehículo</span>
                          <p>{tipoVehiculo || 'No informado'}</p>
                        </div>

                        {(!esBici || vehiculoActivo?.marca) && (
                          <div className="admin-info-item">
                            <span>Marca</span>
                            <p>{vehiculoActivo?.marca || 'No informada'}</p>
                          </div>
                        )}

                        {(!esBici || vehiculoActivo?.modelo) && (
                          <div className="admin-info-item">
                            <span>Modelo</span>
                            <p>{vehiculoActivo?.modelo || 'No informado'}</p>
                          </div>
                        )}

                        {!esBici && (
                          <div className="admin-info-item">
                            <span>Patente</span>
                            <p>{vehiculoActivo?.patente || 'No informada'}</p>
                          </div>
                        )}

                        <div className="admin-info-item">
                          <span>Disponibilidad</span>
                          <div style={{ marginTop: '4px' }}>
                            {Number(repartidorSeleccionado.disponible) === 1 ? (
                              <Badge tone="success" dot>Disponible</Badge>
                            ) : (
                              <Badge tone="neutral" dot>No disponible</Badge>
                            )}
                          </div>
                        </div>

                        <div className="admin-info-item">
                          <span>Estado de validación</span>
                          <div style={{ marginTop: '4px' }}>
                            {Number(repartidorSeleccionado.validado) === 1 ? (
                              <Badge tone="success" icon="checkCircle">Validado</Badge>
                            ) : (
                              <Badge tone="warning" icon="clock">Pendiente de validación</Badge>
                            )}
                          </div>
                        </div>

                        <div className="admin-info-item">
                          <span>Fecha de registro</span>
                          <p>
                            {repartidorSeleccionado.creado_en
                              ? new Date(repartidorSeleccionado.creado_en).toLocaleString('es-AR')
                              : 'No informada'}
                          </p>
                        </div>
                      </div>

                      {(repartidorSeleccionado.latitud !== null ||
                        repartidorSeleccionado.longitud !== null) && (
                          <div className="admin-location">
                            <strong><Icon name="pin" size={14} /> Última ubicación registrada</strong>
                            <p className="admin-mono" style={{ marginTop: '4px' }}>
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

                      <div>
                        <h3 className="admin-subtitle">
                          <Icon name="car" size={18} />
                          Vehículos asociados y estado documental
                        </h3>

                        {(!repartidorSeleccionado.vehiculos || repartidorSeleccionado.vehiculos.length === 0) ? (
                          <div className="admin-inline-note">
                            El repartidor no posee vehículos registrados.
                          </div>
                        ) : (
                          <div className="admin-vehicle-list">
                            {repartidorSeleccionado.vehiculos.map((v) => {
                              const esActivo = Number(repartidorSeleccionado.IDvehiculo_activo) === Number(v.id);
                              const esBici = v.tipo_vehiculo?.toLowerCase().includes('bici');

                              const esDeshabilitado =
                                v.estado === 'BAJA' ||
                                Number(v.activo) === 0 ||
                                v.estado === 'RECHAZADO' ||
                                Boolean(v.motivo_rechazo);

                              return (
                                <div
                                  key={v.id}
                                  className={`admin-vehicle ${esActivo ? 'admin-vehicle--active' : ''} ${esDeshabilitado ? 'admin-vehicle--disabled' : ''}`}
                                >
                                  <div className="admin-vehicle__head">
                                    <strong>
                                      {v.tipo_vehiculo} · {v.marca} {v.modelo}{' '}
                                      {v.patente ? `(${v.patente})` : ''}
                                    </strong>

                                    <div className="admin-vehicle__badges">
                                      {esActivo && (
                                        <span className="admin-badge admin-badge--solid-info">
                                          <Icon name="check" size={12} /> Activo actual
                                        </span>
                                      )}

                                      {v.estado === 'BAJA' || (Number(v.activo) === 0 && !v.motivo_rechazo) ? (
                                        <Badge tone="error" icon="xCircle">Vehículo dado de baja</Badge>
                                      ) : v.estado === 'RECHAZADO' || v.motivo_rechazo ? (
                                        <Badge tone="error" icon="ban">Vehículo rechazado</Badge>
                                      ) : v.estado === 'PENDIENTE' || !v.estado ? (
                                        <Badge tone="warning" icon="clock">Pendiente</Badge>
                                      ) : (
                                        <Badge tone="success" icon="checkCircle">Activo ({v.estado})</Badge>
                                      )}
                                    </div>
                                  </div>

                                  {v.motivo_rechazo && (
                                    <p className="admin-text-error" style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
                                      <strong>Motivo de rechazo del vehículo:</strong> {v.motivo_rechazo}
                                    </p>
                                  )}

                                  {!esBici && (
                                    <div className="admin-vehicle__docs">
                                      <div className="admin-vehicle__docs-head">
                                        <span>Estado de documentación</span>

                                        {esDeshabilitado ? (
                                          <Badge tone="neutral" icon="ban">Vehículo deshabilitado</Badge>
                                        ) : v.documentacion_valida ? (
                                          <Badge tone="success" icon="checkCircle">Válida / vigente</Badge>
                                        ) : (
                                          <Badge tone="error" icon="alert">Inválida o con vencimientos</Badge>
                                        )}
                                      </div>

                                      {v.motivo_rechazo_documentacion && (
                                        <div className="admin-reject-note">
                                          <Icon name="file" size={14} />
                                          <span><strong>Motivo de rechazo de documentación:</strong> {v.motivo_rechazo_documentacion}</span>
                                        </div>
                                      )}

                                      <div className="admin-doc-grid" style={{ marginTop: v.motivo_rechazo_documentacion ? '12px' : 0 }}>
                                        <div className={`admin-doc-tile ${esDeshabilitado ? 'admin-doc-tile--disabled' : v.licencia_vencida ? 'admin-doc-tile--expired' : ''}`}>
                                          <div className="admin-doc-tile__name">Licencia</div>
                                          <div className="admin-doc-tile__date">
                                            Vence: {v.fecha_vencimiento_licencia || 'N/A'} {v.licencia_vencida && !esDeshabilitado ? '(VENCIDA)' : ''}
                                          </div>
                                          {v.licencia_url ? (
                                            <a href={resolverDocumento(v.licencia_url)} target="_blank" rel="noreferrer" className="admin-link" style={{ fontSize: '0.8125rem' }}>
                                              <Icon name="external" size={12} /> Ver archivo
                                            </a>
                                          ) : (
                                            <span className="admin-muted">Sin adjunto</span>
                                          )}
                                        </div>

                                        <div className={`admin-doc-tile ${esDeshabilitado ? 'admin-doc-tile--disabled' : v.seguro_vencido ? 'admin-doc-tile--expired' : ''}`}>
                                          <div className="admin-doc-tile__name">Seguro</div>
                                          <div className="admin-doc-tile__date">
                                            Vence: {v.fecha_vencimiento_seguro || 'N/A'} {v.seguro_vencido && !esDeshabilitado ? '(VENCIDO)' : ''}
                                          </div>
                                          {v.seguro_url ? (
                                            <a href={resolverDocumento(v.seguro_url)} target="_blank" rel="noreferrer" className="admin-link" style={{ fontSize: '0.8125rem' }}>
                                              <Icon name="external" size={12} /> Ver archivo
                                            </a>
                                          ) : (
                                            <span className="admin-muted">Sin adjunto</span>
                                          )}
                                        </div>

                                        <div className={`admin-doc-tile ${esDeshabilitado ? 'admin-doc-tile--disabled' : v.cedula_vencida ? 'admin-doc-tile--expired' : ''}`}>
                                          <div className="admin-doc-tile__name">Cédula</div>
                                          <div className="admin-doc-tile__date">
                                            Vence: {v.fecha_vencimiento_cedula || 'N/A'} {v.cedula_vencida && !esDeshabilitado ? '(VENCIDA)' : ''}
                                          </div>
                                          {v.cedula_url ? (
                                            <a href={resolverDocumento(v.cedula_url)} target="_blank" rel="noreferrer" className="admin-link" style={{ fontSize: '0.8125rem' }}>
                                              <Icon name="external" size={12} /> Ver archivo
                                            </a>
                                          ) : (
                                            <span className="admin-muted">Sin adjunto</span>
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

                      <div className="admin-modal-foot">
                        <button
                          type="button"
                          onClick={cerrarDetalleRepartidor}
                          className="admin-btn admin-btn--outline admin-btn--block"
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          {seccion === 'clientes' && (
            <section>
              <h2 className="admin-section-title">
                <span className="admin-section-title__icon"><Icon name="user" size={20} /></span>
                Gestión de clientes
              </h2>

              {clientes.length === 0 ? (
                <div className="admin-state">
                  <Icon name="inbox" size={28} />
                  No hay clientes registrados.
                </div>
              ) : (
                <>
                  <div className="admin-table-meta">
                    <span>
                      Mostrando {(paginaClientes - 1) * registrosPorPagina + 1} - {Math.min(paginaClientes * registrosPorPagina, clientes.length)} de {clientes.length}
                    </span>
                    <label>
                      Ver
                      <select className="admin-select" value={registrosPorPagina} onChange={cambiarRegistrosPorPagina}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                      registros
                    </label>
                  </div>

                  <TablaConScrollSuperior minWidth="1150px">
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Nombre completo</th>
                            <th>Email</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            <th>Coordenadas</th>
                            <th>Registro</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                          </tr>
                        </thead>

                        <tbody>
                          {clientesVisibles.length === 0 && (
                            <tr>
                              <td colSpan={9} className="admin-table__empty">No hay resultados para tu búsqueda.</td>
                            </tr>
                          )}

                          {clientesVisibles.map((cliente) => (
                            <tr key={cliente.id}>
                              <td className="admin-cell-num">{cliente.id}</td>
                              <td>
                                <div className="admin-user">
                                  <span className="admin-avatar" aria-hidden="true">{inicialDe(cliente.username)}</span>
                                  {cliente.username}
                                </div>
                              </td>
                              <td>
                                {[cliente.nombre, cliente.apellido].filter(Boolean).join(' ') || 'No informado'}
                              </td>
                              <td>{cliente.email}</td>
                              <td>{cliente.telefono || 'No informado'}</td>
                              <td>
                                <div>{cliente.direccion}</div>
                                {(cliente.piso || cliente.departamento) && (
                                  <small className="admin-cell-sub">
                                    {cliente.piso ? `Piso ${cliente.piso}` : ''}
                                    {cliente.departamento ? ` - Depto. ${cliente.departamento}` : ''}
                                  </small>
                                )}
                                {cliente.referencia && (
                                  <small className="admin-cell-sub">
                                    Ref.: {cliente.referencia}
                                  </small>
                                )}
                              </td>
                              <td>
                                {cliente.latitud !== null && cliente.longitud !== null ? (
                                  <span className="admin-mono">
                                    {Number(cliente.latitud).toFixed(6)}<br />
                                    {Number(cliente.longitud).toFixed(6)}
                                  </span>
                                ) : (
                                  <span className="admin-muted">No asignadas</span>
                                )}
                              </td>
                              <td>
                                {cliente.creado_en
                                  ? new Date(cliente.creado_en).toLocaleDateString('es-AR')
                                  : 'No informado'}
                              </td>
                              <td>
                                <div className="admin-cell-actions-group">
                                  <button
                                    type="button"
                                    onClick={() => consultarHistorialCliente(cliente)}
                                    className="admin-btn admin-btn--sm admin-btn--info-soft"
                                    style={{ whiteSpace: 'nowrap' }}
                                  >
                                    <Icon name="history" size={14} />
                                    Ver pedidos
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TablaConScrollSuperior>

                  <div className="admin-pagination">
                    <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => setPaginaClientes((pagina) => Math.max(1, pagina - 1))} disabled={paginaClientes === 1}>
                      <Icon name="chevronLeft" size={14} /> Anterior
                    </button>
                    <span>Página <strong>{paginaClientes}</strong> de {totalPaginasClientes}</span>
                    <button type="button" className="admin-btn admin-btn--outline admin-btn--sm" onClick={() => setPaginaClientes((pagina) => Math.min(totalPaginasClientes, pagina + 1))} disabled={paginaClientes === totalPaginasClientes}>
                      Siguiente <Icon name="chevronRight" size={14} />
                    </button>
                  </div>
                </>
              )}

              {clienteHistorialSeleccionado && (
                <div
                  role="dialog"
                  aria-modal="true"
                  onClick={cerrarHistorialCliente}
                  className="admin-modal-overlay"
                  style={{ zIndex: 3000 }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="admin-modal-content"
                    style={{ maxWidth: '700px' }}
                  >
                    <div className="admin-modal-head">
                      <div>
                        <h2>Historial de pedidos</h2>
                        <p>
                          Cliente: {[clienteHistorialSeleccionado.nombre, clienteHistorialSeleccionado.apellido].filter(Boolean).join(' ') || clienteHistorialSeleccionado.username}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={cerrarHistorialCliente}
                        className="admin-icon-btn"
                        aria-label="Cerrar"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>

                    {loadingHistorial ? (
                      <div className="admin-state" role="status" style={{ border: 'none' }}>
                        <Spinner />
                        Cargando historial de pedidos...
                      </div>
                    ) : errorHistorial ? (
                      <div className="admin-inline-note admin-inline-note--error" role="alert">
                        {errorHistorial}
                      </div>
                    ) : historialPedidos.length === 0 ? (
                      <div className="admin-inline-note admin-inline-note--center">
                        Este cliente aún no ha realizado ningún pedido.
                      </div>
                    ) : (
                      <div className="admin-table-container">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Orden #</th>
                              <th>Fecha</th>
                              <th>Local(es)</th>
                              <th>Estado</th>
                              <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historialPedidos.map((pedido) => (
                              <tr key={pedido.id}>
                                <td style={{ fontWeight: 700 }}>#{pedido.id}</td>
                                <td>
                                  {pedido.creado_en ? new Date(pedido.creado_en).toLocaleString('es-AR') : '-'}
                                </td>
                                <td>{pedido.locales || 'N/A'}</td>
                                <td>
                                  {pedido.estado === 'Entregado' ? (
                                    <Badge tone="success" icon="checkCircle">{pedido.estado}</Badge>
                                  ) : pedido.estado === 'Cancelado' ? (
                                    <Badge tone="error" icon="xCircle">{pedido.estado}</Badge>
                                  ) : (
                                    <Badge tone="info" icon="clock">{pedido.estado}</Badge>
                                  )}
                                </td>
                                <td className="admin-cell-right" style={{ fontWeight: 700 }}>
                                  ${Number(pedido.total || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="admin-modal-foot">
                      <button
                        type="button"
                        onClick={cerrarHistorialCliente}
                        className="admin-btn admin-btn--outline admin-btn--block"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* MODAL ESTÉTICO DE AVISOS / ALERTAS */}
      {modalAviso && (
        <div className="admin-modal-aviso-overlay">
          <div className="admin-modal-aviso-box" role="alertdialog" aria-modal="true">
            <div className={`admin-modal-aviso-icon ${avisoExitoso ? 'admin-modal-aviso-icon--success' : 'admin-modal-aviso-icon--error'}`}>
              <Icon name={avisoExitoso ? 'checkCircle' : 'alert'} size={26} />
            </div>
            <h3>{sinEmoji(modalAviso.titulo)}</h3>
            <p>{sinEmoji(modalAviso.mensaje)}</p>
            <div className="admin-modal-aviso-actions">
              <button
                className="admin-btn admin-btn--navy"
                onClick={() => {
                  const cb = modalAviso.callback;
                  setModalAviso(null);
                  if (cb) cb();
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTÉTICO DE CONFIRMACIÓN */}
      {modalConfirmacion && (
        <div className="admin-modal-aviso-overlay">
          <div className="admin-modal-aviso-box" role="alertdialog" aria-modal="true">
            <div className="admin-modal-aviso-icon admin-modal-aviso-icon--warning">
              <Icon name="alert" size={26} />
            </div>
            <h3>{sinEmoji(modalConfirmacion.titulo)}</h3>
            <p>{sinEmoji(modalConfirmacion.mensaje)}</p>
            <div className="admin-modal-aviso-actions">
              <button
                className="admin-btn admin-btn--outline"
                onClick={() => setModalConfirmacion(null)}
              >
                Cancelar
              </button>
              <button
                className="admin-btn admin-btn--danger"
                onClick={modalConfirmacion.onConfirm}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};