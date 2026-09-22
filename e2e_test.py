import urllib.request
import urllib.parse
import json
import time
import os
import requests
import os

BASE_URL = "http://localhost:8080"
AI_URL = "http://localhost:8000"

print("=======================================")
print("KISANFLOW END-TO-END VERIFICATION")
print("=======================================")

def check(condition, msg):
    if condition:
        print(f"✅ PASS: {msg}")
    else:
        print(f"❌ FAIL: {msg}")

def get_auth_token(username, password):
    r = requests.post(f"{BASE_URL}/api/v1/auth/login", json={"username": username, "password": password})
    if r.status_code != 200:
        print(f"Login failed: {r.text}")
        return None
    return r.json().get("token")

def run_tests():
    # --- 2. Empty Database Test ---
    print("\n--- 2. Empty Database Test ---")
    r = requests.get(f"{BASE_URL}/api/v1/auth/me")
    check(r.status_code == 401, "No unauthorized access allowed")
    
    # Check if bookings are empty
    # We need a token for that. Let's get an officer token.
    officer_token = get_auth_token("officer_kapurthala", "KapurthalaOfficer@123")
    check(officer_token is not None, "Officer login successful")
    headers = {"Authorization": f"Bearer {officer_token}"}
    
    r = requests.get(f"{BASE_URL}/api/v1/centres", headers=headers)
    centres = r.json()
    check(len(centres) > 0, "Centres exist")
    centre_id = centres[0]['id']

    # --- 3. Core Scenario Testing ---
    print("\n--- 3. Core Scenario Testing ---")
    
    # 1. Register Farmer
    farmer_data = {
        "name": "E2E Farmer",
        "mobileNumber": "+918888888888",
        "village": "Test Village",
        "cropType": "Wheat",
        "preferredLanguage": "hi"
    }
    r = requests.post(f"{BASE_URL}/api/v1/farmers", json=farmer_data)
    check(r.status_code in [200, 201], f"Farmer registration status {r.status_code}")
    farmer_id = r.json().get('id')
    
    # 2. Get Mandi recommendation via AI
    print("\nTesting AI Recommendation...")
    ai_req = requests.get(f"{BASE_URL}/api/v1/ai/recommend?farmerId={farmer_id}&lat=31.38&lon=75.38", headers=headers)
    if ai_req.status_code == 200:
        check(True, "AI recommendation successful")
    else:
        check(False, f"AI recommendation failed: {ai_req.text}")
    
    # 3. Book Slot
    print("\nBooking Slot...")
    booking_data = {
        "farmerId": farmer_id,
        "centreId": centre_id,
        "bookingDate": "2026-10-01",
        "timeSlot": "09:00:00",
        "produceQuantity": 50.0
    }
    r = requests.post(f"{BASE_URL}/api/v1/bookings", json=booking_data, headers=headers)
    check(r.status_code in [200, 201], f"Booking generation status: {r.status_code}")
    if r.status_code not in [200, 201]: return
    booking = r.json()
    booking_id = booking['id']
    token_num = booking['tokenNumber']
    qr_id = booking['qrId']
    qr_payload = f"KFQR:{qr_id}"
    check(token_num > 0, f"Token number generated: {token_num}")
    
    # 4. QR Entry Scan
    print("\nSimulating Gate Entry...")
    scan_url = f"{BASE_URL}/api/v1/entry-exit/scan"
    r = requests.post(scan_url, params={"qrId": qr_payload}, headers=headers)
    check(r.status_code == 200, f"Gate Entry Status: {r.status_code}")
    if r.status_code == 200:
        scan_res = r.json()
        check(scan_res.get('event') == 'GATE_ENTRY', f"Event: {scan_res.get('event')}")
        check(scan_res.get('currentOccupancy', 0) > 0, f"Occupancy: {scan_res.get('currentOccupancy')}")
        
    # 5. Process Queue / Procurement Workflow
    print("\nProcessing Procurement Workflow...")
    action_url = f"{BASE_URL}/api/v1/queue/centres/{centre_id}/actions"
    
    # Arrived
    r = requests.post(action_url, params={"action": "PROCESS_ARRIVAL"}, headers=headers)
    check(r.status_code == 200, "PROCESS_ARRIVAL successful")
    
    # Weighing
    r = requests.post(action_url, params={"action": "COMPLETE_WEIGHING", "actualWeight": 50.5}, headers=headers)
    check(r.status_code == 200, "COMPLETE_WEIGHING successful")
    
    # Quality Check
    r = requests.post(action_url, params={"action": "COMPLETE_QUALITY", "qualityGrade": "Grade A"}, headers=headers)
    check(r.status_code == 200, "COMPLETE_QUALITY successful")
    
    # Eligible for Auction
    r = requests.post(action_url, params={"action": "ELIGIBLE_FOR_AUCTION", "basePrice": 2500.0}, headers=headers)
    check(r.status_code == 200, "ELIGIBLE_FOR_AUCTION successful")
    
    # 6. Trader Bidding
    print("\nSimulating Trader Bidding...")
    trader_token = get_auth_token("demo_trader", "Trader@123")
    check(trader_token is not None, "Trader login successful")
    trader_headers = {"Authorization": f"Bearer {trader_token}"}
    
    r = requests.get(f"{BASE_URL}/api/v1/trader/lots/active", headers=trader_headers)
    active_lots = r.json()
    check(len(active_lots) > 0, f"Found {len(active_lots)} active lots")
    
    if len(active_lots) > 0:
        lot_id = active_lots[0]['id']
        bid_data = {"traderId": active_lots[0].get('highestBidderId', "00000000-0000-0000-0000-000000000000"), "amount": 2600.0}
        # Actually need trader ID. Let's get trader profile
        r_trader = requests.get(f"{BASE_URL}/api/v1/auth/me", headers=trader_headers)
        trader_id = r_trader.json().get('traderId')
        bid_data['traderId'] = trader_id
        
        r = requests.post(f"{BASE_URL}/api/v1/trader/lots/{lot_id}/bids", json=bid_data, headers=trader_headers)
        check(r.status_code == 200, f"Bid placed successfully: {r.status_code}")
        
        # Officer approves procurement
        print("\nOfficer Completing Procurement...")
        r = requests.post(action_url, params={"action": "COMPLETE_PROCUREMENT", "finalPrice": 2600.0, "buyerId": trader_id}, headers=headers)
        check(r.status_code == 200, "COMPLETE_PROCUREMENT successful")
    
    # Payment Released
    r = requests.post(action_url, params={"action": "RELEASE_PAYMENT"}, headers=headers)
    check(r.status_code == 200, "RELEASE_PAYMENT successful")
    
    # 7. QR Exit Scan
    print("\nSimulating Gate Exit...")
    r = requests.post(scan_url, params={"qrId": qr_payload}, headers=headers)
    check(r.status_code == 200, f"Gate Exit Status: {r.status_code}")
    if r.status_code == 200:
        scan_res = r.json()
        check(scan_res.get('event') == 'GATE_EXIT', f"Event: {scan_res.get('event')}")
    
    # 8. Security Tests
    print("\n--- 8. Security Tests ---")
    r = requests.post(action_url, params={"action": "PROCESS_ARRIVAL"}, headers=trader_headers)
    check(r.status_code in [401, 403], f"Trader cannot access Officer API (Got {r.status_code})")
    
    print("\nEnd of automated tests. Run 'docker compose restart backend' to test persistence.")

if __name__ == "__main__":
    run_tests()
