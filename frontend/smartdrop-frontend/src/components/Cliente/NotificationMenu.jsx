import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMisNotificaciones,
  marcarNotificacionLeida,
  marcarTodasComoLeidas
} from '../../api/notificationsService';

export const NotificationMenu = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [alignLeft, setAlignLeft] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Cargar notificaciones
  const fetchNotifications = async () => {
    try {
      const data = await getMisNotificaciones();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Al abrir el menú, verificar la distancia al borde de la pantalla
  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setAlignLeft(rect.left < 320);
    }
    setOpen(!open);
  };

  const unreadCount = notifications.filter(n => !n.leido || n.leido === 0).length;

  const handleNotificationClick = async (notif) => {
    if (!notif.leido) {
      try {
        await marcarNotificacionLeida(notif.id);
        setNotifications(prev =>
          prev.map(n => n.id === notif.id ? { ...n, leido: 1 } : n)
        );
      } catch (error) {
        console.error('Error al marcar como leída:', error);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await marcarTodasComoLeidas();
      setNotifications(prev => prev.map(n => ({ ...n, leido: 1 })));
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
    }
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Botón Campana */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.3rem',
          position: 'relative',
          padding: '0.4rem',
          display: 'flex',
          alignItems: 'center'
        }}
        title="Notificaciones"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: '#e03131',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              lineHeight: 1
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable Adaptable */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '120%',
            ...(alignLeft ? { left: 0 } : { right: 0 }),
            width: 'min(320px, 85vw)',
            maxHeight: '400px',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            overflowY: 'auto',
            zIndex: 1200,
            border: '1px solid #e9ecef'
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}
          >
            <strong style={{ fontSize: '0.95rem' }}>Notificaciones</strong>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1c7ed6',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
              No tienes notificaciones
            </div>
          ) : (
            notifications.map((notif) => {
              const estaLeido = Boolean(notif.leido);
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '0.8rem 1rem',
                    borderBottom: '1px solid #f1f3f5',
                    backgroundColor: estaLeido ? '#ffffff' : '#e7f5ff',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#333' }}>{notif.titulo}</strong>
                    {!estaLeido && (
                      <span style={{ height: '8px', width: '8px', backgroundColor: '#1c7ed6', borderRadius: '50%' }} />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#555', lineHeight: '1.2' }}>
                    {notif.mensaje}
                  </p>

                  {notif.creado_en && (
                    <span style={{ fontSize: '0.7rem', color: '#999', display: 'block', marginTop: '0.3rem' }}>
                      {new Date(notif.creado_en).toLocaleString()}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};