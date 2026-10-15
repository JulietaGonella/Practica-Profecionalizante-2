import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Colores con buen contraste sobre el mapa, alineados a la paleta SmartDrop
const PALETA_COLORES = [
    '#C45113',
    '#245FC7',
    '#16804A',
    '#E6373F',
    '#17243A',
    '#946000',
    '#0E7490',
    '#6D4AC2'
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
        <div className="admin-map">
            <div className="admin-map__canvas">
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

                        const infoRepartidor = mapaColoresRepartidor[punto?.repartidor_id] || { color: '#245FC7', nombre: punto?.nombre || 'Repartidor' };
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

            {/* Leyenda inferior */}
            <div className="admin-map__legend">
                <div className="admin-map__group">
                    <strong>Repartidores:</strong>
                    {Object.values(mapaColoresRepartidor).map((rep, i) => (
                        <span key={`legend-${i}`} className="admin-map__item">
                            <span className="admin-map__dot" style={{ backgroundColor: rep.color }}></span>
                            <span>{rep.nombre}</span>
                        </span>
                    ))}
                </div>

                <div className="admin-map__size">
                    <span>Cantidad de pedidos:</span>
                    <i className="sm" aria-hidden="true"></i> 1
                    <i className="lg" aria-hidden="true"></i> 2+
                </div>
            </div>
        </div>
    );
};