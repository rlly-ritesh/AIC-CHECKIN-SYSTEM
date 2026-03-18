import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import StatCard from '../components/StatCard';
import { getStats } from '../api/api';

const AdminPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic Auth Check
    const token = localStorage.getItem('access_token');
    const role = localStorage.getItem('user_role');
    if (!token || role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  return (
    <>
      <ParticlesBackground />
      <div className="container admin">
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            Admin Panel
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
          <p>Attendance Dashboard</p>
        </div>

        {/* Global Statistics */}
        <div className="stats-container">
          <StatCard number={stats?.total_registrations || 0} label="Total Registered" id="statTotal" />
          <StatCard number={stats?.checked_in || 0} label="Checked In" id="statPresent" />
          <StatCard number={stats?.pending || 0} label="Pending" id="statAbsent" />
        </div>

        {/* Recent Attendees Table */}
        <div className="admin-card">
          <div className="admin-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <span>Recent Check-ins (Top 10)</span>
          </div>

          <div className="admin-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Checked in at</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="empty-row">
                      Loading data...
                    </td>
                  </tr>
                ) : !stats || !stats.recent_checkins || stats.recent_checkins.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-row">
                      No recent check-ins found.
                    </td>
                  </tr>
                ) : (
                  stats.recent_checkins.map((attendee, index) => {
                    const time = attendee.checkin_time 
                      ? new Date(attendee.checkin_time).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—';

                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: 'bold' }}>{attendee.name}</td>
                        <td>{attendee.email}</td>
                        <td>
                          <span className="badge badge-present">{attendee.role}</span>
                        </td>
                        <td>{time}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPage;
