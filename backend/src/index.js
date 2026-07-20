import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Admin Client
// Using the service role key to bypass RLS since this backend will act as the authority
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

import profileRoutes from './routes/profiles.js';
import requestRoutes from './routes/requests.js';
import serviceRoutes from './routes/services.js';
import notificationRoutes from './routes/notifications.js';
import socialRoutes from './routes/social.js';
import trustRoutes from './routes/trust.js';
import feedRoutes from './routes/feed.js';
import dashboardRoutes from './routes/dashboard.js';
import messagesRoutes from './routes/messages.js';
import creditsRoutes from './routes/credits.js';
import adminRoutes from './routes/admin.js';

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Tuungane Backend API is running' });
});

// API Routes
app.use('/api/profiles', profileRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/trust', trustRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/admin', adminRoutes);

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});
