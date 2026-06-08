import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Trash2, Sparkles, Calendar, Loader2, Mail, Share2, Play, Check, Pin, PinOff, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const PRODUCT_TAG_RE = /\[PRODUCT:([a-f0-9]{6,40})\]/g;
const stripProductTags = (text) => text.replace(PRODUCT_TAG_RE, '').replace(/\s{2,}/g, ' ').trim();

const SavedChats = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [query, setQuery] = useState('');
  const [pinningId, setPinningId] = useState(null);

  useEffect(() => {
    document.title = 'Saved AI Chats | Abundant Merchandise';
    load();
  }, []);

  const filteredChats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [chats, query]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ai/conversations');
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Could not load saved chats');
    } finally {
      setLoading(false);
    }
  };

  const openChat = async (chat) => {
    setBusy(true);
    try {
      const { data } = await api.get(`/ai/conversations/${chat.id}`);
      setActive(data);
    } catch {
      toast.error('Could not load chat');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (chat, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete "${chat.title}"?`)) return;
    try {
      await api.delete(`/ai/conversations/${chat.id}`);
      setChats((prev) => prev.filter((c) => c.id !== chat.id));
      if (active?.id === chat.id) setActive(null);
      toast.success('Chat deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const togglePin = async (chat, e) => {
    if (e) e.stopPropagation();
    const next = !chat.pinned;
    setPinningId(chat.id);
    try {
      const { data } = await api.patch(`/ai/conversations/${chat.id}`, { pinned: next });
      setChats((prev) => {
        const updated = prev.map((c) => (c.id === chat.id ? { ...c, pinned: !!data?.pinned } : c));
        // Re-sort: pinned first, then by updated_at desc
        return updated.slice().sort((a, b) => {
          if (!!b.pinned - !!a.pinned !== 0) return (!!b.pinned) - (!!a.pinned);
          return (b.updated_at || '').localeCompare(a.updated_at || '');
        });
      });
      if (active?.id === chat.id) setActive((a) => (a ? { ...a, pinned: !!data?.pinned } : a));
      toast.success(next ? 'Pinned to top' : 'Unpinned');
    } catch {
      toast.error('Could not update pin');
    } finally {
      setPinningId(null);
    }
  };

  const continueChat = () => {
    if (!active) return;
    // Hand off the messages to the floating ShoppingAssistant via a window event.
    window.dispatchEvent(new CustomEvent('am:ai-continue-chat', {
      detail: { messages: active.messages, title: active.title },
    }));
    toast.success('Continuing this chat', { description: 'Pick up where you left off in the assistant.' });
    // Send the user back to the homepage so the widget overlays a relevant context.
    setTimeout(() => navigate('/'), 200);
  };

  const emailChat = () => {
    if (!active) return;
    const stripped = active.messages.map((m) => {
      const role = m.role === 'user' ? 'You' : 'Assistant';
      return `${role}: ${stripProductTags(m.content)}`;
    }).join('\n\n');
    const subject = encodeURIComponent(`Shopping ideas: ${active.title}`);
    const body = encodeURIComponent(
      `Hi,\n\nHere's a shopping conversation I had with the Abundant Merchandise assistant:\n\n` +
      `— ${active.title} —\n\n${stripped}\n\n` +
      `Browse the store at ${window.location.origin}\n`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareChat = async () => {
    if (!active) return;
    setSharing(true);
    try {
      const { data } = await api.post(`/ai/conversations/${active.id}/share`);
      // Always build the shareable URL from the current site origin so users
      // get a link that matches the host they bookmarked (avoids backend-side
      // env mismatches between preview hostnames).
      const fullUrl = `${window.location.origin}/share/chat/${data.token}`;
      // Try clipboard
      let copied = false;
      try {
        await navigator.clipboard.writeText(fullUrl);
        copied = true;
      } catch {
        // Fallback: legacy execCommand copy via hidden textarea
        try {
          const ta = document.createElement('textarea');
          ta.value = fullUrl;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.top = '-1000px';
          document.body.appendChild(ta);
          ta.select();
          copied = document.execCommand && document.execCommand('copy');
          document.body.removeChild(ta);
        } catch { copied = false; }
      }
      if (copied) {
        setShareCopied(true);
        toast.success('Share link copied', { description: fullUrl });
        setTimeout(() => setShareCopied(false), 2500);
      } else {
        // Final fallback: show the URL so the user can copy manually
        toast.info('Copy this share link', { description: fullUrl, duration: 8000 });
        window.prompt('Copy this share link:', fullUrl);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not create share link');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div data-testid="saved-chats-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link to="/account" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand">
        <ArrowLeft className="w-4 h-4" /> Back to account
      </Link>

      <div className="mt-4 mb-8 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-brand/10 text-brand inline-flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">My account</p>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink-900">Saved AI conversations</h1>
          <p className="text-sm text-ink-500 mt-1">Pick up where you left off, or revisit past product recommendations.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : chats.length === 0 ? (
        <div data-testid="saved-chats-empty" className="text-center py-16 border border-dashed border-ink-200 rounded-xl bg-ink-50">
          <MessageSquare className="w-10 h-10 text-ink-300 mx-auto" strokeWidth={1.5} />
          <p className="mt-4 font-semibold text-ink-900">No saved chats yet</p>
          <p className="text-sm text-ink-500 mt-1">Open the Ask AI assistant from any page and click <strong>Save chat</strong> to keep it for later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" strokeWidth={1.75} />
              <input
                data-testid="saved-chats-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved chats…"
                className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>
            <ul data-testid="saved-chats-list" className="space-y-2">
            {filteredChats.length === 0 ? (
              <li data-testid="saved-chats-no-results" className="text-center py-10 text-xs text-ink-500 border border-dashed border-ink-200 rounded-xl bg-ink-50">
                No chats match &ldquo;{query}&rdquo;.
              </li>
            ) : filteredChats.map((c) => {
              const isActive = active?.id === c.id;
              const isPinning = pinningId === c.id;
              return (
                <li key={c.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    data-testid="saved-chat-item"
                    onClick={() => openChat(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChat(c); }
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40 ${isActive ? 'border-brand bg-brand/5' : c.pinned ? 'border-brand/40 bg-brand/[0.03]' : 'border-ink-200 bg-white hover:border-brand/40'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {c.pinned && (
                          <span data-testid="saved-chat-pinned-badge" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand mb-1">
                            <Pin className="w-3 h-3" strokeWidth={2} /> Pinned
                          </span>
                        )}
                        <p className="text-sm font-semibold text-ink-900 line-clamp-2">{c.title}</p>
                      </div>
                      <div className="flex items-center gap-0.5 -mt-1 -mr-1">
                        <button
                          type="button"
                          onClick={(e) => togglePin(c, e)}
                          disabled={isPinning}
                          data-testid="saved-chat-pin"
                          aria-label={c.pinned ? 'Unpin chat' : 'Pin chat to top'}
                          title={c.pinned ? 'Unpin' : 'Pin to top'}
                          className={`p-1 rounded transition-colors disabled:opacity-50 ${c.pinned ? 'text-brand hover:bg-brand/10' : 'text-ink-400 hover:text-brand'}`}
                        >
                          {isPinning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : c.pinned ? (
                            <PinOff className="w-3.5 h-3.5" strokeWidth={1.75} />
                          ) : (
                            <Pin className="w-3.5 h-3.5" strokeWidth={1.75} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => remove(c, e)}
                          data-testid="saved-chat-delete"
                          aria-label="Delete chat"
                          className="text-ink-400 hover:text-red-500 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-500">
                      <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(c.updated_at)}</span>
                      <span>·</span>
                      <span>{c.message_count} message{c.message_count === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </li>
              );
            })}
            </ul>
          </div>
          <div className="md:col-span-7">
            {busy ? (
              <div className="py-20 text-center text-ink-500 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : active ? (
              <div data-testid="saved-chat-detail" className="border border-ink-200 rounded-xl bg-white p-5">
                <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-ink-100">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand">Conversation</p>
                    <h2 className="font-heading font-bold text-ink-900 text-base md:text-lg line-clamp-2">{active.title}</h2>
                    <p className="text-xs text-ink-500 mt-1">Saved {formatDate(active.created_at)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button
                    type="button"
                    data-testid="saved-chat-continue"
                    onClick={continueChat}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-white bg-brand hover:bg-brand-600 rounded-md transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" strokeWidth={2} /> Continue this chat
                  </button>
                  <button
                    type="button"
                    data-testid="saved-chat-email"
                    onClick={emailChat}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-ink-700 bg-white border border-ink-300 hover:border-brand hover:text-brand rounded-md transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" strokeWidth={1.75} /> Email
                  </button>
                  <button
                    type="button"
                    data-testid="saved-chat-share"
                    onClick={shareChat}
                    disabled={sharing}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-ink-700 bg-white border border-ink-300 hover:border-brand hover:text-brand disabled:opacity-60 rounded-md transition-colors"
                  >
                    {sharing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : shareCopied ? (
                      <Check className="w-3.5 h-3.5 text-brand" strokeWidth={2} />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    )}
                    {shareCopied ? 'Link copied!' : 'Share'}
                  </button>
                </div>

                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {active.messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                      <div className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2 leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-brand text-white rounded-br-sm' : 'bg-ink-100 text-ink-900 rounded-bl-sm'}`}>
                        {m.role === 'assistant' ? stripProductTags(m.content) : m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-ink-200 rounded-xl bg-ink-50 p-10 text-center">
                <MessageSquare className="w-8 h-8 text-ink-300 mx-auto" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-ink-500">Pick a chat from the list to read it.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedChats;
