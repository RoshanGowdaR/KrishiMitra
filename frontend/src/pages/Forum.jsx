import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { createForumPost, getPosts } from '../services/api';

export default function Forum() {
  const [category, setCategory] = useState('all');
  const [language, setLanguage] = useState('all');
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'crop_issues',
    language: 'en',
  });

  const fallbackPosts = useMemo(
    () => [
      {
        id: 'sample-1',
        author_name: 'Ramesh',
        state: 'Karnataka',
        category: 'crop_issues',
        title: 'Leaf yellowing in paddy field',
        content: 'My paddy crop leaves are turning yellow after recent rains. Looking for immediate treatment suggestions.',
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        likes: 12,
        replies: [{ id: 'r1' }, { id: 'r2' }],
      },
      {
        id: 'sample-2',
        author_name: 'Lakshmi',
        state: 'Tamil Nadu',
        category: 'market',
        title: 'Best mandi to sell tomato this week?',
        content: 'I have around 800 kg tomatoes ready. Which mandi has better modal rate this week near Hosur?',
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        likes: 8,
        replies: [{ id: 'r1' }],
      },
      {
        id: 'sample-3',
        author_name: 'Suresh',
        state: 'Maharashtra',
        category: 'weather',
        title: 'Unexpected rainfall alert in Nashik',
        content: 'Forecast says heavy rain in two days. What precautions should grape farmers take immediately?',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        likes: 21,
        replies: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
      },
    ],
    []
  );

  const visiblePosts = posts.length ? posts : fallbackPosts;

  useEffect(() => {
    let ignore = false;

    async function loadPosts() {
      setIsLoading(true);
      try {
        const response = await getPosts({
          category: category === 'all' ? undefined : category,
          language: language === 'all' ? undefined : language,
        });

        if (!ignore) {
          setPosts(response?.posts || []);
        }
      } catch (error) {
        if (!ignore) {
          setPosts([]);
          toast.error('Unable to load forum posts. Showing sample discussions.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadPosts();
    return () => {
      ignore = true;
    };
  }, [category, language]);

  const timeAgo = (isoDate) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const initials = (name) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

  const submitPost = async (event) => {
    event.preventDefault();
    try {
      await createForumPost({
        author_name: 'KrishiMitra User',
        state: 'Karnataka',
        district: 'Hassan',
        language: formData.language,
        category: formData.category,
        title: formData.title,
        content: formData.content,
        image_base64: '',
      });

      toast.success('Post created successfully.');
      setIsCreateModalOpen(false);
      setFormData({ title: '', content: '', category: 'crop_issues', language: 'en' });

      const refreshed = await getPosts({
        category: category === 'all' ? undefined : category,
        language: language === 'all' ? undefined : language,
      });
      setPosts(refreshed?.posts || []);
    } catch (error) {
      toast.error('Unable to create post right now.');
    }
  };

  if (isLoading) return <div className="panel">Loading forum posts...</div>;

  return (
    <div className="page-wrap forum-page">
      <div className="section-header-row">
        <h2>Community Forum</h2>
        <button type="button" className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>
          Create Post
        </button>
      </div>

      <div className="panel forum-filters-row">
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All</option>
            <option value="crop_issues">Crop Issues</option>
            <option value="weather">Weather</option>
            <option value="market">Market</option>
          </select>
        </label>
        <label>
          Language
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="all">All</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="kn">Kannada</option>
          </select>
        </label>
      </div>

      <div className="forum-feed">
        {visiblePosts.map((post) => (
          <article key={post.id} className="forum-card">
            <div className="forum-card-top">
              <div className="forum-author-block">
                <span className="forum-avatar">{initials(post.author_name || 'Farmer')}</span>
                <div>
                  <strong>{post.author_name || 'Farmer'}</strong>
                  <div className="forum-author-sub">
                    <span className="forum-state-badge">{post.state || 'India'}</span>
                    <span>{timeAgo(post.created_at || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>
              <span className="forum-category-badge">{post.category || 'general'}</span>
            </div>

            <h3>{post.title}</h3>
            <p className="forum-preview">{post.content}</p>

            <div className="forum-card-bottom">
              <div>
                <span>👍 {post.likes || 0}</span>
                <span>💬 {post.replies?.length || 0}</span>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setSelectedPost(post)}>
                View Post
              </button>
            </div>
          </article>
        ))}
      </div>

      {isCreateModalOpen ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setIsCreateModalOpen(false)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Create Post</h3>
            <form className="soil-form-grid" onSubmit={submitPost}>
              <label>Title<input value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} required /></label>
              <label>Content<textarea value={formData.content} onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))} rows={4} required /></label>
              <label>Category
                <select value={formData.category} onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}>
                  <option value="crop_issues">Crop Issues</option>
                  <option value="weather">Weather</option>
                  <option value="market">Market</option>
                </select>
              </label>
              <label>Language
                <select value={formData.language} onChange={(event) => setFormData((prev) => ({ ...prev, language: event.target.value }))}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="kn">Kannada</option>
                </select>
              </label>
              <button type="submit" className="primary-btn">Submit</button>
            </form>
          </section>
        </div>
      ) : null}

      {selectedPost ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setSelectedPost(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="scheme-modal-header">
              <h3>{selectedPost.title}</h3>
              <button type="button" className="ghost-btn" onClick={() => setSelectedPost(null)}>Close</button>
            </div>
            <p>{selectedPost.content}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
