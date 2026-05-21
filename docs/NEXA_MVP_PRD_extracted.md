




NEXA
—
MVP Product Requirements Document
Mobile Marketplace for Professional Car Detailing
Launch Market: Aberdeen, Scotland
Version 1.0  |  May 2026  |  Confidential

Table of Contents
Table of Contents	2
1. Executive Summary	4
2. Product Overview	4
2.1 Vision	4
2.2 MVP Validation Goals	4
2.3 Target Users	4
3. Core User Journey	4
4. Functional Requirements	5
4.1 User Authentication	5
4.1.1 Users Table Schema	5
4.2 Vehicle Management (Garage)	5
4.2.1 Vehicles Table Schema	5
4.3 Booking System	6
4.3.1 Bookings Table Schema	6
4.3.2 Booking Status Flow	6
4.4 Payments	6
4.4.1 Payments Table Schema	7
4.4.2 Payment Workflow	7
4.5 Photo Upload	7
4.5.1 Job Photos Table Schema	7
4.6 Ratings and Reviews	8
4.6.1 Reviews Table Schema	8
4.7 Notifications	8
4.7.1 Notification Triggers	8
4.8 Admin Dashboard	8
4.8.1 Admin Capabilities	8
5. Non-Functional Requirements	10
6. Technology Stack	10
7. MVP Build Roadmap	11
7.1 Phase 1 — Core Marketplace (Weeks 1–6)	11
7.2 Phase 2 — Premium Experience (Weeks 7–14)	11
7.3 Phase 3 — Marketplace Expansion (Weeks 15+)	11
8. Success Metrics	12
8.1 Demand Validation	12
8.2 Supply Validation	12
8.3 Transaction Viability	12
9. Risks and Mitigations	12
10. Appendix	12
10.1 Entity Relationship Summary	12
10.2 Glossary	13


1. Executive Summary
NEXA is a mobile-first marketplace connecting private vehicle owners with professional car detailing vendors. The platform launches as a minimum viable product in Aberdeen, Scotland, designed to validate three core hypotheses before scaling: whether car owners will book detailing through an app, whether reliable vendors can be recruited, and whether the transaction model sustains a viable business.
The MVP deliberately constrains scope to the essential transaction loop: registration, booking, payment, job completion, and rating. Vendor-to-customer matching will be handled manually by an admin user during this phase, allowing the team to learn matching dynamics before investing in automation.

2. Product Overview
2.1 Vision
Become Scotland’s leading on-demand car care marketplace by delivering convenience, transparency, and quality assurance to vehicle owners while providing a reliable revenue channel for independent detailing professionals.
2.2 MVP Validation Goals
The MVP exists to answer three questions:
	•	User demand — Will car owners in Aberdeen book detailing through a web application?
	•	Vendor supply — Can we recruit and retain reliable, quality-focused vendors?
	•	Transaction viability — Does the commission-based model generate sustainable unit economics?

2.3 Target Users
Primary: Private vehicle owners in Aberdeen, Scotland; corporate fleet managers; van owners.
Secondary: Independent car detailing vendors and small detailing businesses.

3. Core User Journey
The end-to-end flow for a customer booking a car wash through NEXA:
	•	User opens the NEXA web application on desktop or mobile browser.
	•	User signs up with email or phone number and verifies via OTP.
	•	User registers one or more vehicles in their Garage.
	•	User selects a vehicle and books a wash, choosing service type, date/time, and service address.
	•	User confirms the booking and pays via Stripe.
	•	Admin manually matches a vendor to the booking.
	•	Vendor accepts the job, completes the detailing, and uploads before/after photos.
	•	User receives a notification that the job is complete.
	•	User rates the service (1–5 stars) and optionally leaves a written review.

