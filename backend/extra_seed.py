"""Extra product seeds to grow catalog from 69 to ~90 and add missing categories.

Maps the 7 existing 'auto' products to 'tools' (auto/automotive subcategory),
and appends 22 new products distributed across thin categories (office, toys,
beauty, fashion) plus a few electronics/sports/home additions.
"""
from typing import List, Dict, Any

# 22 additional products spread across categories
EXTRA_PRODUCTS: List[Dict[str, Any]] = [
    # OFFICE (10) — backend has 0 office products
    {
        "title": "Ergonomic Mesh Office Chair",
        "category": "office", "subcategory": "office-furniture", "brand": "DeskCraft",
        "price": 249.00, "compare_at": 329.00,
        "fulfillment": "warehouse", "stock": 45,
        "images": [
            "https://images.pexels.com/photos/1957477/pexels-photo-1957477.jpeg?w=800",
            "https://images.pexels.com/photos/2451264/pexels-photo-2451264.jpeg?w=800",
        ],
        "rating": 4.6, "review_count": 312,
        "description": "Breathable mesh back, adjustable lumbar support, 4D armrests, and a smooth pneumatic lift. Built for 8+ hour days.",
        "specs": {"Brand": "DeskCraft", "Weight Capacity": "300 lbs", "Material": "Mesh + steel base", "Warranty": "5 years"},
        "variants": [{"name": "Color", "options": ["Black", "Gray", "White"]}],
    },
    {
        "title": "Standing Desk Converter Pro",
        "category": "office", "subcategory": "desk-organization", "brand": "RiseWorks",
        "price": 189.00, "compare_at": 249.00,
        "fulfillment": "warehouse", "stock": 60,
        "images": [
            "https://images.pexels.com/photos/3740393/pexels-photo-3740393.jpeg?w=800",
            "https://images.pexels.com/photos/3740751/pexels-photo-3740751.jpeg?w=800",
        ],
        "rating": 4.7, "review_count": 528,
        "description": "Switch between sit and stand in seconds with this dual-monitor capable converter. Sturdy steel frame, fits any desk.",
        "specs": {"Brand": "RiseWorks", "Max Load": "35 lbs", "Width": "36 in", "Height range": "5–19.7 in"},
    },
    {
        "title": "Premium Leather Desk Mat",
        "category": "office", "subcategory": "desk-organization", "brand": "Hearthline",
        "price": 39.99, "compare_at": None,
        "fulfillment": "dropship", "stock": 200,
        "images": [
            "https://images.pexels.com/photos/4126724/pexels-photo-4126724.jpeg?w=800",
            "https://images.pexels.com/photos/4960464/pexels-photo-4960464.jpeg?w=800",
        ],
        "rating": 4.4, "review_count": 187,
        "description": "Genuine PU leather, water-resistant, with stitched edges. Protects your desk while elevating your workspace.",
        "specs": {"Brand": "Hearthline", "Size": "31.5 x 15.7 in", "Material": "PU leather"},
        "variants": [{"name": "Color", "options": ["Black", "Brown", "Navy"]}],
    },
    {
        "title": "Wireless Mechanical Keyboard",
        "category": "office", "subcategory": "desk-organization", "brand": "Lumenco",
        "price": 129.00, "compare_at": 169.00,
        "fulfillment": "warehouse", "stock": 90,
        "images": [
            "https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?w=800",
            "https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?w=800",
        ],
        "rating": 4.8, "review_count": 942,
        "description": "Hot-swappable switches, RGB backlight, and Bluetooth + 2.4GHz dongle for up to 3 devices.",
        "specs": {"Brand": "Lumenco", "Layout": "75%", "Battery": "4000 mAh", "Switches": "Tactile brown"},
        "variants": [{"name": "Switch", "options": ["Tactile", "Linear", "Clicky"]}],
    },
    {
        "title": "Premium Notebook Set (3-pack)",
        "category": "office", "subcategory": "stationery", "brand": "AbundantPro",
        "price": 24.99, "compare_at": None,
        "fulfillment": "warehouse", "stock": 320,
        "images": [
            "https://images.pexels.com/photos/210661/pexels-photo-210661.jpeg?w=800",
            "https://images.pexels.com/photos/1925536/pexels-photo-1925536.jpeg?w=800",
        ],
        "rating": 4.5, "review_count": 124,
        "description": "A5 hardcover notebooks with 120 GSM paper. Three colors, dotted, lined and blank — for every kind of thinker.",
        "specs": {"Brand": "AbundantPro", "Pages": "192 each", "Paper": "120 GSM"},
    },
    {
        "title": "Compact All-in-One Printer",
        "category": "office", "subcategory": "printers-ink", "brand": "Lumenco",
        "price": 179.00, "compare_at": 229.00,
        "fulfillment": "dropship", "stock": 50,
        "images": [
            "https://images.pexels.com/photos/4792733/pexels-photo-4792733.jpeg?w=800",
            "https://images.pexels.com/photos/4145357/pexels-photo-4145357.jpeg?w=800",
        ],
        "rating": 4.2, "review_count": 268,
        "description": "Print, scan, copy and fax from your phone or laptop. Wireless setup in under 2 minutes.",
        "specs": {"Brand": "Lumenco", "Connectivity": "WiFi + USB", "Print speed": "22 ppm"},
    },
    {
        "title": "Bamboo Desk Organizer",
        "category": "office", "subcategory": "desk-organization", "brand": "Hearthline",
        "price": 34.99, "compare_at": None,
        "fulfillment": "warehouse", "stock": 140,
        "images": [
            "https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?w=800",
            "https://images.pexels.com/photos/4226256/pexels-photo-4226256.jpeg?w=800",
        ],
        "rating": 4.6, "review_count": 211,
        "description": "Sustainable bamboo organizer with multiple compartments for pens, sticky notes, and devices.",
        "specs": {"Brand": "Hearthline", "Material": "Bamboo", "Dimensions": "12 x 8 x 4 in"},
    },
    {
        "title": "Gel Pen 12-Pack",
        "category": "office", "subcategory": "stationery", "brand": "AbundantPro",
        "price": 9.99, "compare_at": 14.99,
        "fulfillment": "warehouse", "stock": 600,
        "images": [
            "https://images.pexels.com/photos/210661/pexels-photo-210661.jpeg?w=800",
            "https://images.pexels.com/photos/636246/pexels-photo-636246.jpeg?w=800",
        ],
        "rating": 4.7, "review_count": 1456,
        "description": "Smooth-flow gel ink, 0.5mm fine tip. Comes in 12 vivid colors that don't smudge.",
        "specs": {"Brand": "AbundantPro", "Tip": "0.5 mm", "Pack": "12 colors"},
    },
    {
        "title": "USB-C 4-in-1 Hub",
        "category": "office", "subcategory": "desk-organization", "brand": "Voltura",
        "price": 32.00, "compare_at": 49.00,
        "fulfillment": "dropship", "stock": 240,
        "images": [
            "https://images.pexels.com/photos/4219524/pexels-photo-4219524.jpeg?w=800",
            "https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?w=800",
        ],
        "rating": 4.4, "review_count": 532,
        "description": "Adds 2x USB 3.0, HDMI 4K, and 100W PD passthrough to any USB-C laptop. Plug and play.",
        "specs": {"Brand": "Voltura", "Ports": "USB 3.0 x2, HDMI, USB-C PD", "Speed": "5 Gbps"},
    },
    {
        "title": "Wireless Charging Mouse Pad",
        "category": "office", "subcategory": "desk-organization", "brand": "Voltura",
        "price": 45.00, "compare_at": 65.00,
        "fulfillment": "dropship", "stock": 130,
        "images": [
            "https://images.pexels.com/photos/4219522/pexels-photo-4219522.jpeg?w=800",
            "https://images.pexels.com/photos/3568523/pexels-photo-3568523.jpeg?w=800",
        ],
        "rating": 4.3, "review_count": 198,
        "description": "Smooth mousing surface plus a 10W Qi wireless charging zone for your phone. Two devices, one cable.",
        "specs": {"Brand": "Voltura", "Charging": "10W Qi", "Surface": "PU leather"},
    },

    # TOYS (5) — backend has 5; bring to 10
    {
        "title": "Wooden Building Blocks (100 pcs)",
        "category": "toys", "subcategory": "building-sets", "brand": "Hearthline",
        "price": 39.99, "compare_at": 54.99,
        "fulfillment": "warehouse", "stock": 110,
        "images": [
            "https://images.pexels.com/photos/3661193/pexels-photo-3661193.jpeg?w=800",
            "https://images.pexels.com/photos/207697/pexels-photo-207697.jpeg?w=800",
        ],
        "rating": 4.8, "review_count": 423,
        "description": "Heirloom-quality solid maple blocks in a reusable wooden crate. Sparks open-ended play for ages 2+.",
        "specs": {"Brand": "Hearthline", "Pieces": "100", "Material": "Solid maple", "Age": "2+"},
    },
    {
        "title": "Remote Control Drone with HD Camera",
        "category": "toys", "subcategory": "remote-control", "brand": "Lumenco",
        "price": 79.99, "compare_at": 119.00,
        "fulfillment": "dropship", "stock": 80,
        "images": [
            "https://images.pexels.com/photos/336232/pexels-photo-336232.jpeg?w=800",
            "https://images.pexels.com/photos/442589/pexels-photo-442589.jpeg?w=800",
        ],
        "rating": 4.3, "review_count": 287,
        "description": "1080p HD camera, 20-min flight time, headless mode, and one-key return. Beginner-friendly.",
        "specs": {"Brand": "Lumenco", "Camera": "1080p HD", "Flight time": "20 min", "Range": "100 m"},
    },
    {
        "title": "Educational Science Kit",
        "category": "toys", "subcategory": "educational", "brand": "AbundantPro",
        "price": 49.99, "compare_at": None,
        "fulfillment": "warehouse", "stock": 95,
        "images": [
            "https://images.pexels.com/photos/8364027/pexels-photo-8364027.jpeg?w=800",
            "https://images.pexels.com/photos/256302/pexels-photo-256302.jpeg?w=800",
        ],
        "rating": 4.6, "review_count": 156,
        "description": "30+ hands-on experiments covering chemistry, physics, and biology. Includes safety gear and an illustrated manual.",
        "specs": {"Brand": "AbundantPro", "Experiments": "30+", "Age": "8–14"},
    },
    {
        "title": "Plush Teddy Bear — XL",
        "category": "toys", "subcategory": "plush-dolls", "brand": "Hearthline",
        "price": 34.99, "compare_at": None,
        "fulfillment": "warehouse", "stock": 220,
        "images": [
            "https://images.pexels.com/photos/52527/teddy-teddy-bear-association-ill-52527.jpeg?w=800",
            "https://images.pexels.com/photos/5556788/pexels-photo-5556788.jpeg?w=800",
        ],
        "rating": 4.9, "review_count": 891,
        "description": "Hypoallergenic, machine-washable, 24-inch tall teddy. Perfect cuddle companion.",
        "specs": {"Brand": "Hearthline", "Height": "24 in", "Material": "Recycled polyester"},
    },
    {
        "title": "Strategy Board Game — Family Edition",
        "category": "toys", "subcategory": "board-games", "brand": "AbundantPro",
        "price": 29.99, "compare_at": 39.99,
        "fulfillment": "warehouse", "stock": 180,
        "images": [
            "https://images.pexels.com/photos/4691567/pexels-photo-4691567.jpeg?w=800",
            "https://images.pexels.com/photos/4691558/pexels-photo-4691558.jpeg?w=800",
        ],
        "rating": 4.7, "review_count": 612,
        "description": "Easy to learn in 5 minutes, hard to master. 2–6 players, ages 8+.",
        "specs": {"Brand": "AbundantPro", "Players": "2–6", "Play time": "45–60 min"},
    },

    # BEAUTY (3 more — to 10)
    {
        "title": "Vitamin C Brightening Serum",
        "category": "beauty", "subcategory": "skincare", "brand": "Coastline",
        "price": 28.00, "compare_at": 39.00,
        "fulfillment": "warehouse", "stock": 250,
        "images": [
            "https://images.pexels.com/photos/3735619/pexels-photo-3735619.jpeg?w=800",
            "https://images.pexels.com/photos/5938365/pexels-photo-5938365.jpeg?w=800",
        ],
        "rating": 4.7, "review_count": 1842,
        "description": "20% pure Vitamin C with Hyaluronic Acid and Ferulic Acid. Brightens, evens tone, and hydrates.",
        "specs": {"Brand": "Coastline", "Size": "30 ml", "Vegan": "Yes", "Cruelty-free": "Yes"},
    },
    {
        "title": "Hair Dryer Pro Ionic",
        "category": "beauty", "subcategory": "hair-care", "brand": "Lumenco",
        "price": 89.00, "compare_at": 129.00,
        "fulfillment": "dropship", "stock": 110,
        "images": [
            "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?w=800",
            "https://images.pexels.com/photos/3993458/pexels-photo-3993458.jpeg?w=800",
        ],
        "rating": 4.5, "review_count": 437,
        "description": "1875W ionic motor, 3 heat settings, 2 speeds, cool-shot button, and diffuser attachment.",
        "specs": {"Brand": "Lumenco", "Wattage": "1875W", "Cord": "8 ft"},
    },
    {
        "title": "Makeup Brush Set (12 pcs)",
        "category": "beauty", "subcategory": "makeup", "brand": "Coastline",
        "price": 32.00, "compare_at": None,
        "fulfillment": "warehouse", "stock": 165,
        "images": [
            "https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg?w=800",
            "https://images.pexels.com/photos/2253833/pexels-photo-2253833.jpeg?w=800",
        ],
        "rating": 4.6, "review_count": 723,
        "description": "Synthetic vegan bristles, ergonomic wood handles, and a faux-leather travel pouch.",
        "specs": {"Brand": "Coastline", "Pieces": "12", "Vegan": "Yes"},
    },

    # FASHION (2 more — to 12)
    {
        "title": "Classic Crewneck Sweatshirt",
        "category": "fashion", "subcategory": "mens", "brand": "Forgewood",
        "price": 49.00, "compare_at": 69.00,
        "fulfillment": "warehouse", "stock": 280,
        "images": [
            "https://images.pexels.com/photos/1183266/pexels-photo-1183266.jpeg?w=800",
            "https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?w=800",
        ],
        "rating": 4.6, "review_count": 521,
        "description": "Heavyweight 14oz cotton blend, brushed-fleece interior, ribbed cuffs and hem.",
        "specs": {"Brand": "Forgewood", "Material": "80% Cotton, 20% Polyester", "Fit": "Relaxed"},
        "variants": [
            {"name": "Color", "options": ["Heather Gray", "Black", "Navy", "Forest Green"]},
            {"name": "Size", "options": ["S", "M", "L", "XL", "XXL"]},
        ],
    },
    {
        "title": "Leather Crossbody Bag",
        "category": "fashion", "subcategory": "accessories", "brand": "Coastline",
        "price": 119.00, "compare_at": 169.00,
        "fulfillment": "warehouse", "stock": 95,
        "images": [
            "https://images.pexels.com/photos/904350/pexels-photo-904350.jpeg?w=800",
            "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?w=800",
        ],
        "rating": 4.8, "review_count": 318,
        "description": "Full-grain Italian leather, brass hardware, adjustable strap. Fits a 9.7-inch tablet.",
        "specs": {"Brand": "Coastline", "Material": "Full-grain leather", "Dimensions": "10 x 8 x 3 in"},
        "variants": [{"name": "Color", "options": ["Tan", "Black", "Cognac"]}],
    },

    # ELECTRONICS (1 more)
    {
        "title": "Noise-Cancelling True Wireless Earbuds",
        "category": "electronics", "subcategory": "audio", "brand": "Voltura",
        "price": 99.00, "compare_at": 149.00,
        "fulfillment": "warehouse", "stock": 175,
        "images": [
            "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=800",
            "https://images.pexels.com/photos/1037992/pexels-photo-1037992.jpeg?w=800",
        ],
        "rating": 4.7, "review_count": 2104,
        "description": "Active noise cancelling, 30-hour total battery, IPX5 sweat resistance, multipoint Bluetooth 5.3.",
        "specs": {"Brand": "Voltura", "Battery": "30h with case", "Bluetooth": "5.3", "ANC": "Hybrid"},
        "variants": [{"name": "Color", "options": ["Midnight", "Pearl White", "Sand"]}],
    },

    # SPORTS (1 more)
    {
        "title": "Adjustable Dumbbells 5-50 lbs",
        "category": "sports", "subcategory": "fitness", "brand": "Northcross",
        "price": 299.00, "compare_at": 399.00,
        "fulfillment": "warehouse", "stock": 35,
        "images": [
            "https://images.pexels.com/photos/3490348/pexels-photo-3490348.jpeg?w=800",
            "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?w=800",
        ],
        "rating": 4.6, "review_count": 612,
        "description": "Replace 15 sets of dumbbells with one. Twist-to-adjust dial, durable steel weights, compact tray.",
        "specs": {"Brand": "Northcross", "Range": "5–50 lbs per dumbbell", "Increments": "2.5 lbs"},
    },
]
