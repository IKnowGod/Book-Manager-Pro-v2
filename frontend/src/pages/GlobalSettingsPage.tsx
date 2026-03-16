import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { AiSettings, AiModel } from '../types';
import { Modal } from '../components/Modal';
import { useToast } from '../context/ToastContext';
import './GlobalSettingsPage.css';

export default function GlobalSettingsPage() {
  const [settings, setSettings] = useState<AiSettings>({
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    model: 'gemini-2.5-flash',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<AiModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const selectedModels = settings.model.split(',').map(m => m.trim()).filter(Boolean);

  const toggleModel = (modelName: string) => {
    let newModels;
    if (selectedModels.includes(modelName)) {
      newModels = selectedModels.filter(m => m !== modelName);
    } else {
      newModels = [...selectedModels, modelName];
    }
    setSettings({ ...settings, model: newModels.join(',') });
  };

  const moveModel = (index: number, direction: 'up' | 'down') => {
    const newModels = [...selectedModels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newModels.length) return;
    
    [newModels[index], newModels[targetIndex]] = [newModels[targetIndex], newModels[index]];
    setSettings({ ...settings, model: newModels.join(',') });
  };

  const fetchModels = useCallback(async (provider: string, apiKey: string) => {
    if (provider !== 'gemini') {
      setAvailableModels([]);
      return;
    }
    setLoadingModels(true);
    try {
      const models = await api.settings.getAiModels(provider, apiKey);
      setAvailableModels(models);
      
      // If the current model isn't in the list, but list isn't empty, maybe don't auto-change it
      // but if the field is empty, set a default
      if (!settings.model && models.length > 0) {
        setSettings(s => ({ ...s, model: models[0].name }));
      }
    } catch (err) {
      console.error('Failed to fetch models', err);
    } finally {
      setLoadingModels(false);
    }
  }, [settings.model]);

  useEffect(() => {
    api.settings.getAi()
      .then(data => {
        setSettings(data);
        if (data.provider === 'gemini') {
          fetchModels(data.provider, data.apiKey);
        }
      })
      .catch(_err => showToast('Failed to load settings.', 'error'))
      .finally(() => setLoading(false));
  }, []); // Only on mount

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.settings.updateAi(settings);
      showToast('Settings saved successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetOnboarding = async () => {
    try {
      await api.settings.updateAi({ ...settings, onboardingCompleted: false });
      window.location.href = '/';
    } catch (err) {
      showToast('Failed to reset onboarding.', 'error');
      setIsResetModalOpen(false);
    }
  };

  return (
    <div className="settings-page animate-fade-in" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
        </div>
      ) : (
        <>
          <header className="settings-header">
            <h1 className="settings-title">⚙️ Global Settings</h1>
          </header>

          <div className="flex flex-col gap-6">
            <section className="settings-card glass-card">
              <h2 className="settings-section-title">AI Provider Configuration</h2>
              <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
                Configure the AI model used for tag generation, consistency checking, and narrative analysis.
              </p>

              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="form-group">
                  <label className="input-label">Provider</label>
                  <select
                    className="input"
                    value={settings.provider}
                    onChange={e => {
                      const newProvider = e.target.value as 'gemini' | 'openai';
                      setSettings({ ...settings, provider: newProvider });
                      if (newProvider === 'gemini') {
                        fetchModels(newProvider, settings.apiKey);
                      }
                    }}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI / Compatible (Ollama, LMStudio, etc.)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="input-label">API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      className="input"
                      placeholder="Enter API Key"
                      value={settings.apiKey}
                      onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                    />
                    {settings.provider === 'gemini' && (
                      <button 
                        type="button" 
                        className="btn btn-ghost"
                        onClick={() => fetchModels(settings.provider, settings.apiKey)}
                        disabled={loadingModels}
                      >
                        {loadingModels ? '...' : '🔄'}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Leave blank to use the server environment variable default API key</p>
                </div>

                <div className="form-group">
                  <label className="input-label">Model Preference (Ordered Fallback)</label>
                  <p className="text-xs text-muted mb-2">
                    Select models in order of preference. If the first one hits a quota limit (429), it will automatically try the next one.
                  </p>
                  
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
                              <div className="text-xs opacity-60 truncate max-w-[300px]">{m}</div>
                            </div>
                            <div className="flex gap-1">
                              <button type="button" className="btn btn-icon btn-ghost p-1" onClick={() => moveModel(idx, 'up')} disabled={idx === 0}>
                                <span style={{ transform: 'rotate(-90deg)', display: 'inline-block' }}>➜</span>
                              </button>
                              <button type="button" className="btn btn-icon btn-ghost p-1" onClick={() => moveModel(idx, 'down')} disabled={idx === selectedModels.length - 1}>
                                <span style={{ transform: 'rotate(90deg)', display: 'inline-block' }}>➜</span>
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
                      No models selected. Please pick at least one below.
                    </div>
                  )}

                  {/* Available Models Selection */}
                  <label className="input-label text-xs opacity-70">Available Models</label>
                  {settings.provider === 'gemini' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1 scroll-area" style={{ maxHeight: '200px', padding: '4px' }}>
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
                      {loadingModels && <div className="spinner-sm" />}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. gpt-4, gpt-3.5-turbo"
                      value={settings.model}
                      onChange={e => setSettings({ ...settings, model: e.target.value })}
                    />
                  )}
                  {settings.provider === 'gemini' && (
                    <p className="text-[10px] text-muted mt-2">
                      💡 Tip: Choose Flash models for speed and Pro models for complex creative tasks.
                    </p>
                  )}
                </div>

                {settings.provider === 'openai' && (
                  <div className="form-group animate-slide-down">
                    <label className="input-label">Custom Base URL (Optional)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. http://localhost:1234/v1"
                      value={settings.baseUrl}
                      onChange={e => setSettings({ ...settings, baseUrl: e.target.value })}
                    />
                    <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Useful for local models via Ollama or LMStudio</p>
                  </div>
                )}


                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><div className="spinner" /> Saving…</> : 'Save Settings'}
                  </button>
                </div>
              </form>
            </section>

            <section className="settings-card glass-card">
              <h2 className="settings-section-title">Setup & Onboarding</h2>
              <p className="text-muted text-sm" style={{ marginBottom: '1.5rem' }}>
                Need to re-configure your workspace or walk through the setup again? This will launch the interactive guide.
              </p>
              <button 
                className="btn btn-ghost" 
                onClick={() => setIsResetModalOpen(true)}
              >
                🔄 Rerun Setup Workflow
              </button>
            </section>
          </div>

          <Modal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            title="Rerun Setup Workflow"
            footer={
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setIsResetModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleResetOnboarding}
                >
                  Start Setup
                </button>
              </div>
            }
          >
            <p className="mb-4">
              This will return you to the initial setup workflow where you can re-configure your AI provider and create a new book project.
            </p>
            <p className="text-sm text-muted">
              Note: Your existing books and data will <strong>not</strong> be affected.
            </p>
          </Modal>
        </>
      )}
    </div>
  );
}
