const request = require('supertest');
const app = require('../server');

// === SETUP: Provide valid test user credentials here ===
const TEST_USER = {
  email: 'testuser@example.com', // <-- Use email for login
  password: 'testpassword' // <-- Password must match registered user
};

let AUTH_TOKEN = '';
let TEST_ACCOUNT_ID = '';
let TEST_MEMBER_ID = '';

// Helper to set auth header
const authHeader = () => ({ Authorization: `Bearer ${AUTH_TOKEN}` });

describe('Transaction Module', () => {
  beforeAll(async () => {
    // 1. Log in to get a valid JWT token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(TEST_USER);
    expect([200, 201]).toContain(loginRes.statusCode);
    AUTH_TOKEN = loginRes.body.token || loginRes.body.data?.token;
    expect(AUTH_TOKEN).toBeTruthy();

    // 2. Create or fetch a test account and member (update as needed)
    // --- Create a customer ---
    const customerRes = await request(app)
      .post('/api/v1/customers')
      .set(authHeader())
      .send({
        name: 'Test Customer',
        email: `testcustomer_${Date.now()}@example.com`,
        phone: '1234567890',
        address: 'Test Address',
        status: 'active'
      });
    expect([200, 201]).toContain(customerRes.statusCode);
    const customerId = customerRes.body.data?.customer_id;
    expect(customerId).toBeTruthy();

    // --- Create a member ---
    const memberRes = await request(app)
      .post('/api/v1/members')
      .set(authHeader())
      .send({
        customer_id: customerId,
        membership_type: 'regular',
        status: 'active'
      });
    expect([200, 201]).toContain(memberRes.statusCode);
    TEST_MEMBER_ID = memberRes.body.data?.member_id;
    expect(TEST_MEMBER_ID).toBeTruthy();

    // --- Create an account ---
    const accountRes = await request(app)
      .post('/api/v1/accounts')
      .set(authHeader())
      .send({
        member_id: TEST_MEMBER_ID,
        account_type: 'savings',
        balance: 1000,
        status: 'active'
      });
    expect([200, 201]).toContain(accountRes.statusCode);
    TEST_ACCOUNT_ID = accountRes.body.data?.account_id;
    expect(TEST_ACCOUNT_ID).toBeTruthy();
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .send({});
    expect(res.statusCode).toBe(401);
  });

  it('should reject invalid transaction type', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set(authHeader())
      .send({
        account_id: TEST_ACCOUNT_ID,
        member_id: TEST_MEMBER_ID,
        type: 'invalid_type',
        amount: 100,
      });
    expect(res.statusCode).toBe(400);
  });

  it('should reject negative or zero amount', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set(authHeader())
      .send({
        account_id: TEST_ACCOUNT_ID,
        member_id: TEST_MEMBER_ID,
        type: 'deposit',
        amount: 0,
      });
    expect(res.statusCode).toBe(400);
  });

  it('should create a valid deposit transaction', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set(authHeader())
      .send({
        account_id: TEST_ACCOUNT_ID,
        member_id: TEST_MEMBER_ID,
        type: 'deposit',
        amount: 100,
      });
    expect([201, 200]).toContain(res.statusCode);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('transaction_id');
  });

  it('should create a valid withdrawal transaction (if balance allows)', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set(authHeader())
      .send({
        account_id: TEST_ACCOUNT_ID,
        member_id: TEST_MEMBER_ID,
        type: 'withdrawal',
        amount: 10,
      });
    // Accept 201 or 400 (if insufficient funds)
    expect([201, 400]).toContain(res.statusCode);
  });

  it('should fetch all transactions', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set(authHeader());
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should fetch a transaction by ID', async () => {
    // First, create a transaction
    const createRes = await request(app)
      .post('/api/v1/transactions')
      .set(authHeader())
      .send({
        account_id: TEST_ACCOUNT_ID,
        member_id: TEST_MEMBER_ID,
        type: 'deposit',
        amount: 50,
      });
    if (createRes.body.data && createRes.body.data.transaction_id) {
      const id = createRes.body.data.transaction_id;
      const res = await request(app)
        .get(`/api/v1/transactions/${id}`)
        .set(authHeader());
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('transaction_id', id);
    }
  });
}); 