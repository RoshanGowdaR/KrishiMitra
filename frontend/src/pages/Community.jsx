import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const API = 'http://127.0.0.1:8000/api/v1';

const categories = [
  'crop_issues',
  'weather',
  'market_prices',
  'government_schemes',
  'success_stories',
  'general',
];

const timeAgo = (isoText) => {
  const diffMs = Date.now() - new Date(isoText).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function Community() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState('');
  const [replyTextByPost, setReplyTextByPost] = useState({});

  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState('crop_issues');
  const [createLanguage, setCreateLanguage] = useState(language || 'en');

  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');

  const visiblePosts = useMemo(() => posts || [], [posts]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API}/forum/posts`);
      if (filterCategory !== 'all') url.searchParams.set('category', filterCategory);
      if (filterLanguage !== 'all') url.searchParams.set('language', filterLanguage);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to load posts');
      setPosts(data?.posts || []);
    } catch (error) {
      toast.error(error.message || 'Unable to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      const response = await fetch(`${API}/forum/trending`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to load trending posts');
      setTrending(data?.trending_posts || []);
    } catch {
      setTrending([]);
    }
  };

  useEffect(() => {
    loadPosts();
    loadTrending();
  }, [filterCategory, filterLanguage]);

  const createPost = async () => {
    try {
      const authorName = user?.user_metadata?.full_name || user?.email || 'Farmer';
      const state = localStorage.getItem('krishimitra_state') || 'Karnataka';
      const district = localStorage.getItem('krishimitra_district') || 'NA';

      const response = await fetch(`${API}/forum/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName,
          title: createTitle,
          content: createContent,
          category: createCategory,
          language: createLanguage,
          state,
          district,
          image_base64: '',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to post');

      setCreateTitle('');
      setCreateContent('');
      toast.success('Posted successfully');
      loadPosts();
      loadTrending();
    } catch (error) {
      toast.error(error.message || 'Unable to create post');
    }
  };

  const submitReply = async (postId) => {
    const replyText = (replyTextByPost[postId] || '').trim();
    if (!replyText) return;

    try {
      const authorName = user?.user_metadata?.full_name || user?.email || 'Farmer';
      const response = await fetch(`${API}/forum/posts/${postId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName,
          content: replyText,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to submit reply');

      setReplyTextByPost((prev) => ({ ...prev, [postId]: '' }));
      loadPosts();
      loadTrending();
      toast.success('Reply added');
    } catch (error) {
      toast.error(error.message || 'Unable to submit reply');
    }
  };

  return (
    <div className="page-wrap">
      <h2>Community</h2>
      <p className="page-muted">Connect with farmers across India</p>

      <section className="panel">
        <h3>Create Post</h3>
        <div className="soil-form-grid">
          <label>Title
            <input value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Write post title" />
          </label>
          <label>Content
            <textarea value={createContent} onChange={(event) => setCreateContent(event.target.value)} placeholder="Share your question or update" />
          </label>
          <label>Category
            <select value={createCategory} onChange={(event) => setCreateCategory(event.target.value)}>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>Language
            <select value={createLanguage} onChange={(event) => setCreateLanguage(event.target.value)}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="kn">Kannada</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
            </select>
          </label>
          <button type="button" className="primary-btn" onClick={createPost}>Post</button>
        </div>
      </section>

      <section className="panel">
        <h3>Forum Posts Feed</h3>
        <div className="inline-form" style={{ marginTop: 0 }}>
          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
            <option value="all">All Posts</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select value={filterLanguage} onChange={(event) => setFilterLanguage(event.target.value)}>
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="kn">Kannada</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
          </select>
        </div>

        {loading ? <p className="page-muted">Loading posts...</p> : null}
        {!loading && visiblePosts.length === 0 ? <p className="page-muted">No posts found.</p> : null}

        <div className="social-search-grid" style={{ gridTemplateColumns: '1fr' }}>
          {visiblePosts.map((post) => {
            const expanded = expandedPostId === post.id;
            return (
              <article key={post.id} className="social-user-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '0.7rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#16a34a',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {(post.author_name || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0 }}><strong>{post.author_name}</strong> · {post.state} · {timeAgo(post.created_at)}</p>
                      <span className="forum-category-badge">{post.category}</span>
                    </div>
                  </div>
                </div>

                <h4 style={{ marginTop: '0.7rem' }}>{post.title}</h4>
                <p style={{
                  marginBottom: '0.55rem',
                  display: '-webkit-box',
                  WebkitLineClamp: expanded ? 'unset' : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {post.content}
                </p>

                <p className="page-muted">👍 {post.likes || 0} · 💬 {post.replies?.length || 0}</p>
                <button type="button" className="ghost-btn" onClick={() => setExpandedPostId(expanded ? '' : post.id)}>
                  View & Reply
                </button>

                {expanded ? (
                  <div style={{ marginTop: '0.7rem' }}>
                    <div className="social-chat-log" style={{ maxHeight: '220px', marginBottom: '0.7rem' }}>
                      {(post.replies || []).map((reply) => (
                        <div key={reply.id} className="social-row" style={{ marginBottom: 0 }}>
                          <div>
                            <p style={{ margin: 0 }}><strong>{reply.author_name}</strong></p>
                            <p style={{ margin: 0 }}>{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={replyTextByPost[post.id] || ''}
                      onChange={(event) => setReplyTextByPost((prev) => ({ ...prev, [post.id]: event.target.value }))}
                      placeholder="Add reply"
                    />
                    <button type="button" className="primary-btn" style={{ marginTop: '0.5rem' }} onClick={() => submitReply(post.id)}>
                      Submit Reply
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h3>Trending Posts</h3>
        <div className="social-search-grid">
          {trending.slice(0, 3).map((post) => (
            <article key={post.id} className="social-user-card">
              <p><strong>{post.title}</strong></p>
              <p className="page-muted">{post.author_name} · 👍 {post.likes || 0}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
