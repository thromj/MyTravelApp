// Mapbox-Zugriffstoken wird aus config.js geladen
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Build-Nummer für die Anzeige oben rechts
let buildNumber = [1, 0, 0, 3];
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
        paint: {
            'circle-radius': 15, // Größer für Touch-Bedienung
            'circle-color': '#ff0000',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });

    // "Plus"-Symbole an den Enden des Tracks darstellen
    map.addLayer({
        id: 'add-endpoints',
        type: 'symbol',
        source: 'route',
        layout: {
            'icon-image': 'plus-15', // Mapbox-Symbol für "Plus"
            'icon-size': 1.5,
            'icon-offset': [0, -15],
            'icon-allow-overlap': true,
            'visibility': 'visible'
        }
    });
});

// GPX-Datei hochladen und Wegpunkte hinzufügen
document.getElementById('gpx-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const gpxData = e.target.result;
        const parser = new DOMParser();
        const gpx = parser.parseFromString(gpxData, 'text/xml');
        const points = gpx.getElementsByTagName('trkpt');

        waypoints = [];
        for (let point of points) {
            const lon = parseFloat(point.getAttribute('lon'));
            const lat = parseFloat(point.getAttribute('lat'));
            waypoints.push([lon, lat]);
        }

        updateRoute();
    };

    reader.readAsText(file);
});

// Mausklick auf Karte zum Hinzufügen eines neuen Wegpunkts oder Bearbeiten eines bestehenden Punktes
map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['waypoints', 'route-line'] });

    if (features.length > 0) {
        if (features[0].layer.id === "waypoints") {
            // Wenn ein Wegpunkt angeklickt wird, Menü anzeigen
            const waypointIndex = features[0].properties.index;
            showWaypointMenu(e.point, waypointIndex);
        } else if (features[0].layer.id === "route-line") {
            // Wenn auf die Linie geklickt wird, neuen Punkt zwischen zwei bestehenden Punkten hinzufügen
            const coords = [e.lngLat.lng, e.lngLat.lat];
            addWaypointBetween(coords);
        }
    } else {
        // Wenn kein Feature angeklickt wird, neuen Punkt hinzufügen
        hideWaypointMenu();
        const coords = [e.lngLat.lng, e.lngLat.lat];
        waypoints.push(coords);
        updateRoute();
    }
});

// Mauszeiger ändern, wenn er über einen Wegpunkt schwebt
map.on('mouseenter', 'waypoints', () => {
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'waypoints', () => {
    map.getCanvas().style.cursor = '';
});

// Wegpunkt verschieben durch Drag-and-Drop (Maus oder Touch)
map.on('mousedown', 'waypoints', onWaypointInteractionStart);
map.on('touchstart', 'waypoints', onWaypointInteractionStart);

function onWaypointInteractionStart(e) {
    if (e.features.length > 0) {
        e.preventDefault();

        // Navigationsmodus deaktivieren während des Verschiebens
        map.dragPan.disable();

        const waypointIndex = e.features[0].properties.index;

        function onMove(e) {
            const coords = e.lngLat;
            waypoints[waypointIndex] = [coords.lng, coords.lat];
            updateRoute(false); // Kein automatisches Zoomen während des Verschiebens
        }

        function onUp() {
            map.off('mousemove', onMove);
            map.off('touchmove', onMove);
            map.off('mouseup', onUp);
            map.off('touchend', onUp);

            // Navigationsmodus wieder aktivieren
            map.dragPan.enable();
        }

        map.on('mousemove', onMove);
        map.on('touchmove', onMove);
        map.on('mouseup', onUp);
        map.on('touchend', onUp);
    }
}

// Menü für einen ausgewählten Wegpunkt anzeigen
function showWaypointMenu(point, index) {
    waypointMenu.style.display = 'block';
    waypointMenu.style.left = `${point.x}px`;
    waypointMenu.style.top = `${point.y}px`;
    selectedWaypointIndex = index;
}

// Menü ausblenden
function hideWaypointMenu() {
    waypointMenu.style.display = 'none';
    selectedWaypointIndex = null;
}

// Wegpunkt löschen
deleteWaypointButton.addEventListener('click', () => {
    if (selectedWaypointIndex !== null) {
        waypoints.splice(selectedWaypointIndex, 1);
        updateRoute();
        hideWaypointMenu();
    }
});

// Neuen Wegpunkt zwischen zwei bestehenden Punkten hinzufügen
function addWaypointBetween(coords) {
    let minDistance = Infinity;
    let insertIndex = -1;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const segmentStart = waypoints[i];
        const segmentEnd = waypoints[i + 1];

        const distanceToSegment =
            turf.pointToLineDistance(turf.point(coords), turf.lineString([segmentStart, segmentEnd]), { units: "meters" });

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
    routeSource.data.features = [
        // Linie für die Route hinzufügen
        {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: waypoints,
            },
            properties: {}
        },
        
         ...waypoints.map((coords,index)=>({type:"Point"}))
