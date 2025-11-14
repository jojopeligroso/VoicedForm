import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { templateAPI } from '../utils/api';

function TemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';

  const [template, setTemplate] = useState({
    name: '',
    description: '',
    sections: [],
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      loadTemplate();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      const data = await templateAPI.get(id);
      setTemplate(data);
    } catch (error) {
      console.error('Failed to load template:', error);
      alert('Failed to load template');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (template.sections.length === 0) {
      alert('Please add at least one section');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await templateAPI.create(template);
      } else {
        await templateAPI.update(id, template);
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    setTemplate({
      ...template,
      sections: [
        ...template.sections,
        {
          name: `Section ${template.sections.length + 1}`,
          fields: [],
        },
      ],
    });
  };

  const removeSection = (sectionIndex) => {
    setTemplate({
      ...template,
      sections: template.sections.filter((_, i) => i !== sectionIndex),
    });
  };

  const updateSection = (sectionIndex, updates) => {
    const newSections = [...template.sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], ...updates };
    setTemplate({ ...template, sections: newSections });
  };

  const addField = (sectionIndex) => {
    const newSections = [...template.sections];
    newSections[sectionIndex].fields.push({
      label: '',
      key: '',
      type: 'string',
      constraints: '',
      hint: '',
      enum_options: null,
    });
    setTemplate({ ...template, sections: newSections });
  };

  const removeField = (sectionIndex, fieldIndex) => {
    const newSections = [...template.sections];
    newSections[sectionIndex].fields = newSections[sectionIndex].fields.filter(
      (_, i) => i !== fieldIndex
    );
    setTemplate({ ...template, sections: newSections });
  };

  const updateField = (sectionIndex, fieldIndex, updates) => {
    const newSections = [...template.sections];
    newSections[sectionIndex].fields[fieldIndex] = {
      ...newSections[sectionIndex].fields[fieldIndex],
      ...updates,
    };
    setTemplate({ ...template, sections: newSections });
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
        <h1>{isNew ? 'New Template' : 'Edit Template'}</h1>
        <div className="flex gap-1">
          <button className="btn-outline" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="card mb-2">
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
            Template Name
          </label>
          <input
            type="text"
            placeholder="e.g., Incident Report"
            value={template.name}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: '500' }}>
            Description (optional)
          </label>
          <textarea
            placeholder="Brief description of this template..."
            value={template.description}
            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
            style={{ minHeight: '80px' }}
          />
        </div>
      </div>

      {/* Sections */}
      {template.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="card mb-2">
          <div className="flex justify-between align-center mb-2">
            <input
              type="text"
              placeholder="Section name"
              value={section.name}
              onChange={(e) => updateSection(sectionIndex, { name: e.target.value })}
              style={{ fontSize: '1.25rem', fontWeight: '600', border: 'none', padding: 'var(--spacing-xs)' }}
            />
            <button
              className="btn-danger btn-small"
              onClick={() => removeSection(sectionIndex)}
            >
              Remove Section
            </button>
          </div>

          {/* Fields */}
          {section.fields.map((field, fieldIndex) => (
            <div
              key={fieldIndex}
              style={{
                padding: 'var(--spacing-md)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius)',
                marginBottom: 'var(--spacing-md)',
              }}
            >
              <div className="grid grid-2 gap-1 mb-1">
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Date of incident"
                    value={field.label}
                    onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    Field Key
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., incident_date"
                    value={field.key}
                    onChange={(e) => updateField(sectionIndex, fieldIndex, { key: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2 gap-1 mb-1">
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    Type
                  </label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(sectionIndex, fieldIndex, { type: e.target.value })}
                  >
                    <option value="string">String</option>
                    <option value="paragraph">Paragraph</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="enum">Enum</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    Constraints (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., required, min:0, max:100"
                    value={field.constraints}
                    onChange={(e) => updateField(sectionIndex, fieldIndex, { constraints: e.target.value })}
                  />
                </div>
              </div>

              {field.type === 'enum' && (
                <div className="mb-1">
                  <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                    Enum Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Low, Medium, High"
                    value={field.enum_options ? field.enum_options.join(', ') : ''}
                    onChange={(e) =>
                      updateField(sectionIndex, fieldIndex, {
                        enum_options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              )}

              <div className="mb-1">
                <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontSize: '0.875rem' }}>
                  Hint (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Use format: MM/DD/YYYY"
                  value={field.hint}
                  onChange={(e) => updateField(sectionIndex, fieldIndex, { hint: e.target.value })}
                />
              </div>

              <button
                className="btn-danger btn-small"
                onClick={() => removeField(sectionIndex, fieldIndex)}
              >
                Delete Field
              </button>
            </div>
          ))}

          <button
            className="btn-outline w-full"
            onClick={() => addField(sectionIndex)}
          >
            Add Field
          </button>
        </div>
      ))}

      <button className="btn-secondary w-full" onClick={addSection}>
        Add Section
      </button>
    </div>
  );
}

export default TemplateEditor;
