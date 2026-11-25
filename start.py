#!/usr/bin/env python3
"""
Attendance & Expense Management App Launcher
Khởi động ứng dụng Chấm Công & Quản Lý Chi Phí (Next.js - Port 9000)
"""

import os
import sys

# Ensure UTF-8 output encoding on Windows console to prevent UnicodeEncodeError
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import time
import socket
import shutil
import signal
import tempfile
import threading
import subprocess
import webbrowser
import urllib.request

PORT = int(os.environ.get("PORT", 9000))
HOST = "127.0.0.1"
APP_URL = f"http://localhost:{PORT}"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def resolve_npm_command() -> str:
    """Tìm npm binary và đảm bảo thư mục chứa node/npm nằm trong PATH khi chạy ở Startup."""
    if os.name == "nt":
        found = shutil.which("npm.cmd") or shutil.which("npm")
        if not found:
            for candidate in (r"E:\npm.cmd", r"C:\Program Files\nodejs\npm.cmd"):
                if os.path.exists(candidate):
                    found = candidate
                    break
        if found:
            bin_dir = os.path.dirname(found)
            if bin_dir and bin_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = f"{bin_dir};{os.environ.get('PATH', '')}"
            return found
        return "npm.cmd"
    return shutil.which("npm") or "npm"


def is_port_in_use(port=PORT, host=HOST) -> bool:
    """Kiểm tra cổng có đang được sử dụng hay không."""
    try:
        with socket.create_connection((host, port), timeout=0.8):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def is_server_healthy(url=APP_URL) -> bool:
    """Kiểm tra server có phản hồi HTTP bình thường hay không."""
    try:
        req = urllib.request.Request(f"{url}/api/version", headers={"User-Agent": "LauncherHealthCheck"})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False


def kill_process_on_port(port=PORT):
    """Giải phóng cổng nếu bị chiếm bởi tiến trình treo (zombie)."""
    try:
        if os.name == "nt":
            out = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, text=True)
            for line in out.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and "LISTENING" in parts:
                    pid = parts[-1]
                    print(f"[INFO] Dang giai phong cong {port} bi treo (PID: {pid})...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1)
    except Exception:
        pass


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
    no_browser = (
        any(arg in sys.argv[1:] for arg in ("--background", "--silent", "--no-browser"))
        or os.environ.get("NO_BROWSER", "").strip().lower() in ("1", "true", "yes")
    )
    hidden_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if (os.name == "nt" and no_browser) else 0

    print("=" * 60)
    print("  KHOI DONG UNG DUNG CHAM CONG & QUAN LY CHI PHI")
    print("=" * 60)
    print(f"[INFO] Thu muc du an: {SCRIPT_DIR}")

    # 1. Kiểm tra xem server đã đang chạy hay chưa
    if is_port_in_use(PORT, HOST):
        if is_server_healthy():
            print(f"[INFO] May chu da dang hoat dong binh thuong tren cong {PORT}.")
            if not no_browser:
                print(f"[INFO] Dang mo ung dung tren trinh duyet: {APP_URL}")
                try:
                    webbrowser.open(APP_URL)
                    print("[OK] Da mo trinh duyet thanh cong.")
                except Exception as e:
                    print(f"[CANH BAO] Khong the mo trinh duyet tu dong: {e}")
                    print(f"[INFO] Vui long truy cap thu cong tai: {APP_URL}")
                time.sleep(1.5)
            return
        else:
            print(f"[CANH BAO] Phat hien cong {PORT} bi chiem boi tien trinh cu khong phan hoi.")
            kill_process_on_port(PORT)


    # 2. Tìm binary npm hoặc pnpm / yarn
    npm_cmd = resolve_npm_command()

    # Kiểm tra node_modules
    node_modules_path = os.path.join(SCRIPT_DIR, "node_modules")
    if not os.path.exists(node_modules_path):
        print("[INFO] Chua tim thay thu muc node_modules. Dang chay 'npm install'...")
        try:
            subprocess.run([npm_cmd, "install"], cwd=SCRIPT_DIR, check=True, creationflags=hidden_flags)
            print("[OK] Cai dat thu vien thanh cong.")
        except Exception as e:
            print(f"[LOI] Cai dat that bai: {e}")
            sys.exit(1)

    # 3. Kiểm tra xem đã có bản build production (.next) hay chưa hoặc mã nguồn có thay đổi mới hơn bản build không
    next_build_path = os.path.join(SCRIPT_DIR, ".next")
    build_id_path = os.path.join(next_build_path, "BUILD_ID")
    src_dir_path = os.path.join(SCRIPT_DIR, "src")
    is_dev = os.environ.get("NEXT_DEV", "").strip().lower() in ("1", "true", "yes")

    needs_build = not os.path.exists(build_id_path)
    if not is_dev and not needs_build and os.path.exists(src_dir_path):
        try:
            build_mtime = os.path.getmtime(build_id_path)
            latest_src_mtime = 0.0
            for root, _, files in os.walk(src_dir_path):
                for fname in files:
                    if fname.endswith((".ts", ".tsx", ".js", ".jsx", ".css")):
                        fpath = os.path.join(root, fname)
                        mtime = os.path.getmtime(fpath)
                        if mtime > latest_src_mtime:
                            latest_src_mtime = mtime
            if latest_src_mtime > build_mtime + 1.0:
                print("[INFO] Phat hien cap nhat ma nguon moi hon ban build hien tai. Dang dong goi lai...")
                needs_build = True
        except Exception:
            pass

    if not is_dev and needs_build:
        print("[INFO] Dang tao build production toi uu (.next)...")
        try:
            subprocess.run([npm_cmd, "run", "build"], cwd=SCRIPT_DIR, check=True, creationflags=hidden_flags)
            print("[OK] Dong goi ung dung thanh cong.")
        except Exception as e:
            print(f"[CANH BAO] Build that bai, chuyen sang che do dev: {e}")
            is_dev = True

    # 4. Khởi động Next.js server (Chế độ Production Start tối ưu hiệu năng và RAM)
    start_cmd = [npm_cmd, "run", "dev"] if is_dev else [npm_cmd, "run", "start"]
    mode_name = "Development" if is_dev else "Production (Toi uu toc do & RAM)"
    print(f"[INFO] Dang khoi dong Next.js server [{mode_name}] tren cong {PORT}...")
    stop_event = threading.Event()

    # Chỉ mở trình duyệt khi chạy tương tác (bỏ qua khi chạy nền ở Windows Startup)
    if not no_browser:
        watcher_thread = threading.Thread(
            target=wait_for_server_and_open_browser,
            args=(APP_URL, stop_event),
            daemon=True,
        )
        watcher_thread.start()

    proc = None
    log_handle = None
    try:
        popen_kwargs = {"cwd": SCRIPT_DIR}
        if no_browser:
            log_path = os.path.join(tempfile.gettempdir(), f"chamcong_server_{PORT}.log")
            log_handle = open(log_path, "a", encoding="utf-8", errors="replace")
            log_handle.write(f"\n=== Startup launch [{time.strftime('%Y-%m-%d %H:%M:%S')}] ===\n")
            log_handle.flush()
            popen_kwargs["stdin"] = subprocess.DEVNULL
            popen_kwargs["stdout"] = log_handle
            popen_kwargs["stderr"] = subprocess.STDOUT
            if hidden_flags:
                popen_kwargs["creationflags"] = hidden_flags

        proc = subprocess.Popen(
            start_cmd,
            **popen_kwargs,
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
    finally:
        if log_handle is not None:
            try:
                log_handle.close()
            except Exception:
                pass


if __name__ == "__main__":
    main()
