document.addEventListener('DOMContentLoaded', () => {
    // GPX-Upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.gpx';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            alert('GPX-Datei geladen: ' + file.name);
            // Hier später die Route zeichnen
        };
        reader.readAsText(file);
    });
});