import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => { document.title = 'Contact Us | Abundant Merchandise'; }, []);

  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      setForm({ name: '', email: '', subject: '', message: '' });
      toast.success('Message sent! We’ll get back to you within 24 hours.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="contact-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Get in touch</p>
        <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-ink-900">We&apos;re here to help</h1>
        <p className="mt-3 text-ink-600 max-w-2xl mx-auto">
          Questions about an order, returns, bulk pricing, or partnerships? Our customer team usually replies within an hour during business hours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <form onSubmit={submit} className="lg:col-span-2 bg-white border border-ink-200 rounded-xl p-6 md:p-8">
          <h2 className="font-heading text-xl font-bold text-ink-900 mb-1">Send us a message</h2>
          <p className="text-sm text-ink-500 mb-6">We typically reply within 1 business hour.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Name *</label>
              <input data-testid="contact-name" value={form.name} onChange={change('name')} required className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1">Email *</label>
              <input data-testid="contact-email" type="email" value={form.email} onChange={change('email')} required className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-ink-700 mb-1">Subject</label>
            <input data-testid="contact-subject" value={form.subject} onChange={change('subject')} className="w-full h-11 px-3 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-ink-700 mb-1">Message *</label>
            <textarea data-testid="contact-message" value={form.message} onChange={change('message')} required rows={5} className="w-full px-3 py-2 text-sm bg-white border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-y" />
          </div>
          <button
            data-testid="contact-submit"
            disabled={submitting}
            type="submit"
            className="mt-5 inline-flex items-center gap-2 h-11 px-6 bg-brand hover:bg-brand-600 disabled:bg-ink-300 text-white font-semibold rounded-md text-sm transition-colors"
          >
            <Send className="w-4 h-4" strokeWidth={1.75} /> {submitting ? 'Sending…' : 'Send message'}
          </button>
        </form>

        {/* Contact info + map */}
        <aside className="space-y-4">
          {[
            { icon: Mail, label: 'Email', value: 'support@abundantmerch.com', sub: 'Replies within 1 hour' },
            { icon: Phone, label: 'Phone', value: '+1 (800) 555-0142', sub: 'Mon–Fri · 9am–6pm EST' },
            { icon: MapPin, label: 'Headquarters', value: '420 Warehouse Way', sub: 'New York, NY 10001' },
            { icon: MessageCircle, label: 'Live chat', value: 'Bottom-right corner', sub: 'Avg. response: 2 min' },
          ].map((c) => (
            <div key={c.label} className="p-5 bg-white border border-ink-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-brand/10 inline-flex items-center justify-center flex-shrink-0">
                  <c.icon className="w-5 h-5 text-brand" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-500">{c.label}</p>
                  <p className="text-sm font-semibold text-ink-900 mt-0.5">{c.value}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{c.sub}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Map placeholder */}
          <div className="relative h-48 rounded-xl overflow-hidden border border-ink-200 bg-gradient-to-br from-ink-100 to-ink-200">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-8 h-8 text-brand mx-auto" strokeWidth={1.5} />
                <p className="mt-2 text-sm font-bold text-ink-900">New York, NY</p>
                <p className="text-xs text-ink-500">420 Warehouse Way · 10001</p>
              </div>
            </div>
            {/* faux grid */}
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%), linear-gradient(90deg, transparent 24%, rgba(0,0,0,.05) 25%, rgba(0,0,0,.05) 26%, transparent 27%, transparent 74%, rgba(0,0,0,.05) 75%, rgba(0,0,0,.05) 76%, transparent 77%)', backgroundSize: '40px 40px' }} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Contact;