4. Functional Requirements
4.1 User Authentication
Users sign up as either a Customer or a Vendor. Authentication is handled via email or phone number with OTP verification. The system must support role-based access so that customers, vendors, and admins see only the interfaces and data relevant to their role.
4.1.1 Users Table Schema
Field
Type
Constraints
Description
user_id
UUID
PK, auto-generated
Unique identifier
FirstName
VARCHAR(100)
Not Nullable
First Name of the customer
LastName
VARCHAR(100)
Not Nullable
LastName of the Customer
email
VARCHAR(255)
UNIQUE, nullable
User email address
phone_number
VARCHAR(20)
UNIQUE, nullable
User phone number
role
ENUM
customer | vendor | admin
Account role type
display_name
VARCHAR(100)
NOT NULL
User’s display name
otp_verified
BOOLEAN
DEFAULT false
OTP verification status
created_at
TIMESTAMP
DEFAULT NOW()
Account creation time
updated_at
TIMESTAMP
ON UPDATE
Last profile update

4.2 Vehicle Management (Garage)
Customers can register multiple vehicles. Each vehicle is associated with the owner’s account and is selectable when creating a booking. Future phases will integrate DVLA lookup for automatic population of make and model data.
4.2.1 Vehicles Table Schema
Field
Type
Constraints
Description
vehicle_id
UUID
PK, auto-generated
Unique vehicle identifier
owner_id
UUID
FK → users.user_id
Vehicle owner reference
registration_number
VARCHAR(15)
NOT NULL
UK registration plate
make
VARCHAR(50)
NOT NULL
Vehicle manufacturer
model
VARCHAR(50)
NOT NULL
Vehicle model name
vehicle_type
ENUM
car | van | suv | other
Vehicle category
colour
VARCHAR(30)
nullable
Vehicle colour
created_at
TIMESTAMP
DEFAULT NOW()
Record creation time

4.3 Booking System
Customers create bookings by selecting a vehicle, choosing a service type, specifying a date/time, and providing a service address. The admin manually assigns a vendor. The booking progresses through a defined status lifecycle.
4.3.1 Bookings Table Schema
Field
Type
Constraints
Description
booking_id
UUID
PK, auto-generated
Unique booking identifier
user_id
UUID
FK → users.user_id
Customer who booked
vehicle_id
UUID
FK → vehicles.vehicle_id
Vehicle to be serviced
vendor_id
UUID
FK → users.user_id, nullable
Assigned vendor
service_type
ENUM
basic | full | premium
Wash package selected
booking_time
TIMESTAMP
NOT NULL
Scheduled service time
service_address
TEXT
NOT NULL
Location for service
latitude
DECIMAL(10,7)
nullable
Address latitude
longitude
DECIMAL(10,7)
nullable
Address longitude
price
DECIMAL(8,2)
NOT NULL
Price in GBP
status
ENUM
see status flow
Current booking status
created_at
TIMESTAMP
DEFAULT NOW()
Booking creation time
updated_at
TIMESTAMP
ON UPDATE
Last status change

4.3.2 Booking Status Flow
Status
Description
Triggered By
booked
Customer has placed and paid for the booking
Customer submits booking
accepted
Vendor has been assigned and accepted the job
Admin assigns vendor
in_progress
Vendor has started the detailing work
Vendor taps “Start Job”
completed
Vendor has finished and uploaded photos
Vendor taps “Complete”
cancelled
Booking was cancelled before completion
Customer or admin cancels

4.4 Payments
All payments are processed through Stripe in GBP (£). When a customer confirms a booking, the payment is captured and held by the platform. The admin releases funds to the vendor after job completion. This manual disbursement approach simplifies the MVP while the team validates transaction volume.
4.4.1 Payments Table Schema
Field
Type
Constraints
Description
payment_id
UUID
PK, auto-generated
Unique payment identifier
booking_id
UUID
FK → bookings.booking_id
Associated booking
stripe_payment_intent_id
VARCHAR(255)
NOT NULL
Stripe reference
amount
DECIMAL(8,2)
NOT NULL
Amount charged in GBP
platform_fee
DECIMAL(8,2)
NOT NULL
NEXA commission
vendor_payout
DECIMAL(8,2)
NOT NULL
Amount due to vendor
status
ENUM
pending | captured | refunded
Payment state
paid_out_at
TIMESTAMP
nullable
When vendor was paid
created_at
TIMESTAMP
DEFAULT NOW()
Payment creation time

