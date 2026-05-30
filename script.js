const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusEl = document.getElementById('status');
const attendanceLog = document.getElementById('attendanceLog');

let stream = null;
let detectionInterval = null;
let canvasContext = null;
let faceMatcher = null;
let lastRecognizedLabel = null;
const STORAGE_KEY = 'faceDescriptors';
// Konfirmasi berulang: butuh beberapa deteksi berturut-turut sebelum mencatat absen
const requiredConsecutiveMatches = 2;
const consecutiveMatches = { label: null, count: 0 };

function getSavedDescriptors() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function createFaceMatcher() {
  const entries = getSavedDescriptors();
  if (entries.length === 0) return null;
  const labeledDescriptors = entries.map((entry) => {
    const descriptor = new Float32Array(entry.descriptor);
    return new faceapi.LabeledFaceDescriptors(entry.label, [descriptor]);
  });
  return new faceapi.FaceMatcher(labeledDescriptors, 0.55);
}

async function loadModels() {
  statusEl.textContent = 'Status: Memuat model deteksi wajah...';
  const modelUrl = 'https://justadudewhohacks.github.io/face-api.js/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
  ]);
  statusEl.textContent = 'Status: Model deteksi wajah siap.';
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    await video.play();
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    canvasContext = overlay.getContext('2d');
    canvasContext.clearRect(0, 0, overlay.width, overlay.height);
  } catch (error) {
    statusEl.textContent = 'Status: Tidak dapat mengakses kamera. Periksa izin browser.';
    console.error(error);
    throw error;
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  if (canvasContext) {
    canvasContext.clearRect(0, 0, overlay.width, overlay.height);
  }
  lastRecognizedLabel = null;
}

function formatTime(date) {
  return date.toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function addAttendanceEntry(message) {
  const timestamp = formatTime(new Date());
  const item = document.createElement('div');
  item.className = 'entry';
  item.innerHTML = `<strong>${message}</strong><br /><small>${timestamp}</small>`;
  attendanceLog.prepend(item);
}

async function detectFace() {
  if (!canvasContext || video.readyState !== 4) {
    return;
  }

  // Lebih toleran terhadap pencahayaan/ukuran wajah dengan sedikit menurunkan scoreThreshold
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 });
  const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();

  canvasContext.clearRect(0, 0, overlay.width, overlay.height);

  if (!result) {
    statusEl.textContent = 'Status: Menunggu wajah terlihat jelas di kamera...';
    // reset konfirmasi jika tidak ada wajah
    consecutiveMatches.label = null;
    consecutiveMatches.count = 0;
    return;
  }

  const { x, y, width, height } = result.detection.box;
  canvasContext.strokeStyle = '#24c45f';
  canvasContext.lineWidth = 3;
  canvasContext.strokeRect(x, y, width, height);

  if (!faceMatcher) {
    statusEl.textContent = 'Status: Belum ada wajah terdaftar. Daftarkan di halaman Registrasi Wajah.';
    return;
  }

  const bestMatch = faceMatcher.findBestMatch(result.descriptor);
  if (bestMatch.label !== 'unknown') {
    // jika sama label dengan deteksi sebelumnya, tambah counter; kalau beda reset ke 1
    if (consecutiveMatches.label === bestMatch.label) {
      consecutiveMatches.count += 1;
    } else {
      consecutiveMatches.label = bestMatch.label;
      consecutiveMatches.count = 1;
    }

    statusEl.textContent = `Status: ${bestMatch.label} dikenali (${consecutiveMatches.count}/${requiredConsecutiveMatches})`;

    // hanya catat absen setelah terdeteksi beberapa kali berturut-turut untuk mengurangi false positive
    if (consecutiveMatches.count >= requiredConsecutiveMatches && lastRecognizedLabel !== bestMatch.label) {
      addAttendanceEntry(`Absensi berhasil: ${bestMatch.label}`);
      lastRecognizedLabel = bestMatch.label;
    }
  } else {
    statusEl.textContent = 'Status: Wajah terdeteksi tetapi belum terdaftar. Gunakan halaman Registrasi Wajah.';
    consecutiveMatches.label = null;
    consecutiveMatches.count = 0;
  }
}

async function startAttendance() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.textContent = 'Status: Browser tidak mendukung kamera. Gunakan browser modern.';
    return;
  }

  const saved = getSavedDescriptors();
  if (saved.length === 0) {
    statusEl.textContent = 'Status: Belum ada wajah terdaftar. Silakan daftarkan wajah dulu di halaman Registrasi Wajah.';
    return;
  }

  startButton.disabled = true;
  stopButton.disabled = false;
  statusEl.textContent = 'Status: Menyiapkan absensi...';

  try {
    await loadModels();
    await startCamera();
    faceMatcher = createFaceMatcher();
    // Periksa lebih sering agar responsif ketika wajah muncul
    detectionInterval = setInterval(detectFace, 400);
  } catch (error) {
    startButton.disabled = false;
    stopButton.disabled = true;
  }
}

function stopAttendance() {
  startButton.disabled = false;
  stopButton.disabled = true;
  statusEl.textContent = 'Status: Absensi dihentikan. Klik Mulai Absen untuk memulai lagi.';
  stopCamera();
}

startButton.addEventListener('click', startAttendance);
stopButton.addEventListener('click', stopAttendance);

window.addEventListener('beforeunload', () => {
  stopCamera();
});
