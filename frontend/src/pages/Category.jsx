import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import Shop from './Shop';

const Category = () => {
  const { slug } = useParams();
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/categories').then((r) => {
      if (cancelled) return;
      const c = (r.data || []).find((x) => x.slug === slug);
      setMeta(c || { slug, name: slug, count: 0 });
    }).catch(() => setMeta({ slug, name: slug, count: 0 }));
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <Shop
      key={slug}
      fixedCategory={slug}
      headerTitle={meta?.name || 'Category'}
      headerSub={`Curated picks in ${meta?.name || 'this department'} — ${meta?.count ?? 0} products available.`}
    />
  );
};

export default Category;
