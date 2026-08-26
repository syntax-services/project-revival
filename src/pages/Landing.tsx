import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomNav } from "@/components/layout/BottomNav";
import { updateMetaTags } from "@/lib/seo";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogFooter
} from "@/components/ui/dialog";
import {
 ArrowRight,
 Building2,
 Users,
 Zap,
 Star,
 MapPin,
 Search,
 ShoppingBag,
 Sparkles,
 ShieldCheck,
 TrendingUp,
 Package,
 ChevronRight,
 ShieldAlert
} from "lucide-react";
import {
 PremiumHeart,
 PremiumChatBubble,
 PremiumBookmark,
 PremiumPackage,
 PremiumWrench,
 PremiumStar
} from "@/components/ui/custom-icons";
import stringLogoLight from "@/assets/string-logo-light.png";
import stringLogoDark from "@/assets/String-logo-dark.png";

// ============================================================================
// DYNAMIC COMPONENT LEVEL ROBUST FALLBACKS
// ============================================================================

const ShopAvatar = ({ src, name }: { src: string; name: string }) => {
 const [error, setError] = useState(false);

 if (error || !src) {
 return (
 <div className="h-full w-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-extrabold text-sm shadow-inner shrink-0">
 {name.charAt(0)}
 </div>
 );
 }

 return (
 <img
 src={src}
 alt={name}
 onError={() => setError(true)}
 className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 shrink-0"
 />
 );
};

const ProductImage = ({ src, name }: { src: string; name: string }) => {
 const [error, setError] = useState(false);

 if (error || !src) {
 return (
 <div className="h-full w-full flex items-center justify-center bg-muted/50 text-muted-foreground shrink-0">
 <PremiumPackage className="h-4 w-4 text-primary" />
 </div>
 );
 }

 return (
 <img
 src={src}
 alt={name}
 onError={() => setError(true)}
 className="h-full w-full object-cover shrink-0"
 />
 );
};

// ============================================================================
// STRING CUSTOM CATEGORY VECTOR ICONS WITH CONCENTRIC CRESCENT BRAND MOTIF
// ============================================================================

const ApparelIcon = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={1.25}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-3.5 w-3.5 text-primary shrink-0"
 {...props}
 >
 <path d="M12 7a2 2 0 1 0-2-2M12 7l-9 5h18z" />
 <path d="M3 12v8a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5v-8" />
 <circle cx="12" cy="16" r="2.5" />
 <path d="M14.5 16a2.5 2.5 0 0 1-1.5 2.3" opacity={0.8} />
 </svg>
);

const FoodDrinksIcon = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={1.25}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-3.5 w-3.5 text-primary shrink-0"
 {...props}
 >
 <path d="M17 8H7c-.55 0-1 .45-1 1v7c0 2.2 1.8 4 4 4h4c2.2 0 4-1.8 4-4V9c0-.55-.45-1-1-1z" />
 <path d="M18 11h2c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2h-2" />
 <circle cx="12" cy="14" r="2" />
 <path d="M14 14a2 2 0 0 1-1 1.7" opacity={0.8} />
 </svg>
);

const ElectronicsIcon = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={1.25}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-3.5 w-3.5 text-primary shrink-0"
 {...props}
 >
 <rect width="16" height="10" x="4" y="5" rx="1.5" />
 <path d="M2 17h20v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
 <circle cx="12" cy="10" r="2" />
 <path d="M14 10a2 2 0 0 1-1 1.7" opacity={0.8} />
 </svg>
);

const BeautySpaIcon = (props: React.SVGProps<SVGSVGElement>) => (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth={1.25}
 strokeLinecap="round"
 strokeLinejoin="round"
 className="h-3.5 w-3.5 text-primary shrink-0"
 {...props}
 >
 <path d="M12 3v18M3 12h18M18.36 5.64L5.64 18.36M18.36 18.36L5.64 5.64" />
 <circle cx="12" cy="12" r="3" />
 <path d="M15 12a3 3 0 0 1-2 2.7" opacity={0.8} />
 </svg>
);

