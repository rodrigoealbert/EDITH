import './style.css'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
const app = document.querySelector('#app')

app.innerHTML = `
  <main>
    <h1>EDITH AR Prototype</h1>
    <p>My first browser-based AR interface.</p>

    <button id="cameraButton" disabled>Start camera</button>
    <p id="status">Loading hand-tracking model...</p>

    <div class="camera-wrapper">
      <video id="webcam" autoplay playsinline></video>
      <canvas id="outputCanvas"></canvas>
    </div>
  </main>
`

const cameraButton = document.querySelector('#cameraButton')
const status = document.querySelector('#status')
const webcam = document.querySelector('#webcam')
const canvas = document.querySelector('#outputCanvas')
const canvasContext = canvas.getContext('2d')
const cameraWrapper = document.querySelector('.camera-wrapper')
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],           // thumb
  [0,5],[5,6],[6,7],[7,8],           // index
  [5,9],[9,10],[10,11],[11,12],      // middle
  [9,13],[13,14],[14,15],[15,16],    // ring
  [13,17],[17,18],[18,19],[19,20],   // pinky
  [0,17]                             // palm base
]


let handLandmarker
let lastVideoTime = -1

async function createHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
    },
    runningMode: 'VIDEO',
    numHands: 2
  })
}

async function startApp() {
  try {
    status.textContent = 'Loading hand-tracking model...'

    await createHandLandmarker()

    status.textContent = 'Model ready — start camera.'
    cameraButton.disabled = false
  } catch (error) {
    status.textContent = 'Could not load the hand-tracking model.'
    console.error(error)
  }
}

function drawLandmarks(landmarks) {
  canvasContext.clearRect(0, 0, canvas.width, canvas.height)
  landmarks.forEach((hand) => {
    // draw connections first, so dots render on top
    canvasContext.strokeStyle = '#00e5ff'
    canvasContext.lineWidth = 2
    HAND_CONNECTIONS.forEach(([start, end]) => {
      const p1 = hand[start]
      const p2 = hand[end]
      canvasContext.beginPath()
      canvasContext.moveTo(p1.x * canvas.width, p1.y * canvas.height)
      canvasContext.lineTo(p2.x * canvas.width, p2.y * canvas.height)
      canvasContext.stroke()
    })
    // then dots
    hand.forEach((point) => {
      const x = point.x * canvas.width
      const y = point.y * canvas.height
      canvasContext.beginPath()
      canvasContext.arc(x, y, 5, 0, Math.PI * 2)
      canvasContext.fillStyle = '#00f5ff'
      canvasContext.fill()
    })
  })
}

function predictWebcam() {
  if (webcam.currentTime !== lastVideoTime) {
    lastVideoTime = webcam.currentTime

    const results = handLandmarker.detectForVideo(
      webcam,
      performance.now()
    )

    drawLandmarks(results.landmarks)

    if (results.landmarks.length > 0) {
      status.textContent = `Hand detected: ${results.landmarks.length}`
    } else {
      status.textContent = 'No hand detected.'
    }
  }

  window.requestAnimationFrame(predictWebcam)
}

cameraButton.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    })

    webcam.srcObject = stream

    webcam.addEventListener(
  'loadeddata',
  () => {
    canvas.width = webcam.videoWidth
    canvas.height = webcam.videoHeight

    cameraWrapper.style.aspectRatio =
      `${webcam.videoWidth} / ${webcam.videoHeight}`

    predictWebcam()
  },
  { once: true }
)

    status.textContent = 'Camera active.'
    cameraButton.disabled = true
  } catch (error) {
    status.textContent = 'Camera access was not allowed.'
    console.error(error)
  }
})

startApp()