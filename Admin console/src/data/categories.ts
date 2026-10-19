export interface ServiceCategory {
  slug: string;
  name: string;
  icon: string;
  blurb: string;
  subcategories: string[];
}

export const categories: ServiceCategory[] = [
  {
    slug: "home-repair",
    name: "Home Repair & Maintenance",
    icon: "Wrench",
    blurb: "Plumbers, electricians, carpenters and handymen near you.",
    subcategories: ["Plumbers", "Electricians", "Carpenters", "Painters", "Masons", "Welders", "Roof repair", "Tile workers", "Glass & aluminium workers", "General handymen"],
  },
  {
    slug: "cleaning",
    name: "Cleaning & Home Care",
    icon: "Sparkles",
    blurb: "House cleaning, laundry, gardening and fumigation services.",
    subcategories: ["House cleaners", "Office cleaners", "Laundry services", "Carpet cleaning", "Sofa cleaning", "Compound cleaning", "Fumigation", "Waste collection", "Gardening", "Home organizing"],
  },
  {
    slug: "real-estate",
    name: "Real Estate & Property",
    icon: "Building2",
    blurb: "Brokers, surveyors, builders and property managers.",
    subcategories: ["Real estate brokers", "Property agents", "Rental brokers", "Land brokers", "Property managers", "Caretakers", "Land surveyors", "Valuers", "Architects", "Engineers", "Builders", "Site supervisors", "Interior designers", "Borehole installers"],
  },
  {
    slug: "beauty",
    name: "Beauty, Fashion & Personal Care",
    icon: "Scissors",
    blurb: "Hairdressers, tailors, makeup artists and stylists.",
    subcategories: ["Hairdressers", "Barbers", "Makeup artists", "Nail technicians", "Tailors", "Fashion designers", "Shoemakers", "Skincare specialists", "Bridal styling"],
  },
  {
    slug: "transport",
    name: "Transport, Delivery & Logistics",
    icon: "Truck",
    blurb: "Drivers, boda riders, movers and delivery partners.",
    subcategories: ["Drivers", "Boda riders", "Taxi drivers", "Truck hire", "Delivery riders", "Movers", "Courier services", "Airport pickup", "Car hire", "Tour drivers"],
  },
  {
    slug: "automotive",
    name: "Automotive & Mechanical",
    icon: "Car",
    blurb: "Mechanics, panel beaters, tyre and car wash services.",
    subcategories: ["Car mechanics", "Motorcycle mechanics", "Car electricians", "Panel beaters", "Spray painters", "Tyre services", "Car wash", "Breakdown & towing", "Spare parts dealers", "Generator repair"],
  },
  {
    slug: "education",
    name: "Education, Training & Coaching",
    icon: "GraduationCap",
    blurb: "Tutors, instructors, coaches and skills trainers.",
    subcategories: ["Tutors", "Language teachers", "Music teachers", "Computer trainers", "Driving instructors", "Business coaches", "Career coaches", "Fitness trainers", "Sports coaches", "Skills trainers"],
  },
  {
    slug: "events",
    name: "Events, Media & Entertainment",
    icon: "Camera",
    blurb: "Photographers, DJs, caterers and event planners.",
    subcategories: ["Photographers", "Videographers", "DJs", "MCs", "Decorators", "Caterers", "Cake bakers", "Event planners", "Sound system providers", "Tent & chair providers"],
  },
  {
    slug: "food",
    name: "Food, Catering & Hospitality",
    icon: "ChefHat",
    blurb: "Caterers, home chefs, bakers and food delivery.",
    subcategories: ["Caterers", "Home chefs", "Bakers", "Juice makers", "Restaurant services", "Food delivery", "Private chefs", "Event food suppliers", "Snacks suppliers", "Waiters for hire"],
  },
  {
    slug: "digital",
    name: "Digital, Creative & Business",
    icon: "Laptop",
    blurb: "Designers, developers, accountants and consultants.",
    subcategories: ["Graphic designers", "Website designers", "Social media managers", "Content creators", "Copywriters", "Accountants", "Bookkeepers", "Business consultants", "IT support", "Branding specialists"],
  },
  {
    slug: "health",
    name: "Health, Wellness & Care",
    icon: "HeartPulse",
    blurb: "Home nurses, caregivers, trainers and counsellors.",
    subcategories: ["Home care nurses", "Caregivers", "Physiotherapists", "Fitness trainers", "Nutrition coaches", "Counsellors", "First aid trainers", "Elderly care support", "Childcare & nannies", "Wellness coaches"],
  },
  {
    slug: "agriculture",
    name: "Agriculture, Animals & Outdoor",
    icon: "Sprout",
    blurb: "Farm workers, vets, landscapers and irrigation experts.",
    subcategories: ["Farm workers", "Veterinary support", "Poultry experts", "Pig farming support", "Dairy farming support", "Gardeners", "Landscapers", "Fish pond workers", "Irrigation installers", "Pest control"],
  },
  {
    slug: "other",
    name: "Other Services",
    icon: "MoreHorizontal",
    blurb: "Skilled services that don't fit other categories.",
    subcategories: ["Custom services"],
  },
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
