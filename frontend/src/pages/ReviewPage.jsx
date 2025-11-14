import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sessionAPI, templateAPI } from '../utils/api';

function ReviewPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [template, setTemplate] = useState(null);
  const [formData, setFormData] = useState({});
  const [editingField, setEditingField] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    try {
      const sessionData = await sessionAPI.get(sessionId);
      setSession(sessionData);
      setFormData(sessionData.form_data || {});

      const templateData = await templateAPI.get(sessionData.template_id);
      setTemplate(templateData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load form data');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const allFields = template?.sections?.flatMap((section) =>
    section.fields.map((field) => ({ ...field, sectionName: section.name }))
  ) || [];

  const handleEditField = (fieldKey, currentValue) => {
    const newValue = prompt('Edit value:', currentValue);
    if (newValue !== null && newValue !== currentValue) {
      const newFormData = { ...formData };
      newFormData[fieldKey] = {
        ...newFormData[fieldKey],
        value: newValue,
      };
      setFormData(newFormData);
      saveFieldUpdate(fieldKey, newValue);
    }
  };

  const saveFieldUpdate = async (fieldKey, value) => {
    try {
      await sessionAPI.updateField(sessionId, fieldKey, value);
    } catch (error) {
      console.error('Failed to update field:', error);
      alert('Failed to save changes');
    }
  };

  const getValidationStatus = (field) => {
    const value = formData[field.key]?.value;

    if (!value) {
      return { status: 'missing', label: 'Missing' };
    }

    // Basic validation
    if (field.type === 'number' && isNaN(Number(value))) {
      return { status: 'error', label: 'Invalid' };
    }

    if (field.type === 'date') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return { status: 'error', label: 'Invalid' };
      }
    }

    if (field.type === 'enum' && field.enum_options) {
      if (!field.enum_options.includes(value)) {
        return { status: 'warning', label: 'Check' };
      }
    }

    return { status: 'success', label: 'Valid' };
  };

  const handleGeneratePDF = () => {
    alert('PDF generation would be implemented here');
    // TODO: Implement PDF generation
  };

  const handleBackToSession = () => {
    navigate(`/forms/${sessionId}`);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
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
        <div>
          <h1>Review Your Form</h1>
          <p style={{ margin: 0 }}>
            {session?.name} - {template?.name}
          </p>
        </div>
        <div className="flex gap-1">
          <button className="btn-outline" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
          {session?.status !== 'completed' && (
            <button className="btn-outline" onClick={handleBackToSession}>
              Continue Editing
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Field</th>
              <th>Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allFields.map((field) => {
              const value = formData[field.key]?.value || '';
              const transcription = formData[field.key]?.transcription;
              const validation = getValidationStatus(field);

              return (
                <tr key={field.key}>
                  <td style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    {field.sectionName}
                  </td>
                  <td>
                    <strong>{field.label}</strong>
                    {transcription && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                        "{transcription}"
                      </div>
                    )}
                  </td>
                  <td>
                    {editingField === field.key ? (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          const newFormData = { ...formData };
                          newFormData[field.key] = {
                            ...newFormData[field.key],
                            value: e.target.value,
                          };
                          setFormData(newFormData);
                        }}
                        onBlur={() => {
                          setEditingField(null);
                          saveFieldUpdate(field.key, value);
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            setEditingField(null);
                            saveFieldUpdate(field.key, value);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleEditField(field.key, value)}
                      >
                        {value || <em style={{ color: 'var(--color-text-secondary)' }}>No value</em>}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${validation.status}`}>
                      {validation.label}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-outline btn-small"
                      onClick={() => handleEditField(field.key, value)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex gap-2 mt-3">
          <button className="btn-primary btn-large" onClick={handleGeneratePDF}>
            Generate PDF & Send Email
          </button>
          {session?.status !== 'completed' && (
            <button className="btn-outline" onClick={handleBackToSession}>
              Back to Form
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReviewPage;
