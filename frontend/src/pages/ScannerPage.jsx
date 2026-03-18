import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import ScannerReader from '../components/ScannerReader';
import StatusBadge from '../components/StatusBadge';
import { scanParticipant, checkinParticipant } from '../api/api';

const ScannerPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState({ state: 'idle', text: 'Ready to scan. Click to begin.' });
  const [scannedData, setScannedData] = useState({ uid: '-', name: '-', college: '-', role: '-' });
  const [showDataCard, setShowDataCard] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // New state explicitly for confirming checkin
  const [pendingCheckinUid, setPendingCheckinUid] = useState(null);
  
  const scannerComponentRef = useRef(null);

  useEffect(() => {
    // Basic Auth Check
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleStatusClick = () => {
    if (processing) return;
    
    if (status.state === 'idle' || status.state === 'error' || status.state === 'warning' || status.state === 'success') {
      if (scannerComponentRef.current) {
         setStatus({ state: 'loading', text: 'Starting camera...' });
         // Reset previous data
         setShowDataCard(false);
         setScannedData({ uid: '-', name: '-', college: '-', role: '-' });
         setPendingCheckinUid(null);
         
         scannerComponentRef.current.startScanner();
         setStatus({ state: 'loading', text: 'Scanning...' });
      }
    }
  };

  const handleScanError = (err) => {
    console.log(err);
  };

  const handleScanSuccess = async (decodedText) => {
    if (processing) return;
    setProcessing(true);
    setPendingCheckinUid(null);

    const uid = decodedText.trim();
    setScannedData({ uid, name: 'Verifying...', college: '-', role: '-' });
    setShowDataCard(true);
    setStatus({ state: 'loading', text: '⏳ Verifying Registration...' });

    try {
      // Step 1: Scan / Verify Only (Do NOT checkin yet)
      const scanRes = await scanParticipant(uid);
      
      if (!scanRes.valid) {
        setStatus({ state: 'error', text: 'Check-in Unsuccessful (Not Registered)' });
        setScannedData({ uid, name: 'Unknown User', college: '-', role: '-' });
        setProcessing(false);
        return;
      }

      setScannedData({
        uid: scanRes.participant.uid,
        name: scanRes.participant.name,
        college: scanRes.participant.college || 'N/A',
        role: scanRes.participant.role || 'Guest'
      });

      if (scanRes.already_checked_in) {
        setStatus({ state: 'warning', text: `⚠ Already checked in` });
        setProcessing(false);
        return;
      }

      // Instead of automatically checking in, explicitly halt and wait for volunteer
      setStatus({ state: 'success', text: `Verified! Awaiting Check-in.` });
      setPendingCheckinUid(uid);

    } catch (error) {
       setStatus({ state: 'error', text: 'Check-in Unsuccessful (Server Error)' });
    }

    setProcessing(false);
  };

  const handleManualCheckin = async () => {
    if (!pendingCheckinUid || processing) return;
    setProcessing(true);
    setStatus({ state: 'loading', text: '⏳ Confirming...' });

    try {
      const checkinRes = await checkinParticipant(pendingCheckinUid);

      if (checkinRes.status === 'checked_in') {
        setStatus({ state: 'success', text: `Check-in Successfully` });
        setPendingCheckinUid(null); // Clear pending so button disappears
      } else {
        setStatus({ state: 'error', text: `Check-in Unsuccessful` });
      }
    } catch (error) {
      setStatus({ state: 'error', text: 'Check-in Unsuccessful (Server Error)' });
    }

    setProcessing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  return (
    <>
      <ParticlesBackground />
      <div className="container">
        
        {/* Header */}
        <div className="header" style={{ position: 'relative' }}>
          <button 
            onClick={handleLogout}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: 'transparent',
              border: '1px solid rgba(244, 67, 54, 0.4)',
              color: '#ff7070',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Logout
          </button>
          <div className="header-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <circle cx="12" cy="12" r="6"></circle>
              <circle cx="12" cy="12" r="2"></circle>
            </svg>
            Live Event
          </div>
          <div className="logo" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
              <path d="M8 7v10"></path>
              <path d="M12 7v10"></path>
              <path d="M16 7v10"></path>
            </svg>
          </div>
          <h1>Soa Hackathon 2026</h1>
          <p>Attendance Check-in</p>
        </div>

        {/* Scanner */}
        <ScannerReader 
          ref={scannerComponentRef} 
          onScanSuccess={handleScanSuccess} 
          onScanError={handleScanError} 
        />

        {/* Status */}
        <StatusBadge 
          status={status.state} 
          text={status.text} 
          onClick={handleStatusClick} 
        />

        {/* Scanned Data */}
        <div className={`data-card ${showDataCard ? 'visible' : ''}`}>
          <div className="data-field">
            <div className="data-label">UID / Registration No</div>
            <div className="data-value" style={{ fontSize: '0.9rem', color: '#64748b' }}>{scannedData.uid}</div>
          </div>
          <div className="data-field">
            <div className="data-label">Name</div>
            <div className={`data-value ${scannedData.name === 'Verifying...' ? 'loading' : ''}`}>
              {scannedData.name}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="data-field">
              <div className="data-label">Role</div>
              <div className="data-value" style={{ fontSize: '1rem'}}>{scannedData.role}</div>
            </div>
            <div className="data-field">
              <div className="data-label">College</div>
              <div className="data-value" style={{ fontSize: '1rem'}}>{scannedData.college}</div>
            </div>
          </div>

          {/* Explicit Manual Check-in Button */}
          {pendingCheckinUid && (
            <button
              onClick={handleManualCheckin}
              disabled={processing}
              style={{
                width: '100%',
                marginTop: '1.5rem',
                padding: '1rem',
                background: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(22, 163, 74, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              {processing ? 'Processing...' : '✅ Check in'}
            </button>
          )}

        </div>

        <p className="info-text">Click the camera or status badge to start scanning!</p>
      </div>
    </>
  );
};

export default ScannerPage;
