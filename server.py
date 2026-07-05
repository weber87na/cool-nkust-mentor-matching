from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import request, parse, error
import json
import os
import random
import sys


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "資料"
BACKUP_DIR = ROOT / "資料備份"
STUDENTS_FILE = DATA_DIR / "學弟妹.json"
SENIORS_FILE = DATA_DIR / "學長姐.json"
STATE_FILE = DATA_DIR / "抽籤狀態.json"
PRESET_PAIRS_FILE = DATA_DIR / "內定配對.json"
ORIGINAL_STUDENTS_FILE = BACKUP_DIR / "學弟妹原始.json"
ORIGINAL_SENIORS_FILE = BACKUP_DIR / "學長姐原始.json"
YUELAO_CONFIG_FILE = ROOT / "月老" / "config.json"
SENIOR_ROOM_QUOTA = 12


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
    current_name = state.get("currentStudentName", "")
    drawn_student_names = list(dict.fromkeys(state.get("drawnStudentNames", [])))
    if current_name and current_name not in drawn_student_names:
        drawn_student_names.append(current_name)
    return {
        "currentStudentName": current_name,
        "usedSeniorNames": list(dict.fromkeys(state.get("usedSeniorNames", []))),
        "drawnStudentNames": drawn_student_names,
        "seniorRoomStudentNames": list(dict.fromkeys(state.get("seniorRoomStudentNames", []))),
    }


def write_state(state):
    write_json(STATE_FILE, {
        "currentStudentName": state.get("currentStudentName", ""),
        "usedSeniorNames": list(dict.fromkeys(state.get("usedSeniorNames", []))),
        "drawnStudentNames": list(dict.fromkeys(state.get("drawnStudentNames", []))),
        "seniorRoomStudentNames": list(dict.fromkeys(state.get("seniorRoomStudentNames", []))),
    })


def senior_name(senior):
    return senior.get("姓名", "")


def student_name(student):
    return student.get("姓名", "")


def read_preset_pairs(students, seniors):
    if not PRESET_PAIRS_FILE.exists():
        return {}

    try:
        pairs = read_json(PRESET_PAIRS_FILE, [])
    except json.JSONDecodeError as error:
        raise ValueError(f"內定配對.json 格式錯誤：{error.msg}")
    if not isinstance(pairs, list):
        raise ValueError("內定配對.json 必須是陣列格式")

    valid_students = {student_name(student) for student in students if student_name(student)}
    valid_seniors = {senior_name(senior) for senior in seniors if senior_name(senior)}
    preset_pairs = {}
    preset_seniors = {}

    for index, item in enumerate(pairs, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"內定配對.json 第 {index} 筆必須是物件")
        preset_student = str(item.get("學弟妹", "")).strip()
        preset_senior = str(item.get("學長姐", "")).strip()
        if not preset_student or not preset_senior:
            raise ValueError(f"內定配對.json 第 {index} 筆缺少學弟妹或學長姐")
        if preset_student not in valid_students:
            raise ValueError(f"內定配對.json 第 {index} 筆找不到學弟妹：{preset_student}")
        if preset_senior not in valid_seniors:
            raise ValueError(f"內定配對.json 第 {index} 筆找不到學長姐：{preset_senior}")
        if preset_student in preset_pairs:
            raise ValueError(f"內定配對.json 學弟妹重複：{preset_student}")
        if preset_senior in preset_seniors:
            raise ValueError(f"內定配對.json 學長姐重複：{preset_senior}")
        preset_pairs[preset_student] = preset_senior
        preset_seniors[preset_senior] = preset_student

    return preset_pairs


def mark_senior_used(state, senior, all_senior_names, reserved_senior_names=None):
    reserved = set(reserved_senior_names or [])
    used = list(dict.fromkeys([*state.get("usedSeniorNames", []), senior]))
    reusable_names = [name for name in all_senior_names if name and name not in reserved]
    if reusable_names and len(set(used).intersection(reusable_names)) >= len(set(reusable_names)):
        state["usedSeniorNames"] = [name for name in used if name not in set(reusable_names)]
    else:
        state["usedSeniorNames"] = used


