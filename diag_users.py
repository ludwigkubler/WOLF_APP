# diag_users.py
import sqlite3, os, sys

DB = os.path.join(os.path.dirname(__file__), "data.db")
if not os.path.exists(DB):
    print("ERRORE: data.db non trovato qui:", DB)
    sys.exit(1)

con = sqlite3.connect(DB)
c = con.cursor()

print("=== SCHEMA users ===")
for row in c.execute("PRAGMA table_info(users)"):
    print(row)

print("\n=== UTENTI (prime 50) ===")
# Nota: NON uso funzioni strane; solo colonne che esistono davvero
rows = c.execute("""
    SELECT
      id,
      username,
      role,
      is_active,
      created_at,
      CASE WHEN password_hash IS NOT NULL AND password_hash <> '' THEN 1 ELSE 0 END AS has_pwdhash,
      CASE
        WHEN (SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='hashed_password') = 1
         THEN (CASE WHEN COALESCE(hashed_password, '') <> '' THEN 1 ELSE 0 END)
        ELSE NULL
      END AS has_legacy_hashed
    FROM users
    ORDER BY id
    LIMIT 50
""").fetchall()

if not rows:
    print("(nessun utente)")
else:
    for r in rows:
        uid, uname, role, active, created, has_hash, has_legacy = r
        print(f"- id={uid} | user='{uname}' | role={role} | active={active} | created_at={created} "
              f"| password_hash_set={bool(has_hash)}"
              + (f" | legacy_hashed_password_set={bool(has_legacy)}" if has_legacy is not None else ""))

# riepilogo
tot = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
mgr = c.execute("SELECT COUNT(*) FROM users WHERE role='manager'").fetchone()[0]
stf = c.execute("SELECT COUNT(*) FROM users WHERE role='staff'").fetchone()[0]
nohash = c.execute("SELECT COUNT(*) FROM users WHERE COALESCE(password_hash,'')=''").fetchone()[0]

print(f"\nTotale utenti: {tot} (manager={mgr}, staff={stf})")
print(f"Utenti senza password_hash: {nohash}")

# verifica se esiste la colonna legacy
has_legacy_col = c.execute(
    "SELECT COUNT(*) FROM pragma_table_info('users') WHERE name='hashed_password'"
).fetchone()[0]
if has_legacy_col:
    with_legacy = c.execute(
        "SELECT COUNT(*) FROM users WHERE COALESCE(hashed_password,'')<>'' AND COALESCE(password_hash,'')=''"
    ).fetchone()[0]
    print(f"Righe con SOLO 'hashed_password' valorizzato ma 'password_hash' vuoto: {with_legacy}")

con.close()
