import api from './api';

const faceService = {
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
    const faceapiModule = await import('face-api.js');
    const faceapi = faceapiModule.default || faceapiModule;
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

    // create a visible video element so users get camera permission prompt and can align
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { status: false, matched: false, message: 'Camera not available' };
    }

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    // style so it's visible but not intrusive
    video.style.position = 'fixed';
    video.style.right = '12px';
    video.style.bottom = '12px';
    video.style.width = opts.previewWidth || '260px';
    video.style.height = 'auto';
    video.style.zIndex = 9999;
    video.style.border = '2px solid rgba(255,255,255,0.6)';
    video.style.borderRadius = '6px';
    video.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
    document.body.appendChild(video);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (err) {
      document.body.removeChild(video);
      console.error('getUserMedia error', err);
      return { status: false, matched: false, message: 'Camera permission denied or not available' };
    }
    video.srcObject = stream;

    // try to play the video and wait for enough data
    try {
      await video.play();
    } catch (e) {
      // some browsers require user interaction to play; still proceed to detection attempts
      console.warn('video.play() failed', e);
    }

    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });

    // attempt detection multiple times to give user time to position face
    let result = null;
    const maxAttempts = opts.attempts || 6;
    const delayMs = opts.delayMs || 600;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        result = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (result && result.descriptor) break;
      } catch (e) {
        console.warn('detection attempt failed', e?.message || e);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // stop camera and remove preview
    try {
      if (stream && stream.getTracks) stream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      console.warn('failed to stop stream', e);
    }
    try { document.body.removeChild(video); } catch (e) { /* ignore */ }

    if (!result || !result.descriptor) {
      return { status: true, matched: false, message: 'No face detected' };
    }

    // call server recognize
    return await faceService.recognize(result.descriptor);
  }
};

export default faceService;