def apply_preset_pairing(students, state, current, preset_senior, all_senior_names, reserved_senior_names):
    previous_senior = current.get("學長姐", "")
    if previous_senior and previous_senior != preset_senior:
        state["usedSeniorNames"] = [
            name for name in state.get("usedSeniorNames", [])
            if name != previous_senior
        ]
    current["學長姐"] = preset_senior
    mark_senior_used(state, preset_senior, all_senior_names, reserved_senior_names)
    write_json(STUDENTS_FILE, students)
    return preset_senior


def pending_student_names(students, state):
    drawn = set(state.get("drawnStudentNames", []))
    senior_room_names = set(state.get("seniorRoomStudentNames", []))
    return [
        student_name(student)
        for student in students
        if student_name(student) in drawn
        and student_name(student) in senior_room_names
        and not student.get("學長姐")
    ]


def ensure_senior_room_students(students, state):
    student_names = [student_name(student) for student in students if student_name(student)]
    valid_names = set(student_names)
    selected = [
        name
        for name in state.get("seniorRoomStudentNames", [])
        if name in valid_names
    ]
    drawn_names = set(state.get("drawnStudentNames", []))
    unpaired_names = [
        student_name(student)
        for student in students
        if student_name(student) and not student.get("學長姐") and student_name(student) not in drawn_names
    ]
    candidate_names = unpaired_names if not selected and len(unpaired_names) >= SENIOR_ROOM_QUOTA else student_names
    quota = min(SENIOR_ROOM_QUOTA, len(candidate_names))
    if len(selected) < quota:
        remaining = [name for name in candidate_names if name not in set(selected)]
        random.shuffle(remaining)
        selected = [*selected, *remaining[:quota - len(selected)]]
    elif len(selected) > quota:
        selected = selected[:quota]

    state["seniorRoomStudentNames"] = list(dict.fromkeys(selected))
    return state["seniorRoomStudentNames"]


def assign_random_senior(students, seniors, state, current, reserved_senior_names=None):
    all_senior_names = [senior_name(item) for item in seniors if senior_name(item)]
    reserved = set(reserved_senior_names or [])
    eligible_senior_names = [name for name in all_senior_names if name not in reserved]
    if not eligible_senior_names:
        raise ValueError("目前沒有可配對的學長姐")

    used = set(state.get("usedSeniorNames", []))
    if len(used.intersection(eligible_senior_names)) >= len(set(eligible_senior_names)):
        used = set()
        state["usedSeniorNames"] = [name for name in state.get("usedSeniorNames", []) if name in reserved]

    available = [name for name in eligible_senior_names if name not in used]
    senior = random.choice(available or eligible_senior_names)
    current["學長姐"] = senior
    mark_senior_used(state, senior, all_senior_names, reserved)
    write_json(STUDENTS_FILE, students)
    return senior


