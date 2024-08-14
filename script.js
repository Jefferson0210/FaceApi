// Obtiene el elemento de video del DOM
const video = document.getElementById('video');

// Obtiene el contenedor de resultados del DOM
const resultsContainer = document.getElementById('results');

// Obtiene el botón de captura del DOM
const captureButton = document.getElementById('captureButton');

// Obtiene el botón de reintento del DOM
const retryButton = document.getElementById('retryButton');

// Inicializa la variable para almacenar el descriptor facial de referencia
let referenceDescriptor = null;

// Inicializa la variable para controlar el estado de procesamiento
let isProcessing = false;

// Carga los modelos necesarios para la detección y reconocimiento facial
Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'), // Modelo de detección de rostros
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'), // Modelo de reconocimiento facial
    faceapi.nets.faceLandmark68Net.loadFromUri('/models') // Modelo de puntos de referencia faciales
]).then(startVideo) // Inicia el video una vez que los modelos se han cargado
  .catch(err => console.error("Error al cargar modelos: ", err)); // Muestra un mensaje de error si la carga falla

// Función para iniciar el video desde la cámara del usuario
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} }) // Solicita acceso a la cámara del usuario
        .then(stream => {
            video.srcObject = stream; // Asigna el flujo de video al elemento de video
        })
        .catch(err => {
            // Muestra un mensaje de error si no se puede acceder a la cámara
            console.error('Error al acceder a la cámara: ', err);
            resultsContainer.innerHTML = `<div class="alert alert-danger">No se pudo acceder a la cámara: ${err.message}</div>`;
        });
}

const THRESHOLD = 0.6; // Umbral para el reconocimiento facial

// Configura un evento para ejecutar una función cuando el video comienza a reproducirse
video.addEventListener('play', async () => {
    const canvas = faceapi.createCanvasFromMedia(video); // Crea un lienzo a partir del video
    document.querySelector('.video-container').append(canvas); // Agrega el lienzo al contenedor de video

    const displaySize = { width: video.width, height: video.height }; // Define el tamaño de visualización
    faceapi.matchDimensions(canvas, displaySize); // Ajusta las dimensiones del lienzo

    // Configura un intervalo para realizar detecciones cada 1000 ms
    setInterval(async () => {
        if (isProcessing) return; // Si ya se está procesando, no hace nada

        // Detecta todos los rostros en el video, obtiene puntos de referencia y descriptores faciales
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        const resizedDetections = faceapi.resizeResults(detections, displaySize); // Redimensiona los resultados

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); // Limpia el lienzo
        faceapi.draw.drawDetections(canvas, resizedDetections); // Dibuja las detecciones en el lienzo
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections); // Dibuja los puntos de referencia faciales en el lienzo

        // Verifica si se han detectado exactamente dos rostros
        if (detections.length === 2) {
            captureButton.disabled = false; // Habilita el boton de captura
            resultsContainer.innerHTML = 'Dos rostros detectados. Captura la referencia cuando estés listo.'; // Mensaje de estado
        } else {
            captureButton.disabled = true; // Deshabilita el boton de captura si no hay dos rostros
            resultsContainer.innerHTML = 'Esperando la detección de dos rostros...'; // Mensaje de estado
        }
    }, 1000); // Intervalo de 1 segundo
});

// Configura un evento para ejecutar una funcion cuando se haga clic en el boton de captura
captureButton.addEventListener('click', async () => {
    isProcessing = true; // Marca el inicio del procesamiento
    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors(); // Detecta los rostros

    // Verifica si se han detectado exactamente dos rostros
    if (detections.length === 2) {
        video.pause(); // Pausa el video

        referenceDescriptor = detections[0].descriptor; // Almacena el descriptor del primer rostro como referencia

        // Crea un comparador de rostros con el descriptor de referencia
        const faceMatcher = new faceapi.FaceMatcher([new faceapi.LabeledFaceDescriptors('referencia', [referenceDescriptor])], THRESHOLD);
        // Compara el descriptor del segundo rostro con el descriptor de referencia
        const result = faceMatcher.findBestMatch(detections[1].descriptor);

        // Verifica si el resultado es una coincidencia
        const isMatch = result.label !== 'unknown';

        // Muestra el resultado en el contenedor de resultados
        resultsContainer.innerHTML = isMatch
            ? '<div class="alert alert-success">La cara coincide con la cédula. Es la misma persona.</div>'
            : '<div class="alert alert-danger">La cara no coincide con la cédula. No es la misma persona.</div>';

        retryButton.disabled = false; // Habilita el botón de reintento
    } else {
        // Muestra un mensaje de advertencia si no se detectaron exactamente dos rostros
        resultsContainer.innerHTML = '<div class="alert alert-warning">Error: No se detectaron exactamente dos rostros. Intente nuevamente.</div>';
        isProcessing = false; // Marca el fin del procesamiento
    }
});

// Configura un evento para ejecutar una función cuando se haga clic en el botón de reintento
retryButton.addEventListener('click', () => {
    isProcessing = false; // Marca el fin del procesamiento
    referenceDescriptor = null; // Borra el descriptor de referencia
    video.play(); // Reanuda el video
    resultsContainer.innerHTML = 'Esperando detección de dos rostros...'; // Mensaje de estado
    retryButton.disabled = true; // Deshabilita el boton de reintento
    captureButton.disabled = true; // Deshabilita el boton de captura
});
