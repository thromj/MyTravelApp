document.addEventListener('DOMContentLoaded', () => {
    // Mapbox API-Token
    mapboxgl.accessToken = 'pk.eyJ1Ijoiam9uYXRoYW50aHJvbSIsImEiOiJjbTdiM3Y2aXUwOHMyMmtzZ2txZHdrZWN1In0.boR_RvXQ_Zfk_CpXb2kUFQ';

    // Mapbox-Karte initialisieren
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [10.0, 51.0], // Mittelpunkt Deutschland
        zoom: 6
    });

    // GPX-Datei hochladen und verarbeiten
    document.getElementById('gpx-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const gpxData = event.target.result;
            console.log('GPX-Datei geladen:', gpxData); // Debugging
            parseGPX(gpxData);
        };
        reader.readAsText(file);
    });

    // GPX-Datei parsen und Route anzeigen
    function parseGPX(gpxData) {
        const gpx = new GPXParser(gpxData);
        gpx.parse();

        // Extrahiere Koordinaten aus der GPX-Datei
        const coordinates = gpx.tracks[0].points.map(point => [point.lon, point.lat]);
        console.log('Koordinaten:', coordinates); // Debugging

        // Entferne alte Route, falls vorhanden
        if (map.getLayer('route')) {
            map.removeLayer('route');
            map.removeSource('route');
        }

        // Füge die Route zur Karte hinzu
        map.addSource('route', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            }
        });

        map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#3887be',
                'line-width': 5
            }
        });

        // Zoome zur Route
        const bounds = coordinates.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        map.fitBounds(bounds, { padding: 50 });
    }
});