def build_state():
    students = read_json(STUDENTS_FILE, [])
    seniors = read_json(SENIORS_FILE, [])
    preset_pairs = read_preset_pairs(students, seniors)
    reserved_senior_names = set(preset_pairs.values())
    state = read_state()
    previous_senior_room_student_names = list(state.get("seniorRoomStudentNames", []))
    senior_room_student_names = ensure_senior_room_students(students, state)
    all_senior_names = [senior_name(senior) for senior in seniors if senior_name(senior)]
    if senior_room_student_names != previous_senior_room_student_names:
        write_state(state)

    reusable_senior_names = [name for name in all_senior_names if name not in reserved_senior_names]
    if reusable_senior_names and len(set(state["usedSeniorNames"]).intersection(reusable_senior_names)) >= len(set(reusable_senior_names)):
        state["usedSeniorNames"] = [name for name in state["usedSeniorNames"] if name in reserved_senior_names]
        write_state(state)

    used = set(state["usedSeniorNames"])
    current = next((student for student in students if student_name(student) == state["currentStudentName"]), None)
    available_seniors = [
        senior for senior in seniors
        if senior_name(senior) not in used and senior_name(senior) not in reserved_senior_names
    ]
    pending_names = pending_student_names(students, state)
    if len(pending_names) > 1:
        preferred = state["currentStudentName"] if state["currentStudentName"] in pending_names else pending_names[0]
        paired_drawn_names = [
            student_name(student)
            for student in students
            if student_name(student) in set(state["drawnStudentNames"]) and student.get("學長姐")
        ]
        state["drawnStudentNames"] = list(dict.fromkeys([*paired_drawn_names, preferred]))
        write_state(state)
        pending_names = [preferred]

    if pending_names and not current:
        state["currentStudentName"] = pending_names[0]
        current = next((student for student in students if student_name(student) == state["currentStudentName"]), None)
        write_state(state)

    return {
        "students": students,
        "seniors": seniors,
        "currentStudent": current,
        "currentStudentName": state["currentStudentName"],
        "usedSeniorNames": state["usedSeniorNames"],
        "drawnStudentNames": state["drawnStudentNames"],
        "seniorRoomQuota": SENIOR_ROOM_QUOTA,
        "seniorRoomStudentNames": senior_room_student_names,
        "pendingStudentName": pending_names[0] if pending_names else "",
        "availableSeniors": available_seniors,
        "presetPairs": preset_pairs,
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
    write_state({"currentStudentName": "", "usedSeniorNames": [], "drawnStudentNames": [], "seniorRoomStudentNames": []})


def read_yuelao_config():
    config = read_json(YUELAO_CONFIG_FILE, {})
    if not config:
        raise ValueError("Missing 月老/config.json")
    return config


def configured(value):
    return bool(value) and not str(value).startswith("請填入")


def normalize_prediction_items(data):
    items = []
    if isinstance(data, list):
        for item in data:
            items.extend(normalize_prediction_items(item))
        return items
    if not isinstance(data, dict):
        return items

    predictions = data.get("predictions")
    if isinstance(predictions, dict):
        predictions = predictions.get("predictions") or predictions.get("detections") or predictions.get("results")
    if isinstance(predictions, list):
        items.extend([item for item in predictions if isinstance(item, dict)])

    for key in ("outputs", "results", "detections"):
        value = data.get(key)
        if isinstance(value, (dict, list)):
            items.extend(normalize_prediction_items(value))

    return items


def http_json(url, payload, headers=None, timeout=20):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "curl/8.0.1",
            **(headers or {}),
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw or "{}")
    except error.HTTPError as api_error:
        details = api_error.read().decode("utf-8", errors="replace")
        raise ValueError(f"Remote API failed: HTTP {api_error.code}: {details or api_error.reason}")
    except Exception as api_error:
        raise ValueError(f"Remote API failed: {api_error}")


def strip_data_url(image):
    if not isinstance(image, str) or not image:
        raise ValueError("Missing image")
    if "," in image and image.startswith("data:"):
        return image.split(",", 1)[1]
    return image


def detect_money_amount(label):
    normalized = str(label or "").lower()
    if "one thousand" in normalized or "1000" in normalized:
        return 1000
    if "five hundred" in normalized or "500" in normalized:
        return 500
    if "one hundred" in normalized or "100" in normalized:
        return 100
    return None


def yuelao_agent_for_amount(liveavatar_config, amount):
    agents = liveavatar_config.get("agentsByAmount", {})
    rule = agents.get(str(amount), {}) if amount else {}
    return {
        "agentId": rule.get("agentId") or liveavatar_config.get("agentId", ""),
        "questionCount": int(rule.get("questionCount") or liveavatar_config.get("questionCount", 3)),
    }


def yuelao_agent_for_ritual(liveavatar_config, ritual):
    if ritual == "incense":
        rules = liveavatar_config.get("incenseAgents")
        if isinstance(rules, list) and rules:
            rule = random.choice(rules)
        else:
            rule = liveavatar_config.get("incenseAgent", {})
        return {
            "agentId": rule.get("agentId") or liveavatar_config.get("agentId", ""),
            "questionCount": int(rule.get("questionCount") or liveavatar_config.get("questionCount", 3)),
            "label": rule.get("label", ""),
        }
    if ritual == "slow-money":
        rule = liveavatar_config.get("slowMoneyAgent", {})
        return {
            "agentId": rule.get("agentId") or liveavatar_config.get("agentId", ""),
            "questionCount": int(rule.get("questionCount") or liveavatar_config.get("questionCount", 3)),
            "label": rule.get("label", ""),
        }
    return None


