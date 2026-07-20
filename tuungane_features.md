# Tuungane Application - Detailed Features & App Flow

The Tuungane application is a comprehensive platform designed to connect users, businesses, and service providers. Below is a detailed breakdown of the app's features, corresponding routes, and the typical user flow.

---

## 1. Public / Unauthenticated Flow
*Users can explore the platform, view public listings, and learn about the service before creating an account.*

### Core Discovery & Feeds
* **Home/Landing Page (`/`)**: The main entry point for the application.
* **Activity Feed (`/feed`)**: A social-style feed displaying community updates, recent posts, and platform activity.
* **Official Announcements (`/official`, `/official-posts/$id`)**: Dedicated pages for platform administrators to broadcast important news and updates.

### Directories & Marketplaces
* **Business Directory (`/businesses`, `/businesses/$slug`)**: Users can browse a comprehensive directory of registered businesses and view detailed pages for each business.
* **Services Directory (`/services`, `/services/$slug`)**: Users can explore available services and read detailed descriptions.
* **Open Requests (`/requests/browse`)**: A public board showing active service requests created by other users.
* **Opportunities & Jobs (`/opportunities`, `/opportunities/$id`)**: A marketplace for discovering job listings, gigs, and community opportunities.
* **Service Providers (`/providers/$id`)**: Public profiles of registered service providers, showcasing their skills and ratings.
* **User Profiles (`/u/$id`)**: Public-facing profiles for community members.

### Information & Support
* **Platform Info (`/about`, `/contact`)**: Pages to learn about the Tuungane platform and get in touch with support.
* **Legal & SEO (`/terms`, `/sitemap.xml`)**: Terms of service and search engine optimization maps.
* **Guides (`/guides/property-maintenance-kampala`)**: Resourceful articles and guides for users.

### Authentication Flow
* **Login/Registration (`/login`)**: The gateway for users to access personalized and interactive features.
* **Password Management (`/forgot-password`, `/reset-password`)**: Secure flow for recovering account access.

---

## 2. Authenticated Flow
*Once logged in, users gain access to interactive features, content creation, and personalized dashboards.*

### User Dashboard & Account Management (Under `/_authenticated/*`)
* **Dashboard (`/dashboard`)**: A personalized central hub providing an overview of the user's activity, requests, and metrics.
* **My Profile (`/me`)**: Allows users to view and edit their personal profile information.
* **Account Settings (`/settings`)**: Manage application preferences, security, and account details.
* **Notifications (`/notifications`)**: A centralized inbox for system alerts, updates on requests, and new messages.
* **Credits System (`/credits`)**: Manage platform virtual currency, view balances, and handle transactions.

### Creating & Managing Content
* **List a Skill (`/list-skill`)**: An onboarding flow for users to register as service providers and offer their skills to the community.
* **Add a Business (`/businesses/new`, `/businesses/create`)**: Forms and wizards allowing entrepreneurs to register their businesses on the platform.
* **Post Opportunities (`/opportunities/new`)**: Interface for users and businesses to create new job or gig listings.
* **Create Service Requests (`/requests/new`)**: A dedicated flow for users to post exactly what service they need help with.

### Interaction & Tracking
* **Manage Requests (`/requests/`, `/requests/$id`)**: A portal to track the status of personal service requests, review offers, and finalize agreements.
* **Messaging System (`/messages/`, `/messages/$id`)**: A secure, real-time inbox for direct communication between users, service providers, and businesses.

---

## 3. Administrative Flow
* **Admin Dashboard (`/admin`)**: A restricted area providing platform administrators with the tools to moderate content, manage users, and oversee platform activity.

---

## Summary of the User Journey
1. **Onboarding:** A visitor lands on the Home (`/`) or Feed (`/feed`) page, browses available services (`/services`) or businesses (`/businesses`), and decides to interact.
2. **Authentication:** The visitor navigates to `/login` to create an account or sign in.
3. **Engagement:** Once authenticated, the user lands on their `/dashboard`. From here, they can:
   * Navigate to `/requests/new` to hire someone.
   * Go to `/list-skill` to start earning money.
   * Send a direct message (`/messages/`) to a business.
4. **Fulfillment:** Users track their interactions via `/notifications` and manage ongoing communications in `/messages/`, finalizing transactions or service delivery.
