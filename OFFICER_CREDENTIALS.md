# KisanFlow Officer Command Portal - Login Credentials

## 🔐 Default Officer Accounts

### **Account 1: Kapurthala Officer**
```
Username: officer_kapurthala
Password: KapurthalaOfficer@123
Role: OFFICER
Centre: Kapurthala Main Mandi (कपूरथला मुख्य मंडी)
```

### **Account 2: Patiala Officer**
```
Username: officer_patiala
Password: PatialaOfficer@123
Role: OFFICER
Centre: Patiala Central Yard (पटियाला सेंट्रल यार्ड)
```

### **Account 3: District Manager (Supervisor)**
```
Username: district_manager
Password: DistrictManager@123
Role: DISTRICT_OFFICER
Centre: All Centres (Regional Management)
```

---

## 📍 Login Steps

### **Option A: Web Browser (Officer Dashboard)**
1. Go to: `http://localhost:3001`
2. Click "Officer Login" or "ऑफिसर लॉगिन"
3. Enter **username** (e.g., `officer_kapurthala`)
4. Enter **password** (e.g., `KapurthalaOfficer@123`)
5. Click "Login" / "लॉगिन करें"
6. On success → Redirected to **District Command Centre**

### **Option B: API (Backend Direct)**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "officer_kapurthala",
    "password": "KapurthalaOfficer@123"
  }'
```

**Success Response (HTTP 200):**
```json
{
  "status": "SUCCESS",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 1200,
  "role": "OFFICER",
  "userId": "00000001-0000-0000-0000-000000000001"
}
```

Then use the `token` in future API calls:
```bash
curl -X GET http://localhost:8080/api/v1/farmers \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🗄️ Database Setup

### **Step 1: Apply SQL Script**

After starting the Docker containers, run the initialization script:

```powershell
# From kisanflow-project directory
docker exec kisanflow-postgres psql -U kisanflow -d kisanflow -f /scripts/init-officer-accounts.sql
```

**OR manually in pgAdmin:**
1. Open pgAdmin: `http://localhost:5050`
2. Login with:
   - Email: `admin@kisanflow.local`
   - Password: `change-me`
3. Navigate to Database: `kisanflow`
4. Open **Query Tool**
5. Paste the SQL from `scripts/init-officer-accounts.sql`
6. Click **Execute** (F5)

### **Step 2: Verify Accounts Created**

```bash
docker exec kisanflow-postgres psql -U kisanflow -d kisanflow -c \
  'SELECT username, role, "linkedCentreId" FROM "usersAuth" WHERE role IN ('"'"'OFFICER'"'"', '"'"'DISTRICT_OFFICER'"'"');'
```

Expected output:
```
      username      |       role        |           linkedCentreId           
-------------------+-------------------+------------------------------------
 officer_kapurthala | OFFICER           | f47ac10b-58cc-4372-a567-0e02b2c3d479
 officer_patiala    | OFFICER           | f47ac10b-58cc-4372-a567-0e02b2c3d480
 district_manager   | DISTRICT_OFFICER  | 
```

---

## 🔓 Change Password (Optional)

Officers can update their password via the backend. To manually update in database:

```sql
-- Update password hash for officer_kapurthala
-- New password: NewPassword@123
UPDATE "usersAuth" 
SET "passwordHash" = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/1Rm'
WHERE username = 'officer_kapurthala';
```

To generate a new BCrypt hash, use an online tool or Spring Boot CLI:
```bash
spring encodepassword YourNewPassword@123
```

---

## ⚙️ Officer Permissions

| Action | OFFICER | DISTRICT_OFFICER |
|--------|---------|------------------|
| View Farmers | ✅ | ✅ |
| Create/Edit Centres | ❌ | ✅ |
| View Queue Status | ✅ | ✅ |
| Update Booking Status | ✅ | ✅ |
| Record Payments | ✅ | ✅ |
| Create Crisis Alerts | ✅ | ✅ |
| Resolve Crisis Alerts | ❌ | ✅ |
| Create Anomaly Flags | ✅ | ✅ |
| View Overdue Payments | ✅ | ✅ |

---

## 🚀 First Steps After Login

1. **View Queue Status**: `/api/v1/centres/{centreId}/queue`
2. **Create a Booking**: Help a farmer book a slot
3. **Update Token Status**: Move farmers through procurement stages
4. **View Payments**: Track payment status and overdue alerts
5. **Monitor Crises**: Check active crisis alerts and anomalies

---

## 🔗 Related Documentation

- **Officer Dashboard**: [kisanflow-frontend/src/pages/officer/](../kisanflow-frontend/src/pages/officer/)
- **Auth Controller**: [kisanflow-backend/src/main/java/com/kisanflow/controller/AuthController.java](../kisanflow-backend/src/main/java/com/kisanflow/controller/AuthController.java)
- **API Swagger**: `http://localhost:8080/swagger-ui.html`

---

## ❓ Troubleshooting

### "Invalid credentials" error
- ✅ Verify username spelling (case-sensitive)
- ✅ Check password doesn't have extra spaces
- ✅ Confirm account exists in database (run verification query above)

### JWT token expired
- ✅ Token expires in 20 minutes
- ✅ Use `refreshToken` endpoint to get a new access token

### Database connection failed
- ✅ Ensure PostgreSQL container is running: `docker ps`
- ✅ Check database port in `.env` file (default: 5432)

