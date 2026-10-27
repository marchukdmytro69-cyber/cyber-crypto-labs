# Лабораторна робота №3
# Тема: Система блочного шифрування S-DES (Усі 25 варіантів)

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

VARIANTS = {
    1: "11101101",  2: "10010110",  3: "10110101",  4: "01011000",  5: "01001000",
    6: "11010011",  7: "00110100",  8: "00110110",  9: "10100110", 10: "11111000",
    11: "00011010", 12: "01110011", 13: "11100011", 14: "01111101", 15: "01011011",
    16: "01010110", 17: "00101011", 18: "10010011", 19: "10011100", 20: "00010011",
    21: "01001110", 22: "11010110", 23: "00011001", 24: "11010000", 25: "00100001",
}


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


def sdes_decrypt(cipher8: str, key10: str = "0011011101", verbose: bool = True):
    k1, k2 = generate_subkeys(key10)
    ip_out = permute(cipher8, IP)
    fk1_out = fk(ip_out, k2)
    sw_out = fk1_out[4:] + fk1_out[:4]
    fk2_out = fk(sw_out, k1)
    plain8 = permute(fk2_out, IP_INV)
    dec_val = int(plain8, 2)
    if verbose:
        print(f"Криптограма: {cipher8} | IP={ip_out} -> fK(K2)={fk1_out} -> SW={sw_out} -> fK(K1)={fk2_out} -> IP^-1={plain8} ({dec_val})")
    return plain8, dec_val


if __name__ == "__main__":
    k1, k2 = generate_subkeys("0011011101")
    print(f"Ключ: 0011011101 -> K1 = {k1}, K2 = {k2}\n")
    for var_num, cipher_bits in VARIANTS.items():
        print(f"Варіант {var_num:2d}: ", end="")
        sdes_decrypt(cipher_bits, "0011011101")
