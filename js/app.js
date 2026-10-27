/**
 * AEGIS // CRYPTO-OPS TACTICAL TERMINAL
 * Main Application Controller & Step-by-Step Debugger Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
  const E = window.CryptoEngines;
  const V = window.CryptoVisualizers;
  const C = window.LabContent;

  // ============================================================================
  // GLOBAL OPERATIVE PROFILE STATE (Default: #12 Марчук Дмитро Андрійович)
  // ============================================================================
  const state = {
    variant: 12,
    lastName: 'Марчук',
    firstName: 'Дмитро',
    firstNameEn: 'Dmytro',
    lastNameEn: 'Marchuk',
    groupId: 12,
    lab2DbFilter: 'triad', // 'triad' | 'all'
    // Lab 1 state
    caesarMode: 'encrypt',
    caesarLang: 'auto',
    caesarKey: 3,
    caesarStepIdx: 0,
    caesarTimer: null,
    caesarResult: null,
    transMode: 'encrypt',
    transStepIdx: null,
    transTimer: null,
    transResult: null,
    // Lab 2 state
    currentJwtObj: null,
    oauthStepIdx: 0,
    // Lab 3 (S-DES) state
    sdesStepIdx: 0,
    sdesTimer: null,
    sdesResult: null,
    sdesActiveRoundSbox: 1,
    // Lab 4 (DH & MITM) state
    dhMode: 'standard',
    dhStepIdx: 4,
    dhTimer: null,
    dhData: null
  };

  // Populate Variant / Student Selectors (1..25)
  const globalVarSel = document.getElementById('globalVariantSelect');
  const sdesVarSel = document.getElementById('sdesVariantSelect');
  E.SDES_VARIANTS.forEach(item => {
    const stu = E.GROUP_STUDENTS.find(s => s.id === item.variant);
    const fullName = stu ? `${stu.lastName} ${stu.firstName} ${stu.patronymic}`.trim() : `Варіант ${item.variant}`;

    const opt1 = document.createElement('option');
    opt1.value = item.variant;
    opt1.textContent = `${item.variant}. ${fullName} (${item.cipher})`;
    if (item.variant === 12) opt1.selected = true;
    globalVarSel.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = item.variant;
    opt2.textContent = `${item.variant}. ${fullName} — ${item.cipher}`;
    if (item.variant === 12) opt2.selected = true;
    sdesVarSel.appendChild(opt2);
  });

  function syncOperativeProfile(fromStudentSelect = false) {
    if (fromStudentSelect) {
      const selectedId = parseInt(globalVarSel.value, 10) || 12;
      state.variant = selectedId;
      state.groupId = selectedId;
      const stu = E.GROUP_STUDENTS.find(s => s.id === selectedId);
      if (stu) {
        state.lastName = stu.lastName;
        state.firstName = stu.firstName;
        state.firstNameEn = stu.firstNameEn;
        state.lastNameEn = stu.lastNameEn;
        document.getElementById('globalLastName').value = stu.lastName;
        document.getElementById('globalFirstName').value = stu.firstName;
        document.getElementById('globalGroupId').value = stu.id;
      }
      const foundVar = E.SDES_VARIANTS.find(v => v.variant === selectedId);
      if (foundVar) {
        document.getElementById('sdesBlockInput').value = foundVar.cipher;
      }
    } else {
      state.lastName = document.getElementById('globalLastName').value.trim() || 'Марчук';
      state.firstName = document.getElementById('globalFirstName').value.trim() || 'Дмитро';
      state.groupId = parseInt(document.getElementById('globalGroupId').value, 10) || 12;
      state.variant = state.groupId;
      const matchedStu = E.GROUP_STUDENTS.find(s => s.id === state.groupId);
      if (matchedStu) {
        state.firstNameEn = matchedStu.firstNameEn;
        state.lastNameEn = matchedStu.lastNameEn;
      } else {
        state.firstNameEn = state.firstName;
        state.lastNameEn = state.lastName;
      }
    }

    if (globalVarSel.value !== String(state.variant)) {
      globalVarSel.value = String(state.variant);
    }
    if (sdesVarSel.value !== String(state.variant)) {
      sdesVarSel.value = String(state.variant);
    }

    // Update Lab 2 DB & Postman defaults
    document.getElementById('postmanLoginInput').value = state.lastName;
    document.getElementById('postmanPassInput').value = state.firstName;
    renderLab2Database();
    runLab2LoginSimulation();

    // Update Lab 3 (S-DES)
    updateSDES();

    // Update Python Code & QA blocks
    refreshCodeAndQA();
  }

  globalVarSel.addEventListener('change', () => syncOperativeProfile(true));
  document.getElementById('globalLastName').addEventListener('input', () => syncOperativeProfile(false));
  document.getElementById('globalFirstName').addEventListener('input', () => syncOperativeProfile(false));
  document.getElementById('globalGroupId').addEventListener('input', () => syncOperativeProfile(false));

  // ============================================================================
  // NAVIGATION (MAIN LAB TABS & SUBTABS)
  // ============================================================================
  document.querySelectorAll('.lab-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lab-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.lab-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.dataset.lab;
      document.getElementById(targetId).classList.add('active');
    });
  });

  document.querySelectorAll('.section-subnav .sub-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const parentSection = pill.closest('.lab-section');
      parentSection.querySelectorAll('.section-subnav .sub-pill').forEach(p => p.classList.remove('active'));
      parentSection.querySelectorAll('.subtab-panel').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const targetPanel = document.getElementById(pill.dataset.subtab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Copy buttons helper
  document.querySelectorAll('[data-copy-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.copyTarget);
      if (target) {
        navigator.clipboard.writeText(target.textContent);
        const orig = btn.textContent;
        btn.textContent = '[Скопійовано]';
        setTimeout(() => { btn.textContent = orig; }, 1400);
      }
    });
  });

  document.querySelectorAll('[data-copy-code]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lab = btn.dataset.copyCode;
      const code = C.getPythonCode(lab, state);
      navigator.clipboard.writeText(code);
      const orig = btn.textContent;
      btn.textContent = '[Скопійовано в буфер]';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });

  function refreshCodeAndQA() {
    ['lab1', 'lab2', 'lab3', 'lab4'].forEach(lab => {
      const cap = lab.charAt(0).toUpperCase() + lab.slice(1);
      const codeEl = document.getElementById(`codeBlock${cap}`);
      if (codeEl) codeEl.textContent = C.getPythonCode(lab, state);

      const qaEl = document.getElementById(`qaList${cap}`);
      if (qaEl && C.CONTROL_QUESTIONS[lab]) {
        qaEl.innerHTML = C.CONTROL_QUESTIONS[lab].map(item => `
          <div class="qa-item">
            <div class="qa-q">${item.q}</div>
            <div class="qa-a">${item.a}</div>
          </div>
        `).join('');
      }
    });
  }

  // Open all 3 messenger tabs button in Lab 4
  const openAllThreeBtn = document.getElementById('btnOpenAllThreeTabs');
  if (openAllThreeBtn) {
    openAllThreeBtn.addEventListener('click', () => {
      window.open('messenger.html?role=alice', '_blank');
      window.open('messenger.html?role=attacker', '_blank');
      window.open('messenger.html?role=bob', '_blank');
    });
  }

  // ============================================================================
  // LAB 1.1: CAESAR CIPHER CONTROLLER
  // ============================================================================
  const caesarInputText = document.getElementById('caesarInputText');
  const caesarKeyRange = document.getElementById('caesarKeyRange');
  const caesarKeyInput = document.getElementById('caesarKeyInput');
  const caesarKeyBadge = document.getElementById('caesarKeyBadge');
  const caesarLangSelect = document.getElementById('caesarLangSelect');

  function updateCaesar(resetStep = false) {
    const text = caesarInputText.value;
    const key = parseInt(caesarKeyInput.value, 10) || 0;
    caesarKeyBadge.textContent = key;
    caesarKeyRange.value = key;

    state.caesarResult = E.runCaesar(text, key, state.caesarMode, caesarLangSelect.value);
    document.getElementById('caesarOutputText').textContent = state.caesarResult.output;

    const totalSteps = state.caesarResult.steps.length;
    if (resetStep || state.caesarStepIdx >= totalSteps) {
      state.caesarStepIdx = 0;
    }
    renderCaesarStep();
  }

  function renderCaesarStep() {
    const res = state.caesarResult;
    if (!res) return;
    const steps = res.steps;
    const activeStep = steps[state.caesarStepIdx] || null;

    document.getElementById('caesarStepCounter').textContent =
      steps.length ? `Символ ${state.caesarStepIdx + 1} / ${steps.length}` : 'Немає символів';
    document.getElementById('caesarStepFormula').textContent =
      activeStep ? activeStep.formula : '';

    V.renderCaesarWheel(
      document.getElementById('caesarWheelContainer'),
      res.alphabet,
      res.key,
      activeStep,
      res.mode
    );
    V.renderAlphabetRibbon(
      document.getElementById('caesarRibbonContainer'),
      res.alphabet,
      res.key,
      activeStep,
      res.mode
    );

    const streamEl = document.getElementById('caesarCharStream');
    streamEl.innerHTML = steps.map((st, idx) => `
      <div class="stream-token ${idx === state.caesarStepIdx ? 'active-token' : ''}" data-idx="${idx}" title="${st.formula}">
        <span class="orig-c">${st.origChar === ' ' ? '_' : st.origChar}</span>
        <span class="new-c">${st.newChar === ' ' ? '_' : st.newChar}</span>
      </div>
    `).join('');

    streamEl.querySelectorAll('.stream-token').forEach(tok => {
      tok.addEventListener('click', () => {
        state.caesarStepIdx = parseInt(tok.dataset.idx, 10);
        renderCaesarStep();
      });
    });
  }

  caesarInputText.addEventListener('input', () => updateCaesar(false));
  caesarKeyRange.addEventListener('input', () => {
    caesarKeyInput.value = caesarKeyRange.value;
    updateCaesar(false);
  });
  caesarKeyInput.addEventListener('input', () => updateCaesar(false));
  caesarLangSelect.addEventListener('change', () => updateCaesar(true));

  document.querySelectorAll('#caesarModeToggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#caesarModeToggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.caesarMode = btn.dataset.mode;
      updateCaesar(false);
    });
  });

  document.getElementById('presetCaesarEn').addEventListener('click', () => {
    caesarInputText.value = 'HONEY, I AM HOME';
    caesarKeyInput.value = 3;
    caesarLangSelect.value = 'en';
    state.caesarMode = 'encrypt';
    document.querySelectorAll('#caesarModeToggle .toggle-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === 'encrypt')
    );
    updateCaesar(true);
  });

  document.getElementById('presetCaesarUaEnc').addEventListener('click', () => {
    caesarInputText.value = 'Шукаємо щастя по країнах, століттях, а воно скрізь і завжди з нами';
    caesarKeyInput.value = 10;
    caesarLangSelect.value = 'ua';
    state.caesarMode = 'encrypt';
    document.querySelectorAll('#caesarModeToggle .toggle-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === 'encrypt')
    );
    updateCaesar(true);
  });

  document.getElementById('presetCaesarUaDec').addEventListener('click', () => {
    caesarInputText.value = 'ДАФИНЦШЕИЮЯЗЩШФЬИТЧИВЮЯШХСЯЯЗВИЇШЧШЮФЬСПЄСПИЇОЛРПЧИЦРЗФЬРІИЇЇШЛСЯИФСЦРЇЧЄШЦАСЇШЧШІСХЗЧИЮДАФИНЧИЮЮИЦРВЧМЦИУШЙШЧСЛМЇСЛЯШЙШЕШЇШЧШЮФЬСПЄ';
    caesarKeyInput.value = 10;
    caesarLangSelect.value = 'ua';
    state.caesarMode = 'decrypt';
    document.querySelectorAll('#caesarModeToggle .toggle-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === 'decrypt')
    );
    updateCaesar(true);
  });

  document.getElementById('caesarFirstBtn').addEventListener('click', () => {
    state.caesarStepIdx = 0;
    renderCaesarStep();
  });
  document.getElementById('caesarPrevBtn').addEventListener('click', () => {
    if (!state.caesarResult) return;
    state.caesarStepIdx = Math.max(0, state.caesarStepIdx - 1);
    renderCaesarStep();
  });
  document.getElementById('caesarNextBtn').addEventListener('click', () => {
    if (!state.caesarResult) return;
    state.caesarStepIdx = (state.caesarStepIdx + 1) % Math.max(1, state.caesarResult.steps.length);
    renderCaesarStep();
  });
  document.getElementById('caesarPlayBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (state.caesarTimer) {
      clearInterval(state.caesarTimer);
      state.caesarTimer = null;
      btn.textContent = '[Авто]';
    } else {
      btn.textContent = '[Пауза]';
      state.caesarTimer = setInterval(() => {
        if (!state.caesarResult || state.caesarResult.steps.length === 0) return;
        state.caesarStepIdx = (state.caesarStepIdx + 1) % state.caesarResult.steps.length;
        renderCaesarStep();
      }, 650);
    }
  });

  // ============================================================================
  // LAB 1.2: FREQUENCY ANALYSIS CONTROLLER
  // ============================================================================
  const freqInputText = document.getElementById('freqInputText');

  function updateFrequencyAnalysis() {
    const cipher = freqInputText.value;
    const analysis = E.runFrequencyAnalysis(cipher, 'auto');

    document.getElementById('freqDeductionBanner').innerHTML = `
      <div><b>[МАТЕМАТИЧНИЙ ВИСНОВОК КРИПТОАНАЛІЗАТОРА]:</b> ${analysis.formulaExplanation}</div>
    `;

    V.renderFrequencyChart(document.getElementById('freqChartContainer'), analysis);

    const N = analysis.alphabet.length;
    let t14Html = `<div class="alphabet-ribbon-grid" style="grid-template-columns: 90px repeat(${N}, minmax(26px, 1fr));">`;
    t14Html += `<div class="ribbon-row-label">Літера</div>`;
    analysis.letterStats.forEach(st => {
      const isPeak = st.char === analysis.mostFrequentCipher.char && st.count > 0;
      t14Html += `<div class="ribbon-cell orig-cell ${isPeak ? 'active-target' : ''}">${st.char}</div>`;
    });
    t14Html += `<div class="ribbon-row-label">Кількість</div>`;
    analysis.letterStats.forEach(st => {
      const isPeak = st.char === analysis.mostFrequentCipher.char && st.count > 0;
      t14Html += `<div class="ribbon-cell shifted-cell ${isPeak ? 'active-target' : ''}">${st.count}</div>`;
    });
    t14Html += `</div>`;
    document.getElementById('freqTable14Container').innerHTML = t14Html;

    const candContainer = document.getElementById('freqCandidatesList');
    const decOutput = document.getElementById('freqDecryptedOutput');
    decOutput.textContent = analysis.primaryDecrypted;

    candContainer.innerHTML = analysis.candidates.map((cand, i) => `
      <div class="candidate-row ${i === 0 ? 'active-candidate' : ''}" data-key="${cand.key}">
        <div>
          <span class="cyan-text" style="font-weight:800;">K = ${cand.key}</span>
          ${cand.isPrimaryMatch ? '<span style="color:#10b981;font-size:10.5px;margin-left:6px;">[За формулою піку Табл. 1.4]</span>' : ''}
          <div style="color:#cbd5e1;font-size:11px;margin-top:2px;">${cand.preview}</div>
        </div>
        <button class="cyber-btn btn-sm">Обрати</button>
      </div>
    `).join('');

    candContainer.querySelectorAll('.candidate-row').forEach(row => {
      row.addEventListener('click', () => {
        candContainer.querySelectorAll('.candidate-row').forEach(r => r.classList.remove('active-candidate'));
        row.classList.add('active-candidate');
        const chosenK = parseInt(row.dataset.key, 10);
        const dec = E.runCaesar(cipher, chosenK, 'decrypt', analysis.lang).output;
        decOutput.textContent = dec;
      });
    });
  }

  freqInputText.addEventListener('input', updateFrequencyAnalysis);

  document.getElementById('presetFreqManual').addEventListener('click', () => {
    freqInputText.value = 'ДАФИНЦШЕИЮЯЗЩШФЬИТЧИВЮЯШХСЯЯЗВИЇШЧШЮФЬСПЄСПИЇОЛРПЧИЦРЗФЬРІИЇЇШЛСЯИФСЦРЇЧЄШЦАСЇШЧШІСХЗЧИЮДАФИНЧИЮЮИЦРВЧМЦИУШЙШЧСЛМЇСЛЯШЙШЕШЇШЧШЮФЬСПЄ';
    updateFrequencyAnalysis();
  });

  document.getElementById('presetFreqEnSample').addEventListener('click', () => {
    const sampleEnPlain = 'CRYPTOGRAPHY AND NETWORK SECURITY IS THE FOUNDATION OF MODERN CYBER DEFENSE AND SECURE COMMUNICATION';
    freqInputText.value = E.runCaesar(sampleEnPlain, 7, 'encrypt', 'en').output;
    updateFrequencyAnalysis();
  });

  // ============================================================================
  // LAB 1.3: COLUMNAR TRANSPOSITION CIPHER CONTROLLER
  // ============================================================================
  const transInputText = document.getElementById('transInputText');
  const transKeyInput = document.getElementById('transKeyInput');

  function updateTransposition(resetStep = false) {
    const text = transInputText.value;
    const keyWord = transKeyInput.value || 'Шифр';
    state.transResult = E.runTransposition(text, keyWord, state.transMode);
    if (!state.transResult) return;

    const formattedOut = state.transResult.output.replace(/ /g, '_');
    document.getElementById('transOutputText').innerHTML =
      `<span>${state.transResult.output}</span> <span style="color:#64748b;font-size:12px;margin-left:8px;">(${formattedOut})</span>`;

    if (resetStep) state.transStepIdx = null;
    renderTranspositionStep();
  }

  function renderTranspositionStep() {
    const res = state.transResult;
    if (!res) return;

    V.renderTranspositionMatrix(
      document.getElementById('transMatrixContainer'),
      res,
      state.transStepIdx
    );

    const stepObj = state.transStepIdx !== null ? res.steps[state.transStepIdx] : null;
    document.getElementById('transStepCounter').textContent =
      stepObj ? `Стовпець за рангом ${stepObj.rank} / ${res.cols}` : `Усі ${res.cols} стовпці`;
    document.getElementById('transStepDesc').textContent =
      stepObj ? stepObj.description : `Порядок стовпців за ключем «${res.keyWord}»: [${res.ranks.join(', ')}]`;

    const listEl = document.getElementById('transStepsList');
    listEl.innerHTML = res.steps.map((st, idx) => `
      <div class="trace-item ${state.transStepIdx === idx ? 'active-trace' : ''}" data-idx="${idx}">
        ${st.description}
      </div>
    `).join('');

    listEl.querySelectorAll('.trace-item').forEach(item => {
      item.addEventListener('click', () => {
        state.transStepIdx = parseInt(item.dataset.idx, 10);
        renderTranspositionStep();
      });
    });
  }

  transInputText.addEventListener('input', () => updateTransposition(false));
  transKeyInput.addEventListener('input', () => updateTransposition(true));

  document.querySelectorAll('#transModeToggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#transModeToggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.transMode = btn.dataset.mode;
      updateTransposition(true);
    });
  });

  document.getElementById('presetTransManual').addEventListener('click', () => {
    transInputText.value = 'Прикладна математика';
    transKeyInput.value = 'Шифр';
    state.transMode = 'encrypt';
    document.querySelectorAll('#transModeToggle .toggle-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === 'encrypt')
    );
    updateTransposition(true);
  });

  document.getElementById('presetTransDecrypt').addEventListener('click', () => {
    transInputText.value = 'ра еикнаааидммкплатт';
    transKeyInput.value = 'Шифр';
    state.transMode = 'decrypt';
    document.querySelectorAll('#transModeToggle .toggle-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === 'decrypt')
    );
    updateTransposition(true);
  });

  document.getElementById('transPrevBtn').addEventListener('click', () => {
    if (!state.transResult) return;
    if (state.transStepIdx === null || state.transStepIdx <= 0) {
      state.transStepIdx = state.transResult.steps.length - 1;
    } else {
      state.transStepIdx--;
    }
    renderTranspositionStep();
  });

  document.getElementById('transNextBtn').addEventListener('click', () => {
    if (!state.transResult) return;
    if (state.transStepIdx === null) {
      state.transStepIdx = 0;
    } else {
      state.transStepIdx = (state.transStepIdx + 1) % state.transResult.steps.length;
    }
    renderTranspositionStep();
  });

  document.getElementById('transAllBtn').addEventListener('click', () => {
    state.transStepIdx = null;
    renderTranspositionStep();
  });

  document.getElementById('transPlayBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (state.transTimer) {
      clearInterval(state.transTimer);
      state.transTimer = null;
      btn.textContent = '[Покроково]';
    } else {
      btn.textContent = '[Стоп]';
      state.transStepIdx = 0;
      renderTranspositionStep();
      state.transTimer = setInterval(() => {
        if (!state.transResult) return;
        state.transStepIdx = (state.transStepIdx + 1) % state.transResult.steps.length;
        renderTranspositionStep();
      }, 950);
    }
  });

  // ============================================================================
  // LAB 2: SHA-256 USER DB, /LOGIN & JWT INSPECTOR CONTROLLER
  // ============================================================================
  function getAllLab2Users() {
    const activeId = state.groupId;
    return E.GROUP_STUDENTS.map(stu => {
      const isMe = stu.id === activeId;
      const login = isMe ? state.lastName : stu.lastName;
      const passwordPlain = isMe ? state.firstName : stu.firstName;
      const fullName = `${stu.lastName} ${stu.firstName} ${stu.patronymic}`.trim();
      let badge = '';
      if (isMe) badge = ' [ВИ — ЗА ЗАМОВЧУВАННЯМ]';
      else if (stu.id === activeId - 1) badge = ' [Сусід вище у списку]';
      else if (stu.id === activeId + 1) badge = ' [Сусід нижче у списку]';

      return {
        id: stu.id,
        fullName: fullName + badge,
        login,
        passwordPlain,
        passwordHash: E.sha256Hex(passwordPlain),
        isMe,
        isTriad: stu.id === activeId || stu.id === activeId - 1 || stu.id === activeId + 1
      };
    });
  }

  function getJwtSecret() {
    return `${state.firstNameEn || state.firstName}${state.lastNameEn || state.lastName}`;
  }

  function renderLab2Database() {
    const allUsers = getAllLab2Users();
    const visibleUsers = state.lab2DbFilter === 'triad'
      ? allUsers.filter(u => u.isTriad)
      : allUsers;

    const tbody = document.getElementById('lab2UsersTbody');
    document.getElementById('lab2SecretDisplay').textContent = getJwtSecret();
    document.getElementById('lab2TtlDisplay').textContent = state.groupId;

    tbody.innerHTML = visibleUsers.map((u) => `
      <tr style="${u.isMe ? 'background:rgba(0, 240, 255, 0.14);font-weight:700;' : ''}">
        <td><span class="cyan-text">${u.id}</span></td>
        <td><b>${u.fullName}</b></td>
        <td><code>${u.login}</code></td>
        <td><code>${u.passwordPlain}</code></td>
        <td class="hash-cell"><code>${u.passwordHash}</code></td>
        <td>
          <button class="cyber-btn btn-sm fill-login-btn" data-login="${u.login}" data-pass="${u.passwordPlain}">
            Обрати для входу
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.fill-login-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('postmanLoginInput').value = btn.dataset.login;
        document.getElementById('postmanPassInput').value = btn.dataset.pass;
        runLab2LoginSimulation();
      });
    });
  }

  document.querySelectorAll('#lab2DbFilterToggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#lab2DbFilterToggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.lab2DbFilter = btn.dataset.filter;
      renderLab2Database();
    });
  });

  function runLab2LoginSimulation() {
    const loginVal = document.getElementById('postmanLoginInput').value.trim();
    const passVal = document.getElementById('postmanPassInput').value.trim();
    const inputHash = E.sha256Hex(passVal);
    const users = getAllLab2Users();
    const matchedUser = users.find(u => u.login.toLowerCase() === loginVal.toLowerCase());
    const isAuthOk = matchedUser && matchedUser.passwordHash === inputHash;

    const pipelineEl = document.getElementById('loginHashPipeline');
    if (isAuthOk) {
      const ttlUnit = document.getElementById('lab2TtlUnit').value;
      const ttlSec = ttlUnit === 'min' ? state.groupId * 60 : state.groupId;
      const nowSec = Math.floor(Date.now() / 1000);

      const payload = {
        id: matchedUser.id,
        login: matchedUser.login,
        iat: nowSec,
        exp: nowSec + ttlSec
      };

      const jwtObj = E.generateJwtHS256(payload, getJwtSecret());
      state.currentJwtObj = jwtObj;
      document.getElementById('postmanBearerToken').value = jwtObj.token;

      pipelineEl.innerHTML = `
        <div style="color:#10b981;font-weight:700;margin-bottom:6px;">
          [HTTP 200 OK]: Користувач «${matchedUser.login}» (id=${matchedUser.id}) був успішно авторизований!
        </div>
        <div>1. Введений пароль: <code>"${passVal}"</code> -> SHA-256: <code style="color:#93c5fd;">${inputHash}</code></div>
        <div>2. Хеш у БД для <code>${matchedUser.login}</code>: <code style="color:#10b981;">${matchedUser.passwordHash}</code> (ЗБІГ 100%)</div>
        <div style="margin-top:6px;">3. Згенеровано JWT (Secret = <code>${getJwtSecret()}</code>, TTL = ${state.groupId} ${ttlUnit === 'min' ? 'хв' : 'с'}). Токен підставлено у <code>Authorization: Bearer</code> нижче!</div>
      `;

      renderJwtInspector(jwtObj.token);
      runLab2ProtectedCheck();
    } else {
      pipelineEl.innerHTML = `
        <div style="color:#f43f5e;font-weight:700;margin-bottom:6px;">
          [HTTP 401 UNAUTHORIZED]: Помилка авторизації на /login!
        </div>
        <div>1. Введений пароль: <code>"${passVal}"</code> -> SHA-256: <code style="color:#fda4af;">${inputHash}</code></div>
        <div>2. Очікуваний хеш у БД: <code>${matchedUser ? matchedUser.passwordHash : 'Користувача з таким прізвищем не знайдено в БД'}</code></div>
      `;
    }
  }

  function runLab2ProtectedCheck() {
    const tokenStr = document.getElementById('postmanBearerToken').value.trim();
    const secret = getJwtSecret();
    const ver = E.verifyJwtHS256(tokenStr, secret);
    const box = document.getElementById('protectedResponseBox');

    if (ver.valid) {
      box.innerHTML = `
        <div style="color:#10b981;font-weight:800;">
          [HTTP 200 OK] — Доступ до захищеного маршруту /protected ДОЗВОЛЕНО!
        </div>
        <div style="margin-top:4px;color:#cbd5e1;">
          Розшифровані дані з токена: <code>id = ${ver.payloadObj.id}</code>, <code>login = "${ver.payloadObj.login}"</code>,
          залишок часу дії: <b>${ver.remainingSec} с</b>.
        </div>
      `;
    } else {
      box.innerHTML = `
        <div style="color:#f43f5e;font-weight:800;">
          [HTTP 401 UNAUTHORIZED] — Доступ ЗАБОРОНЕНО!
        </div>
        <div style="margin-top:4px;color:#fda4af;">
          Причина: ${ver.reason}
        </div>
      `;
    }
    renderJwtInspector(tokenStr);
  }

  function renderJwtInspector(tokenStr) {
    const secret = getJwtSecret();
    const ver = E.verifyJwtHS256(tokenStr, secret);
    const parts = (tokenStr || '').split('.');

    if (parts.length === 3) {
      document.getElementById('jwtColoredString').innerHTML = `
        <span class="jwt-str-header">${parts[0]}</span><span class="jwt-dot">.</span><span class="jwt-str-payload">${parts[1]}</span><span class="jwt-dot">.</span><span class="jwt-str-sig">${parts[2]}</span>
      `;
    } else {
      document.getElementById('jwtColoredString').textContent = tokenStr;
    }

    if (ver.headerObj && ver.payloadObj) {
      document.getElementById('jwtHeaderJsonPre').textContent = JSON.stringify(ver.headerObj, null, 2);
      document.getElementById('jwtHeaderB64Code').textContent = ver.headerB64;

      document.getElementById('jwtPayloadJsonPre').textContent = JSON.stringify(ver.payloadObj, null, 2);
      document.getElementById('jwtPayloadB64Code').textContent = ver.payloadB64;

      document.getElementById('jwtSigFormulaPre').textContent =
`HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  "${secret}"
)`;
      document.getElementById('jwtSigB64Code').textContent =
        `У токені:   ${ver.sigProvided}\nОчікується: ${ver.expectedSigB64}`;
    }

    const banner = document.getElementById('jwtVerificationBanner');
    if (ver.valid) {
      banner.style.borderColor = '#10b981';
      banner.innerHTML = `<b>[ПІДПИС ВЕРИФІКОВАНО]:</b> ${ver.reason}`;
    } else {
      banner.style.borderColor = '#f43f5e';
      banner.innerHTML = `<b>[ПІДПИС НЕДІЙСНИЙ / ТОКЕН ВІДХИЛЕНО]:</b> ${ver.reason}`;
    }
  }

  document.getElementById('btnSendLogin').addEventListener('click', runLab2LoginSimulation);
  document.getElementById('lab2TtlUnit').addEventListener('change', runLab2LoginSimulation);
  document.getElementById('btnSendProtected').addEventListener('click', runLab2ProtectedCheck);
  document.getElementById('postmanBearerToken').addEventListener('input', runLab2ProtectedCheck);

  document.getElementById('btnTamperJwt').addEventListener('click', () => {
    if (!state.currentJwtObj) return;
    const fakePayload = { ...state.currentJwtObj.payloadObj, id: 999, login: 'HACKER_ADMIN' };
    const fakePayloadB64 = E.strToBase64Url(JSON.stringify(fakePayload));
    const tamperedToken = `${state.currentJwtObj.headerB64}.${fakePayloadB64}.${state.currentJwtObj.signatureB64}`;
    document.getElementById('postmanBearerToken').value = tamperedToken;
    runLab2ProtectedCheck();
  });

  document.getElementById('btnRestoreJwt').addEventListener('click', () => {
    runLab2LoginSimulation();
  });

  // Lab 2.3: OAuth 2.0 Authorization Code Flow Interactive Diagram
  const OAUTH_STEPS = [
    { step: 1, from: 'User', to: 'App', label: '1. click login link (Натискає «Увійти через Facebook / Google»)', desc: 'Користувач ініціює вхід у додатку (наприклад, Tinder) за допомогою стороннього провайдера.' },
    { step: 2, from: 'App', to: 'AuthServer', label: '2. request Authorization Code', desc: 'Додаток формує запит на авторизацію до Сервера Авторизації.' },
    { step: 3, from: 'AuthServer', to: 'User', label: '3. redirect to login/authorization prompt', desc: 'Сервер Авторизації перенаправляє користувача на форму входу та підтвердження прав доступу.' },
    { step: 4, from: 'User', to: 'AuthServer', label: '4. authenticate and consent', desc: 'Користувач вводить свої облікові дані на сервері провайдера та надає згоду.' },
    { step: 5, from: 'AuthServer', to: 'App', label: '5. Authorization Code', desc: 'Сервер Авторизації повертає додатку одноразовий тимчасовий Authorization Code.' },
    { step: 6, from: 'App', to: 'AuthServer', label: '6. Authorization Code + Client ID + Client Secret', desc: 'Бекенд додатка обмінює код разом зі своїми Client ID та Client Secret на токени.' },
    { step: 7, from: 'AuthServer', to: 'App', label: '7. validate & provide ID Token and Access Token (JWT)', desc: 'Сервер Авторизації перевіряє дані й видає підписані JWT (ID Token та Access Token).' },
    { step: 8, from: 'App', to: 'API', label: '8. request user data with Access Token -> send response', desc: 'Додаток звертається до захищеного API із заголовком Authorization: Bearer <JWT> та отримує дані.' }
  ];

  function renderOAuthFlow() {
    const container = document.getElementById('oauthFlowContainer');
    if (!container) return;
    const active = OAUTH_STEPS[state.oauthStepIdx];

    container.innerHTML = `
      <div class="deduction-banner" style="margin-bottom:12px;">
        <b>Активний етап (${active.step} / 8):</b> ${active.label} — ${active.desc}
      </div>
      <div class="dh-timeline-grid">
        ${OAUTH_STEPS.map((st, idx) => `
          <div class="dh-step-card ${idx === state.oauthStepIdx ? 'active-dh-step' : ''}" data-oauth-idx="${idx}">
            <div class="dh-step-title">${st.label}</div>
            <div class="dh-knows-line">Напрямок: <b>${st.from} -> ${st.to}</b></div>
            <div class="dh-knows-line" style="color:#94a3b8;">${st.desc}</div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('[data-oauth-idx]').forEach(card => {
      card.addEventListener('click', () => {
        state.oauthStepIdx = parseInt(card.dataset.oauthIdx, 10);
        renderOAuthFlow();
      });
    });
  }

  document.getElementById('oauthPrevBtn').addEventListener('click', () => {
    state.oauthStepIdx = (state.oauthStepIdx - 1 + OAUTH_STEPS.length) % OAUTH_STEPS.length;
    renderOAuthFlow();
  });
  document.getElementById('oauthNextBtn').addEventListener('click', () => {
    state.oauthStepIdx = (state.oauthStepIdx + 1) % OAUTH_STEPS.length;
    renderOAuthFlow();
  });

  // ============================================================================
  // LAB 3 (FORMER LAB 5): S-DES FULL BIT-LEVEL DEBUGGER & 25 VARIANTS
  // ============================================================================
  const sdesBlockInput = document.getElementById('sdesBlockInput');
  const sdesKeyInput = document.getElementById('sdesKeyInput');
  const sdesModeSelect = document.getElementById('sdesModeSelect');
  const sdesS1Select = document.getElementById('sdesS1Select');

  function updateSDES(resetStep = false) {
    const block8 = sdesBlockInput.value.trim();
    const key10 = sdesKeyInput.value.trim();
    const mode = sdesModeSelect.value;
    const s1Mode = sdesS1Select.value;

    state.sdesResult = E.runSDES(block8, key10, mode, s1Mode);
    if (resetStep) state.sdesStepIdx = 0;

    renderSdesSummaryRibbon();
    renderSdesActiveStep();
    renderSdesFullProtocol();
    renderSdesAllVariantsTable();
  }

  function renderSdesSummaryRibbon() {
    const res = state.sdesResult;
    if (!res) return;
    const firstKeyLabel = res.mode === 'encrypt' ? 'K1' : 'K2';
    const secondKeyLabel = res.mode === 'encrypt' ? 'K2' : 'K1';

    document.getElementById('sdesPipelineRibbon').innerHTML = `
      <div class="pipe-stage">
        <div class="pipe-label">ВХІД (8 біт)</div>
        <div class="pipe-bits">${res.inputBlock}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">1. ВИХІД IP</div>
        <div class="pipe-bits">${res.afterIP}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">2. ВИХІД f_K (${firstKeyLabel})</div>
        <div class="pipe-bits">${res.round1.outputBlock}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">3. ВИХІД SW</div>
        <div class="pipe-bits">${res.afterSW}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">4. ВИХІД f_K (${secondKeyLabel})</div>
        <div class="pipe-bits">${res.round2.outputBlock}</div>
      </div>
      <div class="pipe-stage">
        <div class="pipe-label">5. ВИХІД IP-1</div>
        <div class="pipe-bits">${res.finalBits}</div>
      </div>
      <div class="pipe-stage final-dec">
        <div class="pipe-label">ДЕСЯТКОВЕ ЧИСЛО</div>
        <div class="pipe-bits">${res.decimalValue}</div>
      </div>
    `;
  }

  function renderSdesActiveStep() {
    const res = state.sdesResult;
    if (!res) return;
    const step = res.steps[state.sdesStepIdx] || res.steps[0];

    document.getElementById('sdesStepCounter').textContent = `Етап ${state.sdesStepIdx + 1} / ${res.steps.length}: ${step.stage}`;
    document.getElementById('sdesStepFormula').textContent = step.formula;
    document.getElementById('sdesWireTitle').textContent = `Комутація бітів: ${step.stage}`;

    V.renderBitPermutationSVG(
      document.getElementById('sdesWireContainer'),
      step.inBits,
      step.outBits,
      step.PermTable,
      step.tableUsed
    );

    const ks = res.keySchedule;
    document.getElementById('sdesKeyGenDetailBox').innerHTML = `
      <div class="secret-config-banner">
        <div><b>Ключ (10 біт):</b> <code>${ks.key10}</code> -> <b>P10:</b> <code>${ks.afterP10}</code> -> <b>LS-1:</b> <code>${ks.ls1Left} ${ks.ls1Right}</code> -> <b class="cyan-text">K1 = ${ks.K1}</b></div>
        <div><b>Зсув LS-2:</b> <code>${ks.ls2Left} ${ks.ls2Right}</code> -> <b>P8:</b> <b style="color:#10b981;">K2 = ${ks.K2}</b></div>
      </div>
    `;

    if (state.sdesStepIdx === 3 || state.sdesStepIdx === 4) state.sdesActiveRoundSbox = 1;
    if (state.sdesStepIdx === 6 || state.sdesStepIdx === 7) state.sdesActiveRoundSbox = 2;

    document.getElementById('btnShowRound1Sbox').classList.toggle('active', state.sdesActiveRoundSbox === 1);
    document.getElementById('btnShowRound2Sbox').classList.toggle('active', state.sdesActiveRoundSbox === 2);

    const activeRound = state.sdesActiveRoundSbox === 1 ? res.round1 : res.round2;
    V.renderSBoxMatrices(
      document.getElementById('sdesSboxContainer'),
      activeRound.s0Res,
      activeRound.s1Res,
      res.s1Mode
    );
  }

  function renderSdesFullProtocol() {
    const res = state.sdesResult;
    if (!res) return;
    const ks = res.keySchedule;
    const r1 = res.round1;
    const r2 = res.round2;

    const decTerms = res.decimalBreakdown
      .map(d => `${d.bit}*2^${d.power}(${d.term})`)
      .join(' + ');

    document.getElementById('sdesFullProtocolContainer').innerHTML = `
      <div class="protocol-step-box">
        <div class="dh-step-title">ЕТАП 0: Генерація підключів K1 та K2</div>
        <div>• Вхідний ключ K (10 біт): <b>${ks.key10}</b></div>
        <div>• Перестановка P10 [3 5 2 7 4 10 1 9 8 6]: <b>${ks.afterP10}</b> (${ks.left0} | ${ks.right0})</div>
        <div>• Циклічний зсув ліворуч на 1 (LS-1): <b>${ks.ls1Left} | ${ks.ls1Right}</b></div>
        <div>• Перестановка P8 [6 3 7 4 8 5 10 9] -> <b>K1 = ${ks.K1}</b></div>
        <div>• Циклічний зсув ліворуч на 2 (LS-2): <b>${ks.ls2Left} | ${ks.ls2Right}</b></div>
        <div>• Перестановка P8 [6 3 7 4 8 5 10 9] -> <b>K2 = ${ks.K2}</b></div>
      </div>

      <div class="protocol-step-box">
        <div class="dh-step-title">ЕТАП 1 та 2: Початкова перестановка IP та Раунд 1 (підключ ${r1.subkeyName} = ${r1.subkey8})</div>
        <div>• Вхідний 8-бітний блок: <b>${res.inputBlock}</b> -> <b>IP = ${res.afterIP}</b> (L0 = <b>${r1.L}</b>, R0 = <b>${r1.R}</b>)</div>
        <div>• Розширення E/P(R0) [4 1 2 3 2 3 4 1]: <b>${r1.epOut}</b></div>
        <div>• E/P(R0) XOR ${r1.subkeyName}: ${r1.epOut} XOR ${r1.subkey8} = <b>${r1.xorKeyOut}</b> (${r1.p0Row} | ${r1.p1Row})</div>
        <div>• Модуль S0(${r1.p0Row}): рядок ${r1.s0Res.rowBits}(${r1.s0Res.row}), стовпець ${r1.s0Res.colBits}(${r1.s0Res.col}) -> <b>${r1.s0Res.val} = ${r1.s0Res.outBits}</b></div>
        <div>• Модуль S1(${r1.p1Row}): рядок ${r1.s1Res.rowBits}(${r1.s1Res.row}), стовпець ${r1.s1Res.colBits}(${r1.s1Res.col}) -> <b>${r1.s1Res.val} = ${r1.s1Res.outBits}</b></div>
        <div>• P4(${r1.sCombined}) = <b>${r1.p4Out}</b> -> L0 XOR P4 = ${r1.L} XOR ${r1.p4Out} = <b>${r1.newL}</b> -> Вихід f_K = <b>${r1.outputBlock}</b></div>
      </div>

      <div class="protocol-step-box">
        <div class="dh-step-title">ЕТАП 3 та 4: Перестановка SW та Раунд 2 (підключ ${r2.subkeyName} = ${r2.subkey8})</div>
        <div>• Перемикач половин SW(${r1.outputBlock}) = <b>${res.afterSW}</b> (L1 = <b>${r2.L}</b>, R1 = <b>${r2.R}</b>)</div>
        <div>• Розширення E/P(R1): <b>${r2.epOut}</b> -> E/P(R1) XOR ${r2.subkeyName} = <b>${r2.xorKeyOut}</b> (${r2.p0Row} | ${r2.p1Row})</div>
        <div>• Модуль S0(${r2.p0Row}): рядок ${r2.s0Res.rowBits}(${r2.s0Res.row}), стовпець ${r2.s0Res.colBits}(${r2.s0Res.col}) -> <b>${r2.s0Res.val} = ${r2.s0Res.outBits}</b></div>
        <div>• Модуль S1(${r2.p1Row}): рядок ${r2.s1Res.rowBits}(${r2.s1Res.row}), стовпець ${r2.s1Res.colBits}(${r2.s1Res.col}) -> <b>${r2.s1Res.val} = ${r2.s1Res.outBits}</b></div>
        <div>• P4(${r2.sCombined}) = <b>${r2.p4Out}</b> -> L1 XOR P4 = ${r2.L} XOR ${r2.p4Out} = <b>${r2.newL}</b> -> Вихід f_K = <b>${r2.outputBlock}</b></div>
      </div>

      <div class="protocol-step-box">
        <div class="dh-step-title">ЕТАП 5: Обернена перестановка IP-1 та Переведення у Десяткове Число</div>
        <div>• Перестановка IP-1 [4 1 3 5 7 2 8 6] від (${r2.outputBlock}): <b style="color:#00f0ff;font-size:14px;">${res.finalBits}</b></div>
        <div style="margin-top:6px;">• Перетворення у десяткову систему:</div>
        <div style="color:#cbd5e1;font-size:11px;">${decTerms}</div>
        <div style="margin-top:6px;color:#10b981;font-size:15px;font-weight:800;">• Відповідь: ${res.finalBits} (двійкове) = ${res.decimalValue} (десяткове)</div>
      </div>
    `;
  }

  function renderSdesAllVariantsTable() {
    const tbody = document.getElementById('sdesAllVariantsTbody');
    if (!tbody) return;
    const s1Mode = sdesS1Select.value;
    const key10 = sdesKeyInput.value.trim() || E.SDES_DEFAULT_KEY;

    tbody.innerHTML = E.SDES_VARIANTS.map(v => {
      const r = E.runSDES(v.cipher, key10, 'decrypt', s1Mode);
      const isSelected = v.variant === state.variant;
      const stu = E.GROUP_STUDENTS.find(s => s.id === v.variant);
      const fullName = stu ? `${stu.lastName} ${stu.firstName} ${stu.patronymic}`.trim() : '';
      return `
        <tr style="${isSelected ? 'background:rgba(0, 240, 255, 0.14);font-weight:700;' : ''}" data-var="${v.variant}">
          <td><span class="cyan-text">Варіант ${v.variant}</span></td>
          <td>${fullName}</td>
          <td><code>${v.cipher}</code></td>
          <td><code>${r.afterIP}</code></td>
          <td><code>${r.round1.outputBlock}</code></td>
          <td><code>${r.afterSW}</code></td>
          <td><code>${r.round2.outputBlock}</code></td>
          <td><b style="color:#00f0ff;">${r.finalBits}</b></td>
          <td><b style="color:#10b981;font-size:13.5px;">${r.decimalValue}</b></td>
          <td><button class="cyber-btn btn-sm load-var-btn" data-var="${v.variant}">Дослідити</button></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.load-var-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const vNum = parseInt(btn.dataset.var, 10);
        globalVarSel.value = String(vNum);
        syncOperativeProfile(true);
        document.querySelector('[data-subtab="lab3-debugger"]').click();
      });
    });
  }

  sdesVarSel.addEventListener('change', () => {
    globalVarSel.value = sdesVarSel.value;
    syncOperativeProfile(true);
  });

  sdesBlockInput.addEventListener('input', () => updateSDES(false));
  sdesKeyInput.addEventListener('input', () => updateSDES(false));
  sdesModeSelect.addEventListener('change', () => updateSDES(false));
  sdesS1Select.addEventListener('change', () => updateSDES(false));

  document.getElementById('presetSdesTaskKey').addEventListener('click', () => {
    sdesKeyInput.value = '0011011101';
    sdesModeSelect.value = 'decrypt';
    const found = E.SDES_VARIANTS.find(v => v.variant === state.variant);
    if (found) sdesBlockInput.value = found.cipher;
    updateSDES(true);
  });

  document.getElementById('presetSdesTheoryKey').addEventListener('click', () => {
    sdesKeyInput.value = '1010000010';
    updateSDES(true);
  });

  document.getElementById('btnShowRound1Sbox').addEventListener('click', () => {
    state.sdesActiveRoundSbox = 1;
    renderSdesActiveStep();
  });
  document.getElementById('btnShowRound2Sbox').addEventListener('click', () => {
    state.sdesActiveRoundSbox = 2;
    renderSdesActiveStep();
  });

  document.getElementById('sdesFirstBtn').addEventListener('click', () => {
    state.sdesStepIdx = 0;
    renderSdesActiveStep();
  });
  document.getElementById('sdesPrevBtn').addEventListener('click', () => {
    if (!state.sdesResult) return;
    state.sdesStepIdx = Math.max(0, state.sdesStepIdx - 1);
    renderSdesActiveStep();
  });
  document.getElementById('sdesNextBtn').addEventListener('click', () => {
    if (!state.sdesResult) return;
    state.sdesStepIdx = (state.sdesStepIdx + 1) % state.sdesResult.steps.length;
    renderSdesActiveStep();
  });
  document.getElementById('sdesPlayBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (state.sdesTimer) {
      clearInterval(state.sdesTimer);
      state.sdesTimer = null;
      btn.textContent = '[Авто-Трасування]';
    } else {
      btn.textContent = '[Пауза]';
      state.sdesTimer = setInterval(() => {
        if (!state.sdesResult) return;
        state.sdesStepIdx = (state.sdesStepIdx + 1) % state.sdesResult.steps.length;
        renderSdesActiveStep();
      }, 1300);
    }
  });

  // ============================================================================
  // LAB 4: DIFFIE-HELLMAN & MITM CONTROLLER
  // ============================================================================
  const dhInputP = document.getElementById('dhInputP');
  const dhInputG = document.getElementById('dhInputG');
  const dhInputA = document.getElementById('dhInputA');
  const dhInputB = document.getElementById('dhInputB');
  const dhInputC1 = document.getElementById('dhInputC1');
  const dhInputC2 = document.getElementById('dhInputC2');

  function updateDiffieHellman(resetToLast = false) {
    const p = Math.max(3, parseInt(dhInputP.value, 10) || 331);
    const g = Math.max(2, parseInt(dhInputG.value, 10) || 204);
    const a = Math.max(1, parseInt(dhInputA.value, 10) || 46);
    const b = Math.max(1, parseInt(dhInputB.value, 10) || 56);
    const c1 = Math.max(1, parseInt(dhInputC1.value, 10) || 33);
    const c2 = Math.max(1, parseInt(dhInputC2.value, 10) || 71);

    document.getElementById('dhFieldC1').style.opacity = state.dhMode === 'mitm' ? '1' : '0.4';
    document.getElementById('dhFieldC2').style.opacity = state.dhMode === 'mitm' ? '1' : '0.4';

    if (state.dhMode === 'standard') {
      state.dhData = E.runDiffieHellmanStandard(p, g, a, b);
    } else {
      state.dhData = E.runDiffieHellmanMITM(p, g, a, b, c1, c2);
    }

    if (resetToLast || state.dhStepIdx >= state.dhData.steps.length) {
      state.dhStepIdx = state.dhData.steps.length - 1;
    }

    renderDiffieHellmanStep();
    renderDhMathTrace(p, g, a, b);
  }

  function renderDiffieHellmanStep() {
    const data = state.dhData;
    if (!data) return;
    const steps = data.steps;
    const active = steps[state.dhStepIdx] || steps[0];

    document.getElementById('dhStepCounter').textContent = `Етап ${active.step} / ${steps.length}: ${active.title}`;
    document.getElementById('dhStepFormula').textContent = active.formula;

    V.renderDHNetworkSVG(
      document.getElementById('dhTopologyContainer'),
      state.dhMode,
      data,
      state.dhStepIdx
    );

    const timelineEl = document.getElementById('dhStepsTimeline');
    timelineEl.innerHTML = steps.map((st, idx) => `
      <div class="dh-step-card ${idx === state.dhStepIdx ? 'active-dh-step' : ''}" data-dh-idx="${idx}">
        <div class="dh-step-title">Етап ${st.step}: ${st.title}</div>
        <div class="dh-knows-line">Формула: <code style="color:#fff;">${st.formula}</code></div>
        <div class="dh-knows-line">Алісі відомо: <span style="color:#00f0ff;">${st.aliceKnows}</span></div>
        <div class="dh-knows-line">Бобу відомо: <span style="color:#10b981;">${st.bobKnows}</span></div>
        <div class="dh-knows-line">${state.dhMode === 'mitm' ? 'Зловмиснику' : 'Перехоплювачу'}: <span style="color:#fda4af;">${st.attackerKnows || st.eveKnows}</span></div>
      </div>
    `).join('');

    timelineEl.querySelectorAll('[data-dh-idx]').forEach(card => {
      card.addEventListener('click', () => {
        state.dhStepIdx = parseInt(card.dataset.dhIdx, 10);
        renderDiffieHellmanStep();
      });
    });
  }

  function renderDhMathTrace(p, g, a, b) {
    const std = E.runDiffieHellmanStandard(p, g, a, b);
    const container = document.getElementById('dhMathTraceContainer');
    if (!container) return;

    const buildPowTable = (title, base, exp, mod, traceObj) => `
      <div class="cyber-card inner-subcard">
        <h3 class="sub-heading">${title}: ${base}^${exp} mod ${mod} = <span style="color:#10b981">${traceObj.result}</span></h3>
        <p class="card-desc">Двійкове представлення показника степеня: <code>${exp} (десяткове) = ${traceObj.binStr} (двійкове)</code></p>
        <table class="cyber-table">
          <thead>
            <tr>
              <th>Біт №</th>
              <th>Значення біта</th>
              <th>Степінь за mod ${mod}</th>
              <th>Накопичений результат</th>
            </tr>
          </thead>
          <tbody>
            ${traceObj.binarySteps.map(bs => `
              <tr>
                <td>${bs.bitPos}</td>
                <td><b style="color:${bs.bit === 1 ? '#00f0ff' : '#64748b'}">${bs.bit}</b></td>
                <td>${bs.powerVal}</td>
                <td>${bs.bit === 1 ? `${bs.prevResult} * ${bs.powerVal} mod ${mod} = <b>${bs.newResult}</b>` : `${bs.newResult} (пропуск)`}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML =
      buildPowTable('Відкритий ключ Аліси A', g, a, p, std.calcA) +
      buildPowTable('Відкритий ключ Боба B', g, b, p, std.calcB) +
      buildPowTable('Спільний секрет Аліси K = B^a mod p', std.B, a, p, std.calcKa) +
      buildPowTable('Спільний секрет Боба K = A^b mod p', std.A, b, p, std.calcKb);
  }

  [dhInputP, dhInputG, dhInputA, dhInputB, dhInputC1, dhInputC2].forEach(inp => {
    inp.addEventListener('input', () => updateDiffieHellman(false));
  });

  document.querySelectorAll('#dhModeToggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#dhModeToggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.dhMode = btn.dataset.mode;
      updateDiffieHellman(true);
    });
  });

  document.getElementById('presetDhManual').addEventListener('click', () => {
    dhInputP.value = 331;
    dhInputG.value = 204;
    dhInputA.value = 46;
    dhInputB.value = 56;
    updateDiffieHellman(true);
  });

  document.getElementById('presetDhClassic').addEventListener('click', () => {
    dhInputP.value = 23;
    dhInputG.value = 5;
    dhInputA.value = 6;
    dhInputB.value = 15;
    updateDiffieHellman(true);
  });

  document.getElementById('presetDhLarge').addEventListener('click', () => {
    dhInputP.value = 7919;
    dhInputG.value = 7;
    dhInputA.value = 123;
    dhInputB.value = 456;
    updateDiffieHellman(true);
  });

  document.getElementById('dhFirstBtn').addEventListener('click', () => {
    state.dhStepIdx = 0;
    renderDiffieHellmanStep();
  });
  document.getElementById('dhPrevBtn').addEventListener('click', () => {
    if (!state.dhData) return;
    state.dhStepIdx = Math.max(0, state.dhStepIdx - 1);
    renderDiffieHellmanStep();
  });
  document.getElementById('dhNextBtn').addEventListener('click', () => {
    if (!state.dhData) return;
    state.dhStepIdx = (state.dhStepIdx + 1) % state.dhData.steps.length;
    renderDiffieHellmanStep();
  });
  document.getElementById('dhPlayBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (state.dhTimer) {
      clearInterval(state.dhTimer);
      state.dhTimer = null;
      btn.textContent = '[Покрокова Демонстрація]';
    } else {
      btn.textContent = '[Зупинити]';
      state.dhStepIdx = 0;
      renderDiffieHellmanStep();
      state.dhTimer = setInterval(() => {
        if (!state.dhData) return;
        state.dhStepIdx = (state.dhStepIdx + 1) % state.dhData.steps.length;
        renderDiffieHellmanStep();
      }, 1400);
    }
  });

  // ============================================================================
  // FULL PERSONALIZED LAB REPORT GENERATOR MODAL
  // ============================================================================
  const reportModal = document.getElementById('reportModal');
  const reportModalBody = document.getElementById('reportModalBody');

  function buildFullReportHtml() {
    const sdesR = state.sdesResult;
    const dhStd = E.runDiffieHellmanStandard(331, 204, 46, 56);
    const dhMitm = E.runDiffieHellmanMITM(331, 204, 46, 56, 33, 71);
    const freqSample = E.runFrequencyAnalysis('ДАФИНЦШЕИЮЯЗЩШФЬИТЧИВЮЯШХСЯЯЗВИЇШЧШЮФЬСПЄСПИЇОЛРПЧИЦРЗФЬРІИЇЇШЛСЯИФСЦРЇЧЄШЦАСЇШЧШІСХЗЧИЮДАФИНЧИЮЮИЦРВЧМЦИУШЙШЧСЛМЇСЛЯШЙШЕШЇШЧШЮФЬСПЄ', 'ua');

    return `
      <div style="border-bottom:1px solid #1e3a8a;padding-bottom:12px;margin-bottom:16px;">
        <h3 style="color:#00f0ff;font-size:16px;">ЗВІТ З ЛАБОРАТОРНИХ РОБІТ (ЛАБОРАТОРНІ №1, №2, №3, №4)</h3>
        <div>Виконав(ла): <b>${state.firstName} ${state.lastName}</b> | № у списку групи: <b>${state.groupId}</b> | Варіант S-DES: <b>${state.variant}</b></div>
      </div>

      <h4 style="color:#10b981;margin:12px 0 6px;">1. Лабораторна робота №1: Шифр Цезаря, Частотний аналіз та Шифр перестановки</h4>
      <div>• Шифр Цезаря ("HONEY, I AM HOME", K=3): <code>KRQHB, L DP KRPH</code></div>
      <div>• Частотний криптоаналіз: Найчастіша літера криптограми — «${freqSample.mostFrequentCipher.char}» (${freqSample.mostFrequentCipher.count} разів, індекс ${freqSample.mostFrequentCipher.index}). Еталонна літера укр. мови — «О» (індекс 18). Ключ K = 28 - 18 = 10.</div>
      <div>• Розшифрований текст: <i>"${freqSample.primaryDecrypted}"</i></div>
      <div>• Шифр перестановки (Текст: "Прикладна математика", Ключ: "Шифр" [4 1 3 2]): Криптограма = <code>"ра еикнаааидммкплатт"</code></div>

      <h4 style="color:#10b981;margin:16px 0 6px;">2. Лабораторна робота №2: Автентифікація (SHA-256) та JSON Web Tokens (JWT)</h4>
      <div>• Користувач: <code>login = "${state.lastName}"</code>, <code>password = "${state.firstName}"</code>, <code>id = ${state.groupId}</code></div>
      <div>• SHA-256 хеш пароля в БД: <code>${E.sha256Hex(state.firstName)}</code></div>
      <div>• Секретний ключ JWT (Secret): <code>${getJwtSecret()}</code> | Час дії токена: <code>${state.groupId}</code></div>
      <div>• Згенерований JWT токен (HS256): <code style="word-break:break-all;color:#00f0ff;">${state.currentJwtObj ? state.currentJwtObj.token : ''}</code></div>

      <h4 style="color:#10b981;margin:16px 0 6px;">3. Лабораторна робота №3: Система блочного шифрування S-DES (Варіант ${state.variant})</h4>
      <div>• Ключ (10 біт): <code>${sdesR.keySchedule.key10}</code> -> Підключі: <b>K1 = ${sdesR.keySchedule.K1}</b>, <b>K2 = ${sdesR.keySchedule.K2}</b></div>
      <div>• Вхідна криптограма (Варіант ${state.variant}): <code>${sdesR.inputBlock}</code></div>
      <div>• Проміжні результати функцій:</div>
      <div>  1) <b>IP</b> = <code>${sdesR.afterIP}</code></div>
      <div>  2) <b>f_K (з K2)</b> = <code>${sdesR.round1.outputBlock}</code></div>
      <div>  3) <b>SW</b> = <code>${sdesR.afterSW}</code></div>
      <div>  4) <b>f_K (з K1)</b> = <code>${sdesR.round2.outputBlock}</code></div>
      <div>  5) <b>IP-1</b> = <code>${sdesR.finalBits}</code> (двійкове) = <b style="color:#00f0ff;">${sdesR.decimalValue} (десяткове)</b></div>

      <h4 style="color:#10b981;margin:16px 0 6px;">4. Лабораторна робота №4: Протокол Діффі-Хеллмана та атака MITM</h4>
      <div>• Стандартний протокол (p=${dhStd.p}, g=${dhStd.g}, a=${dhStd.a}, b=${dhStd.b}): A = ${dhStd.A}, B = ${dhStd.B} -> Спільний секретний ключ <b>K = ${dhStd.Ka}</b>.</div>
      <div>• Атака MITM (c1=${dhMitm.c1}, c2=${dhMitm.c2}): Зловмисник перехоплює A1=${dhMitm.A1} та B2=${dhMitm.B2}, надсилає підставні B1=${dhMitm.B1} та A2=${dhMitm.A2}. Утворюються два ключі: <b>K1 (Аліса<->Атакер) = ${dhMitm.K1}</b> та <b>K2 (Атакер<->Боб) = ${dhMitm.K2}</b>.</div>
    `;
  }

  document.getElementById('openReportModalBtn').addEventListener('click', () => {
    reportModalBody.innerHTML = buildFullReportHtml();
    reportModal.classList.remove('hidden');
  });

  document.getElementById('closeReportModalBtn').addEventListener('click', () => {
    reportModal.classList.add('hidden');
  });

  document.getElementById('copyFullReportBtn').addEventListener('click', (e) => {
    navigator.clipboard.writeText(reportModalBody.innerText);
    const btn = e.currentTarget;
    const orig = btn.textContent;
    btn.textContent = '[Скопійовано]';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  });

  document.getElementById('printReportBtn').addEventListener('click', () => {
    window.print();
  });

  // ============================================================================
  // INITIALIZE ALL MODULES ON LOAD
  // ============================================================================
  updateCaesar(true);
  updateFrequencyAnalysis();
  updateTransposition(true);
  renderOAuthFlow();
  updateDiffieHellman(true);
  syncOperativeProfile(true);
});
