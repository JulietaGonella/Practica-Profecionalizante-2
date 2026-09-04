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
  getMiPerfilRepartidor
} from '../../api/repartidorService';
import { LogoutButton } from '../LogoutButton';

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
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [formVehiculo, setFormVehiculo] = useState({
    IDtipo_vehiculo: '',
    marca: '',
    modelo: '',
    patente: '',
    anio: '',
    cedula: null,
    seguro: null,
    licencia: null
  });

  const cargarTodo = async () => {
    try {
      setLoading(true);
      setError('');

      const [disponibles, asignados, disponibilidadActual, vehiculosData] = await Promise.all([
        getPedidosDisponibles(),
        getMisPedidosAsignados(),
        getDisponibilidadRepartidor(),
        getMisVehiculos()
      ]);

      setDisponible(Boolean(disponibilidadActual?.disponible));
      setVehiculos(Array.isArray(vehiculosData) ? vehiculosData : []);

      const pedidos = Array.isArray(asignados) ? asignados : [];

      setPedidosDisponibles(
        Array.isArray(disponibles) ? disponibles : []
      );

      setMisPedidos(
        pedidos.filter((pedido) => {
          const estado = Number(pedido.IDestado ?? pedido.id_estado ?? 0);
          // Incluimos todos los estados de gestión del repartidor (4, 5 y 7)
          return estado === 4 || estado === 5 || estado === 7;
        })
      );

      setHistorialPedidos(
        pedidos.filter((pedido) => {
          const estado = Number(pedido.IDestado ?? pedido.id_estado);
          return estado === 3;
        })
      );
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
    try {
      setAceptandoId(ordenId);
      await aceptarPedidoRepartidor(ordenId);
      await cargarTodo();
      setVista('aceptados');
    } catch (err) {
      alert(err.response?.data?.error || 'Error al aceptar el pedido');
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
      alert(err.response?.data?.error || 'No se pudo actualizar tu disponibilidad.');
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

    try {
      await seleccionarVehiculoActivo(IDvehiculo);
      await cargarTodo();
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo seleccionar el vehículo.');
    }
  };

  const handleArchivoVehiculo = (e) => {
    setFormVehiculo((prev) => ({ ...prev, [e.target.name]: e.target.files[0] || null }));
  };

  const handleAbrirPerfil = async () => {
    try {
      setCargandoPerfil(true);
      setMostrarPerfil(true);
      const data = await getMiPerfilRepartidor();
      setPerfil(data);
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo cargar la información del perfil');
    } finally {
      setCargandoPerfil(false);
    }
  };

  const handleSolicitarVehiculo = async (e) => {
    e.preventDefault();
    setEnviandoSolicitud(true);

    try {
      const datos = new FormData();
      Object.entries(formVehiculo).forEach(([campo, valor]) => {
        if (valor !== null && valor !== '') datos.append(campo, valor);
      });

      await solicitarVehiculo(datos);
      setFormVehiculo({ IDtipo_vehiculo: '', marca: '', modelo: '', patente: '', anio: '', cedula: null, seguro: null, licencia: null });
      await cargarTodo();
      alert('Solicitud enviada. Quedará pendiente de revisión administrativa.');
    } catch (err) {
      alert(err.response?.data?.error || 'No se pudo enviar la solicitud.');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  const estiloEstadoVehiculo = {
    APROBADO: { color: '#087f5b', backgroundColor: '#e6fcf5' },
    PENDIENTE: { color: '#946b00', backgroundColor: '#fff3bf' },
    RECHAZADO: { color: '#c92a2a', backgroundColor: '#fff5f5' }
  };

  const renderCardPedido = (pedido, tipo, mostrarDetalle = false) => {
    const ordenId = pedido.IDorden || pedido.id;
    const esAceptado = tipo === 'aceptado';
    const estado = pedido.estado_orden || (esAceptado ? 'Asignado' : tipo === 'historial' ? 'Entregado' : 'Disponible');

    // 1. Obtener solo los productos que NO estén cancelados/rechazados (estado != 6)
    // 1. Obtener solo los productos que NO estén cancelados/rechazados (estado != 6)
    const productosEntregados = (pedido.productos || []).filter((producto) => {
      // Evaluamos los posibles nombres del campo de estado
      const estadoDetalle = Number(
        producto.IDestado_detalle ??
        producto.IDestado_item ??
        producto.IDestado ??
        producto.id_estado ??
        0
      );

      const textoEstado = (producto.estado_detalle || producto.estado_item || '').toLowerCase();

      // Es cancelado si su estado es 6, si la cadena es 'cancelado'/'rechazado' o si posee un motivo de rechazo explícito
      const esCancelado =
        estadoDetalle === 6 ||
        textoEstado === 'cancelado' ||
        textoEstado === 'rechazado' ||
        producto.cancelado === true ||
        Boolean(producto.motivo_rechazo);

      return !esCancelado;
    });

    return (
      <div
        key={ordenId}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '1.2rem',
          backgroundColor: '#fff',
          boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between'
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#6c757d', fontSize: '0.8rem' }}>Pedido</p>
              <h3 style={{ margin: '0.2rem 0 0 0' }}>#{ordenId}</h3>
            </div>

            <span
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: '999px',
                backgroundColor: tipo === 'historial' ? '#f1f3f5' : esAceptado ? '#e7f5ff' : '#e6fcf5',
                color: tipo === 'historial' ? '#495057' : esAceptado ? '#1c7ed6' : '#099268',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                border: `1px solid ${tipo === 'historial' ? '#ced4da' : esAceptado ? '#a5d8ff' : '#90f2c8'}`
              }}
            >
              {estado}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              rowGap: '0.45rem',
              columnGap: '1rem',
              marginBottom: '1rem'
            }}
          >
            <span>Subtotal</span>
            <strong>$ {Number(pedido.subtotal || 0).toFixed(2)}</strong>

            <span>Envío</span>
            <strong>$ {Number(pedido.costo_envio || 0).toFixed(2)}</strong>

            <span>Total</span>
            <strong style={{ color: '#1c7ed6' }}>
              $ {Number(pedido.total || 0).toFixed(2)}
            </strong>
          </div>

          {/* 📦 Productos entregados (se excluyen los cancelados/rechazados) */}
          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
              Productos
            </strong>

            {pedido.productos && pedido.productos.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '1.1rem', listStyleType: 'disc' }}>
                {pedido.productos.map((producto, index) => {
                  const estadoDetalle = Number(
                    producto.IDestado_detalle ??
                    producto.IDestado_item ??
                    producto.IDestado ??
                    producto.id_estado ??
                    0
                  );

                  const textoEstado = (producto.estado_detalle || producto.estado_item || '').toLowerCase();

                  // Determinar si el ítem está cancelado o rechazado
                  const esCancelado =
                    estadoDetalle === 6 ||
                    textoEstado === 'cancelado' ||
                    textoEstado === 'rechazado' ||
                    producto.cancelado === true ||
                    Boolean(producto.motivo_rechazo);

                  return (
                    <li
                      key={`${ordenId}-${producto.IDdetalle || index}`}
                      style={{
                        marginBottom: '0.35rem',
                        color: esCancelado ? '#e03131' : '#495057',
                        textDecoration: esCancelado ? 'line-through' : 'none',
                        fontWeight: '500'
                      }}
                    >
                      <span>
                        {producto.cantidad}x {producto.producto || producto.nombre}
                      </span>
                      {esCancelado && (
                        <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', fontStyle: 'italic' }}>
                          (Cancelado)
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p style={{ margin: 0, color: '#868e96', fontSize: '0.85rem' }}>
                Sin productos asociados al pedido.
              </p>
            )}
          </div>
        </div>

        {tipo === 'disponible' && (
          <button
            onClick={() => handleAceptarPedido(ordenId)}
            disabled={aceptandoId === ordenId}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: aceptandoId === ordenId ? '#868e96' : '#2b8a3e',
              color: '#fff',
              fontWeight: 'bold',
              cursor: aceptandoId === ordenId ? 'not-allowed' : 'pointer'
            }}
          >
            {aceptandoId === ordenId ? '⏳ Aceptando...' : 'Aceptar pedido'}
          </button>
        )}

        {mostrarDetalle && (
          <button
            onClick={() => navigate(`/repartidor/orden/${ordenId}`)}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#1c7ed6',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: tipo === 'disponible' ? '0.8rem' : '0'
            }}
          >
            📋 Ver detalle del pedido
          </button>
        )}
      </div>
    );
  };

  const historialVisible = mostrarTodoHistorial
    ? historialPedidos
    : historialPedidos.slice(0, 3);

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Panel de Reparto 🚴</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: '#666' }}>
            Pedidos disponibles y en curso
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.55rem 0.8rem',
              borderRadius: '999px',
              backgroundColor: disponible ? '#e6fcf5' : '#f1f3f5',
              color: disponible ? '#087f5b' : '#495057',
              border: `1px solid ${disponible ? '#96f2d7' : '#ced4da'}`,
              fontWeight: 'bold',
              cursor: actualizandoDisponibilidad ? 'wait' : 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={disponible}
              onChange={handleCambiarDisponibilidad}
              disabled={actualizandoDisponibilidad}
              style={{ width: '18px', height: '18px', accentColor: '#2b8a3e' }}
            />
            {disponible ? 'En línea' : 'Offline'}
          </label>

          <button
            onClick={() => setMostrarVehiculos(true)}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: '#fff3bf',
              border: '1px solid #ffe066',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#795000'
            }}
          >
            🚘 Mi Vehículo
          </button>

          <button
            onClick={handleAbrirPerfil}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: '#e7f5ff',
              border: '1px solid #a5d8ff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#1864ab'
            }}
          >
            👤 Mi Perfil
          </button>

          <button
            onClick={() => navigate('/repartidor/tablero')}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: '#e9ecef',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#333'
            }}
          >
            📊 Ver Estadísticas
          </button>

          <LogoutButton />
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}
      >
        <button
          onClick={() => setVista('disponibles')}
          style={{
            padding: '0.8rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: vista === 'disponibles' ? '#2b8a3e' : '#e9ecef',
            color: vista === 'disponibles' ? '#fff' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          🚴 Pedidos disponibles
        </button>

        <button
          onClick={() => setVista('aceptados')}
          style={{
            padding: '0.8rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: vista === 'aceptados' ? '#1c7ed6' : '#e9ecef',
            color: vista === 'aceptados' ? '#fff' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📦 Mis pedidos en curso
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#555' }}>
          ⏳ Cargando pedidos...
        </div>
      ) : error ? (
        <div style={{ padding: '1rem', backgroundColor: '#fff5f5', border: '1px solid #ffc9c9', color: '#e03131', borderRadius: '8px' }}>
          {error}
        </div>
      ) : vista === 'disponibles' ? (
        <section>
          {pedidosDisponibles.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '10px', color: '#666' }}>
              No hay pedidos disponibles para repartir en este momento.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.25rem' }}>
              {pedidosDisponibles.map((pedido) => renderCardPedido(pedido, 'disponible', false))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <h3>🚴 Pedidos actuales</h3>

          {misPedidos.length === 0 ? (
            <div
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '10px',
                color: '#666'
              }}
            >
              No tenés pedidos en curso.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {misPedidos.map((pedido) =>
                renderCardPedido(pedido, 'aceptado', true)
              )}
            </div>
          )}

          <h3 style={{ marginTop: '2rem' }}>
            📜 Historial de entregas
          </h3>

          {historialPedidos.length === 0 ? (
            <div
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '10px',
                color: '#666'
              }}
            >
              Todavía no tenés pedidos entregados.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
                  gap: '1.25rem'
                }}
              >
                {historialVisible.map((pedido) =>
                  renderCardPedido(pedido, 'historial', false)
                )}
              </div>

              {historialPedidos.length > 3 && (
                <button
                  onClick={() => setMostrarTodoHistorial((prev) => !prev)}
                  style={{
                    marginTop: '1rem',
                    padding: '0.7rem 1.2rem',
                    backgroundColor: '#e9ecef',
                    border: '1px solid #ced4da',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {mostrarTodoHistorial ? '⬆️ Ver menos' : '📜 Ver más entregas'}
                </button>
              )}
            </>
          )}
        </section>
      )}

      {mostrarVehiculos && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '760px', maxHeight: '92vh', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>🚘 Mis vehículos</h2>
              <button type="button" onClick={() => setMostrarVehiculos(false)}>✕</button>
            </div>

            <section style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Vehículo actual</h3>
              {vehiculoActivo ? (
                <p>
                  <strong>{vehiculoActivo.tipo_vehiculo}</strong>{' '}
                  {vehiculoActivo.marca} {vehiculoActivo.modelo} {vehiculoActivo.patente ? `(${vehiculoActivo.patente})` : ''}{' '}
                  <span style={{ color: '#087f5b', fontWeight: 'bold' }}>✓ Verificado</span>
                </p>
              ) : (
                <p style={{ color: '#666' }}>No tenés un vehículo activo seleccionado.</p>
              )}
              <label>
                Vehículo para trabajar:{' '}
                <select value={vehiculoActivo?.IDvehiculo || ''} onChange={handleSeleccionarVehiculo}>
                  <option value="">Seleccionar vehículo aprobado</option>
                  {vehiculosAprobados.map((vehiculo) => (
                    <option key={vehiculo.IDvehiculo} value={vehiculo.IDvehiculo}>
                      {vehiculo.tipo_vehiculo} - {vehiculo.marca || 'Sin marca'} {vehiculo.modelo || ''}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section style={{ marginBottom: '1.2rem' }}>
              <h3>Mis vehículos registrados</h3>
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {vehiculos.length === 0 ? <p style={{ color: '#666' }}>Todavía no tenés vehículos registrados.</p> : vehiculos.map((vehiculo) => {
                  const estilo = estiloEstadoVehiculo[vehiculo.estado] || estiloEstadoVehiculo.PENDIENTE;
                  return (
                    <div key={vehiculo.IDvehiculo} style={{ padding: '0.8rem', borderRadius: '8px', backgroundColor: estilo.backgroundColor, border: `1px solid ${estilo.color}` }}>
                      <strong>{vehiculo.tipo_vehiculo} - {vehiculo.marca || 'Sin marca'} {vehiculo.modelo || ''}</strong>
                      <div style={{ color: estilo.color, fontWeight: 'bold', fontSize: '0.85rem' }}>{vehiculo.estado}</div>
                      {vehiculo.patente && <div>Patente: {vehiculo.patente}</div>}
                      {vehiculo.estado === 'RECHAZADO' && vehiculo.motivo_rechazo && <div>Motivo: {vehiculo.motivo_rechazo}</div>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h3>Solicitar alta de vehículo</h3>
              <form onSubmit={handleSolicitarVehiculo} style={{ display: 'grid', gap: '0.7rem' }}>
                <select name="IDtipo_vehiculo" value={formVehiculo.IDtipo_vehiculo} onChange={(e) => setFormVehiculo({ ...formVehiculo, IDtipo_vehiculo: e.target.value })} required>
                  <option value="">Tipo de vehículo</option>
                  <option value="3">Moto</option>
                  <option value="2">Bicicleta</option>
                  <option value="4">Moto</option>
                </select>
                <input name="marca" placeholder="Marca" value={formVehiculo.marca} onChange={(e) => setFormVehiculo({ ...formVehiculo, marca: e.target.value })} />
                <input name="modelo" placeholder="Modelo" value={formVehiculo.modelo} onChange={(e) => setFormVehiculo({ ...formVehiculo, modelo: e.target.value })} />
                <input name="patente" placeholder="Patente" value={formVehiculo.patente} onChange={(e) => setFormVehiculo({ ...formVehiculo, patente: e.target.value })} />
                <input name="anio" type="number" placeholder="Año" value={formVehiculo.anio} onChange={(e) => setFormVehiculo({ ...formVehiculo, anio: e.target.value })} />
                <label>Cédula verde <input name="cedula" type="file" accept="image/*,.pdf" onChange={handleArchivoVehiculo} /></label>
                <label>Seguro <input name="seguro" type="file" accept="image/*,.pdf" onChange={handleArchivoVehiculo} /></label>
                <label>Registro / licencia <input name="licencia" type="file" accept="image/*,.pdf" onChange={handleArchivoVehiculo} /></label>
                <button type="submit" disabled={enviandoSolicitud}>{enviandoSolicitud ? 'Enviando...' : 'Enviar solicitud'}</button>
              </form>
            </section>
          </div>
        </div>
      )}

      {mostrarPerfil && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '0.8rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>👤 Perfil del Repartidor</h2>
              <button
                type="button"
                onClick={() => setMostrarPerfil(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {cargandoPerfil ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                ⏳ Cargando perfil...
              </div>
            ) : perfil ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Identificación personal (DNI Bloqueado / Readonly) */}
                <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#6c757d', marginBottom: '0.3rem', fontWeight: 'bold' }}>
                    DNI (Documento Nacional de Identidad)
                  </label>
                  <input
                    type="text"
                    value={perfil.dni || ''}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      border: '1px solid #ced4da',
                      backgroundColor: '#e9ecef',
                      color: '#495057',
                      fontWeight: 'bold',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ color: '#868e96', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' }}>
                    🔒 El DNI no es editable por el repartidor por motivos de seguridad.
                  </small>
                </div>

                {/* Datos básicos de usuario */}
                <div style={{ display: 'grid', gap: '0.8rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#495057', marginBottom: '0.2rem', fontWeight: '600' }}>
                      Nombre de usuario (Username)
                    </label>
                    <input
                      type="text"
                      value={perfil.username || ''}
                      readOnly
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#f1f3f5',
                        color: '#333',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#495057', marginBottom: '0.2rem', fontWeight: '600' }}>
                      Correo electrónico (Email)
                    </label>
                    <input
                      type="email"
                      value={perfil.email || ''}
                      readOnly
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #ced4da',
                        backgroundColor: '#f1f3f5',
                        color: '#333',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {(perfil.nombre || perfil.apellido) && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#495057', marginBottom: '0.2rem', fontWeight: '600' }}>
                        Nombre completo
                      </label>
                      <p style={{ margin: 0, padding: '0.6rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                        {perfil.nombre} {perfil.apellido}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                  <button
                    onClick={() => setMostrarPerfil(false)}
                    style={{
                      padding: '0.6rem 1.2rem',
                      backgroundColor: '#2b8a3e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Cerrar
                  </button>
                </div>

              </div>
            ) : (
              <p style={{ color: '#c92a2a' }}>No se pudo cargar la información del perfil.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};