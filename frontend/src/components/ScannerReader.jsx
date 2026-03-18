import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ScannerReader = forwardRef(({ onScanSuccess, onScanError }, ref) => {
  const [html5Qrcode, setHtml5Qrcode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-initialize instance memory
  useEffect(() => {
    if (!html5Qrcode) {
      setHtml5Qrcode(new Html5Qrcode('reader'));
    }
  }, [html5Qrcode]);

  const stopScanner = useCallback(async () => {
    if (html5Qrcode && html5Qrcode.isScanning) {
      try {
        await html5Qrcode.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }, [html5Qrcode]);

  const startScanner = useCallback(async () => {
    if (isScanning) return;
    setErrorMsg('');
    try {
      let qrcode = html5Qrcode;
      if (!qrcode) {
        qrcode = new Html5Qrcode('reader');
        setHtml5Qrcode(qrcode);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Temporarily stop the scanner on success so it doesn't double-fire
          stopScanner();
          onScanSuccess(decodedText, qrcode);
        },
        (error) => {
          // ignore frame errors
        }
      );
      setIsScanning(true);
      if (onScanError) onScanError(null);
    } catch (error) {
      console.error('Camera not accessible:', error);
      setIsScanning(false);
      setErrorMsg('Camera access denied or unavailable. Click to retry.');
      if (onScanError) onScanError('Camera unavailable');
    }
  }, [html5Qrcode, isScanning, onScanSuccess, onScanError, stopScanner]);

  useImperativeHandle(ref, () => ({
    startScanner,
    stopScanner
  }));

  // Clean up entirely on unmount
  useEffect(() => {
    return () => {
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().catch((err) => console.error('Error stopping scanner on unmount:', err));
        setIsScanning(false);
      }
    };
  }, [html5Qrcode]);

  return (
    <div className="scanner-section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div id="reader" style={{ width: '100%', minHeight: '250px', borderRadius: '24px', overflow: 'hidden' }}></div>
      <div className="scanning-overlay">
        {isScanning && <div className="scanning-line"></div>}
      </div>

      {!isScanning && (
        <div
          onClick={startScanner}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.92)', borderRadius: '24px', zIndex: 10,
            cursor: 'pointer'
          }}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </div>
          <p style={{ color: '#0f172a', marginBottom: '1.5rem', textAlign: 'center', padding: '0 1.5rem', fontSize: '1.1rem', fontWeight: 'bold' }}>
            {errorMsg || 'Click to begin scanning'}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); startScanner(); }}
            style={{
              padding: '0.85rem 2rem', background: '#2563eb', color: 'white',
              border: 'none', borderRadius: '12px', fontWeight: 'bold',
              fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
            }}
          >
            Start Camera
          </button>
        </div>
      )}
    </div>
  );
});

export default ScannerReader;