4.4.2 Payment Workflow
	•	Customer confirms booking and enters card details.
	•	Stripe PaymentIntent is created and confirmed; funds are captured.
	•	Platform holds funds until the job is marked completed.
	•	Admin reviews completed job and triggers vendor payout via Stripe Transfer.
	•	If a cancellation occurs before the job starts, the admin initiates a refund.

4.5 Photo Upload
Vendors upload before and after photos of each job. Photos provide visual proof of work quality and build customer trust. Images are stored in Supabase Storage (backed by S3-compatible object storage).
4.5.1 Job Photos Table Schema
Field
Type
Constraints
Description
photo_id
UUID
PK, auto-generated
Unique photo identifier
booking_id
UUID
FK → bookings.booking_id
Associated booking
vendor_id
UUID
FK → users.user_id
Uploading vendor
photo_type
ENUM
before | after
Photo category
storage_url
TEXT
NOT NULL
Supabase Storage URL
uploaded_at
TIMESTAMP
DEFAULT NOW()
Upload timestamp

4.6 Ratings and Reviews
After a job is completed, the customer can rate the NEXA service from 1 to 5 stars and optionally write a text review. Reviews are associated with the booking and the vendor for future quality tracking.
4.6.1 Reviews Table Schema
Field
Type
Constraints
Description
review_id
UUID
PK, auto-generated
Unique review identifier
booking_id
UUID
FK → bookings.booking_id, UNIQUE
One review per booking
user_id
UUID
FK → users.user_id
Reviewing customer
vendor_id
UUID
FK → users.user_id
Reviewed vendor
rating
INTEGER
1–5, NOT NULL
Star rating
comment
TEXT
nullable
Written review
created_at
TIMESTAMP
DEFAULT NOW()
Review submission time

4.7 Notifications
The system sends notifications at key lifecycle events. During the MVP, notifications are delivered via email (primary) and SMS (secondary) using Twilio.
4.7.1 Notification Triggers
Event
Recipient
Channel
Booking confirmation
Customer
Email + SMS
Vendor assigned
Customer + Vendor
Email
Job started
Customer
Email + SMS
Job completed
Customer
Email + SMS
Review received
Vendor
Email
Booking cancelled
Customer + Vendor
Email + SMS

4.8 Admin Dashboard
The admin dashboard is the operational control centre for the MVP. Since vendor matching is manual during this phase, the admin interface is critical to daily operations.
4.8.1 Admin Capabilities
	•	View and filter all bookings by status, date, and customer
	•	Manually assign vendors to bookings based on availability and location
	•	View payment records and trigger vendor payouts
	•	Monitor and resolve customer/vendor disputes
	•	View all registered users, vehicles, and vendor profiles
	•	Access ratings and reviews for quality assurance


5. Non-Functional Requirements
Requirement
Detail
Responsive Design
Mobile-first web application; fully usable on desktop, tablet, and mobile browsers
Currency
All prices and payments displayed and processed in GBP (£)
Date Format
UK format (DD/MM/YYYY) throughout the application
Payment Security
PCI-DSS compliant via Stripe; no raw card data stored on NEXA servers
Data Privacy
GDPR compliant data storage and processing; user data deletion on request
Performance
Page load under 3 seconds on 4G connections; API responses under 500ms
Availability
99.5% uptime target during MVP
Scalability
Architecture supports scaling to additional cities without major refactoring

6. Technology Stack
Layer
Technology
Purpose
Frontend
React Native (Web)
Cross-platform UI; mobile-first responsive design
Backend / DB
Supabase + PostgreSQL
Auth, real-time subscriptions, row-level security, storage
Payments
Stripe
PaymentIntents, Transfers, refund handling; PCI compliant
Notifications
Twilio
SMS and email delivery; programmable messaging
Maps
Google Maps API
Address autocomplete, geocoding, service area validation
Storage
Supabase Storage (S3)
Photo uploads with signed URLs; CDN delivery
Hosting
Vercel / Netlify
Static site hosting with serverless functions
Monitoring
Sentry
Error tracking and performance monitoring


