/*
 * Ápice Soluções — gerador de propostas e orçamentos
 * Dados da empresa, preços de exemplo e padrões: js/config.js
 */
(function () {
  'use strict';
  const CFG = window.APICE_CONFIG;
  const { FacadeBuilding, reducedMotionQuery, Ease } = window.ApiceBuilding;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const STORE = { seq: 'apice.seq', draft: 'apice.rascunho', list: 'apice.propostas' };
  const SCHEMA = 1;

  /* ---------------- Utilidades ---------------- */
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const numMax2 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const money = v => brl.format(Number.isFinite(v) ? v : 0);
  const m2 = v => `${num2.format(v)} m²`;
  const m = v => `${num2.format(v)} m`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fmtDate = iso => { if (!iso) return '—'; const [y, mo, d] = iso.split('-').map(Number); return new Date(y, mo - 1, d).toLocaleDateString('pt-BR'); };
  const addDays = (iso, days) => { const [y, mo, d] = iso.split('-').map(Number); const dt = new Date(y, mo - 1, d + Number(days || 0)); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; };
  /** Converte "1.234,56", "1234,56" ou "1234.56" em número. */
  function parseBR(v) {
    if (typeof v === 'number') return v;
    let s = String(v ?? '').replace(/[R$\s%]/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s); return Number.isFinite(n) ? n : NaN;
  }
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const setPath = (obj, path, val) => { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => { o[k] ??= {}; o = o[k]; }); o[ks.at(-1)] = val; };
  const storage = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Não foi possível salvar no navegador (armazenamento indisponível).'); return false; } }
  };
  let toastTimer;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }
  const servico = id => CFG.servicos.find(s => s.id === id) || CFG.servicos[0];
  const acabamento = id => CFG.acabamentos.find(a => a.id === id) || CFG.acabamentos[0];

  /* ---------------- Marca ---------------- */
  function wordmark(light = true) {
    const e = CFG.empresa;
    if (e.logoUrl) return `<img src="${esc(e.logoUrl)}" alt="${esc(e.nome)}">`;
    return `<span class="wordmark"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="${light ? '#13243b' : '#0b1626'}"/><path d="M12 50 32 12l20 38H41L32 32l-9 18Z" fill="#f2a33a"/></svg><span><b>${esc(e.nome)}</b><small>${esc(e.slogan)}</small></span></span>`;
  }

  /* ---------------- Modelo de dados ---------------- */
  function nextNumero() {
    const seq = (storage.get(STORE.seq, 0) || 0) + 1; storage.set(STORE.seq, seq);
    return `${CFG.prefixoProposta}-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
  }
  function autoItems(p) {
    const s = servico(p.servico), a = acabamento(p.acabamento);
    const items = [{ id: uid(), auto: 'servico', descricao: s.nome, unidade: 'm²', quantidade: 0, preco: s.precoM2, exemplo: true }];
    if (s.usaAcabamento) items.push({ id: uid(), auto: 'acabamento', descricao: `Fornecimento de material: ${a.nome}`, unidade: 'm²', quantidade: 0, preco: a.precoM2, exemplo: true });
    return items;
  }
  function newProposal() {
    const d = CFG.padroes;
    const p = {
      tipo: 'apice-proposta', versao: SCHEMA, id: uid(), numero: nextNumero(), dataEmissao: todayISO(),
      cliente: { nome: '', documento: '', contato: '', telefone: '', email: '' },
      obra: { endereco: '', cidade: '' },
      edificio: { largura: d.largura, profundidade: d.profundidade, pavimentos: d.pavimentos, peDireito: d.peDireito, peDireitoTerreo: d.peDireitoTerreo, platibanda: d.platibanda, descontoVaos: d.descontoVaos, sacadas: d.sacadas, faces: { ...d.faces } },
      servico: d.servico, acabamento: d.acabamento, cor: d.cor, corReferencia: '',
      itens: [], desconto: { tipo: 'percentual', valor: 0 }, impostos: { rotulo: d.impostosRotulo, percentual: d.impostosPercentual },
      validadeDias: d.validadeDias, prazoExecucaoDias: d.prazoExecucaoDias, formaPagamento: d.formaPagamento, observacoes: d.observacoes,
      atualizadoEm: new Date().toISOString()
    };
    p.itens = autoItems(p);
    return p;
  }
  /** Valida e completa uma proposta vinda de JSON/armazenamento. */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !raw.edificio || !Array.isArray(raw.itens)) throw new Error('Arquivo não é uma proposta da Ápice Soluções.');
    const base = newProposalShape();
    const p = { ...base, ...raw, cliente: { ...base.cliente, ...raw.cliente }, obra: { ...base.obra, ...raw.obra }, edificio: { ...base.edificio, ...raw.edificio, faces: { ...base.edificio.faces, ...(raw.edificio.faces || {}) } }, desconto: { ...base.desconto, ...raw.desconto }, impostos: { ...base.impostos, ...raw.impostos } };
    for (const k of ['largura', 'profundidade', 'pavimentos', 'peDireito', 'peDireitoTerreo', 'platibanda', 'descontoVaos']) { const v = Number(p.edificio[k]); p.edificio[k] = Number.isFinite(v) ? v : base.edificio[k]; }
    p.itens = raw.itens.map(it => ({ id: it.id || uid(), auto: it.auto === 'servico' || it.auto === 'acabamento' ? it.auto : null, descricao: String(it.descricao ?? ''), unidade: String(it.unidade ?? 'un'), quantidade: Number(it.quantidade) || 0, preco: Number(it.preco) || 0, exemplo: !!it.exemplo }));
    if (!CFG.servicos.some(s => s.id === p.servico)) p.servico = CFG.servicos[0].id;
    if (!CFG.acabamentos.some(a => a.id === p.acabamento)) p.acabamento = CFG.acabamentos[0].id;
    if (!/^#[0-9a-f]{6}$/i.test(p.cor)) p.cor = acabamento(p.acabamento).cor;
    p.tipo = 'apice-proposta'; p.versao = SCHEMA; p.id ||= uid();
    return p;
  }
  function newProposalShape() {
    const d = CFG.padroes;
    return { cliente: { nome: '', documento: '', contato: '', telefone: '', email: '' }, obra: { endereco: '', cidade: '' }, edificio: { largura: d.largura, profundidade: d.profundidade, pavimentos: d.pavimentos, peDireito: d.peDireito, peDireitoTerreo: d.peDireitoTerreo, platibanda: d.platibanda, descontoVaos: d.descontoVaos, sacadas: d.sacadas, faces: { ...d.faces } }, servico: d.servico, acabamento: d.acabamento, cor: d.cor, corReferencia: '', desconto: { tipo: 'percentual', valor: 0 }, impostos: { rotulo: d.impostosRotulo, percentual: d.impostosPercentual }, validadeDias: d.validadeDias, prazoExecucaoDias: d.prazoExecucaoDias, formaPagamento: d.formaPagamento, observacoes: d.observacoes, dataEmissao: todayISO(), numero: '' };
  }

  /* ---------------- Cálculos ---------------- */
  const LIMITS = { largura: [4, 80], profundidade: [4, 80], pavimentos: [1, 40], peDireito: [2.4, 6], peDireitoTerreo: [2.4, 10], platibanda: [0.3, 4], descontoVaos: [0, 90] };
  function safeBuilding(e) {
    const o = { ...e, faces: { ...e.faces } };
    for (const [k, [lo, hi]] of Object.entries(LIMITS)) { const v = Number(o[k]); o[k] = Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : CFG.padroes[k]; }
    o.pavimentos = Math.round(o.pavimentos);
    return o;
  }
  function compute(p) {
    const e = safeBuilding(p.edificio);
    const altura = e.peDireitoTerreo + (e.pavimentos - 1) * e.peDireito + e.platibanda;
    const faceArea = { frente: e.largura * altura, fundos: e.largura * altura, direita: e.profundidade * altura, esquerda: e.profundidade * altura };
    const bruta = Object.keys(faceArea).reduce((s, f) => s + (e.faces[f] ? faceArea[f] : 0), 0);
    const liquida = Math.round(bruta * (1 - e.descontoVaos / 100) * 100) / 100;
    const linhas = p.itens.map(it => ({ ...it, quantidade: it.auto ? liquida : it.quantidade, total: Math.round((it.auto ? liquida : it.quantidade) * it.preco * 100) / 100 }));
    const subtotal = linhas.reduce((s, l) => s + l.total, 0);
    const dv = Math.max(0, Number(p.desconto.valor) || 0);
    const desconto = Math.min(subtotal, p.desconto.tipo === 'percentual' ? subtotal * Math.min(dv, 100) / 100 : dv);
    const base = subtotal - desconto;
    const impostos = base * Math.max(0, Number(p.impostos.percentual) || 0) / 100;
    return { e, altura, faceArea, bruta, liquida, linhas, subtotal, desconto, impostos, total: base + impostos, validadeAte: addDays(p.dataEmissao || todayISO(), p.validadeDias) };
  }

  /* ---------------- Estado ---------------- */
  let P = null;
  try { P = normalize(storage.get(STORE.draft, null)); } catch { P = null; }
  if (!P) P = newProposal();
  const saveDraft = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => { P.atualizadoEm = new Date().toISOString(); storage.set(STORE.draft, P); }, 300); }; })();

  /* ---------------- 3D ---------------- */
  const STAGES = [[0.2, '1 · Planta baixa'], [0.42, '2 · Estrutura e cotas'], [0.62, '3 · Extrusão dos pavimentos'], [0.93, '4 · Materiais e luz'], [1.01, 'Modelo realista']];
  function bindHud(viewer, el) {
    const chip = $('[data-stage]', el), bar = $('[data-progress]', el);
    viewer.on('start', ({ mode }) => { el.classList.toggle('is-playing', mode !== 'fit'); });
    viewer.on('progress', ({ p, mode }) => {
      if (mode === 'fit') return;
      bar.style.width = `${(p * 100).toFixed(1)}%`;
      const label = mode === 'quick' ? (p < 0.6 ? 'Atualizando estrutura…' : 'Modelo realista') : STAGES.find(([lim]) => p < lim)[1];
      if (chip.textContent !== label) chip.textContent = label;
    });
    viewer.on('end', () => { el.classList.remove('is-playing'); chip.textContent = 'Modelo realista'; });
  }
  function viewerParams(p) {
    const e = safeBuilding(p.edificio), a = acabamento(p.acabamento);
    return { largura: e.largura, profundidade: e.profundidade, pavimentos: e.pavimentos, peDireito: e.peDireito, peDireitoTerreo: e.peDireitoTerreo, platibanda: e.platibanda, sacadas: !!e.sacadas, faces: e.faces, acabamentoTipo: a.tipo, cor: p.cor };
  }

  let hero = null, builder = null, showcaseOn = true, setHeroFinish = null;
  function init3D() {
    const coarse = matchMedia('(pointer: coarse)').matches;
    try {
      const heroEl = $('#hero-viewer');
      hero = new FacadeBuilding(heroEl, { zoom: false, rotate: !coarse, autoRotate: true, label: 'Modelo 3D de demonstração: edifício com fachada em revestimento, girando lentamente' });
      if (coarse) hero.renderer.domElement.style.touchAction = 'pan-y';
      bindHud(hero, heroEl);
      const showcase = ['acm', 'vidro', 'porcelanato', 'tijolo', 'concreto', 'pastilha'].map(acabamento);
      let idx = 0, timer = null;
      const heroBase = { largura: 16, profundidade: 18, pavimentos: 12, peDireito: 3, peDireitoTerreo: 4.8, platibanda: 1.2, sacadas: true, faces: { frente: true, direita: true, fundos: true, esquerda: true } };
      const finishChip = $('[data-finish]', heroEl);
      const applyShowcase = () => { const a = showcase[idx % showcase.length]; hero.setParams({ ...heroBase, acabamentoTipo: a.tipo, cor: a.cor }); finishChip.textContent = a.nome; finishChip.hidden = false; };
      hero.on('start', ({ mode }) => { if (mode === 'full') { clearInterval(timer); timer = null; idx = 0; applyShowcase(); finishChip.hidden = true; } });
      hero.on('end', ({ mode }) => {
        if (mode !== 'full' || reducedMotionQuery.matches) { finishChip.hidden = false; return; }
        finishChip.hidden = false; clearInterval(timer);
        timer = setInterval(() => { if (!showcaseOn || !hero.visible || document.hidden || hero.tl.playing) return; idx++; applyShowcase(); }, 4200);
      });
      setHeroFinish = i => { idx = i; applyShowcase(); };
      applyShowcase(); finishChip.hidden = true;
      hero.play(new URLSearchParams(location.search).has('estatico') ? 'none' : 'full');
      $('#hero-replay').addEventListener('click', () => hero.play('full'));

      const bEl = $('#builder-viewer');
      builder = new FacadeBuilding(bEl, { zoom: true, rotate: true, autoRotate: true, label: 'Modelo 3D da edificação do orçamento; arraste para girar, use os botões para aproximar' });
      bindHud(builder, bEl);
      builder.setParams(viewerParams(P), { animate: 'none' });
      $('#tool-replay').addEventListener('click', () => builder.play('full'));
      $('#tool-zoom-in').addEventListener('click', () => builder.zoomBy(0.85));
      $('#tool-zoom-out').addEventListener('click', () => builder.zoomBy(1.18));
      $('#tool-reset').addEventListener('click', () => builder.resetView());
      const rot = $('#tool-rotate');
      if (reducedMotionQuery.matches) rot.setAttribute('aria-pressed', 'false');
      rot.addEventListener('click', () => { const on = rot.getAttribute('aria-pressed') !== 'true'; rot.setAttribute('aria-pressed', String(on)); builder.opts.autoRotate = on; builder.setAutoRotate(on); });
    } catch (err) {
      console.error(err);
      $$('.viewer').forEach(v => { v.insertAdjacentHTML('beforeend', '<p class="noscript">Seu navegador não suporta WebGL. O orçamento continua funcionando normalmente.</p>'); });
      $$('.viewer .bp-bg').forEach(b => { b.style.opacity = '1'; });
    }
  }
  const syncBuilder = (() => {
    let t;
    return (geometry) => {
      if (!builder) return;
      clearTimeout(t);
      const run = () => builder.setParams(viewerParams(P), { animate: $('#anim-mudancas').checked ? 'quick' : 'fit' });
      if (geometry) t = setTimeout(run, 380); else run();
    };
  })();

  /* ---------------- Formulário ---------------- */
  function buildStaticUI() {
    $$('[data-brand]').forEach(el => { el.innerHTML = wordmark(true); });
    $('[data-brand-footer]').innerHTML = wordmark(true);
    const e = CFG.empresa;
    $('[data-company-line]').textContent = [e.telefone, e.email, e.site].filter(Boolean).join(' · ');
    $('#sel-servico').innerHTML = CFG.servicos.map(s => `<option value="${esc(s.id)}">${esc(s.nome)}</option>`).join('');
    $('#finish-grid').innerHTML = CFG.acabamentos.map(a => `<label class="finish"><input type="radio" name="acabamento" value="${esc(a.id)}"><span class="sw" data-sw="${esc(a.tipo)}" style="background-color:${esc(a.cor)}"></span><b>${esc(a.nome)}</b><small>${money(a.precoM2)}/m² <span class="ex">exemplo</span></small></label>`).join('');
    $('#sel-extra').insertAdjacentHTML('beforeend', CFG.itensExtras.map((x, i) => `<option value="${i}">${esc(x.descricao)}</option>`).join(''));
    $('#lista-pagamentos').innerHTML = CFG.formasPagamento.map(f => `<option value="${esc(f)}"></option>`).join('');
    const sw = ['#2f5d7c', '#1d2b3a', '#6f93a8', '#d9d4cb', '#e9e2d4', '#a7a39c', '#a5583c', '#5f8f8c', '#b88a4a', '#f2f2ef'];
    $('#swatches').innerHTML = sw.map(c => `<button type="button" class="swatch" data-color="${c}" style="background:${c}" aria-label="Usar a cor ${c}"></button>`).join('');
    // miniaturas reais das texturas procedurais
    $$('[data-sw]').forEach(el => {
      const c = document.createElement('canvas'); c.width = 160; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = el.style.backgroundColor; g.fillRect(0, 0, 160, 64);
      g.globalCompositeOperation = 'multiply';
      const t = window.ApiceBuilding.surfacePreview?.(el.dataset.sw); if (t) g.drawImage(t, 0, 0, 160, 64);
      el.style.backgroundImage = `url(${c.toDataURL()})`;
    });
  }

  function fillForm() {
    $$('#form [name]').forEach(el => {
      const v = getPath(P, el.name);
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = el.value === v;
      else if (el.hasAttribute('data-money')) el.value = numMax2.format(Number(v) || 0);
      else el.value = v ?? '';
    });
    $('[data-numero]').textContent = P.numero;
    renderItems(); update();
  }

  const GEO_FIELDS = /^edificio\.(largura|profundidade|pavimentos|peDireito|peDireitoTerreo|platibanda|sacadas)$/;
  function onField(ev) {
    const el = ev.target; if (!el.name || el.closest('#items-body')) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'radio') { if (!el.checked) return; v = el.value; }
    else if (el.hasAttribute('data-num')) { v = el.value === '' ? NaN : Number(el.value); const ok = Number.isFinite(v) && (el.min === '' || v >= Number(el.min)) && (el.max === '' || v <= Number(el.max)); el.setAttribute('aria-invalid', String(!ok)); if (!Number.isFinite(v)) return; }
    else if (el.hasAttribute('data-money')) { v = parseBR(el.value); const ok = Number.isFinite(v) && v >= 0; el.setAttribute('aria-invalid', String(!ok)); if (!ok) return; }
    else v = el.value;
    setPath(P, el.name, v);
    if (el.name === 'servico' || el.name === 'acabamento') {
      if (el.name === 'acabamento') { P.cor = acabamento(v).cor; $('#form [name="cor"]').value = P.cor; }
      regenerateAuto(); renderItems(); syncBuilder(false);
    } else if (el.name === 'cor' || el.name.startsWith('edificio.faces')) syncBuilder(false);
    else if (GEO_FIELDS.test(el.name)) syncBuilder(true);
    update(); saveDraft();
  }
  function regenerateAuto() {
    const fresh = autoItems(P), manual = P.itens.filter(i => !i.auto);
    const changed = P.itens.filter(i => i.auto).some(i => { const f = fresh.find(x => x.auto === i.auto); return !f || f.preco !== i.preco; });
    P.itens = [...fresh, ...manual];
    if (changed) toast('Itens automáticos atualizados com os valores de exemplo do catálogo.');
  }

  function renderItems() {
    const c = compute(P);
    $('#items-body').innerHTML = c.linhas.map(it => `
      <tr data-id="${esc(it.id)}">
        <td class="desc" data-label="Descrição"><input type="text" data-f="descricao" value="${esc(it.descricao)}" aria-label="Descrição do item">${it.auto ? ' <span class="tag" title="Quantidade igual à área medida">auto</span>' : ''}${it.exemplo ? ' <span class="ex">valor de exemplo</span>' : ''}</td>
        <td class="un" data-label="Un."><input type="text" data-f="unidade" value="${esc(it.unidade)}" aria-label="Unidade"></td>
        <td class="qtd" data-label="Qtd.">${it.auto ? `<input type="text" value="${esc(numMax2.format(it.quantidade))}" readonly aria-label="Quantidade (área medida, automática)" data-auto-qty>` : `<input type="text" inputmode="decimal" data-f="quantidade" value="${esc(numMax2.format(it.quantidade))}" aria-label="Quantidade">`}</td>
        <td class="preco" data-label="Valor unit. (R$)"><input type="text" inputmode="decimal" data-f="preco" value="${esc(num2.format(it.preco))}" aria-label="Valor unitário em reais"></td>
        <td class="tot" data-label="Total" data-row-total>${money(it.total)}</td>
        <td class="acts"><div class="row-actions">${it.auto ? `<button type="button" class="icon-btn" data-act="unlink" title="Desvincular da área (editar quantidade)" aria-label="Desvincular quantidade da área"><svg viewBox="0 0 24 24"><path d="M9 15 15 9M8 12l-2 2a3 3 0 0 0 4 4l2-2M16 12l2-2a3 3 0 0 0-4-4l-2 2"/></svg></button>` : ''}<button type="button" class="icon-btn" data-act="del" title="Remover item" aria-label="Remover item"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></td>
      </tr>`).join('') || '<tr><td colspan="6" class="help">Nenhum item. Adicione itens abaixo.</td></tr>';
  }
  function onItemInput(ev) {
    const el = ev.target, f = el.dataset.f, tr = el.closest('tr'); if (!f || !tr) return;
    const it = P.itens.find(i => i.id === tr.dataset.id); if (!it) return;
    if (f === 'quantidade' || f === 'preco') { const v = parseBR(el.value); const ok = Number.isFinite(v) && v >= 0; el.setAttribute('aria-invalid', String(!ok)); if (!ok) return; it[f] = v; if (f === 'preco') it.exemplo = false; }
    else it[f] = el.value;
    update(); saveDraft();
  }
  function onItemBlur(ev) {
    const el = ev.target, f = el.dataset.f; if (f !== 'quantidade' && f !== 'preco') return;
    const v = parseBR(el.value); if (Number.isFinite(v)) el.value = f === 'preco' ? num2.format(v) : numMax2.format(v);
    if (f === 'preco') { const tr = el.closest('tr'); const it = P.itens.find(i => i.id === tr.dataset.id); if (it && !it.exemplo) tr.querySelector('.ex')?.remove(); }
  }
  function onItemClick(ev) {
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('tr').dataset.id, it = P.itens.find(i => i.id === id);
    if (b.dataset.act === 'del') P.itens = P.itens.filter(i => i.id !== id);
    if (b.dataset.act === 'unlink' && it) { it.quantidade = compute(P).liquida; it.auto = null; }
    renderItems(); update(); saveDraft();
  }

  /* contador animado para valores */
  const counters = new WeakMap();
  function animateValue(el, to, fmt) {
    const from = counters.get(el) ?? to; counters.set(el, to);
    if (reducedMotionQuery.matches || from === to) { el.textContent = fmt(to); return; }
    const start = performance.now(), dur = 520;
    const step = now => { const k = Ease.outCubic(Math.min(1, (now - start) / dur)); el.textContent = fmt(from + (to - from) * k); if (k < 1 && counters.get(el) === to) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function update() {
    const c = compute(P);
    $$('[data-area-liquida]').forEach(el => animateValue(el, c.liquida, m2));
    animateValue($('[data-area-bruta]'), c.bruta, m2);
    $('[data-altura]').textContent = m(c.altura);
    animateValue($('[data-subtotal]'), c.subtotal, money);
    $('[data-desconto]').textContent = c.desconto ? '− ' + money(c.desconto) : money(0);
    $('[data-impostos-rotulo]').textContent = `${P.impostos.rotulo || 'Impostos'} (${numMax2.format(Number(P.impostos.percentual) || 0)}%)`;
    $('[data-impostos]').textContent = money(c.impostos);
    animateValue($('[data-total]'), c.total, money);
    for (const f of ['frente', 'direita', 'fundos', 'esquerda']) $(`[data-face-area="${f}"]`).textContent = m2(c.faceArea[f]);
    $('[data-validade-ate]').textContent = `Válida até ${fmtDate(c.validadeAte)}`;
    // atualiza quantidades automáticas e totais por linha sem recriar a tabela (mantém o foco)
    c.linhas.forEach(l => {
      const tr = $(`#items-body tr[data-id="${CSS.escape(l.id)}"]`); if (!tr) return;
      tr.querySelector('[data-row-total]').textContent = money(l.total);
      const q = tr.querySelector('[data-auto-qty]'); if (q) q.value = numMax2.format(l.quantidade);
    });
    return c;
  }

  /* ---------------- Documento da proposta ---------------- */
  function renderDoc() {
    const c = compute(P), e = CFG.empresa, s = servico(P.servico), a = acabamento(P.acabamento);
    const img = builder ? builder.snapshot() : '';
    const faces = [['frente', 'Frente'], ['direita', 'Lateral direita'], ['fundos', 'Fundos'], ['esquerda', 'Lateral esquerda']].filter(([k]) => c.e.faces[k]).map(([, n]) => n).join(', ') || 'Nenhuma';
    const cl = P.cliente, ob = P.obra;
    $('#doc').innerHTML = `
      ${CFG.precosSaoExemplo ? '<div class="doc-banner">MODELO — VALORES DE EXEMPLO. Revise os preços antes de enviar ao cliente.</div>' : ''}
      <header class="doc-head">
        <div>${wordmark(false)}
          <div class="doc-company">${esc(e.endereco)}<br>CNPJ ${esc(e.cnpj)} · ${esc(e.telefone)}<br>${esc(e.email)} · ${esc(e.site)}</div>
        </div>
        <div class="doc-meta">
          <h1>PROPOSTA COMERCIAL</h1>
          <p class="doc-num">Nº ${esc(P.numero)}</p>
          <p>Emissão: ${fmtDate(P.dataEmissao)}</p>
          <p>Válida até: ${fmtDate(c.validadeAte)}</p>
        </div>
      </header>
      <section class="doc-cols">
        <div class="doc-box"><h2>Cliente</h2><p><b>${esc(cl.nome || '—')}</b>${cl.documento ? `<br>CPF/CNPJ: ${esc(cl.documento)}` : ''}${cl.contato ? `<br>A/C: ${esc(cl.contato)}` : ''}${cl.telefone || cl.email ? `<br>${esc([cl.telefone, cl.email].filter(Boolean).join(' · '))}` : ''}</p></div>
        <div class="doc-box"><h2>Local da obra</h2><p>${esc(ob.endereco || '—')}${ob.cidade ? `<br>${esc(ob.cidade)}` : ''}</p></div>
      </section>
      <section class="doc-model doc-keep">
        <figure>${img ? `<img src="${img}" alt="Modelo 3D da edificação com o acabamento proposto">` : '<p>Modelo 3D indisponível neste navegador.</p>'}</figure>
        <div>
          <h2 class="doc-h">Dados da edificação</h2>
          <table class="spec"><tbody>
            <tr><th>Frente × profundidade</th><td>${m(c.e.largura)} × ${m(c.e.profundidade)}</td></tr>
            <tr><th>Pavimentos</th><td>${c.e.pavimentos}</td></tr>
            <tr><th>Altura total (com platibanda)</th><td>${m(c.altura)}</td></tr>
            <tr><th>Fachadas incluídas</th><td>${esc(faces)}</td></tr>
            <tr><th>Acabamento</th><td>${esc(s.usaAcabamento ? a.nome : '—')}</td></tr>
            ${P.corReferencia ? `<tr><th>Cor / referência</th><td>${esc(P.corReferencia)}</td></tr>` : ''}
            <tr><th>Área bruta das fachadas</th><td>${m2(c.bruta)}</td></tr>
            <tr><th>Desconto de vãos</th><td>${numMax2.format(c.e.descontoVaos)}%</td></tr>
            <tr><th>Área medida</th><td><b>${m2(c.liquida)}</b></td></tr>
          </tbody></table>
        </div>
      </section>
      <h2 class="doc-h">Escopo e itens</h2>
      <p>${esc(s.nome)}${s.usaAcabamento ? `, com acabamento em ${esc(a.nome.toLowerCase())}` : ''}, nas fachadas indicadas acima.</p>
      <table class="doc-items"><thead><tr><th>#</th><th>Descrição</th><th>Un.</th><th class="n">Qtd.</th><th class="n">Valor unit.</th><th class="n">Total</th></tr></thead>
        <tbody>${c.linhas.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.descricao)}</td><td>${esc(l.unidade)}</td><td class="n">${numMax2.format(l.quantidade)}</td><td class="n">${money(l.preco)}</td><td class="n">${money(l.total)}</td></tr>`).join('')}</tbody></table>
      <div class="doc-totals doc-keep">
        <div><span>Subtotal</span><span>${money(c.subtotal)}</span></div>
        ${c.desconto ? `<div><span>Desconto${P.desconto.tipo === 'percentual' ? ` (${numMax2.format(Number(P.desconto.valor))}%)` : ''}</span><span>− ${money(c.desconto)}</span></div>` : ''}
        ${c.impostos ? `<div><span>${esc(P.impostos.rotulo || 'Impostos')} (${numMax2.format(Number(P.impostos.percentual))}%)</span><span>${money(c.impostos)}</span></div>` : ''}
        <div class="grand"><span>Total</span><span>${money(c.total)}</span></div>
      </div>
      <section class="doc-terms doc-keep">
        <h2 class="doc-h">Condições comerciais</h2>
        <p><b>Prazo de execução:</b> ${esc(P.prazoExecucaoDias)} dias${P.prazoExecucaoDias ? ' corridos' : ''}, a partir da liberação da obra.</p>
        <p><b>Forma de pagamento:</b> ${esc(P.formaPagamento || '—')}</p>
        <p><b>Validade:</b> ${esc(P.validadeDias)} dias (até ${fmtDate(c.validadeAte)}).</p>
        ${P.observacoes ? `<p><b>Observações:</b> ${esc(P.observacoes).replace(/\n/g, '<br>')}</p>` : ''}
      </section>
      <section class="doc-sign doc-keep">
        <div><b>${esc(e.nome)}</b>${esc(e.responsavelTecnico)} · ${esc(e.registroProfissional)}</div>
        <div><b>De acordo — ${esc(cl.nome || 'Cliente')}</b>Assinatura e data</div>
      </section>
      <p class="doc-foot">${esc(e.nome)} · ${esc(e.site)} · Proposta ${esc(P.numero)}</p>`;
  }
  function openPreview() { renderDoc(); const d = $('#preview'); if (!d.open) d.showModal(); $('#btn-print').focus(); }
  window.addEventListener('beforeprint', () => { if (!$('#preview').open) renderDoc(); });

  /* ---------------- Salvar / carregar / exportar ---------------- */
  function saveProposal() {
    const list = storage.get(STORE.list, []);
    P.atualizadoEm = new Date().toISOString();
    const i = list.findIndex(x => x.id === P.id); const copy = JSON.parse(JSON.stringify(P));
    if (i >= 0) list[i] = copy; else list.unshift(copy);
    if (storage.set(STORE.list, list)) { storage.set(STORE.draft, P); renderSaved(); toast(`Proposta ${P.numero} salva.`); }
  }
  function loadProposal(p) { P = normalize(p); storage.set(STORE.draft, P); fillForm(); syncBuilder(true); }
  function renderSaved() {
    const list = storage.get(STORE.list, []);
    $('#saved-body').innerHTML = list.length ? list.map(x => { let total = 0; try { total = compute(normalize(x)).total; } catch { /* ignora registro inválido */ } return `<tr data-id="${esc(x.id)}"><td><b>${esc(x.numero)}</b></td><td>${esc(x.cliente?.nome || 'Sem nome')}</td><td>${fmtDate(x.dataEmissao)}</td><td class="r">${money(total)}</td><td class="acts"><button type="button" class="btn btn-line btn-sm" data-s="open">Abrir</button><button type="button" class="btn btn-line btn-sm" data-s="dup">Duplicar</button><button type="button" class="btn btn-line btn-sm" data-s="del">Excluir</button></td></tr>`; }).join('') : '<tr><td colspan="5" class="empty">Nenhuma proposta salva ainda.</td></tr>';
  }
  function onSavedClick(ev) {
    const b = ev.target.closest('[data-s]'); if (!b) return;
    const id = b.closest('tr').dataset.id, list = storage.get(STORE.list, []), x = list.find(i => i.id === id); if (!x) return;
    if (b.dataset.s === 'open') { loadProposal(x); $('#orcamento').scrollIntoView({ behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' }); toast(`Proposta ${x.numero} aberta.`); }
    if (b.dataset.s === 'dup') { const c = normalize(JSON.parse(JSON.stringify(x))); c.id = uid(); c.numero = nextNumero(); c.dataEmissao = todayISO(); loadProposal(c); toast(`Cópia criada: ${c.numero}. Salve para guardar.`); $('#orcamento').scrollIntoView({ behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' }); }
    if (b.dataset.s === 'del' && confirm(`Excluir a proposta ${x.numero}? Esta ação não pode ser desfeita.`)) { storage.set(STORE.list, list.filter(i => i.id !== id)); renderSaved(); toast('Proposta excluída.'); }
  }
  function download(name, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  async function onImport(ev) {
    const file = ev.target.files[0]; ev.target.value = ''; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data && data.tipo === 'apice-propostas' && Array.isArray(data.propostas)) {
        const list = storage.get(STORE.list, []); let n = 0;
        for (const raw of data.propostas) { try { const p = normalize(raw); const i = list.findIndex(x => x.id === p.id); if (i >= 0) list[i] = p; else list.push(p); n++; } catch { /* ignora inválida */ } }
        storage.set(STORE.list, list); renderSaved(); toast(`${n} proposta(s) importada(s) do backup.`);
      } else { loadProposal(data); toast(`Proposta ${P.numero} importada. Salve para guardar na lista.`); }
    } catch (err) { toast(`Não foi possível importar: ${err.message}`); }
  }

  /* ---------------- Movimento da página ---------------- */
  function initMotion() {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`; io.observe(el); });
    const header = $('.site-header'); addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 12), { passive: true });
  }

  /* ---------------- Início ---------------- */
  buildStaticUI();
  const form = $('#form');
  form.addEventListener('input', onField); form.addEventListener('change', onField);
  form.addEventListener('submit', e => e.preventDefault());
  $$('[data-money]').forEach(el => el.addEventListener('blur', () => { const v = parseBR(el.value); if (Number.isFinite(v)) el.value = numMax2.format(v); }));
  const body = $('#items-body');
  body.addEventListener('input', onItemInput); body.addEventListener('focusout', onItemBlur); body.addEventListener('click', onItemClick);
  $('#swatches').addEventListener('click', e => { const b = e.target.closest('[data-color]'); if (!b) return; const inp = $('#form [name="cor"]'); inp.value = b.dataset.color; inp.dispatchEvent(new Event('input', { bubbles: true })); });
  $('#btn-add-extra').addEventListener('click', () => { const i = $('#sel-extra').value; if (i === '') { toast('Escolha um item do catálogo.'); return; } const x = CFG.itensExtras[i]; P.itens.push({ id: uid(), auto: null, ...x, exemplo: true }); renderItems(); update(); saveDraft(); });
  $('#btn-add-blank').addEventListener('click', () => { P.itens.push({ id: uid(), auto: null, descricao: 'Novo item', unidade: 'un', quantidade: 1, preco: 0, exemplo: false }); renderItems(); update(); saveDraft(); const last = $('#items-body tr:last-child input'); last?.focus(); last?.select(); });
  ['#btn-salvar', '#btn-salvar-2'].forEach(s => $(s).addEventListener('click', saveProposal));
  ['#btn-preview', '#btn-preview-2'].forEach(s => $(s).addEventListener('click', openPreview));
  $('#btn-print').addEventListener('click', () => window.print());
  $('#btn-close-preview').addEventListener('click', () => $('#preview').close());
  $('#preview').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#btn-nova').addEventListener('click', () => { if (!confirm('Começar uma nova proposta? Alterações não salvas desta proposta serão descartadas.')) return; loadProposal(newProposal()); toast(`Nova proposta ${P.numero}.`); });
  $('#btn-export').addEventListener('click', () => download(`proposta-${P.numero}.json`, P));
  $('#btn-export-all').addEventListener('click', () => { const list = storage.get(STORE.list, []); download(`apice-propostas-backup-${todayISO()}.json`, { tipo: 'apice-propostas', versao: SCHEMA, exportadoEm: new Date().toISOString(), propostas: list }); });
  $('#file-import').addEventListener('change', onImport);
  $('#saved-body').addEventListener('click', onSavedClick);

  fillForm(); renderSaved(); initMotion(); init3D();
  // API de diagnóstico (testes automatizados e capturas)
  window.apice = { setShowcase(on, i) { showcaseOn = !!on; if (setHeroFinish && Number.isInteger(i)) setHeroFinish(i); }, get hero() { return hero; }, get builder() { return builder; }, get proposta() { return P; }, compute: () => compute(P), renderDoc };
})();
