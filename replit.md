# ClothesShare Platform

## Overview

ClothesShare is a sustainable fashion marketplace platform that connects clothing donors, customers, and NGOs. The platform enables users to donate clothes for resale or free distribution, purchase pre-loved items at discounted prices, and facilitates NGO verification and collection processes. Built as a responsive web application with a dark-themed, neon-accented UI featuring glassmorphism design elements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: Pure HTML5, CSS3, and vanilla JavaScript (no frameworks)
- **Design System**: Dark theme with neon accents (teal, purple, cyan) and glassmorphism effects
- **Responsive Design**: Mobile-first approach with CSS Grid and Flexbox layouts
- **Font System**: Inter for body text, Orbitron for headings, Font Awesome for icons

### Authentication & User Management
- **Firebase Authentication**: Handles user registration, login, and session management
- **Role-Based Access**: Four distinct user roles (Customer, Donor, NGO, Admin) with dedicated dashboards
- **Session Persistence**: Uses Firebase Auth state persistence and localStorage for user preferences

### Data Storage Architecture
- **Primary Database**: Drizzle ORM with Neon (PostgreSQL) serverless database
- **Real-time Data**: Firebase Firestore for user data, items, orders, and NGO requests
- **File Storage**: Firebase Storage for image and video uploads
- **Caching**: Memoization for frequently accessed data

### Page Structure & Navigation
- **Landing Page**: Hero section with role-based call-to-action buttons
- **Authentication**: Single page with toggle between login/signup and role selection
- **Dashboard System**: Role-specific dashboards with sidebar navigation
- **Admin Portal**: Separate admin interface for platform management

### Business Logic Components
- **Item Management**: Upload, approval workflow, and marketplace listing system
- **Pricing Engine**: Automatic price suggestion (1/4 of retail price) with platform fees
- **NGO Verification**: Admin-controlled approval process for NGO registrations
- **Order Processing**: Cart management, order tracking, and fulfillment workflow

### UI/UX Architecture
- **Component System**: Reusable CSS classes for buttons, cards, forms, and navigation
- **Animation Framework**: CSS transitions and hover effects with neon glow animations
- **Modal System**: Dynamic modals for forms, confirmations, and detailed views
- **Responsive Grid**: Flexible product grid system with filtering capabilities

## External Dependencies

### Firebase Services
- **Firebase Auth**: User authentication and authorization
- **Firebase Firestore**: Real-time NoSQL database for application data
- **Firebase Storage**: File storage for images and videos

### Database & ORM
- **Neon Database**: Serverless PostgreSQL database hosting
- **Drizzle ORM**: Type-safe database operations and schema management
- **@neondatabase/serverless**: Database connection pooling

### CDN Resources
- **Google Fonts**: Inter and Orbitron font families
- **Font Awesome**: Icon library (v6.4.0)
- **External Stylesheets**: Loaded via CDN for performance

### Node.js Dependencies
- **memoizee**: Function memoization for performance optimization
- **openid-client**: OAuth and OpenID Connect client functionality
- **@types/memoizee**: TypeScript definitions for memoizee

### Development Tools
- **WebSocket Support**: Native WebSocket for real-time features
- **ES6 Modules**: Native browser module system for code organization
- **TypeScript Support**: Type definitions for enhanced development experience