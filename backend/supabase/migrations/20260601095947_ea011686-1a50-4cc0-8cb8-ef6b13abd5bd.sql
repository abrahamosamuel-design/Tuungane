-- =========================================================
-- TUUNGANE CREDITS — PHASE 1 (tables, RLS, functions, seed)
-- =========================================================

-- credit_wallets ------------------------------------------------------------
CREATE TABLE public.credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  starter_credits_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY cw_read_own ON public.credit_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance_admin'));

-- credit_transactions -------------------------------------------------------
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN (
    'starter_credit','admin_added','admin_deducted','purchase_approved',
    'boost_profile','feature_post','urgent_request','priority_response',
    'feature_business_page','feature_opportunity','promote_completed_work',
    'refund','adjustment'
  )),
  amount integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  related_entity_type text,
  related_entity_id text,
  created_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_read_own ON public.credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance_admin'));

-- credit_packages -----------------------------------------------------------
CREATE TABLE public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  amount_ugx integer NOT NULL CHECK (amount_ugx >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_packages TO anon, authenticated;
GRANT ALL ON public.credit_packages TO service_role;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY cp_read_all ON public.credit_packages FOR SELECT USING (true);
CREATE POLICY cp_write_admin ON public.credit_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'));

-- credit_purchase_requests --------------------------------------------------
CREATE TABLE public.credit_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid,
  package_name text NOT NULL,
  credits_requested integer NOT NULL CHECK (credits_requested > 0),
  amount_ugx integer NOT NULL CHECK (amount_ugx >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','rejected','cancelled')),
  payment_reference text,
  admin_note text,
  reviewed_by_admin_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpr_user ON public.credit_purchase_requests(user_id, created_at DESC);
CREATE INDEX idx_cpr_status ON public.credit_purchase_requests(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.credit_purchase_requests TO authenticated;
GRANT ALL ON public.credit_purchase_requests TO service_role;
ALTER TABLE public.credit_purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY cpr_read_own_or_admin ON public.credit_purchase_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'finance_admin'));
CREATE POLICY cpr_insert_own ON public.credit_purchase_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY cpr_cancel_own ON public.credit_purchase_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));
CREATE POLICY cpr_admin_update ON public.credit_purchase_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'));

-- boost_pricing -------------------------------------------------------------
CREATE TABLE public.boost_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_type text NOT NULL,
  label text NOT NULL,
  credits_required integer NOT NULL CHECK (credits_required > 0),
  duration_hours integer NOT NULL CHECK (duration_hours > 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (boost_type, duration_hours)
);
GRANT SELECT ON public.boost_pricing TO anon, authenticated;
GRANT ALL ON public.boost_pricing TO service_role;
ALTER TABLE public.boost_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY bp_read_all ON public.boost_pricing FOR SELECT USING (true);
CREATE POLICY bp_write_admin ON public.boost_pricing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'));

