import { useRef, useState, useEffect } from 'react';
import faceService from '../services/faceService';

const FaceEnroll = ({ employeeId, name, onComplete }) => {
  const videoRef = useRef(null);
  const [loadingModels, setLoadingModels] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [count, setCount] = useState(0);
  const descriptorsRef = useRef([]);
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [enrollmentError, setEnrollmentError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        await faceService.loadModels();
        setLoadingModels(false);
        startCamera();
      } catch (e) {
        setEnrollmentError('Failed to load face models: ' + e.message);
        setLoadingModels(false);
      }
    };
    load();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setEnrollmentError('Camera access denied: ' + e.message);
      }
    }
  };

  const stopCamera = () => {
    const s = videoRef.current?.srcObject;
    if (s && s.getTracks) {
      s.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const captureOnce = async () => {
    if (!videoRef.current) return false;
    try {
      const result = await faceService.detectFaceDescriptor(videoRef.current);
      if (result) {
        descriptorsRef.current.push(result);
        setCount(descriptorsRef.current.length);
        return true;
      }
    } catch (e) {
      console.error('capture error', e);
    }
    return false;
  };

  const captureMany = async (target = 12) => {
    setCapturing(true);
    setEnrollmentStatus(`Starting capture...`);
    setEnrollmentError('');
    descriptorsRef.current = [];
    setCount(0);

    let attempts = 0;
    while (descriptorsRef.current.length < target && attempts < target * 8) {
      await new Promise((r) => setTimeout(r, 600));
      try {
        await captureOnce();
      } catch (e) {
        console.error('capture attempt error', e);
      }
      attempts++;
    }

    setCapturing(false);
    stopCamera();

    if (descriptorsRef.current.length) {
      setEnrollmentStatus(`Captured ${descriptorsRef.current.length}/${target} images. Enrolling...`);
      try {
        await faceService.enroll(employeeId, name, descriptorsRef.current);
        setEnrollmentStatus('✓ Face enrollment successful! Redirecting to login...');
        setTimeout(() => {
          if (onComplete) onComplete();
          // Redirect to login after 2 seconds
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        }, 1500);
      } catch (e) {
        setEnrollmentError('Enrollment failed: ' + (e?.response?.data?.message || e.message));
        setCapturing(false);
      }
    } else {
      setEnrollmentError('Failed to capture any faces. Please try again.');
      setCapturing(false);
    }
  };

  return (
    <div className="face-enroll">
      <h3>Face Enrollment</h3>
      <p>This step is required only once during registration.</p>
      {loadingModels ? (
        <div className="face-enroll-loading">Loading face models...</div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            width={320}
            height={240}
            style={{ border: '2px solid #4299e1', borderRadius: '8px' }}
          />
          
          {/* Progress Counter */}
          <div className="face-enroll-progress">
            <div className="progress-counter">
              <span className="progress-number">{count}</span>
              <span className="progress-label">/ 12 images captured</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(count / 12) * 100}%` }}></div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="auth-button register-button"
              onClick={() => captureMany(12)}
              disabled={capturing}
              style={{ width: '100%' }}
            >
              {capturing ? `Capturing... (${count}/12)` : 'Start Enrollment (12 images)'}
            </button>
          </div>
          
          {enrollmentStatus && (
            <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#c6f6d5', color: '#2d784d', borderRadius: '8px', border: '1px solid #68d391', fontSize: '14px', fontWeight: '500' }}>
              {enrollmentStatus}
            </div>
          )}
          
          {enrollmentError && (
            <div style={{ marginTop: 16, padding: '12px', backgroundColor: '#fed7d7', color: '#c53030', borderRadius: '8px', border: '1px solid #fc8181', fontSize: '14px', fontWeight: '500' }}>
              {enrollmentError}
            </div>
          )}
          
          <div style={{ marginTop: 20, padding: '16px', backgroundColor: '#f7fafc', borderRadius: '8px', fontSize: '13px', color: '#4a5568' }}>
            <strong style={{ display: 'block', marginBottom: '8px', color: '#2d3748' }}>📸 Tips for best results:</strong>
            <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc' }}>
              <li>Ensure good lighting and clear view of face</li>
              <li>Face should be frontal and centered in the camera</li>
              <li>Move slightly for each capture to get varied angles</li>
              <li>Keep your face at a normal distance from camera</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default FaceEnroll;