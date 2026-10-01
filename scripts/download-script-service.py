import urllib.request
import json
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

TOTAL_SIZE = 226305406
NUM_THREADS = 12
DEST_PATH = os.path.expandvars(r"%APPDATA%\dpm\cache\components\daml-script\3.5.2\script-service.jar")
BLOB_URL = "https://europe-docker.pkg.dev/v2/da-images/public/daml-script/blobs/sha256:0fbd15afc328dfd9446cae65ea86dc7c6fb09112f2e07649de04f4ec20acac6d"
AUTH_URL = "https://europe-docker.pkg.dev/v2/token?service=europe-docker.pkg.dev&scope=repository:da-images/public/daml-script:pull"

def get_token():
    req = urllib.request.Request(AUTH_URL)
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        return data['token']

def download_chunk(part_idx, start, end, part_file, lock, progress):
    expected_size = end - start + 1
    existing_size = 0
    if os.path.exists(part_file):
        existing_size = os.path.getsize(part_file)
        if existing_size >= expected_size:
            print(f"Part {part_idx} already complete ({existing_size} bytes)", flush=True)
            with lock:
                progress[0] += existing_size
            return

    actual_start = start + existing_size
    with lock:
        progress[0] += existing_size
        
    print(f"Part {part_idx}: downloading bytes {actual_start} to {end} ({end - actual_start + 1} bytes remaining)...", flush=True)
    token = get_token()
    req = urllib.request.Request(BLOB_URL)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Range", f"bytes={actual_start}-{end}")
    
    with urllib.request.urlopen(req, timeout=30) as resp:
        mode = "ab" if existing_size > 0 else "wb"
        with open(part_file, mode) as f:
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                with lock:
                    progress[0] += len(chunk)
    print(f"Part {part_idx} finished successfully.", flush=True)

def main():
    print(f"Resuming download for script-service.jar ({TOTAL_SIZE / (1024*1024):.1f} MB)...", flush=True)
    chunk_size = (TOTAL_SIZE + NUM_THREADS - 1) // NUM_THREADS
    
    parts = []
    temp_dir = os.path.dirname(DEST_PATH)
    os.makedirs(temp_dir, exist_ok=True)
    
    for i in range(NUM_THREADS):
        start = i * chunk_size
        end = min((i + 1) * chunk_size - 1, TOTAL_SIZE - 1)
        part_file = os.path.join(temp_dir, f"part_{i}.tmp")
        parts.append((i, start, end, part_file))
    
    lock = threading.Lock()
    progress = [0]
    
    with ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
        futures = [
            executor.submit(download_chunk, i, start, end, part_file, lock, progress)
            for i, start, end, part_file in parts
        ]
        
        while any(not f.done() for f in futures):
            threading.Event().wait(2.0)
            with lock:
                mb = progress[0] / (1024 * 1024)
                pct = (progress[0] / TOTAL_SIZE) * 100
                print(f"Progress: {mb:.1f} MB / {TOTAL_SIZE / (1024*1024):.1f} MB ({pct:.1f}%)", flush=True)
        
        for f in futures:
            f.result()
            
    print("All chunks downloaded. Merging into script-service.jar...", flush=True)
    with open(DEST_PATH, "wb") as outfile:
        for _, _, _, part_file in parts:
            with open(part_file, "rb") as infile:
                while True:
                    buf = infile.read(1048576)
                    if not buf:
                        break
                    outfile.write(buf)
            os.remove(part_file)
            
    print(f"Successfully assembled {DEST_PATH} ({os.path.getsize(DEST_PATH)} bytes)", flush=True)

if __name__ == "__main__":
    main()
