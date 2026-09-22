#!/usr/bin/env python3
"""
record_orbipin.py — record the OrbiPin live demo via CDP screencast.
Launches its own headless Chrome 1920x1080, drives the app, encodes mp4.

Sequence (beats 3-5 footage, ~40s):
  1. globe view, gentle rotate (drag)              ~8s   -> beat 3 material
  2. search 'Indonesia', click earthquake result   ~8s   -> beats 3/4
  3. event card: sources expand (trust)            ~6s   -> beat 4
  4. close, open Follow dialog                     ~6s   -> beat 5
  5. hold on globe with status bar visible         ~6s   -> outro material
"""
import subprocess, time, json, os, sys, base64, threading, queue

CHROME = "/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome"
URL = "https://striped-impala-387.convex.site/"
OUT_DIR = "/root/ProjectX/OrbiPin/video-assets"
PORT = 9333

frames = queue.Queue()
recording = {"on": True}

def launch():
    p = subprocess.Popen([
        CHROME, "--headless=new", "--no-sandbox", "--disable-gpu",
        f"--remote-debugging-port={PORT}",
        "--remote-allow-origins=http://127.0.0.1:" + str(PORT),
        "--window-size=1920,1080", "--hide-scrollbars",
        "--autoplay-policy=no-user-gesture-required",
        URL,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(8)  # load + splash dismiss + map ready
    return p

def get_ws_url():
    import urllib.request
    for _ in range(20):
        try:
            data = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json"))
            pages = [t for t in data if t.get("type") == "page"]
            if pages:
                return pages[0]["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError("no CDP page")

def screencast(ws_url):
    import websocket
    ws = websocket.create_connection(ws_url, max_size=None, suppress_origin=True)
    msg_id = [0]
    def send(method, params=None):
        msg_id[0] += 1
        ws.send(json.dumps({"id": msg_id[0], "method": method, "params": params or {}}))
    send("Page.enable")
    send("Emulation.setDeviceMetricsOverride",
         {"width": 1920, "height": 1080, "deviceScaleFactor": 1, "mobile": False})
    send("Page.startScreencast", {"format": "png", "everyNthFrame": 1, "minimumInterval": 33})
    while recording["on"]:
        try:
            raw = ws.recv()
        except Exception:
            break
        m = json.loads(raw)
        if m.get("method") == "Page.screencastFrame":
            d = m["params"]["data"]
            ts = m["params"]["metadata"].get("timestamp", time.time())
            frames.put((ts, base64.b64decode(d)))
            send("Page.screencastFrameAck", {"sessionId": m["params"]["sessionId"]})
    ws.close()

def run():
    proc = launch()
    ws_url = get_ws_url()
    t = threading.Thread(target=screencast, args=(ws_url,), daemon=True)
    t.start()
    time.sleep(2)

    # ---- drive the app via a second CDP connection (Runtime.evaluate) ----
    import websocket as wsmod
    ws2 = wsmod.create_connection(ws_url, max_size=None, suppress_origin=True)
    mid = [0]
    def ev(expr, wait=0.0):
        mid[0] += 1
        ws2.send(json.dumps({"id": mid[0], "method": "Runtime.evaluate",
                             "params": {"expression": expr, "awaitPromise": False}}))
        try:
            ws2.recv()
        except Exception:
            pass
        if wait: time.sleep(wait)

    # allow map to fully settle
    time.sleep(6)

    # 1. globe rotate: drag via synthetic mouse on canvas
    ev("(()=>{const c=document.querySelector('canvas.maplibregl-canvas');const r=c.getBoundingClientRect();"
       "const d=(dx,dy)=>{c.dispatchEvent(new MouseEvent('mousedown',{clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true}));"
       "c.dispatchEvent(new MouseEvent('mousemove',{clientX:r.left+r.width/2+dx,clientY:r.top+r.height/2+dy,bubbles:true}));"
       "c.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));};"
       "window.__drag=d;return 'ok'})()", wait=0.5)
    for dx in range(0, 720, 60):
        ev(f"window.__drag(60,0)", wait=0.7)   # slow rotate right
    time.sleep(3)

    # 2. search
    ev("document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'/',bubbles:true}));"
       "const sb=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Search'));sb&&sb.click();", wait=1)
    ev("const i=document.querySelector('input');i.focus();i.value='';"
       "i.dispatchEvent(new Event('input',{bubbles:true}));"
       "document.execCommand('insertText',false,'Indonesia')", wait=3.5)
    # click the earthquake result
    ev("const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('earthquake warning'));b&&b.click();", wait=6)

    # 3. trust: expand "About Indonesia"
    ev("const a=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('About Indonesia'));a&&a.click();", wait=6)

    # 4. close card, open Follow
    ev("const x=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Close');x&&x.click();", wait=2)
    ev("const f=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Follow');f&&f.click();", wait=7)
    ev("const x2=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Close');x2&&x2.click();", wait=1)

    # 5. final globe hold
    time.sleep(7)

    recording["on"] = False
    time.sleep(1)
    ws2.close()
    proc.terminate()

    # ---- encode ----
    import tempfile
    tmp = tempfile.mkdtemp(prefix="orbipin-frames-")
    out = os.path.join(OUT_DIR, "live-demo.mp4")
    # build concat list with per-frame durations from capture timestamps
    times = []
    while not frames.empty():
        ts, png = frames.get()
        times.append((ts, png))
    n = len(times)
    print(f"captured {n} frames")
    if n == 0:
        sys.exit("no frames captured")
    for i, (ts, png) in enumerate(times):
        with open(os.path.join(tmp, f"f{i:05d}.png"), "wb") as f:
            f.write(png)
    with open(os.path.join(tmp, "list.txt"), "w") as lf:
        for i in range(n):
            dur = 1.0 / 30
            if i + 1 < n:
                dur = max(0.033, min(1.0, times[i+1][0] - times[i][0]))
            lf.write(f"file 'f{i:05d}.png'\nduration {dur:.3f}\n")
        lf.write(f"file 'f{n-1:05d}.png'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "list.txt"),
                    "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-vsync", "vfr",
                    "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2:0:0:black", "-crf", "18", out],
                   check=True)
    print(f"✓ {out}")

if __name__ == "__main__":
    run()
