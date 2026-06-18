#  Hail Community Portal (بوابة مجتمع حائل)

A comprehensive, full-stack digital marketplace designed to connect local service providers with clients within the Hail region. Developed as a capstone graduation project for the Bachelor’s Degree in Computer Science and Information Systems at the **University of Hail (UOH)**.

---

##  Project Overview
Hail Community Portal is an integrated web-based platform that facilitates access to professional and technical services in Hail city. The system offers a secure ecosystem for users to browse, book, and communicate instantly through an optimized dashboard architecture.

---

## 🛠️ Tech Stack & Architecture
* **Frontend:** React.js (v18+) with TypeScript & Vite
* **Styling & UI:** Tailwind CSS v4 + shadcn/ui components (Fully Responsive & Optimized)
* **Backend & Database:** Supabase (PostgreSQL, Real-time Engine, Storage Buckets)
* **Authentication:** Supabase Auth (with Secure Email & Multi-Factor Authentication support)
* **State Management:** React Hooks & Optimized Performance Contexts
* **Data Visualization:** Recharts (For analytical dashboards)

---

## Project Team

* **Yazeed Muteb AlShammari** – Lead Full-Stack Developer & Software Architect
* **Fawaz Ziyad Alluhayd** 
* **Hamad Nabil Almutairi**
* **Tariq Mohammed Alshammari**
* **Mohammed Saadi Alrashidi**



---

## System Walkthrough & Screenshots

### 🔑 Authentication
| System Sequence Diagram | Secure Multi-Factor Auth (MFA) |
| :---: | :---: |
| ![MFA Signup](/screenshots/multifactor_auth_new_signup.png) |

### Admin Control Panel (لوحة تحكم المسؤول)
| Analytics & Platform Statistics | Service Management | User Verification |
| :---: | :---: | :---: |
| ![Admin Stats](/screenshots/admin_stats.png) | ![Admin Services](/screenshots/Admin_services_in_website.png) | ![Admin Verify](/screenshots/Admin_Verfiy.png) |

| Subscription Tracking | User Management | Ticket Under Review |
| :---: | :---: | :---: |
| ![Subscriptions](/screenshots/admin_providersSubscriptions.jpeg) | ![Admin Users](/screenshots/Admin_Users.jpeg) | ![Ticket Review](/screenshots/Admin_Ticket_underreview.png) |

### Provider Workspace (لوحة تحكم المزود)
| Provider Analytical Stats | Add New Service Page | Dynamic Services Grid |
| :---: | :---: | :---: |
| ![Provider Stats](/screenshots/Provider_stats.png) | ![Add Service](/screenshots/Provider_add_service_page.png) | ![Services Page](/screenshots/Provider_Services_Page.png) |

| Incoming Customer Orders | Provider Ticket Management | Active Support Chat |
| :---: | :---: | :---: |
| ![Provider Orders](/screenshots/Provider_orders.jpeg) | ![New Ticket](/screenshots/Provider_new_support_ticket.png) | ![Support Chat](/screenshots/Provider_support_chat.png) |

### 👥 Client & Interaction Flow
| Real-time Client-Provider Chat | Admin Support Ticket Chat | Order Confirmation Flow |
| :---: | :---: | :---: |
| ![Customer Provider Chat](/screenshots/provider-customer_chat.jpeg) | ![Support Chat](/screenshots/Admin-Provider_support_ticketchat.jpeg) | ![Sequence Provider](/screenshots/Sequence_Provider.png) |

---

## Core Features

### 1. Client Dashboard
* Smart category filtration and instant booking mechanisms with automated collision avoidance.
* Rich real-time messaging pipeline powered by Supabase WebSockets.
* Interactive reviews, ratings, and active order logs.

### 2. Provider Hub
* Complete CRUD functionality for services.
* Integrated subscription engine featuring an automated 30-day trial counter.
* Visual performance charts utilizing clean HSL theme presets.

### 3. Administrator Dashboard
* Pre-publish auditing pipeline for evaluating newly posted services.
* Core user supervision control (Verification, Flagging, and Ban execution).
* Live automated database exports for operational auditing (.csv / .xlsx format).

---

## Check website
demo on: 