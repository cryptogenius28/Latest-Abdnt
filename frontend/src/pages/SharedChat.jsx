import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, MessageSquare, ArrowRight, Calendar, Loader2, QrCode } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const PRODUCT_TAG_RE = /\[PRODUCT:([a-f0-9]{6,40})\]/g;
const stripProductTags = (text) => text.replace(PRODUCT_TAG_RE, '').replace(/\s{2,}/g, ' ').trim();

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
};

const SharedChat = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrSrc = useMemo(() => (
    pageUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(pageUrl)}` : ''
  ), [pageUrl]);

  useEffect(() => {
    document.title = 'Shared AI Chat | Abundant Merchandise';
    setLoading(true);
    // Use axios directly here so we never accidentally attach the user's Bearer.
    axios.get(`${BACKEND_URL}/api/ai/share/${token}`)
      .then((r) => setData(r.data))
      .catch((err) => {
        const code = err?.response?.status;
        setError(code === 404 ? "We couldn't find this conversation. The link may be invalid or expired." : 'Could not load this conversation.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div data-testid="shared-chat-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <Link to="/" className="inline-flex items-center gap-2 mb-6 text-sm font-semibold text-ink-700 hover:text-brand">
        <span className="text-brand font-bold tracking-tight">Abundant</span>
        <span className="text-ink-400">·</span>
        <span>Browse the store</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-brand/10 text-brand inline-flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Shared shopping chat</p>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink-900">
            {loading ? 'Loading…' : data?.title || 'Untitled chat'}
          </h1>
          {data?.created_at && (
            <p className="text-xs text-ink-500 mt-1 inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Saved {formatDate(data.created_at)}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-ink-500 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading conversation…
        </div>
      ) : error ? (
        <div data-testid="shared-chat-error" className="text-center py-16 border border-dashed border-ink-200 rounded-xl bg-ink-50">
          <MessageSquare className="w-10 h-10 text-ink-300 mx-auto" strokeWidth={1.5} />
          <p className="mt-4 font-semibold text-ink-900">{error}</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-brand hover:bg-brand-600 rounded-md"
          >
            Browse the store
          </Link>
        </div>
      ) : (
        <div data-testid="shared-chat-thread" className="border border-ink-200 rounded-xl bg-white p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-ink-100">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-500">Conversation</p>
            <button
              type="button"
              data-testid="shared-chat-qr-toggle"
              onClick={() => setQrOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-[11px] font-semibold text-ink-700 bg-white border border-ink-200 hover:border-brand hover:text-brand rounded-md transition-colors"
              aria-expanded={qrOpen}
            >
              <QrCode className="w-3.5 h-3.5" strokeWidth={1.75} /> {qrOpen ? 'Hide QR' : 'Scan QR'}
            </button>
          </div>
          {qrOpen && (
            <div data-testid="shared-chat-qr" className="mb-4 flex flex-col sm:flex-row items-center gap-4 p-4 bg-ink-50 border border-ink-200 rounded-xl">
              {qrFailed ? (
                <div className="w-[120px] h-[120px] inline-flex items-center justify-center bg-white rounded-md border border-ink-200 text-ink-300">
                  <QrCode className="w-10 h-10" strokeWidth={1.25} />
                </div>
              ) : (
                <img
                  src={qrSrc}
                  alt="Scan to open this shared chat"
                  width={120}
                  height={120}
                  onError={() => setQrFailed(true)}
                  className="w-[120px] h-[120px] bg-white rounded-md border border-ink-200"
                />
              )}
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold text-ink-900">
                  {qrFailed ? 'QR temporarily unavailable' : 'Scan with any phone camera'}
                </p>
                <p className="text-xs text-ink-500 mt-1 break-all">{pageUrl}</p>
                <p className="text-[11px] text-ink-400 mt-2">
                  {qrFailed
                    ? 'Copy the link above to share.'
                    : 'Hand this to a friend at the table — they\u2019ll open the exact same chat instantly.'}
                </p>
              </div>
            </div>
          )}
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {(data?.messages || []).map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                <div className={`max-w-[85%] text-sm rounded-2xl px-3.5 py-2 leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-brand text-white rounded-br-sm' : 'bg-ink-100 text-ink-900 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant' ? stripProductTags(m.content) : m.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 p-5 bg-brand/5 border border-brand/20 rounded-xl text-center">
        <p className="font-heading font-bold text-ink-900">Like what you see?</p>
        <p className="text-sm text-ink-500 mt-1">Start your own chat with our shopping assistant.</p>
        <Link
          to="/"
          className="mt-3 inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-brand hover:bg-brand-600 rounded-md"
        >
          Open Abundant Merchandise
        </Link>
      </div>
    </div>
  );
};

export default SharedChat;
