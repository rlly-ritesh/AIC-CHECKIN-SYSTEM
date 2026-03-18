import os
import smtplib
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

print(f"Connecting to {SMTP_SERVER}:{SMTP_PORT} as {SMTP_EMAIL}")

try:
    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.set_debuglevel(1)  # Print detailed SMTP dialogue
    server.starttls()
    server.login(SMTP_EMAIL, SMTP_PASSWORD)
    print("Authentication successful!")
    server.quit()
except Exception as e:
    print(f"Authentication failed: {e}")
