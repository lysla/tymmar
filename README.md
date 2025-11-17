# Tymmar - Time Tracking Application

Modern time tracking system for managing employee work hours, sick leave, and time off. Built with React 19, TypeScript, and serverless architecture.

## Features

- **Weekly Time Entry Grid** - Log work hours for each day with intuitive interface
- **AI-Assisted Hour Filling** - Automatic hour suggestions using OpenAI GPT-4o-mini
- **Period Management** - Close and reopen work periods with full history tracking
- **Admin Dashboard** - Manage employees, settings, and generate reports
- **CSV Export** - Download reports for external analysis
- **Role-Based Access** - Separate admin and employee permissions

## Tech Stack

**Frontend:**
- React 19.1.1 with TypeScript 5.9.3
- Vite 7.1.7 for blazing-fast builds
- Tailwind CSS 4.1.14 for styling
- React Router 7.9.4 for navigation
- date-fns for date manipulation

**Backend:**
- Vercel Serverless Functions (Node.js)
- Drizzle ORM 0.44.6 for type-safe database access
- PostgreSQL via Supabase
- OpenAI SDK for AI features

**Infrastructure:**
- Supabase for authentication and database hosting
- Vercel for deployment and serverless functions
- NX 21.6.3 for monorepo tooling
- GitHub Actions for CI/CD

## Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase account)
- OpenAI API key
- Vercel account (for deployment)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tymmar.git
cd tymmar

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# OpenAI
OPENAI_API_KEY=sk-...

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret-here
```

**How to obtain credentials:**

1. **Supabase**: Sign up at [supabase.com](https://supabase.com), create a project, and find credentials in Project Settings > API
2. **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
3. **Database URL**: Use Supabase's connection string or your own PostgreSQL instance

### Database Setup

```bash
# Push database schema to your database
npm run db:push

# (Optional) Open Drizzle Studio to view/edit data
npm run db:studio
```

### Create Admin User

After database setup, make your user an admin:

```bash
# Connect to your Supabase project SQL editor and run:
UPDATE employees
SET admin = true
WHERE email = 'your-email@example.com';
```

## Development

### Running Locally

```bash
# Start development server
npm run dev

# Server will run at http://localhost:5173
```

### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### Database Commands

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Building for Production

```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

## Deployment

### Deploy to Vercel

1. **Push code to GitHub**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Vite configuration

3. **Configure Environment Variables**
   - In Vercel project settings, add all environment variables from your `.env`
   - Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `DATABASE_URL`, `JWT_SECRET`

4. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - Serverless functions in `/api` directory are automatically deployed

## Project Structure

```
tymmar/
├── src/                    # Frontend React application
│   ├── components/         # Reusable UI components
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── helpers/           # Utility functions
│   └── types/             # TypeScript type definitions
├── api/                   # Serverless API endpoints
│   ├── _shared/          # Shared utilities (auth, db)
│   ├── _employees/       # Employee operations
│   ├── _entries/         # Day entry operations
│   ├── _periods/         # Period management
│   └── _settings/        # Settings management
├── db/                    # Database schema (Drizzle ORM)
└── public/               # Static assets
```

## Architecture

For detailed architecture documentation, see [.aiden-context/architecture.md](.aiden-context/architecture.md).

**Key Design Decisions:**
- **Serverless Architecture**: Scales automatically, pay-per-use pricing
- **Type-Safe ORM**: Drizzle provides end-to-end type safety
- **Context-Based State**: React Context API for state management
- **AI Integration**: OpenAI for intelligent hour filling suggestions

## Security Notes

⚠️ **Important**: Never commit `.env` files to version control. Always use environment variables for sensitive data.

The project includes Row-Level Security (RLS) policies in Supabase to ensure data isolation between employees.

## Known Issues & Roadmap

See [.aiden-context/risks-and-bugs.md](.aiden-context/risks-and-bugs.md) for:
- Known bugs and technical issues
- Security considerations
- Technical debt items
- Future improvements

See [.aiden-context/plan.md](.aiden-context/plan.md) for:
- Detailed refactoring plan
- Prioritized improvements
- Implementation roadmap

## Testing

**Current Status**: Testing infrastructure is planned but not yet implemented.

**Planned Stack**:
- Vitest for unit and integration tests
- React Testing Library for component tests
- MSW for API mocking
- Playwright for E2E tests

See task T-010 and T-011 in [.aiden-context/plan.md](.aiden-context/plan.md).

## Contributing

This is a personal professional-growth project, but suggestions and feedback are welcome!

**Code Style:**
- Follow existing patterns and conventions
- Use TypeScript strictly
- Write meaningful comments explaining intent
- Ensure linting passes (`npm run lint`)

## Tech Showcase

This project demonstrates proficiency with:
- ✅ React 19 and modern hooks patterns
- ✅ TypeScript strict mode and type safety
- ✅ Serverless architecture with Vercel Functions
- ✅ Database design and ORM usage (Drizzle)
- ✅ Authentication and authorization (Supabase)
- ✅ AI integration (OpenAI SDK)
- ✅ Modern build tools (Vite, NX)
- ✅ CI/CD with GitHub Actions

## License

[Your License Here]

## Contact

[Your Contact Information]

---

**Documentation**: All detailed documentation is in the `.aiden-context/` directory:
- `project-overview.md` - Project goals and features
- `architecture.md` - System architecture and design decisions
- `risks-and-bugs.md` - Known issues and technical debt
- `plan.md` - Refactoring and improvement plan
