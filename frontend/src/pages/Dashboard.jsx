import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templateAPI, sessionAPI } from '../utils/api';
import { useAuthStore } from '../utils/store';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [templates, setTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [templatesData, sessionsData] = await Promise.all([
        templateAPI.list(),
        sessionAPI.list(),
      ]);
      setTemplates(templatesData);
      setSessions(sessionsData);
      if (templatesData.length > 0) {
        setSelectedTemplateId(templatesData[0].id.toString());
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    navigate('/templates/new');
  };

  const handleStartSession = async () => {
    if (!selectedTemplateId || !sessionName.trim()) {
      alert('Please select a template and enter a session name');
      return;
    }

    try {
      const session = await sessionAPI.create({
        template_id: parseInt(selectedTemplateId),
        name: sessionName,
      });
      navigate(`/forms/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to start session. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      in_progress: 'badge-warning',
      completed: 'badge-success',
      abandoned: 'badge-error',
    };
    return `badge ${badges[status] || 'badge-info'}`;
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex justify-between align-center mb-3">
        <h1>Dashboard</h1>
        <button className="btn-outline" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="grid grid-3">
        {/* Templates Panel */}
        <div className="card">
          <h2>Templates</h2>
          {templates.length === 0 ? (
            <p>No templates yet. Create your first template!</p>
          ) : (
            <ul style={{ listStyle: 'none', marginBottom: 'var(--spacing-lg)' }}>
              {templates.map((template) => (
                <li key={template.id} style={{ padding: 'var(--spacing-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
                  <button
                    className="btn-outline w-full"
                    style={{ textAlign: 'left' }}
                    onClick={() => navigate(`/templates/${template.id}`)}
                  >
                    {template.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className="btn-primary w-full" onClick={handleCreateTemplate}>
            New Template
          </button>
        </div>

        {/* Start a Form Panel */}
        <div className="card">
          <h2>Start a Form</h2>
          {templates.length === 0 ? (
            <p>Create a template first to start a form.</p>
          ) : (
            <>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                  Select Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
                  Session Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Weekly Report - Jan 15"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleStartSession()}
                />
              </div>
              <button className="btn-primary w-full" onClick={handleStartSession}>
                Start Session
              </button>
            </>
          )}
        </div>

        {/* Recent Sessions Panel */}
        <div className="card">
          <h2>Recent Sessions</h2>
          {sessions.length === 0 ? (
            <p>No sessions yet. Start your first form!</p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((session) => (
                    <tr
                      key={session.id}
                      onClick={() => navigate(session.status === 'completed' ? `/forms/${session.id}/review` : `/forms/${session.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{session.name}</td>
                      <td style={{ fontSize: '0.875rem' }}>{formatDate(session.created_at)}</td>
                      <td>
                        <span className={getStatusBadge(session.status)}>
                          {session.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