-- boosts --------------------------------------------------------------------
CREATE TABLE public.boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  boost_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  credits_spent integer NOT NULL CHECK (credits_spent >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','cancelled','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boosts_entity ON public.boosts(entity_type, entity_id, status);
CREATE INDEX idx_boosts_user ON public.boosts(user_id, created_at DESC);
CREATE INDEX idx_boosts_active ON public.boosts(status, expires_at);
GRANT SELECT ON public.boosts TO anon, authenticated;
GRANT ALL ON public.boosts TO service_role;
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY b_read_all ON public.boosts FOR SELECT USING (true);
CREATE POLICY b_admin_update ON public.boosts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'));

-- admin_settings ------------------------------------------------------------
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  updated_by_admin_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_settings TO anon, authenticated;
GRANT ALL ON public.admin_settings TO service_role;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY as_read_all ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY as_write_admin ON public.admin_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin'));

-- updated_at triggers -------------------------------------------------------
CREATE TRIGGER trg_cw_updated BEFORE UPDATE ON public.credit_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.credit_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cpr_updated BEFORE UPDATE ON public.credit_purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bp_updated BEFORE UPDATE ON public.boost_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_b_updated BEFORE UPDATE ON public.boosts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Starter credit awarding ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_starter_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  starter_amount integer := 10;
  setting_row jsonb;
  inserted boolean := false;
BEGIN
  SELECT setting_value INTO setting_row FROM public.admin_settings WHERE setting_key = 'starter_credits';
  IF setting_row IS NOT NULL THEN
    starter_amount := COALESCE((setting_row->>'amount')::integer, 10);
  END IF;

  INSERT INTO public.credit_wallets (user_id, balance, starter_credits_awarded)
    VALUES (NEW.id, starter_amount, true)
  ON CONFLICT (user_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted THEN
    INSERT INTO public.credit_transactions (user_id, transaction_type, amount, reason)
      VALUES (NEW.id, 'starter_credit', starter_amount, 'Welcome to Tuungane — starter credits awarded');
    INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, message)
      VALUES (NEW.id, NULL, 'credits_starter', 'credit_wallet', NEW.id::text,
              'Welcome to Tuungane. You have received ' || starter_amount ||
              ' starter credits to explore boosts and visibility tools.');
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_profile_starter_credits
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.award_starter_credits();

-- Spend helper --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_credits(
  _user_id uuid, _amount integer, _tx_type text, _reason text,
  _entity_type text DEFAULT NULL, _entity_id text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_balance integer; tx_id uuid;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF auth.uid() <> _user_id
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'finance_admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT balance INTO current_balance FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance, starter_credits_awarded)
      VALUES (_user_id, 0, true);
    current_balance := 0;
  END IF;
  IF current_balance < _amount THEN RAISE EXCEPTION 'insufficient_credits'; END IF;

  UPDATE public.credit_wallets SET balance = balance - _amount, updated_at = now()
    WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions
    (user_id, transaction_type, amount, reason, related_entity_type, related_entity_id)
    VALUES (_user_id, _tx_type, -_amount, _reason, _entity_type, _entity_id)
    RETURNING id INTO tx_id;
  RETURN tx_id;
END; $$;

-- Admin adjust ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_add_credits(_user_id uuid, _amount integer, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  INSERT INTO public.credit_wallets (user_id, balance, starter_credits_awarded)
    VALUES (_user_id, _amount, true)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.credit_wallets.balance + _amount, updated_at = now();

  INSERT INTO public.credit_transactions
    (user_id, transaction_type, amount, reason, created_by_admin_id)
    VALUES (_user_id, 'admin_added', _amount, _reason, auth.uid());

  PERFORM public.create_notification(_user_id, auth.uid(), 'credits_admin_added',
    'credit_wallet', _user_id::text,
    'An admin added ' || _amount || ' Tuungane Credits to your wallet');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_deduct_credits(_user_id uuid, _amount integer, _reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_balance integer;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  SELECT balance INTO current_balance FROM public.credit_wallets WHERE user_id = _user_id FOR UPDATE;
  IF current_balance IS NULL OR current_balance < _amount THEN RAISE EXCEPTION 'insufficient_credits'; END IF;

  UPDATE public.credit_wallets SET balance = balance - _amount, updated_at = now() WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions
    (user_id, transaction_type, amount, reason, created_by_admin_id)
    VALUES (_user_id, 'admin_deducted', -_amount, _reason, auth.uid());
  PERFORM public.create_notification(_user_id, auth.uid(), 'credits_admin_deducted',
    'credit_wallet', _user_id::text,
    'An admin deducted ' || _amount || ' Tuungane Credits from your wallet');
END; $$;

-- Purchase request approve / reject -----------------------------------------
CREATE OR REPLACE FUNCTION public.approve_purchase_request(_request_id uuid, _payment_reference text DEFAULT NULL, _admin_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO req FROM public.credit_purchase_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'request not pending'; END IF;

  UPDATE public.credit_purchase_requests
    SET status = 'paid',
        payment_reference = COALESCE(_payment_reference, payment_reference),
        admin_note = COALESCE(_admin_note, admin_note),
        reviewed_by_admin_id = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = _request_id;

  INSERT INTO public.credit_wallets (user_id, balance, starter_credits_awarded)
    VALUES (req.user_id, req.credits_requested, true)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.credit_wallets.balance + req.credits_requested, updated_at = now();

  INSERT INTO public.credit_transactions
    (user_id, transaction_type, amount, reason, related_entity_type, related_entity_id, created_by_admin_id)
    VALUES (req.user_id, 'purchase_approved', req.credits_requested,
            'Purchase approved: ' || req.package_name,
            'credit_purchase_request', req.id::text, auth.uid());

  PERFORM public.create_notification(req.user_id, auth.uid(),
    'credits_purchase_approved', 'credit_purchase_request', req.id::text,
    'Your purchase of ' || req.credits_requested || ' Tuungane Credits was approved');
END; $$;

CREATE OR REPLACE FUNCTION public.reject_purchase_request(_request_id uuid, _admin_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE req record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance_admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO req FROM public.credit_purchase_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF req.status <> 'pending' THEN RAISE EXCEPTION 'request not pending'; END IF;

  UPDATE public.credit_purchase_requests
    SET status = 'rejected', admin_note = COALESCE(_admin_note, admin_note),
        reviewed_by_admin_id = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = _request_id;

  PERFORM public.create_notification(req.user_id, auth.uid(),
    'credits_purchase_rejected', 'credit_purchase_request', req.id::text,
    'Your purchase request was rejected' ||
      CASE WHEN _admin_note IS NOT NULL AND _admin_note <> '' THEN ': ' || _admin_note ELSE '' END);
END; $$;

-- Notify on purchase request submitted --------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_purchase_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, target_type, target_id, message)
    VALUES (NEW.user_id, NULL, 'credits_purchase_submitted',
            'credit_purchase_request', NEW.id::text,
            'Your purchase request for ' || NEW.credits_requested || ' credits was submitted');
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_cpr_submitted
  AFTER INSERT ON public.credit_purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_purchase_request();

-- Seed ----------------------------------------------------------------------
INSERT INTO public.credit_wallets (user_id, balance, starter_credits_awarded)
SELECT id, 0, true FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.admin_settings (setting_key, setting_value)
  VALUES ('starter_credits', jsonb_build_object('amount', 10))
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.credit_packages (name, credits, amount_ugx, sort_order) VALUES
  ('Starter 10', 10, 5000, 1),
  ('Boost 25', 25, 10000, 2),
  ('Pro 50', 50, 18000, 3),
  ('Power 100', 100, 30000, 4);

INSERT INTO public.boost_pricing (boost_type, label, credits_required, duration_hours, sort_order) VALUES
  ('boost_profile', 'Boosted Provider — 24 hours', 3, 24, 1),
  ('boost_profile', 'Boosted Provider — 3 days', 7, 72, 2),
  ('boost_profile', 'Boosted Provider — 7 days', 10, 168, 3),
  ('feature_post', 'Featured Post', 5, 168, 4),
  ('urgent_request', 'Urgent Request', 5, 72, 5),
  ('priority_response', 'Priority Response', 2, 168, 6),
  ('feature_business_page', 'Featured Business — 7 days', 15, 168, 7),
  ('feature_business_page', 'Featured Business — 30 days', 40, 720, 8),
  ('feature_opportunity', 'Featured Opportunity', 10, 168, 9),
  ('promote_completed_work', 'Promoted Completed Work', 5, 168, 10);