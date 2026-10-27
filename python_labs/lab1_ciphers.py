# Лабораторна робота №1
# Тема: Шифр Цезаря. Частотний криптоаналіз. Шифр перестановки.

from collections import Counter

UA_ALPHABET = "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"
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

    print("\n=== 2. Частотний аналіз ===")
    cipher_sample = (
        "ДАФИНЦШЕИЮЯЗЩШФЬИТЧИВЮЯШХСЯЯЗВИЇШЧШЮФЬСПЄСПИЇОЛРПЧИЦРЗФЬРІИЇЇШЛСЯИ"
        "ФСЦРЇЧЄШЦАСЇШЧШІСХЗЧИЮДАФИНЧИЮЮИЦРВЧМЦИУШЙШЧСЛМЇСЛЯШЙШЕШЇШЧШЮФЬСПЄ"
    )
    k, ch, cnt, dec = frequency_attack_ua(cipher_sample)
    print(f"Найчастіша літера: '{ch}' ({cnt} разів) -> Знайдений ключ K={k}\nРозшифровано: {dec}")

    print("\n=== 3. Шифр перестановки ===")
    pt, key_w = "Прикладна математика", "Шифр"
    ct = columnar_transposition_encrypt(pt, key_w)
    print(f"Ключ: {key_w} | Криптограма: '{ct}' | Дешифровано: '{columnar_transposition_decrypt(ct, key_w)}'")
