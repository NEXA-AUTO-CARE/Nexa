# Nexa Web Application

The frontend web application for **Nexa Auto Care**, built with modern web technologies to provide a seamless, responsive, and intuitive user experience for auto care bookings and management.

## Tech Stack

This project is built using the following core technologies:

- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) (Accessible headless UI components)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
- **Payments**: [Stripe Elements](https://stripe.com/docs/stripe-js/react)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Date Utilities**: [date-fns](https://date-fns.org/)

## Prerequisites

Before running the application, ensure you have the following installed:

- Node.js (v20+ recommended)
- npm, yarn, or pnpm
- Access to the internal `@nexa/shared` workspace package

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env` file in the root of the `apps/web` directory (or use `.env.local`). You may need to configure variables for API URLs, Stripe publishable keys, etc.

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173` (or the port specified by Vite).

## Available Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Compiles TypeScript and builds the app for production into the `dist` folder.
- `npm run lint`: Runs ESLint to check for code quality and formatting issues.
- `npm run preview`: Bootstraps a local web server to serve the production build from the `dist` folder.

## Project Structure

- `src/` - Contains the React source code.
  - Components, pages, hooks, and utilities are housed here.
- `public/` - Static assets that are served directly.
- `Dockerfile` & `nginx.conf` - Configuration for containerizing the application for production deployment (e.g., to AWS ECS).

## Deployment

The application is containerized using Docker and deployed using an Nginx web server to serve the static built files. Production deployments are orchestrated via AWS (ECS, CloudFront).
