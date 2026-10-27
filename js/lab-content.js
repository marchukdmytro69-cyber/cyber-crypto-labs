/**
 * AEGIS // CRYPTO-OPS TACTICAL TERMINAL
 * Python Source Code Generators & Answers to Control Questions for Labs 1, 2, 4, 5
 */

window.LabContent = (() => {

  function getPythonCode(labId, profile = {}) {
    const firstName = profile.firstName || 'Дмитро';
    const lastName = profile.lastName || 'Марчук';
    const firstNameEn = profile.firstNameEn || 'Dmytro';
    const lastNameEn = profile.lastNameEn || 'Marchuk';
    const groupId = Number(profile.groupId) || 12;
    const variant = Number(profile.variant) || 12;
    const students = window.CryptoEngines.GROUP_STUDENTS || [];
    const prevStu = students.find(s => s.id === Math.max(1, groupId - 1)) || { id: 11, lastName: 'Максим', firstName: 'Марія' };
    const currStu = students.find(s => s.id === groupId) || { id: 12, lastName: 'Марчук', firstName: 'Дмитро' };
    const nextStu = students.find(s => s.id === Math.min(25, groupId + 1)) || { id: 13, lastName: 'Новак', firstName: 'Давід' };
    const sdesVariantObj = window.CryptoEngines.SDES_VARIANTS.find(v => v.variant === variant) || window.CryptoEngines.SDES_VARIANTS[11];

    if (labId === 'lab1') {
      return `# Лабораторна робота №1
# Тема: Шифр Цезаря. Частотний криптоаналіз. Шифр перестановки.

from collections import Counter

UA_ALPHABET = "АБВГҐДЕЄЖЗИіїЙКЛМНОПРСТУФХЦЧШЩЬЮЯ".upper()
EN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def caesar_cipher(text: str, key: int, decrypt: bool = False) -> str:
    alphabet = EN_ALPHABET if any(c.upper() in EN_ALPHABET for c in text) else UA_ALPHABET
    n = len(alphabet)
    shift = (-key if decrypt else key) % n
    result = []
    for ch in text:
        upper_ch = ch.upper()
        if upper_ch in alphabet:
            idx = alphabet.index(upper_ch)
            new_ch = alphabet[(idx + shift) % n]
            result.append(new_ch.lower() if ch.islower() else new_ch)
        else:
            result.append(ch)
    return "".join(result)

def frequency_attack_ua(ciphertext: str, most_common_lang_char: str = "О"):
    filtered = [c.upper() for c in ciphertext if c.upper() in UA_ALPHABET]
    counts = Counter(filtered)
    most_freq_cipher, freq_val = counts.most_common(1)[0]
    key = (UA_ALPHABET.index(most_freq_cipher) - UA_ALPHABET.index(most_common_lang_char)) % len(UA_ALPHABET)
    decrypted = caesar_cipher(ciphertext, key, decrypt=True)
    return key, most_freq_cipher, freq_val, decrypted

def columnar_transposition_encrypt(plaintext: str, keyword: str) -> str:
    cols = len(keyword)
    # Визначаємо порядок стовпців за алфавітом
    order = sorted(range(cols), key=lambda i: (keyword[i].upper(), i))
    rows = (len(plaintext) + cols - 1) // cols
    padded = plaintext.ljust(rows * cols, " ")
    matrix = [list(padded[r * cols:(r + 1) * cols]) for r in range(rows)]
    return "".join(matrix[r][c] for c in order for r in range(rows))

def columnar_transposition_decrypt(ciphertext: str, keyword: str) -> str:
    cols = len(keyword)
    rows = (len(ciphertext) + cols - 1) // cols
    order = sorted(range(cols), key=lambda i: (keyword[i].upper(), i))
    matrix = [[""] * cols for _ in range(rows)]
    idx = 0
    for c in order:
        for r in range(rows):
            matrix[r][c] = ciphertext[idx] if idx < len(ciphertext) else " "
            idx += 1
    return "".join("".join(row) for row in matrix).rstrip()

if __name__ == "__main__":
    print("=== 1. Шифр Цезаря ===")
    msg = "HONEY, I AM HOME"
    enc = caesar_cipher(msg, 3)
    print(f"Відкритий: {msg} -> Зашифрований (K=3): {enc}")

    print("\\n=== 2. Частотний аналіз ===")
    cipher_sample = "ДАФИНЦШЕИЮЯЗЩШФЬИТЧИВЮЯШХСЯЯЗВИЇШЧШЮФЬСПЄСПИЇОЛРПЧИЦРЗФЬРІИЇЇШЛСЯИФСЦРЇЧЄШЦАСЇШЧШІСХЗЧИЮДАФИНЧИЮЮИЦРВЧМЦИУШЙШЧСЛМЇСЛЯШЙШЕШЇШЧШЮФЬСПЄ"
    k, ch, cnt, dec = frequency_attack_ua(cipher_sample)
    print(f"Найчастіша літера: '{ch}' ({cnt} разів) -> Знайдений ключ K={k}\\nРозшифровано: {dec}")

    print("\\n=== 3. Шифр перестановки ===")
    pt, key_w = "Прикладна математика", "Шифр"
    ct = columnar_transposition_encrypt(pt, key_w)
    print(f"Ключ: {key_w} | Криптограма: '{ct}' | Дешифровано: '{columnar_transposition_decrypt(ct, key_w)}'")`;
    }

    if (labId === 'lab2') {
      return `# Лабораторна робота №2
# Тема: Автентифікація з використанням сторонніх сервісів. JSON Web Tokens (JWT).
# Запуск: pip install flask pyjwt && python lab2_jwt_server.py

import hashlib
import datetime
import jwt
from flask import Flask, request, jsonify

app = Flask(__name__)

# Секретний ключ у форматі FirstnameLastname та час дії токена (номер у списку = ${groupId})
JWT_SECRET = "${firstNameEn}${lastNameEn}"
TOKEN_TTL_SECONDS = ${groupId} * 60  # або ${groupId} секунд згідно номера у списку (${groupId})

def sha256_hash(password: str) -> str:
    """Хешування пароля алгоритмом SHA-256 без солі"""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

# База з 3-х користувачів за завданням (на 1 вище у списку [№${prevStu.id}], ви [№${currStu.id}], на 1 нижче [№${nextStu.id}])
USERS_TRIAD = [
    {"id": ${prevStu.id}, "login": "${prevStu.lastName}", "password_hash": sha256_hash("${prevStu.firstName}")},
    {"id": ${currStu.id}, "login": "${currStu.lastName}", "password_hash": sha256_hash("${currStu.firstName}")},
    {"id": ${nextStu.id}, "login": "${nextStu.lastName}", "password_hash": sha256_hash("${nextStu.firstName}")},
]

# Повний список групи (усі 25 студентів)
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

    # Обчислюємо SHA-256 хеш введеного пароля
    input_hash = sha256_hash(password_input)

    user = next((u for u in USERS_DB if u["login"] == login_input and u["password_hash"] == input_hash), None)
    if not user:
        return jsonify({"error": "Невірний логін або пароль", "input_sha256": input_hash}), 401

    # Генерація JWT токена (HS256)
    payload = {
        "id": user["id"],
        "login": user["login"],
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=TOKEN_TTL_SECONDS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return jsonify({
        "message": f"Користувач {user['login']} (id={user['id']}) був успішно авторизований!",
        "token": token,
        "secret_used": JWT_SECRET
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
    app.run(host="127.0.0.1", port=5000, debug=True)`;
    }

    if (labId === 'lab4') {
      return `# Лабораторна робота №4
# Тема: Протокол Діффі-Хеллмана (DH) та атака "Людина посередині" (MITM)

def diffie_hellman_standard(p: int = 331, g: int = 204, a: int = 46, b: int = 56):
    print("=== 1. Протокол Діффі-Хеллмана (2 учасники: Аліса та Боб) ===")
    print(f"Публічні параметри: p = {p}, g = {g}")
    print(f"Приватні ключі: a (Аліса) = {a}, b (Боб) = {b}")

    A = pow(g, a, p)
    B = pow(g, b, p)
    print(f"Аліса обчислює та надсилає A = g^a mod p = {g}^{a} mod {p} = {A}")
    print(f"Боб обчислює та надсилає   B = g^b mod p = {g}^{b} mod {p} = {B}")

    K_alice = pow(B, a, p)
    K_bob = pow(A, b, p)
    print(f"Спільний секрет у Аліси: K = B^a mod p = {B}^{a} mod {p} = {K_alice}")
    print(f"Спільний секрет у Боба:  K = A^b mod p = {A}^{b} mod {p} = {K_bob}")
    assert K_alice == K_bob, "Ключі мають співпадати!"
    return K_alice

def diffie_hellman_mitm(p: int = 331, g: int = 204, a: int = 46, b: int = 56, c1: int = 33, c2: int = 71):
    print("\\n=== 2. Атака 'Людина посередині' (MITM) на протоколі Діффі-Хеллмана ===")
    # Аліса надсилає A1, але його перехоплює Зловмисник
    A1 = pow(g, a, p)
    # Зловмисник генерує свої підставні публічні ключі B1 (для Аліси) та A2 (для Боба)
    B1 = pow(g, c1, p)
    A2 = pow(g, c2, p)
    # Боб надсилає B2, який також перехоплює Зловмисник
    B2 = pow(g, b, p)

    print(f"Аліса -> [MITM]: A1 = {A1} (Перехоплено! Боб отримує підмінений A2 = {A2})")
    print(f"Боб -> [MITM]:   B2 = {B2} (Перехоплено! Аліса отримує підмінений B1 = {B1})")

    # Ключ K1 між Алісою та Зловмисником
    K1_alice = pow(B1, a, p)
    K1_attacker = pow(A1, c1, p)

    # Ключ K2 між Зловмисником та Бобом
    K2_bob = pow(A2, b, p)
    K2_attacker = pow(B2, c2, p)

    print(f"Канал Аліса <-> Зловмисник: K1 = {K1_alice} (у Зловмисника K1 = {K1_attacker})")
    print(f"Канал Зловмисник <-> Боб:   K2 = {K2_bob} (у Зловмисника K2 = {K2_attacker})")

if __name__ == "__main__":
    diffie_hellman_standard()
    diffie_hellman_mitm()`;
    }

    if (labId === 'lab3') {
      return `# Лабораторна робота №3
# Тема: Система блочного шифрування S-DES (Варіант ${variant})
# Ключ: 0011011101 | Криптограма варіанта ${variant}: ${sdesVariantObj.cipher}

P10 = [3, 5, 2, 7, 4, 10, 1, 9, 8, 6]
P8  = [6, 3, 7, 4, 8, 5, 10, 9]
IP  = [2, 6, 3, 1, 4, 8, 5, 7]
IP_INV = [4, 1, 3, 5, 7, 2, 8, 6]
EP  = [4, 1, 2, 3, 2, 3, 4, 1]
P4  = [2, 4, 3, 1]

S0 = [
    [1, 0, 3, 2],
    [3, 2, 1, 0],
    [0, 2, 1, 3],
    [3, 1, 3, 1]
]

# Матриця S1 згідно з методичкою (стор. 4)
S1 = [
    [1, 1, 2, 3],
    [2, 0, 1, 3],
    [3, 0, 1, 0],
    [2, 1, 0, 3]
]

def permute(bits: str, table: list) -> str:
    return "".join(bits[i - 1] for i in table)

def ls(bits: str, n: int) -> str:
    return bits[n:] + bits[:n]

def xor_bits(a: str, b: str) -> str:
    return "".join("0" if x == y else "1" for x, y in zip(a, b))

def sbox_lookup(bits4: str, sbox: list) -> str:
    row = int(bits4[0] + bits4[3], 2)
    col = int(bits4[1] + bits4[2], 2)
    return format(sbox[row][col], "02b")

def generate_subkeys(key10: str):
    p10 = permute(key10, P10)
    l1, r1 = ls(p10[:5], 1), ls(p10[5:], 1)
    k1 = permute(l1 + r1, P8)
    l2, r2 = ls(l1, 2), ls(r1, 2)
    k2 = permute(l2 + r2, P8)
    return k1, k2

def fk(bits8: str, subkey: str) -> str:
    L, R = bits8[:4], bits8[4:]
    ep = permute(R, EP)
    xored = xor_bits(ep, subkey)
    s0_out = sbox_lookup(xored[:4], S0)
    s1_out = sbox_lookup(xored[4:], S1)
    p4_out = permute(s0_out + s1_out, P4)
    return xor_bits(L, p4_out) + R

def sdes_decrypt(cipher8: str, key10: str):
    k1, k2 = generate_subkeys(key10)
    ip_out = permute(cipher8, IP)
    fk1_out = fk(ip_out, k2)         # При розшифруванні першим подається K2
    sw_out = fk1_out[4:] + fk1_out[:4]
    fk2_out = fk(sw_out, k1)         # Другим подається K1
    plain8 = permute(fk2_out, IP_INV)
    print(f"Ключ (10 біт): {key10} -> K1 = {k1}, K2 = {k2}")
    print(f"Вхідна криптограма (Варіант ${variant}): {cipher8}")
    print(f"1. IP:      {ip_out}")
    print(f"2. f_K(K2): {fk1_out}")
    print(f"3. SW:      {sw_out}")
    print(f"4. f_K(K1): {fk2_out}")
    print(f"5. IP^-1:   {plain8} (Десяткове значення: {int(plain8, 2)})")
    return plain8

if __name__ == "__main__":
    sdes_decrypt("${sdesVariantObj.cipher}", "0011011101")`;
    }

    return '';
  }

  const CONTROL_QUESTIONS = {
    lab1: [
      {
        q: '1. Опишіть алгоритм шифрування Цезаря та шифру моноалфавітної заміни.',
        a: 'Шифр Цезаря — це окремий випадок шифру моноалфавітної підстановки, в якому кожна літера відкритого тексту з позицією i в алфавіті потужності N циклічно зсувається на фіксований ключ K позицій праворуч за формулою шифрування C = (M + K) mod N. У класичному шифрі Цезаря K = 3. При дешифруванні виконується зворотний циклічний зсув на K позицій ліворуч: M = (C - K) mod N (де N = 26 для англійського та N = 33 для українського алфавіту).'
      },
      {
        q: '2. У чому суть методу частотного криптоаналізу?',
        a: 'Частотний криптоаналіз спирається на статистичну властивість природних мов: у достатньо довгих текстах кожна літера з’являється з передбачуваною відносною частотою (наприклад, в українській мові найчастішою є літера «О» ≈ 9.4%, а в англійській — «E» ≈ 12.7%). Оскільки при моноалфавітній заміні одна й та сама літера відкритого тексту завжди переходить в одну й ту саму літеру шифротексту, криптоаналітик знаходить найчастішу літеру в криптограмі, ототожнює її з найчастішою літерою мови і обчислює ключ K як різницю їхніх позицій в алфавіті за модулем N.'
      },
      {
        q: '3. Як працює шифр стовпцевої перестановки за ключовим словом і як його відрізнити за допомогою частотного аналізу?',
        a: 'У шифрі перестановки відкритий текст записується по рядках у прямокутну матрицю під ключовим словом. Стовпці нумеруються відповідно до алфавітного порядку літер ключа, і криптограма зчитується по стовпцях у порядку зростання їхніх номерів. Оскільки самі літери не замінюються на інші, а лише змінюють свої позиції, частотний розподіл літер у криптограмі повністю збігається з природним розподілом мови — саме це сигналізує криптоаналітику, що застосовано шифр перестановки.'
      }
    ],
    lab2: [
      {
        q: '1. Що таке JWT (JSON Web Token) та які його переваги над сесійною автентифікацією?',
        a: 'JWT — це компактний, URL-безпечний та самодостатній (stateless) криптографічно підписаний JSON-токен для передачі тверджень (claims) між сторонами. Переваги: 1) Серверу не потрібно зберігати стан сесій у БД чи ОЗП; 2) Легка масштабованість та мікросервісна архітектура; 3) Підтримка Single Sign-On (SSO) через єдиний сервер авторизації; 4) Цілісність та автентичність даних гарантується цифровим підписом або MAC.'
      },
      {
        q: '2. Опишіть структуру JWT токена та що зберігається в кожній частині.',
        a: 'JWT складається з 3 частин у кодуванні Base64Url, розділених крапками (xxxxx.yyyyy.zzzzz): 1) Header (Заголовок) — містить тип токена ("typ": "JWT") та алгоритм підпису ("alg": "HS256" або "RS256"); 2) Payload (Корисне навантаження) — містить дані користувача (id, login, ролі) та службові поля (exp — час закінчення дії, iat — час видачі, sub — суб’єкт); 3) Signature (Підпис) — результат криптографічної функції підпису.'
      },
      {
        q: '3. Назвіть складові частини підпису (Signature) та як перевіряється валідність JWT.',
        a: 'Для алгоритму HS256 підпис формується з трьох складових: 1) Base64Url(Header), 2) Base64Url(Payload), з’єднаних крапкою, та 3) таємного ключа сервера (Secret) за формулою HMAC_SHA256(base64Url(header) + "." + base64Url(payload), secret). При отриманні запиту сервер бере Header і Payload з токена, повторно обчислює HMAC-SHA256 зі своїм Secret і порівнює з третьою частиною токена, а також перевіряє термін дії (exp).'
      },
      {
        q: '4. Опишіть схему автентифікації з використанням JWT та сторонніх сервісів.',
        a: '1) Клієнт проходить автентифікацію на сервері авторизації (за логіном/паролем або через OAuth-провайдер); 2) Сервер перевіряє хеш пароля (SHA-256) і генерує підписаний JWT; 3) Клієнт зберігає токен і додає його у заголовок Authorization: Bearer <token> при кожному запиті до захищених маршрутів API; 4) API-сервер перевіряє криптографічний підпис токена та надає доступ до ресурсу.'
      }
    ],
    lab4: [
      {
        q: '1. Що таке алгоритм Діффі-Хеллмана та на якій математичній задачі базується його стійкість?',
        a: 'Протокол Діффі-Хеллмана (DH) — це криптографічний протокол, який дозволяє двом сторонам (Алісі та Бобу), що не мають попередньо узгодженого секрету, створити спільний таємний ключ через незахищений публічний канал зв’язку. Його криптографічна стійкість базується на обчислювальній складності задачі дискретного логарифмування в скінченному полі Z_p*: знаючи p, g та A = g^a mod p, вкрай складно знайти приватний показник a.'
      },
      {
        q: '2. Опишіть покрокову схему обміну ключами за протоколом Діффі-Хеллмана.',
        a: '1) Учасники узгоджують відкриті параметри: велике просте число p та генератор g; 2) Аліса генерує таємне число a ∈ [1, p-1], Боб генерує таємне b ∈ [1, p-1]; 3) Аліса обчислює A = g^a mod p і надсилає Бобу; Боб обчислює B = g^b mod p і надсилає Алісі; 4) Аліса обчислює K = B^a mod p = g^(ab) mod p, а Боб обчислює K = A^b mod p = g^(ab) mod p. Обидва отримують однаковий спільний секрет K.'
      },
      {
        q: '3. Що таке атака «Людина посередині» (MITM) та які властивості інформації вона порушує?',
        a: 'MITM (Man-in-the-Middle) — це активна кібератака, при якій зловмисник таємно вбудовується в канал зв’язку між двома учасниками, перехоплює їхні відкриті ключі й підмінює їх власними. При цьому порушуються всі базові властивості безпеки інформації: 1) Автентичність (відсутня взаємна перевірка особи вузлів); 2) Конфіденційність (зловмисник розшифровує весь трафік); 3) Цілісність (зловмисник може непомітно модифікувати повідомлення перед пересиланням).'
      },
      {
        q: '4. Опишіть схему обміну ключами при атаці «Людина посередині» на протоколі Діффі-Хеллмана.',
        a: 'Аліса надсилає A₁ = g^a mod p, але зловмисник перехоплює його і надсилає Бобу власний ключ A₂ = g^(c₂) mod p. Коли Боб у відповідь надсилає B₂ = g^b mod p, зловмисник перехоплює його і надсилає Алісі B₁ = g^(c₁) mod p. У результаті встановлюються ДВА окремі спільні ключі: K₁ = g^(a·c₁) mod p між Алісою і зловмисником, та K₂ = g^(b·c₂) mod p між зловмисником і Бобом.'
      }
    ],
    lab3: [
      {
        q: '1. Яку розмірність блоку та ключа використовує алгоритм S-DES і з яких 5 основних операцій він складається?',
        a: 'Спрощений алгоритм S-DES приймає на вхід 8-бітний блок тексту та 10-бітний майстер-ключ (з якого генеруються два 8-бітні раундові підключі K₁ та K₂). Процес складається з 5 послідовних операцій: 1) Початкова перестановка IP; 2) Раундова функція f_K з першим підключем; 3) Перестановка половин блоку SW (Swap 4-бітних частин L та R); 4) Раундова функція f_K з другим підключем; 5) Кінцева обернена перестановка IP⁻¹.'
      },
      {
        q: '2. Опишіть процедуру генерування раундових підключів K₁ та K₂ у S-DES.',
        a: '1) До 10-бітного ключа застосовується перестановка P10 [3 5 2 7 4 10 1 9 8 6]; 2) Ключ ділиться на дві 5-бітні половини, і кожна окремо циклічно зсувається ліворуч на 1 біт (LS-1); 3) Застосовується перестановка стиснення P8 [6 3 7 4 8 5 10 9], що дає 8-бітний підключ K₁; 4) Обидві 5-бітні половини після LS-1 циклічно зсуваються ліворуч на 2 позиції (LS-2); 5) До результату застосовується P8, що дає другий підключ K₂.'
      },
      {
        q: '3. Як працюють модулі заміни S₀ та S₁ і чим відрізняється процес дешифрування від шифрування у S-DES?',
        a: 'Кожен модуль заміни S₀ та S₁ отримує на вхід 4 біти (b₁b₂b₃b₄): крайні біти (b₁b₄) визначають номер рядка (0..3), а середні біти (b₂b₃) — номер стовпця (0..3) у матриці 4×4. Значення на перетині переводиться у 2-бітне двійкове число. Дешифрування у S-DES виконується за тим самим алгоритмом, що й шифрування, з єдиною різницею: раундові підключі подаються у зворотному порядку — спочатку K₂ у першому раунді, а потім K₁ у другому.'
      }
    ]
  };

  return {
    getPythonCode,
    CONTROL_QUESTIONS
  };
})();
