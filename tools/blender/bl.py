"""Send a Python file to the running Blender MCP addon (port 9876) and print the response."""
import socket, json, sys
code = open(sys.argv[1], encoding="utf-8").read()
s = socket.create_connection(("127.0.0.1", 9876), timeout=900)
s.sendall(json.dumps({"type": "execute", "code": code, "strict_json": False}).encode() + b"\0")
buf = b""
while True:
    c = s.recv(65536)
    if not c: break
    buf += c
    if buf.endswith(b"\0"): break
r = json.loads(buf.rstrip(b"\0"))
for k in ("status", "message", "result", "stdout", "stderr"):
    if r.get(k): print(f"[{k}]", r[k] if isinstance(r[k], str) else json.dumps(r[k]))
