import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearAdministradorAdmin } from '../../api/adminService';

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
    <div
      style={{
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '1.5rem',
        border: '1px solid #ccc',
        borderRadius: '10px',
        backgroundColor: '#fff'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}
      >
        <h2 style={{ margin: 0 }}>Crear administrador</h2>

        <button
          type="button"
          onClick={() => navigate('/admin/inicio')}
          style={{
            padding: '0.5rem 0.8rem',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#6c757d',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          ← Volver
        </button>
      </div>

      {mensaje.texto && (
        <div
          style={{
            marginBottom: '1.2rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor:
              mensaje.tipo === 'success' ? '#e6fcf5' : '#fff5f5',
            border: `1px solid ${
              mensaje.tipo === 'success' ? '#8ce99a' : '#ffc9c9'
            }`,
            color: mensaje.tipo === 'success' ? '#087f5b' : '#c92a2a',
            fontWeight: 'bold'
          }}
        >
          {mensaje.texto}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: '1rem'
        }}
      >
        <div>
          <label
            htmlFor="username"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}
          >
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
            style={{
              width: '100%',
              padding: '0.7rem',
              boxSizing: 'border-box',
              border: '1px solid #ced4da',
              borderRadius: '6px'
            }}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}
          >
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
            style={{
              width: '100%',
              padding: '0.7rem',
              boxSizing: 'border-box',
              border: '1px solid #ced4da',
              borderRadius: '6px'
            }}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.4rem' }}
          >
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
            style={{
              width: '100%',
              padding: '0.7rem',
              boxSizing: 'border-box',
              border: '1px solid #ced4da',
              borderRadius: '6px'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.8rem',
            border: 'none',
            borderRadius: '7px',
            backgroundColor: loading ? '#868e96' : '#1c7ed6',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? '⏳ Creando administrador...' : '➕ Crear administrador'}
        </button>
      </form>
    </div>
  );
};