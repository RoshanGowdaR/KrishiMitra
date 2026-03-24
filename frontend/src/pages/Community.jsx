import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { searchUsers } from '../services/socialService';

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

const byNewest = (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

export default function Community() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
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

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeFarmer, setActiveFarmer] = useState(null);

  const visiblePosts = useMemo(() => posts || [], [posts]);

  const loadFilteredPosts = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API}/forum/posts`);
      if (filterCategory !== 'all') url.searchParams.set('category', filterCategory);
      if (filterLanguage !== 'all') url.searchParams.set('language', filterLanguage);

      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to load posts');
      setPosts((data?.posts || []).sort(byNewest));
    } catch (error) {
      toast.error(error.message || 'Unable to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPosts = async () => {
    try {
      const response = await fetch(`${API}/forum/posts`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to load all posts');
      setAllPosts((data?.posts || []).sort(byNewest));
      return data?.posts || [];
    } catch {
      setAllPosts([]);
      return [];
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
    loadFilteredPosts();
    loadAllPosts();
    loadTrending();
  }, [filterCategory, filterLanguage]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const runSearch = async () => {
      if (!debouncedSearch) {
        setSearchResults([]);
        return;
      }

      const results = await searchUsers(debouncedSearch);
      setSearchResults(results || []);
    };

    runSearch();
  }, [debouncedSearch]);

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
      loadFilteredPosts();
      loadAllPosts();
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
        body: JSON.stringify({ author_name: authorName, content: replyText }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || 'Failed to submit reply');

      setReplyTextByPost((prev) => ({ ...prev, [postId]: '' }));
      loadFilteredPosts();
      loadAllPosts();
      loadTrending();
      toast.success('Reply added');
    } catch (error) {
      toast.error(error.message || 'Unable to submit reply');
    }
  };

  const openAuthor = (post) => {
    const inferredUserId = post.author_id || post.user_id || post.author_user_id || null;
    if (inferredUserId) {
      navigate(`/app/profile/${inferredUserId}`);
      return;
    }

    const postsByFarmer = allPosts.filter((item) => (item.author_name || '').toLowerCase() === (post.author_name || '').toLowerCase());
    setActiveFarmer({
      name: post.author_name || 'Farmer',
      state: post.state || 'Unknown',
      posts: postsByFarmer,
    });
  };

  return (
    <div className="page-wrap">
      <h2>Community</h2>
      <p className="page-muted">Connect with farmers across India</p>

      <section className="panel">
        <h3>Find Farmers</h3>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by name, location or User ID (e.g. 05E9383C)"
          style={{ width: '100%', maxWidth: '560px' }}
        />

        <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.7rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {searchResults.map((farmer) => (
            <article
              key={farmer.id}
              style={{ minWidth: '250px', border: '1px solid #dcfce7', borderRadius: '12px', background: '#fff', padding: '0.7rem', display: 'grid', gap: '0.45rem' }}
            >
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                  {(farmer.name || 'F').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{farmer.name || 'Farmer'}</p>
                  <p className="page-muted" style={{ margin: 0, fontSize: '0.76rem' }}>📍 {farmer.state || 'Unknown'}, {farmer.district || '-'}</p>
                </div>
              </div>
              <p className="page-muted" style={{ margin: 0, fontSize: '0.74rem' }}>ID: {(farmer.user_uid || farmer.id || '').toString().slice(0, 8).toUpperCase()}</p>
              <button type="button" className="ghost-btn" onClick={() => navigate(`/app/profile/${farmer.id}`)}>View Profile</button>
            </article>
          ))}
          {debouncedSearch && searchResults.length === 0 ? <p className="page-muted">No farmers found.</p> : null}
        </div>
      </section>

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
                  <button
                    type="button"
                    onClick={() => openAuthor(post)}
                    style={{ display: 'flex', gap: '0.7rem', background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                      {(post.author_name || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0 }}><strong>{post.author_name}</strong> · {post.state} · {timeAgo(post.created_at)}</p>
                      <span className="forum-category-badge">{post.category}</span>
                    </div>
                  </button>
                </div>

                <h4 style={{ marginTop: '0.7rem' }}>{post.title}</h4>
                <p style={{ marginBottom: '0.55rem', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {post.content}
                </p>

                <p className="page-muted">👍 {post.likes || 0} · 💬 {post.replies?.length || 0}</p>
                <button type="button" className="ghost-btn" onClick={() => setExpandedPostId(expanded ? '' : post.id)}>View & Reply</button>

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
                    <button type="button" className="primary-btn" style={{ marginTop: '0.5rem' }} onClick={() => submitReply(post.id)}>Submit Reply</button>
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

      {activeFarmer ? (
        <div role="presentation" onClick={() => setActiveFarmer(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', zIndex: 220, padding: '1rem' }}>
          <div role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: '14px', border: '1px solid #dcfce7', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem' }}>
              <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                <div style={{ width: '62px', height: '62px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '1.3rem' }}>
                  {(activeFarmer.name || 'F').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{activeFarmer.name}</h3>
                  <span className="forum-category-badge">{activeFarmer.state}</span>
                </div>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setActiveFarmer(null)}>Close</button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p style={{ marginTop: 0, fontWeight: 700 }}>Posts by this farmer</p>
              <div style={{ display: 'grid', gap: '0.55rem', maxHeight: '260px', overflowY: 'auto' }}>
                {activeFarmer.posts.slice(0, 5).map((post) => (
                  <article key={post.id} style={{ border: '1px solid #dcfce7', borderRadius: '10px', padding: '0.55rem' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{post.title}</p>
                    <p className="page-muted" style={{ margin: 0 }}>{post.category} · {timeAgo(post.created_at)}</p>
                  </article>
                ))}
                {activeFarmer.posts.length === 0 ? <p className="page-muted">No posts found.</p> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
