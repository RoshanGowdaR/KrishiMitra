import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDateTimeIST } from '../utils/istTime';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { supabase } from '../lib/supabase';
import { uploadChatMedia } from '../services/socialService';
import { createForumPost } from '../services/api';

const ISSUE_TYPES = [
  'Bug Report',
  'Wrong Information',
  'Inappropriate Content',
  'Farmer Misconduct',
  'Feature Request',
  'Other',
];

const ADMIN_EMAIL = 'gowdaroshan49@gmail.com';

const isMissingColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('schema cache') || message.includes('could not find');
};

export default function Reports() {
  const { user } = useAuth();
  const { role } = useRole();
  const [reportMode, setReportMode] = useState('platform_issue');
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [targetUid, setTargetUid] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [myUid, setMyUid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminReplyDrafts, setAdminReplyDrafts] = useState({});

  const isAdmin = useMemo(() => {
    const email = String(user?.email || '').toLowerCase();
    return role === 'admin' || email === ADMIN_EMAIL;
  }, [role, user?.email]);

  const loadIdentity = async () => {
    if (!user?.id) return '';

    const { data, error } = await supabase
      .from('users')
      .select('user_uid')
      .eq('id', user.id)
      .maybeSingle();

    if (error) return user.id;
    return data?.user_uid || user.id;
  };

  const loadHistory = async () => {
    if (!user?.id) return;

    const reporterUid = await loadIdentity();
    setMyUid(reporterUid);

    try {
      let query = supabase
        .from('user_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!isAdmin) {
        query = query.eq('reporter_uid', reporterUid);
      }

      const { data, error } = await query;
      if (error) throw error;

      setHistory(data || []);
    } catch {
      setHistory([]);
      toast.error('Unable to load reports right now');
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user?.id, isAdmin]);

  const createAdminNotifications = async (reportId) => {
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (!admins?.length) return;

      const rows = admins.map((entry) => ({
        user_id: entry.id,
        title: 'New Farmer Report',
        message: `A new report (${reportId}) has been filed and needs review.`,
        type: 'warning',
        link: '/app/reports',
        is_read: false,
      }));
      await supabase.from('notifications').insert(rows);
    } catch {
      // Best effort notification.
    }
  };

  const submitReport = async () => {
    if (!user?.id) {
      toast.error('Please login first');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide report details');
      return;
    }

    if (reportMode === 'farmer_report' && !targetUid.trim()) {
      toast.error('Enter target farmer UID');
      return;
    }

    setIsSubmitting(true);
    try {
      const reporterUid = myUid || await loadIdentity();

      let screenshotUrl = null;
      if (screenshotFile) {
        const { url, error } = await uploadChatMedia(screenshotFile, user.id);
        if (error) throw error;
        screenshotUrl = url;
      }

      let target = null;
      if (reportMode === 'farmer_report') {
        const { data: targetData, error: targetError } = await supabase
          .from('users')
          .select('id, user_uid, name')
          .ilike('user_uid', targetUid.trim())
          .maybeSingle();

        if (targetError) throw targetError;
        if (!targetData) {
          toast.error('Target UID not found');
          return;
        }

        if ((targetData.user_uid || targetData.id) === reporterUid) {
          toast.error('You cannot report yourself');
          return;
        }

        target = targetData;
      }

      const basePayload = {
        reporter_uid: reporterUid,
        target_uid: target?.user_uid || target?.id || 'SYSTEM',
        reason: issueType,
        details: description.trim(),
        status: 'open',
      };

      const extendedPayload = {
        ...basePayload,
        report_type: reportMode,
        screenshot_url: screenshotUrl,
        target_user_id: target?.id || null,
      };

      let created = null;
      const primaryInsert = await supabase
        .from('user_reports')
        .insert(extendedPayload)
        .select('*')
        .maybeSingle();

      if (primaryInsert.error && isMissingColumnError(primaryInsert.error)) {
        const fallbackInsert = await supabase
          .from('user_reports')
          .insert(basePayload)
          .select('*')
          .maybeSingle();

        if (fallbackInsert.error) throw fallbackInsert.error;
        created = fallbackInsert.data;
      } else if (primaryInsert.error) {
        throw primaryInsert.error;
      } else {
        created = primaryInsert.data;
      }

      await createAdminNotifications(created?.id || 'new-report');
      toast.success('Report submitted successfully');

      setDescription('');
      setIssueType(ISSUE_TYPES[0]);
      setTargetUid('');
      setScreenshotFile(null);
      setReportMode('platform_issue');
      await loadHistory();
    } catch (error) {
      toast.error(error?.message || 'Unable to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateReportAsAdmin = async (reportId, patch) => {
    const attempt = await supabase
      .from('user_reports')
      .update(patch)
      .eq('id', reportId);

    if (attempt.error && isMissingColumnError(attempt.error)) {
      const fallback = await supabase
        .from('user_reports')
        .update({ status: patch.status || 'in_progress' })
        .eq('id', reportId);

      if (fallback.error) throw fallback.error;
      return;
    }

    if (attempt.error) throw attempt.error;
  };

  const adminReplyInForum = async (item) => {
    if (!isAdmin) return;

    const replyText = String(adminReplyDrafts[item.id] || '').trim();
    if (!replyText) {
      toast.error('Enter reply text for this report');
      return;
    }

    try {
      await createForumPost({
        author_name: 'Admin',
        state: 'Karnataka',
        district: 'Hassan',
        language: 'en',
        category: 'general',
        title: `Admin Update on Report #${item.id?.slice?.(0, 8) || 'N/A'}`,
        content: `This message is from the admin: ${replyText}. This issue will be resolved as soon as possible.`,
        image_base64: '',
      });

      await updateReportAsAdmin(item.id, {
        status: 'in_progress',
        admin_reply: replyText,
        handled_by_uid: myUid || user?.id,
      });

      if (item.reporter_uid) {
        const { data: reporter } = await supabase
          .from('users')
          .select('id, user_uid')
          .ilike('user_uid', item.reporter_uid)
          .maybeSingle();

        if (reporter?.id) {
          await supabase.from('notifications').insert({
            user_id: reporter.id,
            title: 'Admin replied to your report',
            message: `Your report ${item.id} has received an admin response in forum.`,
            type: 'info',
            link: '/app/forum',
            is_read: false,
          });
        }
      }

      setAdminReplyDrafts((prev) => ({ ...prev, [item.id]: '' }));
      toast.success('Admin response posted to forum');
      await loadHistory();
    } catch (error) {
      toast.error(error?.message || 'Unable to post admin response');
    }
  };

  const closeReport = async (item) => {
    if (!isAdmin) return;
    try {
      await updateReportAsAdmin(item.id, { status: 'closed' });
      toast.success('Report closed');
      await loadHistory();
    } catch (error) {
      toast.error(error?.message || 'Unable to close report');
    }
  };

  return (
    <div className="page-wrap">
      <h2>{isAdmin ? 'Reports Management' : 'Reports & Safety'}</h2>
      <p className="page-muted">
        {isAdmin
          ? 'Review farmer reports, post admin updates in forum, and resolve cases.'
          : 'Raise app issues or report other farmers with UID, reason, and screenshot.'}
      </p>

      {!isAdmin ? (
        <section className="panel">
          <h3>File a Report</h3>
          <div className="soil-form-grid">
            <label>Report Type
              <select value={reportMode} onChange={(event) => setReportMode(event.target.value)}>
                <option value="platform_issue">Platform / App Issue</option>
                <option value="farmer_report">Report Another Farmer</option>
              </select>
            </label>

            {reportMode === 'farmer_report' ? (
              <label>Target Farmer UID
                <input
                  value={targetUid}
                  onChange={(event) => setTargetUid(event.target.value.toUpperCase())}
                  placeholder="Enter UID of farmer you are reporting"
                />
              </label>
            ) : null}

            <label>Issue Type
              <select value={issueType} onChange={(event) => setIssueType(event.target.value)}>
                {ISSUE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label>Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Enter suitable reason and full details"
                rows={4}
              />
            </label>

            <label>Screenshot (optional)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setScreenshotFile(event.target.files?.[0] || null)}
              />
            </label>

            <button type="button" className="primary-btn" onClick={submitReport} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h3>{isAdmin ? 'All Farmer Reports' : 'My Reports'}</h3>
        {history.length === 0 ? <p className="page-muted">No reports found.</p> : null}

        {history.map((item) => (
          <article key={item.id} className="social-user-card" style={{ marginBottom: '0.8rem' }}>
            <p><strong>ID:</strong> {item.id}</p>
            <p><strong>Status:</strong> {item.status || 'open'}</p>
            <p><strong>Type:</strong> {item.report_type || (item.target_uid === 'SYSTEM' ? 'platform_issue' : 'farmer_report')}</p>
            <p><strong>Reason:</strong> {item.reason}</p>
            <p><strong>Details:</strong> {item.details || 'N/A'}</p>
            <p><strong>Reporter UID:</strong> {item.reporter_uid}</p>
            <p><strong>Target UID:</strong> {item.target_uid || 'SYSTEM'}</p>
            <p className="page-muted">{formatDateTimeIST(item.created_at)}</p>

            {item.screenshot_url ? (
              <p>
                <a href={item.screenshot_url} target="_blank" rel="noreferrer">View Screenshot</a>
              </p>
            ) : null}

            {isAdmin ? (
              <>
                <label style={{ display: 'block', marginTop: '0.5rem' }}>
                  Admin Forum Reply
                  <textarea
                    rows={3}
                    value={adminReplyDrafts[item.id] || ''}
                    onChange={(event) => setAdminReplyDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                    placeholder="This issue will be resolved as soon as possible..."
                  />
                </label>

                <div className="machineries-actions-row" style={{ marginTop: '0.5rem' }}>
                  <button type="button" className="ghost-btn" onClick={() => adminReplyInForum(item)}>
                    Reply in Forum as Admin
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => closeReport(item)}>
                    Mark Closed
                  </button>
                </div>
              </>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
