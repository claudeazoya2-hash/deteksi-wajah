const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const registerButton = document.getElementById('registerButton');
const nameInput = document.getElementById('nameInput');
const statusEl = document.getElementById('status');
const registeredList = document.getElementById('registeredList');

let stream = null;
let canvasContext = null;
let modelsLoaded = false;
const STORAGE_KEY = 'faceDescriptors';

async function loadModels() {
  if (modelsLoaded) return;
  statusEl.textContent = 'Status: Memuat model deteksi wajah...';
  const modelUrl = 'https://justadudewhohacks.github.io/face-api.js/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
  ]);
  modelsLoaded = true;
  statusEl.textContent = 'Status: Model deteksi wajah siap.';
}

function getSavedDescriptors() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDescriptors(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function updateRegisteredList() {
  const entries = getSavedDescriptors();
  registeredList.innerHTML = '';
  if (entries.length === 0) {
    registeredList.innerHTML = '<p>Belum ada wajah terdaftar. Silakan daftarkan terlebih dahulu.</p>';
    return;
  }

  const list = document.createElement('ul');
  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.textContent = `${entry.label} (${Math.round(entry.descriptor.length)} fitur)`;
    list.appendChild(item);
  });
  registeredList.appendChild(list);
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
    statusEl.textContent = 'Status: Kamera siap. Masukkan nama lalu klik Daftarkan Wajah.';
    registerButton.disabled = false;
    stopButton.disabled = false;
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
  if (canvasContext) {
    canvasContext.clearRect(0, 0, overlay.width, overlay.height);
  }
  registerButton.disabled = true;
  stopButton.disabled = true;
}

function drawBox(box) {
  canvasContext.clearRect(0, 0, overlay.width, overlay.height);
  canvasContext.strokeStyle = '#24c45f';
  canvasContext.lineWidth = 3;
  canvasContext.strokeRect(box.x, box.y, box.width, box.height);
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

async function registerFace() {
  const name = nameInput.value.trim();
  if (!name) {
    statusEl.textContent = 'Status: Masukkan nama karyawan dulu.';
    return;
  }
  if (!stream) {
    statusEl.textContent = 'Status: Nyalakan kamera terlebih dahulu.';
    return;
  }

  statusEl.textContent = 'Status: Mencoba mendeteksi wajah...';
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.6 });
  const detection = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();

  if (!detection) {
    statusEl.textContent = 'Status: Wajah tidak terdeteksi. Pastikan wajah terlihat jelas di kamera.';
    return;
  }

  drawBox(detection.detection.box);
  const descriptorArray = Array.from(detection.descriptor);
  const entries = getSavedDescriptors();
  const existingIndex = entries.findIndex((entry) => entry.label.toLowerCase() === name.toLowerCase());
  if (existingIndex >= 0) {
    entries[existingIndex].descriptor = descriptorArray;
    statusEl.textContent = `Status: Wajah ${name} diperbarui dan tersimpan.`;
  } else {
    entries.push({ label: name, descriptor: descriptorArray, registeredAt: formatTime(new Date()) });
    statusEl.textContent = `Status: Wajah ${name} berhasil terdaftar.`;
  }

  saveDescriptors(entries);
  updateRegisteredList();
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  try {
    await loadModels();
    await startCamera();
  } catch (error) {
    startButton.disabled = false;
  }
});

stopButton.addEventListener('click', () => {
  stopCamera();
  startButton.disabled = false;
  statusEl.textContent = 'Status: Kamera berhenti.';
});

registerButton.addEventListener('click', registerFace);

window.addEventListener('beforeunload', () => {
  stopCamera();
});

window.addEventListener('DOMContentLoaded', async () => {
  updateRegisteredList();
  await loadModels();
});