// Signature curated local business profiles and their real catalogs
const curatedShops = [
 {
 id: "shop_string_gear",
 name: "String Gear & Apparel",
 handle: "string.global",
 avatar: "/avatar_male.png", // Male 3D avatar preset
 verified: true,
 rating: 4.9,
 reviews: 142,
 distance: "0.8 km",
 matchScore: 98,
 industry: "Premium Outerwear & Tech",
 tagline: "Exclusive heavyweight hoodies, mechanical keyboards, and modular EDC gear.",
 coverUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=60",
 catalog: [
 { name: "Heavyweight Hoodie", price: 25000, img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&auto=format&fit=crop&q=60" },
 { name: "String Core T-Shirt", price: 12000, img: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=60" },
 { name: "Premium Desk Mat", price: 9500, img: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=300&auto=format&fit=crop&q=60" }
 ]
 },
 {
 id: "shop_aroma",
 name: "Aroma Coffee Roasters",
 handle: "aroma.yaba",
 avatar: "/avatar_female.png", // Female 3D avatar preset
 verified: true,
 rating: 4.8,
 reviews: 96,
 distance: "1.4 km",
 matchScore: 92,
 industry: "Specialty Café & Roastery",
 tagline: "Small-batch roasted single origin beans and gourmet pastries.",
 coverUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop&q=60",
 catalog: [
 { name: "Artisanal Cold Brew", price: 3500, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=300&auto=format&fit=crop&q=60" },
 { name: "Single Origin Beans", price: 8000, img: "https://images.unsplash.com/photo-1497515114629-f71d768fd07c?w=300&auto=format&fit=crop&q=60" },
 { name: "Almond Croissant", price: 2200, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop&q=60" }
 ]
 },
 {
 id: "shop_vertex",
 name: "Vertex Tech & Repairs",
 handle: "vertex.fix",
 avatar: "/avatar_neutral.png", // Neutral 3D avatar preset
 verified: false,
 rating: 4.7,
 reviews: 58,
 distance: "2.1 km",
 matchScore: 88,
 industry: "Electronics & Repair",
 tagline: "Same-day hardware repairs, custom desktop builds, and certified gaming accessories.",
 coverUrl: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=60",
 catalog: [
 { name: "Mechanical Switches", price: 7500, img: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300&auto=format&fit=crop&q=60" },
 { name: "Precision Tool Kit", price: 14000, img: "https://images.unsplash.com/photo-1530124560072-aae8d56b0efe?w=300&auto=format&fit=crop&q=60" },
 { name: "USB-C Braided Cable", price: 4000, img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&auto=format&fit=crop&q=60" }
 ]
 }
];

const categories = [
 { label: "Apparel", icon: ApparelIcon },
 { label: "Food & Drinks", icon: FoodDrinksIcon },
 { label: "Electronics", icon: ElectronicsIcon },
 { label: "Home Services", icon: PremiumWrench },
 { label: "Beauty & Spa", icon: BeautySpaIcon }
];

export default function Landing() {
  usePageMeta({
    title: "Nigeria's Verified Campus Marketplace & Services",
    description: "Connect with verified student merchants, discover trending campus goods, gadgets, fashion, and hire skilled student freelancers on String.",
    keywords: ["String","String Nigeria","campus marketplace","student commerce","buy and sell on campus","verified merchants","university market"],
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "String",
        "url": "https://www.string.com.ng/",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.string.com.ng/discover?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "String",
        "url": "https://www.string.com.ng/",
        "logo": "https://www.string.com.ng/String-logo-dark.png",
        "description": "String is the #1 exclusive, verified student marketplace and freelance services platform tailored for Olabisi Onabanjo University (OOU) and Nigerian campuses.",
        "sameAs": [
          "https://twitter.com/StringPlatform"
        ]
      }
    ]
  });

 const { dashboardPath, user } = useAuth();
 const [searchQuery, setSearchQuery] = useState("");
 const [promoOpen, setPromoOpen] = useState(false);
 const [promoMessage, setPromoMessage] = useState("");
 const navigate = useNavigate();

 useEffect(() => {
 updateMetaTags(
 "Home of Verified Goods & Local Services",
 "String is the premier high-trust escrow marketplace connecting customers with premium local merchants, tailor fashion designers, electronics repair shops, and beauty salons in Lagos, Nigeria.",
 "string, marketplace, local business, lagos, escrow, verified shops, tailors, ankara fashion, repair electronics, beauty salon"
 );
 }, []);

 const handleActionClick = (actionName: string) => {
 if (user) {
 navigate(dashboardPath);
 } else {
 setPromoMessage(`Sign up or log in to ${actionName} and interact directly with active neighborhood stores!`);
 setPromoOpen(true);
 }
 };

 const handleSearchSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (user) {
 navigate(`/customer/discover?search=${encodeURIComponent(searchQuery)}`);
 } else {
 navigate(`/auth?mode=signup&search=${encodeURIComponent(searchQuery)}`);
 }
 };

 return (
 <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
 {/* Dynamic Concentric Brand Ring Watermarks (String Signature Assets) */}
 <div className="absolute top-10 -left-48 w-[600px] h-[600px] rounded-full border border-primary/5 opacity-40 pointer-events-none" />
 <div className="absolute top-36 -left-24 w-[400px] h-[400px] rounded-full border border-primary/5 opacity-30 pointer-events-none" />
 <div className="absolute top-96 -right-60 w-[700px] h-[700px] rounded-full border border-primary/5 opacity-30 pointer-events-none" />

 {/* Header - Fixed to top for absolute consistency on desktop and mobile */}
 <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 w-full">
 <div className="container flex h-16 items-center justify-between px-4 max-w-6xl mx-auto">
 <Link to="/" className="flex items-center gap-2">
 <img src={stringLogoLight} alt="String" className="h-12 w-auto logo-light" />
 <img src={stringLogoDark} alt="String" className="h-12 w-auto logo-dark" />
 </Link>
 
 <nav className="flex items-center gap-3">
 {user ? (
 <Button asChild className="rounded-full px-5 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20">
 <Link to={dashboardPath}>
 Dashboard
 <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
 </Link>
 </Button>
 ) : (
 <>
 <Button variant="ghost" asChild className="hidden sm:inline-flex rounded-full h-9 text-xs font-semibold">
 <Link to="/auth?mode=login">Sign In</Link>
 </Button>
 <Button asChild className="rounded-full px-5 h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20">
 <Link to="/auth?mode=signup">Create Account</Link>
 </Button>
 </>
 )}
 </nav>
 </div>
 </header>

 {/* Main Content Area shifted exactly below the fixed header */}
 <main className="flex-1 pt-16 flex flex-col relative">
 {/* Hero Section */}
 <section className="relative pt-12 pb-16 md:pt-16 md:pb-24 border-b border-border bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent">
 <div className="container px-4 text-center max-w-4xl mx-auto space-y-6">
 <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-foreground font-Outfit">
 The direct catalog marketplace <br />
 <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
 for premium local products
 </span>
 </h1>
 
 <p className="text-sm text-muted-foreground sm:text-base max-w-2xl mx-auto leading-relaxed">
 Skip the middleman. Interact directly with verified local merchants, pitch order requests straight from circular catalogs, and clear secure payouts with <strong>Zero-Tax</strong> deductions.
 </p>

 {/* Search Box */}
 <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto bg-card/50 backdrop-blur-xl border border-border/80 p-1.5 rounded-2xl shadow-xl flex items-center gap-2 focus-within:border-primary/50 transition-all">
 <div className="flex-1 flex items-center pl-3 gap-2">
 <Search className="h-4 w-4 text-muted-foreground" />
 <Input
 type="text"
 placeholder="Search streetwear, coffee beans, repair tools..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="bg-transparent border-0 h-10 p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground"
 />
 </div>
 <Button type="submit" className="rounded-xl h-10 px-6 font-bold shadow-md shadow-primary/10 shrink-0">
 Browse Feed
 </Button>
 </form>

 {/* Quick Categories with fully branded vector icons instead of emojis */}
 <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto pt-2">
 {categories.map((cat) => {
 const IconComponent = cat.icon;
 return (
 <button
 key={cat.label}
 onClick={() => {
 setSearchQuery(cat.label);
 if (user) {
 navigate(`/customer/discover?search=${encodeURIComponent(cat.label)}`);
 } else {
 navigate(`/auth?mode=signup&search=${encodeURIComponent(cat.label)}`);
 }
 }}
 className="flex items-center gap-1.5 text-xs px-3.5 py-1.75 rounded-full border border-border/60 bg-card/20 hover:border-primary/40 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
 >
 <IconComponent className="h-3.5 w-3.5 text-primary shrink-0" />
 <span>{cat.label}</span>
 </button>
 );
 })}
 </div>
 </div>
 </section>

 {/* Core Feed: Real Discover Cards Showcase */}
 <section className="py-16 bg-surface/30">
 <div className="container px-4 max-w-5xl mx-auto space-y-12">
 
 <div className="text-center space-y-2 max-w-xl mx-auto">
 <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Active Live Catalogues</h2>
 <p className="text-xs text-muted-foreground leading-relaxed">
 These are exactly the high-fidelity store cards you interact with inside the String app, showing verified radius distance, custom 3D character avatars, and mini-catalogs.
 </p>
 </div>

 {/* Catalog Cards Grid (Identical to Discover Page) */}
 <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
 {curatedShops.map((shop) => {
 const handleName = shop.name.toLowerCase().replace(/[^a-z0-9]/g, "");
 return (
 <div
 key={shop.id}
 className="bg-card border border-border/40 rounded-[32px] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col space-y-4 p-4 animate-fade-in group relative"
 >
 {/* Card Header (Profile & Verified Seal) */}
 <div className="flex items-center justify-between px-1">
 <div 
 className="flex items-center gap-3 cursor-pointer"
 onClick={() => handleActionClick("view store profiles")}
 >
 {/* Round Avatar using robust dynamic shop avatar loader */}
 <div className="h-11 w-11 rounded-full border border-border/80 bg-muted/60 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
 <ShopAvatar src={shop.avatar} name={shop.name} />
 </div>

 {/* Name & Handle details */}
 <div className="flex flex-col text-left">
 <span className="font-bold text-foreground hover:text-primary transition-colors text-sm flex items-center gap-1.5 leading-none">
 {shop.name}
 {shop.verified && (
 <span 
 className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-primary text-white text-[8px] font-bold"
 title="Verified Coordinate Coordinates"
 >
 
 </span>
 )}
 </span>
 <span className="text-[10px] text-muted-foreground tracking-wide mt-1 leading-none">@{handleName}</span>
 </div>
 </div>

 {/* Follow Action */}
 <button
 onClick={() => handleActionClick("follow local stores")}
 className="text-[11px] font-bold px-4 py-1.5 rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/10 hover:bg-primary/95 transition-all duration-300 active:scale-95 border border-transparent"
 >
 Follow
 </button>
 </div>

 {/* Cover Image & Map Coordinate overlays */}
 <div 
 className="relative aspect-[4/3] rounded-[24px] overflow-hidden bg-gradient-to-br from-muted/50 to-muted group cursor-pointer shadow-inner"
 onClick={() => handleActionClick("browse active showrooms")}
 >
 <img 
 src={shop.coverUrl} 
 alt={shop.name} 
 className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" 
 />
 
 {/* Radius overlay */}
 <div className="absolute top-3 right-3">
 <span className="bg-background/80 dark:bg-background/90 backdrop-blur-md text-[9px] font-extrabold px-3 py-1 rounded-full text-foreground border border-border/25 shadow-sm">
 {shop.distance} away
 </span>
 </div>

 {/* AI Smart Match percentage overlay */}
 <div className="absolute bottom-3 right-3">
 <span className="bg-primary backdrop-blur-md text-[9px] font-extrabold uppercase px-3 py-1 rounded-full text-primary-foreground shadow-lg flex items-center gap-1">
 <Zap className="h-3 w-3 animate-pulse" />
 {shop.matchScore}% Match
 </span>
 </div>
 </div>

 {/* Card Social Actions Bar using String premium branded custom-icons */}
 <div className="flex items-center gap-5 px-1 pt-1.5">
 <button 
 onClick={() => handleActionClick("like listings")}
 className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-destructive transition-colors group/heart"
 >
 <PremiumHeart className="w-5.5 h-5.5 transition-transform duration-300 group-active/heart:scale-125" />
 <span className="text-[9px] font-bold text-muted-foreground leading-none mt-1">
 {shop.reviews * 4}
 </span>
 </button>

 <button 
 onClick={() => handleActionClick("send direct pitch messages")}
 className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors group/chat"
 >
 <PremiumChatBubble className="w-5.5 h-5.5 transition-transform duration-300 group-hover/chat:scale-105" />
 <span className="text-[9px] font-bold text-muted-foreground leading-none mt-1">
 {shop.reviews}
 </span>
 </button>

 <button 
 onClick={() => handleActionClick("save catalog collections")}
 className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors group/book"
 >
 <PremiumBookmark className="w-5.5 h-5.5" />
 <span className="text-[9px] font-bold text-muted-foreground leading-none mt-1">Save</span>
 </button>
 </div>

 {/* Mini-Catalog Showcase horizontal grid (Click to Pitch) */}
 <div className="px-1.5 py-3 border-y border-border/10">
 <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5 leading-none">
 <Package className="h-3 w-3 text-primary animate-pulse" />
 Catalog Highlights (Click to Pitch)
 </p>
 <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
 {shop.catalog.map((prod, idx) => (
 <button
 key={idx}
 onClick={() => handleActionClick(`pitch order requests for "${prod.name}"`)}
 className="flex items-center gap-2 p-1.5 bg-muted/40 hover:bg-muted/70 rounded-2xl border border-border/20 transition-all text-left shrink-0 active:scale-95 group/prod"
 >
 <div className="h-8 w-8 rounded-full border border-border/30 bg-card overflow-hidden flex items-center justify-center shrink-0">
 <ProductImage src={prod.img} name={prod.name} />
 </div>
 <div className="space-y-0.5 pr-1 text-[10px]">
 <p className="font-semibold text-foreground max-w-[80px] truncate leading-tight group-hover/prod:text-primary transition-colors">{prod.name}</p>
 <p className="font-bold text-muted-foreground leading-none">₦{prod.price.toLocaleString()}</p>
 </div>
 </button>
 ))}
 </div>
 </div>

 {/* Meta descriptions */}
 <div className="px-1 text-left space-y-1.5">
 <p className="text-[9px] font-extrabold text-primary uppercase tracking-widest leading-none">
 {shop.industry}
 </p>
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {shop.tagline}
 </p>
 </div>
 </div>
 );
 })}
 </div>

 </div>
 </section>

 {/* Split Merchant / Shopper Gateway Cards (Shopify Inspired layout) */}
 <section className="py-16 border-t border-border bg-gradient-to-t from-primary/[0.02] via-transparent to-transparent">
 <div className="container px-4 max-w-5xl mx-auto space-y-12">
 
 <div className="text-center space-y-2 max-w-xl mx-auto">
 <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Two Pathways, One Seamless Network</h2>
 <p className="text-xs text-muted-foreground leading-relaxed">
 String connects active shoppers with independent verified sellers, providing modern e-commerce tools for everyone.
 </p>
 </div>

 <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
 {/* Shopper Entry */}
 <div className="p-8 rounded-3xl border border-border/80 bg-card/30 backdrop-blur-xl flex flex-col justify-between space-y-6 hover:border-primary/20 transition-all group">
 <div className="space-y-4">
 <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
 <Users className="h-5 w-5" />
 </div>
 <h3 className="text-lg font-bold">Discover & Order Securely</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Browse verified local stores, click catalog items to pitch orders in real-time, negotiate price parameters, and pay safely using our concentric escrow guarantees.
 </p>
 <div className="space-y-2 text-xs text-muted-foreground pt-1">
 <p className="flex items-center gap-2">
 <span className="text-primary font-bold"></span> Real-time radius mapping search
 </p>
 <p className="flex items-center gap-2">
 <span className="text-primary font-bold"></span> Direct catalog messaging pitches
 </p>
 <p className="flex items-center gap-2">
 <span className="text-primary font-bold"></span> Escrow-locked delivery validation
 </p>
 </div>
 </div>
 <Button asChild className="rounded-xl h-11 w-full font-bold shadow-md shadow-primary/15">
 <Link to="/auth?mode=signup&type=customer">
 Join as Shopper
 <ArrowRight className="ml-1.5 h-4 w-4" />
 </Link>
 </Button>
 </div>

 {/* Merchant Entry */}
 <div className="p-8 rounded-3xl border border-border/80 bg-card/30 backdrop-blur-xl flex flex-col justify-between space-y-6 hover:border-primary/20 transition-all group">
 <div className="space-y-4">
 <div className="h-11 w-11 rounded-2xl bg-yellow-500/15 flex items-center justify-center text-yellow-500 group-hover:scale-105 transition-transform duration-300">
 <Building2 className="h-5 w-5" />
 </div>
 <h3 className="text-lg font-bold">Setup Store & Collect Payouts</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Establish your digital catalog, submit location verification coordinates for a free blue seal, boost search match weights, and clear local payouts with absolute zero-tax fees.
 </p>
 <div className="space-y-2 text-xs text-muted-foreground pt-1">
 <p className="flex items-center gap-2">
 <span className="text-yellow-500 font-bold"></span> Custom product & service catalogs
 </p>
 <p className="flex items-center gap-2">
 <span className="text-yellow-500 font-bold"></span> Free geographic coordinates audit
 </p>
 <p className="flex items-center gap-2">
 <span className="text-yellow-500 font-bold"></span> Gold Elite premium search matching weights
 </p>
 </div>
 </div>
 <Button variant="outline" asChild className="rounded-xl h-11 w-full font-bold hover:bg-primary/5 hover:border-primary/20 transition-all">
 <Link to="/auth?mode=signup&type=business">
 Register My Store
 <ArrowRight className="ml-1.5 h-4 w-4" />
 </Link>
 </Button>
 </div>
 </div>
 </div>
 </section>

 {/* Marketplace Trust banner */}
 <section className="border-t border-border bg-card/10 py-12">
 <div className="container px-4 max-w-5xl mx-auto grid gap-6 md:grid-cols-3 text-center md:text-left">
 <div className="space-y-2 flex flex-col items-center md:items-start">
 <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-1">
 <ShieldCheck className="h-4 w-4" />
 </div>
 <h4 className="font-bold text-xs">Escrow Secured Transactions</h4>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Payments are safely held in concentric escrow. Funds are only cleared once you confirm order delivery.
 </p>
 </div>
 
 <div className="space-y-2 flex flex-col items-center md:items-start">
 <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-1">
 <MapPin className="h-4 w-4" />
 </div>
 <h4 className="font-bold text-xs">Verified Geographic Coordinates</h4>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Every verified storefront completes a physical location audit to ensure absolute catalog authenticity.
 </p>
 </div>

 <div className="space-y-2 flex flex-col items-center md:items-start">
 <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-1">
 <Zap className="h-4 w-4" />
 </div>
 <h4 className="font-bold text-xs">Zero-Tax Platform Payouts</h4>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Independent sellers enjoy complete payout clearance. String charges zero tax cuts or hidden commission deductions.
 </p>
 </div>
 </div>
 </section>

 {/* Footer */}
 <footer className="border-t border-border bg-card/5 py-8 mt-auto text-xs text-muted-foreground">
 <div className="container px-4 max-w-6xl mx-auto flex flex-col items-center justify-between gap-4 sm:flex-row">
 <div className="flex flex-col sm:flex-row items-center gap-3">
 <img src={stringLogoLight} alt="String" className="h-8 w-auto opacity-70 logo-light" />
 <img src={stringLogoDark} alt="String" className="h-8 w-auto opacity-70 logo-dark" />
 <span>© 2026 String Inc. All rights reserved.</span>
 </div>
 <nav className="flex gap-5 font-semibold">
 <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link>
              <Link to="/shipping-policy" className="hover:text-foreground transition-colors">Shipping Policy</Link>
 <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
 <Link to="/contact" className="hover:text-foreground transition-colors">Contact Support</Link>
 </nav>
 </div>
 </footer>
 </main>

 {/* Glassmorphic Promo modal for unregistered guest interactions */}
 <Dialog open={promoOpen} onOpenChange={setPromoOpen}>
 <DialogContent className="max-w-md border border-primary/20 bg-card/95 backdrop-blur-2xl text-foreground rounded-[24px]">
 <DialogHeader className="space-y-2">
 <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
 <ShoppingBag className="h-5 w-5 text-primary" />
 Join the String Network
 </DialogTitle>
 <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
 {promoMessage}
 </DialogDescription>
 </DialogHeader>
 
 <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
 <ShieldAlert className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
 <span>
 String requires active shopper verification to ensure safe coordinate escrow and protect local merchants from spam pitches.
 </span>
 </div>

 <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
 <Button
 variant="outline"
 onClick={() => setPromoOpen(false)}
 className="rounded-xl h-10 text-xs"
 >
 Close
 </Button>
 <Button
 onClick={() => {
 setPromoOpen(false);
 navigate("/auth?mode=signup");
 }}
 className="rounded-xl h-10 text-xs font-bold shadow-md shadow-primary/10"
 >
 Sign Up Now
 <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 
      <BottomNav />
    </div>
 );
}

