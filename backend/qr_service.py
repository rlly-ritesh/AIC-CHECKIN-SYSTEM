import qrcode
import os

QR_DIR = "qr_codes"

os.makedirs(QR_DIR, exist_ok=True)

def generate_qr(uid: str) -> str:
    """
    Generates QR code image for given UID
    Returns file path
    """
    qr_data = uid  # keep QR clean & simple

    img = qrcode.make(qr_data)

    file_path = f"{QR_DIR}/{uid}.png"
    img.save(file_path)

    return file_path
