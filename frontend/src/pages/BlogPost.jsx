import React, { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';

// Mock blog post content — keyed by slug. Mirrors entries in Blog.jsx
const POSTS = {
  'best-smart-home-gadgets-2026': {
    title: 'The 10 Best Smart Home Gadgets of 2026',
    category: 'Buying Guide',
    author: 'Maya Chen',
    date: 'June 3, 2026',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600',
    body: [
      "Smart home tech in 2026 has grown up. The gadgets we recommend below have all earned their spot through reliability, real value, and actual everyday usefulness — not just the loudest marketing.",
      "After testing dozens of devices across three months, our editors landed on a curated short list spanning lighting, security, climate, kitchen, and entertainment categories. Each pick had to pass three criteria: easy setup (under 15 minutes), broad ecosystem support (Google, Apple, Amazon), and a meaningful upgrade over a 'dumb' alternative.",
      "Lighting is the easiest entry point. A starter set of color-changing bulbs transforms how a room feels at the press of a button. Pair them with motion sensors in hallways and you'll never fumble for a switch in the dark again.",
      "For security, a battery-powered video doorbell is non-negotiable. Cloud storage costs are now reasonable, and modern devices detect packages, people, and pets independently — cutting down on false alerts.",
      "Climate control is where smart tech earns its keep on your utility bill. A learning thermostat typically pays for itself in under a year and quietly adjusts to your schedule without you noticing.",
      "Finally, the kitchen. A countertop smart oven that handles air-frying, broiling, and standard baking has replaced three appliances in our test kitchen. The convenience is worth more than the savings.",
    ],
  },
  '5-kitchen-upgrades-save-time': {
    title: '5 Kitchen Upgrades That Actually Save You Time',
    category: 'Home Tips',
    author: 'David Park',
    date: 'May 28, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600',
    body: [
      "A faster kitchen isn't about more gadgets — it's about the right few that genuinely cut prep time and cleanup. Here are five upgrades that paid off within a week.",
      "First, an in-drawer knife block. Pulling knives flat from a drawer is twice as fast as a countertop block and saves valuable counter real estate.",
      "Second, a quality electric kettle with temperature presets. Heating water on the stovetop for coffee or tea is a daily 4-minute tax you can eliminate.",
      "Third, sheet pan organizers that store pans vertically. No more digging through a stack of warped trays — pull what you need in one motion.",
      "Fourth, a small immersion blender. For sauces, soups, and quick smoothies, it replaces the full blender 90% of the time and skips the cleanup hassle.",
      "Fifth, induction-compatible cookware paired with a portable induction burner for the rare oversized-meal day. Faster heating, less wasted energy.",
    ],
  },
  'wireless-headphones-buyers-guide-2026': {
    title: 'What to Look for in a Wireless Headphone in 2026',
    category: 'Tech',
    author: 'Priya Singh',
    date: 'May 20, 2026',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600',
    body: [
      "Wireless headphones have converged on a baseline of excellence — almost every flagship today delivers 30+ hours of battery, decent ANC, and rich sound. The differentiation has moved to comfort, codec support, and how well they integrate with your device.",
      "Codecs matter more than ever. AAC works fine for iPhone users, but Android users should look for LDAC or aptX Lossless to actually benefit from high-resolution streaming.",
      "Active Noise Cancellation (ANC) is no longer a luxury feature. The best models in 2026 have multi-tier ANC modes that adapt to your environment automatically.",
      "Battery life claims are usually with ANC on at moderate volume. Realistic life is often 15-20% less. Look for fast-charge specs — 10 minutes of charging delivering 2-3 hours of playback is now standard on premium models.",
      "Comfort trumps everything for long sessions. Try them on if you can. Weight distribution and clamp force matter more than padding thickness.",
      "Finally, software. Companion apps unlock EQ adjustments, find-my-headphone features, and firmware updates that can meaningfully improve sound quality after launch.",
    ],
  },
  'home-gym-budget-guide': {
    title: 'How to Build a Home Gym on Any Budget',
    category: 'Lifestyle',
    author: 'Marcus Reed',
    date: 'May 14, 2026',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600',
    body: [
      "You don't need a power rack and a fully padded room to get a great workout. Below are tiered setups at $100, $400, and $1,000 budgets.",
      "Starter ($100): a single adjustable kettlebell, a yoga mat, and a quality resistance band set. With these three items and a free programming app, you can run a complete full-body strength routine for at least six months without plateauing.",
      "Intermediate ($400): add a doorway pull-up bar, a pair of dumbbells in your working range (commonly 20-40lb), and an interlocking foam tile floor (10x10 ft). This unlocks progressive overload and proper barbell-substitute lifts.",
      "Serious ($1,000): a foldable squat stand, a 7-foot barbell with 230 lb of plates, a sturdy adjustable bench, and a heavy-duty mat. This setup covers every major compound lift and lasts a lifetime.",
      "Don't forget recovery. A foam roller and lacrosse ball are $25 well spent at any tier.",
    ],
  },
  'capsule-wardrobe-essentials': {
    title: 'Wardrobe Essentials: Building a Capsule Collection',
    category: 'Style',
    author: 'Jules Avery',
    date: 'May 7, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=1600',
    body: [
      "A capsule wardrobe is a small collection of versatile, well-made pieces that work together. Ten pieces, mixed properly, can yield over 50 outfits.",
      "Start with neutrals. Two pairs of well-fitted trousers in navy and charcoal, one pair of dark indigo jeans, and one casual chino in stone.",
      "On top: three quality tees (white, black, navy), one oxford button-down, one neutral knit sweater, and one tailored blazer that elevates anything below it.",
      "Footwear matters most. Two pairs do everything: a clean white leather sneaker and a Chelsea or derby boot in brown.",
      "Don't overlook a single great jacket. A trench or unstructured wool coat outperforms five trend-chasing pieces over its lifespan.",
      "Spend more on fewer pieces. The math always favors quality over quantity.",
    ],
  },
  'diy-starter-kit-essentials': {
    title: "The DIYer's Starter Kit: 7 Tools You Actually Need",
    category: 'Tools',
    author: 'Sam Holloway',
    date: 'April 30, 2026',
    readTime: '4 min read',
    image: 'https://images.pexels.com/photos/220639/pexels-photo-220639.jpeg?w=1600',
    body: [
      "Skip the gimmicks and 200-piece bargain kits. These seven tools handle 90% of home repair and improvement tasks.",
      "1. A cordless drill/driver with two batteries. Brand loyalty matters here because every accessory clicks into the same battery platform.",
      "2. A magnetic stud finder. Save yourself from drilling into hidden wires and pipes.",
      "3. A claw hammer with a fiberglass handle. Steel handles look cool but vibrate; fiberglass forgives mistakes.",
      "4. A 25-foot tape measure. Get one with a magnetic tip — life-changing for solo measurements.",
      "5. A quality 8-piece screwdriver set with hardened tips. Cheap screwdrivers cam out and strip screws.",
      "6. A 4-foot level for picture hanging, shelves, and confirming furniture sits true.",
      "7. A utility knife with replaceable blades. Boxes, drywall, packaging — it's the most-used tool in any kit.",
    ],
  },
};

const BlogPost = () => {
  const { slug } = useParams();
  const post = POSTS[slug];

  useEffect(() => {
    if (post) document.title = `${post.title} | Blog | Abundant Merchandise`;
  }, [post]);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <article data-testid="blog-post-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <Link
        to="/blog"
        data-testid="blog-post-back"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-brand mb-6"
      >
        <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Back to blog
      </Link>

      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2.5 py-1 rounded-full">
          <Tag className="w-3 h-3" strokeWidth={2} /> {post.category}
        </span>
        <span className="text-xs text-ink-500">{post.readTime}</span>
      </div>

      <h1 data-testid="blog-post-title" className="font-heading text-3xl md:text-4xl font-bold text-ink-900 leading-tight">
        {post.title}
      </h1>

      <div className="mt-4 flex items-center gap-4 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5" strokeWidth={1.75} /> {post.author}</span>
        <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" strokeWidth={1.75} /> {post.date}</span>
      </div>

      <div className="mt-8 aspect-[16/9] rounded-xl overflow-hidden border border-ink-200">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
      </div>

      <div data-testid="blog-post-body" className="mt-8 space-y-5 text-ink-700 leading-relaxed text-base">
        {post.body.map((para, i) => (
          <p key={i} className={i === 0 ? 'text-lg text-ink-900 leading-relaxed' : ''}>{para}</p>
        ))}
      </div>

      <div className="mt-12 p-6 bg-brand/5 border border-brand/20 rounded-xl">
        <p className="font-heading text-lg font-bold text-ink-900">Enjoyed this article?</p>
        <p className="text-sm text-ink-600 mt-1">Browse more guides and reviews from our editorial team.</p>
        <Link
          to="/blog"
          className="inline-flex mt-4 items-center justify-center h-10 px-5 text-sm font-semibold text-white bg-brand hover:bg-brand-600 rounded-md transition-colors"
        >
          See all posts
        </Link>
      </div>
    </article>
  );
};

export default BlogPost;
export { POSTS as BLOG_POSTS_DATA };
