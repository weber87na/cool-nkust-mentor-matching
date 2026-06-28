from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import sys


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "資料"
BACKUP_DIR = ROOT / "資料備份"
STUDENTS_FILE = DATA_DIR / "學弟妹.json"
SENIORS_FILE = DATA_DIR / "學長姐.json"
STATE_FILE = DATA_DIR / "抽籤狀態.json"
ORIGINAL_STUDENTS_FILE = BACKUP_DIR / "學弟妹原始.json"
ORIGINAL_SENIORS_FILE = BACKUP_DIR / "學長姐原始.json"


def read_json(path, fallback):
    if not path.exists():
        return fallback
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")
    os.replace(tmp_path, path)


def read_state():
    state = read_json(STATE_FILE, {})
    return {
        "currentStudentName": state.get("currentStudentName", ""),
        "usedSeniorNames": list(dict.fromkeys(state.get("usedSeniorNames", []))),
    }


def write_state(state):
    write_json(STATE_FILE, {
        "currentStudentName": state.get("currentStudentName", ""),
        "usedSeniorNames": list(dict.fromkeys(state.get("usedSeniorNames", []))),
    })


def senior_name(senior):
    return senior.get("姓名", "")


def student_name(student):
    return student.get("姓名", "")


def build_state():
    students = read_json(STUDENTS_FILE, [])
    seniors = read_json(SENIORS_FILE, [])
    state = read_state()
    all_senior_names = [senior_name(senior) for senior in seniors if senior_name(senior)]

    if all_senior_names and len(set(state["usedSeniorNames"])) >= len(set(all_senior_names)):
        state["usedSeniorNames"] = []
        write_state(state)

    used = set(state["usedSeniorNames"])
    current = next((student for student in students if student_name(student) == state["currentStudentName"]), None)
    available_seniors = [senior for senior in seniors if senior_name(senior) not in used]

    return {
        "students": students,
        "seniors": seniors,
        "currentStudent": current,
        "currentStudentName": state["currentStudentName"],
        "usedSeniorNames": state["usedSeniorNames"],
        "availableSeniors": available_seniors,
    }


def reset_data_from_backup():
    if not ORIGINAL_STUDENTS_FILE.exists():
        raise ValueError("Missing backup file: 學弟妹原始.json")
    if not ORIGINAL_SENIORS_FILE.exists():
        raise ValueError("Missing backup file: 學長姐原始.json")

    students = read_json(ORIGINAL_STUDENTS_FILE, [])
    seniors = read_json(ORIGINAL_SENIORS_FILE, [])
    write_json(STUDENTS_FILE, students)
    write_json(SENIORS_FILE, seniors)
    write_state({"currentStudentName": "", "usedSeniorNames": []})


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/state":
            self.send_json(200, build_state())
            return
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        try:
            payload = self.read_body()
            if path == "/api/current-student":
                self.set_current_student(payload)
                return
            if path == "/api/assign-senior":
                self.assign_senior(payload)
                return
            if path == "/api/reset-data":
                self.reset_data()
                return
            self.send_json(404, {"error": "Unknown API endpoint"})
        except json.JSONDecodeError:
            self.send_json(400, {"error": "Invalid JSON body"})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})

    def set_current_student(self, payload):
        name = payload.get("name") or payload.get("studentName") or payload.get("姓名")
        if payload.get("clear"):
            state = read_state()
            state["currentStudentName"] = ""
            write_state(state)
            self.send_json(200, build_state())
            return
        if not name:
            raise ValueError("Missing student name")

        students = read_json(STUDENTS_FILE, [])
        if not any(student_name(student) == name for student in students):
            self.send_json(404, {"error": "Student not found"})
            return

        state = read_state()
        state["currentStudentName"] = name
        write_state(state)
        self.send_json(200, build_state())

    def assign_senior(self, payload):
        senior = payload.get("seniorName") or payload.get("name") or payload.get("姓名")
        if not senior:
            raise ValueError("Missing senior name")

        students = read_json(STUDENTS_FILE, [])
        seniors = read_json(SENIORS_FILE, [])
        state = read_state()
        current_name = state.get("currentStudentName")
        current = next((student for student in students if student_name(student) == current_name), None)

        if not current:
            self.send_json(409, {"error": "請先到抽抽樂選定學弟妹"})
            return
        if current.get("學長姐"):
            self.send_json(409, {"error": f"{current_name} 已配對 {current.get('學長姐')}", "student": current})
            return
        if not any(senior_name(item) == senior for item in seniors):
            self.send_json(404, {"error": "Senior not found"})
            return

        current["學長姐"] = senior
        used = list(dict.fromkeys([*state.get("usedSeniorNames", []), senior]))
        all_senior_names = [senior_name(item) for item in seniors if senior_name(item)]
        state["usedSeniorNames"] = [] if len(set(used)) >= len(set(all_senior_names)) else used

        write_json(STUDENTS_FILE, students)
        write_state(state)
        self.send_json(200, build_state())

    def reset_data(self):
        reset_data_from_backup()
        self.send_json(200, build_state())


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving {ROOT} at http://127.0.0.1:{port}/入口/index.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
