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

