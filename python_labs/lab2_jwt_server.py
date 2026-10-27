# Лабораторна робота №2
# Тема: Автентифікація з використанням сторонніх сервісів. JSON Web Tokens (JWT).
# Студент за замовчуванням: №12 Марчук Дмитро Андрійович
# Запуск: pip install flask pyjwt && python lab2_jwt_server.py

import hashlib
import datetime
import jwt
from flask import Flask, request, jsonify

app = Flask(__name__)

# Секретний ключ у форматі FirstnameLastname та час дії токена (номер у списку = 12)
JWT_SECRET = "DmytroMarchuk"
GROUP_LIST_NUMBER = 12
TOKEN_TTL_SECONDS = GROUP_LIST_NUMBER * 60


def sha256_hash(password: str) -> str:
    """Хешування пароля алгоритмом SHA-256 без солі"""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# Трійка користувачів за завданням (№11 вище у списку, №12 ви, №13 нижче у списку)
USERS_TRIAD = [
    {"id": 11, "login": "Максим", "password_hash": sha256_hash("Марія")},
    {"id": 12, "login": "Марчук", "password_hash": sha256_hash("Дмитро")},
    {"id": 13, "login": "Новак",  "password_hash": sha256_hash("Давід")},
]

# Повний список групи (усі 25 користувачів)
USERS_DB = [
    {"id": 1,  "login": "Антошків",    "password_hash": sha256_hash("Роман")},
    {"id": 2,  "login": "Бойко",       "password_hash": sha256_hash("Божена")},
    {"id": 3,  "login": "Бондарчук",   "password_hash": sha256_hash("Ілья")},
    {"id": 4,  "login": "Возьний",     "password_hash": sha256_hash("Михайло")},
    {"id": 5,  "login": "Гарасим",     "password_hash": sha256_hash("Вадим")},
    {"id": 6,  "login": "Гонтарь",     "password_hash": sha256_hash("Маркіян")},
    {"id": 7,  "login": "Козак",       "password_hash": sha256_hash("Олег-Денис")},
    {"id": 8,  "login": "Козяк",       "password_hash": sha256_hash("Дмитро")},
    {"id": 9,  "login": "Костенко",    "password_hash": sha256_hash("Віктор")},
    {"id": 10, "login": "Ленартович",  "password_hash": sha256_hash("Максим")},
    {"id": 11, "login": "Максим",      "password_hash": sha256_hash("Марія")},
    {"id": 12, "login": "Марчук",      "password_hash": sha256_hash("Дмитро")},
    {"id": 13, "login": "Новак",       "password_hash": sha256_hash("Давід")},
    {"id": 14, "login": "Паздерська",  "password_hash": sha256_hash("Марія")},
    {"id": 15, "login": "Павловський", "password_hash": sha256_hash("Максим")},
    {"id": 16, "login": "Петрович",    "password_hash": sha256_hash("Андрій")},
    {"id": 17, "login": "Пращарук",    "password_hash": sha256_hash("Руслан")},
    {"id": 18, "login": "Прокіпець",   "password_hash": sha256_hash("Богдан")},
    {"id": 19, "login": "Романенко",   "password_hash": sha256_hash("Михайло")},
    {"id": 20, "login": "Стебельська", "password_hash": sha256_hash("Катерина")},
    {"id": 21, "login": "Тиравський",  "password_hash": sha256_hash("Олег")},
    {"id": 22, "login": "Титар",       "password_hash": sha256_hash("Ангелина")},
    {"id": 23, "login": "Черниш",      "password_hash": sha256_hash("Олег")},
    {"id": 24, "login": "Чернов",      "password_hash": sha256_hash("Дмитро")},
    {"id": 25, "login": "Юрків",       "password_hash": sha256_hash("Тарас")},
]


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    login_input = data.get("login", "")
    password_input = data.get("password", "")

    input_hash = sha256_hash(password_input)
    user = next((u for u in USERS_DB if u["login"] == login_input and u["password_hash"] == input_hash), None)
    if not user:
        return jsonify({"error": "Невірний логін або пароль", "input_sha256": input_hash}), 401

    payload = {
        "id": user["id"],
        "login": user["login"],
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=TOKEN_TTL_SECONDS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return jsonify({
        "message": f"Користувач {user['login']} (id={user['id']}) був успішно авторизований!",
        "token": token
    }), 200


@app.route("/protected", methods=["GET"])
def protected_route():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Відсутній заголовок Authorization: Bearer <token>"}), 401

    token = auth_header.split(" ", 1)[1]
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return jsonify({
            "status": "Доступ дозволено!",
            "user_data": decoded
        }), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Час дії токена минув!"}), 401
    except jwt.InvalidTokenError as e:
        return jsonify({"error": f"Невалідний токен: {str(e)}"}), 401


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
