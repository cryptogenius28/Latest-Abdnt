import React, { useEffect, useState } from 'react';
import { Star, MessageCircle, Sparkles, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const StarRow = ({ value, size = 'w-4 h-4', onChange }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => {
      const filled = n <= value;
      const StarEl = (
        <Star
          className={`${size} ${filled ? 'fill-brand text-brand' : 'fill-ink-200 text-ink-200'} ${onChange ? 'cursor-pointer hover:fill-brand/70 hover:text-brand/70' : ''}`}
          strokeWidth={0}
        />
      );
      if (onChange) {
        return (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`Rate ${n} star${n>1?'s':''}`} data-testid={`review-star-${n}`}>
            {StarEl}
          </button>
        );
      }
      return <React.Fragment key={n}>{StarEl}</React.Fragment>;
    })}
  </div>
);

const ReviewItem = ({ review }) => {
  const initials = (review.user_name || 'C').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const date = new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <div data-testid="review-item" className="py-5 border-b border-ink-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-brand/10 text-brand inline-flex items-center justify-center text-xs font-bold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-ink-900">{review.user_name}</p>
              <p className="text-[11px] text-ink-500">{date}</p>
            </div>
            <StarRow value={review.rating} />
          </div>
          <h4 className="mt-2 text-sm font-bold text-ink-900">{review.title}</h4>
          <p className="mt-1 text-sm text-ink-700 leading-relaxed">{review.body}</p>
        </div>
      </div>
    </div>
  );
};

export const ReviewSection = ({ productId, onReviewsChanged }) => {
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], total: 0, avg_rating: 0, distribution: { '1':0,'2':0,'3':0,'4':0,'5':0 } });
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => {
    api.get(`/products/${productId}/reviews`, { params: { page_size: 20 } })
      .then((r) => setData(r.data || { items: [], total: 0, avg_rating: 0, distribution: {} }))
      .catch(() => {});
  };

  useEffect(() => { if (productId) load(); }, [productId]);

  // Fetch AI review summary once we know there are >= 10 reviews
  useEffect(() => {
    if (!productId) return;
    if (!data.total || data.total < 10) { setAiSummary(null); return; }
    setAiLoading(true);
    api.get(`/ai/review-summary/${productId}`)
      .then((r) => setAiSummary(r.data?.summary || null))
      .catch(() => setAiSummary(null))
      .finally(() => setAiLoading(false));
  }, [productId, data.total]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error('Please add a title and review body');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating: form.rating, title: form.title.trim(), body: form.body.trim(),
      });
      toast.success('Review posted, thank you!');
      setShowForm(false);
      setForm({ rating: 5, title: '', body: '' });
      load();
      if (onReviewsChanged) onReviewsChanged();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not post review');
    } finally {
      setSubmitting(false);
    }
  };

  const total = data.total || 0;
  const dist = data.distribution || {};

  return (
    <section data-testid="review-section" className="mt-12 border-t border-ink-200 pt-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Summary */}
        <div>
          <h2 className="font-heading text-2xl font-bold text-ink-900">Customer reviews</h2>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-heading text-4xl font-bold text-ink-900">{(data.avg_rating || 0).toFixed(1)}</span>
            <span className="text-sm text-ink-500">/ 5</span>
          </div>
          <StarRow value={Math.round(data.avg_rating || 0)} size="w-5 h-5" />
          <p className="text-sm text-ink-500 mt-1.5">Based on {total} review{total !== 1 ? 's' : ''}</p>
          {user ? (
            <button
              data-testid="review-write-button"
              onClick={() => setShowForm((v) => !v)}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold rounded-md transition-colors"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.75} /> {showForm ? 'Cancel' : 'Write a review'}
            </button>
          ) : (
            <div className="mt-4 p-3 bg-ink-50 border border-ink-200 rounded-md text-xs text-ink-600">
              <Link to="/login" className="text-brand font-semibold">Sign in</Link> to write a review.
            </div>
          )}
        </div>

        {/* Distribution */}
        <div className="lg:col-span-2 space-y-1.5">
          {[5,4,3,2,1].map((n) => {
            const count = dist[String(n)] || 0;
            const pct = total ? (count / total) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-3 text-sm">
                <span className="w-10 text-ink-700 font-medium tabular-nums">{n} star</span>
                <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 text-right text-ink-500 tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && user && (
        <form onSubmit={submit} data-testid="review-form" className="bg-white border border-ink-200 rounded-xl p-6 mb-8">
          <h3 className="font-heading text-lg font-bold text-ink-900 mb-4">Share your experience</h3>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-700 mb-2">Your rating</label>
            <StarRow value={form.rating} size="w-6 h-6" onChange={(n) => setForm((f) => ({ ...f, rating: n }))} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-700 mb-1">Title</label>
            <input
              data-testid="review-title-input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={120}
              className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              placeholder="Summarize your experience in a few words"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink-700 mb-1">Review</label>
            <textarea
              data-testid="review-body-input"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              maxLength={2000}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-y"
              placeholder="What did you like or dislike? Quality? Value? Would you recommend it?"
              required
            />
          </div>
          <button
            data-testid="review-submit-button"
            type="submit"
            disabled={submitting}
            className="h-11 px-6 bg-brand hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold rounded-md transition-colors"
          >
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </form>
      )}

      {(aiSummary || aiLoading) && (
        <div data-testid="review-ai-summary" className="mb-8 p-4 sm:p-5 rounded-xl border border-brand/30 bg-gradient-to-br from-brand/5 to-white">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-brand/10 text-brand inline-flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-1">AI review summary</p>
              {aiLoading ? (
                <p className="text-sm text-ink-500 inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating summary…</p>
              ) : (
                <p className="text-sm text-ink-700 leading-relaxed">{aiSummary}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {data.items.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-ink-300 rounded-xl">
          <Star className="w-10 h-10 text-ink-300 mx-auto" strokeWidth={1.25} />
          <p className="mt-3 text-sm font-semibold text-ink-900">No reviews yet</p>
          <p className="text-xs text-ink-500 mt-1">Be the first to share your thoughts.</p>
        </div>
      ) : (
        <div className="divide-y divide-ink-100">
          {data.items.map((r) => <ReviewItem key={r.id} review={r} />)}
        </div>
      )}
    </section>
  );
};
