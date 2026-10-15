// src/components/Local/PerfilLocal.jsx
import { useState, useEffect } from 'react';
import { getMiLocal, updatePerfilLocal } from '../../api/localService';
import { CambiarPasswordModal } from '../CambiarPasswordModal';
import { Icon, Spinner, Banner } from './LocalUI';
import './css/Local.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const PerfilLocal = () => {
    const [localData, setLocalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editando, setEditando] = useState(false);
    const [mostrarCambioPass, setMostrarCambioPass] = useState(false);
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
    if (loading) {
        return (
            <div className="local-state local-scope" role="status">
                <Spinner />
                Cargando datos del perfil...
            </div>
        );
    }

    return (
        <section className="local-section">
            <div className="local-section-head">
                <div>
                    <h2 className="local-title">
                        <span className="local-title__icon"><Icon name="store" size={20} /></span>
                        Perfil e información del comercio
                    </h2>
                    <p className="local-subtitle">
                        Gestioná la información operativa e imágenes del comercio.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Alterna la visibilidad del cambio de contraseña */}
                    <button
                        type="button"
                        onClick={() => setMostrarCambioPass(!mostrarCambioPass)}
                        className="local-btn local-btn--outline"
                    >
                        <Icon name="key" />
                        {mostrarCambioPass ? 'Ocultar cambio de clave' : 'Cambiar contraseña'}
                    </button>

                    {!editando && (
                        <button
                            type="button"
                            onClick={() => setEditando(true)}
                            className="local-btn local-btn--primary"
                        >
                            <Icon name="pencil" />
                            Editar perfil
                        </button>
                    )}
                </div>
            </div>

            {/* Formulario para cambiar contraseña */}
            {mostrarCambioPass && (
                <div className="local-card">
                    <CambiarPasswordModal onClose={() => setMostrarCambioPass(false)} />
                </div>
            )}

            {mensaje.texto && (
                <Banner tipo={mensaje.tipo === 'error' ? 'error' : 'success'}>
                    {mensaje.texto}
                </Banner>
            )}

            <form onSubmit={handleSubmit} className="local-profile">
                {/* SECCIÓN 1: DATOS EXCLUSIVOS DE ADMINISTRADOR (SOLO LECTURA) */}
                <div className="local-readonly">
                    <h3>
                        <Icon name="lock" size={16} />
                        Información administrativa (solo administrador general)
                    </h3>
                    <div className="local-grid-auto">
                        <label className="local-field">
                            <span>Nombre del local</span>
                            <input type="text" value={localData?.nombre || ''} disabled className="local-input" />
                        </label>
                        <label className="local-field">
                            <span>Dirección</span>
                            <input type="text" value={localData?.direccion || ''} disabled className="local-input" />
                        </label>
                        <label className="local-field">
                            <span>Ubicación GPS (lat / lng)</span>
                            <input type="text" value={`${localData?.latitud || 0}, ${localData?.longitud || 0}`} disabled className="local-input" />
                        </label>
                    </div>
                </div>

                {/* SECCIÓN 2: DATOS EDITABLES POR EL COMERCIO */}
                <div className="local-card">
                    <h3 className="local-card__title">
                        <Icon name="timer" size={18} />
                        Configuración operativa y contacto
                    </h3>
                    <div className="local-grid-auto">
                        <label className="local-field">
                            <span>Teléfono de contacto</span>
                            <input
                                type="text"
                                disabled={!editando || isSaving}
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                placeholder="Ej: +54 353 1234567"
                                className="local-input"
                            />
                        </label>

                        <label className="local-field">
                            <span>Costo de envío base ($)</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={!editando || isSaving}
                                value={costoEnvioBase}
                                onChange={(e) => setCostoEnvioBase(e.target.value)}
                                className="local-input"
                            />
                        </label>

                        <label className="local-field">
                            <span>Tiempo de preparación promedio (min)</span>
                            <input
                                type="number"
                                min="1"
                                disabled={!editando || isSaving}
                                value={tiempoPreparacionPromedio}
                                onChange={(e) => setTiempoPreparacionPromedio(e.target.value)}
                                className="local-input"
                            />
                        </label>
                    </div>
                </div>

                {/* SECCIÓN 3: IMÁGENES DEL COMERCIO (LOGO, BANNER, FOTO) */}
                <div className="local-card">
                    <h3 className="local-card__title">
                        <Icon name="image" size={18} />
                        Galería e imagen de marca
                    </h3>
                    <div className="local-images">
                        {/* Logo */}
                        <div className="local-image-card local-file">
                            <span>Logo del local</span>
                            <div className="local-image-card__preview local-image-card__preview--round">
                                {previews.logo ? (
                                    <img src={previews.logo} alt="Logo" />
                                ) : (
                                    'Sin logo'
                                )}
                            </div>
                            {editando && (
                                <input type="file" accept="image/*" disabled={isSaving} onChange={(e) => handleFileChange(e, 'logo')} aria-label="Seleccionar logo" />
                            )}
                        </div>

                        {/* Banner */}
                        <div className="local-image-card local-file">
                            <span>Banner de encabezado</span>
                            <div className="local-image-card__preview">
                                {previews.banner ? (
                                    <img src={previews.banner} alt="Banner" />
                                ) : (
                                    'Sin banner'
                                )}
                            </div>
                            {editando && (
                                <input type="file" accept="image/*" disabled={isSaving} onChange={(e) => handleFileChange(e, 'banner')} aria-label="Seleccionar banner" />
                            )}
                        </div>

                        {/* Foto principal / fachada */}
                        <div className="local-image-card local-file">
                            <span>Foto fachada / local</span>
                            <div className="local-image-card__preview">
                                {previews.foto ? (
                                    <img src={previews.foto} alt="Foto Fachada" />
                                ) : (
                                    'Sin foto'
                                )}
                            </div>
                            {editando && (
                                <input type="file" accept="image/*" disabled={isSaving} onChange={(e) => handleFileChange(e, 'foto')} aria-label="Seleccionar foto de fachada" />
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                {editando && (
                    <div className="local-sticky-actions" style={{ marginTop: 0 }}>
                        <button
                            type="button"
                            onClick={handleCancelar}
                            disabled={isSaving}
                            className="local-btn local-btn--outline local-btn--lg"
                            style={{ flex: 1 }}
                        >
                            <Icon name="x" />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="local-btn local-btn--primary local-btn--lg"
                            style={{ flex: 1 }}
                        >
                            {isSaving ? (
                                <><Spinner /> Guardando...</>
                            ) : (
                                <><Icon name="save" /> Guardar cambios</>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </section>
    );
};