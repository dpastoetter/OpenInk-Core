import { useState, useEffect, useCallback, useMemo, useContext } from 'preact/hooks';
import type { AppContext, AppInstance } from '../../types/plugin';
import { PLUGIN_API_VERSION } from '../../types/plugin';
import { PageNav } from '@core/ui/PageNav';
import { stripHtml } from '@core/utils/html';
import { formatDateLegacy } from '@core/utils/date';
import { getCorsProxyUrl } from '@core/constants';
import { AppHeaderActionsContext } from '@core/kernel/AppHeaderActionsContext';

const REDDIT_JSON = (path: string) => `https://www.reddit.com${path}.json?raw_json=1&limit=25`;

type ListSort = 'hot' | 'new' | 'best';
const LIST_SORTS: ListSort[] = ['hot', 'new', 'best'];

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    selftext_html: string | null;
    author: string;
    score: number;
    created_utc: number;
    url: string;
    permalink: string;
    is_self: boolean;
    num_comments: number;
  };
}

interface RedditComment {
  data: {
    id: string;
    body: string;
    author: string;
    score: number;
    created_utc: number;
    depth: number;
    replies?: string | { data: { children: RedditComment[] } };
  };
}

const DEFAULT_SUBS = ['books', 'cryptocurrencies', 'popular', 'technology', 'wallstreetbets', 'worldnews'];

function parseRedditSubreddits(json: string | undefined): string[] {
  if (!json || !json.trim()) return [...DEFAULT_SUBS];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [...DEFAULT_SUBS];
    const out: string[] = [];
    for (const x of arr) {
      if (typeof x === 'string' && x.trim()) {
        const sub = x.trim().toLowerCase().replace(/^r\//, '');
        if (sub && !out.includes(sub)) out.push(sub);
      }
    }
    return out.length ? out : [...DEFAULT_SUBS];
  } catch {
    return [...DEFAULT_SUBS];
  }
}

function redditSubredditsToJson(subs: string[]): string {
  return JSON.stringify(subs);
}

const POSTS_PER_PAGE = 10;

function scrollAppContentToTop() {
  try {
    const appContent = document.querySelector('.app-content') as HTMLElement | null;
    if (appContent) appContent.scrollTo(0, 0);
    const root = document.getElementById('root');
    if (root) root.scrollTo(0, 0);
  } catch { /* scroll not available */ }
}

/** Reddit API comment node (children may include "more" placeholders without body). */
interface RedditCommentNode {
  data?: {
    id?: string;
    body?: string;
    author?: string;
    score?: number;
    created_utc?: number;
    depth?: number;
    replies?: string | { data: { children: RedditCommentNode[] } };
  };
}

/** Reddit API: [0] = post listing, [1] = comments listing. */
type RedditPostCommentsResponse = [
  { data: { children: unknown[] } },
  { data: { children: RedditCommentNode[] } }
];

