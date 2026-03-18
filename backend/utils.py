import uuid

def generate_uid():
    """
    Generates a unique participant ID
    Format: AIC26-XXXXXX
    """
    return f"AIC26-{uuid.uuid4().hex[:6].upper()}"
