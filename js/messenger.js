/**
 * AEGIS // MULTI-TAB SECURE MESSENGER & MITM INTERCEPTOR ENGINE
 * Synchronizes Alice, Bob, and MITM Attacker across separate browser tabs/windows
 * via BroadcastChannel + localStorage.
 */

document.addEventListener('DOMContentLoaded', () => {
  const E = window.CryptoEngines;
  const STORAGE_KEY = 'AEGIS_DH_MESSENGER_STATE_V1';
  const bus = ('BroadcastChannel' in window) ? new BroadcastChannel('aegis_dh_bus') : null;

  // Determine current tab role from URL query (?role=alice | bob | attacker)
  const urlParams = new URLSearchParams(window.location.search);
  let currentRole = (urlParams.get('role') || 'alice').toLowerCase();
  if (!['alice', 'bob', 'attacker'].includes(currentRole)) currentRole = 'alice';

  // Symmetric stream cipher based on negotiated DH key K (step-by-step character shift/XOR)
  function encryptWithDhKey(plainText, keyNum) {
    const k = Number(keyNum) || 0;
    const bytes = [];
    const steps = [];
    for (let i = 0; i < plainText.length; i++) {
      const code = plainText.charCodeAt(i);
      const shift = (k + i * 7) % 251;
      const encCode = code ^ shift;
      const hex = encCode.toString(16).padStart(4, '0').toUpperCase();
      bytes.push(hex);
      if (i < 8) {
        steps.push(`'${plainText[i]}'(${code}) XOR (${k}+${i}*7 mod 251 = ${shift}) = 0x${hex}`);
      }
    }
    return {
      cipherHex: bytes.join(' '),
      steps
    };
  }

  function decryptWithDhKey(cipherHex, keyNum) {
    const k = Number(keyNum) || 0;
    const parts = (cipherHex || '').trim().split(/\s+/).filter(Boolean);
    let out = '';
    const steps = [];
    for (let i = 0; i < parts.length; i++) {
      const encCode = parseInt(parts[i], 16);
      const shift = (k + i * 7) % 251;
      const origCode = encCode ^ shift;
      const ch = String.fromCharCode(origCode);
      out += ch;
      if (i < 8) {
        steps.push(`0x${parts[i]}(${encCode}) XOR ${shift} = ${origCode} ('${ch}')`);
      }
    }
    return {
      plainText: out,
      steps
    };
  }

  function getDefaultChannelState() {
    const p = 331, g = 204, a = 46, b = 56, c1 = 33, c2 = 71;
    return recomputeKeys({
      p, g, a, b, c1, c2,
      mitmActive: true,
      holdMode: 'manual', // 'manual' | 'auto'
      messages: [
        {
          id: 'init-1',
          timestamp: new Date().toLocaleTimeString('uk-UA'),
          from: 'alice',
          to: 'bob',
          originalPlain: 'Привіт Боб! Переказ 500 грн на рахунок 1111 підтверджено.',
          senderKeyUsed: 64,
          cipherSent: '',
          status: 'delivered', // 'pending_mitm' | 'delivered' | 'tampered' | 'dropped'
          finalPlainForRecipient: 'Привіт Боб! Переказ 50000 грн на рахунок 9999 підтверджено.',
          recipientKeyUsed: 139,
          cipherDelivered: '',
          tamperedByMitm: true
        }
      ]
    });
  }

  function recomputeKeys(st) {
    const p = Math.max(5, Number(st.p) || 331);
    const g = Math.max(2, Number(st.g) || 204);
    const a = Math.max(1, Number(st.a) || 46);
    const b = Math.max(1, Number(st.b) || 56);
    const c1 = Math.max(1, Number(st.c1) || 33);
    const c2 = Math.max(1, Number(st.c2) || 71);

    const A1 = E.modPowTrace(g, a, p).result;
    const B2 = E.modPowTrace(g, b, p).result;
    const B1 = E.modPowTrace(g, c1, p).result;
    const A2 = E.modPowTrace(g, c2, p).result;

    let aliceKey, bobKey, attackerKeyWithAlice, attackerKeyWithBob;
    let aliceReceivedPub, bobReceivedPub;

    if (st.mitmActive) {
      aliceReceivedPub = B1;
      bobReceivedPub = A2;
      aliceKey = E.modPowTrace(B1, a, p).result;
      attackerKeyWithAlice = E.modPowTrace(A1, c1, p).result;
      bobKey = E.modPowTrace(A2, b, p).result;
      attackerKeyWithBob = E.modPowTrace(B2, c2, p).result;
    } else {
      aliceReceivedPub = B2;
      bobReceivedPub = A1;
      aliceKey = E.modPowTrace(B2, a, p).result;
      bobKey = E.modPowTrace(A1, b, p).result;
      attackerKeyWithAlice = null;
      attackerKeyWithBob = null;
    }

    const updated = {
      ...st,
      p, g, a, b, c1, c2,
      A1, B2, B1, A2,
      aliceReceivedPub,
      bobReceivedPub,
      aliceKey,
      bobKey,
      attackerKeyWithAlice,
      attackerKeyWithBob
    };

    // Ensure sample message has valid cipher hex
    updated.messages = (updated.messages || []).map(m => {
      if (!m.cipherSent) {
        const enc1 = encryptWithDhKey(m.originalPlain, m.senderKeyUsed);
        m.cipherSent = enc1.cipherHex;
      }
      if (!m.cipherDelivered && m.finalPlainForRecipient) {
        const enc2 = encryptWithDhKey(m.finalPlainForRecipient, m.recipientKeyUsed);
        m.cipherDelivered = enc2.cipherHex;
      }
      return m;
    });

    return updated;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const def = getDefaultChannelState();
        saveState(def, false);
        return def;
      }
      return recomputeKeys(JSON.parse(raw));
    } catch (e) {
      return getDefaultChannelState();
    }
  }

  function saveState(newState, broadcast = true) {
    const computed = recomputeKeys(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(computed));
    if (broadcast && bus) {
      bus.postMessage({ type: 'STATE_UPDATED' });
    }
    return computed;
  }

  let channelState = loadState();

  // Listen for cross-tab updates
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      channelState = loadState();
      renderAll();
    }
  });

  if (bus) {
    bus.onmessage = () => {
      channelState = loadState();
      renderAll();
    };
  }

  // Role switching inside current tab
  document.querySelectorAll('#roleSwitchGroup .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRole = btn.dataset.role;
      const newUrl = `${window.location.pathname}?role=${currentRole}`;
      window.history.replaceState({}, '', newUrl);
      renderAll();
    });
  });

  // Top bar buttons
  document.getElementById('btnRunHandshake').addEventListener('click', () => {
    channelState = saveState(channelState, true);
    renderAll();
  });

  document.getElementById('btnResetChannel').addEventListener('click', () => {
    const fresh = getDefaultChannelState();
    fresh.messages = [];
    channelState = saveState(fresh, true);
    renderAll();
  });

  // Endpoint controls (Alice / Bob)
  document.getElementById('btnSendPublicKey').addEventListener('click', () => {
    const newP = parseInt(document.getElementById('clientInputP').value, 10) || 331;
    const newG = parseInt(document.getElementById('clientInputG').value, 10) || 204;
    const newPriv = parseInt(document.getElementById('clientInputPriv').value, 10) || 46;

    channelState.p = newP;
    channelState.g = newG;
    if (currentRole === 'alice') channelState.a = newPriv;
    if (currentRole === 'bob') channelState.b = newPriv;

    channelState = saveState(channelState, true);
    renderAll();
  });

  function sendEndpointMessage() {
    const inp = document.getElementById('endpointMsgInput');
    const text = inp.value.trim();
    if (!text) return;

    const from = currentRole;
    const to = from === 'alice' ? 'bob' : 'alice';
    const senderKey = from === 'alice' ? channelState.aliceKey : channelState.bobKey;
    const recipientKey = to === 'bob' ? channelState.bobKey : channelState.aliceKey;

    const encSender = encryptWithDhKey(text, senderKey);

    // If MITM is active and in manual hold mode, hold the packet in attacker queue!
    const isHeldByMitm = channelState.mitmActive && channelState.holdMode === 'manual';

    const newMsg = {
      id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleTimeString('uk-UA'),
      from,
      to,
      originalPlain: text,
      senderKeyUsed: senderKey,
      cipherSent: encSender.cipherHex,
      status: isHeldByMitm ? 'pending_mitm' : 'delivered',
      finalPlainForRecipient: text,
      recipientKeyUsed: channelState.mitmActive ? recipientKey : senderKey,
      cipherDelivered: channelState.mitmActive
        ? encryptWithDhKey(text, recipientKey).cipherHex
        : encSender.cipherHex,
      tamperedByMitm: false
    };

    channelState.messages.push(newMsg);
    inp.value = '';
    channelState = saveState(channelState, true);
    renderAll();
  }

  document.getElementById('btnEndpointSendMsg').addEventListener('click', sendEndpointMessage);
  document.getElementById('endpointMsgInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendEndpointMessage();
  });

  document.querySelectorAll('.quick-msg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('endpointMsgInput').value = btn.dataset.msg;
      sendEndpointMessage();
    });
  });

  // Attacker controls
  document.querySelectorAll('#mitmActiveToggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      channelState.mitmActive = btn.dataset.mitm === 'active';
      channelState = saveState(channelState, true);
      renderAll();
    });
  });

  document.querySelectorAll('#mitmHoldToggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      channelState.holdMode = btn.dataset.hold;
      channelState = saveState(channelState, true);
      renderAll();
    });
  });

  document.getElementById('attackerInputC1').addEventListener('input', (e) => {
    channelState.c1 = parseInt(e.target.value, 10) || 33;
    channelState = saveState(channelState, true);
    renderAll();
  });

  document.getElementById('attackerInputC2').addEventListener('input', (e) => {
    channelState.c2 = parseInt(e.target.value, 10) || 71;
    channelState = saveState(channelState, true);
    renderAll();
  });

  // ============================================================================
  // RENDERING UI FOR ACTIVE ROLE
  // ============================================================================
  function renderAll() {
    // Highlight role button
    document.querySelectorAll('#roleSwitchGroup .toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.role === currentRole);
    });

    const headerTitle = document.getElementById('nodeHeaderTitle');
    const shortCode = document.getElementById('nodeShortCode');
    const endpointView = document.getElementById('endpointClientView');
    const attackerView = document.getElementById('attackerConsoleView');

    if (currentRole === 'alice') {
      shortCode.textContent = 'AL';
      headerTitle.innerHTML = 'ТЕРМІНАЛ АЛІСИ <span class="cyan-text">(ALICE ENDPOINT)</span>';
      endpointView.classList.remove('hidden');
      attackerView.classList.add('hidden');
    } else if (currentRole === 'bob') {
      shortCode.textContent = 'BB';
      headerTitle.innerHTML = 'ТЕРМІНАЛ БОБА <span style="color:#10b981;">(BOB ENDPOINT)</span>';
      endpointView.classList.remove('hidden');
      attackerView.classList.add('hidden');
    } else {
      shortCode.textContent = 'MITM';
      headerTitle.innerHTML = 'КОНСОЛЬ ПЕРЕХОПЛЮВАЧА <span style="color:#f43f5e;">(MAN-IN-THE-MIDDLE PROXY)</span>';
      endpointView.classList.add('hidden');
      attackerView.classList.remove('hidden');
    }

    renderTopParamsStrip();

    if (currentRole === 'alice' || currentRole === 'bob') {
      renderEndpointClient();
    } else {
      renderAttackerConsole();
    }
  }

  function renderTopParamsStrip() {
    const s = channelState;
    const modeHeading = document.getElementById('channelModeHeading');
    if (s.mitmActive) {
      modeHeading.innerHTML = 'Статус каналу: <span style="color:#f43f5e;">АКТИВНА АТАКА «ЛЮДИНА ПОСЕРЕДИНІ» (MITM) — Канал розірвано на дві сесії (K1 та K2)</span>';
    } else {
      modeHeading.innerHTML = 'Статус каналу: <span style="color:#10b981;">ПРЯМИЙ ЗАХИЩЕНИЙ КАНАЛ (Аліса та Боб мають єдиний спільний секрет K)</span>';
    }

    document.getElementById('msgCryptoParamsStrip').innerHTML = `
      <div class="pipe-stage">
        <div class="pipe-label">ПУБЛІЧНІ p, g</div>
        <div class="pipe-bits">p=${s.p}, g=${s.g}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">КЛЮЧІ АЛІСИ (a, A1)</div>
        <div class="pipe-bits">a=${s.a}, A1=${s.A1}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">КЛЮЧІ БОБА (b, B2)</div>
        <div class="pipe-bits">b=${s.b}, B2=${s.B2}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">ПЕРЕХОПЛЮВАЧ (c1, c2)</div>
        <div class="pipe-bits">${s.mitmActive ? `B1=${s.B1}, A2=${s.A2}` : 'Пасивний'}</div>
      </div>
      <div class="pipe-stage ${s.mitmActive ? '' : 'final-dec'}">
        <div class="pipe-label">КЛЮЧ АЛІСИ (K_Alice)</div>
        <div class="pipe-bits">K = ${s.aliceKey}</div>
      </div>
      <div class="pipe-stage ${s.mitmActive ? '' : 'final-dec'}">
        <div class="pipe-label">КЛЮЧ БОБА (K_Bob)</div>
        <div class="pipe-bits">K = ${s.bobKey}</div>
      </div>
      <div class="pipe-stage final-dec">
        <div class="pipe-label">РЕЖИМ КАНАЛУ</div>
        <div class="pipe-bits" style="color:${s.mitmActive ? '#f43f5e' : '#10b981'};font-size:12px;">${s.mitmActive ? 'MITM АКТИВНИЙ' : 'ЗАХИЩЕНО'}</div>
      </div>
    `;
  }

  function renderEndpointClient() {
    const s = channelState;
    const isAlice = currentRole === 'alice';
    const myName = isAlice ? 'Аліса (Alice)' : 'Боб (Bob)';
    const peerName = isAlice ? 'Боб (Bob)' : 'Аліса (Alice)';
    const myPriv = isAlice ? s.a : s.b;
    const myPub = isAlice ? s.A1 : s.B2;
    const rxPub = isAlice ? s.aliceReceivedPub : s.bobReceivedPub;
    const myKey = isAlice ? s.aliceKey : s.bobKey;

    document.getElementById('clientNodeBadge').textContent = isAlice
      ? 'ВУЗОЛ ВІДПРАВНИКА А // ALICE WORKSTATION'
      : 'ВУЗОЛ ОТРИМУВАЧА Б // BOB WORKSTATION';
    document.getElementById('clientWindowTitle').textContent = `Месенджер: ${myName} (Співрозмовник: ${peerName})`;
    document.getElementById('clientKeyStatusPill').textContent = `Мій обчислений спільний ключ: K = ${myKey}`;

    document.getElementById('clientInputP').value = s.p;
    document.getElementById('clientInputG').value = s.g;
    document.getElementById('clientPrivateKeyLabel').textContent = isAlice
      ? 'Мій секретний ключ a:'
      : 'Мій секретний ключ b:';
    document.getElementById('clientInputPriv').value = myPriv;

    document.getElementById('clientComputedFormula').innerHTML = isAlice
      ? `Мій відкритий ключ: <b>A = ${s.g}<sup>${s.a}</sup> mod ${s.p} = ${myPub}</b> | Отримано з мережі: <b>B = ${rxPub}</b> → Спільний секрет: <b>K = ${rxPub}<sup>${s.a}</sup> mod ${s.p} = <span class="cyan-text">${myKey}</span></b>`
      : `Мій відкритий ключ: <b>B = ${s.g}<sup>${s.b}</sup> mod ${s.p} = ${myPub}</b> | Отримано з мережі: <b>A = ${rxPub}</b> → Спільний секрет: <b>K = ${rxPub}<sup>${s.b}</sup> mod ${s.p} = <span class="cyan-text">${myKey}</span></b>`;

    // Filter messages visible to this endpoint:
    // - Messages sent by this endpoint (always visible)
    // - Messages sent TO this endpoint that are 'delivered' (not 'pending_mitm' or 'dropped')
    const visibleMsgs = s.messages.filter(m => {
      if (m.from === currentRole) return true;
      if (m.to === currentRole && m.status === 'delivered') return true;
      return false;
    });

    const feedEl = document.getElementById('endpointChatFeed');
    if (visibleMsgs.length === 0) {
      feedEl.innerHTML = `<div class="empty-chat-notice">Повідомлень ще немає. Напишіть повідомлення нижче та натисніть «Зашифрувати та надіслати».</div>`;
    } else {
      feedEl.innerHTML = visibleMsgs.map(m => {
        const isMine = m.from === currentRole;
        const senderLabel = m.from === 'alice' ? 'АЛІСА' : 'БОБ';
        const statusText = m.status === 'pending_mitm'
          ? '[У КАНАЛІ: Затримано вузлом посередника...]'
          : m.status === 'dropped'
          ? '[ПАКЕТ ВТРАЧЕНО / ЗАБЛОКОВАНО В КАНАЛІ]'
          : '[ДОСТАВЛЕНО]';

        // If I am the sender, I see what I sent (`originalPlain` and `cipherSent`).
        // If I am the recipient, I decrypt `cipherDelivered` using my session key (`myKey`)!
        const cipherShown = isMine ? m.cipherSent : m.cipherDelivered;
        const decryptedByMe = isMine
          ? m.originalPlain
          : decryptWithDhKey(m.cipherDelivered, myKey).plainText;

        return `
          <div class="chat-bubble ${isMine ? 'bubble-mine' : 'bubble-peer'}">
            <div class="bubble-meta">
              <span><b>${senderLabel}</b> (${m.timestamp})</span>
              <span class="bubble-status">${statusText}</span>
            </div>
            <div class="bubble-plaintext">${decryptedByMe}</div>
            <div class="bubble-cipher">Криптограма в каналі (ключ K=${isMine ? m.senderKeyUsed : myKey}): <code>${cipherShown}</code></div>
          </div>
        `;
      }).join('');
      feedEl.scrollTop = feedEl.scrollHeight;
    }

    // Right panel: Step-by-step encryption/decryption log for this node
    const logEl = document.getElementById('endpointCryptoLog');
    if (visibleMsgs.length === 0) {
      logEl.innerHTML = `<div class="empty-chat-notice">Тут з'явиться покроковий розбір шифрування та дешифрування кожного пакета.</div>`;
    } else {
      logEl.innerHTML = [...visibleMsgs].reverse().map(m => {
        const isMine = m.from === currentRole;
        if (isMine) {
          const trace = encryptWithDhKey(m.originalPlain, m.senderKeyUsed);
          return `
            <div class="protocol-step-box mb-10">
              <div class="dh-step-title">ВИХІДНИЙ ПАКЕТ (${m.timestamp}) — Шифрування ключем K = ${m.senderKeyUsed}</div>
              <div>1. Відкритий текст: <b>"${m.originalPlain}"</b></div>
              <div>2. Покрокове XOR-гамування перших символів ключем K=${m.senderKeyUsed}:</div>
              <div style="color:#93c5fd;font-size:11px;margin:4px 0;">${trace.steps.join('<br>')}</div>
              <div>3. Згенерована криптограма: <code>${m.cipherSent}</code></div>
            </div>
          `;
        } else {
          const decTrace = decryptWithDhKey(m.cipherDelivered, myKey);
          return `
            <div class="protocol-step-box mb-10">
              <div class="dh-step-title" style="color:#10b981;">ВХІДНИЙ ПАКЕТ (${m.timestamp}) — Дешифрування моїм ключем K = ${myKey}</div>
              <div>1. Отримана з мережі криптограма: <code>${m.cipherDelivered}</code></div>
              <div>2. Покрокове дешифрування ключем K=${myKey}:</div>
              <div style="color:#6ee7b7;font-size:11px;margin:4px 0;">${decTrace.steps.join('<br>')}</div>
              <div>3. Розшифрований текст: <b>"${decTrace.plainText}"</b></div>
              <div style="color:#94a3b8;font-size:10.5px;margin-top:4px;">Примітка: Вузол отримувача не знає, чи був пакет перешифрований посередником, оскільки підпис автентифікації відсутній!</div>
            </div>
          `;
        }
      }).join('');
    }
  }

  function renderAttackerConsole() {
    const s = channelState;

    document.querySelectorAll('#mitmActiveToggle .toggle-btn').forEach(b => {
      b.classList.toggle('active', (b.dataset.mitm === 'active') === s.mitmActive);
    });
    document.querySelectorAll('#mitmHoldToggle .toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.hold === s.holdMode);
    });

    document.getElementById('attackerInputC1').value = s.c1;
    document.getElementById('attackerInputC2').value = s.c2;

    // Render Key Matrix Box
    const matrixBox = document.getElementById('attackerKeyMatrixBox');
    if (s.mitmActive) {
      matrixBox.innerHTML = `
        <div><b>СТАН ПІДМІНИ КЛЮЧІВ (АКТИВНИЙ MITM):</b></div>
        <div>• Від Аліси перехоплено <code>A1 = ${s.A1}</code> → Замість нього Бобу відправлено <code>A2 = g^c2 mod p = ${s.A2}</code></div>
        <div>• Від Боба перехоплено <code>B2 = ${s.B2}</code> → Замість нього Алісі відправлено <code>B1 = g^c1 mod p = ${s.B1}</code></div>
        <div>• <span style="color:#fda4af;font-weight:700;">Ключ сесії з Алісою: K1 = A1^c1 mod p = ${s.attackerKeyWithAlice}</span> | <span style="color:#fde68a;font-weight:700;">Ключ сесії з Бобом: K2 = B2^c2 mod p = ${s.attackerKeyWithBob}</span></div>
      `;
    } else {
      matrixBox.innerHTML = `
        <div><b>ПАСИВНИЙ РЕЖИМ ПРОСЛУХОВУВАННЯ (БЕЗ ПІДМІНИ):</b></div>
        <div>• Перехоплено відкриті параметри: <code>p = ${s.p}, g = ${s.g}, A = ${s.A1}, B = ${s.B2}</code></div>
        <div style="color:#f43f5e;">• Секретні ключі a та b невідомі! Спільний ключ K = ${s.aliceKey} недоступний для зловмисника (задача дискретного логарифмування).</div>
      `;
    }

    // Render Pending Intercept Queue
    const pendingMsgs = s.messages.filter(m => m.status === 'pending_mitm');
    document.getElementById('pendingCountBadge').textContent = `${pendingMsgs.length} пакетів у черзі`;

    const queueEl = document.getElementById('attackerInterceptQueue');
    if (pendingMsgs.length === 0) {
      queueEl.innerHTML = `
        <div class="empty-chat-notice">
          Черга порожня. Відкрийте вкладку Аліси або Боба та надішліть повідомлення — воно миттєво з'явиться тут для перехоплення та модифікації!
        </div>
      `;
    } else {
      queueEl.innerHTML = pendingMsgs.map(m => {
        const fromName = m.from === 'alice' ? 'АЛІСИ (Alice)' : 'БОБА (Bob)';
        const toName = m.to === 'bob' ? 'БОБА (Bob)' : 'АЛІСИ (Alice)';
        const kIn = m.from === 'alice' ? s.attackerKeyWithAlice : s.attackerKeyWithBob;
        const kOut = m.to === 'bob' ? s.attackerKeyWithBob : s.attackerKeyWithAlice;
        const decryptedText = decryptWithDhKey(m.cipherSent, kIn).plainText;

        return `
          <div class="intercept-card" data-msg-id="${m.id}">
            <div class="dh-step-title" style="color:#f43f5e;">ПЕРЕХОПЛЕНО ПАКЕТ: ВІД ${fromName} ДО ${toName} (${m.timestamp})</div>
            <div class="dh-knows-line">Вхідна криптограма: <code>${m.cipherSent}</code></div>
            <div class="dh-knows-line">Розшифровано ключем перехоплювача (K=${kIn}): <b style="color:#00f0ff;">"${decryptedText}"</b></div>
            <div class="form-group mt-10">
              <label>Змінити текст повідомлення перед перешифруванням ключем K=${kOut} для отримувача:</label>
              <input type="text" class="cyber-input mitm-edit-input" value="${decryptedText.replace(/"/g, '&quot;')}" />
            </div>
            <div class="player-controls mt-10">
              <button class="cyber-btn btn-sm btn-danger btn-mitm-tamper" data-id="${m.id}">Підмінити текст, перешифрувати (K=${kOut}) і відправити</button>
              <button class="cyber-btn btn-sm btn-emerald btn-mitm-forward" data-id="${m.id}">Переслати без змін (K=${kOut})</button>
              <button class="cyber-btn btn-sm btn-mitm-drop" data-id="${m.id}">Заблокувати пакет (Drop)</button>
            </div>
          </div>
        `;
      }).join('');

      // Attach listeners for Tamper, Forward, Drop
      queueEl.querySelectorAll('.btn-mitm-tamper').forEach(btn => {
        btn.addEventListener('click', () => {
          const msgId = btn.dataset.id;
          const card = btn.closest('.intercept-card');
          const editedText = card.querySelector('.mitm-edit-input').value;
          processInterceptedPacket(msgId, 'tamper', editedText);
        });
      });

      queueEl.querySelectorAll('.btn-mitm-forward').forEach(btn => {
        btn.addEventListener('click', () => {
          const msgId = btn.dataset.id;
          processInterceptedPacket(msgId, 'forward', null);
        });
      });

      queueEl.querySelectorAll('.btn-mitm-drop').forEach(btn => {
        btn.addEventListener('click', () => {
          const msgId = btn.dataset.id;
          processInterceptedPacket(msgId, 'drop', null);
        });
      });
    }

    // Render Full Wiretap Log
    const fullLogEl = document.getElementById('attackerFullLog');
    if (s.messages.length === 0) {
      fullLogEl.innerHTML = `<div class="empty-chat-notice">Журнал трафіку порожній.</div>`;
    } else {
      fullLogEl.innerHTML = [...s.messages].reverse().map(m => {
        const dir = `${m.from.toUpperCase()} -> ${m.to.toUpperCase()}`;
        if (!s.mitmActive) {
          // In passive mode, try decrypting with fake key 0 -> gibberish!
          return `
            <div class="protocol-step-box mb-10">
              <div class="dh-step-title">[ПАСИВНЕ ПЕРЕХОПЛЕННЯ] ${dir} (${m.timestamp})</div>
              <div>Перехоплений шифротекст у каналі: <code>${m.cipherSent}</code></div>
              <div style="color:#f43f5e;">Розшифрування неможливе: спільний ключ K невідомий пасивному спостерігачу!</div>
            </div>
          `;
        }
        return `
          <div class="protocol-step-box mb-10">
            <div class="dh-step-title" style="color:${m.tamperedByMitm ? '#f43f5e' : '#00f0ff'};">
              [MITM ТРАНЗАКЦІЯ: ${m.status.toUpperCase()}] ${dir} (${m.timestamp})
            </div>
            <div>1. Отримано від відправника (K=${m.senderKeyUsed}): <b>"${m.originalPlain}"</b> (<code>${m.cipherSent}</code>)</div>
            ${m.status === 'dropped'
              ? `<div style="color:#f43f5e;font-weight:700;">2. Пакет знищено перехоплювачем (не доставлено отримувачу).</div>`
              : `<div>2. Відправлено отримувачу (перешифровано ключем K=${m.recipientKeyUsed}): <b style="color:${m.tamperedByMitm ? '#fda4af' : '#10b981'};">"${m.finalPlainForRecipient}"</b> (<code>${m.cipherDelivered}</code>)</div>`
            }
          </div>
        `;
      }).join('');
    }
  }

  function processInterceptedPacket(msgId, action, editedText) {
    const s = channelState;
    const msg = s.messages.find(m => m.id === msgId);
    if (!msg) return;

    const kOut = msg.to === 'bob' ? s.attackerKeyWithBob : s.attackerKeyWithAlice;

    if (action === 'drop') {
      msg.status = 'dropped';
    } else if (action === 'forward') {
      msg.status = 'delivered';
      msg.finalPlainForRecipient = msg.originalPlain;
      msg.recipientKeyUsed = kOut;
      msg.cipherDelivered = encryptWithDhKey(msg.originalPlain, kOut).cipherHex;
      msg.tamperedByMitm = false;
    } else if (action === 'tamper') {
      msg.status = 'delivered';
      msg.finalPlainForRecipient = editedText;
      msg.recipientKeyUsed = kOut;
      msg.cipherDelivered = encryptWithDhKey(editedText, kOut).cipherHex;
      msg.tamperedByMitm = editedText !== msg.originalPlain;
    }

    channelState = saveState(s, true);
    renderAll();
  }

  renderAll();
});
