document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.gpx';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const gpxData = event.target.result;
            console.log('GPX-Datei geladen:', gpxData); // Debugging
            parseGPX(gpxData);
        };
        reader.readAsText(file);
    });

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
