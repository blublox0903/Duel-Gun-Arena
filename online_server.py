import asyncio
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

try:
    import psycopg
except Exception:
    psycopg = None

ROOT = Path(__file__).resolve().parent
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
PORT = int(os.environ.get("PORT", "4173"))
ACCOUNTS_PATH = ROOT / "accounts.json"
DATABASE_URL = os.environ.get("DATABASE_URL")
db_ready = False

waiting_queues = {"online": [], "online2v2": []}
rooms = {}
MODE_SIZE = {"online": 2, "online2v2": 4}
MODE_ROLES = {"online": ["a", "b"], "online2v2": ["a1", "a2", "b1", "b2"]}
SPECIAL_ACCOUNT_NAME = "punker"
SPECIAL_COINS = 999999999
FREE_WEAPONS = ["rifle", "handgun", "fist", "grenade"]
WEAPON_PRICES = {
    "trishot": 1000,
    "sniper": 2500,
    "lasergun": 5000,
    "bunker": 3000,
    "revolver": 900,
    "energypistol": 3000,
    "trowel": 2000,
    "scythe": 800,
    "katana": 1500,
    "smokegrenade": 500,
}


class Client:
    def __init__(self, reader, writer):
        self.reader = reader
        self.writer = writer
        self.room = None
        self.role = None
        self.mode = "online"

    async def send(self, payload):
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        header = bytearray([0x81])
        if len(data) < 126:
            header.append(len(data))
        elif len(data) < 65536:
            header.extend([126, (len(data) >> 8) & 255, len(data) & 255])
        else:
            header.append(127)
            header.extend(len(data).to_bytes(8, "big"))
        self.writer.write(header + data)
        await self.writer.drain()

    async def close(self):
        try:
            self.writer.close()
            await self.writer.wait_closed()
        except Exception:
            pass


async def read_http_request(reader):
    data = await reader.readuntil(b"\r\n\r\n")
    text = data.decode("utf-8", "replace")
    lines = text.split("\r\n")
    method, path, _ = lines[0].split(" ", 2)
    headers = {}
    for line in lines[1:]:
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        headers[key.lower()] = value.strip()
    content_length = int(headers.get("content-length", "0") or "0")
    body = await reader.readexactly(content_length) if content_length else b""
    return method, path, headers, body


async def send_http(writer, status, body, content_type="text/plain; charset=utf-8"):
    if isinstance(body, str):
        body = body.encode("utf-8")
    header = (
        f"HTTP/1.1 {status}\r\n"
        f"Content-Length: {len(body)}\r\n"
        f"Content-Type: {content_type}\r\n"
        "Connection: close\r\n"
        "\r\n"
    )
    writer.write(header.encode("utf-8") + body)
    await writer.drain()
    writer.close()
    await writer.wait_closed()


async def send_json(writer, status, payload):
    await send_http(writer, status, json.dumps(payload), "application/json; charset=utf-8")


def db_available():
    return bool(DATABASE_URL and psycopg)


def db_connect():
    return psycopg.connect(DATABASE_URL, autocommit=True)


