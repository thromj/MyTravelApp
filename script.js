mapboxgl.accessToken = 'pk.eyJ1Ijoiam9uYXRoYW50aHJvbSIsImEiOiJjbTdiM3Y2aXUwOHMyMmtzZ2txZHdrZWN1In0.boR_RvXQ_Zfk_CpXb2kUFQ';

let buildNumber = [1, 0, 0, 1];
updateBuildNumber();

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [10.4515, 51.1657],
    zoom: 6
});

let waypoints = [];
let routeSource = {
    type: 'geojson',
    data: {
        type: 'FeatureCollection',
        features: []
    }
};

let selectedWaypointIndex = null;
const waypointMenu = document.getElementById('waypoint-menu');
const deleteWaypointButton = document.getElementById('delete-waypoint');

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
            'circle-radius': 10,
            'circle-color': '#ff0000',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
        }
    });
});

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

map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['waypoints'] });
    
    if (features.length) {
        selectedWaypointIndex = features[0].properties.index;
        showWaypointMenu(e.point);
    } else {
        hideWaypointMenu();
        const coords = [e.lngLat.lng, e.lngLat.lat];
        waypoints.push(coords);
        updateRoute();
    }
});

map.on('mousedown', 'waypoints', onWaypointInteractionStart);
map.on('touchstart', 'waypoints', onWaypointInteractionStart);

function onWaypointInteractionStart(e) {
    if (e.features.length > 0) {
        e.preventDefault();
        const waypointIndex = e.features[0].properties.index;
        
        function onMove(e) {
            const coords = e.lngLat || map.unproject(e.point);
            waypoints[waypointIndex] = [coords.lng, coords.lat];
            updateRoute();
        }
        
        function onUp(e) {
            map.off('mousemove', onMove);
            map.off('touchmove', onMove);
            map.off('mouseup', onUp);
            map.off('touchend', onUp);
        }

        map.on('mousemove', onMove);
        map.on('touchmove', onMove);
        map.on('mouseup', onUp);
        map.on('touchend', onUp);
    }
}

deleteWaypointButton.addEventListener('click', () => {
    if (selectedWaypointIndex !== null) {
        waypoints.splice(selectedWaypointIndex, 1);
        updateRoute();
        hideWaypointMenu();
    }
});

function showWaypointMenu(point) {
    waypointMenu.style.display = 'block';
    waypointMenu.style.left = `${point.x}px`;
    waypointMenu.style.top = `${point.y}px`;
}

function hideWaypointMenu() {
    waypointMenu.style.display = 'none';
    selectedWaypointIndex = null;
}

function updateRoute() {
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

    if (map.getSource('route')) {
        map.getSource('route').setData(routeSource.data);
    }

    if (waypoints.length > 1) {
        const bounds = waypoints.reduce((bounds, coord) => bounds.extend(coord), new mapboxgl.LngLatBounds(waypoints[0], waypoints[0]));
        map.fitBounds(bounds, { padding: 50 });
    }
}

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

map.on('click', (e) => {
    if (e.originalEvent.target.id !== 'delete-waypoint') {
        hideWaypointMenu();
    }
});
