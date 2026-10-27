/**
 * AEGIS // CRYPTO-OPS TACTICAL TERMINAL
 * Core Cryptographic Engines & Step-by-Step Trace Generators
 * Covers:
 *  - Lab 1: Caesar Cipher (UA/EN), Frequency Cryptanalysis, Columnar Transposition Cipher
 *  - Lab 2: SHA-256 Hashing, Auth DB, JWT (HS256) Generation, Inspection & Verification
 *  - Lab 4: Diffie-Hellman Protocol & Man-in-the-Middle (MITM) Active Interception
 *  - Lab 5: S-DES (Simplified DES) Key Schedule, Encryption, Decryption & 25 Variants
 */

window.CryptoEngines = (() => {
  // ============================================================================
  // LAB 1: CAESAR CIPHER, FREQUENCY ANALYSIS & TRANSPOSITION CIPHER
  // ============================================================================

  // Table 1.1: English Alphabet (26 letters, indices 0..25)
  const EN_ALPHABET = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M',
    'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
  ];

  // Table 1.2: Ukrainian Alphabet (33 letters, indices 0..32)
  const UA_ALPHABET = [
    'А','Б','В','Г','Ґ','Д','Е','Є','Ж','З','И','І','Ї','Й','К','Л','М',
    'Н','О','П','Р','С','Т','У','Ф','Х','Ц','Ч','Ш','Щ','Ь','Ю','Я'
  ];

  // Table 1.3: Standard letter frequencies from the Lab 1 manual
  const UA_FREQUENCIES = {
    'А': 0.072, 'Б': 0.017, 'В': 0.052, 'Г': 0.016, 'Ґ': 0.001, 'Д': 0.035,
    'Е': 0.017, 'Є': 0.008, 'Ж': 0.009, 'З': 0.023, 'И': 0.061, 'І': 0.057,
    'Ї': 0.006, 'Й': 0.008, 'К': 0.035, 'Л': 0.036, 'М': 0.031, 'Н': 0.065,
    'О': 0.094, 'П': 0.029, 'Р': 0.047, 'С': 0.041, 'Т': 0.055, 'У': 0.040,
    'Ф': 0.001, 'Х': 0.012, 'Ц': 0.006, 'Ч': 0.018, 'Ш': 0.012, 'Щ': 0.001,
    'Ь': 0.029, 'Ю': 0.004, 'Я': 0.029
  };

  const EN_FREQUENCIES = {
    'A': 0.082, 'B': 0.015, 'C': 0.028, 'D': 0.043, 'E': 0.127, 'F': 0.022,
    'G': 0.020, 'H': 0.061, 'I': 0.070, 'J': 0.002, 'K': 0.008, 'L': 0.040,
    'M': 0.024, 'N': 0.067, 'O': 0.075, 'P': 0.019, 'Q': 0.001, 'R': 0.060,
    'S': 0.063, 'T': 0.091, 'U': 0.028, 'V': 0.010, 'W': 0.023, 'X': 0.001,
    'Y': 0.020, 'Z': 0.001
  };

  function detectAlphabet(text, preferred = 'auto') {
    if (preferred === 'ua') return { lang: 'ua', alphabet: UA_ALPHABET, freq: UA_FREQUENCIES, topLetter: 'О' };
    if (preferred === 'en') return { lang: 'en', alphabet: EN_ALPHABET, freq: EN_FREQUENCIES, topLetter: 'E' };
    const upper = (text || '').toUpperCase();
    let uaCount = 0;
    let enCount = 0;
    for (const ch of upper) {
      if (UA_ALPHABET.includes(ch)) uaCount++;
      if (EN_ALPHABET.includes(ch)) enCount++;
    }
    if (enCount > uaCount) {
      return { lang: 'en', alphabet: EN_ALPHABET, freq: EN_FREQUENCIES, topLetter: 'E' };
    }
    return { lang: 'ua', alphabet: UA_ALPHABET, freq: UA_FREQUENCIES, topLetter: 'О' };
  }

  /**
   * Caesar Cipher Step-by-Step Execution
   */
  function runCaesar(text, key, mode = 'encrypt', langPref = 'auto') {
    const { lang, alphabet } = detectAlphabet(text, langPref);
    const N = alphabet.length;
    const k = (( parseInt(key, 10) || 0 ) % N + N) % N;
    const shift = mode === 'encrypt' ? k : (N - k) % N;
    const signStr = mode === 'encrypt' ? '+' : '-';

    let result = '';
    const steps = [];

    for (let i = 0; i < text.length; i++) {
      const origChar = text[i];
      const upperChar = origChar.toUpperCase();
      const isLower = origChar !== upperChar;
      const idx = alphabet.indexOf(upperChar);

      if (idx === -1) {
        result += origChar;
        steps.push({
          stepIndex: i + 1,
          charIndex: i,
          origChar,
          isLetter: false,
          newChar: origChar,
          resultSoFar: result,
          formula: `Символ '${origChar}' поза алфавітом → без змін`
        });
      } else {
        const newIdx = (idx + shift) % N;
        const mappedUpper = alphabet[newIdx];
        const newChar = isLower ? mappedUpper.toLowerCase() : mappedUpper;
        result += newChar;

        const rawCalc = mode === 'encrypt' ? idx + k : idx - k;
        steps.push({
          stepIndex: i + 1,
          charIndex: i,
          origChar,
          upperChar,
          isLetter: true,
          origIdx: idx,
          key: k,
          newIdx,
          newChar,
          mappedUpper,
          alphabetSize: N,
          resultSoFar: result,
          formula: `(${idx} ${signStr} ${k}) mod ${N} = (${rawCalc}) mod ${N} = ${newIdx} → '${newChar}'`
        });
      }
    }

    return {
      input: text,
      output: result,
      key: k,
      mode,
      lang,
      alphabet,
      steps
    };
  }

  /**
   * Frequency Analysis & Automatic Cryptanalysis of Caesar Cipher
   */
  function runFrequencyAnalysis(cipherText, langPref = 'auto') {
    const { lang, alphabet, freq, topLetter } = detectAlphabet(cipherText, langPref);
    const N = alphabet.length;
    const counts = {};
    alphabet.forEach(ch => { counts[ch] = 0; });

    let totalLetters = 0;
    const upper = (cipherText || '').toUpperCase();
    for (const ch of upper) {
      if (counts[ch] !== undefined) {
        counts[ch]++;
        totalLetters++;
      }
    }

    const letterStats = alphabet.map((ch, idx) => {
      const count = counts[ch];
      const relFreq = totalLetters > 0 ? count / totalLetters : 0;
      const stdFreq = freq[ch] || 0;
      return {
        char: ch,
        index: idx,
        count,
        relFreq,
        stdFreq
      };
    });

    const sortedByCount = [...letterStats].sort((a, b) => b.count - a.count);
    const mostFrequentCipher = sortedByCount[0] || { char: alphabet[0], index: 0, count: 0 };
    const topLangIdx = alphabet.indexOf(topLetter);

    // Classic manual method: K = (idx(mostFrequentCipher) - idx(topLanguageLetter)) mod N
    const primaryKey = ((mostFrequentCipher.index - topLangIdx) % N + N) % N;

    // Also rank all possible keys K in 0..N-1 by Chi-Squared / Dot-Product correlation
    const candidates = [];
    for (let candidateK = 0; candidateK < N; candidateK++) {
      let score = 0;
      for (let i = 0; i < N; i++) {
        const cipherIdx = (i + candidateK) % N;
        const observed = letterStats[cipherIdx].relFreq;
        const expected = letterStats[i].stdFreq;
        score += observed * expected;
      }
      const preview = runCaesar(cipherText, candidateK, 'decrypt', lang).output;
      candidates.push({
        key: candidateK,
        score,
        preview: preview.slice(0, 90) + (preview.length > 90 ? '…' : ''),
        fullDecrypted: preview,
        isPrimaryMatch: candidateK === primaryKey
      });
    }

    candidates.sort((a, b) => {
      if (a.isPrimaryMatch && totalLetters > 20) return -1;
      if (b.isPrimaryMatch && totalLetters > 20) return 1;
      return b.score - a.score;
    });

    return {
      lang,
      alphabet,
      totalLetters,
      letterStats,
      sortedByCount,
      mostFrequentCipher,
      topLanguageLetter: { char: topLetter, index: topLangIdx, stdFreq: freq[topLetter] },
      primaryKey,
      formulaExplanation: `Найчастіша літера шифротексту: «${mostFrequentCipher.char}» (${mostFrequentCipher.count} разів, позиція ${mostFrequentCipher.index}). Найчастіша літера мови: «${topLetter}» (позиція ${topLangIdx}). Ключ K = (${mostFrequentCipher.index} - ${topLangIdx}) mod ${N} = ${primaryKey}.`,
      primaryDecrypted: runCaesar(cipherText, primaryKey, 'decrypt', lang).output,
      candidates: candidates.slice(0, 6)
    };
  }

  /**
   * Columnar Transposition Cipher (Шифр перестановки за ключовим словом)
   */
  function runTransposition(text, keyWord, mode = 'encrypt') {
    const cleanKey = (keyWord || 'ШИФР').trim();
    const { alphabet } = detectAlphabet(cleanKey, 'auto');
    const cols = cleanKey.length;
    if (cols === 0) return null;

    // Determine alphabetical ranks (1..cols) for key letters
    const keyChars = cleanKey.split('').map((ch, idx) => {
      const u = ch.toUpperCase();
      const alphaIdx = alphabet.indexOf(u);
      return {
        char: ch,
        upper: u,
        colIndex: idx,
        alphaPos: alphaIdx !== -1 ? alphaIdx : u.charCodeAt(0)
      };
    });

    const sortedKey = [...keyChars].sort((a, b) => {
      if (a.alphaPos !== b.alphaPos) return a.alphaPos - b.alphaPos;
      return a.colIndex - b.colIndex;
    });

    const ranks = new Array(cols);
    const readOrderCols = []; // colIndex in order of rank 1..cols
    sortedKey.forEach((item, rankIdx) => {
      ranks[item.colIndex] = rankIdx + 1;
      readOrderCols.push(item.colIndex);
    });

    const rows = Math.max(1, Math.ceil(text.length / cols));
    const totalCells = rows * cols;
    const paddedText = text.padEnd(totalCells, ' ');

    // Build 2D matrix [rows][cols]
    const matrix = Array.from({ length: rows }, () => new Array(cols).fill(' '));
    const steps = [];

    if (mode === 'encrypt') {
      // Step phase 1: Fill matrix row by row
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pos = r * cols + c;
          matrix[r][c] = paddedText[pos];
        }
      }

      // Step phase 2: Read column by column according to rank 1..cols
      let output = '';
      readOrderCols.forEach((colIdx, orderStep) => {
        let colString = '';
        const cellsVisited = [];
        for (let r = 0; r < rows; r++) {
          colString += matrix[r][colIdx];
          cellsVisited.push({ r, c: colIdx, char: matrix[r][colIdx] });
        }
        output += colString;
        steps.push({
          stepNumber: orderStep + 1,
          rank: orderStep + 1,
          colIndex: colIdx,
          keyChar: cleanKey[colIdx],
          colString,
          cellsVisited,
          outputSoFar: output,
          description: `Крок ${orderStep + 1}: Стовпець №${colIdx + 1} (літера ключа «${cleanKey[colIdx]}», ранг ${orderStep + 1}) → зчитуємо згори донизу: "${colString.replace(/ /g, '␣')}"`
        });
      });

      return {
        mode,
        input: text,
        output,
        keyWord: cleanKey,
        cols,
        rows,
        ranks,
        keyChars,
        readOrderCols,
        matrix,
        steps
      };
    } else {
      // Decrypt mode: Fill matrix column by column in order of rank 1..cols
      let cursor = 0;
      readOrderCols.forEach((colIdx, orderStep) => {
        let colString = '';
        const cellsVisited = [];
        for (let r = 0; r < rows; r++) {
          const ch = paddedText[cursor] !== undefined ? paddedText[cursor] : ' ';
          matrix[r][colIdx] = ch;
          colString += ch;
          cellsVisited.push({ r, c: colIdx, char: ch });
          cursor++;
        }
        steps.push({
          stepNumber: orderStep + 1,
          rank: orderStep + 1,
          colIndex: colIdx,
          keyChar: cleanKey[colIdx],
          colString,
          cellsVisited,
          outputSoFar: `Заповнено стовпець рангу ${orderStep + 1} («${cleanKey[colIdx]}»)`,
          description: `Крок ${orderStep + 1}: Записуємо "${colString.replace(/ /g, '␣')}" у стовпець №${colIdx + 1} (літера ключа «${cleanKey[colIdx]}», ранг ${orderStep + 1})`
        });
      });

      // Read row by row
      let output = '';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          output += matrix[r][c];
        }
      }

      return {
        mode,
        input: text,
        output: output.trimEnd(),
        rawOutput: output,
        keyWord: cleanKey,
        cols,
        rows,
        ranks,
        keyChars,
        readOrderCols,
        matrix,
        steps
      };
    }
  }

  // ============================================================================
  // LAB 2: SHA-256, USER DATABASE, /LOGIN & JWT (HS256) ENGINE
  // ============================================================================

  // Pure synchronous SHA-256 implementation so every step & UI calculation is instant & deterministic
  const K_SHA256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  function utf8ToBytes(str) {
    return Array.from(new TextEncoder().encode(str));
  }

  function sha256Bytes(msgBytes) {
    const bytes = [...msgBytes];
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) {
      bytes.push(0x00);
    }
    // Append 64-bit length big-endian
    const hi = Math.floor(bitLen / 0x100000000);
    const lo = bitLen >>> 0;
    bytes.push((hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff);
    bytes.push((lo >>> 24) & 0xff, (lo >>> 16) & 0xff, (lo >>> 8) & 0xff, lo & 0xff);

    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
    let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    const w = new Array(64);
    for (let i = 0; i < bytes.length; i += 64) {
      for (let j = 0; j < 16; j++) {
        const idx = i + j * 4;
        w[j] = ((bytes[idx] << 24) | (bytes[idx + 1] << 16) | (bytes[idx + 2] << 8) | bytes[idx + 3]) >>> 0;
      }
      for (let j = 16; j < 64; j++) {
        const s0 = (rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3)) >>> 0;
        const s1 = (rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10)) >>> 0;
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
      }

      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let j = 0; j < 64; j++) {
        const S1 = (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) >>> 0;
        const ch = ((e & f) ^ ((~e) & g)) >>> 0;
        const temp1 = (h + S1 + ch + K_SHA256[j] + w[j]) >>> 0;
        const S0 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) >>> 0;
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const temp2 = (S0 + maj) >>> 0;

        h = g;
        g = f;
        f = e;
        e = (d + temp1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (temp1 + temp2) >>> 0;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
      h5 = (h5 + f) >>> 0;
      h6 = (h6 + g) >>> 0;
      h7 = (h7 + h) >>> 0;
    }

    const out = [];
    [h0, h1, h2, h3, h4, h5, h6, h7].forEach(word => {
      out.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
    });
    return out;
  }

  function sha256Hex(str) {
    const bytes = sha256Bytes(utf8ToBytes(str));
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function hmacSha256Bytes(messageStr, secretStr) {
    const blockSize = 64;
    let keyBytes = utf8ToBytes(secretStr);
    if (keyBytes.length > blockSize) {
      keyBytes = sha256Bytes(keyBytes);
    }
    while (keyBytes.length < blockSize) {
      keyBytes.push(0x00);
    }
    const oKeyPad = keyBytes.map(b => b ^ 0x5c);
    const iKeyPad = keyBytes.map(b => b ^ 0x36);
    const innerHash = sha256Bytes([...iKeyPad, ...utf8ToBytes(messageStr)]);
    return sha256Bytes([...oKeyPad, ...innerHash]);
  }

  function bytesToBase64Url(bytes) {
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function strToBase64Url(str) {
    return bytesToBase64Url(utf8ToBytes(str));
  }

  function base64UrlToStr(b64url) {
    try {
      let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return null;
    }
  }

  function generateJwtHS256(payloadObj, secret) {
    const headerObj = { alg: 'HS256', typ: 'JWT' };
    const headerJson = JSON.stringify(headerObj);
    const payloadJson = JSON.stringify(payloadObj);

    const headerB64 = strToBase64Url(headerJson);
    const payloadB64 = strToBase64Url(payloadJson);
    const signingInput = `${headerB64}.${payloadB64}`;
    const sigBytes = hmacSha256Bytes(signingInput, secret);
    const signatureB64 = bytesToBase64Url(sigBytes);
    const sigHex = sigBytes.map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      token: `${headerB64}.${payloadB64}.${signatureB64}`,
      headerObj,
      payloadObj,
      headerJson,
      payloadJson,
      headerB64,
      payloadB64,
      signatureB64,
      sigHex,
      secret
    };
  }

  function verifyJwtHS256(tokenStr, secret) {
    const parts = (tokenStr || '').trim().split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Невірний формат JWT (має бути 3 частини, розділені крапками: Header.Payload.Signature)' };
    }
    const [headerB64, payloadB64, sigProvided] = parts;
    const headerStr = base64UrlToStr(headerB64);
    const payloadStr = base64UrlToStr(payloadB64);

    if (!headerStr || !payloadStr) {
      return { valid: false, reason: 'Помилка декодування Base64Url у заголовку або корисному навантаженні' };
    }

    let headerObj, payloadObj;
    try {
      headerObj = JSON.parse(headerStr);
      payloadObj = JSON.parse(payloadStr);
    } catch (e) {
      return { valid: false, reason: 'Невалідний JSON всередині Header або Payload' };
    }

    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSigBytes = hmacSha256Bytes(signingInput, secret);
    const expectedSigB64 = bytesToBase64Url(expectedSigBytes);

    const signatureMatch = sigProvided === expectedSigB64;
    const nowSec = Math.floor(Date.now() / 1000);
    const isExpired = payloadObj.exp !== undefined && nowSec > payloadObj.exp;

    return {
      valid: signatureMatch && !isExpired,
      signatureMatch,
      isExpired,
      headerObj,
      payloadObj,
      headerB64,
      payloadB64,
      sigProvided,
      expectedSigB64,
      nowSec,
      remainingSec: payloadObj.exp ? payloadObj.exp - nowSec : null,
      reason: !signatureMatch
        ? 'Підпис НЕдійсний! Дані токена було підроблено або використано невірний Secret.'
        : isExpired
        ? `Час дії токена минув (exp: ${payloadObj.exp}, поточний час: ${nowSec}).`
        : 'Токен автентичний та дійсний! Підпис HMAC-SHA256 співпадає.'
    };
  }

  // ============================================================================
  // LAB 4: DIFFIE-HELLMAN PROTOCOL & MAN-IN-THE-MIDDLE (MITM) ATTACK
  // ============================================================================

  /**
   * Modular exponentiation (base^exp mod mod) using BigInt with step-by-step binary trace
   */
  function modPowTrace(base, exp, mod) {
    const b = BigInt(base);
    const e = BigInt(exp);
    const m = BigInt(mod);
    if (m === 1n) return { result: 0n, binarySteps: [] };

    const binStr = e.toString(2);
    let result = 1n;
    let currentPower = b % m;
    const binarySteps = [];

    let tempE = e;
    let bitPos = 0;
    while (tempE > 0n) {
      const bit = Number(tempE & 1n);
      const prevResult = result;
      if (bit === 1) {
        result = (result * currentPower) % m;
      }
      binarySteps.push({
        bitPos,
        bit,
        powerVal: currentPower.toString(),
        prevResult: prevResult.toString(),
        newResult: result.toString()
      });
      currentPower = (currentPower * currentPower) % m;
      tempE >>= 1n;
      bitPos++;
    }

    return {
      result: Number(result),
      resultBig: result,
      binStr,
      binarySteps
    };
  }

  function isPrime(n) {
    const num = Number(n);
    if (num < 2) return false;
    if (num === 2 || num === 3) return true;
    if (num % 2 === 0) return false;
    for (let i = 3; i * i <= num; i += 2) {
      if (num % i === 0) return false;
    }
    return true;
  }

  function runDiffieHellmanStandard(p, g, a, b) {
    const calcA = modPowTrace(g, a, p);
    const calcB = modPowTrace(g, b, p);
    const A = calcA.result;
    const B = calcB.result;

    const calcKa = modPowTrace(B, a, p);
    const calcKb = modPowTrace(A, b, p);
    const Ka = calcKa.result;
    const Kb = calcKb.result;

    const steps = [
      {
        step: 1,
        title: 'Ініціалізація публічних параметрів (Trust Party)',
        actor: 'Public Channel',
        formula: `p = ${p} (просте число), g = ${g} (генератор групи Z_p*)`,
        aliceKnows: `p=${p}, g=${g}`,
        bobKnows: `p=${p}, g=${g}`,
        eveKnows: `p=${p}, g=${g}`,
        packet: { from: 'System', to: 'All', label: `p=${p}, g=${g}` }
      },
      {
        step: 2,
        title: 'Генерація приватних (таємних) ключів a та b',
        actor: 'Alice & Bob',
        formula: `Аліса обирає a = ${a} ∈ [1, ${p - 1}]; Боб обирає b = ${b} ∈ [1, ${p - 1}]`,
        aliceKnows: `p=${p}, g=${g}, a=${a}`,
        bobKnows: `p=${p}, g=${g}, b=${b}`,
        eveKnows: `p=${p}, g=${g}`,
        packet: null
      },
      {
        step: 3,
        title: 'Обчислення та передача відкритого ключа Аліси (A → Bob)',
        actor: 'Alice → Bob',
        formula: `A = g^a mod p = ${g}^${a} mod ${p} = ${A}`,
        aliceKnows: `p=${p}, g=${g}, a=${a}, A=${A}`,
        bobKnows: `p=${p}, g=${g}, b=${b}, A=${A}`,
        eveKnows: `p=${p}, g=${g}, A=${A}`,
        packet: { from: 'Alice', to: 'Bob', label: `A = ${A}` }
      },
      {
        step: 4,
        title: 'Обчислення та передача відкритого ключа Боба (B → Alice)',
        actor: 'Bob → Alice',
        formula: `B = g^b mod p = ${g}^${b} mod ${p} = ${B}`,
        aliceKnows: `p=${p}, g=${g}, a=${a}, A=${A}, B=${B}`,
        bobKnows: `p=${p}, g=${g}, b=${b}, A=${A}, B=${B}`,
        eveKnows: `p=${p}, g=${g}, A=${A}, B=${B}`,
        packet: { from: 'Bob', to: 'Alice', label: `B = ${B}` }
      },
      {
        step: 5,
        title: 'Обчислення спільного секретного ключа K = g^(ab) mod p',
        actor: 'Alice & Bob',
        formula: `Аліса: K = B^a mod p = ${B}^${a} mod ${p} = ${Ka} | Боб: K = A^b mod p = ${A}^${b} mod ${p} = ${Kb}`,
        aliceKnows: `p=${p}, g=${g}, a=${a}, A=${A}, B=${B}, K=${Ka}`,
        bobKnows: `p=${p}, g=${g}, b=${b}, A=${A}, B=${B}, K=${Kb}`,
        eveKnows: `p=${p}, g=${g}, A=${A}, B=${B} (K=${Ka} НЕВІДОМИЙ — задача дискретного логарифмування)`,
        packet: { from: 'Verified', to: 'Both', label: `Спільний секрет K = ${Ka}` }
      }
    ];

    return {
      p, g, a, b,
      A, B, Ka, Kb,
      calcA, calcB, calcKa, calcKb,
      isPrimeP: isPrime(p),
      keysMatch: Ka === Kb,
      steps
    };
  }

  function runDiffieHellmanMITM(p, g, a, b, c1, c2, sampleMsg = 'СЕКРЕТНИЙ НАКАЗ 404', tamperedMsg = 'ПІДРОБЛЕНИЙ НАКАЗ 999') {
    // Alice computes A1 = g^a mod p
    const A1 = modPowTrace(g, a, p).result;
    // Attacker computes A2 = g^c2 mod p (sent to Bob) and B1 = g^c1 mod p (sent to Alice)
    const B1 = modPowTrace(g, c1, p).result;
    const A2 = modPowTrace(g, c2, p).result;
    // Bob computes B2 = g^b mod p
    const B2 = modPowTrace(g, b, p).result;

    // Shared key K1 between Alice and Attacker:
    // Alice: B1^a mod p, Attacker: A1^c1 mod p
    const K1_Alice = modPowTrace(B1, a, p).result;
    const K1_Attacker = modPowTrace(A1, c1, p).result;

    // Shared key K2 between Attacker and Bob:
    // Bob: A2^b mod p, Attacker: B2^c2 mod p
    const K2_Bob = modPowTrace(A2, b, p).result;
    const K2_Attacker = modPowTrace(B2, c2, p).result;

    // Stream XOR / modular cipher demo with K1 and K2
    const encryptWithKey = (txt, k) =>
      Array.from(txt).map(ch => ((ch.charCodeAt(0) + k) & 0xffff).toString(16).padStart(4, '0')).join(' ');

    const cipherFromAlice = encryptWithKey(sampleMsg, K1_Alice);
    const cipherToBob = encryptWithKey(tamperedMsg, K2_Attacker);

    const steps = [
      {
        step: 1,
        title: 'Ініціалізація та генерація секретних ключів (Alice, Attacker, Bob)',
        actor: 'All Nodes',
        formula: `p=${p}, g=${g} | Аліса: a=${a} | Зловмисник: c₁=${c1}, c₂=${c2} | Боб: b=${b}`,
        aliceKnows: `p=${p}, g=${g}, a=${a}`,
        attackerKnows: `p=${p}, g=${g}, c₁=${c1}, c₂=${c2}`,
        bobKnows: `p=${p}, g=${g}, b=${b}`,
        packet: { from: 'System', to: 'All', label: `p=${p}, g=${g}` }
      },
      {
        step: 2,
        title: 'Перехоплення ключа Аліси: Аліса надсилає A₁ → Зловмисник перехоплює!',
        actor: 'Alice → Attacker',
        formula: `A₁ = g^a mod p = ${g}^${a} mod ${p} = ${A1} (Боб НЕ отримує A₁!)`,
        aliceKnows: `a=${a}, A₁=${A1}`,
        attackerKnows: `c₁=${c1}, c₂=${c2}, Перехоплено A₁=${A1}`,
        bobKnows: `b=${b} (очікує ключ від Аліси)`,
        packet: { from: 'Alice', to: 'Attacker', label: `A₁ = ${A1} [ПЕРЕХОПЛЕНО]` }
      },
      {
        step: 3,
        title: 'Підміна ключа для Боба: Зловмисник надсилає A₂ → Бобу (від імені Аліси)',
        actor: 'Attacker → Bob',
        formula: `A₂ = g^c₂ mod p = ${g}^${c2} mod ${p} = ${A2}`,
        aliceKnows: `a=${a}, A₁=${A1}`,
        attackerKnows: `A₁=${A1}, Відправлено A₂=${A2}`,
        bobKnows: `b=${b}, A₂=${A2} (вважає, що це від Аліси!)`,
        packet: { from: 'Attacker', to: 'Bob', label: `A₂ = ${A2} [ПІДМІНА]` }
      },
      {
        step: 4,
        title: 'Перехоплення ключа Боба: Боб надсилає B₂ → Зловмисник перехоплює!',
        actor: 'Bob → Attacker',
        formula: `B₂ = g^b mod p = ${g}^${b} mod ${p} = ${B2} (Аліса НЕ отримує B₂!)`,
        aliceKnows: `a=${a}, A₁=${A1} (очікує ключ від Боба)`,
        attackerKnows: `A₁=${A1}, A₂=${A2}, Перехоплено B₂=${B2}`,
        bobKnows: `b=${b}, A₂=${A2}, B₂=${B2}`,
        packet: { from: 'Bob', to: 'Attacker', label: `B₂ = ${B2} [ПЕРЕХОПЛЕНО]` }
      },
      {
        step: 5,
        title: 'Підміна ключа для Аліси: Зловмисник надсилає B₁ → Алісі (від імені Боба)',
        actor: 'Attacker → Alice',
        formula: `B₁ = g^c₁ mod p = ${g}^${c1} mod ${p} = ${B1}`,
        aliceKnows: `a=${a}, A₁=${A1}, B₁=${B1} (вважає, що це від Боба!)`,
        attackerKnows: `A₁=${A1}, B₁=${B1}, A₂=${A2}, B₂=${B2}`,
        bobKnows: `b=${b}, A₂=${A2}, B₂=${B2}`,
        packet: { from: 'Attacker', to: 'Alice', label: `B₁ = ${B1} [ПІДМІНА]` }
      },
      {
        step: 6,
        title: 'Встановлення двох незалежних сесійних ключів K₁ та K₂',
        actor: 'Compromised Channel',
        formula: `K₁ (Аліса↔Атакер) = ${B1}^${a} mod ${p} = ${A1}^${c1} mod ${p} = ${K1_Alice} | K₂ (Атакер↔Боб) = ${A2}^${b} mod ${p} = ${B2}^${c2} mod ${p} = ${K2_Bob}`,
        aliceKnows: `Ключ сесії K₁ = ${K1_Alice}`,
        attackerKnows: `Володіє ОБОМА ключами: K₁ = ${K1_Attacker} та K₂ = ${K2_Attacker}!`,
        bobKnows: `Ключ сесії K₂ = ${K2_Bob}`,
        packet: { from: 'Attacker', to: 'Both', label: `K₁=${K1_Alice} ≠ K₂=${K2_Bob}` }
      },
      {
        step: 7,
        title: 'Активна ретрансляція та модифікація зашифрованого повідомлення',
        actor: 'MITM Packet Tampering',
        formula: `Аліса шифрує ключем K₁=${K1_Alice}: "${sampleMsg}" → Атакер розшифровує, підмінює на "${tamperedMsg}" і шифрує ключем K₂=${K2_Bob} для Боба!`,
        aliceKnows: `Надіслала: "${sampleMsg}" (K₁=${K1_Alice})`,
        attackerKnows: `Читає "${sampleMsg}" → Підмінює на "${tamperedMsg}"`,
        bobKnows: `Отримав і розшифрував (K₂=${K2_Bob}): "${tamperedMsg}"`,
        packet: { from: 'Alice', to: 'Bob', label: `MITM Tampered Payload` }
      }
    ];

    return {
      p, g, a, b, c1, c2,
      A1, B1, A2, B2,
      K1: K1_Alice,
      K2: K2_Bob,
      K1_Alice, K1_Attacker,
      K2_Bob, K2_Attacker,
      sampleMsg,
      tamperedMsg,
      cipherFromAlice,
      cipherToBob,
      steps
    };
  }

  // ============================================================================
  // LAB 5: S-DES (SIMPLIFIED DES) FULL BIT-LEVEL ENGINE & 25 VARIANTS
  // ============================================================================

  const SDES_TABLES = {
    P10: [3, 5, 2, 7, 4, 10, 1, 9, 8, 6],
    P8:  [6, 3, 7, 4, 8, 5, 10, 9],
    IP:  [2, 6, 3, 1, 4, 8, 5, 7],
    IP_INV: [4, 1, 3, 5, 7, 2, 8, 6],
    EP:  [4, 1, 2, 3, 2, 3, 4, 1],
    P4:  [2, 4, 3, 1],
    S0: [
      [1, 0, 3, 2],
      [3, 2, 1, 0],
      [0, 2, 1, 3],
      [3, 1, 3, 1]
    ],
    // In PDF page 4, row 0 of S1 is [1, 1, 2, 3]; in classic Stallings it is [0, 1, 2, 3]
    S1_MANUAL: [
      [1, 1, 2, 3],
      [2, 0, 1, 3],
      [3, 0, 1, 0],
      [2, 1, 0, 3]
    ],
    S1_CLASSIC: [
      [0, 1, 2, 3],
      [2, 0, 1, 3],
      [3, 0, 1, 0],
      [2, 1, 0, 3]
    ]
  };

  // Full Group Roster (25 Students)
  const GROUP_STUDENTS = [
    { id: 1,  lastName: 'Антошків',    firstName: 'Роман',      patronymic: '',               firstNameEn: 'Roman',     lastNameEn: 'Antoshkiv' },
    { id: 2,  lastName: 'Бойко',       firstName: 'Божена',     patronymic: 'Ярославівна',    firstNameEn: 'Bozhena',   lastNameEn: 'Boiko' },
    { id: 3,  lastName: 'Бондарчук',   firstName: 'Ілья',       patronymic: 'Андрійович',     firstNameEn: 'Ilia',      lastNameEn: 'Bondarchuk' },
    { id: 4,  lastName: 'Возьний',     firstName: 'Михайло',    patronymic: 'Степанович',     firstNameEn: 'Mykhailo',  lastNameEn: 'Voznyi' },
    { id: 5,  lastName: 'Гарасим',     firstName: 'Вадим',      patronymic: 'Віталійович',    firstNameEn: 'Vadym',     lastNameEn: 'Harasym' },
    { id: 6,  lastName: 'Гонтарь',     firstName: 'Маркіян',    patronymic: 'Юрійович',       firstNameEn: 'Markiian',  lastNameEn: 'Hontar' },
    { id: 7,  lastName: 'Козак',       firstName: 'Олег-Денис', patronymic: 'Тарасович',      firstNameEn: 'OlehDenys', lastNameEn: 'Kozak' },
    { id: 8,  lastName: 'Козяк',       firstName: 'Дмитро',     patronymic: 'Андрійович',     firstNameEn: 'Dmytro',    lastNameEn: 'Koziak' },
    { id: 9,  lastName: 'Костенко',    firstName: 'Віктор',     patronymic: 'Володимирович',  firstNameEn: 'Viktor',    lastNameEn: 'Kostenko' },
    { id: 10, lastName: 'Ленартович',  firstName: 'Максим',     patronymic: 'Олександрович',  firstNameEn: 'Maksym',    lastNameEn: 'Lenartovych' },
    { id: 11, lastName: 'Максим',      firstName: 'Марія',      patronymic: 'Романівна',      firstNameEn: 'Mariia',    lastNameEn: 'Maksym' },
    { id: 12, lastName: 'Марчук',      firstName: 'Дмитро',     patronymic: 'Андрійович',     firstNameEn: 'Dmytro',    lastNameEn: 'Marchuk' },
    { id: 13, lastName: 'Новак',       firstName: 'Давід',      patronymic: '',               firstNameEn: 'David',     lastNameEn: 'Novak' },
    { id: 14, lastName: 'Паздерська',  firstName: 'Марія',      patronymic: 'Романівна',      firstNameEn: 'Mariia',    lastNameEn: 'Pazderska' },
    { id: 15, lastName: 'Павловський', firstName: 'Максим',     patronymic: 'Романович',      firstNameEn: 'Maksym',    lastNameEn: 'Pavlovskyi' },
    { id: 16, lastName: 'Петрович',    firstName: 'Андрій',     patronymic: '',               firstNameEn: 'Andrii',    lastNameEn: 'Petrovych' },
    { id: 17, lastName: 'Пращарук',    firstName: 'Руслан',     patronymic: 'Сергійович',     firstNameEn: 'Ruslan',    lastNameEn: 'Prashcharuk' },
    { id: 18, lastName: 'Прокіпець',   firstName: 'Богдан',     patronymic: 'Олександрович',  firstNameEn: 'Bohdan',    lastNameEn: 'Prokipets' },
    { id: 19, lastName: 'Романенко',   firstName: 'Михайло',    patronymic: 'Андрійович',     firstNameEn: 'Mykhailo',  lastNameEn: 'Romanenko' },
    { id: 20, lastName: 'Стебельська', firstName: 'Катерина',   patronymic: 'Миколаївна',     firstNameEn: 'Kateryna',  lastNameEn: 'Stebelska' },
    { id: 21, lastName: 'Тиравський',  firstName: 'Олег',       patronymic: 'Русланович',     firstNameEn: 'Oleh',      lastNameEn: 'Tyravskyi' },
    { id: 22, lastName: 'Титар',       firstName: 'Ангелина',   patronymic: 'Іванівна',       firstNameEn: 'Anhelyna',  lastNameEn: 'Tytar' },
    { id: 23, lastName: 'Черниш',      firstName: 'Олег',       patronymic: '',               firstNameEn: 'Oleh',      lastNameEn: 'Chernysh' },
    { id: 24, lastName: 'Чернов',      firstName: 'Дмитро',     patronymic: 'Сергійович',     firstNameEn: 'Dmytro',    lastNameEn: 'Chernov' },
    { id: 25, lastName: 'Юрків',       firstName: 'Тарас',      patronymic: 'Дмитрович',      firstNameEn: 'Taras',     lastNameEn: 'Yurkiv' }
  ];

  // All 25 Variants from Page 6 of Lab 3 (S-DES) PDF (Key = 0011011101)
  const SDES_VARIANTS = [
    { variant: 1,  cipher: '11101101' },
    { variant: 2,  cipher: '10010110' },
    { variant: 3,  cipher: '10110101' },
    { variant: 4,  cipher: '01011000' },
    { variant: 5,  cipher: '01001000' },
    { variant: 6,  cipher: '11010011' },
    { variant: 7,  cipher: '00110100' },
    { variant: 8,  cipher: '00110110' },
    { variant: 9,  cipher: '10100110' },
    { variant: 10, cipher: '11111000' },
    { variant: 11, cipher: '00011010' },
    { variant: 12, cipher: '01110011' },
    { variant: 13, cipher: '11100011' },
    { variant: 14, cipher: '01111101' },
    { variant: 15, cipher: '01011011' },
    { variant: 16, cipher: '01010110' },
    { variant: 17, cipher: '00101011' },
    { variant: 18, cipher: '10010011' },
    { variant: 19, cipher: '10011100' },
    { variant: 20, cipher: '00010011' },
    { variant: 21, cipher: '01001110' },
    { variant: 22, cipher: '11010110' },
    { variant: 23, cipher: '00011001' },
    { variant: 24, cipher: '11010000' },
    { variant: 25, cipher: '00100001' }
  ];

  const SDES_DEFAULT_KEY = '0011011101';

  function permuteBits(bitStr, table) {
    return table.map(pos => bitStr[pos - 1]).join('');
  }

  function leftShiftBits(bitStr, shiftCount) {
    const n = bitStr.length;
    const s = shiftCount % n;
    return bitStr.slice(s) + bitStr.slice(0, s);
  }

  function xorBits(a, b) {
    let out = '';
    for (let i = 0; i < a.length; i++) {
      out += a[i] === b[i] ? '0' : '1';
    }
    return out;
  }

  function sBoxLookup(fourBits, matrix) {
    const rowBits = `${fourBits[0]}${fourBits[3]}`;
    const colBits = `${fourBits[1]}${fourBits[2]}`;
    const row = parseInt(rowBits, 2);
    const col = parseInt(colBits, 2);
    const val = matrix[row][col];
    const outBits = val.toString(2).padStart(2, '0');
    return {
      input: fourBits,
      rowBits,
      colBits,
      row,
      col,
      val,
      outBits
    };
  }

  function generateSdesSubkeys(key10) {
    const cleanKey = (key10 || SDES_DEFAULT_KEY).replace(/[^01]/g, '').padEnd(10, '0').slice(0, 10);
    const afterP10 = permuteBits(cleanKey, SDES_TABLES.P10);
    const left0 = afterP10.slice(0, 5);
    const right0 = afterP10.slice(5, 10);

    const ls1Left = leftShiftBits(left0, 1);
    const ls1Right = leftShiftBits(right0, 1);
    const afterLS1 = ls1Left + ls1Right;
    const K1 = permuteBits(afterLS1, SDES_TABLES.P8);

    const ls2Left = leftShiftBits(ls1Left, 2);
    const ls2Right = leftShiftBits(ls1Right, 2);
    const afterLS2 = ls2Left + ls2Right;
    const K2 = permuteBits(afterLS2, SDES_TABLES.P8);

    return {
      key10: cleanKey,
      afterP10,
      left0,
      right0,
      ls1Left,
      ls1Right,
      afterLS1,
      K1,
      ls2Left,
      ls2Right,
      afterLS2,
      K2
    };
  }

  function runFkRound(block8, subkey8, s1Mode = 'manual', roundNum = 1, subkeyName = 'K1') {
    const L = block8.slice(0, 4);
    const R = block8.slice(4, 8);
    const epOut = permuteBits(R, SDES_TABLES.EP);
    const xorKeyOut = xorBits(epOut, subkey8);

    const p0Row = xorKeyOut.slice(0, 4); // p00 p01 p02 p03
    const p1Row = xorKeyOut.slice(4, 8); // p10 p11 p12 p13

    const S1Matrix = s1Mode === 'classic' ? SDES_TABLES.S1_CLASSIC : SDES_TABLES.S1_MANUAL;
    const s0Res = sBoxLookup(p0Row, SDES_TABLES.S0);
    const s1Res = sBoxLookup(p1Row, S1Matrix);

    const sCombined = s0Res.outBits + s1Res.outBits;
    const p4Out = permuteBits(sCombined, SDES_TABLES.P4);
    const newL = xorBits(L, p4Out);
    const newBlock = newL + R;

    return {
      roundNum,
      subkeyName,
      subkey8,
      inputBlock: block8,
      L,
      R,
      epOut,
      xorKeyOut,
      p0Row,
      p1Row,
      s0Res,
      s1Res,
      sCombined,
      p4Out,
      newL,
      outputBlock: newBlock
    };
  }

  function runSDES(block8Input, key10Input, mode = 'decrypt', s1Mode = 'manual') {
    const cleanBlock = (block8Input || '11101101').replace(/[^01]/g, '').padEnd(8, '0').slice(0, 8);
    const keySchedule = generateSdesSubkeys(key10Input);

    const firstKey = mode === 'encrypt' ? keySchedule.K1 : keySchedule.K2;
    const firstKeyName = mode === 'encrypt' ? 'K₁' : 'K₂';
    const secondKey = mode === 'encrypt' ? keySchedule.K2 : keySchedule.K1;
    const secondKeyName = mode === 'encrypt' ? 'K₂' : 'K₁';

    // 1. Initial Permutation IP
    const afterIP = permuteBits(cleanBlock, SDES_TABLES.IP);

    // 2. Round 1 f_K
    const round1 = runFkRound(afterIP, firstKey, s1Mode, 1, firstKeyName);

    // 3. Switch SW
    const afterSW = round1.outputBlock.slice(4, 8) + round1.outputBlock.slice(0, 4);

    // 4. Round 2 f_K
    const round2 = runFkRound(afterSW, secondKey, s1Mode, 2, secondKeyName);

    // 5. Final Inverse Permutation IP^-1
    const finalBits = permuteBits(round2.outputBlock, SDES_TABLES.IP_INV);
    const decimalValue = parseInt(finalBits, 2);
    const inputDecimal = parseInt(cleanBlock, 2);

    // Decimal bit breakdown: b7*128 + b6*64 + ...
    const decimalBreakdown = finalBits.split('').map((bit, idx) => {
      const power = 7 - idx;
      const weight = 1 << power;
      return {
        bit: Number(bit),
        power,
        weight,
        term: Number(bit) * weight
      };
    });

    const steps = [
      {
        id: 'key_p10_ls1_k1',
        stage: 'Генерація підключів (Крок 1–3): P10 → LS-1 → P8 (K₁)',
        inBits: keySchedule.key10,
        outBits: keySchedule.K1,
        tableUsed: 'P10 / P8',
        PermTable: SDES_TABLES.P10,
        formula: `P10(${keySchedule.key10}) = ${keySchedule.afterP10} → LS-1(${keySchedule.left0}|${keySchedule.right0}) = ${keySchedule.ls1Left} ${keySchedule.ls1Right} → P8 = K₁ (${keySchedule.K1})`
      },
      {
        id: 'key_ls2_k2',
        stage: 'Генерація підключів (Крок 4–5): LS-2 → P8 (K₂)',
        inBits: keySchedule.afterLS1,
        outBits: keySchedule.K2,
        tableUsed: 'LS-2 / P8',
        PermTable: SDES_TABLES.P8,
        formula: `LS-2(${keySchedule.ls1Left}|${keySchedule.ls1Right}) = ${keySchedule.ls2Left} ${keySchedule.ls2Right} → P8 = K₂ (${keySchedule.K2})`
      },
      {
        id: 'ip',
        stage: '1. Початкова перестановка IP',
        inBits: cleanBlock,
        outBits: afterIP,
        tableUsed: 'IP [2 6 3 1 4 8 5 7]',
        PermTable: SDES_TABLES.IP,
        formula: `IP(${cleanBlock}) = ${afterIP} → L₀ = ${afterIP.slice(0, 4)}, R₀ = ${afterIP.slice(4, 8)}`
      },
      {
        id: 'fk1_ep_xor',
        stage: `2a. Раунд 1 (f_${firstKeyName}): Розширення E/P(R₀) та XOR з ${firstKeyName}`,
        inBits: round1.R,
        outBits: round1.xorKeyOut,
        tableUsed: 'E/P [4 1 2 3 2 3 4 1]',
        PermTable: SDES_TABLES.EP,
        formula: `E/P(${round1.R}) = ${round1.epOut} ⊕ ${firstKeyName}(${firstKey}) = ${round1.xorKeyOut} (Рядок 1: ${round1.p0Row}, Рядок 2: ${round1.p1Row})`
      },
      {
        id: 'fk1_sbox_p4',
        stage: `2b. Раунд 1 (f_${firstKeyName}): Матриці S₀, S₁ → P4 → XOR з L₀`,
        inBits: round1.xorKeyOut,
        outBits: round1.outputBlock,
        tableUsed: 'S₀, S₁, P4 [2 4 3 1]',
        PermTable: SDES_TABLES.P4,
        s0: round1.s0Res,
        s1: round1.s1Res,
        formula: `S₀(${round1.p0Row})=[ряд ${round1.s0Res.row}, стовп ${round1.s0Res.col}]=${round1.s0Res.val}(${round1.s0Res.outBits}), S₁(${round1.p1Row})=[ряд ${round1.s1Res.row}, стовп ${round1.s1Res.col}]=${round1.s1Res.val}(${round1.s1Res.outBits}) → P4(${round1.sCombined})=${round1.p4Out} → L₀(${round1.L}) ⊕ ${round1.p4Out} = ${round1.newL} → Вихід f_K = ${round1.outputBlock}`
      },
      {
        id: 'sw',
        stage: '3. Перестановка підблоків SW (Swap L і R)',
        inBits: round1.outputBlock,
        outBits: afterSW,
        tableUsed: 'SW [5 6 7 8 1 2 3 4]',
        PermTable: [5, 6, 7, 8, 1, 2, 3, 4],
        formula: `SW(${round1.outputBlock.slice(0, 4)} | ${round1.outputBlock.slice(4, 8)}) = ${afterSW.slice(0, 4)} | ${afterSW.slice(4, 8)} (${afterSW})`
      },
      {
        id: 'fk2_ep_xor',
        stage: `4a. Раунд 2 (f_${secondKeyName}): Розширення E/P(R₁) та XOR з ${secondKeyName}`,
        inBits: round2.R,
        outBits: round2.xorKeyOut,
        tableUsed: 'E/P [4 1 2 3 2 3 4 1]',
        PermTable: SDES_TABLES.EP,
        formula: `E/P(${round2.R}) = ${round2.epOut} ⊕ ${secondKeyName}(${secondKey}) = ${round2.xorKeyOut} (Рядок 1: ${round2.p0Row}, Рядок 2: ${round2.p1Row})`
      },
      {
        id: 'fk2_sbox_p4',
        stage: `4b. Раунд 2 (f_${secondKeyName}): Матриці S₀, S₁ → P4 → XOR з L₁`,
        inBits: round2.xorKeyOut,
        outBits: round2.outputBlock,
        tableUsed: 'S₀, S₁, P4 [2 4 3 1]',
        PermTable: SDES_TABLES.P4,
        s0: round2.s0Res,
        s1: round2.s1Res,
        formula: `S₀(${round2.p0Row})=[ряд ${round2.s0Res.row}, стовп ${round2.s0Res.col}]=${round2.s0Res.val}(${round2.s0Res.outBits}), S₁(${round2.p1Row})=[ряд ${round2.s1Res.row}, стовп ${round2.s1Res.col}]=${round2.s1Res.val}(${round2.s1Res.outBits}) → P4(${round2.sCombined})=${round2.p4Out} → L₁(${round2.L}) ⊕ ${round2.p4Out} = ${round2.newL} → Вихід f_K = ${round2.outputBlock}`
      },
      {
        id: 'ip_inv',
        stage: '5. Кінцева обернена перестановка IP⁻¹ та перетворення у десяткове число',
        inBits: round2.outputBlock,
        outBits: finalBits,
        tableUsed: 'IP⁻¹ [4 1 3 5 7 2 8 6]',
        PermTable: SDES_TABLES.IP_INV,
        formula: `IP⁻¹(${round2.outputBlock}) = ${finalBits}₂ = ${decimalValue}₁₀`
      }
    ];

    return {
      mode,
      s1Mode,
      inputBlock: cleanBlock,
      inputDecimal,
      keySchedule,
      afterIP,
      round1,
      afterSW,
      round2,
      finalBits,
      decimalValue,
      decimalBreakdown,
      steps
    };
  }

  return {
    EN_ALPHABET,
    UA_ALPHABET,
    UA_FREQUENCIES,
    EN_FREQUENCIES,
    GROUP_STUDENTS,
    SDES_TABLES,
    SDES_VARIANTS,
    SDES_DEFAULT_KEY,
    detectAlphabet,
    runCaesar,
    runFrequencyAnalysis,
    runTransposition,
    sha256Hex,
    strToBase64Url,
    base64UrlToStr,
    generateJwtHS256,
    verifyJwtHS256,
    modPowTrace,
    isPrime,
    runDiffieHellmanStandard,
    runDiffieHellmanMITM,
    generateSdesSubkeys,
    runSDES
  };
})();
