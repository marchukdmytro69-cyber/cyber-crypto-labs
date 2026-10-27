# Лабораторна робота №4
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
    print("\n=== 2. Атака 'Людина посередині' (MITM) на протоколі Діффі-Хеллмана ===")
    A1 = pow(g, a, p)
    B1 = pow(g, c1, p)
    A2 = pow(g, c2, p)
    B2 = pow(g, b, p)

    print(f"Аліса -> [MITM]: A1 = {A1} (Перехоплено! Боб отримує підмінений A2 = {A2})")
    print(f"Боб -> [MITM]:   B2 = {B2} (Перехоплено! Аліса отримує підмінений B1 = {B1})")

    K1_alice = pow(B1, a, p)
    K1_attacker = pow(A1, c1, p)
    K2_bob = pow(A2, b, p)
    K2_attacker = pow(B2, c2, p)

    print(f"Канал Аліса <-> Зловмисник: K1 = {K1_alice} (у Зловмисника K1 = {K1_attacker})")
    print(f"Канал Зловмисник <-> Боб:   K2 = {K2_bob} (у Зловмисника K2 = {K2_attacker})")


if __name__ == "__main__":
    diffie_hellman_standard()
    diffie_hellman_mitm()
