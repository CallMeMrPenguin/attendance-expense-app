#!/usr/bin/env python3
"""
Attendance & Expense Management App Launcher
Khởi động ứng dụng Chấm Công & Quản Lý Chi Phí (Next.js - Port 9000)
"""

import os
import sys
import time
import socket
import shutil
import signal
import threading
import subprocess
import webbrowser
import urllib.request

PORT = int(os.environ.get("PORT", 9000))
HOST = "127.0.0.1"
APP_URL = f"http://localhost:{PORT}"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def is_port_in_use(port=PORT, host=HOST) -> bool:
    """Kiểm tra cổng có đang được sử dụng hay không."""
    try:
        with socket.create_connection((host, port), timeout=0.8):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def wait_for_server_and_open_browser(url: str, stop_event: threading.Event, timeout_secs: int = 60):
    """Theo dõi trạng thái server và tự động mở trình duyệt khi sẵn sàng."""
    start_time = time.time()
    opened = False

    while not stop_event.is_set():
        if time.time() - start_time > timeout_secs:
            print(f"\n[CANH BAO] Qua thoi gian cho ({timeout_secs}s). Vui long kiem tra loi phia tren.")
            break

        if is_port_in_use(PORT, HOST):
            time.sleep(0.8)
            print(f"\n[OK] May chu da san sang tai {url}")
            print("[INFO] Dang mo trinh duyet mac dinh...")
            try:
                webbrowser.open(url)
                opened = True
            except Exception as e:
                print(f"[CANH BAO] Khong the tu dong mo trinh duyet: {e}")
                print(f"[INFO] Vui long truy cap thu cong tai: {url}")
            break

        time.sleep(0.5)

    if opened:
        print(f"[INFO] Ung dung dang chay tren {url}")
        print("[INFO] Nhan Ctrl+C tai cua so nay de dung may chu.\n")


def terminate_process(proc: subprocess.Popen):
    """Dừng tiến trình và toàn bộ tiến trình con trên Windows/Linux."""
    if proc is None:
        return
    try:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
    except Exception:
        pass


def main():
    os.chdir(SCRIPT_DIR)
    print("=" * 60)
    print("  KHOI DONG UNG DUNG CHAM CONG & QUAN LY CHI PHI")
    print("=" * 60)
    print(f"[INFO] Thu muc du an: {SCRIPT_DIR}")

    # 1. Kiểm tra xem server đã đang chạy hay chưa
    if is_port_in_use(PORT, HOST):
        print(f"[INFO] Phat hien may chu da dang chay tren cong {PORT}.")
        print(f"[INFO] Dang mo ung dung tren trinh duyet: {APP_URL}")
        try:
            webbrowser.open(APP_URL)
            print("[OK] Da mo trinh duyet thanh cong.")
        except Exception as e:
            print(f"[CANH BAO] Khong the mo trinh duyet tu dong: {e}")
            print(f"[INFO] Vui long truy cap thu cong tai: {APP_URL}")
        time.sleep(1.5)
        return

    # 2. Tìm binary npm hoặc pnpm / yarn
    npm_cmd = shutil.which("npm.cmd") if os.name == "nt" else shutil.which("npm")
    if not npm_cmd:
        # Fallback thử 'npm' trực tiếp
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

    # Kiểm tra node_modules
    node_modules_path = os.path.join(SCRIPT_DIR, "node_modules")
    if not os.path.exists(node_modules_path):
        print("[INFO] Chua tim thay thu muc node_modules. Dang chay 'npm install'...")
        try:
            subprocess.run([npm_cmd, "install"], cwd=SCRIPT_DIR, check=True)
            print("[OK] Cai dat thu vien thanh cong.")
        except Exception as e:
            print(f"[LOI] Cai dat that bai: {e}")
            sys.exit(1)

    # 3. Khởi động Next.js dev server
    print(f"[INFO] Dang khoi dong Next.js server tren cong {PORT}...")
    stop_event = threading.Event()

    # Luồng ngầm theo dõi khi nào cổng mở để khởi động trình duyệt
    watcher_thread = threading.Thread(
        target=wait_for_server_and_open_browser,
        args=(APP_URL, stop_event),
        daemon=True,
    )
    watcher_thread.start()

    proc = None
    try:
        # Chạy npm run dev
        proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=SCRIPT_DIR,
        )

        # Xử lý đóng an toàn khi nhận tín hiệu
        def signal_handler(sig, frame):
            stop_event.set()
            print("\n[INFO] Dang dung may chu...")
            terminate_process(proc)
            print("[OK] May chu da tat an toan.")
            sys.exit(0)

        signal.signal(signal.SIGINT, signal_handler)
        if hasattr(signal, "SIGTERM"):
            signal.signal(signal.SIGTERM, signal_handler)

        proc.wait()

    except KeyboardInterrupt:
        stop_event.set()
        print("\n[INFO] Dang dung may chu...")
        terminate_process(proc)
        print("[OK] May chu da tat an toan.")
    except Exception as e:
        stop_event.set()
        print(f"\n[LOI] Khong the chay may chu: {e}")
        terminate_process(proc)
        sys.exit(1)


if __name__ == "__main__":
    main()
