// src/components/Local/PerfilLocal.jsx
import { useState, useEffect } from 'react';
import { getMiLocal, updatePerfilLocal } from '../../api/localService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const PerfilLocal = () => {
    const [localData, setLocalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editando, setEditando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // Estados para campos editables
    const [telefono, setTelefono] = useState('');
    const [costoEnvioBase, setCostoEnvioBase] = useState(0);
    const [tiempoPreparacionPromedio, setTiempoPreparacionPromedio] = useState(20);

    // Estados de archivos e previsualizaciones
    const [archivos, setArchivos] = useState({ logo: null, banner: null, foto: null });
    const [previews, setPreviews] = useState({ logo: '', banner: '', foto: '' });

    const cargarPerfil = async () => {
        setLoading(true);
        try {
            const data = await getMiLocal();
            setLocalData(data);

            setTelefono(data.telefono || '');
            setCostoEnvioBase(data.costo_envio_base || 0);
            setTiempoPreparacionPromedio(data.tiempo_preparacion_promedio || 20);

            const resolverUrl = (path) =>
                path ? (path.startsWith('http') ? path : `${API_BASE_URL}${path}`) : '';

            setPreviews({
                logo: resolverUrl(data.logo_url),
                banner: resolverUrl(data.banner_url),
                foto: resolverUrl(data.foto_url)
            });
        } catch (err) {
            console.error('Error al obtener perfil:', err);
            setMensaje({ tipo: 'error', texto: 'No se pudo cargar la información del local.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarPerfil();
    }, []);

    const handleFileChange = (e, campo) => {
        const file = e.target.files[0];
        if (file) {
            setArchivos((prev) => ({ ...prev, [campo]: file }));
            setPreviews((prev) => ({ ...prev, [campo]: URL.createObjectURL(file) }));
        }
    };

    const handleCancelar = () => {
        setEditando(false);
        setMensaje({ tipo: '', texto: '' });
        setArchivos({ logo: null, banner: null, foto: null });
        cargarPerfil();
    };

    // src/components/Local/PerfilLocal.jsx
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMensaje({ tipo: '', texto: '' });

        try {
            const formData = new FormData();

            // Campos de texto y numéricos
            formData.append('telefono', telefono);
            formData.append('costo_envio_base', Number(costoEnvioBase));
            formData.append('tiempo_preparacion_promedio', Number(tiempoPreparacionPromedio));

            // Adjuntar archivos solo si fueron seleccionados
            if (archivos.logo) formData.append('logo', archivos.logo);
            if (archivos.banner) formData.append('banner', archivos.banner);
            if (archivos.foto) formData.append('foto', archivos.foto);

            await updatePerfilLocal(formData);

            setMensaje({ tipo: 'exito', texto: '¡Perfil actualizado exitosamente!' });
            setEditando(false);
            await cargarPerfil();
        } catch (err) {
            setMensaje({
                tipo: 'error',
                texto: err.response?.data?.error || err.message || 'Error al guardar los datos del perfil.'
            });
        } finally {
            setIsSaving(false);
        }
    };
    if (loading) return <div>⏳ Cargando datos del perfil...</div>;

    return (
        <div style={{ marginTop: '1.5rem', border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0 }}>🏪 Perfil e Información del Comercio</h3>
                    <p style={{ color: '#666', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                        Gestiona la información operativa e imágenes del comercio.
                    </p>
                </div>

                {!editando && (
                    <button
                        type="button"
                        onClick={() => setEditando(true)}
                        style={{ padding: '0.6rem 1.2rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        ✏️ Editar Perfil
                    </button>
                )}
            </div>

            {mensaje.texto && (
                <p style={{ color: mensaje.tipo === 'error' ? 'red' : 'green', fontWeight: 'bold', marginBottom: '1rem' }}>
                    {mensaje.texto}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                {/* SECCIÓN 1: DATOS EXCLUSIVOS DE ADMINISTRADOR (SOLO LECTURA) */}
                <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e9ecef' }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', color: '#495057' }}>🔒 Información Administrativa (Solo Administrador General)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block' }}>Nombre del Local:</label>
                            <input type="text" value={localData?.nombre || ''} disabled style={{ width: '100%', padding: '0.5rem', marginTop: '4px', backgroundColor: '#e9ecef', border: '1px solid #ced4da', borderRadius: '4px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block' }}>Dirección:</label>
                            <input type="text" value={localData?.direccion || ''} disabled style={{ width: '100%', padding: '0.5rem', marginTop: '4px', backgroundColor: '#e9ecef', border: '1px solid #ced4da', borderRadius: '4px' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block' }}>Ubicación GPS (Lat / Lng):</label>
                            <input type="text" value={`${localData?.latitud || 0}, ${localData?.longitud || 0}`} disabled style={{ width: '100%', padding: '0.5rem', marginTop: '4px', backgroundColor: '#e9ecef', border: '1px solid #ced4da', borderRadius: '4px' }} />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: DATOS EDITABLES POR EL COMERCIO */}
                <h4 style={{ margin: '0 0 0.8rem 0', color: '#212529' }}>⚙️ Configuración Operativa y Contacto</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block' }}>📞 Teléfono de Contacto:</label>
                        <input
                            type="text"
                            disabled={!editando || isSaving}
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                            placeholder="Ej: +54 353 1234567"
                            style={{ width: '100%', padding: '0.5rem', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block' }}>💵 Costo de Envío Base ($):</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={!editando || isSaving}
                            value={costoEnvioBase}
                            onChange={(e) => setCostoEnvioBase(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block' }}>⏱️ Tiempo Prep. Promedio (Mins):</label>
                        <input
                            type="number"
                            min="1"
                            disabled={!editando || isSaving}
                            value={tiempoPreparacionPromedio}
                            onChange={(e) => setTiempoPreparacionPromedio(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', marginTop: '4px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* SECCIÓN 3: IMÁGENES DEL COMERCIO (LOGO, BANNER, FOTO) */}
                <h4 style={{ margin: '0 0 0.8rem 0', color: '#212529' }}>🖼️ Galería e Imagen de Marca</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '1.5rem' }}>
                    {/* Logo */}
                    <div style={{ border: '1px solid #eee', padding: '0.8rem', borderRadius: '6px', textAlign: 'center' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Logo del Local</label>
                        {previews.logo ? (
                            <img src={previews.logo} alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%', marginBottom: '0.5rem' }} />
                        ) : (
                            <div style={{ width: '80px', height: '80px', backgroundColor: '#eee', borderRadius: '50%', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin logo</div>
                        )}
                        {editando && (
                            <input type="file" accept="image/*" disabled={isSaving} onChange={(e) => handleFileChange(e, 'logo')} style={{ fontSize: '0.8rem', width: '100%' }} />
                        )}
                    </div>

                    {/* Banner */}
                    <div style={{ border: '1px solid #eee', padding: '0.8rem', borderRadius: '6px', textAlign: 'center' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Banner Encabezado</label>
                        {previews.banner ? (
                            <img src={previews.banner} alt="Banner" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }} />
                        ) : (
                            <div style={{ width: '100%', height: '80px', backgroundColor: '#eee', borderRadius: '4px', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin banner</div>
                        )}
                        {editando && (
                            <input type="file" accept="image/*" disabled={isSaving} onChange={(e) => handleFileChange(e, 'banner')} style={{ fontSize: '0.8rem', width: '100%' }} />
                        )}
                    </div>

                    {/* Foto Principal / Fachada */}
                    <div style={{ border: '1px solid #eee', padding: '0.8rem', borderRadius: '6px', textAlign: 'center' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Foto Fachada / Local</label>
                        {previews.foto ? (
                            <img src={previews.foto} alt="Foto Fachada" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }} />
                        ) : (
                            <div style={{ width: '100%', height: '80px', backgroundColor: '#eee', borderRadius: '4px', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin foto</div>
                        )}
                        {editando && (
                            <input type="file" accept="image/*" disabled={isSaving} onChange={(e) => handleFileChange(e, 'foto')} style={{ fontSize: '0.8rem', width: '100%' }} />
                        )}
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                {editando && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={handleCancelar}
                            disabled={isSaving}
                            style={{ flex: 1, padding: '0.8rem', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                            ❌ Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{ flex: 1, padding: '0.8rem', backgroundColor: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                        >
                            {isSaving ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};