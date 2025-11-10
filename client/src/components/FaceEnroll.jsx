import React, { useEffect, useRef, useState } from 'react';
import faceService from '../services/faceService';

// Simple enrollment component: loads models, captures N images and sends descriptors to server
const FaceEnroll = ({ employeeId, name }) => {
  const videoRef = useRef(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [count, setCount] = useState(0);
  const descriptorsRef = useRef([]);
  const [enrolledList, setEnrolledList] = useState([]);
  const [lastRecognition, setLastRecognition] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoadingModels(true);
      // Try local models (public/models) first, then fall back to a public CDN hosting
      const bases = [
        (import.meta.env.BASE_URL || '/') + 'models',
        'https://justadudewhohacks.github.io/face-api.js/models'
      ];
      let loaded = false;
      const faceapiModule = await import('face-api.js');
      const faceapi = faceapiModule.default || faceapiModule;
      for (const base of bases) {
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(base);
          await faceapi.nets.faceLandmark68Net.loadFromUri(base);
          await faceapi.nets.faceRecognitionNet.loadFromUri(base);
          loaded = true;
          console.log('Loaded face-api models from', base);
          break;
        } catch (err) {
          console.warn('Failed to load models from', base, err && err.message ? err.message : err);
        }
      }
      if (!loaded) {
        console.error('Failed to load face-api models from any configured base URL');
      }
      setLoadingModels(!loaded);
    };
    load();
  }, []);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    }
  };

  const stopCamera = () => {
    const s = videoRef.current?.srcObject;
    if (s && s.getTracks) {
      s.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const captureOnce = async () => {
    if (!videoRef.current) return;
    const faceapiModule = await import('face-api.js');
    const faceapi = faceapiModule.default || faceapiModule;
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
    // ensure model is loaded before running detection
    if (!faceapi.nets.tinyFaceDetector.params) {
      console.warn('TinyFaceDetector not loaded before capture; attempting to load models');
      const bases = [
        (import.meta.env.BASE_URL || '/') + 'models',
        'https://justadudewhohacks.github.io/face-api.js/models'
      ];
      let ok = false;
      for (const base of bases) {
        try {
          await faceapi.nets.tinyFaceDetector.loadFromUri(base);
          await faceapi.nets.faceLandmark68Net.loadFromUri(base);
          await faceapi.nets.faceRecognitionNet.loadFromUri(base);
          ok = true;
          break;
        } catch (e) {
          console.warn('Retry load models failed for', base, e?.message || e);
        }
      }
      if (!ok) {
        throw new Error('Face models not loaded');
      }
    }
    const result = await faceapi
      .detectSingleFace(videoRef.current, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (result && result.descriptor) {
      descriptorsRef.current.push(result.descriptor);
      setCount(descriptorsRef.current.length);
    }
    return !!result;
  };

  const captureMany = async (target = 12) => {
    setCapturing(true);
    await startCamera();
    descriptorsRef.current = [];
    setCount(0);
    // capture attempts until target collected or max tries
    let attempts = 0;
    while (descriptorsRef.current.length < target && attempts < target * 8) {
      // wait a bit for face position
      await new Promise((r) => setTimeout(r, 600));
      try {
        await captureOnce();
      } catch (e) {
        console.warn('capture error', e);
      }
      attempts++;
    }

    setCapturing(false);
    stopCamera();

    if (descriptorsRef.current.length) {
      // send to server
      try {
        const resp = await faceService.enroll(employeeId, name, descriptorsRef.current);
        console.log('enroll response', resp);
        alert('Enrollment successful');
        // refresh enrolled list
        try {
          const list = await faceService.list();
          setEnrolledList(Array.isArray(list) ? list : []);
        } catch (e) {
          console.warn('failed to refresh enrolled list', e);
        }
      } catch (e) {
        console.error(e);
        alert('Enrollment failed: ' + (e?.response?.data?.message || e.message));
      }
    } else {
      alert('No faces captured. Try again with better lighting and camera position.');
    }
  };

  const refreshEnrolled = async () => {
    try {
      const list = await faceService.list();
      setEnrolledList(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('failed to load enrolled list', e);
    }
  };

  const testRecognition = async () => {
    try {
      setLastRecognition(null);
      // capture single descriptor and call server
      await startCamera();
      await new Promise((r) => setTimeout(r, 600));
      const faceapiModule = await import('face-api.js');
      const faceapi = faceapiModule.default || faceapiModule;
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
      const result = await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor();
      stopCamera();
      if (!result || !result.descriptor) {
        alert('No face detected for test');
        return;
      }
      const resp = await faceService.recognize(result.descriptor);
      setLastRecognition(resp);
      console.log('recognize response', resp);
      if (resp?.matched) {
        alert(`Recognized as ${resp.name || resp.employee_id} (distance ${String(resp.distance)})`);
      } else {
        alert('Not recognized. Closest distance: ' + String(resp?.distance));
      }
    } catch (e) {
      stopCamera();
      console.error('test recognition error', e);
      alert('Recognition failed: ' + (e?.response?.data?.message || e.message));
    }
  };

  return (
    <div className="face-enroll">
      <h3>Face Enrollment</h3>
      {loadingModels ? (
        <div>Loading face models...</div>
      ) : (
        <>
          <video ref={videoRef} autoPlay muted width={320} height={240} style={{ border: '1px solid #ccc' }} />
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => captureMany(12)} disabled={capturing}>
              {capturing ? 'Capturing...' : 'Start Enrollment (12 images)'}
            </button>
            <button className="btn" onClick={refreshEnrolled} style={{ marginLeft: 8 }}>
              Refresh Enrolled
            </button>
            <button className="btn" onClick={testRecognition} style={{ marginLeft: 8 }}>
              Test Recognition
            </button>
            <button className="btn" onClick={startCamera} style={{ marginLeft: 8 }}>
              Open Camera
            </button>
            <button className="btn danger" onClick={stopCamera} style={{ marginLeft: 8 }}>
              Close Camera
            </button>
          </div>
          <div style={{ marginTop: 8 }}>Captured: {count}</div>
          {enrolledList && enrolledList.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong>Enrolled:</strong>
              <ul style={{ marginTop: 6 }}>
                {enrolledList.map((e) => (
                  <li key={e.employee_id}>{e.employee_id} {e.name ? `- ${e.name}` : ''}</li>
                ))}
              </ul>
            </div>
          )}

          {lastRecognition && (
            <div style={{ marginTop: 8 }}>
              <strong>Last recognition:</strong>
              <div>{lastRecognition.matched ? `Matched: ${lastRecognition.name || lastRecognition.employee_id}` : 'No match'}</div>
              <div>Distance: {String(lastRecognition.distance)}</div>
            </div>
          )}
          <div style={{ marginTop: 6, color: '#666' }}>
            Note: Ensure models are available in public/models (see docs). Good lighting and frontal face yield best results.
          </div>
        </>
      )}
    </div>
  );
};

export default FaceEnroll;
