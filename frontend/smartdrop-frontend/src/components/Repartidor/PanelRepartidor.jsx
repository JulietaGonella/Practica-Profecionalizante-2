// src/components/Repartidor/PanelRepartidor.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPedidosDisponibles,
  getMisPedidosAsignados,
  aceptarPedidoRepartidor,
  getDisponibilidadRepartidor,
  actualizarDisponibilidadRepartidor,
  getMisVehiculos,
  solicitarVehiculo,
  seleccionarVehiculoActivo,
  getMiPerfilRepartidor,
  getResumenGananciasHoy,
  actualizarVehiculoExistente,
  solicitarBajaVehiculo
} from '../../api/repartidorService';
import { LogoutButton } from '../LogoutButton';
import { CambiarPasswordModal } from '../CambiarPasswordModal';
import { NotificationMenu } from '../Common/NotificationMenu';
import './CSS/Repartidor.css';

export const PanelRepartidor = () => {
  const navigate = useNavigate();
  const [vista, setVista] = useState('disponibles');
  const [pedidosDisponibles, setPedidosDisponibles] = useState([]);
  const [misPedidos, setMisPedidos] = useState([]);
  const [historialPedidos, setHistorialPedidos] = useState([]);
  const [mostrarTodoHistorial, setMostrarTodoHistorial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aceptandoId, setAceptandoId] = useState(null);
  const [disponible, setDisponible] = useState(false);
  const [actualizandoDisponibilidad, setActualizandoDisponibilidad] = useState(false);
  const [vehiculos, setVehiculos] = useState([]);
  const [mostrarVehiculos, setMostrarVehiculos] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [mostrarCambioPass, setMostrarCambioPass] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [resumenGanancias, setResumenGanancias] = useState({
    totalPedidosHoy: 0,
    gananciasEnvioHoy: 0,
    efectivoRecaudadoHoy: 0,
    efectivoARendirHoy: 0
  });
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  const [modalAviso, setModalAviso] = useState(null);
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const [cargandoAccionBtn, setCargandoAccionBtn] = useState(null);
  const [cambiandoVehiculo, setCambiandoVehiculo] = useState(false);

  const [vehiculoEditando, setVehiculoEditando] = useState(null);
  const [formRenovacion, setFormRenovacion] = useState({
    cedula: null,
    seguro: null,
    licencia: null,
    fecha_vencimiento_licencia: '',
    fecha_vencimiento_seguro: '',
    fecha_vencimiento_cedula: ''
  });

  const [formVehiculo, setFormVehiculo] = useState({
    IDtipo_vehiculo: '',
    marca: '',
    modelo: '',
    patente: '',
    anio: '',
    cedula: null,
    seguro: null,
    licencia: null,
    fecha_vencimiento_licencia: '',
    fecha_vencimiento_seguro: '',
    fecha_vencimiento_cedula: ''
  });

  const cargarTodo = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        disponibles,
        asignados,
        disponibilidadActual,
        vehiculosData,
        gananciasData
      ] = await Promise.all([
        getPedidosDisponibles(),
        getMisPedidosAsignados(),
        getDisponibilidadRepartidor(),
        getMisVehiculos(),
        getResumenGananciasHoy()
      ]);

      setDisponible(Boolean(disponibilidadActual?.disponible));
      setVehiculos(Array.isArray(vehiculosData) ? vehiculosData : []);

      if (gananciasData) {
        setResumenGanancias(gananciasData);
      }

      const pedidos = Array.isArray(asignados) ? asignados : [];
      setPedidosDisponibles(Array.isArray(disponibles) ? disponibles : []);

      const pedidosEnCurso = pedidos.filter((pedido) => {
        const estado = Number(pedido.IDestado ?? pedido.id_estado ?? 0);
        return estado === 4 || estado === 5 || estado === 7 || estado === 8;
      });

      setMisPedidos(pedidosEnCurso);

      setHistorialPedidos(
        pedidos.filter((pedido) => {
          const estado = Number(pedido.IDestado ?? pedido.id_estado);
          return estado === 3;
        })
      );

      if (pedidosEnCurso.length > 0) {
        setVista('aceptados');
      } else {
        setVista('disponibles');
      }
    } catch (err) {
      console.error('Error cargando pedidos:', err);
      setError(err.response?.data?.error || 'Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const handleAceptarPedido = async (ordenId) => {
    if (!vehiculoActivo) {
      setModalAviso({
        titulo: '⚠️ Vehículo Requerido',
        mensaje: 'Debes seleccionar un vehículo activo para poder aceptar pedidos.'
      });
      return;
    }

    if (docActivaVencida) {
      setModalAviso({
        titulo: '⚠️ Documentación Vencida',
        mensaje: 'Tienes documentación vencida en tu vehículo activo. Actualízala en "Mi Vehículo" para poder tomar pedidos.'
      });
      return;
    }

    try {
      setAceptandoId(ordenId);
      await aceptarPedidoRepartidor(ordenId);
      await cargarTodo();
      setVista('aceptados');
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'Error al aceptar el pedido'
      });
    } finally {
      setAceptandoId(null);
    }
  };

  const handleCambiarDisponibilidad = async (e) => {
    const nuevoEstado = e.target.checked;
    setActualizandoDisponibilidad(true);

    try {
      const resultado = await actualizarDisponibilidadRepartidor(nuevoEstado);
      setDisponible(Boolean(resultado.disponible));
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo actualizar tu disponibilidad.'
      });
    } finally {
      setActualizandoDisponibilidad(false);
    }
  };

  const vehiculoActivo = vehiculos.find(
    (vehiculo) => Number(vehiculo.IDvehiculo_activo) === Number(vehiculo.IDvehiculo)
  );
  const vehiculosAprobados = vehiculos.filter(
    (vehiculo) => vehiculo.estado === 'APROBADO' && Number(vehiculo.activo) === 1
  );

  const handleSeleccionarVehiculo = async (e) => {
    const IDvehiculo = e.target.value;
    if (!IDvehiculo) return;

    setCambiandoVehiculo(true);
    try {
      await seleccionarVehiculoActivo(IDvehiculo);
      await cargarTodo();
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo seleccionar el vehículo.'
      });
    } finally {
      setCambiandoVehiculo(false);
    }
  };

  const handleArchivoVehiculo = (e) => {
    setFormVehiculo((prev) => ({ ...prev, [e.target.name]: e.target.files[0] || null }));
  };

  const handleArchivoRenovacion = (e) => {
    setFormRenovacion((prev) => ({ ...prev, [e.target.name]: e.target.files[0] || null }));
  };

  const handleActualizarDocumentos = async (e) => {
    e.preventDefault();

    const vehiculoId = vehiculoEditando?.IDvehiculo || vehiculoEditando?.id;
    if (!vehiculoId) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: 'No se pudo identificar el vehículo a actualizar.'
      });
      return;
    }

    setEnviandoSolicitud(true);
    try {
      const formData = new FormData();

      if (formRenovacion.cedula instanceof File) formData.append('cedula', formRenovacion.cedula);
      if (formRenovacion.seguro instanceof File) formData.append('seguro', formRenovacion.seguro);
      if (formRenovacion.licencia instanceof File) formData.append('licencia', formRenovacion.licencia);

      if (formRenovacion.fecha_vencimiento_cedula) formData.append('fecha_vencimiento_cedula', formRenovacion.fecha_vencimiento_cedula);
      if (formRenovacion.fecha_vencimiento_seguro) formData.append('fecha_vencimiento_seguro', formRenovacion.fecha_vencimiento_seguro);
      if (formRenovacion.fecha_vencimiento_licencia) formData.append('fecha_vencimiento_licencia', formRenovacion.fecha_vencimiento_licencia);

      await actualizarVehiculoExistente(vehiculoId, formData);
      setModalAviso({
        titulo: '✅ Solicitud Enviada',
        mensaje: 'Solicitud enviada. El vehículo pasó a estado PENDIENTE a la espera de aprobación del administrador.'
      });

      setVehiculoEditando(null);
      await cargarTodo();
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo enviar la actualización.'
      });
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const handleAbrirPerfil = async () => {
    try {
      setCargandoPerfil(true);
      setMostrarPerfil(true);
      const data = await getMiPerfilRepartidor();
      setPerfil(data);
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo cargar la información del perfil'
      });
    } finally {
      setCargandoPerfil(false);
    }
  };

  const esBicicleta = Number(formVehiculo.IDtipo_vehiculo) === 2;

  const handleSolicitarVehiculo = async (e) => {
    e.preventDefault();
    setEnviandoSolicitud(true);

    try {
      const datos = new FormData();
      Object.entries(formVehiculo).forEach(([campo, valor]) => {
        if (
          esBicicleta &&
          [
            'patente',
            'cedula',
            'seguro',
            'licencia',
            'fecha_vencimiento_licencia',
            'fecha_vencimiento_seguro',
            'fecha_vencimiento_cedula'
          ].includes(campo)
        ) {
          return;
        }

        if (valor !== null && valor !== '') {
          datos.append(campo, valor);
        }
      });

      if (esBicicleta) {
        datos.append('bici_propia', '1');
      }

      await solicitarVehiculo(datos);

      setFormVehiculo({
        IDtipo_vehiculo: '',
        marca: '',
        modelo: '',
        patente: '',
        anio: '',
        cedula: null,
        seguro: null,
        licencia: null,
        fecha_vencimiento_licencia: '',
        fecha_vencimiento_seguro: '',
        fecha_vencimiento_cedula: ''
      });

      await cargarTodo();
      setModalAviso({
        titulo: '✅ Solicitud Enviada',
        mensaje: 'Solicitud enviada. Quedará pendiente de revisión administrativa.'
      });
    } catch (err) {
      setModalAviso({
        titulo: '⚠️ Error',
        mensaje: err.response?.data?.error || 'No se pudo enviar la solicitud.'
      });
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const evaluarDocumento = (fechaStr, urlDoc) => {
    if (!fechaStr) {
      return {
        vencido: false,
        texto: urlDoc ? 'Registrado (Sin fecha)' : 'No registra'
      };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const formatoIso = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr.split(' ')[0];
    const partes = formatoIso.split('-');

    if (partes.length !== 3) {
      return { vencido: true, texto: 'Fecha Inválida' };
    }

    const [anio, mes, dia] = partes.map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    fecha.setHours(0, 0, 0, 0);

    if (isNaN(fecha.getTime())) {
      return { vencido: true, texto: 'Fecha Inválida' };
    }

    const vencido = fecha < hoy;
    return {
      vencido,
      texto: fecha.toLocaleDateString('es-AR')
    };
  };

  const esBicicletaActiva = vehiculoActivo && Number(vehiculoActivo.IDtipo_vehiculo) === 2;

  const docActivaVencida = Boolean(
    vehiculoActivo &&
    !esBicicletaActiva &&
    (
      evaluarDocumento(vehiculoActivo.fecha_vencimiento_licencia, vehiculoActivo.licencia_url || vehiculoActivo.licencia).vencido ||
      evaluarDocumento(vehiculoActivo.fecha_vencimiento_seguro, vehiculoActivo.seguro_url || vehiculoActivo.seguro).vencido ||
      evaluarDocumento(vehiculoActivo.fecha_vencimiento_cedula, vehiculoActivo.cedula_url || vehiculoActivo.cedula).vencido
    )
  );

  const otrosVehiculosConDocVencida = vehiculos.filter((vehiculo) => {
    const esElActivo = vehiculoActivo && Number(vehiculo.IDvehiculo) === Number(vehiculoActivo.IDvehiculo);
    if (esElActivo) return false;

    const esBici = Number(vehiculo.IDtipo_vehiculo) === 2;
    if (esBici) return false;

    const estaActivo = Number(vehiculo.activo) === 1;
    const esRechazadoTotal = vehiculo.estado === 'RECHAZADO';
    const esRechazadoDoc = vehiculo.estado === 'RECHAZADO_DOCUMENTACION';
    const esBajaReal = vehiculo.estado === 'BAJA';
    const esPendienteGeneral = String(vehiculo.estado).includes('PENDIENTE');

    if (!estaActivo || esRechazadoTotal || esRechazadoDoc || esBajaReal || esPendienteGeneral) {
      return false;
    }

    const lic = evaluarDocumento(vehiculo.fecha_vencimiento_licencia, vehiculo.licencia_url || vehiculo.licencia);
    const seg = evaluarDocumento(vehiculo.fecha_vencimiento_seguro, vehiculo.seguro_url || vehiculo.seguro);
    const ced = evaluarDocumento(vehiculo.fecha_vencimiento_cedula, vehiculo.cedula_url || vehiculo.cedula);

    return lic.vencido || seg.vencido || ced.vencido;
  });

  const tieneOtrosVehiculosVencidos = otrosVehiculosConDocVencida.length > 0;

  const renderCardPedido = (pedido, tipo, mostrarDetalle = false) => {
    const ordenId = pedido.IDorden || pedido.id;
    const esAceptado = tipo === 'aceptado';
    const estado = pedido.estado_orden || (esAceptado ? 'Asignado' : tipo === 'historial' ? 'Entregado' : 'Disponible');

    return (
      <div key={ordenId} className="repartidor-card">
        <div className="repartidor-card__body">
          <div className="repartidor-card__head">
            <div className="repartidor-card__title">
              <small>Pedido</small>
              <h3>#{ordenId}</h3>
            </div>

            <span className={`repartidor-badge ${tipo === 'historial' ? 'repartidor-badge--neutral' : esAceptado ? 'repartidor-badge--info' : 'repartidor-badge--success'}`}>
              <span className="repartidor-dot"></span>
              {estado}
            </span>
          </div>

          <div className="repartidor-card__money">
            <span>Subtotal</span>
            <strong>$ {Number(pedido.subtotal || 0).toFixed(2)}</strong>

            <span>Envío</span>
            <strong>$ {Number(pedido.costo_envio || 0).toFixed(2)}</strong>

            <span className="is-total">Total</span>
            <strong className="is-total">
              $ {Number(pedido.total || 0).toFixed(2)}
            </strong>
          </div>

          <div className="repartidor-card__products">
            <strong>Productos</strong>
            {pedido.productos && pedido.productos.length > 0 ? (
              <ul>
                {pedido.productos.map((producto, index) => {
                  const estadoDetalle = Number(
                    producto.IDestado_detalle ??
                    producto.IDestado_item ??
                    producto.IDestado ??
                    producto.id_estado ??
                    0
                  );
                  const textoEstado = (producto.estado_detalle || producto.estado_item || '').toLowerCase();
                  const esCancelado =
                    estadoDetalle === 6 ||
                    textoEstado === 'cancelado' ||
                    textoEstado === 'rechazado' ||
                    producto.cancelado === true ||
                    Boolean(producto.motivo_rechazo);

                  return (
                    <li
                      key={`${ordenId}-${producto.IDdetalle || index}`}
                      className={esCancelado ? 'is-cancelled' : ''}
                    >
                      <span>{producto.cantidad}x {producto.producto || producto.nombre}</span>
                      {esCancelado && <em>(Cancelado)</em>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="repartidor-muted" style={{ fontSize: '0.85rem' }}>
                Sin productos asociados al pedido.
              </p>
            )}
          </div>
        </div>

        <div className="repartidor-card__actions">
          {tipo === 'disponible' && (
            <button
              onClick={() => handleAceptarPedido(ordenId)}
              disabled={aceptandoId === ordenId || docActivaVencida || !vehiculoActivo}
              className="repartidor-btn repartidor-btn--success repartidor-btn--block"
            >
              {!vehiculoActivo
                ? '🚫 Sin vehículo activo'
                : docActivaVencida
                  ? '🚫 Doc. Vencida en vehículo actual'
                  : aceptandoId === ordenId
                    ? '⏳ Aceptando...'
                    : 'Aceptar pedido'}
            </button>
          )}

          {mostrarDetalle && (
            <button
              onClick={() => {
                setCargandoAccionBtn(`detalle-${ordenId}`);
                navigate(`/repartidor/orden/${ordenId}`);
              }}
              disabled={cargandoAccionBtn === `detalle-${ordenId}`}
              className="repartidor-btn repartidor-btn--primary repartidor-btn--block"
            >
              {cargandoAccionBtn === `detalle-${ordenId}` ? '⏳ Cargando detalle...' : '📋 Ver detalle del pedido'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const historialVisible = mostrarTodoHistorial ? historialPedidos : historialPedidos.slice(0, 3);

  return (
    <div className="repartidor-container">

      {docActivaVencida && (
        <div className="repartidor-alert repartidor-alert--danger">
          <span>⚠️</span>
          <div>
            Posees documentación vencida en tu vehículo activo. No podrás ponerte en línea ni aceptar pedidos hasta actualizar tus documentos en <strong>"Mi Vehículo"</strong>.
          </div>
        </div>
      )}

      {tieneOtrosVehiculosVencidos && !docActivaVencida && (
        <div className="repartidor-alert repartidor-alert--warning">
          <span>⚠️</span>
          <div>
            Tienes documentación vencida en uno o más vehículos de tu lista. Puedes seguir trabajando, pero recuerda actualizar los documentos en <strong>"Mi Vehículo"</strong>.
          </div>
        </div>
      )}

      <header className="repartidor-header">
        <div className="repartidor-header__top">
          <div className="repartidor-brand">
            <div className="repartidor-brand__mark">🚴</div>
            <div>
              <h1>Panel de Reparto</h1>
              <p>Pedidos disponibles y en curso</p>
            </div>
          </div>

          <div className="repartidor-header__actions">
            <NotificationMenu />
            <LogoutButton />
          </div>
        </div>

        <div className="repartidor-toolbar">
          <label className={`repartidor-switch ${disponible ? 'repartidor-switch--on' : ''} ${docActivaVencida ? 'is-disabled' : ''}`}>
            <input
              type="checkbox"
              checked={disponible}
              onChange={handleCambiarDisponibilidad}
              disabled={actualizandoDisponibilidad || docActivaVencida}
            />
            <span>{actualizandoDisponibilidad ? 'Cambiando...' : disponible ? 'En línea' : 'Offline'}</span>
          </label>

          <button
            onClick={() => setMostrarVehiculos(true)}
            className="repartidor-btn repartidor-btn--outline repartidor-btn--sm"
          >
            🚘 Mi Vehículo {docActivaVencida ? '❌' : (tieneOtrosVehiculosVencidos ? '⚠️' : '')}
          </button>

          <button
            onClick={handleAbrirPerfil}
            disabled={cargandoAccionBtn === 'perfil'}
            className="repartidor-btn repartidor-btn--outline repartidor-btn--sm"
          >
            {cargandoPerfil ? '⏳ Abriendo...' : '👤 Mi Perfil'}
          </button>

          <button
            onClick={() => {
              setCargandoAccionBtn('estadisticas');
              navigate('/repartidor/tablero');
            }}
            disabled={cargandoAccionBtn === 'estadisticas'}
            className="repartidor-btn repartidor-btn--ghost repartidor-btn--sm"
          >
            {cargandoAccionBtn === 'estadisticas' ? '⏳ Cargando...' : '📊 Ver Estadísticas'}
          </button>
        </div>
      </header>

      <div className="repartidor-kpi-grid">
        <div className="repartidor-kpi repartidor-kpi--success">
          <div className="repartidor-kpi__top">
            <div className="repartidor-kpi__icon">💰</div>
            <span className="repartidor-kpi__label">Ganancias por Envíos (Hoy)</span>
          </div>
          <div className="repartidor-kpi__value">$ {Number(resumenGanancias.gananciasEnvioHoy || 0).toFixed(2)}</div>
        </div>

        <div className="repartidor-kpi repartidor-kpi--warning">
          <div className="repartidor-kpi__top">
            <div className="repartidor-kpi__icon">💵</div>
            <span className="repartidor-kpi__label">Efectivo Cobrado (Bruto)</span>
          </div>
          <div className="repartidor-kpi__value">$ {Number(resumenGanancias.efectivoRecaudadoHoy || 0).toFixed(2)}</div>
        </div>

        <div className="repartidor-kpi repartidor-kpi--danger">
          <div className="repartidor-kpi__top">
            <div className="repartidor-kpi__icon">🏦</div>
            <span className="repartidor-kpi__label">Efectivo a Rendir</span>
          </div>
          <div className="repartidor-kpi__value">$ {Number(resumenGanancias.efectivoARendirHoy || 0).toFixed(2)}</div>
        </div>

        <div className="repartidor-kpi repartidor-kpi--info">
          <div className="repartidor-kpi__top">
            <div className="repartidor-kpi__icon">📦</div>
            <span className="repartidor-kpi__label">Entregas Realizadas</span>
          </div>
          <div className="repartidor-kpi__value">{resumenGanancias.totalPedidosHoy || 0}</div>
        </div>
      </div>

      <div className="repartidor-tabs">
        <button
          onClick={() => setVista('disponibles')}
          className={`repartidor-tab-btn ${vista === 'disponibles' ? 'active' : ''}`}
        >
          🚴 Pedidos disponibles
          <span className="repartidor-tab-count">{pedidosDisponibles.length}</span>
        </button>

        <button
          onClick={() => setVista('aceptados')}
          className={`repartidor-tab-btn ${vista === 'aceptados' ? 'active' : ''}`}
        >
          📦 Mis pedidos en curso
          <span className="repartidor-tab-count">{misPedidos.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="repartidor-state">
          <div className="repartidor-spinner"></div>
          <p>Cargando pedidos...</p>
        </div>
      ) : error ? (
        <div className="repartidor-alert repartidor-alert--danger">{error}</div>
      ) : vista === 'disponibles' ? (
        <section>
          {pedidosDisponibles.length === 0 ? (
            <div className="repartidor-state">
              <p>No hay pedidos disponibles para repartir en este momento.</p>
            </div>
          ) : (
            <div className="repartidor-grid-cards">
              {pedidosDisponibles.map((pedido) => renderCardPedido(pedido, 'disponible', false))}
            </div>
          )}
        </section>
      ) : (
        <section className="repartidor-stack">
          <div>
            <h3 className="repartidor-section-title">🚴 Pedidos actuales</h3>

            {misPedidos.length === 0 ? (
              <div className="repartidor-state">
                <p>No tenés pedidos en curso.</p>
              </div>
            ) : (
              <div className="repartidor-grid-cards">
                {misPedidos.map((pedido) => renderCardPedido(pedido, 'aceptado', true))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h3 className="repartidor-section-title">📜 Historial de entregas</h3>

            {historialPedidos.length === 0 ? (
              <div className="repartidor-state">
                <p>Todavía no tenés pedidos entregados.</p>
              </div>
            ) : (
              <div className="repartidor-stack">
                <div className="repartidor-grid-cards">
                  {historialVisible.map((pedido) => renderCardPedido(pedido, 'historial', true))}
                </div>

                {historialPedidos.length > 3 && (
                  <button
                    onClick={() => setMostrarTodoHistorial((prev) => !prev)}
                    className="repartidor-btn repartidor-btn--outline"
                    style={{ width: 'fit-content' }}
                  >
                    {mostrarTodoHistorial ? '⬆️ Ver menos' : '📜 Ver más entregas'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL VEHÍCULOS */}
      {mostrarVehiculos && (
        <div className="repartidor-modal-overlay">
          <div className="repartidor-modal-content">
            <div className="repartidor-modal-head">
              <h2>🚘 Mis vehículos</h2>
              <button
                type="button"
                onClick={() => setMostrarVehiculos(false)}
                disabled={cambiandoVehiculo || enviandoSolicitud}
              >
                ✕
              </button>
            </div>

            <section className="repartidor-subbox">
              <h3 style={{ marginTop: 0 }}>Vehículo actual</h3>
              {vehiculoActivo ? (
                <p>
                  <strong>{vehiculoActivo.tipo_vehiculo}</strong>{' '}
                  {vehiculoActivo.marca} {vehiculoActivo.modelo} {vehiculoActivo.patente ? `(${vehiculoActivo.patente})` : ''}{' '}
                  <span style={{ color: docActivaVencida ? 'var(--sd-rep-error)' : 'var(--sd-rep-success)', fontWeight: 'bold' }}>
                    {docActivaVencida ? '❌ Documentación Vencida' : '✓ Verificado'}
                  </span>
                </p>
              ) : (
                <p className="repartidor-muted">No tenés un vehículo activo seleccionado.</p>
              )}
              <div className="repartidor-field" style={{ marginTop: '1rem' }}>
                <span>{cambiandoVehiculo ? '⏳ Cambiando vehículo...' : 'Vehículo para trabajar:'}</span>
                <select
                  value={vehiculoActivo?.IDvehiculo || ''}
                  onChange={handleSeleccionarVehiculo}
                  disabled={cambiandoVehiculo}
                  className="repartidor-select"
                >
                  <option value="">
                    {cambiandoVehiculo ? 'Cargando cambio...' : 'Seleccionar vehículo aprobado'}
                  </option>
                  {vehiculosAprobados.map((vehiculo) => (
                    <option key={vehiculo.IDvehiculo} value={vehiculo.IDvehiculo}>
                      {vehiculo.tipo_vehiculo} - {vehiculo.marca || 'Sin marca'} {vehiculo.modelo || ''}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section style={{ marginBottom: '1.2rem' }}>
              <h3 className="repartidor-section-title" style={{ fontSize: '1rem' }}>Mis vehículos registrados</h3>
              <div className="repartidor-vehicle-list">
                {vehiculos.length === 0 ? (
                  <p className="repartidor-muted">Todavía no tenés vehículos registrados.</p>
                ) : (
                  vehiculos.map((vehiculo) => {
                    const estaActivo = Number(vehiculo.activo) === 1;
                    const esRechazadoTotal = vehiculo.estado === 'RECHAZADO';
                    const esRechazadoDoc = vehiculo.estado === 'RECHAZADO_DOCUMENTACION';
                    const esBajaReal = vehiculo.estado === 'BAJA';
                    const esPendienteGeneral = String(vehiculo.estado).includes('PENDIENTE');

                    const lic = evaluarDocumento(vehiculo.fecha_vencimiento_licencia, vehiculo.licencia_url || vehiculo.licencia);
                    const seg = evaluarDocumento(vehiculo.fecha_vencimiento_seguro, vehiculo.seguro_url || vehiculo.seguro);
                    const ced = evaluarDocumento(vehiculo.fecha_vencimiento_cedula, vehiculo.cedula_url || vehiculo.cedula);

                    const tieneVencidos = estaActivo && !esRechazadoTotal && !esRechazadoDoc && !esPendienteGeneral && (lic.vencido || seg.vencido || ced.vencido);

                    return (
                      <div
                        key={vehiculo.IDvehiculo}
                        className={`repartidor-vehicle ${(!estaActivo || esRechazadoTotal) ? 'repartidor-vehicle--off' : ''}`}
                      >
                        <div className="repartidor-vehicle__head">
                          <strong>
                            {vehiculo.tipo_vehiculo} - {vehiculo.marca || 'Sin marca'} {vehiculo.modelo || ''}
                            {esBajaReal && ' (DADO DE BAJA)'}
                            {vehiculo.estado === 'PENDIENTE_BAJA' && ' (PENDIENTE DE BAJA)'}
                            {esRechazadoTotal && ' (RECHAZADO)'}
                          </strong>

                          {estaActivo && vehiculo.estado === 'APROBADO' && (
                            <button
                              type="button"
                              onClick={() => {
                                setModalConfirmacion({
                                  titulo: '⚠️ Solicitar Baja',
                                  mensaje: '¿Estás seguro de solicitar la baja de este vehículo?',
                                  onConfirm: async () => {
                                    setModalConfirmacion(null);
                                    setCargandoAccionBtn(`baja-${vehiculo.IDvehiculo}`);
                                    try {
                                      await solicitarBajaVehiculo(vehiculo.IDvehiculo);
                                      await cargarTodo();
                                      setModalAviso({ titulo: '✅ Solicitud Enviada', mensaje: 'Solicitud de baja enviada correctamente.' });
                                    } catch (err) {
                                      setModalAviso({ titulo: '⚠️ Error', mensaje: err.response?.data?.error || 'No se pudo enviar la solicitud.' });
                                    } finally {
                                      setCargandoAccionBtn(null);
                                    }
                                  }
                                });
                              }}
                              disabled={cargandoAccionBtn === `baja-${vehiculo.IDvehiculo}`}
                              className="repartidor-btn repartidor-btn--danger-soft repartidor-btn--sm"
                            >
                              {cargandoAccionBtn === `baja-${vehiculo.IDvehiculo}` ? '⏳ Solicitando...' : '🗑️ Solicitar baja'}
                            </button>
                          )}
                        </div>

                        <div className="repartidor-vehicle__meta">
                          <span>Estado: <strong>{vehiculo.estado}</strong></span>
                          {vehiculo.patente && <span>Patente: {vehiculo.patente}</span>}
                        </div>

                        {estaActivo && Number(vehiculo.IDtipo_vehiculo) !== 2 && (
                          <div className="repartidor-doc-list">
                            <div className={`repartidor-doc-row ${lic.vencido ? 'is-expired' : ''}`}>
                              🪪 Licencia: {lic.texto} {lic.vencido && '❌ (VENCIDA)'}
                            </div>
                            <div className={`repartidor-doc-row ${seg.vencido ? 'is-expired' : ''}`}>
                              🛡️ Seguro: {seg.texto} {seg.vencido && '❌ (VENCIDO)'}
                            </div>
                            <div className={`repartidor-doc-row ${ced.vencido ? 'is-expired' : ''}`}>
                              📄 Cédula: {ced.texto} {ced.vencido && '❌ (VENCIDA)'}
                            </div>
                          </div>
                        )}

                        {estaActivo && ((vehiculo.estado === 'APROBADO' && tieneVencidos) || esRechazadoDoc) && (
                          <button
                            type="button"
                            onClick={() => setVehiculoEditando({ ...vehiculo, vencidos: { licencia: lic.vencido, seguro: seg.vencido, cedula: ced.vencido } })}
                            className="repartidor-btn repartidor-btn--danger-soft repartidor-btn--sm"
                            style={{ marginTop: '0.4rem' }}
                          >
                            🔄 Actualizar documentación
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {vehiculoEditando && (
              <section className="repartidor-subbox repartidor-subbox--danger">
                <div className="repartidor-subbox__head">
                  <h4 className="repartidor-subbox__title">
                    Renovar Documentación Vencida: {vehiculoEditando.tipo_vehiculo}
                  </h4>
                  <button type="button" onClick={() => setVehiculoEditando(null)}>✕</button>
                </div>

                <form onSubmit={handleActualizarDocumentos} className="repartidor-form">
                  {vehiculoEditando.vencidos?.cedula && (
                    <label className="repartidor-field repartidor-file">
                      <span>📄 Cédula verde / azul (Nuevo Archivo y Fecha)</span>
                      <input name="cedula" type="file" accept="image/*,.pdf" onChange={handleArchivoRenovacion} required />
                      <input type="date" name="fecha_vencimiento_cedula" value={formRenovacion.fecha_vencimiento_cedula} onChange={(e) => setFormRenovacion({ ...formRenovacion, fecha_vencimiento_cedula: e.target.value })} className="repartidor-input" required />
                    </label>
                  )}

                  {vehiculoEditando.vencidos?.seguro && (
                    <label className="repartidor-field repartidor-file">
                      <span>🛡️ Póliza de Seguro (Nuevo Archivo y Fecha)</span>
                      <input name="seguro" type="file" accept="image/*,.pdf" onChange={handleArchivoRenovacion} required />
                      <input type="date" name="fecha_vencimiento_seguro" value={formRenovacion.fecha_vencimiento_seguro} onChange={(e) => setFormRenovacion({ ...formRenovacion, fecha_vencimiento_seguro: e.target.value })} className="repartidor-input" required />
                    </label>
                  )}

                  {vehiculoEditando.vencidos?.licencia && (
                    <label className="repartidor-field repartidor-file">
                      <span>🪪 Licencia de Conducir (Nuevo Archivo y Fecha)</span>
                      <input name="licencia" type="file" accept="image/*,.pdf" onChange={handleArchivoRenovacion} required />
                      <input type="date" name="fecha_vencimiento_licencia" value={formRenovacion.fecha_vencimiento_licencia} onChange={(e) => setFormRenovacion({ ...formRenovacion, fecha_vencimiento_licencia: e.target.value })} className="repartidor-input" required />
                    </label>
                  )}

                  <button type="submit" disabled={enviandoSolicitud} className="repartidor-btn repartidor-btn--primary repartidor-btn--block">
                    {enviandoSolicitud ? '⏳ Guardando...' : 'Enviar Renovación a Revisión'}
                  </button>
                </form>
              </section>
            )}

            <section className="repartidor-subbox">
              <h3 className="repartidor-subbox__title">Solicitar alta de vehículo</h3>
              <form onSubmit={handleSolicitarVehiculo} className="repartidor-form">
                <select
                  name="IDtipo_vehiculo"
                  value={formVehiculo.IDtipo_vehiculo}
                  onChange={(e) => setFormVehiculo({ ...formVehiculo, IDtipo_vehiculo: e.target.value })}
                  required
                  className="repartidor-select"
                >
                  <option value="">Tipo de vehículo</option>
                  <option value="2">Bicicleta 🚴</option>
                  <option value="3">Moto 🛵</option>
                  <option value="4">Auto 🚗</option>
                </select>

                <input
                  name="marca"
                  placeholder={esBicicleta ? 'Marca o Color (Opcional)' : 'Marca'}
                  value={formVehiculo.marca}
                  onChange={(e) => setFormVehiculo({ ...formVehiculo, marca: e.target.value })}
                  className="repartidor-input"
                />

                <input
                  name="modelo"
                  placeholder={esBicicleta ? 'Modelo / Tipo (Opcional)' : 'Modelo'}
                  value={formVehiculo.modelo}
                  onChange={(e) => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })}
                  className="repartidor-input"
                />

                <input
                  name="anio"
                  type="number"
                  placeholder="Año (Opcional)"
                  value={formVehiculo.anio}
                  onChange={(e) => setFormVehiculo({ ...formVehiculo, anio: e.target.value })}
                  className="repartidor-input"
                />

                {!esBicicleta && (
                  <>
                    <input
                      name="patente"
                      placeholder="Patente (Requerido para Moto/Auto)"
                      value={formVehiculo.patente}
                      onChange={(e) => setFormVehiculo({ ...formVehiculo, patente: e.target.value })}
                      required={!esBicicleta}
                      className="repartidor-input"
                    />

                    <div className="repartidor-stack">
                      <label className="repartidor-field repartidor-file">
                        <span>Cédula verde / azul (Archivo y Vencimiento)</span>
                        <input name="cedula" type="file" accept="image/*,.pdf" onChange={handleArchivoVehiculo} />
                        <input type="date" name="fecha_vencimiento_cedula" value={formVehiculo.fecha_vencimiento_cedula} onChange={(e) => setFormVehiculo({ ...formVehiculo, fecha_vencimiento_cedula: e.target.value })} className="repartidor-input" />
                      </label>

                      <label className="repartidor-field repartidor-file">
                        <span>Póliza de Seguro (Archivo y Vencimiento)</span>
                        <input name="seguro" type="file" accept="image/*,.pdf" onChange={handleArchivoVehiculo} />
                        <input type="date" name="fecha_vencimiento_seguro" value={formVehiculo.fecha_vencimiento_seguro} onChange={(e) => setFormVehiculo({ ...formVehiculo, fecha_vencimiento_seguro: e.target.value })} className="repartidor-input" />
                      </label>

                      <label className="repartidor-field repartidor-file">
                        <span>Licencia de Conducir (Archivo y Vencimiento)</span>
                        <input name="licencia" type="file" accept="image/*,.pdf" onChange={handleArchivoVehiculo} />
                        <input type="date" name="fecha_vencimiento_licencia" value={formVehiculo.fecha_vencimiento_licencia} onChange={(e) => setFormVehiculo({ ...formVehiculo, fecha_vencimiento_licencia: e.target.value })} className="repartidor-input" />
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={enviandoSolicitud}
                  className="repartidor-btn repartidor-btn--success repartidor-btn--block"
                >
                  {enviandoSolicitud ? '⏳ Enviando solicitud...' : 'Enviar solicitud'}
                </button>
              </form>
            </section>
          </div>
        </div>
      )}

      {/* MODAL PERFIL */}
      {mostrarPerfil && (
        <div className="repartidor-modal-overlay">
          <div className="repartidor-modal-content repartidor-modal-content--md">
            <div className="repartidor-modal-head">
              <h2>👤 Perfil del Repartidor</h2>
              <button type="button" onClick={() => setMostrarPerfil(false)}>✕</button>
            </div>

            {cargandoPerfil ? (
              <div className="repartidor-state">
                <div className="repartidor-spinner"></div>
                <p>Cargando perfil...</p>
              </div>
            ) : perfil ? (
              <div className="repartidor-form">
                <div className="repartidor-subbox">
                  <label className="repartidor-field">
                    <span>DNI (Documento Nacional de Identidad)</span>
                    <input type="text" value={perfil.dni || ''} readOnly disabled className="repartidor-input" />
                  </label>
                  <small className="repartidor-muted" style={{ fontSize: '0.75rem' }}>
                    🔒 El DNI no es editable por motivos de seguridad.
                  </small>
                </div>

                <div className="repartidor-field">
                  <span>Nombre de usuario (Username)</span>
                  <input type="text" value={perfil.username || ''} readOnly disabled className="repartidor-input" />
                </div>

                <div className="repartidor-field">
                  <span>Correo electrónico (Email)</span>
                  <input type="email" value={perfil.email || ''} readOnly disabled className="repartidor-input" />
                </div>

                {(perfil.nombre || perfil.apellido) && (
                  <div className="repartidor-field">
                    <span>Nombre completo</span>
                    <div className="repartidor-readonly">
                      {perfil.nombre} {perfil.apellido}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMostrarCambioPass(!mostrarCambioPass)}
                  className="repartidor-btn repartidor-btn--outline repartidor-btn--block"
                >
                  🔐 {mostrarCambioPass ? 'Ocultar Cambio de Contraseña' : 'Cambiar Contraseña'}
                </button>

                {mostrarCambioPass && <CambiarPasswordModal onClose={() => setMostrarCambioPass(false)} />}

                <button
                  onClick={() => {
                    setMostrarPerfil(false);
                    setMostrarCambioPass(false);
                  }}
                  className="repartidor-btn repartidor-btn--success repartidor-btn--block"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--sd-rep-error)' }}>No se pudo cargar la información del perfil.</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE AVISOS / ALERTAS */}
      {modalAviso && (
        <div className="repartidor-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="repartidor-modal-content repartidor-modal-content--sm">
            <div className="repartidor-aviso-box">
              <div className={`repartidor-aviso-icon ${modalAviso.titulo.includes('✅') ? 'repartidor-aviso-icon--success' : 'repartidor-aviso-icon--error'}`}>
                {modalAviso.titulo.includes('✅') ? '✓' : '⚠️'}
              </div>
              <h3>{modalAviso.titulo}</h3>
              <p>{modalAviso.mensaje}</p>
            </div>
            <div className="repartidor-modal-foot" style={{ marginTop: '24px' }}>
              <button
                onClick={() => {
                  const cb = modalAviso.callback;
                  setModalAviso(null);
                  if (cb) cb();
                }}
                className="repartidor-btn repartidor-btn--primary repartidor-btn--block"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {modalConfirmacion && (
        <div className="repartidor-modal-overlay" style={{ zIndex: 3000 }}>
          <div className="repartidor-modal-content repartidor-modal-content--sm">
            <div className="repartidor-aviso-box">
              <div className="repartidor-aviso-icon repartidor-aviso-icon--warning">⚠️</div>
              <h3>{modalConfirmacion.titulo}</h3>
              <p>{modalConfirmacion.mensaje}</p>
            </div>
            <div className="repartidor-modal-foot">
              <button
                onClick={() => setModalConfirmacion(null)}
                className="repartidor-btn repartidor-btn--outline repartidor-btn--grow"
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirmacion.onConfirm}
                className="repartidor-btn repartidor-btn--danger repartidor-btn--grow"
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