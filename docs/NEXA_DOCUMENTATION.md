# NEXA Application Documentation & Walkthrough

Version 1.1 | May 2026 | Confidential

## Table of Contents
1. [Product Overview](#1-product-overview)
2. [Detailed Application Walkthrough](#2-detailed-application-walkthrough)
3. [Functional Requirements](#3-functional-requirements)
4. [Database Schemas](#4-database-schemas)
5. [Technology Stack](#5-technology-stack)

---

## 1. Product Overview

### 1.1 Vision
Become Scotland’s leading on-demand car care marketplace by delivering convenience, transparency, and quality assurance to vehicle owners, while providing a reliable revenue channel for independent detailing professionals.

### 1.2 MVP Validation Goals
The MVP validates three core hypotheses before scaling:
- **User demand**: Will car owners book detailing through a web application?
- **Vendor supply**: Can we recruit and retain reliable, quality-focused vendors?
- **Transaction viability**: Does the commission-based model generate sustainable unit economics?

### 1.3 Target Users
- **Primary**: Private vehicle owners, corporate fleet managers, and van owners.
- **Secondary**: Independent car detailing vendors and small detailing businesses.

---

## 2. Detailed Application Walkthrough

### 2.1 Customer Journey (B2C)
1. **Registration & Auth**: The customer signs up via email or phone number and authenticates via OTP.
2. **Garage Management**: The customer adds their vehicles to their personal "Garage". They input the registration number, make, model, and the vehicle category (`Standard`, `Grande`, `Maxi`, or `Transit`).
3. **Booking Initiation**: The customer selects a vehicle from the Garage and proceeds to book a wash.
4. **Service & Add-on Selection**: The customer chooses the base service and can optionally select dynamic Add-ons (e.g., Seat Shampoo, Pet Hair Removal).
5. **Scheduling & Location**: The customer selects an available date/time and inputs the service address.
6. **Checkout & Legal Consent**: The customer reviews the booking summary, which includes the base rate, add-on costs, and a dynamic Booking & Protection Fee. Before paying, they must agree to the Terms and Conditions (e.g., providing a safe off-road workspace, acknowledging cancellation policies).
7. **Payment**: The customer securely pays the total amount via Stripe. The platform holds the funds in escrow.
8. **Completion & Review**: Once the admin assigns a vendor and the vendor completes the job (uploading before/after photos), the customer is notified and can leave a 1–5 star rating and review.

### 2.2 Corporate Fleet Journey (B2B)
1. **Enquiry Submission**: Fleet managers visit the Corporate Fleet landing page and submit an enquiry detailing their company name, contact info, and fleet size/composition.
2. **Admin Review**: The Admin reviews the submitted lead on the dashboard.
3. **Invoicing**: The Admin uses the built-in Invoice Generator to calculate costs based on fleet size, dynamic category rates, and booking fees. A custom discount can be applied. The Admin raises the invoice, which is automatically sent to the fleet manager's email.

### 2.3 Admin Operations
1. **Dashboard Overview**: The Admin views aggregated metrics (Total Revenue, Active Bookings, Unassigned Jobs) on the dashboard.
2. **Booking Management**: The Admin monitors all incoming bookings, matches them to available vendors, and triggers refunds if a booking is cancelled.
3. **Corporate Leads Management**: The Admin views and processes corporate enquiries, generating custom invoices for B2B clients.
4. **Service Add-ons**: The Admin can dynamically create, edit, or disable Service Add-ons (e.g., Engine Bay Cleaning).
5. **Dynamic Settings Control**: The Admin manages system-wide variables without requiring a code deployment:
   - **Car Category Pricing**: Adjust the base price for Standard, Grande, Maxi, and Transit vehicles.
   - **Booking Fee**: Adjust the platform-wide booking fee.
   - **FAQs**: Add, edit, or remove Frequently Asked Questions displayed on the landing page.
   - **Terms and Conditions**: Update the legal terms that customers agree to at checkout.

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization
Users authenticate via OTP. The system utilizes Role-Based Access Control (RBAC) to differentiate between `Customer`, `Vendor`, and `Super Admin` privileges.

### 3.2 Vehicle Classifications
Prices are fundamentally driven by the vehicle's classification. The categories are:
- **Standard**: Hatchbacks, Saloons, Coupes, City Cars.
- **Grande**: Estate cars, MPVs, Crossovers, Mid-size SUVs.
- **Maxi**: Large SUVs, Full-size 4x4s, Minivans.
- **Transit**: Mid commercial vans and equivalent-sized vehicles.

### 3.3 Dynamic Settings System
To minimize developer reliance, core business logic parameters are stored in the database. The frontend caches these settings via `localStorage` to ensure instant load times and zero layout shifts. 

---

## 4. Database Schemas

Below is the current schema representation reflecting the actual application state.

### 4.1 Users & Roles
- `user_id` (UUID, PK)
- `email`, `phone_number` (VARCHAR)
- `first_name`, `last_name`, `display_name` (VARCHAR)
- `otp_verified` (BOOLEAN)
- `role_id` (UUID, FK to Roles)
- `stripe_account_id` (VARCHAR) - *For Vendor payouts*

### 4.2 Vehicles
- `vehicle_id` (UUID, PK)
- `owner_id` (UUID, FK to Users)
- `registration_number`, `make`, `model`, `colour` (VARCHAR)
- `vehicle_type` (ENUM: `STANDARD`, `GRANDE`, `MAXI`, `TRANSIT`)

### 4.3 Bookings
- `booking_id` (UUID, PK)
- `user_id`, `vendor_id`, `vehicle_id` (UUID, FKs)
- `service_type` (ENUM: `BASIC`)
- `addons` (JSONB) - *Snapshot of selected addons and their prices*
- `booking_time` (TIMESTAMP)
- `service_address`, `latitude`, `longitude`
- `price` (DECIMAL)
- `status` (ENUM: `BOOKED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)
- `agreed_safe_space`, `agreed_details_correct` (BOOLEAN)

### 4.4 Service Addons (Admin Managed)
- `addon_id` (UUID, PK)
- `name` (VARCHAR)
- `description` (TEXT)
- `price` (DECIMAL)
- `is_active` (BOOLEAN)

### 4.5 Corporate Leads
- `enquiry_id` (UUID, PK)
- `company_name`, `contact_person`, `business_email`, `business_phone` (VARCHAR)
- `fleet_size` (INTEGER)
- `notes` (TEXT)
- `is_invoiced` (BOOLEAN)

### 4.6 System Settings
- `setting_id` (UUID, PK)
- `key` (VARCHAR, UNIQUE) - e.g., `car_category_pricing`, `booking_fee`, `faqs`
- `value` (TEXT) - Stored as stringified JSON for complex objects.

### 4.7 Payments
- `payment_id` (UUID, PK)
- `booking_id` (UUID, FK)
- `stripe_payment_intent_id` (VARCHAR)
- `amount`, `platform_fee`, `vendor_payout` (DECIMAL)
- `status` (ENUM: `pending`, `captured`, `refunded`)

---

## 5. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React, Vite, Tailwind CSS | High-performance, mobile-responsive SPA web app. |
| **Backend** | NestJS | Robust, scalable Node.js API architecture. |
| **Database** | PostgreSQL + TypeORM | Relational data storage with strict schema enforcement. |
| **Payments** | Stripe | PCI-compliant payment capture, intent handling, and automated vendor payouts. |
| **Maps** | Google Maps API | Address autocomplete and geocoding validation. |
