import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export default function CameraCapture({ onPhotoCaptured, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [facingMode, setFacingMode] = useState('environment'); // back camera by default for civic issues
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [permissionError, setPermissionError] = useState('');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  async function startCamera() {
    stopCamera();
    setCameraLoading(true);
    setPermissionError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraLoading(false);
      setPermissionError('Camera is not supported on this device/browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera access was denied. Please allow camera permissions in your browser or upload an image file.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera found on this device.');
      } else {
        setPermissionError(`Unable to access camera: ${err.message || 'Unknown error'}`);
      }
      setHasCamera(false);
    } finally {
      setCameraLoading(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Failed to capture frame');
        return;
      }
      const previewUrl = URL.createObjectURL(blob);
      setCapturedImage(previewUrl);
      setCapturedBlob(blob);
      stopCamera();
    }, 'image/jpeg', 0.9);
  }

  function handleRetake() {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  }

  function handleConfirm() {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `civic_photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    onPhotoCaptured(file, capturedImage);
    onClose();
  }

  function toggleCamera() {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-gray-800">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 bg-gray-950/80 text-white z-10">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <span className="font-semibold text-sm">Capture Civic Issue</span>
          </div>
          <div className="flex items-center gap-2">
            {!capturedImage && hasCamera && (
              <button
                type="button"
                onClick={toggleCamera}
                title="Switch Camera"
                className="p-2 rounded-full hover:bg-gray-800 text-gray-300 text-sm"
              >
                🔄 Flip
              </button>
            )}
            <button
              type="button"
              onClick={() => { stopCamera(); onClose(); }}
              className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {permissionError ? (
            <div className="p-6 text-center text-red-400 text-sm space-y-3">
              <div className="text-4xl">⚠️</div>
              <p>{permissionError}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-gray-800 text-white rounded text-xs hover:bg-gray-700"
              >
                Retry Camera
              </button>
            </div>
          ) : cameraLoading ? (
            <div className="flex flex-col items-center gap-3 text-gray-400 text-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span>Starting camera...</span>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
              {/* Civic grid overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/20 m-6 rounded-lg flex items-center justify-center">
                <span className="text-white/40 text-xs tracking-wider uppercase font-mono">Align issue in center</span>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-gray-950 flex items-center justify-center gap-4">
          {capturedImage ? (
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 bg-gray-800 text-gray-200 rounded-xl font-medium hover:bg-gray-700 text-sm"
              >
                🔄 Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 text-sm"
              >
                ✅ Use Photo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!hasCamera || cameraLoading}
              className="h-16 w-16 rounded-full border-4 border-white bg-red-600 hover:bg-red-500 disabled:opacity-40 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <span className="h-12 w-12 rounded-full border-2 border-white/60" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
