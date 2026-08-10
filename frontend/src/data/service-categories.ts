// Auto-generated from Tuungane_Services_Measurement_Units_Expanded.xlsx

export interface ServiceEntry {
  service: string;
  unit: string;
}

export interface CategoryData {
  slug: string;
  name: string;
  icon: string;
  services: ServiceEntry[];
}

export const SERVICE_CATEGORIES: CategoryData[] = [
  { slug:"household", name:"Household", icon:"🏠", services:[
    {service:"Painting",unit:"per m² / per room"},{service:"Tiling",unit:"per m²"},
    {service:"Plumbing",unit:"per job / per fixture"},{service:"Electrical installation",unit:"per point"},
    {service:"House cleaning",unit:"per house / per hour"},{service:"Pest control",unit:"per house / per m²"},
    {service:"Furniture assembly",unit:"per item / per job"},{service:"Curtain & blinds installation",unit:"per window / per set"},
    {service:"AC installation & servicing",unit:"per unit"},{service:"Water tank installation",unit:"per tank / per job"},
    {service:"Borehole drilling & repair",unit:"per meter / per job"},{service:"Generator installation & repair",unit:"per unit / per job"},
    {service:"Door & lock repair",unit:"per door / per lock"},{service:"Ceiling & gypsum work",unit:"per m²"},
    {service:"Wallpaper installation",unit:"per m²"},
  ]},
  { slug:"cleaning", name:"Cleaning & Hygiene", icon:"🧹", services:[
    {service:"Deep cleaning",unit:"per house / per room"},{service:"Office cleaning",unit:"per office / per hour"},
    {service:"Carpet cleaning",unit:"per m² / per room"},{service:"Window cleaning",unit:"per window / per house"},
    {service:"Sofa & upholstery cleaning",unit:"per seat / per item"},{service:"Post-construction cleaning",unit:"per house / per m²"},
    {service:"Septic tank emptying",unit:"per tank / per trip"},{service:"Garbage collection",unit:"per bag / per month"},
  ]},
  { slug:"laundry", name:"Laundry", icon:"👕", services:[
    {service:"Laundry washing",unit:"per basket / per kg"},{service:"Dry cleaning",unit:"per item"},
    {service:"Ironing",unit:"per item"},{service:"Shoe cleaning",unit:"per pair"},
    {service:"Curtain cleaning",unit:"per set / per kg"},
  ]},
  { slug:"beauty", name:"Personal Care & Beauty", icon:"💇", services:[
    {service:"Haircut",unit:"per person"},{service:"Hair braiding / plaiting",unit:"per style / per person"},
    {service:"Hair treatment / conditioning",unit:"per session"},{service:"Barber services",unit:"per person"},
    {service:"Manicure",unit:"per session"},{service:"Pedicure",unit:"per session"},
    {service:"Makeup",unit:"per session / per event"},{service:"Massage",unit:"per hour"},
    {service:"Facial / skincare",unit:"per session"},{service:"Nail art / extensions",unit:"per session"},
    {service:"Waxing",unit:"per area"},{service:"Spa package",unit:"per package / per hour"},
  ]},
  { slug:"automotive", name:"Automotive", icon:"🚗", services:[
    {service:"Car wash",unit:"per vehicle"},{service:"Car detailing",unit:"per vehicle"},
    {service:"Mechanic service",unit:"per job / per hour"},{service:"Car rental",unit:"per day"},
    {service:"Tyre repair / replacement",unit:"per tyre"},{service:"Battery replacement",unit:"per battery / per job"},
    {service:"Oil change & servicing",unit:"per vehicle / per service"},{service:"Car body repair / panel beating",unit:"per panel / per job"},
    {service:"Car spray painting",unit:"per panel / per vehicle"},{service:"Motorcycle repair",unit:"per job / per hour"},
    {service:"Motorcycle wash",unit:"per motorcycle"},{service:"Towing service",unit:"per km / per trip"},
  ]},
  { slug:"transport", name:"Logistics & Transport", icon:"🚚", services:[
    {service:"Parcel delivery",unit:"per km / per package"},{service:"Moving services",unit:"per trip"},
    {service:"Courier services",unit:"per package / weight"},{service:"Boda boda transport",unit:"per trip / per km"},
    {service:"Taxi / private hire",unit:"per trip / per hour"},{service:"Truck / lorry hire",unit:"per trip / per day"},
    {service:"School transport",unit:"per month / per child"},{service:"Airport transfer",unit:"per trip"},
    {service:"Furniture delivery",unit:"per trip / per item"},
  ]},
  { slug:"construction", name:"Construction", icon:"🏗️", services:[
    {service:"Masonry",unit:"per m² / per block"},{service:"Carpentry",unit:"per job"},
    {service:"Roofing",unit:"per m²"},{service:"Welding & metal fabrication",unit:"per job / per kg"},
    {service:"Concrete works",unit:"per m³ / per m²"},{service:"Plastering",unit:"per m²"},
    {service:"Flooring (screed / epoxy)",unit:"per m²"},{service:"Scaffolding hire",unit:"per day / per set"},
    {service:"Building inspection",unit:"per property / per visit"},{service:"Quantity surveying",unit:"per project"},
  ]},
  { slug:"agriculture", name:"Agriculture & Outdoor", icon:"🌱", services:[
    {service:"Land digging",unit:"per acre"},{service:"Lawn mowing",unit:"per compound"},
    {service:"Tree cutting",unit:"per tree"},{service:"Landscaping",unit:"per m² / per job"},
    {service:"Garden maintenance",unit:"per visit / per month"},{service:"Irrigation system installation",unit:"per job / per acre"},
    {service:"Poultry / livestock care",unit:"per day / per animal"},{service:"Farm labour",unit:"per day / per acre"},
    {service:"Fence construction",unit:"per meter / per job"},{service:"Greenhouse installation",unit:"per structure / per m²"},
  ]},
  { slug:"digital", name:"Digital & Tech", icon:"💻", services:[
    {service:"Graphic design",unit:"per project"},{service:"Website development",unit:"per project"},
    {service:"IT support",unit:"per hour"},{service:"Mobile app development",unit:"per project"},
    {service:"Social media management",unit:"per month"},{service:"Video editing",unit:"per project / per minute"},
    {service:"CCTV installation",unit:"per camera / per job"},{service:"Network / WiFi installation",unit:"per job / per point"},
    {service:"Computer repair",unit:"per device / per job"},{service:"Phone repair",unit:"per device / per job"},
    {service:"Software installation & training",unit:"per session / per license"},
  ]},
  { slug:"food", name:"Hospitality & Food", icon:"🍽️", services:[
    {service:"Catering",unit:"per person"},{service:"Baking",unit:"per kg"},
    {service:"Hotel accommodation",unit:"per night"},{service:"Home cooking / personal chef",unit:"per meal / per day"},
    {service:"Event catering",unit:"per person / per event"},{service:"Cake making",unit:"per cake / per kg"},
    {service:"Juice & smoothie bar (mobile)",unit:"per event / per litre"},{service:"Restaurant reservation / booking",unit:"per booking"},
  ]},
  { slug:"business", name:"Business & Professional", icon:"💼", services:[
    {service:"POS system",unit:"per month"},{service:"Advertising",unit:"per campaign"},
    {service:"Accounting & bookkeeping",unit:"per month / per job"},{service:"Legal consultation",unit:"per hour / per case"},
    {service:"Business consulting",unit:"per hour / per project"},{service:"Secretarial services",unit:"per hour / per document"},
    {service:"Printing & photocopying",unit:"per page / per job"},{service:"Signage & branding",unit:"per piece / per project"},
    {service:"Market research",unit:"per project"},{service:"Recruitment / HR support",unit:"per placement / per hour"},
  ]},
  { slug:"real-estate", name:"Real Estate", icon:"🏢", services:[
    {service:"Property rent",unit:"per month"},{service:"Property sale",unit:"per property"},
    {service:"Property management",unit:"per month / % of rent"},{service:"Valuation",unit:"per property"},
    {service:"Land surveying",unit:"per acre / per plot"},{service:"Property viewing / agency",unit:"per viewing / % commission"},
    {service:"Title deed processing support",unit:"per property"},{service:"Rental listing photography",unit:"per property"},
  ]},
  { slug:"education", name:"Education & Training", icon:"📚", services:[
    {service:"Home tutoring",unit:"per hour / per subject"},{service:"Driving lessons",unit:"per hour / per package"},
    {service:"Music lessons",unit:"per hour"},{service:"Language lessons",unit:"per hour / per course"},
    {service:"Computer skills training",unit:"per hour / per course"},{service:"Vocational skills training",unit:"per course / per day"},
    {service:"Exam preparation",unit:"per session / per package"},{service:"Mentorship session",unit:"per hour / per package"},
  ]},
  { slug:"events", name:"Events & Media", icon:"🎉", services:[
    {service:"Event planning",unit:"per event / % of budget"},{service:"Photography",unit:"per hour / per event"},
    {service:"Videography",unit:"per hour / per event"},{service:"DJ services",unit:"per hour / per event"},
    {service:"MC / Hosting",unit:"per hour / per event"},{service:"Decoration & setup",unit:"per event / per theme"},
    {service:"Tent & chair hire",unit:"per set / per day"},{service:"Sound system hire",unit:"per day / per event"},
    {service:"Live streaming",unit:"per hour / per event"},{service:"Photo booth",unit:"per hour / per event"},
  ]},
  { slug:"solar", name:"Solar & Energy", icon:"☀️", services:[
    {service:"Solar panel installation",unit:"per kW / per system"},{service:"Solar battery installation",unit:"per battery / per system"},
    {service:"Inverter installation & repair",unit:"per unit"},{service:"Solar water heater installation",unit:"per system"},
    {service:"Energy audit",unit:"per property"},{service:"Generator servicing",unit:"per unit / per service"},
  ]},
  { slug:"health", name:"Health & Wellness", icon:"🏥", services:[
    {service:"First aid training",unit:"per person / per course"},{service:"Home nursing support",unit:"per visit / per day"},
    {service:"Physiotherapy (home)",unit:"per session"},{service:"Nutrition consultation",unit:"per session"},
    {service:"Fitness training / personal trainer",unit:"per session / per month"},{service:"Yoga / wellness class",unit:"per session / per package"},
  ]},
  { slug:"security", name:"Security & Safety", icon:"🔒", services:[
    {service:"Security guard services",unit:"per shift / per month"},{service:"Alarm system installation",unit:"per system / per point"},
    {service:"CCTV monitoring",unit:"per month"},{service:"Fire safety equipment supply & install",unit:"per unit / per job"},
    {service:"Access control installation",unit:"per door / per system"},
  ]},
  { slug:"fashion", name:"Fashion & Tailoring", icon:"👗", services:[
    {service:"Tailoring / dressmaking",unit:"per garment"},{service:"Alterations & repairs",unit:"per item"},
    {service:"Custom design (bespoke)",unit:"per garment / per design"},{service:"Embroidery",unit:"per design / per item"},
    {service:"Shoe repair",unit:"per pair"},{service:"Bag making",unit:"per piece"},
  ]},
];
