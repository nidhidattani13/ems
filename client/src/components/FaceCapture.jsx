import React, { useEffect, useRef, useState } from 'react';

// Small capture component that returns a single descriptor via onCapture
const FaceCapture = ({ onCapture }) => {
  const videoRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
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
          console.log('Loaded face-api models from', base);
          ok = true;
          break;
        } catch (err) {
          console.warn('Failed to load models from', base, err?.message || err);
        }
      }
      setModelsLoaded(ok);
    };
    load();
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  useEffect(() => {
    startCamera();
    return () => {
      const s = videoRef.current?.srcObject;
      if (s && s.getTracks) s.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    const faceapiModule = await import('face-api.js');
    const faceapi = faceapiModule.default || faceapiModule;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
    const result = await faceapi
      .detectSingleFace(videoRef.current, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (result && result.descriptor) {
      onCapture(result.descriptor);
    } else {
      alert('No face detected. Please align to camera and try again.');
    }
  };

  return (
    <div>
      <video ref={videoRef} autoPlay muted width={320} height={240} style={{ border: '1px solid #ccc' }} />
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={capture} disabled={!modelsLoaded}>
          Capture for Recognition
        </button>
      </div>
    </div>
  );
};

export default FaceCapture;
