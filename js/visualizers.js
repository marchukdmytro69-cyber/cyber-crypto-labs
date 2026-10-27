/**
 * AEGIS // CRYPTO-OPS TACTICAL TERMINAL
 * Interactive SVG & DOM Visualizers for Labs 1, 2, 4, 5
 */

window.CryptoVisualizers = (() => {

  // ============================================================================
  // 1. CAESAR CIPHER WHEEL (SVG) & ALPHABET STRIP (LAB 1)
  // ============================================================================
  function renderCaesarWheel(svgContainer, alphabet, key, activeStep = null, mode = 'encrypt') {
    if (!svgContainer) return;
    const N = alphabet.length;
    const k = ((parseInt(key, 10) || 0) % N + N) % N;
    const shift = mode === 'encrypt' ? k : (N - k) % N;

    const size = 340;
    const cx = size / 2;
    const cy = size / 2;
    const rOuter = 148;
    const rMid = 112;
    const rInner = 78;

    let svg = `<svg viewBox="0 0 ${size} ${size}" class="caesar-wheel-svg">
      <defs>
        <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(0, 240, 255, 0.16)"/>
          <stop offset="100%" stop-color="rgba(4, 7, 17, 0.95)"/>
        </radialGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="url(#wheelGlow)" stroke="#1e3a8a" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${cy}" r="${rMid}" fill="rgba(10, 18, 44, 0.9)" stroke="#00f0ff" stroke-width="1" stroke-opacity="0.45"/>
      <circle cx="${cx}" cy="${cy}" r="${rInner}" fill="#040711" stroke="#3b82f6" stroke-width="1.2" stroke-dasharray="4 3"/>
    `;

    for (let i = 0; i < N; i++) {
      const angleDeg = (i * 360) / N - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const nextAngleRad = (((i + 1) * 360) / N - 90) * (Math.PI / 180);
      const midAngleRad = ((i + 0.5) * 360 / N - 90) * (Math.PI / 180);

      // Divider lines
      const x1 = cx + rInner * Math.cos(angleRad);
      const y1 = cy + rInner * Math.sin(angleRad);
      const x2 = cx + rOuter * Math.cos(angleRad);
      const y2 = cy + rOuter * Math.sin(angleRad);

      const mappedIdx = (i + shift) % N;
      const isActiveOrig = activeStep && activeStep.isLetter && activeStep.origIdx === i;
      const isActiveNew = activeStep && activeStep.isLetter && activeStep.newIdx === mappedIdx && activeStep.origIdx === i;

      // Sector highlight if active
      if (isActiveOrig) {
        const sx1 = cx + rOuter * Math.cos(angleRad);
        const sy1 = cy + rOuter * Math.sin(angleRad);
        const sx2 = cx + rOuter * Math.cos(nextAngleRad);
        const sy2 = cy + rOuter * Math.sin(nextAngleRad);
        const sx3 = cx + rInner * Math.cos(nextAngleRad);
        const sy3 = cy + rInner * Math.sin(nextAngleRad);
        const sx4 = cx + rInner * Math.cos(angleRad);
        const sy4 = cy + rInner * Math.sin(angleRad);
        svg += `<polygon points="${sx1},${sy1} ${sx2},${sy2} ${sx3},${sy3} ${sx4},${sy4}" fill="rgba(0, 240, 255, 0.28)" stroke="#00f0ff" stroke-width="1.5"/>`;
      }

      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(59, 130, 246, 0.25)" stroke-width="0.8"/>`;

      // Outer ring text (Original alphabet)
      const txOuter = cx + ((rOuter + rMid) / 2) * Math.cos(midAngleRad);
      const tyOuter = cy + ((rOuter + rMid) / 2) * Math.sin(midAngleRad);

      // Inner ring text (Shifted alphabet)
      const txInner = cx + ((rMid + rInner) / 2) * Math.cos(midAngleRad);
      const tyInner = cy + ((rMid + rInner) / 2) * Math.sin(midAngleRad);

      const outerColor = isActiveOrig ? '#00f0ff' : '#cbd5e1';
      const innerColor = isActiveNew ? '#10b981' : '#60a5fa';
      const fontWeightOuter = isActiveOrig ? '800' : '600';
      const fontWeightInner = isActiveNew ? '800' : '600';

      svg += `
        <text x="${txOuter}" y="${tyOuter}" fill="${outerColor}" font-size="${N > 28 ? '8.5' : '9.5'}" font-weight="${fontWeightOuter}" text-anchor="middle" dominant-baseline="central" font-family="JetBrains Mono, monospace">${alphabet[i]}</text>
        <text x="${txInner}" y="${tyInner}" fill="${innerColor}" font-size="${N > 28 ? '8.5' : '9.5'}" font-weight="${fontWeightInner}" text-anchor="middle" dominant-baseline="central" font-family="JetBrains Mono, monospace">${alphabet[mappedIdx]}</text>
      `;
    }

    // Center HUD info
    const centerTitle = activeStep && activeStep.isLetter
      ? `${activeStep.upperChar} → ${activeStep.mappedUpper}`
      : `K = ${k}`;
    const centerSub = activeStep && activeStep.isLetter
      ? `[${activeStep.origIdx}] → [${activeStep.newIdx}]`
      : mode === 'encrypt' ? `ЗСУВ +${k}` : `ЗСУВ -${k}`;

    svg += `
      <text x="${cx}" y="${cy - 8}" fill="#00f0ff" font-size="16" font-weight="800" text-anchor="middle" font-family="JetBrains Mono, monospace">${centerTitle}</text>
      <text x="${cx}" y="${cy + 14}" fill="#94a3b8" font-size="10.5" text-anchor="middle" font-family="JetBrains Mono, monospace">${centerSub}</text>
    </svg>`;

    svgContainer.innerHTML = svg;
  }

  function renderAlphabetRibbon(container, alphabet, key, activeStep = null, mode = 'encrypt') {
    if (!container) return;
    const N = alphabet.length;
    const k = ((parseInt(key, 10) || 0) % N + N) % N;
    const shift = mode === 'encrypt' ? k : (N - k) % N;

    let html = `<div class="alphabet-ribbon-grid" style="grid-template-columns: 76px repeat(${N}, minmax(26px, 1fr));">`;
    // Row 1: Indices
    html += `<div class="ribbon-row-label">Індекс i</div>`;
    for (let i = 0; i < N; i++) {
      const isOrig = activeStep && activeStep.isLetter && activeStep.origIdx === i;
      html += `<div class="ribbon-cell index-cell ${isOrig ? 'active-orig' : ''}">${i}</div>`;
    }
    // Row 2: Original Alphabet
    html += `<div class="ribbon-row-label">Вхід M</div>`;
    for (let i = 0; i < N; i++) {
      const isOrig = activeStep && activeStep.isLetter && activeStep.origIdx === i;
      html += `<div class="ribbon-cell orig-cell ${isOrig ? 'active-orig' : ''}">${alphabet[i]}</div>`;
    }
    // Row 3: Shifted Alphabet
    html += `<div class="ribbon-row-label">Вихід C</div>`;
    for (let i = 0; i < N; i++) {
      const mappedIdx = (i + shift) % N;
      const isTarget = activeStep && activeStep.isLetter && activeStep.origIdx === i;
      html += `<div class="ribbon-cell shifted-cell ${isTarget ? 'active-target' : ''}" title="${alphabet[i]}(${i}) → ${alphabet[mappedIdx]}(${mappedIdx})">${alphabet[mappedIdx]}</div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
  }

  // ============================================================================
  // 2. FREQUENCY ANALYSIS DUAL CHART & TABLE 1.4 (LAB 1)
  // ============================================================================
  function renderFrequencyChart(container, analysisResult) {
    if (!container || !analysisResult) return;
    const { letterStats, mostFrequentCipher, topLanguageLetter } = analysisResult;

    const maxFreq = Math.max(
      0.13,
      ...letterStats.map(s => Math.max(s.relFreq, s.stdFreq))
    );

    let html = `
      <div class="freq-legend">
        <span><i class="legend-dot cipher-dot"></i> Частота в шифротексті (спостережувана)</span>
        <span><i class="legend-dot std-dot"></i> Таблична частота мови (Табл. 1.3)</span>
        <span><i class="legend-dot peak-dot"></i> Пік шифротексту «${mostFrequentCipher.char}» (${mostFrequentCipher.count}) ↔ Еталон «${topLanguageLetter.char}»</span>
      </div>
      <div class="freq-bars-wrapper">
    `;

    letterStats.forEach(stat => {
      const cipherHeight = Math.round((stat.relFreq / maxFreq) * 100);
      const stdHeight = Math.round((stat.stdFreq / maxFreq) * 100);
      const isPeak = stat.char === mostFrequentCipher.char && stat.count > 0;
      const isLangPeak = stat.char === topLanguageLetter.char;

      html += `
        <div class="freq-col ${isPeak ? 'is-cipher-peak' : ''} ${isLangPeak ? 'is-lang-peak' : ''}"
             title="${stat.char} (індекс ${stat.index}): У тексті ${stat.count} разів (${(stat.relFreq * 100).toFixed(1)}%) | Норма мови: ${(stat.stdFreq * 100).toFixed(1)}%">
          <div class="freq-bars-pair">
            <div class="freq-bar cipher-bar ${isPeak ? 'peak-glow' : ''}" style="height: ${Math.max(cipherHeight, stat.count > 0 ? 4 : 0)}%"></div>
            <div class="freq-bar std-bar" style="height: ${Math.max(stdHeight, 2)}%"></div>
          </div>
          <div class="freq-char">${stat.char}</div>
          <div class="freq-count">${stat.count}</div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  // ============================================================================
  // 3. COLUMNAR TRANSPOSITION 2D MATRIX (LAB 1)
  // ============================================================================
  function renderTranspositionMatrix(container, transResult, activeStepIdx = null) {
    if (!container || !transResult) return;
    const { keyWord, ranks, matrix, rows, cols, steps } = transResult;
    const activeCol = (activeStepIdx !== null && steps[activeStepIdx]) ? steps[activeStepIdx].colIndex : null;

    let html = `<div class="trans-matrix-table" style="grid-template-columns: 54px repeat(${cols}, minmax(44px, 1fr));">`;

    // Header Row 1: Key Letters
    html += `<div class="trans-cell header-label">Ключ</div>`;
    for (let c = 0; c < cols; c++) {
      const isAct = activeCol === c;
      html += `<div class="trans-cell key-char-cell ${isAct ? 'col-active' : ''}">${keyWord[c]}</div>`;
    }

    // Header Row 2: Alphabetical Rank
    html += `<div class="trans-cell header-label">Порядок</div>`;
    for (let c = 0; c < cols; c++) {
      const isAct = activeCol === c;
      html += `<div class="trans-cell key-rank-cell ${isAct ? 'col-active' : ''}">${ranks[c]}</div>`;
    }

    // Matrix Rows
    for (let r = 0; r < rows; r++) {
      html += `<div class="trans-cell row-num-cell">Ряд ${r + 1}</div>`;
      for (let c = 0; c < cols; c++) {
        const isAct = activeCol === c;
        const ch = matrix[r][c];
        const displayCh = ch === ' ' ? '<span class="space-symbol">␣</span>' : ch;
        html += `<div class="trans-cell data-cell ${isAct ? 'col-active-cell' : ''}">${displayCh}</div>`;
      }
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  // ============================================================================
  // 4. DIFFIE-HELLMAN & MITM NETWORK TOPOLOGY VISUALIZER (LAB 4)
  // ============================================================================
  function renderDHNetworkSVG(container, mode, data, activeStepIdx = 0) {
    if (!container || !data) return;
    const stepObj = data.steps[Math.min(activeStepIdx, data.steps.length - 1)] || data.steps[0];

    if (mode === 'standard') {
      const packet = stepObj.packet;
      let packetSvg = '';
      if (packet && packet.from === 'Alice' && packet.to === 'Bob') {
        packetSvg = `
          <g class="flying-packet packet-ltr">
            <rect x="330" y="96" width="140" height="30" rx="6" fill="#04182e" stroke="#00f0ff" stroke-width="1.8"/>
            <text x="400" y="115" fill="#00f0ff" font-size="12" font-weight="700" text-anchor="middle" font-family="JetBrains Mono">${packet.label}</text>
          </g>
        `;
      } else if (packet && packet.from === 'Bob' && packet.to === 'Alice') {
        packetSvg = `
          <g class="flying-packet packet-rtl">
            <rect x="330" y="156" width="140" height="30" rx="6" fill="#041e19" stroke="#10b981" stroke-width="1.8"/>
            <text x="400" y="175" fill="#10b981" font-size="12" font-weight="700" text-anchor="middle" font-family="JetBrains Mono">${packet.label}</text>
          </g>
        `;
      }

      container.innerHTML = `
        <svg viewBox="0 0 800 280" class="dh-network-svg">
          <defs>
            <marker id="arrowCyan" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#00f0ff"/>
            </marker>
            <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#10b981"/>
            </marker>
          </defs>

          <!-- Public Parameters Banner -->
          <rect x="255" y="12" width="290" height="44" rx="8" fill="rgba(15, 29, 64, 0.9)" stroke="#3b82f6" stroke-width="1.2"/>
          <text x="400" y="30" fill="#94a3b8" font-size="10.5" text-anchor="middle" font-family="JetBrains Mono">ЗАГАЛЬНОДОСТУПНИЙ КАНАЛ (TRUST PARTY)</text>
          <text x="400" y="48" fill="#00f0ff" font-size="13" font-weight="700" text-anchor="middle" font-family="JetBrains Mono">p = ${data.p},  g = ${data.g}</text>

          <!-- Alice Node -->
          <g transform="translate(30, 65)">
            <rect width="205" height="175" rx="12" fill="rgba(10, 19, 44, 0.95)" stroke="#00f0ff" stroke-width="2"/>
            <text x="102" y="28" fill="#00f0ff" font-size="15" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">ALICE (АЛІСА)</text>
            <line x1="16" y1="38" x2="189" y2="38" stroke="rgba(0,240,255,0.25)"/>
            <text x="20" y="62" fill="#cbd5e1" font-size="12" font-family="JetBrains Mono">Приватний a = <tspan fill="#f59e0b" font-weight="700">${data.a}</tspan></text>
            <text x="20" y="88" fill="#cbd5e1" font-size="11.5" font-family="JetBrains Mono">A = gᵃ mod p = <tspan fill="#00f0ff" font-weight="700">${data.A}</tspan></text>
            <text x="20" y="114" fill="#cbd5e1" font-size="11.5" font-family="JetBrains Mono">Отримано B = <tspan fill="#10b981" font-weight="700">${activeStepIdx >= 3 ? data.B : '?'}</tspan></text>
            <rect x="16" y="130" width="173" height="32" rx="6" fill="rgba(16, 185, 129, 0.14)" stroke="#10b981"/>
            <text x="102" y="150" fill="#10b981" font-size="12" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">K = Bᵃ mod p = ${activeStepIdx >= 4 ? data.Ka : '?'}</text>
          </g>

          <!-- Bob Node -->
          <g transform="translate(565, 65)">
            <rect width="205" height="175" rx="12" fill="rgba(10, 19, 44, 0.95)" stroke="#10b981" stroke-width="2"/>
            <text x="102" y="28" fill="#10b981" font-size="15" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">BOB (БОБ)</text>
            <line x1="16" y1="38" x2="189" y2="38" stroke="rgba(16,185,129,0.25)"/>
            <text x="20" y="62" fill="#cbd5e1" font-size="12" font-family="JetBrains Mono">Приватний b = <tspan fill="#f59e0b" font-weight="700">${data.b}</tspan></text>
            <text x="20" y="88" fill="#cbd5e1" font-size="11.5" font-family="JetBrains Mono">B = gᵇ mod p = <tspan fill="#10b981" font-weight="700">${data.B}</tspan></text>
            <text x="20" y="114" fill="#cbd5e1" font-size="11.5" font-family="JetBrains Mono">Отримано A = <tspan fill="#00f0ff" font-weight="700">${activeStepIdx >= 2 ? data.A : '?'}</tspan></text>
            <rect x="16" y="130" width="173" height="32" rx="6" fill="rgba(16, 185, 129, 0.14)" stroke="#10b981"/>
            <text x="102" y="150" fill="#10b981" font-size="12" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">K = Aᵇ mod p = ${activeStepIdx >= 4 ? data.Kb : '?'}</text>
          </g>

          <!-- Transmission Arrows -->
          <line x1="245" y1="130" x2="550" y2="130" stroke="#00f0ff" stroke-width="2.2" stroke-dasharray="${activeStepIdx >= 2 ? 'none' : '6 4'}" marker-end="url(#arrowCyan)"/>
          <text x="400" y="88" fill="#00f0ff" font-size="11.5" text-anchor="middle" font-family="JetBrains Mono">A = gᵃ mod p = ${data.A}</text>

          <line x1="555" y1="192" x2="250" y2="192" stroke="#10b981" stroke-width="2.2" stroke-dasharray="${activeStepIdx >= 3 ? 'none' : '6 4'}" marker-end="url(#arrowGreen)"/>
          <text x="400" y="214" fill="#10b981" font-size="11.5" text-anchor="middle" font-family="JetBrains Mono">B = gᵇ mod p = ${data.B}</text>

          ${packetSvg}

          <!-- Passive Eavesdropper Note -->
          <rect x="260" y="232" width="280" height="38" rx="6" fill="rgba(244, 63, 94, 0.1)" stroke="rgba(244, 63, 94, 0.4)"/>
          <text x="400" y="248" fill="#fda4af" font-size="10" text-anchor="middle" font-family="JetBrains Mono">ПАСИВНИЙ ПЕРЕХОПЛЮВАЧ БАЧИТЬ: p=${data.p}, g=${data.g}, A=${data.A}, B=${data.B}</text>
          <text x="400" y="263" fill="#f43f5e" font-size="10.5" font-weight="700" text-anchor="middle" font-family="JetBrains Mono">Не може обчислити K = ${data.Ka} без a або b (Дискретний логарифм)</text>
        </svg>
      `;
    } else {
      // MITM Mode Topology (Alice <-> Attacker <-> Bob) matching the manual's diagram
      container.innerHTML = `
        <svg viewBox="0 0 840 310" class="dh-network-svg mitm-svg">
          <defs>
            <marker id="arrowRed" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#f43f5e"/>
            </marker>
            <marker id="arrowCyan2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#00f0ff"/>
            </marker>
            <marker id="arrowWarn" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#f59e0b"/>
            </marker>
          </defs>

          <!-- Alice Node -->
          <g transform="translate(20, 20)">
            <rect width="200" height="150" rx="10" fill="rgba(10, 19, 44, 0.95)" stroke="#00f0ff" stroke-width="2"/>
            <text x="100" y="24" fill="#00f0ff" font-size="14" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">ALICE (АЛІСА)</text>
            <text x="15" y="48" fill="#cbd5e1" font-size="11" font-family="JetBrains Mono">Секрет a = <tspan fill="#f59e0b" font-weight="700">${data.a}</tspan></text>
            <text x="15" y="68" fill="#cbd5e1" font-size="11" font-family="JetBrains Mono">Відправляє A₁ = <tspan fill="#00f0ff" font-weight="700">${data.A1}</tspan></text>
            <text x="15" y="88" fill="#cbd5e1" font-size="11" font-family="JetBrains Mono">Отримує B₁ = <tspan fill="#f43f5e" font-weight="700">${data.B1}</tspan></text>
            <rect x="12" y="102" width="176" height="34" rx="6" fill="rgba(244, 63, 94, 0.16)" stroke="#f43f5e"/>
            <text x="100" y="123" fill="#fda4af" font-size="11.5" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">Ключ K₁ = B₁ᵃ mod p = ${data.K1}</text>
          </g>

          <!-- Bob Node -->
          <g transform="translate(620, 20)">
            <rect width="200" height="150" rx="10" fill="rgba(10, 19, 44, 0.95)" stroke="#10b981" stroke-width="2"/>
            <text x="100" y="24" fill="#10b981" font-size="14" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">BOB (БОБ)</text>
            <text x="15" y="48" fill="#cbd5e1" font-size="11" font-family="JetBrains Mono">Секрет b = <tspan fill="#f59e0b" font-weight="700">${data.b}</tspan></text>
            <text x="15" y="68" fill="#cbd5e1" font-size="11" font-family="JetBrains Mono">Отримує A₂ = <tspan fill="#f43f5e" font-weight="700">${data.A2}</tspan></text>
            <text x="15" y="88" fill="#cbd5e1" font-size="11" font-family="JetBrains Mono">Відправляє B₂ = <tspan fill="#10b981" font-weight="700">${data.B2}</tspan></text>
            <rect x="12" y="102" width="176" height="34" rx="6" fill="rgba(245, 158, 11, 0.16)" stroke="#f59e0b"/>
            <text x="100" y="123" fill="#fde68a" font-size="11.5" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">Ключ K₂ = A₂ᵇ mod p = ${data.K2}</text>
          </g>

          <!-- Attacker (MITM) Node in Bottom Center (Just like manual diagram!) -->
          <g transform="translate(275, 155)">
            <rect width="290" height="142" rx="12" fill="rgba(28, 7, 18, 0.96)" stroke="#f43f5e" stroke-width="2.4"/>
            <text x="145" y="24" fill="#f43f5e" font-size="14" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">[ATTACKER] MITM ПЕРЕХОПЛЮВАЧ</text>
            <line x1="16" y1="33" x2="274" y2="33" stroke="rgba(244,63,94,0.35)"/>
            <text x="18" y="54" fill="#fecdd3" font-size="11" font-family="JetBrains Mono">Секрети зловмисника: c1 = ${data.c1}, c2 = ${data.c2}</text>
            <text x="18" y="74" fill="#cbd5e1" font-size="11" font-family="JetBrains Mono">Підмінив: A1(${data.A1})->A2(${data.A2}) | B2(${data.B2})->B1(${data.B1})</text>
            <rect x="16" y="88" width="124" height="40" rx="6" fill="rgba(244,63,94,0.2)" stroke="#f43f5e"/>
            <text x="78" y="105" fill="#fda4af" font-size="10" text-anchor="middle" font-family="JetBrains Mono">З Алісою (A1^c1)</text>
            <text x="78" y="121" fill="#fff" font-size="12.5" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">K1 = ${data.K1}</text>

            <rect x="150" y="88" width="124" height="40" rx="6" fill="rgba(245,158,11,0.2)" stroke="#f59e0b"/>
            <text x="212" y="105" fill="#fde68a" font-size="10" text-anchor="middle" font-family="JetBrains Mono">З Бобом (B2^c2)</text>
            <text x="212" y="121" fill="#fff" font-size="12.5" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">K2 = ${data.K2}</text>
          </g>

          <!-- Diagonal Arrows Alice <-> Attacker -->
          <line x1="225" y1="115" x2="290" y2="165" stroke="#00f0ff" stroke-width="2.2" marker-end="url(#arrowCyan2)"/>
          <text x="285" y="128" fill="#00f0ff" font-size="11" font-weight="700" font-family="JetBrains Mono">A1=${data.A1}, g, p</text>

          <line x1="270" y1="205" x2="205" y2="155" stroke="#f43f5e" stroke-width="2.2" marker-end="url(#arrowRed)"/>
          <text x="195" y="200" fill="#f43f5e" font-size="11" font-weight="700" font-family="JetBrains Mono">B1=${data.B1}</text>

          <!-- Diagonal Arrows Attacker <-> Bob -->
          <line x1="550" y1="165" x2="615" y2="115" stroke="#f43f5e" stroke-width="2.2" marker-end="url(#arrowRed)"/>
          <text x="530" y="128" fill="#f43f5e" font-size="11" font-weight="700" font-family="JetBrains Mono">A2=${data.A2}, g, p</text>

          <line x1="635" y1="155" x2="570" y2="205" stroke="#f59e0b" stroke-width="2.2" marker-end="url(#arrowWarn)"/>
          <text x="615" y="200" fill="#f59e0b" font-size="11" font-weight="700" font-family="JetBrains Mono">B2=${data.B2}</text>

          <!-- Blocked direct line indicator -->
          <line x1="230" y1="65" x2="610" y2="65" stroke="rgba(244,63,94,0.35)" stroke-width="1.5" stroke-dasharray="5 5"/>
          <rect x="340" y="47" width="160" height="32" rx="6" fill="#1e0510" stroke="#f43f5e"/>
          <text x="420" y="67" fill="#f43f5e" font-size="11" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">[КАНАЛ ПЕРЕХОПЛЕНО]</text>
        </svg>
      `;
    }
  }

  // ============================================================================
  // 5. S-DES BIT-PERMUTATION WIRE ROUTER & S-BOX VISUALIZER (LAB 5)
  // ============================================================================
  function renderBitPermutationSVG(container, inBits, outBits, permTable, tableTitle = 'P10') {
    if (!container || !inBits || !outBits || !permTable) return;
    const inLen = inBits.length;
    const outLen = outBits.length;
    const width = 620;
    const height = 195;

    const inSpacing = (width - 80) / Math.max(1, inLen - 1);
    const outSpacing = (width - 80) / Math.max(1, outLen - 1);

    const colors = [
      '#00f0ff', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e',
      '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#6366f1'
    ];

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="sdes-wire-svg">`;
    svg += `<text x="${width / 2}" y="18" fill="#94a3b8" font-size="11" font-weight="700" text-anchor="middle" font-family="JetBrains Mono">КОМУТАЦІЯ БІТІВ: ${tableTitle}</text>`;

    // Draw Bezier wires from input index (permTable[j] - 1) to output index j
    for (let j = 0; j < outLen; j++) {
      const srcIdx = permTable[j] - 1;
      const x1 = inLen === 1 ? width / 2 : 40 + srcIdx * inSpacing;
      const y1 = 58;
      const x2 = outLen === 1 ? width / 2 : 40 + j * outSpacing;
      const y2 = 142;
      const color = colors[srcIdx % colors.length];
      const bitVal = outBits[j];

      svg += `
        <path d="M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}"
              fill="none" stroke="${color}" stroke-width="${bitVal === '1' ? '2.4' : '1.4'}"
              stroke-opacity="${bitVal === '1' ? '0.92' : '0.45'}" class="bit-wire"/>
      `;
    }

    // Draw Input Bit Nodes
    for (let i = 0; i < inLen; i++) {
      const x = inLen === 1 ? width / 2 : 40 + i * inSpacing;
      const y = 42;
      const bit = inBits[i];
      const color = colors[i % colors.length];
      svg += `
        <g transform="translate(${x - 16}, ${y - 16})">
          <rect width="32" height="32" rx="6" fill="#071026" stroke="${color}" stroke-width="1.8"/>
          <text x="16" y="13" fill="#94a3b8" font-size="8.5" text-anchor="middle" font-family="JetBrains Mono">b${i + 1}</text>
          <text x="16" y="26" fill="${bit === '1' ? '#00f0ff' : '#cbd5e1'}" font-size="13" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">${bit}</text>
        </g>
      `;
    }

    // Draw Output Bit Nodes
    for (let j = 0; j < outLen; j++) {
      const x = outLen === 1 ? width / 2 : 40 + j * outSpacing;
      const y = 158;
      const bit = outBits[j];
      const srcPos = permTable[j];
      const color = colors[(srcPos - 1) % colors.length];
      svg += `
        <g transform="translate(${x - 16}, ${y - 16})">
          <rect width="32" height="34" rx="6" fill="#071529" stroke="${color}" stroke-width="1.8"/>
          <text x="16" y="12" fill="${color}" font-size="8" font-weight="700" text-anchor="middle" font-family="JetBrains Mono">←#${srcPos}</text>
          <text x="16" y="27" fill="${bit === '1' ? '#10b981' : '#e2e8f0'}" font-size="13" font-weight="800" text-anchor="middle" font-family="JetBrains Mono">${bit}</text>
        </g>
      `;
    }

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  function renderSBoxMatrices(container, s0Res, s1Res, s1Mode = 'manual') {
    if (!container) return;
    const S0 = window.CryptoEngines.SDES_TABLES.S0;
    const S1 = s1Mode === 'classic'
      ? window.CryptoEngines.SDES_TABLES.S1_CLASSIC
      : window.CryptoEngines.SDES_TABLES.S1_MANUAL;

    const buildMatrixHtml = (title, matrix, res) => {
      let html = `
        <div class="sbox-card">
          <div class="sbox-card-header">
            <span class="sbox-title">${title}</span>
            <span class="sbox-formula">Вхід: <b>${res.input}</b> → Ряд <b>${res.rowBits}₂ (${res.row})</b>, Стовп <b>${res.colBits}₂ (${res.col})</b> → <b>${res.val} (${res.outBits}₂)</b></span>
          </div>
          <div class="sbox-grid">
            <div class="sbox-cell corner-cell">Р\\С</div>
            <div class="sbox-cell col-hdr ${res.col === 0 ? 'hdr-active' : ''}">00 (0)</div>
            <div class="sbox-cell col-hdr ${res.col === 1 ? 'hdr-active' : ''}">01 (1)</div>
            <div class="sbox-cell col-hdr ${res.col === 2 ? 'hdr-active' : ''}">10 (2)</div>
            <div class="sbox-cell col-hdr ${res.col === 3 ? 'hdr-active' : ''}">11 (3)</div>
      `;
      for (let r = 0; r < 4; r++) {
        const rBin = r.toString(2).padStart(2, '0');
        html += `<div class="sbox-cell row-hdr ${res.row === r ? 'hdr-active' : ''}">${rBin} (${r})</div>`;
        for (let c = 0; c < 4; c++) {
          const isHit = res.row === r && res.col === c;
          const isCross = (res.row === r || res.col === c) && !isHit;
          const val = matrix[r][c];
          const bin = val.toString(2).padStart(2, '0');
          html += `
            <div class="sbox-cell val-cell ${isHit ? 'sbox-hit' : ''} ${isCross ? 'sbox-cross' : ''}">
              <span class="sbox-dec">${val}</span>
              <span class="sbox-bin">${bin}₂</span>
            </div>
          `;
        }
      }
      html += `</div></div>`;
      return html;
    };

    container.innerHTML = `
      <div class="sbox-pair-grid">
        ${buildMatrixHtml('Модуль заміни S₀ (Рядок 1)', S0, s0Res)}
        ${buildMatrixHtml(`Модуль заміни S₁ (Рядок 2, ${s1Mode === 'manual' ? 'за методичкою' : 'Stallings'})`, S1, s1Res)}
      </div>
    `;
  }

  return {
    renderCaesarWheel,
    renderAlphabetRibbon,
    renderFrequencyChart,
    renderTranspositionMatrix,
    renderDHNetworkSVG,
    renderBitPermutationSVG,
    renderSBoxMatrices
  };
})();
