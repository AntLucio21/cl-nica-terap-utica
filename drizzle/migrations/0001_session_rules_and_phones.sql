CREATE TABLE public.clinic_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  charge_no_show boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.clinic_settings TO authenticated;
GRANT ALL ON public.clinic_settings TO service_role;
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read settings" ON public.clinic_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Therapist updates settings" ON public.clinic_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'terapeuta')) WITH CHECK (public.has_role(auth.uid(), 'terapeuta'));
INSERT INTO public.clinic_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.prevent_session_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conflict_name text;
BEGIN
  IF NEW.status = 'cancelada' THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('sessions_overlap'));
  SELECT p.full_name INTO conflict_name
  FROM public.sessions s JOIN public.patients p ON p.id = s.patient_id
  WHERE s.id <> NEW.id AND s.status <> 'cancelada'
    AND tstzrange(s.starts_at, s.starts_at + make_interval(mins => s.duration_min))
     && tstzrange(NEW.starts_at, NEW.starts_at + make_interval(mins => NEW.duration_min))
  LIMIT 1;
  IF conflict_name IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe uma sessão neste horário (%)', conflict_name USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sessions_no_overlap BEFORE INSERT OR UPDATE OF starts_at, duration_min, status ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.prevent_session_overlap();

ALTER TABLE public.patients ADD COLUMN phone_needs_review boolean NOT NULL DEFAULT false;
WITH d AS (
  SELECT id, regexp_replace(phone, '\D', '', 'g') AS raw FROM public.patients
), n AS (
  SELECT id, CASE WHEN length(raw) IN (12, 13) AND raw LIKE '55%' THEN substr(raw, 3) ELSE raw END AS local FROM d
)
UPDATE public.patients p SET
  phone = CASE WHEN n.local = '' THEN '' WHEN length(n.local) = 10 OR (length(n.local) = 11 AND substr(n.local, 3, 1) = '9') THEN '55' || n.local ELSE p.phone END,
  phone_needs_review = NOT (n.local = '' OR length(n.local) = 10 OR (length(n.local) = 11 AND substr(n.local, 3, 1) = '9'))
FROM n WHERE n.id = p.id;