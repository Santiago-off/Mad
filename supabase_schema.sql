-- MAD Agency - Database Schema (Complete Version)

-- =============================================
-- 1. Cleanup (VERY SAFE - only drop if exists)
-- =============================================
-- Drop triggers only if tables exist
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscriptions') THEN
    DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON subscriptions;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tickets') THEN
    DROP TRIGGER IF EXISTS set_tickets_updated_at ON tickets;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ticket_messages') THEN
    DROP TRIGGER IF EXISTS set_ticket_messages_updated_at ON ticket_messages;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'activity_log') THEN
    DROP TRIGGER IF EXISTS set_activity_log_updated_at ON activity_log;
  END IF;
END $$;

-- Drop policies only if tables exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles') THEN
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
    ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'subscriptions') THEN
    DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
    DROP POLICY IF EXISTS "Users can insert own subscription" ON subscriptions;
    DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
    DROP POLICY IF EXISTS "Admins can update all subscriptions" ON subscriptions;
    DROP POLICY IF EXISTS "Admins can insert subscriptions" ON subscriptions;
    ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'invoices') THEN
    DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
    DROP POLICY IF EXISTS "Admins can view all invoices" ON invoices;
    DROP POLICY IF EXISTS "Admins can insert invoices" ON invoices;
    DROP POLICY IF EXISTS "Admins can update all invoices" ON invoices;
    ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tickets') THEN
    DROP POLICY IF EXISTS "Users can view own tickets" ON tickets;
    DROP POLICY IF EXISTS "Users can insert own tickets" ON tickets;
    DROP POLICY IF EXISTS "Users can update own tickets" ON tickets;
    DROP POLICY IF EXISTS "Admins can view all tickets" ON tickets;
    DROP POLICY IF EXISTS "Admins can update all tickets" ON tickets;
    DROP POLICY IF EXISTS "Admins can insert tickets" ON tickets;
    ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ticket_messages') THEN
    DROP POLICY IF EXISTS "Users can view own ticket messages" ON ticket_messages;
    DROP POLICY IF EXISTS "Users can insert own ticket messages" ON ticket_messages;
    DROP POLICY IF EXISTS "Admins can view all ticket messages" ON ticket_messages;
    DROP POLICY IF EXISTS "Admins can insert ticket messages" ON ticket_messages;
    ALTER TABLE ticket_messages DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'activity_log') THEN
    DROP POLICY IF EXISTS "Users can view own activity log" ON activity_log;
    DROP POLICY IF EXISTS "Users can insert own activity log" ON activity_log;
    DROP POLICY IF EXISTS "Admins can view all activity" ON activity_log;
    ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'financial_metrics') THEN
    DROP POLICY IF EXISTS "Admins can view financial data" ON financial_metrics;
    DROP POLICY IF EXISTS "Admins can insert financial data" ON financial_metrics;
    ALTER TABLE financial_metrics DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop functions LAST (AFTER dropping all policies that use them!)
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.is_admin(UUID);

-- =============================================
-- 2. Create all tables (if not exists) - and add missing columns
-- =============================================
-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'banned') THEN
    ALTER TABLE profiles ADD COLUMN banned BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add missing columns to subscriptions if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' AND column_name = 'amount') THEN
    ALTER TABLE subscriptions ADD COLUMN amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'subscriptions' AND column_name = 'payment_method') THEN
    ALTER TABLE subscriptions ADD COLUMN payment_method TEXT;
  END IF;
END $$;

-- Add missing columns to invoices if they don't exist
DO $$ 
BEGIN
  -- Check for all required invoice columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'invoice_number') THEN
    ALTER TABLE invoices ADD COLUMN invoice_number TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'user_id') THEN
    ALTER TABLE invoices ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'subscription_id') THEN
    ALTER TABLE invoices ADD COLUMN subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'amount') THEN
    ALTER TABLE invoices ADD COLUMN amount DECIMAL(10, 2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'currency') THEN
    ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT 'EUR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'status') THEN
    ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'cancelled', 'refunded'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'description') THEN
    ALTER TABLE invoices ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'invoice_date') THEN
    ALTER TABLE invoices ADD COLUMN invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'paypal_address') THEN
    ALTER TABLE invoices ADD COLUMN paypal_address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'payment_subject') THEN
    ALTER TABLE invoices ADD COLUMN payment_subject TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
    ALTER TABLE invoices ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'paid_date') THEN
    ALTER TABLE invoices ADD COLUMN paid_date TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'invoices' AND column_name = 'pdf_url') THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
  END IF;
END $$;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('prueba', 'basico', 'plus', 'pro')),
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'pending', 'pending_approval', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_renewal TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update check constraint for subscriptions status if table already exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    -- Drop existing check constraint
    BEGIN
      ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Add new check constraint
    ALTER TABLE subscriptions 
      ADD CONSTRAINT subscriptions_status_check 
      CHECK (status IN ('active', 'expired', 'pending', 'pending_approval', 'cancelled'));
  END IF;
END $$;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid', 'cancelled', 'refunded')),
  description TEXT,
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  paypal_address TEXT,
  payment_subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets table
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users ON DELETE SET NULL,
  ticket_number TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'account', 'other')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ticket Messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Metrics table
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  paid_invoices INTEGER DEFAULT 0,
  outstanding_amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 3. Functions and Triggers
-- =============================================
-- Handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a helper function to check if user is admin to avoid infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_ticket_messages_updated_at
BEFORE UPDATE ON ticket_messages
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_activity_log_updated_at
BEFORE UPDATE ON activity_log
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auth trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 4. RLS Policies
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (public.is_admin(auth.uid()));

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON subscriptions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON subscriptions
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all subscriptions" ON subscriptions
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert subscriptions" ON subscriptions
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Invoices policies
CREATE POLICY "Users can view own invoices" ON invoices
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices" ON invoices
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert invoices" ON invoices
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all invoices" ON invoices
FOR UPDATE USING (public.is_admin(auth.uid()));

-- Tickets policies
CREATE POLICY "Users can view own tickets" ON tickets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tickets" ON tickets
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON tickets
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" ON tickets
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all tickets" ON tickets
FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert tickets" ON tickets
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Ticket Messages policies
CREATE POLICY "Users can view own ticket messages" ON ticket_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tickets WHERE id = ticket_messages.ticket_id AND tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own ticket messages" ON ticket_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets WHERE id = ticket_messages.ticket_id AND tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all ticket messages" ON ticket_messages
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert ticket messages" ON ticket_messages
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Activity Log policies
CREATE POLICY "Users can view own activity log" ON activity_log
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log" ON activity_log
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity" ON activity_log
FOR SELECT USING (public.is_admin(auth.uid()));

-- Financial Metrics policies
CREATE POLICY "Admins can view financial data" ON financial_metrics
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert financial data" ON financial_metrics
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- 5. Enable Realtime (only if tables exist and not already added)
-- =============================================
DO $$ 
BEGIN
  -- First check if table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tickets') THEN
    -- Then check if it's not already in the publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'tickets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN others THEN NULL;
END $$;

DO $$ 
BEGIN
  -- First check if table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ticket_messages') THEN
    -- Then check if it's not already in the publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'ticket_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN others THEN NULL;
END $$;

-- =============================================
-- 6. Settings table for global configuration
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (key, value)
VALUES ('paypal_address', 'No disponible')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Everyone can view settings" ON settings
FOR SELECT USING (true);

CREATE POLICY "Admins can update settings" ON settings
FOR ALL USING (public.is_admin(auth.uid()));

-- Add settings to realtime
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'settings'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE settings;
    END IF;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
  WHEN others THEN NULL;
END $$;
