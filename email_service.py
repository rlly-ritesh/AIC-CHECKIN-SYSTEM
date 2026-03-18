import os
import smtplib
import io
import qrcode
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

# We use standard SMTP variables that can point to Brevo, SendGrid, Resend, etc.
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp-relay.brevo.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def generate_qr_bytes(uid: str) -> bytes:
    """Generates a QR code image entirely in memory and returns its bytes."""
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uid)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    return img_byte_arr.getvalue()


def send_qr_email(to_email: str, name: str, uid: str):
    """Generates the QR code and emails it to the participant."""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"Warning: SMTP credentials not set, email not sent to {to_email}.")
        return

    msg = EmailMessage()
    msg["Subject"] = "AIC SOA 2026 | Your Entry QR Code"
    
    # Clean sender representation (important for avoid spam filters)
    # Brevo drops emails silently if the From address doesn't exactly match the account
    sender_email = "aic.soa.2026@gmail.com" # The verified email on Brevo
    msg["From"] = f"AIC SOA <{sender_email}>"
    msg["To"] = to_email

    # Plain text fallback
    msg.set_content(f"""
Dear {name},

Thank you for registering for the AIC–SOA program.

Your Entry ID: {uid}

Please find your QR code attached to this email. Show this QR code at the venue entrance.

Venue: SOA Convention Hall
Date: 7 Feb 2026

Regards,
AIC SOA Foundation
""")

    # HTML Body exactly matching old script
    html_content = f"""
    <html>
      <body style="font-family: Arial;">
        <h2>AI for Education 2026</h2>
        <p><strong>Policy • Practice • Future Pathways</strong></p>

        <p>Dear {name},</p>

        <p><strong>Your Entry ID:</strong> {uid}</p>

        <img src="cid:qr_image" width="220" alt="QR Code"/>

        <p>📍 SOA Convention Hall<br/>
        🗓️ 7 Feb 2026</p>

        <p><strong>Please do not share this QR.</strong></p>

        <p>Regards,<br/>AIC SOA Foundation</p>
      </body>
    </html>
    """
    
    msg.add_alternative(html_content, subtype="html")

    # Generate the QR code image
    qr_bytes = generate_qr_bytes(uid)
    
    # Attach the QR code and assign a Content-ID so the HTML <img> tag can reference it
    # We add it as an attachment, but specify it's an inline cid reference.
    msg.add_attachment(qr_bytes, maintype='image', subtype='png', filename=f'AIC_QR_{uid}.png', cid="<qr_image>")

    try:
        # Connect to dynamic SMTP server (usually port 587 requires STARTTLS)
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            if SMTP_PORT == 587:
                server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
            print(f"Successfully sent QR email to {to_email}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