def detect_money_with_roboflow(image_data_url):
    config = read_yuelao_config().get("roboflow", {})
    api_key = config.get("apiKey")
    if not configured(api_key):
        raise ValueError("Missing roboflow.apiKey in 月老/config.json")

    image = strip_data_url(image_data_url)
    classes = config.get("classes") or [
        "Genuine one hundred taiwan dollar",
        "Genuine five hundred taiwan dollar",
        "Genuine one thousand taiwan dollar",
        "Counterfeit five hundred taiwan dollar",
        "Counterfeit one hundred taiwan dollar",
        "Counterfeit one thousand taiwan dollar",
    ]
    keywords = [
        str(item).strip().lower()
        for item in config.get("acceptedKeywords", ["one hundred", "five hundred", "one thousand", "100", "500", "1000"])
        if str(item).strip()
    ]
    threshold = float(config.get("confidenceThreshold", 0.35))

    if configured(config.get("workflowId")):
        workspace = config.get("workspace")
        workflow = config.get("workflowId")
        if not workspace:
            raise ValueError("Missing roboflow.workspace in 月老/config.json")
        base_url = config.get("apiUrl", "https://serverless.roboflow.com").rstrip("/")
        url = f"{base_url}/infer/workflows/{parse.quote(workspace)}/{parse.quote(workflow)}"
        payload = {
            "api_key": api_key,
            "inputs": {
                "image": {"type": "base64", "value": image},
                "classes": ", ".join(classes),
            },
        }
    else:
        model_id = config.get("modelId")
        if not model_id:
            raise ValueError("Missing roboflow.workflowId or roboflow.modelId in 月老/config.json")
        base_url = config.get("apiUrl", "https://detect.roboflow.com").rstrip("/")
        query = parse.urlencode({
            "api_key": api_key,
            "confidence": int(threshold * 100),
            "format": "json",
        })
        url = f"{base_url}/{model_id}?{query}"
        payload = {"image": image}

    result = http_json(url, payload, timeout=int(config.get("timeoutSeconds", 20)))
    predictions = normalize_prediction_items(result)
    allowed = {str(item).strip().lower() for item in classes}
    matched = []
    for item in predictions:
        label = str(item.get("class") or item.get("class_name") or item.get("label") or "").strip()
        confidence = float(item.get("confidence") or item.get("score") or 0)
        normalized_label = label.lower()
        class_allowed = normalized_label in allowed
        keyword_allowed = any(keyword in normalized_label for keyword in keywords)
        amount = detect_money_amount(label)
        if (class_allowed or keyword_allowed) and confidence >= threshold and amount:
            matched.append({"class": label, "confidence": confidence, "amount": amount})

    matched.sort(key=lambda item: item["confidence"], reverse=True)
    best = matched[0] if matched else None
    liveavatar_config = read_yuelao_config().get("liveAvatar", {})
    agent_rule = yuelao_agent_for_amount(liveavatar_config, best.get("amount") if best else None)

    return {
        "detected": bool(matched),
        "matches": matched,
        "amount": best.get("amount") if best else None,
        "questionCount": agent_rule["questionCount"] if best else None,
        "agentId": agent_rule["agentId"] if best else "",
        "predictions": predictions[:10],
    }


