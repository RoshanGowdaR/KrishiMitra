import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { createForumPost, getPosts } from '../services/api';

export default function Forum() {
  const { t, i18n } = useTranslation();
  const { language: appLanguage, supportedLanguages } = useLanguage();
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
    language: appLanguage,
  });

  const defaultEnglishPosts = useMemo(
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
        title: 'Kharif crop planning',
        content: 'Ragi performed well this season. Which fertilizer schedule worked best for your fields?',
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        likes: 21,
        replies: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
      },
    ],
    []
  );

  const fallbackPosts = useMemo(() => {
    const localizedPosts = t('forum.samplePosts', { returnObjects: true });
    if (!Array.isArray(localizedPosts) || localizedPosts.length === 0) {
      return defaultEnglishPosts;
    }

    return localizedPosts.map((post, index) => ({
      id: `sample-${index + 1}`,
      author_name: post.author || defaultEnglishPosts[index]?.author_name || t('forum.defaults.farmer'),
      state: post.state || defaultEnglishPosts[index]?.state || t('forum.defaults.india'),
      category: defaultEnglishPosts[index]?.category || 'general',
      title: post.title || defaultEnglishPosts[index]?.title || '',
      content: post.content || defaultEnglishPosts[index]?.content || '',
      created_at: defaultEnglishPosts[index]?.created_at || new Date().toISOString(),
      likes: defaultEnglishPosts[index]?.likes || 0,
      replies: defaultEnglishPosts[index]?.replies || [],
    }));
  }, [defaultEnglishPosts, i18n.language, t]);

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
          toast.error(t('forum.messages.fetchError'));
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
  }, [category, language, t]);

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

      toast.success(t('forum.messages.createSuccess'));
      setIsCreateModalOpen(false);
      setFormData({ title: '', content: '', category: 'crop_issues', language: appLanguage });

      const refreshed = await getPosts({
        category: category === 'all' ? undefined : category,
        language: language === 'all' ? undefined : language,
      });
      setPosts(refreshed?.posts || []);
    } catch (error) {
      toast.error(t('forum.messages.createError'));
    }
  };

  if (isLoading) return <div className="panel">{t('forum.loading')}</div>;

  return (
    <div className="page-wrap forum-page">
      <div className="section-header-row">
        <h2>{t('forum.title')}</h2>
        <button type="button" className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>
          {t('forum.createPost')}
        </button>
      </div>

      <div className="panel forum-filters-row">
        <label>
          {t('forum.category')}
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">{t('common.all')}</option>
            <option value="crop_issues">{t('forum.categories.cropIssues')}</option>
            <option value="weather">{t('forum.categories.weather')}</option>
            <option value="market">{t('forum.categories.market')}</option>
          </select>
        </label>
        <label>
          {t('common.language')}
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="all">{t('common.all')}</option>
            {supportedLanguages.map((item) => (
              <option key={item.code} value={item.code}>{item.native}</option>
            ))}
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
                  <strong>{post.author_name || t('forum.defaults.farmer')}</strong>
                  <div className="forum-author-sub">
                    <span className="forum-state-badge">{post.state || t('forum.defaults.india')}</span>
                    <span>{timeAgo(post.created_at || new Date().toISOString())}</span>
                  </div>
                </div>
              </div>
              <span className="forum-category-badge">{post.category || t('forum.defaults.general')}</span>
            </div>

            <h3>{post.title}</h3>
            <p className="forum-preview">{post.content}</p>

            <div className="forum-card-bottom">
              <div>
                <span>👍 {post.likes || 0}</span>
                <span>💬 {post.replies?.length || 0}</span>
              </div>
              <button type="button" className="ghost-btn" onClick={() => setSelectedPost(post)}>
                {t('forum.viewPost')}
              </button>
            </div>
          </article>
        ))}
      </div>

      {isCreateModalOpen ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setIsCreateModalOpen(false)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>{t('forum.createPost')}</h3>
            <form className="soil-form-grid" onSubmit={submitPost}>
              <label>{t('forum.form.title')}<input value={formData.title} onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))} required /></label>
              <label>{t('forum.form.content')}<textarea value={formData.content} onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))} rows={4} required /></label>
              <label>{t('forum.category')}
                <select value={formData.category} onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}>
                  <option value="crop_issues">{t('forum.categories.cropIssues')}</option>
                  <option value="weather">{t('forum.categories.weather')}</option>
                  <option value="market">{t('forum.categories.market')}</option>
                </select>
              </label>
              <label>{t('common.language')}
                <select value={formData.language} onChange={(event) => setFormData((prev) => ({ ...prev, language: event.target.value }))}>
                  {supportedLanguages.map((item) => (
                    <option key={item.code} value={item.code}>{item.native}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="primary-btn">{t('common.submit')}</button>
            </form>
          </section>
        </div>
      ) : null}

      {selectedPost ? (
        <div className="scheme-modal-backdrop" role="presentation" onClick={() => setSelectedPost(null)}>
          <section className="scheme-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="scheme-modal-header">
              <h3>{selectedPost.title}</h3>
              <button type="button" className="ghost-btn" onClick={() => setSelectedPost(null)}>{t('common.close')}</button>
            </div>
            <p>{selectedPost.content}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
