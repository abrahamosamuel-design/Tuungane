import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Tuungane123@256@db.bvlbirgazcdibhnawrok.supabase.co:5432/postgres',
});

async function run() {
  try {
    await client.connect();
    
    console.log("Running migration...");
    
    await client.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
      
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        INSERT INTO public.profiles (id, full_name, avatar_url, is_provider, phone)
        VALUES (
          NEW.id, 
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), 
          COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
          COALESCE((NEW.raw_user_meta_data->>'is_provider')::boolean, false),
          NEW.raw_user_meta_data->>'phone'
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $$;
    `);
    
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
