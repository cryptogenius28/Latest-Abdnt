import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Pencil, Trash2, Check, ArrowLeft, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const emptyForm = {
  label: 'Home', first_name: '', last_name: '', address1: '', address2: '',
  city: '', state: '', zip: '', country: 'United States', phone: '', is_default: false,
};

const AddressForm = ({ initial, onCancel, onSaved }) => {
  const [form, setForm] = useState({ ...emptyForm, ...(initial || {}) });
  const [saving, setSaving] = useState(false);
  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?.id) {
        const { data } = await api.put(`/account/addresses/${initial.id}`, form);
        onSaved(data, 'updated');
      } else {
        const { data } = await api.post('/account/addresses', form);
        onSaved(data, 'added');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} data-testid="address-form" className="bg-white border border-ink-200 rounded-xl p-6 mb-6">
      <h3 className="font-heading text-lg font-bold text-ink-900 mb-4">{initial?.id ? 'Edit address' : 'Add new address'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-ink-700 mb-1">Label</label>
          <input data-testid="address-label" value={form.label} onChange={change('label')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
        </div>
        <div><label className="block text-xs font-semibold text-ink-700 mb-1">First name</label>
          <input data-testid="address-first-name" required value={form.first_name} onChange={change('first_name')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <div><label className="block text-xs font-semibold text-ink-700 mb-1">Last name</label>
          <input data-testid="address-last-name" required value={form.last_name} onChange={change('last_name')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <div className="md:col-span-2"><label className="block text-xs font-semibold text-ink-700 mb-1">Address line 1</label>
          <input data-testid="address-address1" required value={form.address1} onChange={change('address1')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <div className="md:col-span-2"><label className="block text-xs font-semibold text-ink-700 mb-1">Address line 2 (optional)</label>
          <input data-testid="address-address2" value={form.address2} onChange={change('address2')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <div><label className="block text-xs font-semibold text-ink-700 mb-1">City</label>
          <input data-testid="address-city" required value={form.city} onChange={change('city')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <div><label className="block text-xs font-semibold text-ink-700 mb-1">State</label>
          <input data-testid="address-state" required value={form.state} onChange={change('state')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <div><label className="block text-xs font-semibold text-ink-700 mb-1">ZIP</label>
          <input data-testid="address-zip" required value={form.zip} onChange={change('zip')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
        <div><label className="block text-xs font-semibold text-ink-700 mb-1">Phone (optional)</label>
          <input data-testid="address-phone" value={form.phone} onChange={change('phone')} className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" /></div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-ink-700">
        <input data-testid="address-default-toggle" type="checkbox" checked={!!form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} className="accent-brand h-4 w-4" />
        Set as default shipping address
      </label>
      <div className="mt-5 flex gap-2">
        <button data-testid="address-save" type="submit" disabled={saving} className="h-11 px-5 bg-brand hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold rounded-md transition-colors">
          {saving ? 'Saving…' : (initial?.id ? 'Update address' : 'Save address')}
        </button>
        <button data-testid="address-cancel" type="button" onClick={onCancel} className="h-11 px-5 border border-ink-300 text-ink-900 text-sm font-semibold rounded-md hover:border-brand">
          Cancel
        </button>
      </div>
    </form>
  );
};

const AddressCard = ({ a, onEdit, onDelete }) => (
  <div data-testid="address-card" className="bg-white border border-ink-200 rounded-xl p-5 hover:border-brand/30 hover:shadow-md transition-all">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-brand" strokeWidth={1.75} />
        <h3 className="font-semibold text-ink-900">{a.label}</h3>
        {a.is_default && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-widest rounded">
            <Star className="w-2.5 h-2.5 fill-brand" strokeWidth={0} /> Default
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(a)} aria-label="Edit" className="p-1.5 text-ink-500 hover:text-brand hover:bg-ink-100 rounded">
          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <button onClick={() => onDelete(a)} aria-label="Delete" className="p-1.5 text-ink-500 hover:text-red-500 hover:bg-red-50 rounded">
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
    <div className="text-sm text-ink-700 space-y-0.5">
      <p className="font-semibold text-ink-900">{a.first_name} {a.last_name}</p>
      <p>{a.address1}</p>
      {a.address2 && <p>{a.address2}</p>}
      <p>{a.city}, {a.state} {a.zip}</p>
      <p>{a.country}</p>
      {a.phone && <p className="text-xs text-ink-500 mt-1">{a.phone}</p>}
    </div>
  </div>
);

const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | {} | address
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { document.title = 'My Addresses | Abundant Merchandise'; }, []);

  const load = () => {
    api.get('/account/addresses')
      .then((r) => setAddresses(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSaved = (addr, action) => {
    toast.success(`Address ${action}`);
    setShowForm(false); setEditing(null);
    load();
  };

  const onDelete = async (a) => {
    if (!window.confirm(`Delete address "${a.label}"?`)) return;
    try {
      await api.delete(`/account/addresses/${a.id}`);
      toast.success('Address deleted');
      load();
    } catch (err) {
      toast.error('Could not delete');
    }
  };

  return (
    <div data-testid="addresses-page" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">My Account</p>
          <h1 className="mt-1 font-heading text-3xl font-bold text-ink-900">My addresses</h1>
        </div>
        <Link to="/account" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Back to account
        </Link>
      </div>

      {showForm && (
        <AddressForm
          initial={editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSaved={onSaved}
        />
      )}

      {!showForm && (
        <button
          data-testid="address-add-button"
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="mb-6 inline-flex items-center gap-1.5 h-11 px-5 bg-brand hover:bg-brand-600 text-white text-sm font-semibold rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} /> Add new address
        </button>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
        </div>
      ) : addresses.length === 0 ? (
        <div data-testid="addresses-empty" className="text-center py-16 border border-dashed border-ink-300 rounded-xl">
          <MapPin className="w-12 h-12 text-ink-300 mx-auto" strokeWidth={1.25} />
          <p className="mt-3 font-semibold text-ink-900">No addresses saved</p>
          <p className="text-sm text-ink-500 mt-1">Add an address for faster checkout next time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((a) => (
            <AddressCard key={a.id} a={a} onEdit={(addr) => { setEditing(addr); setShowForm(true); }} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Addresses;