7. MVP Build Roadmap
Phase
Timeline
Key Deliverables
Success Criteria
Phase 1
Weeks 1–6
Auth, Garage, Booking, Payments, Admin panel
10 completed bookings; 3 active vendors
Phase 2
Weeks 7–14
DVLA lookup, live GPS, escrow automation, WhatsApp notifications
50 bookings/week; automated vendor matching
Phase 3
Weeks 15+
Vendor onboarding app, subscriptions, gift credits, AI job allocation, dispute system
Expansion to Edinburgh/Glasgow

7.1 Phase 1 — Core Marketplace (Weeks 1–6)
Phase 1 delivers the minimum viable transaction loop. Every feature exists to support a customer going from sign-up to a completed, paid booking with a rated vendor.
	•	User registration and OTP authentication
	•	Vehicle registration (Garage)
	•	Booking creation with service type selection, scheduling, and address input
	•	Stripe payment integration (capture and hold)
	•	Admin dashboard for vendor assignment and payout management
	•	Vendor interface for job acceptance, photo upload, and job completion
	•	Rating and review system
	•	Email and SMS notifications via Twilio

7.2 Phase 2 — Premium Experience (Weeks 7–14)
	•	DVLA vehicle lookup API for automatic make/model population
	•	Live GPS tracking of vendor en route to service address
	•	Automated escrow and payout via Stripe Connect
	•	WhatsApp notification channel via Twilio
	•	Vendor availability calendar and scheduling improvements

7.3 Phase 3 — Marketplace Expansion (Weeks 15+)
	•	Dedicated vendor onboarding application with document verification
	•	Subscription plans for regular customers (e.g., weekly/fortnightly washes)
	•	Gift credits and referral programme
	•	AI-powered job allocation based on vendor proximity, rating, and availability
	•	Formal dispute resolution system with evidence collection
	•	Geographic expansion to Edinburgh, Glasgow, and beyond


8. Success Metrics
The following KPIs will determine whether the MVP has validated the three core hypotheses:
8.1 Demand Validation
	•	Minimum 30 unique customers register within the first 4 weeks
	•	At least 50 bookings completed in the first 6 weeks
	•	Customer return rate of 25% or higher (repeat bookings)

8.2 Supply Validation
	•	Minimum 5 active vendors onboarded at launch
	•	Average vendor acceptance rate above 80%
	•	Average vendor rating of 4.0 stars or higher

8.3 Transaction Viability
	•	Zero failed payments due to system errors
	•	Average commission margin sustains platform operating costs
	•	Cancellation rate below 15%

9. Risks and Mitigations
Risk
Likelihood
Mitigation
Low initial vendor supply
High
Pre-launch vendor recruitment drive; offer reduced commission for first 3 months
Low customer demand
Medium
Targeted local marketing in Aberdeen; partnerships with car dealerships and fleet managers
Manual matching bottleneck
Medium
Admin tooling optimised for speed; Phase 2 introduces automated matching
Payment disputes
Low
Before/after photos provide evidence; admin resolves manually in MVP
GDPR non-compliance
Medium
Supabase RLS policies; data deletion endpoint; privacy policy reviewed by legal counsel
Vendor no-shows
Medium
SMS reminders 24 hours and 1 hour before booking; penalty system in Phase 2

10. Appendix
10.1 Entity Relationship Summary
Users (1) → (*) Vehicles: A user can own multiple vehicles.
Users (1) → (*) Bookings: A customer can create multiple bookings.
Vehicles (1) → (*) Bookings: Each booking references one vehicle.
Bookings (1) → (1) Payments: Each booking has one payment record.
Bookings (1) → (*) Job Photos: Each booking can have multiple photos.
Bookings (1) → (0..1) Reviews: Each booking can have at most one review.

10.2 Glossary
OTP: One-Time Password, sent via SMS or email for authentication.
RLS: Row-Level Security, a Supabase/PostgreSQL feature that restricts data access per user.
PaymentIntent: A Stripe object representing a customer’s intent to pay.
DVLA: Driver and Vehicle Licensing Agency (UK), providing vehicle registration data.
Escrow: Holding customer funds until service delivery is confirmed.