def init_db():
    global db_ready
    if db_ready or not db_available():
        return
    with db_connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                key TEXT PRIMARY KEY,
                data JSONB NOT NULL
            )
            """
        )
    db_ready = True


def load_accounts():
    if db_available():
        try:
            init_db()
            with db_connect() as conn:
                rows = conn.execute("SELECT key, data::text FROM accounts").fetchall()
            return {key: json.loads(data) for key, data in rows}
        except Exception as error:
            print(f"Database account load failed, using file fallback: {error}")
    if not ACCOUNTS_PATH.exists():
        return {}
    try:
        return json.loads(ACCOUNTS_PATH.read_text("utf-8"))
    except Exception:
        return {}


def save_accounts(accounts):
    if db_available():
        try:
            init_db()
            with db_connect() as conn:
                for key, account in accounts.items():
                    conn.execute(
                        """
                        INSERT INTO accounts (key, data)
                        VALUES (%s, %s::jsonb)
                        ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
                        """,
                        (key, json.dumps(account)),
                    )
            return
        except Exception as error:
            print(f"Database account save failed, using file fallback: {error}")
    ACCOUNTS_PATH.write_text(json.dumps(accounts, indent=2, sort_keys=True), "utf-8")


def create_account(key, account):
    if db_available():
        try:
            init_db()
            with db_connect() as conn:
                created = conn.execute(
                    """
                    INSERT INTO accounts (key, data)
                    VALUES (%s, %s::jsonb)
                    ON CONFLICT (key) DO NOTHING
                    RETURNING key
                    """,
                    (key, json.dumps(account)),
                ).fetchone()
            return bool(created)
        except Exception as error:
            print(f"Database account create failed, using file fallback: {error}")
    accounts = load_accounts()
    if key in accounts:
        return False
    accounts[key] = account
    save_accounts(accounts)
    return True


def normalize_name(name):
    name = " ".join(str(name or "").strip().split())
    if not 3 <= len(name) <= 18:
        return None
    allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 _-")
    if any(char not in allowed for char in name):
        return None
    return name


def password_hash(password):
    return hashlib.sha256(str(password or "").encode("utf-8")).hexdigest()


def make_token(name, stored_hash):
    raw = f"duel-gun-arena:{name.lower()}:{stored_hash}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def public_profile(name, account):
    stats = account.setdefault("stats", {})
    is_special = str(account.get("name", name)).lower() == SPECIAL_ACCOUNT_NAME
    unlocked = list(WEAPON_PRICES.keys()) + FREE_WEAPONS if is_special else account.setdefault("unlocked", FREE_WEAPONS.copy())
    for weapon in FREE_WEAPONS:
        if weapon not in unlocked:
            unlocked.append(weapon)
    return {
        "name": account.get("name", name),
        "kills": int(stats.get("kills", 0)),
        "playerKills": int(stats.get("playerKills", 0)),
        "damage": int(stats.get("damage", 0)),
        "playSeconds": int(stats.get("playSeconds", 0)),
        "coins": SPECIAL_COINS if is_special else int(stats.get("coins", 0)),
        "infiniteCoins": is_special,
        "unlocked": unlocked,
    }


def auth_account(accounts, payload):
    name = normalize_name(payload.get("name"))
    if not name:
        return None, None
    key = name.lower()
    account = accounts.get(key)
    if not account:
        return None, None
    if payload.get("token") != make_token(account["name"], account["passwordHash"]):
        return None, None
    return key, account


async def handle_api(writer, method, raw_path, body):
    if method != "POST":
        await send_json(writer, "405 Method Not Allowed", {"ok": False, "message": "POST only"})
        return
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except Exception:
        await send_json(writer, "400 Bad Request", {"ok": False, "message": "Bad JSON"})
        return

    path = urlparse(raw_path).path
    accounts = load_accounts()
    if path == "/api/create-account":
        name = normalize_name(payload.get("name"))
        password = str(payload.get("password") or "")
        if not name:
            await send_json(writer, "400 Bad Request", {"ok": False, "message": "Use 3-18 letters or numbers"})
            return
        if len(password) < 3:
            await send_json(writer, "400 Bad Request", {"ok": False, "message": "Password needs 3+ letters"})
            return
        key = name.lower()
        stored_hash = password_hash(password)
        new_account = {
            "name": name,
            "passwordHash": stored_hash,
            "stats": {"kills": 0, "playerKills": 0, "damage": 0, "playSeconds": 0, "coins": 0},
            "unlocked": FREE_WEAPONS.copy(),
        }
        if not create_account(key, new_account):
            await send_json(writer, "409 Conflict", {"ok": False, "message": "name existed, try another"})
            return
        await send_json(writer, "200 OK", {
            "ok": True,
            "token": make_token(name, stored_hash),
            "profile": public_profile(key, new_account),
        })
        return

    if path == "/api/check-name":
        name = normalize_name(payload.get("name"))
        if not name:
            await send_json(writer, "400 Bad Request", {"ok": False, "message": "Use 3-18 letters or numbers"})
            return
        if name.lower() in accounts:
            await send_json(writer, "409 Conflict", {"ok": False, "message": "name existed, try another"})
            return
        await send_json(writer, "200 OK", {"ok": True, "name": name})
        return

    if path == "/api/sign-in":
        name = normalize_name(payload.get("name"))
        key = name.lower() if name else ""
        account = accounts.get(key)
        if not account or account["passwordHash"] != password_hash(payload.get("password")):
            await send_json(writer, "403 Forbidden", {"ok": False, "message": "Wrong name or password"})
            return
        await send_json(writer, "200 OK", {
            "ok": True,
            "token": make_token(account["name"], account["passwordHash"]),
            "profile": public_profile(key, account),
        })
        return

    if path == "/api/profile":
        key, account = auth_account(accounts, payload)
        if not account:
            await send_json(writer, "403 Forbidden", {"ok": False, "message": "Sign in again"})
            return
        await send_json(writer, "200 OK", {"ok": True, "profile": public_profile(key, account)})
        return

    if path == "/api/stats":
        key, account = auth_account(accounts, payload)
        if not account:
            await send_json(writer, "403 Forbidden", {"ok": False, "message": "Sign in again"})
            return
        stats = account.setdefault("stats", {})
        for stat_key in ["kills", "playerKills", "damage", "playSeconds", "coins"]:
            stats[stat_key] = max(0, int(stats.get(stat_key, 0)) + int(payload.get(stat_key, 0) or 0))
        save_accounts(accounts)
        await send_json(writer, "200 OK", {"ok": True, "profile": public_profile(key, account)})
        return

    if path == "/api/buy":
        key, account = auth_account(accounts, payload)
        weapon = str(payload.get("weapon") or "")
        if not account:
            await send_json(writer, "403 Forbidden", {"ok": False, "message": "Sign in again"})
            return
        if weapon not in WEAPON_PRICES:
            await send_json(writer, "400 Bad Request", {"ok": False, "message": "That weapon is not for sale"})
            return
        profile = public_profile(key, account)
        if weapon in profile["unlocked"]:
            await send_json(writer, "200 OK", {"ok": True, "profile": profile})
            return
        if profile.get("infiniteCoins"):
            await send_json(writer, "200 OK", {"ok": True, "profile": profile})
            return
        price = WEAPON_PRICES[weapon]
        stats = account.setdefault("stats", {})
        coins = int(stats.get("coins", 0))
        if coins < price:
            await send_json(writer, "400 Bad Request", {"ok": False, "message": "Not enough coins"})
            return
        stats["coins"] = coins - price
        account.setdefault("unlocked", FREE_WEAPONS.copy()).append(weapon)
        save_accounts(accounts)
        await send_json(writer, "200 OK", {"ok": True, "profile": public_profile(key, account)})
        return

    await send_json(writer, "404 Not Found", {"ok": False, "message": "Unknown API"})


async def serve_file(writer, raw_path):
    path = unquote(urlparse(raw_path).path)
    if path == "/":
        path = "/index.html"
    file_path = (ROOT / path.lstrip("/")).resolve()
    if ROOT not in file_path.parents and file_path != ROOT:
        await send_http(writer, "403 Forbidden", "Forbidden")
        return
    if not file_path.exists() or not file_path.is_file():
        await send_http(writer, "404 Not Found", "Not found")
        return
    content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    await send_http(writer, "200 OK", file_path.read_bytes(), content_type)


async def websocket_handshake(writer, headers):
    key = headers.get("sec-websocket-key")
    if not key:
        await send_http(writer, "400 Bad Request", "Missing WebSocket key")
        return False
    accept = base64.b64encode(hashlib.sha1((key + GUID).encode("ascii")).digest()).decode("ascii")
    response = (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept}\r\n"
        "\r\n"
    )
    writer.write(response.encode("ascii"))
    await writer.drain()
    return True


async def read_ws_message(reader):
    first = await reader.readexactly(2)
    opcode = first[0] & 0x0F
    masked = first[1] & 0x80
    length = first[1] & 0x7F
    if length == 126:
        length = int.from_bytes(await reader.readexactly(2), "big")
    elif length == 127:
        length = int.from_bytes(await reader.readexactly(8), "big")
    mask = await reader.readexactly(4) if masked else b"\x00\x00\x00\x00"
    payload = await reader.readexactly(length)
    if opcode == 8:
        return None
    if masked:
        payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
    return payload.decode("utf-8", "replace")


async def pair_client(client, mode):
    mode = mode if mode in MODE_SIZE else "online"
    client.mode = mode
    queue = waiting_queues[mode]
    queue[:] = [queued for queued in queue if not queued.writer.is_closing()]
    if client not in queue:
        queue.append(client)
    needed = MODE_SIZE[mode]
    if len(queue) < needed:
        await client.send({"type": "waiting", "count": len(queue), "needed": needed})
        for queued in queue:
            if queued is not client:
                await queued.send({"type": "waiting", "count": len(queue), "needed": needed})
        return

    room_id = os.urandom(6).hex()
    clients = queue[:needed]
    del queue[:needed]
    roles = MODE_ROLES[mode]
    rooms[room_id] = clients
    for index, matched_client in enumerate(clients):
        matched_client.room = room_id
        matched_client.role = roles[index]
        matched_client.mode = mode
        await matched_client.send({"type": "matched", "role": matched_client.role, "roles": roles, "mode": mode})


async def broadcast_to_peer(client, payload):
    if not client.room or client.room not in rooms:
        return
    for peer in rooms[client.room]:
        if peer is not client:
            await peer.send(payload)


async def cleanup_client(client):
    for queue in waiting_queues.values():
        if client in queue:
            queue.remove(client)
    if client.room and client.room in rooms:
        peers = rooms.pop(client.room)
        for peer in peers:
            if peer is not client:
                await peer.send({"type": "peer-left"})
                await peer.close()


async def handle_ws(reader, writer, headers):
    client = Client(reader, writer)
    if not await websocket_handshake(writer, headers):
        return
    try:
        while True:
            text = await read_ws_message(reader)
            if text is None:
                break
            message = json.loads(text)
            if message.get("type") == "join":
                await pair_client(client, message.get("mode", "online"))
            elif message.get("type") in {"state", "damage"}:
                await broadcast_to_peer(client, message)
    except Exception:
        pass
    finally:
        await cleanup_client(client)
        await client.close()


async def handle_connection(reader, writer):
    try:
        method, path, headers, body = await read_http_request(reader)
        if headers.get("upgrade", "").lower() == "websocket" and urlparse(path).path == "/ws":
            await handle_ws(reader, writer, headers)
        elif urlparse(path).path.startswith("/api/"):
            await handle_api(writer, method, path, body)
        elif method == "GET":
            await serve_file(writer, path)
        else:
            await send_http(writer, "405 Method Not Allowed", "Method not allowed")
    except Exception:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass


async def main():
    server = await asyncio.start_server(handle_connection, "0.0.0.0", PORT)
    print(f"CPU Duel Arena online server running on http://localhost:{PORT}")
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
