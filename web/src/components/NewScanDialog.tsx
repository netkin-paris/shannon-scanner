import { useState, useEffect } from 'react';
import { fetchRepos, startScan } from '../api.ts';

interface NewScanDialogProps {
  onClose: () => void;
  onStarted: (workflowId: string) => void;
}

export function NewScanDialog({ onClose, onStarted }: NewScanDialogProps) {
  const [url, setUrl] = useState('');
  const [repo, setRepo] = useState('');
  const [repos, setRepos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepos()
      .then(setRepos)
      .catch(() => setError('Failed to load repositories'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !repo) return;

    setLoading(true);
    setError(null);

    try {
      const result = await startScan(url, repo);
      onStarted(result.workflowId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scan');
      setLoading(false);
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>New Scan</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url">Target URL</label>
            <input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="repo">Repository</label>
            {repos.length > 0 ? (
              <select
                id="repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                required
              >
                <option value="">Select a repository...</option>
                {repos.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            ) : (
              <input
                id="repo"
                type="text"
                placeholder="repository-name"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                required
              />
            )}
            <span className="form-hint">
              Directory name inside <code>./repos/</code>
            </span>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !url || !repo}
            >
              {loading ? 'Starting...' : 'Start Scan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
