from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from datetime import datetime

from supabase_client import supabase
from utils import generate_uid
from auth_utils import verify_password
from jwt_utils import create_access_token
from auth_dependency import get_current_user, require_role
from email_service import send_qr_email


app = FastAPI(title="AIC Check-in System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost",
        "http://frontend",
        "https://aic-checkin-system.vercel.app",
        "https://aic-scanner.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# BASIC HEALTH CHECK
# --------------------------------------------------

@app.get("/", response_class=HTMLResponse)
def root():
    return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>AIC Check-in System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #f1f5f9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 48px 56px;
      text-align: center;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 25px 50px rgba(0,0,0,0.4);
    }
    .status-dot {
      width: 14px;
      height: 14px;
      background: #22c55e;
      border-radius: 50%;
      display: inline-block;
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .badge {
      display: inline-flex;
      align-items: center;
      background: #14532d;
      color: #86efac;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      margin-bottom: 28px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 10px;
      color: #f8fafc;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .endpoints {
      background: #0f172a;
      border-radius: 10px;
      padding: 20px;
      text-align: left;
    }
    .endpoints h3 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin-bottom: 14px;
    }
    .endpoint {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .method {
      font-weight: 700;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      min-width: 42px;
      text-align: center;
    }
    .get  { background: #1d4ed8; color: #bfdbfe; }
    .post { background: #065f46; color: #a7f3d0; }
    .path { color: #cbd5e1; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="status-dot"></span>Backend is Running</div>
    <h1>AIC Check-in System</h1>
    <p>The backend server is up and connected to Supabase. All API endpoints are ready.</p>
    <div class="endpoints">
      <h3>Available Endpoints</h3>
      <div class="endpoint"><span class="method get">GET</span><span class="path">/</span></div>
      <div class="endpoint"><span class="method get">GET</span><span class="path">/test-db</span></div>
      <div class="endpoint"><span class="method get">GET</span><span class="path">/stats</span></div>
      <div class="endpoint"><span class="method post">POST</span><span class="path">/register</span></div>
      <div class="endpoint"><span class="method post">POST</span><span class="path">/login</span></div>
      <div class="endpoint"><span class="method post">POST</span><span class="path">/scan</span></div>
      <div class="endpoint"><span class="method post">POST</span><span class="path">/checkin</span></div>
    </div>
  </div>
</body>
</html>
"""


@app.get("/test-db")
def test_db():
    result = supabase.table("participants").select("*", count="exact").execute()
    return {"ok": True, "participants": result.count}


# --------------------------------------------------
# REGISTRATION (USED BY GOOGLE FORM OR API)
# --------------------------------------------------

@app.post("/register")
def register_participant(payload: dict, background_tasks: BackgroundTasks):
    email = payload.get("email")
    name = payload.get("name") or ""

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    existing = (
        supabase.table("participants")
        .select("id")
        .eq("email", email)
        .execute()
    )

    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    uid = generate_uid()

    row = {
        "uid": uid,
        "name": name,
        "email": email,
        "phone": payload.get("phone") or "",
        "college": payload.get("college") or "",
        "role": (payload.get("role") or "participant").lower(),
        "checked_in": False,
        "created_at": datetime.utcnow().isoformat(),
    }

    try:
        supabase.table("participants").insert(row).execute()
        
        # ---------------------------------------------------
        # SEND EMAIL IN THE BACKGROUND
        # ---------------------------------------------------
        background_tasks.add_task(send_qr_email, email, name, uid)

        return {
            "success": True,
            "uid": uid,
            "message": "Registration successful. QR is being sent via email."
        }
    except Exception as e:
        import traceback
        error_info = traceback.format_exc()
        print(f"CRITICAL REGISTRATION ERROR: {error_info}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


# --------------------------------------------------
# SCAN QR (READ-ONLY)
# --------------------------------------------------

@app.post("/scan")
def scan_participant(payload: dict, user=Depends(get_current_user)):
    uid = payload.get("uid")

    if not uid:
        raise HTTPException(status_code=400, detail="UID is required")

    result = (
        supabase.table("participants")
        .select("*")
        .eq("uid", uid)
        .execute()
    )

    if not result.data:
        return {"valid": False, "message": "Invalid QR code"}

    participant = result.data[0]

    return {
        "valid": True,
        "already_checked_in": participant.get("checked_in", False),
        "participant": {
            "uid": participant["uid"],
            "name": participant["name"],
            "email": participant["email"],
            "phone": participant["phone"],
            "college": participant["college"],
            "role": participant["role"],
        },
        "checkin_time": participant.get("checkin_time"),
    }


# --------------------------------------------------
# CONFIRM CHECK-IN
# --------------------------------------------------

@app.post("/checkin")
def confirm_checkin(payload: dict, user=Depends(get_current_user)):
    uid = payload.get("uid")

    if not uid:
        raise HTTPException(status_code=400, detail="UID is required")

    result = (
        supabase.table("participants")
        .select("*")
        .eq("uid", uid)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Invalid QR code")

    participant = result.data[0]

    if participant.get("checked_in"):
        return {
            "status": "already_checked_in",
            "message": "Participant already checked in"
        }

    supabase.table("participants").update({
        "checked_in": True,
        "checkin_time": datetime.utcnow().isoformat(),
    }).eq("uid", uid).execute()

    return {
        "status": "checked_in",
        "message": "Check-in successful"
    }


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.post("/login")
def login(payload: dict):
    username = payload.get("username")
    password = payload.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    result = (
        supabase.table("users")
        .select("*")
        .eq("username", username)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = result.data[0]

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="User is disabled")

    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({
        "username": user["username"],
        "role": user["role"],
    })

    return {
        "access_token": token,
        "role": user["role"],
    }


# --------------------------------------------------
# ADMIN STATS
# --------------------------------------------------

@app.get("/stats")
def get_stats(user=Depends(require_role("admin"))):
    all_participants = (
        supabase.table("participants")
        .select("*")
        .execute()
    )

    participants = all_participants.data or []
    total = len(participants)
    checked_in_list = [p for p in participants if p.get("checked_in")]
    checked_in = len(checked_in_list)
    pending = total - checked_in

    role_counts = {}
    for p in participants:
        role = p.get("role") or "unknown"
        role_counts[role] = role_counts.get(role, 0) + 1

    # Sort checked-in participants by checkin_time descending, take last 10
    checked_in_list.sort(
        key=lambda p: p.get("checkin_time") or "",
        reverse=True
    )
    recent = checked_in_list[:10]

    return {
        "total_registrations": total,
        "checked_in": checked_in,
        "pending": pending,
        "role_breakdown": role_counts,
        "recent_checkins": [
            {
                "name": p.get("name"),
                "email": p.get("email"),
                "role": p.get("role"),
                "checkin_time": p.get("checkin_time"),
            }
            for p in recent
        ],
    }
