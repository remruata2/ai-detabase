# ICPS AI - AI-Powered Document Processing SaaS

A SaaS platform for AI-powered document processing with subscription-based monetization, built with Next.js.

## Features

- 🤖 AI-powered document processing and chat
- 💳 Subscription-based monetization with Stripe
- 🔐 Hybrid authentication (Auth0 for public users, credentials for admins)
- 📊 Usage tracking and limits
- 🗄️ Prisma ORM with PostgreSQL
- 🎨 Shadcn UI components
- 🛡️ TypeScript support
- 📈 Billing history and invoice management

## Prerequisites

- Node.js 18.0.0 or later
- PostgreSQL database
- npm or yarn

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cid-ai.git
   cd cid-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/yourdb?schema=public"
   
   # NextAuth
   NEXTAUTH_SECRET="your-secret-key" # Generate with: openssl rand -base64 32
   NEXTAUTH_URL="http://localhost:3000"
   
   # OAuth providers (optional)
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   ```

4. **Set up the database**
   ```bash
   # Run database migrations
   npx prisma migrate dev --name init
   
   # Generate Prisma Client
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication

This project uses NextAuth.js with Auth0 integration for authentication:

- Auth0 OAuth for public user registration/login
- Username/Password for admin users
- Role-based access control
- Protected API routes

### Available User Roles

- `ADMIN`: Full access to all features
- `STAFF`: Limited access
- `PUBLIC`: Basic user access
- `PREMIUM`: Unlimited access

## Database Schema

The project uses Prisma ORM with the following models:

- `User`: User accounts and authentication
- `SubscriptionPlan`: Available subscription plans
- `UserSubscription`: User subscription records
- `UsageTracking`: Usage tracking for limits
- `FileList`: Document storage
- `AiApiKey`: AI provider API keys

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| NEXTAUTH_SECRET | Yes | Secret key for NextAuth.js |
| NEXTAUTH_URL | Yes | Base URL of your application |
| AUTH0_CLIENT_ID | Yes | Auth0 client ID |
| AUTH0_CLIENT_SECRET | Yes | Auth0 client secret |
| AUTH0_ISSUER | Yes | Auth0 issuer URL |
| STRIPE_SECRET_KEY | Yes | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | Yes | Stripe webhook secret |

## Project Structure

```
src/
├── app/                    # App router
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth routes
│   │   ├── stripe/         # Stripe integration
│   │   └── chat/           # Chat API
│   ├── dashboard/          # User dashboard
│   ├── billing/            # Billing history
│   ├── pricing/            # Subscription plans
│   └── landing/            # Public landing page
├── components/             # Reusable components
│   ├── ui/                 # Shadcn UI components
│   └── ChangePlan.tsx      # Plan change component
├── lib/                    # Utility functions
│   ├── auth-options.ts     # NextAuth configuration
│   ├── usage.ts            # Usage tracking
│   ├── stripe.ts           # Stripe client
│   └── cache.ts            # Simple caching
├── prisma/                 # Prisma schema
└── scripts/                # Utility scripts
```

## Subscription Plans

- **Free**: 10 file uploads, 20 chat messages, 5 exports per month
- **Premium**: Unlimited usage, advanced AI models ($29/month)

## API Documentation

### Chat API
```
POST /api/chat
Content-Type: application/json

{
  "message": "Your question",
  "conversationHistory": [...],
  "provider": "gemini"
}
```

### File Upload
```
POST /api/parse-document
Content-Type: multipart/form-data

file: <uploaded file>
```

## Deployment

### Vercel

1. Push your code to a GitHub repository
2. Import the repository on Vercel
3. Add your environment variables
4. Deploy!

### Self-hosting

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## License

[MIT](https://choosealicense.com/licenses/mit/)
