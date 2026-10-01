import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const PALETA_COLORES = [
    '#f59f00',
    '#ae3ec9',
    '#f783ac',
    '#15aabf',
    '#82c91e',
    '#e03131',
    '#4263eb',
    '#7950f2'
];

const centroDefault = [-32.4075, -63.2400]; // Villa María / Villa Nueva

export const MapaRepartidores = ({ datosMapa = [] }) => {
    // Mapeo dinámico de repartidores a colores fijos
    const mapaColoresRepartidor = useMemo(() => {
        const mapa = {};
        let colorIdx = 0;
        if (Array.isArray(datosMapa)) {
            datosMapa.forEach(p => {
                if (p && p.repartidor_id && !mapa[p.repartidor_id]) {
                    const nombreValido = p.nombre && p.nombre.trim() !== '' ? p.nombre : `Repartidor #${p.repartidor_id}`;

                    mapa[p.repartidor_id] = {
                        nombre: nombreValido,
                        color: PALETA_COLORES[colorIdx % PALETA_COLORES.length]
                    };
                    colorIdx++;
                }
            });
        }
        return mapa;
    }, [datosMapa]);

    // Cálculo del centro inicial seguro
    const primerPunto = Array.isArray(datosMapa) && datosMapa.length > 0 ? datosMapa[0] : null;
    const latPrimer = Number(primerPunto?.latitud);
    const lngPrimer = Number(primerPunto?.longitud);

    const centroSeguro = (!isNaN(latPrimer) && !isNaN(lngPrimer))
        ? [latPrimer, lngPrimer]
        : centroDefault;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ width: '100%', height: '340px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
                <MapContainer center={centroSeguro} zoom={13} style={{ width: '100%', height: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {Array.isArray(datosMapa) && datosMapa.map((punto, index) => {
                        const lat = Number(punto?.latitud);
                        const lng = Number(punto?.longitud);
                        const cantidad = Number(punto?.cantidad_pedidos) || 1;

                        if (isNaN(lat) || isNaN(lng)) return null;

                        const infoRepartidor = mapaColoresRepartidor[punto?.repartidor_id] || { color: '#1c7ed6', nombre: punto?.nombre || 'Repartidor' };
                        const radioPixels = Math.max(10, cantidad * 7);

                        return (
                            <CircleMarker
                                key={`map-circle-${index}`}
                                center={[lat, lng]}
                                radius={radioPixels}
                                pathOptions={{
                                    color: infoRepartidor.color,
                                    fillColor: infoRepartidor.color,
                                    fillOpacity: 0.6,
                                    weight: 2
                                }}
                            >
                                <Popup>
                                    <strong>{infoRepartidor.nombre}</strong><br />
                                    Pedidos asignados: {cantidad}
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* Leyenda Inferior */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', paddingTop: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 'bold', color: '#495057' }}>Repartidores:</span>
                    {Object.values(mapaColoresRepartidor).map((rep, i) => (
                        <div key={`legend-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: rep.color, display: 'inline-block' }}></span>
                            <span>{rep.nombre}</span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6c757d' }}>
                    <span>Cantidad de pedidos:</span>
                    <span style={{ fontSize: '0.7rem' }}>●</span> 1
                    <span style={{ fontSize: '1rem' }}>●</span> 2+
                </div>
            </div>
        </div>
    );
};