// src/components/Local/GestionHorariosLocal.jsx
import { useState, useEffect } from 'react';
import { getHorariosLocal, updateHorariosLocal } from '../../api/localService';
import { Icon, Spinner, Banner } from './LocalUI';
import './css/Local.css';

const DIAS_SEMANA = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado'
];

export const GestionHorariosLocal = () => {
    const [horarios, setHorarios] = useState([]);
    const [horariosOriginales, setHorariosOriginales] = useState([]);
    
    const [editando, setEditando] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

    // 🟢 Generador de IDs temporales únicos e independientes para el estado reactivo
    const generarIdUnico = (diaIdx, extra = '') => {
        return `turno-${diaIdx}-${extra}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    };

    const formatearHora = (hora, horaPorDefecto) => {
        if (!hora || typeof hora !== 'string') return horaPorDefecto;
        const limpia = hora.trim();
        return limpia.length >= 5 ? limpia.substring(0, 5) : horaPorDefecto;
    };

    const inicializarHorarios = (dataServidor = []) => {
        if (Array.isArray(dataServidor) && dataServidor.length > 0) {
            return dataServidor.map((h, index) => ({
                idTemp: generarIdUnico(Number(h.dia_semana), index),
                dia_semana: Number(h.dia_semana),
                hora_apertura: formatearHora(h.hora_apertura, '08:00'),
                hora_cierre: formatearHora(h.hora_cierre, '20:00'),
                es_activo: Boolean(h.es_activo)
            }));
        }

        // 🟢 Generación de valores totalmente independientes por día
        return DIAS_SEMANA.map((_, diaIdx) => ({
            idTemp: generarIdUnico(diaIdx, 'default'),
            dia_semana: diaIdx,
            hora_apertura: '08:00',
            hora_cierre: '20:00',
            es_activo: true
        }));
    };

    const cargarHorarios = async () => {
        setLoading(true);
        try {
            const data = await getHorariosLocal();
            const formateados = inicializarHorarios(data);
            setHorarios(formateados);
            setHorariosOriginales(JSON.parse(JSON.stringify(formateados)));
        } catch (err) {
            console.error('Error al obtener horarios:', err);
            const porDefecto = inicializarHorarios([]);
            setHorarios(porDefecto);
            setHorariosOriginales(JSON.parse(JSON.stringify(porDefecto)));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarHorarios();
    }, []);

    // 🟢 Modificación aislada: solo cambia la propiedad del idTemp seleccionado
    const handleChange = (idTemp, field, value) => {
        setHorarios((prev) =>
            prev.map((item) => (item.idTemp === idTemp ? { ...item, [field]: value } : item))
        );
    };

    // 🟢 Agrega un nuevo turno de forma independiente
    const handleAgregarTurno = (diaIdx) => {
        const nuevoTurno = {
            idTemp: generarIdUnico(diaIdx, 'nuevo'),
            dia_semana: diaIdx,
            hora_apertura: '17:00',
            hora_cierre: '23:00',
            es_activo: true
        };
        setHorarios((prev) => [...prev, nuevoTurno]);
    };

    // 🟢 Elimina exclusivamente el turno seleccionado
    const handleEliminarTurno = (idTemp) => {
        setHorarios((prev) => prev.filter((item) => item.idTemp !== idTemp));
    };

    const handleCancelarEdicion = () => {
        setHorarios(JSON.parse(JSON.stringify(horariosOriginales)));
        setEditando(false);
        setMensaje({ tipo: '', texto: '' });
    };

    const handleGuardar = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMensaje({ tipo: '', texto: '' });

        try {
            const horariosPayload = horarios.map((item) => ({
                dia_semana: item.dia_semana,
                hora_apertura: item.hora_apertura || '08:00',
                hora_cierre: item.hora_cierre || '20:00',
                es_activo: item.es_activo
            }));

            await updateHorariosLocal(horariosPayload);
            setMensaje({ tipo: 'exito', texto: '¡Horarios y turnos actualizados correctamente!' });

            setHorariosOriginales(JSON.parse(JSON.stringify(horarios)));
            setEditando(false);
        } catch (err) {
            setMensaje({
                tipo: 'error',
                texto: err.response?.data?.error || err.message || 'Error al guardar los horarios.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="local-state local-scope" role="status">
                <Spinner />
                Cargando configuración de horarios...
            </div>
        );
    }

    return (
        <section className="local-section">
            <div className="local-section-head">
                <div>
                    <h2 className="local-title">
                        <span className="local-title__icon"><Icon name="calendar" size={20} /></span>
                        Configuración de horarios de atención
                    </h2>
                    <p className="local-subtitle">
                        Configurá rangos de atención independientes para cada día.
                    </p>
                </div>

                {!editando && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditando(true);
                            setMensaje({ tipo: '', texto: '' });
                        }}
                        className="local-btn local-btn--primary"
                    >
                        <Icon name="pencil" />
                        Actualizar / Editar
                    </button>
                )}
            </div>

            {mensaje.texto && (
                <Banner tipo={mensaje.tipo === 'error' ? 'error' : 'success'}>
                    {mensaje.texto}
                </Banner>
            )}

            <form onSubmit={handleGuardar}>
                <div className="local-days">
                    {DIAS_SEMANA.map((nombreDia, diaIdx) => {
                        const turnosDelDia = horarios.filter((h) => h.dia_semana === diaIdx);

                        return (
                            <div key={`dia-${diaIdx}`} className="local-day">
                                <div className="local-day__name">
                                    <strong>{nombreDia}</strong>
                                    {turnosDelDia.length === 0 && (
                                        <span className="local-badge local-badge--neutral">Cerrado</span>
                                    )}
                                    {editando && (
                                        <button
                                            type="button"
                                            onClick={() => handleAgregarTurno(diaIdx)}
                                            className="local-btn local-btn--sm local-btn--success-soft"
                                        >
                                            <Icon name="plus" size={14} />
                                            Añadir turno
                                        </button>
                                    )}
                                </div>

                                {turnosDelDia.length === 0 ? (
                                    <p className="local-closed">
                                        <Icon name="clock" size={16} />
                                        Día sin horarios configurados (Cerrado).
                                    </p>
                                ) : (
                                    <div className="local-turnos">
                                        {turnosDelDia.map((item, index) => (
                                            <div
                                                key={item.idTemp}
                                                className={`local-turno ${item.es_activo ? '' : 'local-turno--off'}`}
                                            >
                                                <label className="local-field">
                                                    <span>Apertura (turno {index + 1})</span>
                                                    <input
                                                        type="time"
                                                        disabled={!editando || !item.es_activo || isSaving}
                                                        value={item.hora_apertura}
                                                        onChange={(e) => handleChange(item.idTemp, 'hora_apertura', e.target.value)}
                                                        className="local-input"
                                                    />
                                                </label>

                                                <label className="local-field">
                                                    <span>Cierre</span>
                                                    <input
                                                        type="time"
                                                        disabled={!editando || !item.es_activo || isSaving}
                                                        value={item.hora_cierre}
                                                        onChange={(e) => handleChange(item.idTemp, 'hora_cierre', e.target.value)}
                                                        className="local-input"
                                                    />
                                                </label>

                                                <label className="local-check local-turno__state" style={{ cursor: editando ? 'pointer' : 'not-allowed' }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={!editando || isSaving}
                                                        checked={item.es_activo}
                                                        onChange={(e) => handleChange(item.idTemp, 'es_activo', e.target.checked)}
                                                    />
                                                    {item.es_activo ? 'Activo' : 'Inactivo'}
                                                </label>

                                                {editando && turnosDelDia.length > 1 ? (
                                                    <div className="local-turno__del">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEliminarTurno(item.idTemp)}
                                                            className="local-icon-btn local-icon-btn--danger"
                                                            title="Eliminar este turno"
                                                            aria-label="Eliminar este turno"
                                                        >
                                                            <Icon name="trash" size={16} />
                                                        </button>
                                                    </div>
                                                ) : <div />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {editando && (
                    <div className="local-sticky-actions">
                        <button
                            type="button"
                            onClick={handleCancelarEdicion}
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
                                <><Icon name="save" /> Guardar horarios</>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </section>
    );
};