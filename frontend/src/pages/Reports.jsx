import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDateTimeIST } from '../utils/istTime';
const REPORTS_STORAGE_KEY = 'krishimitra_pending_reports';

const ISSUE_TYPES = [
  'Bug Report',
  'Wrong Information',
  'Inappropriate Content',
  'Feature Request',
  'Other',
];

const SAFETY_TIPS = [
  'Keep your account secure',
  'Only buy/sell verified produce',
  'Never share OTP with anyone',
  'Report suspicious listings immediately',
];

export default function Reports() {
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState([]);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const submitReport = async () => {
    try {
      const next = {
        id: `${Date.now()}`,
        issueType,
        description: description.trim(),
        createdAt: new Date().toISOString(),
      };
      const merged = [next, ...history];
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(merged));
      setHistory(merged);
      setDescription('');
      setIssueType(ISSUE_TYPES[0]);
      toast.success('Thank you for your report! We will review it soon.');
    } catch {
      toast.error('Unable to submit report');
    }
  };

  return (
    <div className="page-wrap">
      <h2>Reports & Safety</h2>
      <p className="page-muted">Report issues or provide feedback</p>

      <section className="panel">
        <h3>Report an Issue</h3>
        <div className="soil-form-grid">
          <label>Issue Type
            <select value={issueType} onChange={(event) => setIssueType(event.target.value)}>
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the issue..." />
          </label>
          <button type="button" className="primary-btn" onClick={submitReport}>Submit Report</button>
        </div>
      </section>

      <section className="panel">
        <h3>My Feedback History</h3>
        {history.length === 0 ? <p className="page-muted">No reports submitted yet</p> : null}
        {history.map((item) => (
          <article key={item.id} className="social-user-card">
            <p><strong>{item.issueType}</strong></p>
            <p className="page-muted">{formatDateTimeIST(item.createdAt)}</p>
            <span className="forum-category-badge">Pending Review</span>
          </article>
        ))}
      </section>

      <section className="panel">
        <h3>Safety Tips</h3>
        <div className="social-search-grid">
          <article className="social-user-card"><p><strong>🔒</strong> {SAFETY_TIPS[0]}</p></article>
          <article className="social-user-card"><p><strong>🌾</strong> {SAFETY_TIPS[1]}</p></article>
          <article className="social-user-card"><p><strong>📞</strong> {SAFETY_TIPS[2]}</p></article>
          <article className="social-user-card"><p><strong>⚠️</strong> {SAFETY_TIPS[3]}</p></article>
        </div>
      </section>
    </div>
  );
}
