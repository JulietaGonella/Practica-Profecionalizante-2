// src/components/NotificationMenu.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMisNotificaciones,
  marcarNotificacionLeida,
  marcarTodasComoLeidas
} from '../../api/notificationsService';
import '../Components.css';
import { Inbox } from "lucide-react";

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

  // Ajustar alineación dinámica según espacio en pantalla
  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      setAlignLeft(rect.left < 320 && spaceRight > 320);
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
    <div ref={menuRef} className="sd-notification-wrapper">
      {/* Botón Bandeja */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="sd-notification-btn"
        title="Notificaciones"
      >
        <Inbox size={22} strokeWidth={1.8} color="#C45113" />
        {unreadCount > 0 && (
          <span className="sd-notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menú Desplegable Adaptable */}
      {open && (
        <div className={`sd-notification-dropdown ${alignLeft ? 'sd-notification-dropdown--left' : 'sd-notification-dropdown--right'}`}>
          {/* Cabecera Fija */}
          <div className="sd-notification-header">
            <span className="sd-notification-title">Notificaciones</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="sd-notification-mark-all">
                Marcar todas leídas
              </button>
            )}
          </div>

          {/* Cuerpo con Scroll Integrado */}
          <div className="sd-notification-body">
            {notifications.length === 0 ? (
              <div className="sd-notification-empty">
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((notif) => {
                const estaLeido = Boolean(notif.leido);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`sd-notification-item ${estaLeido ? 'sd-notification-item--read' : 'sd-notification-item--unread'}`}
                  >
                    <div className="sd-notification-item-head">
                      <strong className="sd-notification-item-title">{notif.titulo}</strong>
                      {!estaLeido && <span className="sd-notification-item-dot" />}
                    </div>
                    <p className="sd-notification-message">
                      {notif.mensaje}
                    </p>

                    {notif.creado_en && (
                      <span className="sd-notification-time">
                        {new Date(notif.creado_en).toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};