function RedditApp(context: AppContext): AppInstance {
  const { network, settings } = context.services;
  const backRef: {
    current: {
      setSelectedPost: (p: RedditPost['data'] | null) => void;
      selectedPost: RedditPost['data'] | null;
      setCurrentSub: (s: string | null) => void;
      currentSub: string | null;
    } | null;
  } = { current: null };

  function RedditUI() {
    const [subs, setSubs] = useState<string[]>(() => parseRedditSubreddits(settings.get().redditSubreddits));
    const [searchInput, setSearchInput] = useState('');
    const [currentSub, setCurrentSub] = useState<string | null>(null);
    const [editMode, setEditMode] = useState(false);
    const setHeaderActions = useContext(AppHeaderActionsContext);

    const persistSubs = useCallback(
      (next: string[]) => {
        setSubs(next);
        settings.set({ redditSubreddits: redditSubredditsToJson(next) });
      },
      [settings]
    );

    const removeSub = (sub: string) => {
      persistSubs(subs.filter((s) => s !== sub));
    };

    const addSub = (name: string) => {
      const trimmed = name.trim().toLowerCase().replace(/^r\//, '');
      if (!trimmed || subs.includes(trimmed)) return;
      persistSubs([...subs, trimmed]);
      setSearchInput('');
    };
    const [posts, setPosts] = useState<RedditPost['data'][]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPost, setSelectedPost] = useState<RedditPost['data'] | null>(null);
    const [listSort, setListSort] = useState<ListSort>('hot');
    backRef.current = { setSelectedPost, selectedPost, setCurrentSub, currentSub };
    const [comments, setComments] = useState<RedditComment[]>([]);
    const [listPage, setListPage] = useState(1);
    const [commentPage, setCommentPage] = useState(1);

    const loadSub = useCallback(async (sub: string, sort: ListSort) => {
      setLoading(true);
      setError(null);
      try {
        const url = REDDIT_JSON(`/r/${sub}/${sort}`);
        const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
        const proxyUrl = proxy + encodeURIComponent(url);
        const data = await network.fetchJson<{ data: { children: RedditPost[] } }>(proxyUrl);
        setPosts(data.data.children.map((c) => c.data));
        setListPage(1);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load';
        if (msg.includes('500')) {
          setError("This subreddit couldn't be loaded (server error). Try again or pick another.");
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    }, [network]);

    useEffect(() => {
      if (currentSub) loadSub(currentSub, listSort);
    }, [currentSub, listSort, loadSub]);

    useEffect(() => {
      if (!selectedPost) return;
      const t = setTimeout(scrollAppContentToTop, 0);
      return () => clearTimeout(t);
    }, [selectedPost]);

    useEffect(() => {
      const t = setTimeout(scrollAppContentToTop, 0);
      return () => clearTimeout(t);
    }, [listPage]);

    useEffect(() => {
      const t = setTimeout(scrollAppContentToTop, 0);
      return () => clearTimeout(t);
    }, [commentPage]);

    useEffect(() => {
      if (!setHeaderActions) return;
      if (selectedPost != null) {
        setHeaderActions(null);
        return () => setHeaderActions(null);
      }
      if (currentSub != null) {
        const cycleSort = () => {
          const i = LIST_SORTS.indexOf(listSort);
          setListSort(LIST_SORTS[(i + 1) % LIST_SORTS.length]);
        };
        const label = listSort.charAt(0).toUpperCase() + listSort.slice(1);
        const node = (
          <button
            type="button"
            class="btn btn-active"
            onClick={cycleSort}
            aria-label={`Sort: ${label}. Click to cycle.`}
            title={`Sort: ${label} (tap to cycle)`}
          >
            {label}
          </button>
        );
        setHeaderActions(node);
        return () => setHeaderActions(null);
      }
      const node = (
        <button
          type="button"
          class="btn"
          onClick={() => setEditMode((e) => !e)}
          aria-label={editMode ? 'Done editing' : 'Edit subreddits'}
          title={editMode ? 'Done' : 'Edit'}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      );
      setHeaderActions(node);
      return () => setHeaderActions(null);
    }, [setHeaderActions, currentSub, selectedPost, listSort, editMode]);

    const openPost = useCallback(async (post: RedditPost['data']) => {
      setSelectedPost(post);
      setComments([]);
      try {
        const commentsUrl = REDDIT_JSON(post.permalink);
        const proxy = getCorsProxyUrl(settings.get().corsProxyUrl);
        const proxyCommentsUrl = proxy + encodeURIComponent(commentsUrl);
        const data = await network.fetchJson<RedditPostCommentsResponse>(proxyCommentsUrl);
        const list = data[1]?.data?.children ?? [];
        const flatten = (nodes: RedditCommentNode[], depth: number): RedditComment[] => {
          const out: RedditComment[] = [];
          for (const c of nodes) {
            const d = c.data;
            const body = d?.body;
            if (body != null && body !== '' && body !== '[deleted]' && body !== '[removed]')
              out.push({ data: { id: d?.id ?? '', body, author: d?.author ?? '[unknown]', score: d?.score ?? 0, created_utc: d?.created_utc ?? 0, depth } });
            const replies = d?.replies;
            if (replies && typeof replies === 'object' && replies.data?.children?.length)
              out.push(...flatten(replies.data.children, depth + 1));
          }
          return out;
        };
        setComments(flatten(list, 0));
      } catch {
        setComments([]);
      }
    }, [network]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE)), [posts.length]);
    const pagePosts = useMemo(
      () => posts.slice((listPage - 1) * POSTS_PER_PAGE, listPage * POSTS_PER_PAGE),
      [posts, listPage]
    );

    if (selectedPost) {
      const commentPages = Math.max(1, Math.ceil(comments.length / 5));
      const pageComments = comments.slice((commentPage - 1) * 5, commentPage * 5);
      const showMainThread = commentPage === 1;
      return (
        <div class="reddit-post-view">
          {showMainThread && (
            <>
              <p class="reddit-meta">u/{selectedPost.author} · {selectedPost.score} pts · {formatDateLegacy(new Date(selectedPost.created_utc * 1000))}</p>
              <div class="reddit-selftext">
                {stripHtml(selectedPost.selftext_html || selectedPost.selftext || '') || (selectedPost.is_self ? '' : `Link: ${selectedPost.url}`)}
              </div>
              <h2>Comments</h2>
            </>
          )}
          {!showMainThread && <h2 class="reddit-more-comments">More comments</h2>}
          {comments.length === 0 ? (
            <p class="reddit-meta">No comments yet.</p>
          ) : (
            <>
              <ul class="reddit-comments">
                {pageComments.map((c) => (
                  <li key={c.data.id} class="reddit-comment" style={{ marginLeft: `${c.data.depth * 12}px` }}>
                    <strong>u/{c.data.author}</strong> · {c.data.score} pts
                    <p>{stripHtml(c.data.body)}</p>
                  </li>
                ))}
              </ul>
                  {commentPages > 1 && (
                <PageNav current={commentPage} total={commentPages} onPrev={() => { setCommentPage((p) => Math.max(1, p - 1)); scrollAppContentToTop(); }} onNext={() => { setCommentPage((p) => Math.min(commentPages, p + 1)); scrollAppContentToTop(); }} />
              )}
            </>
          )}
        </div>
      );
    }

    const openSubreddit = (name: string) => {
      const trimmed = name.trim().toLowerCase().replace(/^r\//, '');
      if (trimmed) setCurrentSub(trimmed);
    };

    if (!currentSub) {
      return (
        <div class="reddit-app">
          <div class="reddit-search">
            <input
              type="text"
              class="input"
              placeholder="Subreddit name (e.g. programming)"
              value={searchInput}
              onInput={(e) => setSearchInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openSubreddit(searchInput);
              }}
            />
            <button type="button" class="btn" onClick={() => openSubreddit(searchInput)}>
              Open
            </button>
            <button type="button" class="btn" onClick={() => addSub(searchInput)}>
              Add
            </button>
          </div>
          <p class="reddit-search-hint">Or pick one below:</p>
          <ul class="list reddit-sub-list">
            {subs.map((sub) => (
              <li key={sub} class="reddit-sub-item">
                <button type="button" onClick={() => setCurrentSub(sub)}>r/{sub}</button>
                {editMode && (
                  <button
                    type="button"
                    class="btn btn-small reddit-sub-delete"
                    onClick={() => removeSub(sub)}
                    aria-label={`Remove r/${sub}`}
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (loading) return <p>Loading…</p>;
    if (error) return <p class="browser-error">{error}</p>;

    return (
      <div class="reddit-app">
        <ul class="list">
          {pagePosts.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => openPost(p)}>
                <strong>{p.title}</strong>
                <br />
                <small>u/{p.author} · {p.score} pts · {p.num_comments} comments</small>
              </button>
            </li>
          ))}
        </ul>
        <PageNav current={listPage} total={totalPages} onPrev={() => { setListPage((p) => Math.max(1, p - 1)); scrollAppContentToTop(); }} onNext={() => { setListPage((p) => Math.min(totalPages, p + 1)); scrollAppContentToTop(); }} />
      </div>
    );
  }

  return {
    render: () => <RedditUI />,
    getTitle: () => '', // Keep header uncluttered; subreddit and post title not shown in app bar
    canGoBack: () => backRef.current != null && (backRef.current.selectedPost != null || backRef.current.currentSub != null),
    goBack: () => {
      const c = backRef.current;
      if (!c) return;
      if (c.selectedPost != null) c.setSelectedPost(null);
      else if (c.currentSub != null) c.setCurrentSub(null);
    },
  };
}

export const redditApp = {
  id: 'reddit',
  name: 'Reddit',
  icon: '🔶',
  category: 'reader' as const,
  apiVersion: PLUGIN_API_VERSION,
  metadata: { requiresNetwork: true },
  launch: RedditApp,
};
