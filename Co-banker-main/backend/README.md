# CoBanker Backend

A robust, secure, and scalable backend for the CoBanker cooperative banking system built with Node.js, Express, and Supabase.

## Architecture

```
backend/
├── src/
│   ├── config/          # Database and external service configurations
│   ├── controllers/     # Business logic and request handlers
│   ├── database/        # Migration and seeding scripts
│   ├── middleware/      # Authentication, validation, and error handling
│   ├── models/          # Data models and business logic
│   ├── routes/          # API route definitions
│   ├── utils/           # Utility functions and helpers
│   └── server.js        # Main application entry point
├── logs/                # Application logs
├── uploads/             # File uploads
├── package.json         # Dependencies and scripts
└── env.example          # Environment variables template
```

## Features

### Implemented
- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Bank Employee, Branch Employee, Customer)
  - Branch and bank-specific authorization
  - Password hashing with bcrypt

- **Account Management**
  - Create, read, update, and manage bank accounts
  - Support for multiple account types (Savings, Current, FD, RD, Loan, Demat)
  - Account status management (Active, Inactive, Suspended, Closed)
  - Balance tracking and updates
  - Interest rate and fee management

- **Security Features**
  - Input validation and sanitization
  - Rate limiting and request throttling
  - CORS protection
  - Helmet security headers
  - Comprehensive error handling
  - Request logging and monitoring

- **Database**
  - Supabase integration with PostgreSQL
  - Row Level Security (RLS) policies
  - Optimized indexes for performance
  - Data validation and constraints

### Coming Soon
- Customer Management
- Transaction Processing
- Loan Management
- Recurring Deposits
- Inter-branch Transfers
- Biometric Verification
- Government Scheme Tracking

## Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd Co-banker-main/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3001
   API_VERSION=v1

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=24h

   # Security
   BCRYPT_ROUNDS=12
   ```

4. **Database Setup**
   ```bash
   # Run migrations to create tables
   npm run migrate
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication Endpoints

#### POST `/api/v1/auth/login`
Login with email and password.
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/api/v1/auth/register`
Register a new user.
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "bank_employee",
  "bank_id": "uuid",
  "branch_id": "uuid"
}
```

### Account Endpoints

#### POST `/api/v1/accounts`
Create a new account.
```json
{
  "customer_id": "uuid",
  "account_type": "savings",
  "initial_balance": 1000.00,
  "interest_rate": 4.5,
  "minimum_balance": 500.00,
  "description": "Primary savings account"
}
```

#### GET `/api/v1/accounts/:id`
Get account by ID.

#### GET `/api/v1/accounts/number/:accountNumber`
Get account by account number.

#### GET `/api/v1/accounts/customer/:customerId`
Get all accounts for a customer.

#### PUT `/api/v1/accounts/:id`
Update account details.

#### PATCH `/api/v1/accounts/:id/balance`
Update account balance.
```json
{
  "amount": 500.00,
  "transaction_type": "credit"
}
```

#### PATCH `/api/v1/accounts/:id/close`
Close an account.

#### PATCH `/api/v1/accounts/:id/suspend`
Suspend an account.

#### PATCH `/api/v1/accounts/:id/activate`
Activate an account.

#### GET `/api/v1/accounts/stats`
Get account statistics.

## Security

### Authentication Flow
1. User provides credentials
2. Server validates and returns JWT token
3. Client includes token in Authorization header
4. Server validates token on each request

### Authorization Levels
- **Admin**: Full system access
- **Bank Employee**: Access to all branches in their bank
- **Branch Employee**: Access to their specific branch
- **Customer**: Access to their own accounts

### Data Protection
- All passwords are hashed using bcrypt
- JWT tokens are signed and verified
- Row Level Security (RLS) in database
- Input validation and sanitization
- Rate limiting to prevent abuse

## Database Schema

### Core Tables
- **users**: User accounts and authentication
- **banks**: Banking institutions
- **branches**: Bank branches
- **customers**: Bank customers
- **accounts**: Bank accounts
- **transactions**: Financial transactions

### Key Features
- UUID primary keys for security
- Timestamps for audit trails
- Foreign key relationships
- Check constraints for data integrity
- Indexes for performance optimization

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Logging

The application uses Winston for structured logging:
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure secure JWT secret
- [ ] Set up proper CORS origins
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting
- [ ] Configure SSL/TLS
- [ ] Set up backup strategy

### Environment Variables
All required environment variables are documented in `env.example`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**CoBanker Backend** - Building the future of cooperative banking 

---

## Recurring Deposits Module: Supabase SQL Schema

-- Table: recurring_deposits
CREATE TABLE IF NOT EXISTS recurring_deposits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid REFERENCES accounts(account_id) ON DELETE CASCADE,
    member_id uuid REFERENCES members(member_id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    amount_per_installment numeric(12,2) NOT NULL,
    frequency text NOT NULL CHECK (frequency IN ('monthly', 'weekly')),
    total_installments int NOT NULL,
    interest_rate numeric(5,2) NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matured', 'closed', 'defaulted')),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: recurring_deposit_payments
CREATE TABLE IF NOT EXISTS recurring_deposit_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rd_id uuid REFERENCES recurring_deposits(id) ON DELETE CASCADE,
    due_date date NOT NULL,
    paid_date date,
    amount numeric(12,2) NOT NULL,
    status text NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'paid', 'missed')),
    transaction_id uuid REFERENCES transactions(transaction_id)
); 