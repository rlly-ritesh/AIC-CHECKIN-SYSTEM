from email_service import send_qr_email

send_qr_email(
    to_email="kritisreyashp@gmail.com",
    name="Test Participant",
    uid="AIC26-TEST01",
    qr_url="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=AIC26-TEST01"
)

print("Email sent successfully")
