import api from './api';

let faceapiModule = null;

const faceService = {
  // Load face-api models
  loadModels: async () => {
    const bases = [
      (import.meta.env.BASE_URL || '/') + 'models',
      'https://justadudewhohacks.github.io/face-api.js/models'
    ];
    const faceapiImport = await import('face-api.js');
    faceapiModule = faceapiImport.default || faceapiImport;
    
    let ok = false;
    for (const base of bases) {
      try {
        await faceapiModule.nets.tinyFaceDetector.loadFromUri(base);
        await faceapiModule.nets.faceLandmark68Net.loadFromUri(base);
        await faceapiModule.nets.faceRecognitionNet.loadFromUri(base);
        ok = true;
        console.log('Loaded face-api models from', base);
        break;
      } catch (err) {
        console.warn('Failed to load models from', base, err?.message || err);
      }
    }
    if (!ok) throw new Error('Failed to load face-api models');
  },

  // Detect face descriptor from video element
  detectFaceDescriptor: async (videoElement) => {
    if (!faceapiModule) {
      throw new Error('Face models not loaded. Call loadModels() first.');
    }
    
    try {
      const options = new faceapiModule.TinyFaceDetectorOptions({ inputSize: 224 });
      const result = await faceapiModule
        .detectSingleFace(videoElement, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (result && result.descriptor) {
        return result.descriptor;
      }
      return null;
    } catch (err) {
      console.error('detectFaceDescriptor error', err);
      throw err;
    }
  },

  enroll: async (employeeId, name, descriptors) => {
    // descriptors: Array of Float32Array -> convert to plain arrays
    const payload = { employee_id: employeeId, name, descriptors: descriptors.map(d => Array.from(d)) };
    const res = await api.post('/face/enroll', payload);
    return res.data;
  },

  recognize: async (descriptor) => {
    const payload = { descriptor: Array.from(descriptor) };
    const res = await api.post('/face/recognize', payload);
    return res.data;
  },

  list: async () => {
    const res = await api.get('/face/list');
    return res.data?.data || [];
  },

  // helper that loads models, opens camera, captures one descriptor and runs recognition
  recognizeUsingCamera: async (opts = {}) => {
    const bases = [
      (import.meta.env.BASE_URL || '/') + 'models',
      'https://justadudewhohacks.github.io/face-api.js/models'
    ];
    const faceapiImport = await import('face-api.js');
    const faceapi = faceapiImport.default || faceapiImport;
    let ok = false;
    for (const base of bases) {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(base);
        await faceapi.nets.faceLandmark68Net.loadFromUri(base);
        await faceapi.nets.faceRecognitionNet.loadFromUri(base);
        ok = true;
        console.log('Loaded face-api models from', base);
        break;
      } catch (err) {
        console.warn('Failed to load models from', base, err?.message || err);
      }
    }
    if (!ok) throw new Error('Failed to load face-api models');

    // create a visible video element centered on screen
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { status: false, matched: false, message: 'Camera not available' };
    }

    // Create overlay for better UX
    const overlay = document.createElement('div');
    overlay.id = 'face-recognition-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.textAlign = 'center';
    
    const message = document.createElement('div');
    message.style.color = 'white';
    message.style.marginBottom = '20px';
    message.style.fontSize = '18px';
    message.style.fontWeight = '600';
    message.textContent = 'Please position your face in the center of the camera...';
    
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = '400px';
    video.style.height = '300px';
    video.style.borderRadius = '12px';
    video.style.border = '3px solid #667eea';
    video.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.5)';
    video.style.objectFit = 'cover';
    
    const statusText = document.createElement('div');
    statusText.style.color = '#68d391';
    statusText.style.marginTop = '20px';
    statusText.style.fontSize = '14px';
    statusText.style.minHeight = '20px';
    
    container.appendChild(message);
    container.appendChild(video);
    container.appendChild(statusText);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      document.body.removeChild(overlay);
      console.error('getUserMedia error', err);
      return { status: false, matched: false, message: 'Camera permission denied or not available' };
    }
    video.srcObject = stream;

    // try to play the video and wait for enough data
    try {
      await video.play();
    } catch (e) {
      console.warn('video.play() failed', e);
    }

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });

    // attempt detection multiple times to give user time to position face
    let result = null;
    const maxAttempts = opts.attempts || 10;
    const delayMs = opts.delayMs || 800;
    let detectionCount = 0;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        statusText.textContent = `Detecting face... Attempt ${i + 1}/${maxAttempts}`;
        result = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (result && result.descriptor) {
          detectionCount++;
          statusText.textContent = `Face detected! Processing...`;
          break;
        }
      } catch (e) {
        console.warn('detection attempt failed', e?.message || e);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Capture photo from canvas before closing
    let photoDataUrl = null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    } catch (e) {
      console.warn('Failed to capture photo', e);
    }

    // stop camera and remove overlay
    try {
      if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.warn('failed to stop stream', e);
    }
    try { document.body.removeChild(overlay); } catch (e) { /* ignore */ }

    if (!result || !result.descriptor) {
      return { status: true, matched: false, message: 'No face detected', photo: photoDataUrl };
    }

    // call server recognize
    const recognition = await faceService.recognize(result.descriptor);
    return { ...recognition, photo: photoDataUrl };
  }
};

export default faceService;
