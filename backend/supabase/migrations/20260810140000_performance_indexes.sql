-- Performance Indexes for Tuungane App

-- Profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_category_slug ON profiles(category_slug);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON profiles(district);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON profiles(is_verified);

-- Service Requests table
CREATE INDEX IF NOT EXISTS idx_service_requests_customer_id ON service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_provider_id ON service_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_category_slug ON service_requests(category_slug);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_visibility ON service_requests(visibility);
CREATE INDEX IF NOT EXISTS idx_service_requests_urgent_flag ON service_requests(urgent_flag);

-- Provider Responses table
CREATE INDEX IF NOT EXISTS idx_provider_responses_request_id ON provider_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_provider_responses_provider_id ON provider_responses(provider_id);

-- Service Feedback table
CREATE INDEX IF NOT EXISTS idx_service_feedback_provider_id ON service_feedback(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_feedback_service_request_id ON service_feedback(service_request_id);

-- Contact Logs table
CREATE INDEX IF NOT EXISTS idx_contact_logs_provider_id ON contact_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_customer_id ON contact_logs(customer_id);
