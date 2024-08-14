const video = document.getElementById('video');
const resultsContainer = document.getElementById('results');

Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
}

video.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    let referenceDescriptor = null;

    // Función para cargar y detectar la cara de la cédula
    async function loadAndDetectCedulaFace() {
        const img = await faceapi.fetchImage('/mnt/data/imagen.png'); // Ruta a tu imagen
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        if (detection) {
            referenceDescriptor = detection.descriptor;
            console.log('Descriptor de referencia cargado');
        } else {
            console.error('No se pudo detectar la cara en la cédula.');
        }
    }

    await loadAndDetectCedulaFace();

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        if (referenceDescriptor && detections.length > 0) {
            const faceMatcher = new faceapi.FaceMatcher([referenceDescriptor], 0.6);
            const results = detections.map(d => faceMatcher.findBestMatch(d.descriptor));
            resultsContainer.innerHTML = results.map((result, i) => `<div>Rostro ${i + 1}: ${result.toString()}</div>`).join('');

            const isMatch = results.some(result => result.label === 'person 1');
            resultsContainer.innerHTML += `<div>${isMatch ? 'La cara coincide con la cédula' : 'La cara no coincide con la cédula'}</div>`;
        } else {
            resultsContainer.innerHTML = '<div>No se detectaron rostros o no hay descriptor de referencia cargado.</div>';
        }
    }, 1000);
});
