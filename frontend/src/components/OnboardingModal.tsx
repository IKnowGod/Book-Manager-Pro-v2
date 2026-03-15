import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import type { AiSettings } from '../types';
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
    model: 'gemini-2.5-flash',
  });
  const [bookTitle, setBookTitle] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

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
      onClose={() => {}} // Non-closable
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
              <input
                type="password"
                className="input"
                placeholder="Enter API Key"
                value={aiSettings.apiKey}
                onChange={e => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted mt-1">Leave blank to use server environment defaults (if set).</p>
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
