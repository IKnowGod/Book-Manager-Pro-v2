import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import type { AiSettings, AiModel } from '../types';
import { useNavigate } from 'react-router-dom';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-1.5-flash',
  });
  const [bookTitle, setBookTitle] = useState('');
  const [error, setError] = useState('');
  const [availableModels, setAvailableModels] = useState<AiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const navigate = useNavigate();

  const selectedModels = aiSettings.model.split(',').map(m => m.trim()).filter(Boolean);

  const toggleModel = (modelName: string) => {
    let newModels;
    if (selectedModels.includes(modelName)) {
      newModels = selectedModels.filter(m => m !== modelName);
    } else {
      newModels = [...selectedModels, modelName];
    }
    setAiSettings({ ...aiSettings, model: newModels.join(',') });
  };

  const moveModel = (index: number, direction: 'up' | 'down') => {
    const newModels = [...selectedModels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newModels.length) return;
    
    [newModels[index], newModels[targetIndex]] = [newModels[targetIndex], newModels[index]];
    setAiSettings({ ...aiSettings, model: newModels.join(',') });
  };

  useEffect(() => {
    if (aiSettings.provider === 'gemini' && step === 2) {
      const fetchModels = async () => {
        setLoadingModels(true);
        try {
          const models = await api.settings.getAiModels(aiSettings.provider, aiSettings.apiKey);
          setAvailableModels(models);
          // Auto-select first model if none set
          if (!aiSettings.model && models.length > 0) {
            setAiSettings(s => ({ ...s, model: models[0].name }));
          }
        } catch (err) {
          console.error('Failed to fetch models in onboarding', err);
        } finally {
          setLoadingModels(false);
        }
      };
      fetchModels();
    }
  }, [aiSettings.provider, aiSettings.apiKey, step]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleDismiss = async () => {
    try {
      // Save that we've seen this, even if not fully configured
      await api.settings.updateAi({ ...aiSettings, onboardingCompleted: true });
    } catch (err) {
      console.error('Failed to dismiss onboarding', err);
    }
    onComplete();
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Save AI Settings and mark onboarding as complete
      await api.settings.updateAi({ ...aiSettings, onboardingCompleted: true });
      
      // 2. Create first book
      if (bookTitle.trim()) {
        const book = await api.books.create(bookTitle.trim());
        navigate(`/books/${book.id}`);
      }
      
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title={step === 1 ? "Welcome to Book Manager Pro" : step === 2 ? "Configure AI" : "Create Your First Book"}
      footer={
        <div className="flex justify-between w-full">
          {step > 1 && (
            <button className="btn btn-ghost" onClick={handleBack} disabled={loading}>
              Back
            </button>
          )}
          <div className="flex-grow" />
          {step < 3 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next Step
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleFinish} disabled={loading || !bookTitle.trim()}>
              {loading ? 'Setting up...' : 'Finish Setup'}
            </button>
          )}
        </div>
      }
    >
      <div className="onboarding-content py-4">
        {step === 1 && (
          <div className="text-center animate-fade-in">
             <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✨</div>
             <h3 className="mb-4">Let's get you set up!</h3>
             <p className="text-muted">
               Book Manager Pro uses AI to help you track consistency, suggest tags, and analyze your narrative. 
               In the next few steps, we'll configure your AI provider and create your first book.
             </p>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-in-right">
            <p className="text-sm text-muted mb-6">
              Choose your preferred AI provider. You can use Google Gemini (recommended) or an OpenAI-compatible local model (like Ollama or LM Studio).
            </p>
            
            <div className="form-group mb-4">
              <label className="input-label">Provider</label>
              <select
                className="input"
                value={aiSettings.provider}
                onChange={e => setAiSettings({ ...aiSettings, provider: e.target.value as 'gemini' | 'openai' })}
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI / Compatible (Local LLM)</option>
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="input-label">API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="input"
                  placeholder="Enter API Key"
                  value={aiSettings.apiKey}
                  onChange={e => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
                />
                {aiSettings.provider === 'gemini' && (
                  <button 
                    type="button" 
                    className="btn btn-ghost"
                    onClick={async () => {
                      setLoadingModels(true);
                      try {
                        const models = await api.settings.getAiModels(aiSettings.provider, aiSettings.apiKey);
                        setAvailableModels(models);
                      } finally {
                        setLoadingModels(false);
                      }
                    }}
                    disabled={loadingModels}
                  >
                    {loadingModels ? '...' : '🔄'}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted mt-1">Leave blank to use server environment defaults (if set).</p>
            </div>
            
            <div className="form-group mb-4">
              <label className="input-label">Model Preference (Ordered Fallback)</label>
              
              {/* Selected Models List */}
              {selectedModels.length > 0 ? (
                <div className="flex flex-col gap-2 mb-4">
                  {selectedModels.map((m, idx) => {
                    const modelInfo = availableModels.find(am => am.name === m);
                    return (
                      <div key={m} className="flex items-center gap-2 p-2 glass-card border border-primary/20 rounded-lg animate-slide-right" style={{ background: 'rgba(var(--color-accent-primary-rgb), 0.05)' }}>
                        <span className="text-xs font-bold text-primary opacity-50 w-4">{idx + 1}.</span>
                        <div className="flex-grow">
                          <div className="text-sm font-medium">{modelInfo?.displayName || m}</div>
                          <div className="text-[10px] opacity-60 truncate max-w-[200px]">{m}</div>
                        </div>
                        <div className="flex gap-1">
                          <button type="button" className="btn btn-icon btn-ghost p-1" onClick={() => moveModel(idx, 'up')} disabled={idx === 0}>
                            <span style={{ transform: 'rotate(-90deg)', display: 'inline-block', fontSize: '10px' }}>➜</span>
                          </button>
                          <button type="button" className="btn btn-icon btn-ghost p-1" onClick={() => moveModel(idx, 'down')} disabled={idx === selectedModels.length - 1}>
                            <span style={{ transform: 'rotate(90deg)', display: 'inline-block', fontSize: '10px' }}>➜</span>
                          </button>
                          <button type="button" className="btn btn-icon btn-ghost p-1 text-danger" onClick={() => toggleModel(m)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 border-2 border-dashed border-border-subtle rounded-lg text-center text-sm text-muted mb-4">
                  No models selected.
                </div>
              )}

              {/* Available Models Selection */}
              <label className="input-label text-xs opacity-70">Available Models</label>
              {aiSettings.provider === 'gemini' ? (
                <div className="grid grid-cols-2 gap-2 mt-1 scroll-area" style={{ maxHeight: '180px', padding: '4px' }}>
                  {availableModels.map(m => {
                    const isSelected = selectedModels.includes(m.name);
                    return (
                      <button
                        key={m.name}
                        type="button"
                        className={`model-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleModel(m.name)}
                        title={m.description}
                      >
                        <span className="model-name truncate">{m.displayName || m.name}</span>
                        <span className="model-id truncate">{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. gpt-4, gpt-3.5-turbo"
                  value={aiSettings.model}
                  onChange={e => setAiSettings({ ...aiSettings, model: e.target.value })}
                />
              )}
              {loadingModels && <p className="text-[10px] text-muted mt-1">Discovering models...</p>}
            </div>

            {aiSettings.provider === 'openai' && (
              <div className="form-group animate-slide-down">
                <label className="input-label">Custom Base URL</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. http://localhost:1234/v1"
                  value={aiSettings.baseUrl}
                  onChange={e => setAiSettings({ ...aiSettings, baseUrl: e.target.value })}
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="animate-slide-in-right">
            <p className="text-sm text-muted mb-6">
              Finally, give your first book a title. You can always change this later.
            </p>
            <div className="form-group">
              <label className="input-label">Book Title</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. The Great Adventure"
                value={bookTitle}
                onChange={e => setBookTitle(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="text-danger text-sm mt-4">{error}</p>}
          </div>
        )}

        <div className="onboarding-steps flex justify-center gap-2 mt-8">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`step-indicator ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`} 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: s === step ? 'var(--color-accent-primary)' : s < step ? 'var(--color-accent-success)' : 'var(--color-border-subtle)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
};
