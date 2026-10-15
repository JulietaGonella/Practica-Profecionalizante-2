import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearAdministradorAdmin } from '../../api/adminService';
import { Icon, Spinner, Banner, sinEmoji } from './AdminUI';
import './CSS/Administrador.css';

export const CrearAdminForm = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });

  const [mensaje, setMensaje] = useState({
    tipo: '',
    texto: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMensaje({ tipo: '', texto: '' });

    if (!form.username.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes ingresar un nombre de usuario.'
      });
      return;
    }

    if (!form.email.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes ingresar un correo electrónico.'
      });
      return;
    }

    if (!form.password.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes ingresar una contraseña.'
      });
      return;
    }

    try {
      setLoading(true);

      await crearAdministradorAdmin({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      });

      setMensaje({
        tipo: 'success',
        texto: '✅ Usuario administrador creado correctamente.'
      });

      setForm({
        username: '',
        email: '',
        password: ''
      });
    } catch (error) {
      console.error('Error al crear administrador:', error);

      setMensaje({
        tipo: 'error',
        texto:
          error.response?.data?.error ||
          error.response?.data?.message ||
          'No se pudo crear el usuario administrador.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page admin-scope">
      <div className="admin-page__inner admin-page__inner--narrow">
        <div className="admin-page-head">
          <div className="admin-brand">
            <span className="admin-brand__mark" aria-hidden="true">
              <Icon name="shield" size={24} />
            </span>
            <div>
              <h1>Crear administrador</h1>
              <p>Completá los datos de la nueva cuenta de administración.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/inicio')}
            className="admin-btn admin-btn--outline"
          >
            <Icon name="arrowLeft" />
            Volver
          </button>
        </div>

        <div className="admin-form-card">
          {mensaje.texto && (
            <Banner tipo={mensaje.tipo}>{sinEmoji(mensaje.texto)}</Banner>
          )}

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="admin-field">
              <label htmlFor="username" className="admin-field__label">
                Nombre de usuario
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                disabled={loading}
                required
                className="admin-input"
              />
            </div>

            <div className="admin-field">
              <label htmlFor="email" className="admin-field__label">
                Correo electrónico
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                required
                className="admin-input"
              />
            </div>

            <div className="admin-field">
              <label htmlFor="password" className="admin-field__label">
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                required
                minLength={8}
                className="admin-input"
              />
              <span className="admin-field-hint">Mínimo 8 caracteres.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="admin-btn admin-btn--primary admin-btn--lg admin-btn--block"
            >
              {loading ? (
                <><Spinner /> Creando administrador...</>
              ) : (
                <><Icon name="plus" /> Crear administrador</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};