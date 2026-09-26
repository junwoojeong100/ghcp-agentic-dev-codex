import argparse
import codecs
import errno
import fcntl
import json
import os
import pty
import selectors
import signal
import struct
import sys
import termios


def emit(value):
    print(json.dumps(value, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cwd", required=True)
    parser.add_argument("--cols", type=int, default=112)
    parser.add_argument("--rows", type=int, default=28)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command or not 40 <= args.cols <= 300 or not 15 <= args.rows <= 100:
        parser.error("A command and valid terminal dimensions are required.")
    pid, master = pty.fork()
    if pid == 0:
        os.chdir(args.cwd)
        env = dict(os.environ, TERM="xterm-256color", COLORTERM="truecolor")
        for key in ("CODEX_THREAD_ID", "CODEX_SESSION_ID", "CODEX_GHCP_BRIDGE_TOKEN", "NO_COLOR", "NODE_TEST_CONTEXT"):
            env.pop(key, None)
        for key in list(env):
            if key.startswith("COPILOT_PROVIDER_") or key == "COPILOT_CUSTOM_INSTRUCTIONS_DIRS":
                env.pop(key)
        os.execvpe(command[0], command, env)

    def stop(_signal=None, _frame=None):
        try:
            os.killpg(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", args.rows, args.cols, 0, 0))
    emit({"type": "spawn", "pid": pid, "cols": args.cols, "rows": args.rows})
    decoder = codecs.getincrementaldecoder("utf-8")("replace")
    selector = selectors.DefaultSelector()
    selector.register(master, selectors.EVENT_READ, "output")
    selector.register(sys.stdin.fileno(), selectors.EVENT_READ, "input")
    pending = b""
    ended = False
    try:
        while not ended:
            for key, _mask in selector.select(timeout=0.2):
                if key.data == "output":
                    try:
                        data = os.read(master, 65536)
                    except OSError as error:
                        if error.errno != errno.EIO:
                            raise
                        data = b""
                    if not data:
                        ended = True
                        break
                    text = decoder.decode(data)
                    if text:
                        emit({"type": "output", "data": text})
                else:
                    data = os.read(sys.stdin.fileno(), 65536)
                    if not data:
                        stop()
                        selector.unregister(sys.stdin.fileno())
                        continue
                    pending += data
                    while b"\n" in pending:
                        line, pending = pending.split(b"\n", 1)
                        message = json.loads(line)
                        if message["type"] == "input":
                            os.write(master, message["data"].encode("utf-8"))
                        elif message["type"] == "stop":
                            stop()
                        else:
                            raise ValueError("Unknown terminal control message")
        remaining = decoder.decode(b"", final=True)
        if remaining:
            emit({"type": "output", "data": remaining})
        _pid, status = os.waitpid(pid, 0)
        emit({"type": "exit", "exitCode": os.waitstatus_to_exitcode(status)})
    finally:
        selector.close()
        os.close(master)
        stop()


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as error:
        emit({"type": "error", "message": str(error)})
        sys.exit(1)
