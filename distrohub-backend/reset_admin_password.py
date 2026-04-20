import os
import sys

# Load .env if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv(".env.production")
    print("[INFO] Loaded .env.production")
except ImportError:
    print("[INFO] python-dotenv not found, using system environment variables")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set!")
    sys.exit(1)

import bcrypt
from supabase import create_client


def hash_password_bcrypt(plain):
    """Hash using bcrypt directly (avoids passlib version issues)."""
    pwd_bytes = plain.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password_bcrypt(plain, hashed):
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
        return False


KNOWN_PASSWORDS = {
    "admin@distrohub.com": "admin123",
    "sales@distrohub.com": "sales123",
}


def main():
    print("\n[MIGRATION] DistroHub Password Migration --- SHA-256 -> bcrypt")
    print("=" * 62)

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    result = client.table("users").select("id, email, name, role, password_hash").execute()
    users = result.data or []
    print(f"\n[INFO] Total {len(users)} user(s) found.\n")

    upgraded = 0
    skipped = 0
    failed = 0

    for user in users:
        email = user.get("email")
        user_id = user.get("id")
        current_hash = user.get("password_hash", "")
        name = user.get("name", email)

        # Already bcrypt — skip
        if current_hash.startswith("$2b$") or current_hash.startswith("$2a$"):
            print(f"  [SKIP] [{name}] ({email}) -- already bcrypt")
            skipped += 1
            continue

        # Unknown password — skip
        plain_password = KNOWN_PASSWORDS.get(email)
        if not plain_password:
            print(f"  [WARN] [{name}] ({email}) -- password unknown, skipping")
            skipped += 1
            continue

        try:
            new_hash = hash_password_bcrypt(plain_password)
            if not verify_password_bcrypt(plain_password, new_hash):
                raise ValueError("Hash self-verification failed!")
            client.table("users").update({"password_hash": new_hash}).eq("id", user_id).execute()
            print(f"  [OK] [{name}] ({email}) -- upgraded to bcrypt!")
            upgraded += 1
        except Exception as e:
            print(f"  [FAIL] [{name}] ({email}) -- error: {e}")
            failed += 1

    print("\n" + "=" * 62)
    print(f"[RESULT] Upgraded : {upgraded}")
    print(f"[RESULT] Skipped  : {skipped}")
    print(f"[RESULT] Failed   : {failed}")
    print("=" * 62)

    if upgraded > 0:
        print("\n[SUCCESS] Migration complete! Try logging in now.")
    else:
        print("\n[INFO] No users were upgraded.")


if __name__ == "__main__":
    main()
