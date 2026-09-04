// src/components/Local/GestionHorariosLocal.jsx
import { useState, useEffect } from 'react';
import { getHorariosLocal, updateHorariosLocal } from '../../api/localService';

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

    if (loading) return <div>⏳ Cargando configuración de horarios...</div>;

    return (
        <div style={{ marginTop: '1.5rem', border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ margin: 0 }}>📅 Configuración de Horarios de Atención</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem', margin: '0.3rem 0 0 0' }}>
                        Configura rangos de atención e independientes para cada día.
                    </p>
                </div>

                {!editando && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditando(true);
                            setMensaje({ tipo: '', texto: '' });
                        }}
                        style={{
                            padding: '0.6rem 1.2rem',
                            backgroundColor: '#007bff',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        ✏️ Actualizar / Editar
                    </button>
                )}
            </div>

            {mensaje.texto && (
                <p style={{ color: mensaje.tipo === 'error' ? 'red' : 'green', fontWeight: 'bold' }}>
                    {mensaje.texto}
                </p>
            )}

            <form onSubmit={handleGuardar}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {DIAS_SEMANA.map((nombreDia, diaIdx) => {
                        const turnosDelDia = horarios.filter((h) => h.dia_semana === diaIdx);

                        return (
                            <div
                                key={`dia-${diaIdx}`}
                                style={{
                                    border: '1px solid #dee2e6',
                                    borderRadius: '8px',
                                    padding: '0.8rem',
                                    backgroundColor: '#f8f9fa'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <strong style={{ fontSize: '1.05rem' }}>{nombreDia}</strong>
                                    {editando && (
                                        <button
                                            type="button"
                                            onClick={() => handleAgregarTurno(diaIdx)}
                                            style={{
                                                padding: '0.3rem 0.6rem',
                                                backgroundColor: '#28a745',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            ➕ Añadir Turno
                                        </button>
                                    )}
                                </div>

                                {turnosDelDia.length === 0 ? (
                                    <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>Día sin horarios configurados (Cerrado).</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {turnosDelDia.map((item, index) => (
                                            <div
                                                key={item.idTemp}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1fr 1fr 100px 40px',
                                                    gap: '10px',
                                                    alignItems: 'center',
                                                    padding: '0.5rem',
                                                    backgroundColor: item.es_activo ? '#fff' : '#ffe8cc',
                                                    borderRadius: '6px',
                                                    border: '1px solid #e9ecef'
                                                }}
                                            >
                                                <div>
                                                    <small style={{ display: 'block' }}>Apertura (Turno {index + 1}):</small>
                                                    <input
                                                        type="time"
                                                        disabled={!editando || !item.es_activo || isSaving}
                                                        value={item.hora_apertura}
                                                        onChange={(e) => handleChange(item.idTemp, 'hora_apertura', e.target.value)}
                                                        style={{ padding: '0.3rem', width: '100%' }}
                                                    />
                                                </div>

                                                <div>
                                                    <small style={{ display: 'block' }}>Cierre:</small>
                                                    <input
                                                        type="time"
                                                        disabled={!editando || !item.es_activo || isSaving}
                                                        value={item.hora_cierre}
                                                        onChange={(e) => handleChange(item.idTemp, 'hora_cierre', e.target.value)}
                                                        style={{ padding: '0.3rem', width: '100%' }}
                                                    />
                                                </div>

                                                <label style={{ cursor: editando ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        disabled={!editando || isSaving}
                                                        checked={item.es_activo}
                                                        onChange={(e) => handleChange(item.idTemp, 'es_activo', e.target.checked)}
                                                    />
                                                    {' '}{item.es_activo ? 'Activo' : 'Inactivo'}
                                                </label>

                                                {editando && turnosDelDia.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEliminarTurno(item.idTemp)}
                                                        style={{
                                                            backgroundColor: '#dc3545',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: '0.4rem',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Eliminar este turno"
                                                    >
                                                        🗑️
                                                    </button>
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
                    <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={handleCancelarEdicion}
                            disabled={isSaving}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                backgroundColor: '#6c757d',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ❌ Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={isSaving}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                backgroundColor: '#2b8a3e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontWeight: 'bold',
                                cursor: isSaving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSaving ? '⏳ Guardando...' : '💾 Guardar Horarios'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};