import asyncio
import base64
import hashlib
import json
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
PORT = int(os.environ.get("PORT", "4173"))

waiting_queues = {"online": [], "online2v2": []}
rooms = {}
MODE_SIZE = {"online": 2, "online2v2": 4}
MODE_ROLES = {"online": ["a", "b"], "online2v2": ["a1", "a2", "b1", "b2"]}


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
    return method, path, headers


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
        method, path, headers = await read_http_request(reader)
        if headers.get("upgrade", "").lower() == "websocket" and urlparse(path).path == "/ws":
            await handle_ws(reader, writer, headers)
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
