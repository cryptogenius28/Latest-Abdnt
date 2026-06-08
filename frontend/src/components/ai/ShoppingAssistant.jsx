import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Sparkles, X, Send, Loader2, BookmarkPlus, Check } from 'lucide-react';
import { api, formatPrice } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const STORAGE_KEY = 'am_ai_chat_v1';
const PRODUCT_TAG_RE = /\[PRODUCT:([a-f0-9]{6,40})\]/g;

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm your shopping assistant. Tell me what you're looking for — a gift, a category, a price range — and I'll find some good options for you.",
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [WELCOME];
};

const renderInline = (text) => {
  // Lightweight bold + line break formatting.
  // Split by markdown bold tokens
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

const MiniProductCard = ({ product, onLink }) => {
  if (!product) return null;
  const onSale = !!product.sale_price && product.sale_price < product.price;
  const finalPrice = onSale ? product.sale_price : product.price;
  return (
    <Link
      to={`/product/${product.id}`}
      onClick={onLink}
      data-testid="ai-assistant-product-card"
      className="mt-2 flex gap-3 p-2.5 bg-white border border-ink-200 rounded-lg hover:border-brand transition-colors"
    >
      <div className="w-14 h-14 flex-shrink-0 bg-ink-50 rounded-md overflow-hidden">
        {product.images?.[0] && (
          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-ink-900 line-clamp-2">{product.title}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={`text-sm font-bold ${onSale ? 'text-red-600' : 'text-ink-900'}`}>{formatPrice(finalPrice)}</span>
          {onSale && <span className="text-[10px] text-ink-400 line-through">{formatPrice(product.price)}</span>}
        </div>
      </div>
    </Link>
  );
};

const MessageBubble = ({ msg, productMap, onLink }) => {
  const isUser = msg.role === 'user';
  if (isUser) {
    return (
      <div className="flex justify-end" data-testid="ai-assistant-msg-user">
        <div className="max-w-[80%] bg-brand text-white text-sm rounded-2xl rounded-br-sm px-3.5 py-2 leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }
  // Assistant: split content around [PRODUCT:id] tags
  const segments = [];
  let lastIndex = 0;
  const ids = [];
  // Use a fresh, local regex iterator to avoid mutating the module-level one.
  const localRe = new RegExp(PRODUCT_TAG_RE.source, 'g');
  let match = localRe.exec(msg.content);
  while (match !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', value: msg.content.slice(lastIndex, match.index) });
    segments.push({ type: 'product', value: match[1] });
    ids.push(match[1]);
    lastIndex = localRe.lastIndex;
    match = localRe.exec(msg.content);
  }
  if (lastIndex < msg.content.length) segments.push({ type: 'text', value: msg.content.slice(lastIndex) });

  return (
    <div className="flex" data-testid="ai-assistant-msg-assistant">
      <div className="max-w-[88%] bg-ink-100 text-ink-900 text-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <span key={i}>{renderInline(seg.value)}</span>;
          const product = productMap[seg.value];
          return <MiniProductCard key={i} product={product} onLink={onLink} />;
        })}
      </div>
    </div>
  );
};

const TypingDots = () => (
  <div className="flex gap-1.5 items-center px-3.5 py-3 bg-ink-100 rounded-2xl rounded-bl-sm w-fit" data-testid="ai-assistant-typing">
    <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
    <span className="w-1.5 h-1.5 bg-ink-400 rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
  </div>
);

export const ShoppingAssistant = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(loadHistory);
  const [productMap, setProductMap] = useState({});
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch { /* noop */ }
  }, [messages]);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(id);
    }
  }, [open, messages.length, sending]);

  // Continue a saved conversation triggered from /account/chats
  useEffect(() => {
    const handler = (e) => {
      const incoming = e?.detail?.messages;
      if (!Array.isArray(incoming) || !incoming.length) return;
      const normalized = incoming.filter((m) => m && (m.role === 'user' || m.role === 'assistant'));
      if (!normalized.length) return;
      setMessages([WELCOME, ...normalized]);
      setSavedId(null);
      setProductMap({});
      setOpen(true);
    };
    window.addEventListener('am:ai-continue-chat', handler);
    return () => window.removeEventListener('am:ai-continue-chat', handler);
  }, []);

  // PWA "Ask AI" shortcut: when the app is launched from the home-screen shortcut
  // (manifest.json) it lands on /?ai=1 — auto-open the assistant.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('ai') === '1') {
        setOpen(true);
        // Clean the query param so refreshes don't keep re-opening it.
        params.delete('ai');
        const qs = params.toString();
        const next = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
        window.history.replaceState(null, '', next);
      }
    } catch { /* noop */ }
  }, []);

  const send = async (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const newMsgs = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setSending(true);
    try {
      const history = newMsgs.slice(0, -1).filter((m) => m.role === 'user' || m.role === 'assistant');
      const { data } = await api.post('/ai/chat', { message: text, history });
      const reply = data?.reply || "Sorry, I didn't catch that — could you rephrase?";
      const products = Array.isArray(data?.products) ? data.products : [];
      const nextMap = { ...productMap };
      products.forEach((p) => { if (p?.id) nextMap[p.id] = p; });
      setProductMap(nextMap);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([WELCOME]);
    setProductMap({});
    setSavedId(null);
  };

  const saveChat = async () => {
    if (!user) {
      toast.error('Sign in to save chats', { description: 'Your conversation will be tied to your account.' });
      return;
    }
    // Need at least one user message + one assistant reply
    const hasUser = messages.some((m) => m.role === 'user');
    if (!hasUser) {
      toast.error('Send at least one message before saving');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/ai/conversations', {
        messages: messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
      });
      setSavedId(data?.id || 'saved');
      toast.success('Chat saved', {
        description: 'Find it under My Account → Saved AI Chats.',
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save chat');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          data-testid="ai-assistant-toggle"
          onClick={() => setOpen(true)}
          aria-label="Open shopping assistant"
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 inline-flex items-center gap-2 h-12 lg:h-14 pl-3 pr-4 lg:pr-5 bg-ink-900 text-white rounded-full shadow-xl hover:bg-brand hover:scale-105 active:scale-95 transition-all duration-300 group"
        >
          <span className="relative inline-flex items-center justify-center w-7 h-7 bg-brand rounded-full">
            <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            <span className="absolute inset-0 rounded-full bg-brand opacity-50 animate-ping" />
          </span>
          <span className="text-sm font-semibold hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          data-testid="ai-assistant-panel"
          className="fixed inset-0 lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[380px] lg:h-[560px] lg:max-h-[80vh] z-50 bg-white shadow-2xl flex flex-col lg:rounded-2xl overflow-hidden border border-ink-200 animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-200 bg-gradient-to-r from-ink-900 to-ink-800 text-white">
            <div className="w-8 h-8 rounded-full bg-brand inline-flex items-center justify-center">
              <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">Shopping Assistant</p>
              <p className="text-[10px] text-ink-400 leading-tight">Powered by AI · Always learning</p>
            </div>
            <button
              type="button"
              onClick={saveChat}
              disabled={saving || !!savedId}
              aria-label={savedId ? 'Chat saved' : 'Save chat'}
              data-testid="ai-assistant-save"
              title={user ? (savedId ? 'Saved to your account' : 'Save chat to your account') : 'Sign in to save chats'}
              className="inline-flex items-center gap-1 text-[10px] text-ink-300 hover:text-white uppercase tracking-widest font-semibold px-2 py-1 rounded transition-colors disabled:opacity-60 disabled:cursor-default"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : savedId ? (
                <><Check className="w-3 h-3 text-brand" /> Saved</>
              ) : (
                <><BookmarkPlus className="w-3 h-3" /> Save</>
              )}
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Reset chat"
              data-testid="ai-assistant-reset"
              className="text-[10px] text-ink-300 hover:text-white uppercase tracking-widest font-semibold px-2 py-1 rounded transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              data-testid="ai-assistant-close"
              className="p-1.5 -mr-1 text-ink-200 hover:bg-white/10 rounded-md transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollerRef}
            data-testid="ai-assistant-messages"
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-white to-ink-50"
          >
            {messages.map((m, i) => (
              <MessageBubble key={i} msg={m} productMap={productMap} onLink={() => setOpen(false)} />
            ))}
            {sending && <TypingDots />}
          </div>

          {/* Input */}
          <form onSubmit={send} className="px-3 py-3 border-t border-ink-200 bg-white flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <input
              data-testid="ai-assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything…"
              maxLength={400}
              disabled={sending}
              className="flex-1 h-11 px-3.5 text-sm bg-ink-50 border border-ink-200 rounded-full focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              data-testid="ai-assistant-send"
              aria-label="Send"
              className="w-11 h-11 inline-flex items-center justify-center bg-brand hover:bg-brand-600 text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <Send className="w-4 h-4" strokeWidth={1.75} />}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ShoppingAssistant;
