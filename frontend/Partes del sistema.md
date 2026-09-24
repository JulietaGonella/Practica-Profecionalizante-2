ahora vamos a hacer el mapa en tiempo real del cliente. ### B. Tracking en Tiempo Real del Repartidor

* **Endpoint de apoyo:** `GET /api/orders/:id/tracking` (Ya lo tienes implementado en `orders.service.js`).
* **Lógica en el Cliente:**
1. Configurar un `setInterval` en la vista de seguimiento del cliente que llame a `GET /api/orders/:id/tracking` cada **5 o 7 segundos**.
2. El endpoint retornará las coordenadas actuales (`repartidor.ubicacion.latitud` y `longitud`).


3. En tu librería de mapas (Leaflet o Google Maps), actualizas la posición del marcador del repartidor (`marker.setLatLng([lat, lng])`) aplicando una transición suave si está disponible.
dentro de como se general las rutas y coordenadas hice unos cambios, me toma coordenadas reales de la ciudad para que sea mas fluido, asi que primero vamos a ver el enpoind del cliente, para ver si debemos cambiar algo, tambien que este mas o menos a la misma frecuencia que usa el repartidor. digo en tiempo de que muestra  el pin moviendose.

Paso 3: App/Vista del Cliente (El consumidor)

Una vez que verifiques en tu base de datos que las coordenadas del repartidor cambian y los locales se marcan como retirados, programa el setInterval del cliente con el GET /api/orders/:id/tracking para pintar el mapa en tiempo real.