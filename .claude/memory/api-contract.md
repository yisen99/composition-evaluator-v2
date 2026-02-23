# API Contract - Shared Memory

## Authentication Endpoints

### POST /api/v1/auth/send-code
Send SMS verification code.

**Request:**
```typescript
{
  phone: string;           // Phone number
  role_hint: "teacher" | "student";
}
```

**Response:**
```typescript
{
  request_id: string;
  expires_in: number;      // Seconds until expiration
}
```

**Error Codes:**
- 400: Invalid phone format
- 403: Teacher SMS signup disabled
- 429: Too many requests

---

### POST /api/v1/auth/login
Login with SMS verification code.

**Request:**
```typescript
{
  phone: string;
  code: string;            // 6-digit verification code
  display_name?: string;   // Optional display name
}
```

**Response:**
```typescript
{
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    role: "teacher" | "student";
    phone: string;
    display_name: string;
  }
}
```

---

### POST /api/v1/auth/password-login
Login with email and password.

**Request:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:** Same as /login

---

### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request:**
```typescript
{
  refresh_token: string;
}
```

**Response:** Same as /login

---

### GET /api/v1/auth/wechat/authorize
Get WeChat OAuth authorization URL.

**Query Params:**
- `role`: "teacher" | "student"
- `next`: Optional redirect path

**Response:**
```typescript
{
  authorization_url: string;
  state: string;          // OAuth state parameter
}
```

---

### GET /api/v1/auth/wechat/callback
Handle WeChat OAuth callback.

**Query Params:**
- `code`: OAuth authorization code
- `state`: OAuth state parameter
- `error`: Optional error code
- `error_description`: Optional error description

**Response:**
```typescript
{
  role: "teacher" | "student";
  next_path?: string;
  need_bind_phone: boolean;
  // If need_bind_phone is false, include tokens:
  access_token?: string;
  refresh_token?: string;
  user?: UserProfile;
  // If need_bind_phone is true, include bind info:
  bind_ticket?: string;
  bind_expires_in?: number;
  wechat_nickname?: string;
  wechat_avatar_url?: string;
}
```

---

### POST /api/v1/auth/wechat/send-bind-code
Send SMS code for WeChat phone binding.

**Request:**
```typescript
{
  bind_ticket: string;
  phone: string;
}
```

**Response:** Same as /send-code

---

### POST /api/v1/auth/wechat/bind-phone
Complete WeChat account binding with phone.

**Request:**
```typescript
{
  bind_ticket: string;
  phone: string;
  code: string;           // SMS verification code
  display_name?: string;
}
```

**Response:** Same as /login

---

## Data Models

### AuthAccount (Backend)
```python
id: UUID
email: str
hashed_password: str
is_active: bool
is_superuser: bool
is_verified: bool
role: Literal["teacher", "student"]
display_name: str
phone: str | None
created_at: datetime
updated_at: datetime
```

### User (Domain Model)
```python
id: str
role: Literal["teacher", "student"]
phone: str
display_name: str
created_at: datetime
```

### WechatAccountLink
```python
id: str
auth_account_id: UUID
unionid: str | None
openid: str
nickname: str | None
avatar_url: str | None
created_at: datetime
```

### WechatBindSession
```python
ticket: str
role: Literal["teacher", "student"]
unionid: str | None
openid: str
nickname: str | None
avatar_url: str | None
next_path: str | None
expires_at: datetime
consumed_at: datetime | None
```

---

## Frontend Types

```typescript
// User Profile
interface UserProfile {
  id: string;
  role: 'teacher' | 'student';
  phone: string;
  display_name: string;
}

// Login Response
interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

// Send Code Request
interface SendCodeRequest {
  phone: string;
  role_hint: 'teacher' | 'student';
}

// Login Request
interface LoginRequest {
  phone: string;
  code: string;
  display_name?: string;
}

// Password Login Request
interface PasswordLoginRequest {
  email: string;
  password: string;
}

// WeChat Auth Payload
interface WechatAuthPayload {
  role: 'teacher' | 'student';
  next_path?: string;
  need_bind_phone: boolean;
  access_token?: string;
  refresh_token?: string;
  user?: UserProfile;
  bind_ticket?: string;
  bind_expires_in?: number;
  wechat_nickname?: string;
  wechat_avatar_url?: string;
}
```

---

## Error Response Format

```typescript
{
  detail: string;          // Human-readable error message
}
```

Common HTTP Status Codes:
- 400: Bad Request (invalid input)
- 401: Unauthorized (invalid credentials)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate resource)
- 429: Too Many Requests
- 500: Internal Server Error

---

## Configuration

### Environment Variables (Backend)
```
AUTH_CODE_EXPIRE_SECONDS=300        # 5 minutes
WECHAT_BIND_TICKET_EXPIRE_SECONDS=600  # 10 minutes
WECHAT_APP_ID=xxx
WECHAT_APP_SECRET=xxx
```

### Frontend Configuration
```typescript
const AUTH_CONFIG = {
  codeLength: 6,
  codeResendDelay: 60,  // seconds
  tokenRefreshBuffer: 300,  // Refresh 5min before expiry
};
```

---

## Security Considerations

1. **Rate Limiting**: (TO BE IMPLEMENTED)
   - 10 requests per minute per IP
   - 3 failed login attempts triggers 15min lockout

2. **Token Security**:
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Tokens stored in httpOnly cookies

3. **Input Validation**:
   - Phone: E.164 format
   - Email: RFC 5322
   - Password: min 8 characters

4. **CORS**: Configured for frontend domain only

---

## Version History

- v1.0 (2025-02-22): Initial auth API
- v1.1 (2025-02-19): Added WeChat OAuth
- v1.2 (2025-02-20): Added phone binding flow

---

## TODO

- [ ] Add rate limiting
- [ ] Implement audit logging
- [ ] Add CSRF protection
- [ ] Implement session fixation protection
- [ ] Add security event monitoring
- [ ] Implement password complexity requirements
