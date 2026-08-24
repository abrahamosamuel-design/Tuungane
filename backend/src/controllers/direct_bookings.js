import { getSupabaseUserClient } from './messages.js';

export const createDirectBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const payload = { ...req.body, customer_id: userId };
    
    const supabaseUser = getSupabaseUserClient(req);
    const { data, error } = await supabaseUser
      .from('direct_bookings')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    console.error('Error creating direct booking:', err);
    res.status(500).json({ error: err.message || 'Failed to create booking', details: err });
  }
};

export const getMyDirectBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const supabaseUser = getSupabaseUserClient(req);
    
    const { data, error } = await supabaseUser
      .from('direct_bookings')
      .select('*')
      .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('Error fetching direct bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

export const updateDirectBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    
    const supabaseUser = getSupabaseUserClient(req);
    
    const { data, error } = await supabaseUser
      .from('direct_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    if (status === 'declined' || status === 'cancelled') {
        const { error: notifErr } = await supabaseUser.from('notifications').insert({
            user_id: data.customer_id,
            type: 'booking_rejected',
            title: 'Booking Rejected',
            message: `Your booking for ${data.service_needed} was rejected by the provider.`,
            link: '/dashboard',
            read: false
        });
        if (notifErr) console.error("Failed to send notification:", notifErr);
    }

    res.json({ data });
  } catch (err) {
    console.error('Error updating direct booking:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
};
