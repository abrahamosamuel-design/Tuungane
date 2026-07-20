export interface Provider {
  id: string;
  name: string;
  businessName?: string;
  categorySlug: string;
  subcategory: string;
  bio: string;
  district: string;
  town: string;
  area: string;
  areasServed: string[];
  yearsExperience: number;
  availability: "Available now" | "Busy" | "Away";
  phone: string;
  whatsapp: string;
  email?: string;
  rating: number;
  reviewsCount: number;
  followers: number;
  likes: number;
  verified: "verified" | "pending" | "none" | "featured";
  avatarSeed: string;
  portfolio: { id: string; caption: string; seed: string; likes: number }[];
}

const seed = (s: string) => `https://images.unsplash.com/photo-${s}?w=600&q=70&auto=format&fit=crop`;
const avatar = (s: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s)}&backgroundColor=1e3a8a,f97316,16a34a&fontFamily=Plus%20Jakarta%20Sans`;

export const providers: Provider[] = [
  {
    id: "p1",
    name: "Joseph Mukasa",
    businessName: "Mukasa Plumbing Works",
    categorySlug: "home-repair",
    subcategory: "Plumbers",
    bio: "Licensed plumber with 12 years of experience in residential and commercial installations across Wakiso.",
    district: "Wakiso", town: "Entebbe", area: "Katabi",
    areasServed: ["Entebbe", "Katabi", "Kitoro", "Abayita Ababiri"],
    yearsExperience: 12, availability: "Available now",
    phone: "+256 772 123 456", whatsapp: "+256772123456",
    rating: 4.8, reviewsCount: 142, followers: 320, likes: 980,
    verified: "verified", avatarSeed: "Joseph Mukasa",
    portfolio: [
      { id: "po1", caption: "New kitchen installation in Entebbe", seed: "1581094794329-c8112a89af12", likes: 48 },
      { id: "po2", caption: "Bathroom remodel — Katabi", seed: "1620626011761-996317b8d101", likes: 32 },
    ],
  },
  {
    id: "p2",
    name: "Sarah Nakato",
    businessName: "Glow by Sarah",
    categorySlug: "beauty",
    subcategory: "Makeup artists",
    bio: "Bridal and event makeup artist. Trained in Nairobi. Mobile service across greater Kampala.",
    district: "Kampala", town: "Kampala", area: "Ntinda",
    areasServed: ["Ntinda", "Naalya", "Kira", "Bukoto"],
    yearsExperience: 6, availability: "Available now",
    phone: "+256 701 555 222", whatsapp: "+256701555222",
    rating: 4.9, reviewsCount: 89, followers: 540, likes: 1820,
    verified: "featured", avatarSeed: "Sarah Nakato",
    portfolio: [
      { id: "po3", caption: "Bridal look — Serena wedding", seed: "1560869713-da86bd4f31c4", likes: 120 },
      { id: "po4", caption: "Editorial photoshoot", seed: "1522335789203-aaae31eb7e07", likes: 78 },
    ],
  },
  {
    id: "p3",
    name: "Daniel Okello",
    categorySlug: "automotive",
    subcategory: "Car mechanics",
    bio: "Trusted mechanic specialising in Toyota and Subaru. Home visits across Mukono and Kampala.",
    district: "Mukono", town: "Mukono", area: "Seeta",
    areasServed: ["Seeta", "Mukono", "Namugongo", "Kireka"],
    yearsExperience: 9, availability: "Busy",
    phone: "+256 752 888 111", whatsapp: "+256752888111",
    rating: 4.6, reviewsCount: 67, followers: 210, likes: 540,
    verified: "verified", avatarSeed: "Daniel Okello",
    portfolio: [{ id: "po5", caption: "Engine rebuild — Subaru Forester", seed: "1486262715619-67b85e0b08d3", likes: 22 }],
  },
  {
    id: "p4",
    name: "Patience Achieng",
    businessName: "Achieng Tailoring House",
    categorySlug: "beauty",
    subcategory: "Tailors",
    bio: "Custom tailoring for women and men. Specialising in African print and corporate wear.",
    district: "Wakiso", town: "Kira", area: "Bulindo",
    areasServed: ["Kira", "Bulindo", "Namugongo"],
    yearsExperience: 8, availability: "Available now",
    phone: "+256 705 333 999", whatsapp: "+256705333999",
    rating: 4.7, reviewsCount: 54, followers: 180, likes: 410,
    verified: "verified", avatarSeed: "Patience Achieng",
    portfolio: [{ id: "po6", caption: "Bespoke kitenge gown", seed: "1558769132-cb1aea458c5e", likes: 65 }],
  },
  {
    id: "p5",
    name: "Brian Ssempijja",
    categorySlug: "digital",
    subcategory: "Website designers",
    bio: "Freelance web designer building modern sites for SMEs in Uganda. Shopify, Webflow, custom React.",
    district: "Kampala", town: "Kampala", area: "Bukoto",
    areasServed: ["Remote", "Kampala", "Entebbe"],
    yearsExperience: 5, availability: "Available now",
    phone: "+256 778 444 222", whatsapp: "+256778444222",
    rating: 4.9, reviewsCount: 31, followers: 96, likes: 220,
    verified: "featured", avatarSeed: "Brian Ssempijja",
    portfolio: [{ id: "po7", caption: "E-commerce site for boutique", seed: "1467232004584-a241de8bcf5d", likes: 40 }],
  },
  {
    id: "p6",
    name: "Grace Namuli",
    businessName: "Namuli Catering",
    categorySlug: "food",
    subcategory: "Caterers",
    bio: "Event catering for weddings, kwanjulas and corporate functions. From 50 to 500 guests.",
    district: "Wakiso", town: "Entebbe", area: "Kitoro",
    areasServed: ["Entebbe", "Kampala", "Wakiso"],
    yearsExperience: 11, availability: "Available now",
    phone: "+256 772 909 808", whatsapp: "+256772909808",
    rating: 4.8, reviewsCount: 76, followers: 280, likes: 690,
    verified: "verified", avatarSeed: "Grace Namuli",
    portfolio: [{ id: "po8", caption: "Wedding buffet for 300 guests", seed: "1555244162-803834f70033", likes: 88 }],
  },
  {
    id: "p7",
    name: "Robert Kiprotich",
    categorySlug: "transport",
    subcategory: "Drivers",
    bio: "Professional driver and tour guide. Safari trips, airport transfers and corporate driving.",
    district: "Kampala", town: "Kampala", area: "Najjera",
    areasServed: ["Kampala", "Entebbe", "Jinja", "Nationwide"],
    yearsExperience: 14, availability: "Available now",
    phone: "+256 701 222 333", whatsapp: "+256701222333",
    rating: 4.9, reviewsCount: 112, followers: 410, likes: 870,
    verified: "verified", avatarSeed: "Robert Kiprotich",
    portfolio: [{ id: "po9", caption: "Tour van — ready for safari", seed: "1502877338535-766e1452684a", likes: 30 }],
  },
  {
    id: "p8",
    name: "Aisha Namaganda",
    categorySlug: "cleaning",
    subcategory: "House cleaners",
    bio: "Professional home cleaning with a vetted team. Weekly, fortnightly and one-off deep cleans.",
    district: "Wakiso", town: "Kira", area: "Kirinya",
    areasServed: ["Kira", "Bweyogerere", "Namugongo"],
    yearsExperience: 4, availability: "Available now",
    phone: "+256 752 100 200", whatsapp: "+256752100200",
    rating: 4.6, reviewsCount: 38, followers: 90, likes: 150,
    verified: "pending", avatarSeed: "Aisha Namaganda",
    portfolio: [{ id: "po10", caption: "Spotless living room", seed: "1583847268964-b28dc8f51f92", likes: 18 }],
  },
];

export const getProvider = (id: string) => providers.find((p) => p.id === id);
export const providersByCategory = (slug: string) => providers.filter((p) => p.categorySlug === slug);
export const featuredProviders = () => providers.filter((p) => p.verified === "featured");
