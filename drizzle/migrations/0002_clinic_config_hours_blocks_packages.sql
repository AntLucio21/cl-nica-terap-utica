ALTER TABLE public.clinic_settings
  ADD COLUMN default_price numeric NOT NULL DEFAULT 100,
  ADD COLUMN default_duration_min integer NOT NULL DEFAULT 60,
  ADD COLUMN interval_min integer NOT NULL DEFAULT 0,
  ADD COLUMN reminder_hours_before integer NOT NULL DEFAULT 4,
  ADD COLUMN cancel_notice_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN cancel_charge_pct integer NOT NULL DEFAULT 0 CHECK (cancel_charge_pct BETWEEN 0 AND 100),
  ADD COLUMN no_show_charge_pct integer NOT NULL DEFAULT 100 CHECK (no_show_charge_pct BETWEEN 0 AND 100),
  ADD COLUMN payment_methods text[] NOT NULL DEFAULT '{pix,dinheiro,cartao}',
  ADD COLUMN pix_key text NOT NULL DEFAULT '',
  ADD COLUMN clinic_name text NOT NULL DEFAULT 'Sereno',
  ADD COLUMN clinic_phone text NOT NULL DEFAULT '',
  ADD COLUMN logo_url text NOT NULL DEFAULT '',
  ADD COLUMN reception_can_see_financials boolean NOT NULL DEFAULT true,
  ADD COLUMN reminder_template text NOT NULL DEFAULT 'Olá, {nome}! Lembrando da sua sessão hoje às {horario}. Até logo!',
  ADD COLUMN billing_template text NOT NULL DEFAULT 'Olá, {nome}! Passando para lembrar do pagamento da sessão de {data} no valor de {valor}. Segue o Pix: {pix}';

UPDATE public.clinic_settings SET no_show_charge_pct = CASE WHEN charge_no_show THEN 100 ELSE 0 END WHERE id = 1;
COMMENT ON COLUMN public.clinic_settings.charge_no_show IS 'DEPRECATED: replaced by no_show_charge_pct';

DROP POLICY "Staff read settings" ON public.clinic_settings;
CREATE POLICY "Therapist reads settings" ON public.clinic_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'terapeuta'));

CREATE TABLE public.clinic_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CHECK (end_time > start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_hours TO authenticated;
GRANT ALL ON public.clinic_hours TO service_role;
ALTER TABLE public.clinic_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read hours" ON public.clinic_hours FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Therapist manages hours" ON public.clinic_hours FOR ALL TO authenticated USING (has_role(auth.uid(), 'terapeuta')) WITH CHECK (has_role(auth.uid(), 'terapeuta'));

CREATE TABLE public.clinic_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text NOT NULL DEFAULT '',
  CHECK (ends_at > starts_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_blocks TO authenticated;
GRANT ALL ON public.clinic_blocks TO service_role;
ALTER TABLE public.clinic_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read blocks" ON public.clinic_blocks FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "Therapist manages blocks" ON public.clinic_blocks FOR ALL TO authenticated USING (has_role(auth.uid(), 'terapeuta')) WITH CHECK (has_role(auth.uid(), 'terapeuta'));

CREATE TABLE public.patient_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  name text NOT NULL,
  total_sessions integer NOT NULL CHECK (total_sessions > 0),
  used_sessions integer NOT NULL DEFAULT 0 CHECK (used_sessions >= 0),
  total_price numeric NOT NULL DEFAULT 0,
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  expires_on date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_packages TO authenticated;
GRANT ALL ON public.patient_packages TO service_role;
ALTER TABLE public.patient_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage packages" ON public.patient_packages FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

ALTER TABLE public.sessions ADD COLUMN cancelled_at timestamptz;

CREATE OR REPLACE FUNCTION public.reception_can_see_financials() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT reception_can_see_financials FROM public.clinic_settings WHERE id = 1), true)
$$;
GRANT EXECUTE ON FUNCTION public.reception_can_see_financials() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_session_cancelled_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelada' AND OLD.status IS DISTINCT FROM 'cancelada' THEN
    NEW.cancelled_at := now();
  ELSIF NEW.status IS DISTINCT FROM 'cancelada' THEN
    NEW.cancelled_at := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER session_cancelled_at BEFORE UPDATE OF status ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_session_cancelled_at();

CREATE OR REPLACE FUNCTION public.enforce_session_time() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start_local timestamp;
  v_end_local timestamp;
  v_dow integer;
  v_interval integer;
BEGIN
  IF NEW.status = 'cancelada' THEN RETURN NEW; END IF;
  v_start_local := NEW.starts_at AT TIME ZONE 'America/Fortaleza';
  v_end_local := (NEW.starts_at + make_interval(mins => NEW.duration_min)) AT TIME ZONE 'America/Fortaleza';
  IF EXISTS (SELECT 1 FROM public.clinic_blocks b WHERE NEW.starts_at < b.ends_at AND (NEW.starts_at + make_interval(mins => NEW.duration_min)) > b.starts_at) THEN
    RAISE EXCEPTION 'Este horário está bloqueado (férias, feriado ou evento).' USING ERRCODE = '23P01';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clinic_hours) THEN
    v_dow := EXTRACT(ISODOW FROM v_start_local);
    IF NOT EXISTS (SELECT 1 FROM public.clinic_hours h WHERE h.weekday = v_dow AND h.start_time <= v_start_local::time AND h.end_time >= v_end_local::time) THEN
      RAISE EXCEPTION 'Fora do horário de atendimento configurado.' USING ERRCODE = '23P01';
    END IF;
  END IF;
  SELECT interval_min INTO v_interval FROM public.clinic_settings WHERE id = 1;
  IF coalesce(v_interval, 0) > 0 AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id IS DISTINCT FROM NEW.id AND s.status <> 'cancelada'
      AND s.starts_at < NEW.starts_at + make_interval(mins => NEW.duration_min + v_interval)
      AND s.starts_at + make_interval(mins => s.duration_min + v_interval) > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'Respeite o intervalo de % minutos entre sessões.', v_interval USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER session_time_rules BEFORE INSERT OR UPDATE OF starts_at, duration_min, status ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.enforce_session_time();

CREATE OR REPLACE FUNCTION public.consume_package_on_realizada() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pkg uuid;
BEGIN
  IF NEW.status = 'realizada' AND OLD.status IS DISTINCT FROM 'realizada' THEN
    SELECT id INTO v_pkg FROM public.patient_packages
    WHERE patient_id = NEW.patient_id AND active AND starts_on <= CURRENT_DATE
      AND (expires_on IS NULL OR expires_on >= CURRENT_DATE) AND used_sessions < total_sessions
    ORDER BY expires_on ASC NULLS LAST LIMIT 1 FOR UPDATE;
    IF v_pkg IS NOT NULL THEN
      UPDATE public.patient_packages SET used_sessions = used_sessions + 1,
        active = (used_sessions + 1 < total_sessions) WHERE id = v_pkg;
    END IF;
  ELSIF OLD.status = 'realizada' AND NEW.status IS DISTINCT FROM 'realizada' THEN
    SELECT id INTO v_pkg FROM public.patient_packages
    WHERE patient_id = NEW.patient_id AND used_sessions > 0
    ORDER BY expires_on DESC NULLS LAST LIMIT 1 FOR UPDATE;
    IF v_pkg IS NOT NULL THEN
      UPDATE public.patient_packages SET used_sessions = used_sessions - 1, active = true WHERE id = v_pkg;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER session_package_consume AFTER UPDATE OF status ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.consume_package_on_realizada();