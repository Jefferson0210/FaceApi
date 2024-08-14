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
        .catch(err => console.error('Error al acceder a la cámara: ', err));
}

const THRESHOLD = 0.5; // Valor umbral para considerar una coincidencia

video.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        // Verificar si hay exactamente dos rostros detectados
        if (detections.length === 2) {
            // Creamos un FaceMatcher con el primer rostro como referencia
            const labeledDescriptors = [new faceapi.LabeledFaceDescriptors('referencia', [detections[0].descriptor])];
            const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, THRESHOLD);
            const result = faceMatcher.findBestMatch(detections[1].descriptor);

            const isMatch = result.label === 'referencia' && result.distance < THRESHOLD;

            resultsContainer.innerHTML = isMatch
                ? '<div>La cara coincide con la cédula. Es la misma persona.</div>'
                : '<div>La cara no coincide con la cédula. No es la misma persona.</div>';
        } else if (detections.length < 2) {
            resultsContainer.innerHTML = '<div>No se detectaron ambos rostros. Asegúrese de que tanto su cara como la cédula sean visibles.</div>';
        } else {
            resultsContainer.innerHTML = '<div>Se detectaron múltiples rostros. Asegúrese de que solo su rostro y el de la cédula estén visibles.</div>';
        }
    }, 1000);
});
