# Backend for Resident Management App

This directory contains the Node.js/Express backend for the application. It serves a REST API that the frontend consumes.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later recommended)
- [PostgreSQL](https://www.postgresql.org/)

## Setup Instructions

1.  **Install Dependencies:**
    Navigate to this `backend` directory in your terminal and run:

    ```bash
    npm install
    ```

2.  **Database Setup:**
    - Make sure you have PostgreSQL installed and running.
    - Create a database. For example, `your_data_qlcd`.
    - Run the initial SQL script to create the tables (if you haven't already).
    - **Important:** Run the `database_update_v2.sql`, `database_update_v3.sql`, `database_update_v4.sql`, and `database_update_v5.sql` scripts to apply necessary schema changes for new features. You can run these scripts using `psql` or a GUI tool like pgAdmin.

3.  **Environment Variables:**
    - In this `backend` directory, create a file named `.env` by copying the `backend/.env.example` template.
    - Fill in the values for your PostgreSQL database connection and other settings.
    - **`CORS_ALLOWED_ORIGINS`**: This is a crucial security setting. It's a comma-separated list of URLs that are allowed to make requests to this backend (e.g., `http://localhost:5173,https://your-frontend-domain.com`).
    - **`JWT...SECRET`**: These are used for signing authentication tokens. You **must** change them to long, random, secret strings for production.

## Running the Server

- **For development (with auto-reloading):**
  This command uses `nodemon` to automatically restart the server when you make changes to the code.

    ```bash
    npm run dev
    ```

- **For production:**
    ```bash
    npm start
    ```

The server will start on the port specified in your `.env` file (e.g., `http://localhost:3002`). The frontend development server is configured to proxy API requests (`/api/...`) to this backend.

## File Storage

User-uploaded images for the feedback feature are stored in a dedicated directory. To support a specific Nginx deployment, the storage location is **hardcoded** to the following path:

- `D:/nginx/nginx-1.28.0/html/dist/picture_feedback`

The Node.js server will create this directory if it doesn't exist and write all uploaded images directly to it.

In your production deployment, you must configure Nginx to serve the `D:/nginx/nginx-1.28.0/html/dist` directory as your web root. This ensures that both the frontend application and the uploaded images are served correctly by Nginx. The Node.js server's role is to handle API requests and place the uploaded files in the correct location for Nginx to find.
