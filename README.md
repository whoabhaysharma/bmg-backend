
# Gym Management System API

## Overview

This is a RESTful API for a gym management system. It provides functionalities for user authentication, gym and subscription plan management, payment processing, and attendance tracking. The API is built with Node.js, Express, TypeScript, and uses Prisma as the ORM for interacting with a PostgreSQL database. Redis is used for caching OTPs.

## Architecture

The API follows a standard layered architecture:

-   **Routes**: Defines the API endpoints.
-   **Controllers**: Handles incoming requests, validates input, and calls the appropriate services.
-   **Services**: Contains the business logic of the application.
-   **Lib**: Contains the database and Redis client instances.
-   **Middleware**: Handles authentication and other cross-cutting concerns.

## Business Flow

The application follows a logical flow from user authentication to accessing gym services.

### 1. Authentication

-   **OTP Generation**: The user starts by providing their 10-digit mobile number. The system generates a 6-digit OTP and sends it to the user's mobile number (currently logged for testing).
-   **OTP Verification**: The user submits the received OTP along with their mobile number. If the OTP is valid, the system creates a new user (if one doesn't exist) and returns a JSON Web Token (JWT).
-   **JWT Authentication**: The JWT must be included in the `Authorization` header of all subsequent requests to protected endpoints.

### 2. User Management

-   Once authenticated, users can view and update their profile information.

### 3. Gym and Plan Management

-   **Admin Role**: An admin user can create, update, and delete gyms and subscription plans.
-   **User Role**: Regular users can view the list of available gyms and subscription plans.

### 4. Subscriptions

-   Users can subscribe to a subscription plan for a specific gym.
-   When a user subscribes to a plan, a new subscription record is created with a `PENDING` status.

### 5. Payments

-   After creating a subscription, the user proceeds to payment.
-   The payment gateway processes the payment.
-   Upon successful payment, the subscription status is updated to `ACTIVE`, and the `startDate` and `endDate` are set.

### 6. Attendance

-   Users with an active subscription can mark their attendance at the gym.
-   The system verifies that the user has an active subscription for the specific gym before recording the attendance.

## API Endpoints

| Endpoint | Method | Description | Authentication |
| --- | --- | --- | --- |
| `/api/auth/send-otp` | `POST` | Sends an OTP to the user's mobile number. | None |
| `/api/auth/verify-otp` | `POST` | Verifies the OTP and returns a JWT. | None |
| `/api/users/me` | `GET` | Gets the profile of the authenticated user. | User |
| `/api/users/me` | `PUT` | Updates the profile of the authenticated user. | User |
| `/api/gyms` | `GET` | Gets a list of all gyms. | User |
| `/api/gyms` | `POST` | Creates a new gym. | Admin |
| `/api/plans` | `GET` | Gets a list of all subscription plans. | User |
| `/api/plans` | `POST` | Creates a new subscription plan. | Admin |
| `/api/subscriptions` | `POST` | Creates a new subscription for a user. | User |
| `/api/payments/verify` | `POST` | Verifies a payment and activates the subscription. | User |
| `/api/attendance` | `POST` | Marks the attendance of a user at a gym. | User |

## Getting Started

### Prerequisites

-   Node.js
-   npm
-   PostgreSQL
-   Redis

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Set up the environment variables:
    ```bash
    cp .env.example .env
    ```
    Update the `.env` file with your database and Redis credentials.
4.  Run the database migrations:
    ```bash
    npx prisma migrate dev
    ```
5.  Start the server:
    ```bash
    npm start
    ```

The server will be running on `http://localhost:3000`.
