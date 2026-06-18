# Hail Community Portal

A full-stack digital marketplace designed to connect clients with local service providers across the Hail region, Saudi Arabia.

Developed as a graduation capstone project for the Bachelor of Computer Science and Information Systems program at the University of Hail.

---

## Live Demo

visit: https://hail-community-portal.vercel.app/



---

## Project Overview

Hail Community Portal is a web-based platform that enables users to discover, book, and communicate with local service providers through a secure and modern digital ecosystem.

The platform provides dedicated workspaces for clients, service providers, and administrators while supporting real-time communication, service moderation, and operational analytics.

---

## Key Features

### Client Portal

* Browse and search service categories
* View provider profiles and service details
* Submit service requests and bookings
* Real-time messaging with providers
* Ratings and reviews system
* Order tracking and history

### Provider Workspace

* Create, edit, and manage services
* Manage incoming customer requests
* Real-time communication with clients
* Performance analytics dashboard
* Subscription and trial management
* Support ticket system

### Administrator Dashboard

* Service approval and moderation workflow
* User verification and account management
* Platform analytics and statistics
* Support ticket oversight
* Subscription monitoring
* Data export functionality

---

## Technical Features

* Role-Based Access Control (RBAC)
* Real-Time Messaging System
* Secure Authentication & MFA Support
* PostgreSQL Database Architecture
* Responsive Mobile-First Design
* Analytics Dashboards
* Service Moderation Workflow
* Cloud Storage Integration
* Secure Deployment Pipeline

---

## Technology Stack

### Frontend

* React.js
* TypeScript
* Vite

### UI & Styling

* Tailwind CSS
* shadcn/ui

### Backend

* Supabase
* PostgreSQL

### Authentication

* Supabase Auth
* Multi-Factor Authentication (MFA)

### Data Visualization

* Recharts

---

## Screenshots

### Authentication

![Authentication](./screenshots/multifactor_auth_new_signup.png)

### Administrator Dashboard

![Admin Statistics](./screenshots/admin_stats.png)

![Admin Services](./screenshots/Admin_services_in_website.png)

![Admin Verification](./screenshots/Admin_Verfiy.png)

### Provider Dashboard

![Provider Statistics](./screenshots/Provider_stats.png)

![Provider Services](./screenshots/Provider_Services_Page.png)

![Provider Orders](./screenshots/Provider_orders.jpeg)

### Messaging System

![Customer Provider Chat](./screenshots/provider-customer_chat.jpeg)

![Support Ticket Chat](./screenshots/Admin-Provider_support_ticketchat.jpeg)

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_KEY
```

## Installation

```bash
git clone https://github.com/y9yz/hail-community-portal.git

cd hail-community-portal

npm install

npm run dev
```

## Project Team

### Lead Full-Stack Developer

**Yazeed Muteb AlShammari**

Responsible for:

* System Architecture
* Database Design
* Frontend Development
* Backend Integration
* Authentication System
* Real-Time Messaging
* Dashboard Development
* Deployment & Infrastructure

### Team Members

* Fawaz Ziyad Alluhayd
* Hamad Nabil Almutairi
* Tariq Mohammed Alshammari
* Mohammed Saadi Alrashidi

Provided feedback, testing, and requirement validation during development.
---

## Academic Supervisor

Dr. Zeyad Ghaleb Al-Mekhlaf

University of Hail

---

## License

This project was developed for academic and educational purposes as part of the graduation requirements at the University of Hail.