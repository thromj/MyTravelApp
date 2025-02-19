// Mapbox-Zugriffstoken wird aus config.js geladen
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Build-Nummer für die Anzeige oben rechts
let buildNumber = [1, 0, 0, 5];
updateBuildNumber();

// Initialisierung der Karte
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [10.4515, 51.1657],
    zoom: 6
});

// Variablen für Waypoints und GeoJSON-Quelle
let waypoints = [];
let routeSource = {
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: []
    }
};

// Variablen für Wegpunkt-Auswahl und Menü
let selectedWaypointIndex = null;
const waypointMenu = document.getElementById('waypoint-menu');
const deleteWaypointButton = document.getElementById('delete-waypoint');

// Quelle und Layer hinzufügen, wenn die Karte geladen ist
map.on('load', () => {
    map.addSource('route', routeSource);

    // Route als Linie darstellen
    map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#888',
            'line-width': 4
        }
    });

    // Wegpunkte als Kreise darstellen
    map.addLayer({
        id: 'waypoints',
        type: 'circle',
        source: 'route',
        filter: ['!', ['in', '$type', 'LineString']],
        paint: {
            'circle-radius': 15,
            'circle-color': '#ff0000',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // "Plus"-Symbole an den Enden des Tracks darstellen
    map.loadImage('https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png', (error, image) => {
        if (error) throw error;
        map.addImage('custom-marker', image);
        map.addLayer({
            id: 'add-endpoints',
            type: 'symbol',
            source: 'route',
            filter: ['in', '$type', 'Point'],
            layout: {
                'icon-image': 'custom-marker',
                'icon-size': 0.5,
                'icon-allow-overlap': true
            }
        });
    });
});

// Mausklick auf Karte zum Hinzufügen eines neuen Wegpunkts oder Bearbeiten eines bestehenden Punktes
map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['waypoints', 'route-line', 'add-endpoints'] });

    if (features.length > 0) {
        if (features[0].layer.id === "waypoints") {
            const waypointIndex = features[0].properties.index;
            showWaypointMenu(e.point, waypointIndex);
        } else if (features[0].layer.id === "route-line") {
            const coords = [e.lngLat.lng, e.lngLat.lat];
            addWaypointBetween(coords);
        } else if (features[0].layer.id === "add-endpoints") {
            const coords = [e.lngLat.lng, e.lngLat.lat];
            const index = features[0].properties.index;
            if (index === 0) {
                waypoints.unshift(coords);
            } else {
                waypoints.push(coords);
            }
            updateRoute();
        }
    } else {
        hideWaypointMenu();
        const coords = [e.lngLat.lng, e.lngLat.lat];
        waypoints.push(coords);
        updateRoute();
    }
});

// Wegpunkt verschieben durch Drag-and-Drop (Maus oder Touch)
map.on('mousedown', 'waypoints', onWaypointInteractionStart);
map.on('touchstart', 'waypoints', onWaypointInteractionStart);

function onWaypointInteractionStart(e) {
    if (e.features.length > 0) {
        e.preventDefault();
        map.dragPan.disable();

        const waypointIndex = e.features[0].properties.index;
        let startPoint = e.point;
        let startTime = new Date().getTime();

        function onMove(e) {
            const currentPoint = e.point;
            const currentTime = new Date().getTime();
            
            if (currentTime - startTime > 50) {  // Update every 50ms
                const dx = currentPoint.x - startPoint.x;
                const dy = currentPoint.y - startPoint.y;
                
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    const newCenter = map.unproject([
                        map.getContainer().offsetWidth / 2 - dx,
                        map.getContainer().offsetHeight / 2 - dy
                    ]);
                    map.panTo(newCenter, { duration: 50 });
                }
                
                startPoint = currentPoint;
                startTime = currentTime;
            }

            const coords = e.lngLat;
            waypoints[waypointIndex] = [coords.lng, coords.lat];
            updateRoute(false);
        }

        function onUp() {
            map.off('mousemove', onMove);
            map.off('touchmove', onMove);
            map.off('mouseup', onUp);
            map.off('touchend', onUp);
            map.dragPan.enable();
        }

        map.on('mousemove', onMove);
        map.on('touchmove', onMove);
        map.on('mouseup', onUp);
        map.on('touchend', onUp);
    }
}

// Neuen Wegpunkt zwischen zwei bestehenden Punkten hinzufügen
function addWaypointBetween(coords) {
    let minDistance = Infinity;
    let insertIndex = -1;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const segmentStart = waypoints[i];
        const segmentEnd = waypoints[i + 1];

        const distanceToSegment = distanceToLine(coords, segmentStart, segmentEnd);

        if (distanceToSegment < minDistance) {
            minDistance = distanceToSegment;
            insertIndex = i + 1;
        }
    }

    if (insertIndex !== -1) {
        waypoints.splice(insertIndex, 0, coords);
        updateRoute();
    }
}

// Route aktualisieren und GeoJSON-Daten neu laden
function updateRoute(zoomToFitBounds = true) {
    if (waypoints.length > 0) {
        routeSource.data.features = [
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: waypoints
                },
                properties: {}
            },
            ...waypoints.map((coords, index) => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: coords
                },
                properties: { index }
            })),
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: waypoints[0]
                },
                properties: { index: 0, isEndpoint: true }
            },
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: waypoints[waypoints.length - 1]
                },
                properties: { index: waypoints.length - 1, isEndpoint: true }
            }
        ];

        if (map.getSource('route')) {
            map.getSource('route').setData(routeSource.data);
        }

        if (zoomToFitBounds && waypoints.length > 1) {
            const bounds = waypoints.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(waypoints[0], waypoints[0]));
            map.fitBounds(bounds, { padding: 50 });
        }
    }
}

// Hilfsfunktionen und andere Funktionen bleiben unverändert
// ...

