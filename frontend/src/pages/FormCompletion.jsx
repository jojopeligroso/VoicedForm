import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sessionAPI, templateAPI } from '../utils/api';
import AudioRecorder from '../utils/audioRecorder';

function FormCompletion() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [session, setSession] = useState(null);
  const [template, setTemplate] = useState(null);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [normalizedValue, setNormalizedValue] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [audioRecorder] = useState(() => new AudioRecorder());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Flatten all fields from all sections
  const allFields = template?.sections?.flatMap((section) =>
    section.fields.map((field) => ({ ...field, sectionName: section.name }))
  ) || [];

  const currentField = allFields[currentFieldIndex];
  const progress = allFields.length > 0 ? ((currentFieldIndex + 1) / allFields.length) * 100 : 0;

  useEffect(() => {
    loadSessionData();

    return () => {
      audioRecorder.cleanup();
    };
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      const sessionData = await sessionAPI.get(sessionId);
      setSession(sessionData);

      const templateData = await templateAPI.get(sessionData.template_id);
      setTemplate(templateData);

      setCurrentFieldIndex(sessionData.current_field_index || 0);
    } catch (error) {
      console.error('Failed to load session:', error);
      alert('Failed to load form session');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setProcessing(true);
      const audioBlob = await audioRecorder.stop();
      setIsRecording(false);

      if (audioBlob) {
        try {
          // Upload and transcribe
          const result = await sessionAPI.uploadAudio(
            sessionId,
            currentField.key,
            audioBlob
          );

          setTranscription(result.transcription);
          setNormalizedValue(result.normalized_value);
          setConfidence(result.confidence);
        } catch (error) {
          console.error('Failed to transcribe audio:', error);
          alert('Failed to transcribe audio. Please try again.');
        }
      }
      setProcessing(false);
    } else {
      // Start recording
      const success = await audioRecorder.start();
      if (success) {
        setIsRecording(true);
        setTranscription('');
        setNormalizedValue('');
        setConfidence(0);
      } else {
        alert('Failed to start recording. Please check microphone permissions.');
      }
    }
  };

  const handleAccept = async () => {
    if (!normalizedValue) {
      alert('Please record an answer first');
      return;
    }

    try {
      // Save field value
      await sessionAPI.updateField(
        sessionId,
        currentField.key,
        normalizedValue,
        transcription
      );

      // Move to next field or complete
      if (currentFieldIndex < allFields.length - 1) {
        setCurrentFieldIndex(currentFieldIndex + 1);
        setTranscription('');
        setNormalizedValue('');
        setConfidence(0);
      } else {
        // All fields completed
        await sessionAPI.complete(sessionId);
        navigate(`/forms/${sessionId}/review`);
      }
    } catch (error) {
      console.error('Failed to save field:', error);
      alert('Failed to save field. Please try again.');
    }
  };

  const handleBack = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
      setTranscription('');
      setNormalizedValue('');
      setConfidence(0);
    }
  };

  const handleEdit = () => {
    const newValue = prompt('Edit value:', normalizedValue);
    if (newValue !== null) {
      setNormalizedValue(newValue);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading form...</p>
      </div>
    );
  }

  if (!currentField) {
    return (
      <div className="container">
        <p>No fields in this template</p>
        <button className="btn-outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xs)' }}>
        <small style={{ color: 'var(--color-text-secondary)' }}>
          Field {currentFieldIndex + 1} of {allFields.length}
        </small>
      </div>

      {/* Main Form Area */}
      <div className="center-column">
        <div className="card">
          {/* Section name */}
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <span
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {currentField.sectionName}
            </span>
          </div>

          {/* Field Label */}
          <h2 style={{ fontSize: '2rem', marginBottom: 'var(--spacing-lg)' }}>
            {currentField.label}
          </h2>

          {/* Hint */}
          {currentField.hint && (
            <p style={{ marginBottom: 'var(--spacing-lg)', fontStyle: 'italic' }}>
              {currentField.hint}
            </p>
          )}

          {/* Record Button */}
          <button
            className={`record-button ${isRecording ? 'recording' : 'idle'}`}
            onClick={handleToggleRecording}
            disabled={processing}
            title={isRecording ? 'Click to stop recording' : 'Click to start recording'}
          >
            {processing ? '...' : isRecording ? '⏹' : '🎤'}
          </button>

          <div className="text-center" style={{ marginBottom: 'var(--spacing-xl)' }}>
            <small style={{ color: 'var(--color-text-secondary)' }}>
              {processing
                ? 'Processing...'
                : isRecording
                ? 'Recording... Click to stop'
                : 'Click to record'}
            </small>
          </div>

          {/* Transcription Panel */}
          {transcription && (
            <div
              style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: '#f9fafb',
                borderRadius: 'var(--border-radius)',
                marginBottom: 'var(--spacing-lg)',
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-sm)' }}>
                Transcription
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text)' }}>
                {transcription}
              </p>
            </div>
          )}

          {/* Normalized Value Panel */}
          {normalizedValue && (
            <div
              style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: '#eff6ff',
                borderRadius: 'var(--border-radius)',
                marginBottom: 'var(--spacing-lg)',
                border: '2px solid var(--color-primary)',
              }}
            >
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-sm)' }}>
                Interpreted as
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '500',
                  color: 'var(--color-text)',
                }}
              >
                {normalizedValue}
              </p>
              {confidence > 0 && (
                <div style={{ marginTop: 'var(--spacing-sm)' }}>
                  <small style={{ color: 'var(--color-text-secondary)' }}>
                    Confidence: {confidence}%
                  </small>
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex gap-1">
            <button
              className="btn-outline"
              onClick={handleBack}
              disabled={currentFieldIndex === 0 || processing}
              style={{ flex: 1 }}
            >
              Back
            </button>
            <button
              className="btn-outline"
              onClick={handleEdit}
              disabled={!normalizedValue || processing}
              style={{ flex: 1 }}
            >
              Edit
            </button>
            <button
              className="btn-primary"
              onClick={handleAccept}
              disabled={!normalizedValue || processing}
              style={{ flex: 2 }}
            >
              {currentFieldIndex < allFields.length - 1 ? 'Accept & Next' : 'Complete'}
            </button>
          </div>
        </div>

        <div className="text-center mt-2">
          <button
            className="btn-outline btn-small"
            onClick={() => navigate('/dashboard')}
          >
            Save & Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormCompletion;
