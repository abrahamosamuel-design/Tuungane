import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ABRAHAM = '5487969e-8eb9-42b8-bffb-2efab66b685f'; // Genesis Car Wash provider

const admin = createClient(url, key, { auth: { persistSession: false } });

const action = process.argv[2] || 'create';

if (action === 'create') {
  const email = `test-customer-${Date.now()}@tuungane.test`;
  const { data: u, error: ue } = await admin.auth.admin.createUser({
    email, password: 'TestPass!234', email_confirm: true,
    user_metadata: { full_name: 'Test Customer (Synthetic)', is_provider: false },
  });
  if (ue) throw ue;
  const customerId = u.user.id;
  console.log('Customer created:', customerId, email);

  // Insert a service request pointed at Abraham
  const { data: req, error: re } = await admin.from('service_requests').insert({
    customer_id: customerId,
    provider_id: ABRAHAM,
    title: 'Car wash needed (synthetic test)',
    service_needed: 'Premium car wash',
    description: 'Synthetic end-to-end test request. Please accept, start, and complete.',
    budget_range: 'UGX 20,000–40,000',
    category_slug: 'automotive',
    town: 'Kampala', district: 'Kampala', area: 'Nakawa',
    location: 'Nakawa, Kampala',
    visibility: 'matching_only',
    status: 'requested',
    urgent_flag: false,
    customer_phone: '+256700000001',
  }).select().single();
  if (re) throw re;
  console.log('Request created:', req.id);
  console.log(JSON.stringify({ customerId, requestId: req.id, email }, null, 2));
} else if (action === 'confirm-customer') {
  const requestId = process.argv[3];
  const customerId = process.argv[4];
  // Use the customer's session to call confirm_completion_customer? Service role can't impersonate easily.
  // Just update directly: set customer_confirmed_completion=true and recompute status.
  const { data: r, error } = await admin.from('service_requests')
    .update({ customer_confirmed_completion: true, updated_at: new Date().toISOString() })
    .eq('id', requestId).select().single();
  if (error) throw error;
  if (r.provider_confirmed_completion) {
    await admin.from('service_requests').update({ status: 'completed' }).eq('id', requestId);
  }
  console.log('customer-confirmed');
} else if (action === 'review') {
  const requestId = process.argv[3];
  const customerId = process.argv[4];
  const { error } = await admin.from('service_feedback').insert({
    service_request_id: requestId,
    customer_id: customerId,
    provider_id: ABRAHAM,
    rating: 5,
    comment: 'Excellent service — synthetic test review.',
  });
  if (error) throw error;
  console.log('review left');
} else if (action === 'cleanup') {
  const customerId = process.argv[3];
  await admin.from('service_requests').delete().eq('customer_id', customerId);
  await admin.auth.admin.deleteUser(customerId);
  console.log('cleaned');
}
