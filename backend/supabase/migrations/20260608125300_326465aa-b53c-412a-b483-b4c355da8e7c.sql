
CREATE TABLE public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'MoreHorizontal',
  blurb text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_categories TO authenticated;
GRANT ALL ON public.service_categories TO service_role;

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories readable by all"
  ON public.service_categories FOR SELECT
  USING (true);

CREATE POLICY "categories insert admin/mod"
  ON public.service_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "categories update admin/mod"
  ON public.service_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "categories delete admin"
  ON public.service_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_service_categories_updated
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.service_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL REFERENCES public.service_categories(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_slug, name)
);

GRANT SELECT ON public.service_subcategories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.service_subcategories TO authenticated;
GRANT ALL ON public.service_subcategories TO service_role;

ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcategories readable by all"
  ON public.service_subcategories FOR SELECT
  USING (true);

CREATE POLICY "subcategories insert admin/mod"
  ON public.service_subcategories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "subcategories update admin/mod"
  ON public.service_subcategories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "subcategories delete admin"
  ON public.service_subcategories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_service_subcategories_updated
  BEFORE UPDATE ON public.service_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_subcat_category_slug ON public.service_subcategories(category_slug);

-- Seed from built-in defaults
INSERT INTO public.service_categories (slug, name, icon, blurb, sort_order) VALUES
('home-repair','Home Repair & Maintenance','Wrench','Plumbers, electricians, carpenters and handymen near you.',10),
('cleaning','Cleaning & Home Care','Sparkles','House cleaning, laundry, gardening and fumigation services.',20),
('real-estate','Real Estate & Property','Building2','Brokers, surveyors, builders and property managers.',30),
('beauty','Beauty, Fashion & Personal Care','Scissors','Hairdressers, tailors, makeup artists and stylists.',40),
('transport','Transport, Delivery & Logistics','Truck','Drivers, boda riders, movers and delivery partners.',50),
('automotive','Automotive & Mechanical','Car','Mechanics, panel beaters, tyre and car wash services.',60),
('education','Education, Training & Coaching','GraduationCap','Tutors, instructors, coaches and skills trainers.',70),
('events','Events, Media & Entertainment','Camera','Photographers, DJs, caterers and event planners.',80),
('food','Food, Catering & Hospitality','ChefHat','Caterers, home chefs, bakers and food delivery.',90),
('digital','Digital, Creative & Business','Laptop','Designers, developers, accountants and consultants.',100),
('health','Health, Wellness & Care','HeartPulse','Home nurses, caregivers, trainers and counsellors.',110),
('agriculture','Agriculture, Animals & Outdoor','Sprout','Farm workers, vets, landscapers and irrigation experts.',120),
('other','Other Services','MoreHorizontal','Skilled services that don''t fit other categories.',130)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.service_subcategories (category_slug, name, sort_order) VALUES
('home-repair','Plumbers',10),('home-repair','Electricians',20),('home-repair','Carpenters',30),('home-repair','Painters',40),('home-repair','Masons',50),('home-repair','Welders',60),('home-repair','Roof repair',70),('home-repair','Tile workers',80),('home-repair','Glass & aluminium workers',90),('home-repair','General handymen',100),
('cleaning','House cleaners',10),('cleaning','Office cleaners',20),('cleaning','Laundry services',30),('cleaning','Carpet cleaning',40),('cleaning','Sofa cleaning',50),('cleaning','Compound cleaning',60),('cleaning','Fumigation',70),('cleaning','Waste collection',80),('cleaning','Gardening',90),('cleaning','Home organizing',100),
('real-estate','Real estate brokers',10),('real-estate','Property agents',20),('real-estate','Rental brokers',30),('real-estate','Land brokers',40),('real-estate','Property managers',50),('real-estate','Caretakers',60),('real-estate','Land surveyors',70),('real-estate','Valuers',80),('real-estate','Architects',90),('real-estate','Engineers',100),('real-estate','Builders',110),('real-estate','Site supervisors',120),('real-estate','Interior designers',130),('real-estate','Borehole installers',140),
('beauty','Hairdressers',10),('beauty','Barbers',20),('beauty','Makeup artists',30),('beauty','Nail technicians',40),('beauty','Tailors',50),('beauty','Fashion designers',60),('beauty','Shoemakers',70),('beauty','Skincare specialists',80),('beauty','Bridal styling',90),
('transport','Drivers',10),('transport','Boda riders',20),('transport','Taxi drivers',30),('transport','Truck hire',40),('transport','Delivery riders',50),('transport','Movers',60),('transport','Courier services',70),('transport','Airport pickup',80),('transport','Car hire',90),('transport','Tour drivers',100),
('automotive','Car mechanics',10),('automotive','Motorcycle mechanics',20),('automotive','Car electricians',30),('automotive','Panel beaters',40),('automotive','Spray painters',50),('automotive','Tyre services',60),('automotive','Car wash',70),('automotive','Breakdown & towing',80),('automotive','Spare parts dealers',90),('automotive','Generator repair',100),
('education','Tutors',10),('education','Language teachers',20),('education','Music teachers',30),('education','Computer trainers',40),('education','Driving instructors',50),('education','Business coaches',60),('education','Career coaches',70),('education','Fitness trainers',80),('education','Sports coaches',90),('education','Skills trainers',100),
('events','Photographers',10),('events','Videographers',20),('events','DJs',30),('events','MCs',40),('events','Decorators',50),('events','Caterers',60),('events','Cake bakers',70),('events','Event planners',80),('events','Sound system providers',90),('events','Tent & chair providers',100),
('food','Caterers',10),('food','Home chefs',20),('food','Bakers',30),('food','Juice makers',40),('food','Restaurant services',50),('food','Food delivery',60),('food','Private chefs',70),('food','Event food suppliers',80),('food','Snacks suppliers',90),('food','Waiters for hire',100),
('digital','Graphic designers',10),('digital','Website designers',20),('digital','Social media managers',30),('digital','Content creators',40),('digital','Copywriters',50),('digital','Accountants',60),('digital','Bookkeepers',70),('digital','Business consultants',80),('digital','IT support',90),('digital','Branding specialists',100),
('health','Home care nurses',10),('health','Caregivers',20),('health','Physiotherapists',30),('health','Fitness trainers',40),('health','Nutrition coaches',50),('health','Counsellors',60),('health','First aid trainers',70),('health','Elderly care support',80),('health','Childcare & nannies',90),('health','Wellness coaches',100),
('agriculture','Farm workers',10),('agriculture','Veterinary support',20),('agriculture','Poultry experts',30),('agriculture','Pig farming support',40),('agriculture','Dairy farming support',50),('agriculture','Gardeners',60),('agriculture','Landscapers',70),('agriculture','Fish pond workers',80),('agriculture','Irrigation installers',90),('agriculture','Pest control',100),
('other','Custom services',10)
ON CONFLICT (category_slug, name) DO NOTHING;
