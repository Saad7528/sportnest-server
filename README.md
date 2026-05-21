# 🏟️ SportNest Server

The high-performance, robust, and secure backend API engine powering the **SportNest** sports venue booking and management platform. It handles user authentication (email/password & Google OAuth 2.0), sports facility CRUD operations, interactive slot bookings, secure session management via HTTP-only cookies, and persistent MongoDB data handling.

---

## 🚀 Live URL
Experience the live API server here: **[https://sportnest-server-eight.vercel.app/](https://sportnest-server-eight.vercel.app/)**

---

## 🎯 Purpose
The main purpose of **SportNest Server** is to provide a reliable, modular, and fast RESTful API service that connects the frontend client with our MongoDB database. It implements robust server-side validation, secure authentication wrappers, token-based authorization guards, and relational safety (such as deleting associated bookings when a venue is removed) to ensure a flawless experience for both athletes and facility owners.

---

## ✨ Features

- **🔐 Dual Authentication Flow**:
  - **Email & Password**: Standard registration and login with strong password hashing using `bcryptjs`.
  - **Google OAuth 2.0**: Direct integration validating Google access tokens against the official Google UserInfo API for a seamless, passwordless login flow.
- **🛡️ Secure Session Recovery & Guards**:
  - Automatically signs and issues secure, browser-persistent JSON Web Tokens (JWT).
  - Uses `httpOnly` secure cookies for token storage to defend against XSS attacks, with an `Authorization: Bearer <token>` fallback header for mobile or header-based environments.
  - Exposes an `/me` endpoint for instant persistent session checks on client reload.
- **🏗️ Sports Facility / Venue CRUD Management**:
  - `POST /facilities`: Register a new sports facility (football turfs, cricket arenas, basketball courts) with validation.
  - `GET /facilities`: Fetch all facilities, including advanced server-side regex search queries and multi-type filtering (e.g., `football,cricket`).
  - `GET /facilities/:id`: Fetch specific facility details with object ID validation.
  - `PUT /facilities/:id`: Allow facility owners to update their venues, fully protected by ownership verification checks.
  - `DELETE /facilities/:id`: Safely delete a facility, with a cascade mechanism that automatically cleans up any associated bookings.
- **📅 Advanced Booking System**:
  - `POST /bookings`: Instant reservation of available slots with auto-calculation of total pricing based on hours booked. Increments booking counts automatically.
  - `GET /bookings`: Fetch customized lists of bookings associated with the currently authenticated user.
  - `DELETE /bookings/:id`: Easy booking cancellation which automatically decrements the facility's overall booking count.
- **⚡ Lazy Database Connectivity**:
  - Utilizes a highly optimized, lazy-connection pattern to MongoDB, preventing start-up timeouts on serverless deployments (such as Vercel) while maintaining quick query response times.

---

## 📦 NPM Packages Used

### Core Framework
- **`express`** (`v5.2.1`) - Next-generation web framework for Node.js, managing route parsing, middlewares, and server logic.

### Database Persistence
- **`mongodb`** (`v7.2.0`) - Official MongoDB driver for Node.js, providing high-performance query builders and connection pools.

### Security & Authentication
- **`jsonwebtoken`** (`v9.0.3`) - Industry-standard JWT signing, verifying, and session duration management.
- **`bcryptjs`** (`v3.0.3`) - Salt generation and secure hashing for private user passwords.
- **`google-auth-library`** (`v10.6.2`) - Google's official client library for OAuth 2.0 authorization, used to verify client identity and tokens.

### Configuration & Parsers
- **`cookie-parser`** (`v1.4.7`) - Parses `Cookie` headers and populates `req.cookies` with ease.
- **`cors`** (`v2.8.6`) - Enables secure cross-origin resource sharing, handling custom origins, methods, and credentials securely.
- **`dotenv`** (`v17.4.2`) - Loads development-specific environment variables from a `.env` file into `process.env`.

### Development Utilities
- **`nodemon`** (`v3.1.14` - *DevDependency*) - Monitors application files and automatically restarts the server during development.

---

## 🛠️ Local Installation & Setup

To run this backend project locally on your machine, follow these simple steps:

1. **Clone or Navigate to the directory**:
   ```bash
   cd sportnest-server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and specify the following details:
   ```env
   PORT=5001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_signing_secret
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development
   ```

4. **Launch the Development Server**:
   ```bash
   npm run dev
   ```
   The server will start running at `http://localhost:5001`. You will see connection console logs confirming successful connection to MongoDB.
