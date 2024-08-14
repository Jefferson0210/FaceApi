const imageUpload = document.getElementById('imageUpload');
const inputImage = document.getElementById('inputImage');
const resultsContainer = document.getElementById('results');

Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models')
]).then(start);

function start() {
    imageUpload.addEventListener('change', async () => {
        const imageFile = imageUpload.files[0];
        const image = await faceapi.bufferToImage(imageFile);
        inputImage.src = image.src;

        const canvas = faceapi.createCanvasFromMedia(image);
        document.body.append(canvas);

        const displaySize = { width: image.width, height: image.height };
        faceapi.matchDimensions(canvas, displaySize);

        const detections = await faceapi.detectAllFaces(image).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        if (detections.length >= 2) {
            const faceMatcher = new faceapi.FaceMatcher(detections);

            const results = detections.map(d => faceMatcher.findBestMatch(d.descriptor));
            resultsContainer.innerHTML = results.map((result, i) => `<div>Rostro ${i + 1}: ${result.toString()}</div>`).join('');

            const [firstFace, secondFace] = detections;
            const distance = faceapi.euclideanDistance(firstFace.descriptor, secondFace.descriptor);

            const THRESHOLD = 0.6; 
            const isMatch = distance < THRESHOLD;
            resultsContainer.innerHTML += `<div>${isMatch ? 'La cara coincide con la cédula' : 'La cara no coincide con la cédula'}</div>`;
        } else {
            resultsContainer.innerHTML = '<div>No se detectaron múltiples rostros para la comparación.</div>';
        }
    });
}
