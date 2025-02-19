mapboxgl.accessToken = 'pk.eyJ1Ijoiam9uYXRoYW50aHJvbSIsImEiOiJjbTdiM3Y2aXUwOHMyMmtzZ2txZHdrZWN1In0.boR_RvXQ_Zfk_CpXb2kUFQ';

let buildNumber = [1, 0, 0, 0];
updateBuildNumber();

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [10.4515, 51.1657],
    zoom: 6
});

// Array für Wegpunkte und GeoJSON-Quelle
let waypoints = [];
let routeSource = {
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: []
    }
};

// Map-Quelle und Layer hinzufügen
map.on('load', () => {
    map.addSource('route', routeSource);

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

    map.addLayer({
        id: 'waypoints',
        type: 'circle',
        source: 'route',
        paint: {
            'circle-radius': 6,
            'circle-color': '#ff0000'
        }
    });
});

// GPX-Datei hochladen und anzeigen
document.getElementById('gpx-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
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

// Mausklick auf Karte zum Hinzufügen von Wegpunkten
map.on('click', (e) => {
    const coords = [e.lngLat.lng, e.lngLat.lat];
    waypoints.push(coords);
    updateRoute();
});

// Drag-and-Drop für Wegpunkte aktivieren
map.on('mousedown', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['waypoints'] });
    
    if (features.length) {
        const waypointIndex = features[0].properties.index;
        
        map.on('mousemove', onDrag);
        map.once('mouseup', () => map.off('mousemove', onDrag));

        function onDrag(e) {
            waypoints[waypointIndex] = [e.lngLat.lng, e.lngLat.lat];
            updateRoute();
        }
    }
});

// Route aktualisieren
function updateRoute() {
    // GeoJSON-Daten aktualisieren
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
        }))
    ];

    // Quelle neu laden
    if (map.getSource('route')) {
        map.getSource('route').setData(routeSource.data);
    }

    // Karte anpassen
    if (waypoints.length > 1) {
        const bounds = waypoints.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(waypoints[0], waypoints[0]));
        map.fitBounds(bounds, { padding: 50 });
    }
}

// Build-Nummer aktualisieren
function updateBuildNumber() {
    buildNumber[3]++;
    
    if (buildNumber[3] > 9) {
        buildNumber[3] = 0;
        buildNumber[2]++;
        
        if (buildNumber[2] > 9) {
            buildNumber[2] = 0;
            buildNumber[1]++;
            
            if (buildNumber[1] > 9) {
                buildNumber[1] = 0;
                buildNumber[0]++;
            }
        }
    }

    document.getElementById('build-number').innerText = `V ${buildNumber.join('.')}`;
}
