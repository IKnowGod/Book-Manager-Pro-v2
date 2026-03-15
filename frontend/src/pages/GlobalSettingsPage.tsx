import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { AiSettings } from '../types';
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
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    api.settings.getAi()
      .then(data => {
        setSettings(data);
      })
      .catch(_err => setErrorMsg('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await api.settings.updateAi(settings);
      setSuccessMsg('Settings saved successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
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
                  onChange={e => setSettings({ ...settings, provider: e.target.value as 'gemini' | 'openai' })}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI / Compatible (Ollama, LMStudio, etc.)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="input-label">API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Enter API Key"
                  value={settings.apiKey}
                  onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
                />
                <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Leave blank to use the server environment variable default API key</p>
              </div>

              <div className="form-group">
                <label className="input-label">Model Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder={settings.provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-3.5-turbo'}
                  value={settings.model}
                  onChange={e => setSettings({ ...settings, model: e.target.value })}
                />
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

              {errorMsg && <p className="ai-error" style={{ marginTop: '1rem' }}>{errorMsg}</p>}
              {successMsg && <p className="text-sm" style={{ color: 'var(--color-accent-success)', marginTop: '1rem' }}>{successMsg}</p>}

              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving…</> : 'Save Settings'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
