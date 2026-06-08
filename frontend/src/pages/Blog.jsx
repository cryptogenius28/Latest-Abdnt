import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const BLOG_POSTS = [
  {
    slug: 'best-smart-home-gadgets-2026',
    category: 'Buying Guide',
    title: 'The 10 Best Smart Home Gadgets of 2026',
    excerpt: 'From voice-controlled lights to robotic vacuums, we break down the gadgets worth your money this year.',
    date: 'June 3, 2026',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600',
  },
  {
    slug: '5-kitchen-upgrades-save-time',
    category: 'Home Tips',
    title: '5 Kitchen Upgrades That Actually Save You Time',
    excerpt: "Small swaps in your kitchen setup can cut meal-prep time in half. Here's what our editors swear by.",
    date: 'May 28, 2026',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600',
  },
  {
    slug: 'wireless-headphones-buyers-guide-2026',
    category: 'Tech',
    title: 'What to Look for in a Wireless Headphone in 2026',
    excerpt: "Noise cancellation, battery life, codec support — we rank what matters most and what's just marketing.",
    date: 'May 20, 2026',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
  },
  {
    slug: 'home-gym-budget-guide',
    category: 'Lifestyle',
    title: 'How to Build a Home Gym on Any Budget',
    excerpt: "You don't need a full rack to get a great workout. We've assembled tier-by-tier setups from $100 to $1,000.",
    date: 'May 14, 2026',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600',
  },
  {
    slug: 'capsule-wardrobe-essentials',
    category: 'Style',
    title: 'Wardrobe Essentials: Building a Capsule Collection',
    excerpt: 'Ten pieces. Infinite outfits. Learn how a capsule wardrobe saves money and reduces decision fatigue.',
    date: 'May 7, 2026',
    image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600',
  },
  {
    slug: 'diy-starter-kit-essentials',
    category: 'Tools',
    title: "The DIYer's Starter Kit: 7 Tools You Actually Need",
    excerpt: 'Skip the gimmicks. These 7 tools handle 90% of home repair and improvement tasks.',
    date: 'April 30, 2026',
    image: 'https://images.pexels.com/photos/220639/pexels-photo-220639.jpeg?w=600',
  },
];

const Blog = () => {
  useEffect(() => { document.title = 'Blog | Abundant Merchandise'; }, []);

  return (
    <div data-testid="blog-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Our Blog</p>
        <h1 className="mt-2 font-heading text-3xl md:text-4xl font-bold text-ink-900">Tips, Trends & Updates</h1>
        <p className="mt-3 text-ink-500 text-base leading-relaxed">
          Insights from our team — gear reviews, home tips, buying guides and more. Updated regularly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="blog-grid">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            data-testid="blog-card"
            className="group bg-white border border-ink-100 rounded-xl overflow-hidden hover:shadow-md hover:border-brand/30 transition-all"
          >
            <div className="aspect-video overflow-hidden">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="p-5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                {post.category}
              </span>
              <h3 className="mt-3 font-heading font-bold text-ink-900 text-lg line-clamp-2 group-hover:text-brand transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-ink-600 line-clamp-2 mt-1.5">{post.excerpt}</p>
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between">
                <p className="text-xs text-ink-500">{post.date}</p>
                <span className="text-brand text-sm font-semibold group-hover:text-brand-600">Read more →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 text-center p-6 bg-brand/5 border border-brand/20 rounded-xl">
        <p className="text-sm font-semibold text-ink-900">More posts coming soon</p>
        <p className="text-sm text-ink-500 mt-1">Subscribe to our newsletter to get notified when we publish new articles.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand hover:text-brand-600">Subscribe below ↓</Link>
      </div>
    </div>
  );
};

export default Blog;