def create_liveavatar_session(payload):
    config = read_yuelao_config().get("liveAvatar", {})
    api_key = config.get("apiKey")
    endpoint = config.get("sessionEndpoint") or config.get("tokenEndpoint")
    if not configured(api_key):
        raise ValueError("Missing liveAvatar.apiKey in 月老/config.json")
    if not configured(endpoint):
        raise ValueError("Missing liveAvatar.sessionEndpoint in 月老/config.json")

    request_payload = {
        "mode": config.get("mode", "FULL"),
        "is_sandbox": bool(config.get("isSandbox", False)),
        "interactivity_type": config.get("interactivityType", "CONVERSATIONAL"),
        "max_session_duration": min(int(config.get("durationSeconds", 180)), 180),
        **dict(config.get("sessionPayload", {})),
    }

    if config.get("avatarId"):
        request_payload["avatar_id"] = config["avatarId"]
    ritual = payload.get("ritual")
    ritual_rule = yuelao_agent_for_ritual(config, ritual)
    amount = payload.get("amount")
    try:
        amount = int(amount) if amount else None
    except (TypeError, ValueError):
        amount = None
    agent_rule = ritual_rule or yuelao_agent_for_amount(config, amount)
    agent_id = agent_rule["agentId"]
    question_count = agent_rule["questionCount"]

    if agent_id:
        request_payload["voice_agent"] = {
            **dict(request_payload.get("voice_agent", {})),
            "id": agent_id,
        }
        request_payload.pop("avatar_persona", None)
    elif config.get("contextId") or config.get("voiceId"):
        request_payload["avatar_persona"] = {
            **dict(request_payload.get("avatar_persona", {})),
        }
        if config.get("contextId"):
            request_payload["avatar_persona"]["context_id"] = config["contextId"]
        if config.get("voiceId"):
            request_payload["avatar_persona"]["voice_id"] = config["voiceId"]

    if payload.get("studentName"):
        request_payload["dynamic_variables"] = {
            **dict(request_payload.get("dynamic_variables", {})),
            "student_name": payload["studentName"],
        }
    if amount:
        request_payload["dynamic_variables"] = {
            **dict(request_payload.get("dynamic_variables", {})),
            "money_amount": str(amount),
            "question_count": str(question_count),
        }
    if ritual:
        request_payload["dynamic_variables"] = {
            **dict(request_payload.get("dynamic_variables", {})),
            "offering_type": str(ritual),
            "question_count": str(question_count),
        }

    api_key_header = config.get("apiKeyHeader", "X-API-KEY")
    if api_key_header.lower() == "authorization":
        auth_scheme = config.get("authScheme", "Bearer")
        headers = {"Authorization": f"{auth_scheme} {api_key}"}
    else:
        headers = {api_key_header: api_key}
    result = http_json(endpoint, request_payload, headers=headers, timeout=int(config.get("timeoutSeconds", 20)))
    return {
        "session": result,
        "sdkUrl": config.get("sdkUrl", ""),
        "clientOptions": config.get("clientOptions", {}),
        "durationSeconds": int(config.get("durationSeconds", 180)),
        "amount": amount,
        "ritual": ritual or "",
        "questionCount": question_count,
        "agentId": agent_id,
    }


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
        path = self.path.split("?", 1)[0]
        if path == "/api/state":
            try:
                self.send_json(200, build_state())
            except ValueError as error:
                self.send_json(400, {"error": str(error)})
            return
        if path == "/api/yuelao/config-status":
            self.yuelao_config_status()
            return
        if path == "/api/yuelao/detect-money":
            self.send_json(405, {
                "error": "這支 API 需要 POST webcam 截圖，請從 /月老/index.html 使用",
                "method": "POST",
                "body": {"image": "data:image/jpeg;base64,..."},
            })
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
            if path == "/api/yuelao/detect-money":
                self.detect_yuelao_money(payload)
                return
            if path == "/api/yuelao/session":
                self.create_yuelao_session(payload)
                return
            self.send_json(404, {"error": "Unknown API endpoint"})
        except json.JSONDecodeError:
            self.send_json(400, {"error": "Invalid JSON body"})
        except ValueError as error:
            self.send_json(400, {"error": str(error)})

    def set_current_student(self, payload):
        name = payload.get("name") or payload.get("studentName") or payload.get("姓名")
        if payload.get("clear"):
            students = read_json(STUDENTS_FILE, [])
            state = read_state()
            remove_name = payload.get("removeName") or payload.get("name")
            restored_senior = ""
            if remove_name:
                current = next((student for student in students if student_name(student) == remove_name), None)
                if current and current.get("學長姐"):
                    restored_senior = current.get("學長姐")
                    current["學長姐"] = ""
                    write_json(STUDENTS_FILE, students)
            if remove_name:
                state["drawnStudentNames"] = [
                    name for name in state.get("drawnStudentNames", [])
                    if name != remove_name
                ]
            if restored_senior:
                state["usedSeniorNames"] = [
                    name for name in state.get("usedSeniorNames", [])
                    if name != restored_senior
                ]
            if not payload.get("preserveCurrent") or state.get("currentStudentName") == remove_name:
                state["currentStudentName"] = ""
            write_state(state)
            self.send_json(200, build_state())
            return
        if not name:
            raise ValueError("Missing student name")

        students = read_json(STUDENTS_FILE, [])
        current = next((student for student in students if student_name(student) == name), None)
        if not current:
            self.send_json(404, {"error": "Student not found"})
            return

        seniors = read_json(SENIORS_FILE, [])
        state = read_state()
        preset_pairs = read_preset_pairs(students, seniors)
        reserved_senior_names = set(preset_pairs.values())
        all_senior_names = [senior_name(item) for item in seniors if senior_name(item)]
        senior_room_student_names = ensure_senior_room_students(students, state)
        pending_names = pending_student_names(students, state)
        if pending_names and name not in pending_names:
            self.send_json(409, {
                "error": f"{pending_names[0]} 尚未配對學長姐，請先完成這位學弟妹的配對",
                "pendingStudentName": pending_names[0],
            })
            return
        state["currentStudentName"] = name
        state["drawnStudentNames"] = list(dict.fromkeys([*state.get("drawnStudentNames", []), name]))
        preset_senior = preset_pairs.get(name)
        if preset_senior:
            apply_preset_pairing(students, state, current, preset_senior, all_senior_names, reserved_senior_names)
        elif name not in set(senior_room_student_names) and not current.get("學長姐"):
            assign_random_senior(students, seniors, state, current, reserved_senior_names)
        write_state(state)
        self.send_json(200, build_state())

    def assign_senior(self, payload):
        senior = payload.get("seniorName") or payload.get("name") or payload.get("姓名")
        if not senior:
            raise ValueError("Missing senior name")

        students = read_json(STUDENTS_FILE, [])
        seniors = read_json(SENIORS_FILE, [])
        state = read_state()
        preset_pairs = read_preset_pairs(students, seniors)
        reserved_senior_names = set(preset_pairs.values())
        all_senior_names = [senior_name(item) for item in seniors if senior_name(item)]
        current_name = state.get("currentStudentName")
        current = next((student for student in students if student_name(student) == current_name), None)

        if not current:
            self.send_json(409, {"error": "請先到抽抽樂選定學弟妹"})
            return
        preset_senior = preset_pairs.get(current_name)
        if preset_senior:
            if current.get("學長姐") != preset_senior:
                apply_preset_pairing(students, state, current, preset_senior, all_senior_names, reserved_senior_names)
                write_state(state)
            self.send_json(409, {"error": f"{current_name} 此學弟妹已有內定配對：{preset_senior}", "student": current})
            return
        if current.get("學長姐"):
            self.send_json(409, {"error": f"{current_name} 已配對 {current.get('學長姐')}", "student": current})
            return
        if senior in reserved_senior_names:
            self.send_json(409, {"error": f"{senior} 已保留給內定配對，不能由其他房間抽出"})
            return
        if not any(senior_name(item) == senior for item in seniors):
            self.send_json(404, {"error": "Senior not found"})
            return

        current["學長姐"] = senior
        mark_senior_used(state, senior, all_senior_names, reserved_senior_names)

        write_json(STUDENTS_FILE, students)
        write_state(state)
        self.send_json(200, build_state())

    def reset_data(self):
        reset_data_from_backup()
        self.send_json(200, build_state())

    def yuelao_config_status(self):
        try:
            config = read_yuelao_config()
            self.send_json(200, {
                "ready": True,
                "roboflow": configured(config.get("roboflow", {}).get("apiKey")),
                "liveAvatar": configured(config.get("liveAvatar", {}).get("apiKey")),
                "sdkUrl": config.get("liveAvatar", {}).get("sdkUrl", ""),
            })
        except ValueError as error:
            self.send_json(200, {"ready": False, "error": str(error)})

    def detect_yuelao_money(self, payload):
        result = detect_money_with_roboflow(payload.get("image"))
        self.send_json(200, result)

    def create_yuelao_session(self, payload):
        result = create_liveavatar_session(payload)
        self.send_json(200, result)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving {ROOT} at http://127.0.0.1:{port}/入口/index.html")
    server.serve_forever()


if __name__ == "__main__":
    main()
