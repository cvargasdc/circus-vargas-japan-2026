(function () {
  'use strict';

  const DATA = window.TRIP_DATA;
  if (!DATA) {
    console.error('TRIP_DATA missing — run scripts/sync-data.js');
    return;
  }

  const STORAGE_KEY = 'circus-vargas-japan-v1';
  const TZ = DATA.meta.timezone || 'Asia/Tokyo';

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }
  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  let state = loadState();

  function itemKey(dayId, itemId) {
    return `${dayId}::${itemId}`;
  }
  function getItemState(dayId, itemId) {
    const k = itemKey(dayId, itemId);
    return state[k] || { done: false, star: false, note: '' };
  }
  function setItemState(dayId, itemId, patch) {
    const k = itemKey(dayId, itemId);
    state[k] = { ...getItemState(dayId, itemId), ...patch };
    saveState(state);
  }

  function mapsLink(query, mapsUrl) {
    if (mapsUrl) return mapsUrl;
    if (!query) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  function searchLink(query) {
    if (!query) return null;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  /** Look up photo by mapsQuery (central data/photos.json — survives Doc sync). */
  function photoFor(mapsQuery) {
    if (!mapsQuery || !DATA.photos) return null;
    return DATA.photos[mapsQuery] || null;
  }

  function renderPlacePhoto(mapsQuery, mapsUrl, altTitle) {
    const photo = photoFor(mapsQuery);
    const map = mapsLink(mapsQuery, mapsUrl);
    if (!photo || !photo.file || !map) return '';
    const credit = photo.credit ? ` · ${photo.credit}` : '';
    return `
      <a class="place-photo" href="${escapeHtml(map)}" target="_blank" rel="noopener noreferrer"
         title="Open in Google Maps${escapeHtml(credit)}">
        <img src="${escapeHtml(photo.file)}" alt="${escapeHtml(altTitle || mapsQuery)}" loading="lazy" width="120" height="90" />
        <span class="place-photo-badge" aria-hidden="true">📍 Maps</span>
      </a>`;
  }

  const HOME_TZ = 'America/Los_Angeles';
  /** Date at home (Pacific) — used for the pre-trip countdown. */
  function homeYmd(d = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: HOME_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  function tokyoYmd(d = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  }

  function statusPill(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    let cls = 'pill-plan';
    if (s.includes('booked')) cls = 'pill-booked';
    else if (s.includes('not ticketed') || s.includes('planned')) cls = 'pill-planned';
    return `<span class="pill ${cls}">${escapeHtml(status)}</span>`;
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function linkify(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  function daysUntilTrip(todayYmd) {
    const start = DATA.meta.tripStart;
    const a = new Date(todayYmd + 'T12:00:00Z');
    const b = new Date(start + 'T12:00:00Z');
    return Math.round((b - a) / 86400000);
  }

  function findDay(dateStr) {
    return DATA.days.find((d) => d.date === dateStr) || null;
  }

  function renderItem(day, item) {
    const st = getItemState(day.id, item.id);
    const map = mapsLink(item.mapsQuery, item.mapsUrl);
    const search = searchLink(item.mapsQuery || item.title);
    const doneClass = st.done ? ' done' : '';
    const photoHtml = renderPlacePhoto(item.mapsQuery, item.mapsUrl, item.title);
    return `
      <article class="item${doneClass}" data-day="${escapeHtml(day.id)}" data-item="${escapeHtml(item.id)}">
        <div class="item-top">
          <div class="item-checks">
            <label title="Done!">
              <span class="sr-only">Mark done</span>
              <input class="chk js-done" type="checkbox" ${st.done ? 'checked' : ''} aria-label="Mark done!">
            </label>
            <button type="button" class="btn-icon js-star" aria-label="Favorite" aria-pressed="${st.star ? 'true' : 'false'}">${st.star ? '★' : '☆'}</button>
          </div>
          <div class="item-body">
            <div class="item-title">${escapeHtml(item.title)} ${statusPill(item.status)}</div>
            ${photoHtml}
            ${item.detail ? `<div class="item-detail">${linkify(item.detail)}</div>` : ''}
            <div class="item-actions">
              ${map ? `<a class="btn btn-sm btn-indigo" href="${escapeHtml(map)}" target="_blank" rel="noopener noreferrer">Maps</a>` : ''}
              ${search ? `<a class="btn btn-sm btn-paper" href="${escapeHtml(search)}" target="_blank" rel="noopener noreferrer">Search</a>` : ''}
              ${item.link ? `<a class="btn btn-sm btn-paper" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Link</a>` : ''}
            </div>
            <label class="sr-only" for="note-${escapeHtml(item.id)}">Personal note</label>
            <textarea id="note-${escapeHtml(item.id)}" class="item-note js-note" placeholder="Your note (this phone only)…" rows="1">${escapeHtml(st.note)}</textarea>
          </div>
        </div>
      </article>`;
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function daySun(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
    if (!m) return '';
    return `<span class="day-sun" aria-hidden="true"><small>${MONTHS[Number(m[2]) - 1]}</small>${Number(m[3])}</span>`;
  }

  function eyebrow(jp, en) {
    return `<p class="eyebrow"><span class="jp" lang="ja">${jp}</span><span>${en}</span></p>`;
  }

  function renderDayCard(day, opts = {}) {
    const callouts = (day.callouts || [])
      .map((c) => `<div class="callout">${linkify(c)}</div>`)
      .join('');
    const items = (day.items || []).map((it) => renderItem(day, it)).join('');
    return `
      <section class="card" ${opts.id ? `id="${escapeHtml(opts.id)}"` : ''}>
        <div class="day-title-row">
          ${daySun(day.date)}
          <h2>${escapeHtml(day.title)}</h2>
        </div>
        <p class="muted day-meta">${escapeHtml(day.weekday)} · ${escapeHtml(day.date)} · ${escapeHtml(day.city || '')}</p>
        <p>${escapeHtml(day.summary || '')}</p>
        ${callouts}
        ${items}
      </section>`;
  }

  function renderToday() {
    const el = document.getElementById('panel-today');
    const today = tokyoYmd();
    const start = DATA.meta.tripStart;
    const end = DATA.meta.tripEnd;
    const day = findDay(today);

    if (today < start) {
      const n = daysUntilTrip(homeYmd());
      el.innerHTML = `
        ${eyebrow('今日', 'Today')}
        <div class="card countdown">
          <p class="muted">Pacific time · we fly Oct 8, land in Tokyo Oct 9</p>
          <div class="big">${n}</div>
          <p class="countdown-label">${n === 1 ? 'day' : 'days'} until Japan!</p>
          <p><strong>🎪 Circus Vargas adventure countdown</strong></p>
          <p class="muted">Crew: ${escapeHtml(DATA.meta.partySize)}</p>
        </div>
        ${renderDayCard(DATA.days[0], { id: 'preview-first' })}
        <p class="muted" style="text-align:center">Peek at arrival day. Tap <strong>Days</strong> for the whole plan.</p>`;
      wireItemControls(el);
      return;
    }

    if (today > end) {
      el.innerHTML = `
        <div class="card countdown">
          <div class="big">🎪</div>
          <p class="countdown-label">Adventure complete!</p>
          <p><strong>Thanks for the memories!</strong></p>
          <p class="muted">Oct 9–18, 2026 · peek at Days anytime.</p>
        </div>`;
      return;
    }

    if (day) {
      el.innerHTML = `
        ${eyebrow('今日', 'Today')}
        <p class="muted" style="margin:0 0 8px">Today (Tokyo time) · ${escapeHtml(today)}</p>
        ${renderDayCard(day)}`;
      wireItemControls(el);
    } else {
      el.innerHTML = `<div class="card"><p>No day entry for ${escapeHtml(today)}.</p></div>`;
    }
  }

  let selectedItinDate = null;

  function renderItinerary() {
    const el = document.getElementById('panel-itinerary');
    if (!selectedItinDate) {
      const today = tokyoYmd();
      if (today >= DATA.meta.tripStart && today <= DATA.meta.tripEnd && findDay(today)) {
        selectedItinDate = today;
      } else {
        selectedItinDate = DATA.days[0].date;
      }
    }
    const chips = DATA.days
      .map((d) => {
        const label = d.date.slice(5).replace('-', '/');
        const sel = d.date === selectedItinDate;
        return `<button type="button" class="day-chip js-day-chip" data-date="${escapeHtml(d.date)}" aria-selected="${sel}">
          <span class="d">${escapeHtml(label.split('/')[1])}</span>
          ${escapeHtml(d.weekday.slice(0, 3))}
        </button>`;
      })
      .join('');
    const day = findDay(selectedItinDate) || DATA.days[0];
    el.innerHTML = `
      ${eyebrow('日程', 'Days')}
      <div class="day-picker" role="tablist" aria-label="All the days">${chips}</div>
      ${renderDayCard(day)}`;
    el.querySelectorAll('.js-day-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedItinDate = btn.dataset.date;
        renderItinerary();
      });
    });
    wireItemControls(el);
  }

  function wireItemControls(root) {
    root.querySelectorAll('.item').forEach((article) => {
      const dayId = article.dataset.day;
      const itemId = article.dataset.item;
      const done = article.querySelector('.js-done');
      const star = article.querySelector('.js-star');
      const note = article.querySelector('.js-note');
      done.addEventListener('change', () => {
        setItemState(dayId, itemId, { done: done.checked });
        article.classList.toggle('done', done.checked);
      });
      star.addEventListener('click', () => {
        const cur = getItemState(dayId, itemId);
        const next = !cur.star;
        setItemState(dayId, itemId, { star: next });
        star.setAttribute('aria-pressed', next ? 'true' : 'false');
        star.textContent = next ? '★' : '☆';
      });
      note.addEventListener('input', () => {
        setItemState(dayId, itemId, { note: note.value });
      });
    });
  }

  /* ── Say it: pronunciation audio ──
   * Clips are embedded as data URIs in window.PHRASE_AUDIO (phrase-audio.js /
   * inlined in companion.html), keyed by the phrase's Japanese text.
   * No clip (e.g. a new phrase from the Doc) or a playback error → the phone's
   * own Japanese voice via speechSynthesis (lang ja-JP), reading kana/kanji.
   * play()/speak() are called synchronously inside the tap handler (iOS). */
  const SLOW_KEY = 'cvj-say-slow';
  const JP_RE = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/;
  let slowMode = false;
  try {
    slowMode = localStorage.getItem(SLOW_KEY) === '1';
  } catch { /* ignore */ }
  const sayer = { audio: null, btn: null };

  function phraseAudio() {
    return window.PHRASE_AUDIO || { clips: {}, tts: {} };
  }
  function ttsText(ja) {
    const pa = phraseAudio();
    if (pa.tts && pa.tts[ja]) return pa.tts[ja];
    const lead = /^[\s….。〜~_＿]+/.test(ja);
    let t = ja.replace(/^[\s….。〜~_＿]+|[\s….〜~_＿]+$/g, '').replace(/\?/g, '？');
    if (lead && t.startsWith('は')) t = 'わ、' + t.slice(1); // "…は" template: particle reads "wa"
    return t;
  }
  function setSaying(btn, on) {
    if (!btn) return;
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function doneSaying(btn) {
    if (sayer.btn !== btn) return;
    setSaying(btn, false);
    sayer.btn = null;
  }
  function stopSaying() {
    if (sayer.audio) {
      try { sayer.audio.pause(); } catch { /* ignore */ }
    }
    if (window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    setSaying(sayer.btn, false);
    sayer.btn = null;
  }
  function speakFallback(ja, btn) {
    const synth = window.speechSynthesis;
    if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') {
      doneSaying(btn);
      btn.classList.add('no-audio');
      setTimeout(() => btn.classList.remove('no-audio'), 900);
      return;
    }
    const u = new SpeechSynthesisUtterance(ttsText(ja));
    u.lang = 'ja-JP';
    const voice = (synth.getVoices() || []).find((v) => /^ja([-_]|$)/i.test(v.lang));
    if (voice) u.voice = voice;
    u.rate = slowMode ? 0.6 : 0.85;
    u.onend = () => doneSaying(btn);
    u.onerror = () => doneSaying(btn);
    synth.cancel();
    synth.speak(u);
  }
  function sayPhrase(btn) {
    const ja = btn.dataset.ja || '';
    if (sayer.btn === btn) {
      stopSaying(); // second tap on the same button = stop
      return;
    }
    stopSaying();
    sayer.btn = btn;
    setSaying(btn, true);
    const src = (phraseAudio().clips || {})[ja];
    if (!src) {
      speakFallback(ja, btn);
      return;
    }
    if (!sayer.audio) {
      sayer.audio = new Audio();
      sayer.audio.preload = 'auto';
    }
    const a = sayer.audio;
    a.onended = () => doneSaying(btn);
    a.onerror = () => {
      if (sayer.btn === btn) speakFallback(ja, btn);
    };
    a.src = src;
    const rate = slowMode ? 0.75 : 1;
    a.defaultPlaybackRate = rate;
    a.playbackRate = rate;
    a.preservesPitch = true;
    a.webkitPreservesPitch = true;
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        if (sayer.btn === btn && (!err || err.name !== 'AbortError')) speakFallback(ja, btn);
      });
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopSaying();
  });

  const SAY_ICON =
    '<svg class="ico-say" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">' +
    '<path d="M3.5 9.2v5.6h3.9l5.1 4.2V5L7.4 9.2H3.5z" fill="currentColor"/>' +
    '<path d="M15.6 8.6a4.8 4.8 0 0 1 0 6.8M18.3 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '<svg class="ico-stop" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';

  let phraseCat = 'all';
  let phraseQuery = '';

  function renderPhrases() {
    stopSaying();
    const el = document.getElementById('panel-phrases');
    const cats = DATA.phrases.categories;
    const chips = [
      `<button type="button" class="cat-chip js-cat" data-cat="all" aria-selected="${phraseCat === 'all'}">All</button>`,
      ...cats.map(
        (c) =>
          `<button type="button" class="cat-chip js-cat" data-cat="${escapeHtml(c.id)}" aria-selected="${phraseCat === c.id}">${escapeHtml(c.name)}</button>`
      )
    ].join('');

    let items = cats.flatMap((c) =>
      c.items.map((it) => ({ ...it, category: c.name, catId: c.id }))
    );
    if (phraseCat !== 'all') items = items.filter((i) => i.catId === phraseCat);
    const q = phraseQuery.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (i) =>
          (i.ja && i.ja.toLowerCase().includes(q)) ||
          (i.romaji && i.romaji.toLowerCase().includes(q)) ||
          (i.en && i.en.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }

    const cards = items
      .map(
        (p) => `
      <div class="phrase-unit">
      <button type="button" class="phrase-card js-phrase" data-copy="${escapeHtml(p.ja || p.romaji)}" aria-label="Flip phrase: ${escapeHtml(p.romaji)}">
        <div class="phrase-inner">
          <div class="phrase-face front">
            <div class="phrase-try">Try saying…</div>
            <div class="phrase-ja">${escapeHtml(p.ja || p.romaji)}</div>
            <div class="phrase-romaji">${escapeHtml(p.romaji)}</div>
            <div class="phrase-hint">👆 Tap to flip!</div>
          </div>
          <div class="phrase-face back">
            <div class="phrase-try">You said it!</div>
            <div class="phrase-en">${escapeHtml(p.en)}</div>
            <div class="phrase-romaji">${escapeHtml(p.romaji)}</div>
            <div class="phrase-ja phrase-ja-sm">${escapeHtml(p.ja || '')}</div>
          </div>
        </div>
      </button>
      ${p.ja && JP_RE.test(p.ja)
        ? `<button type="button" class="say-btn js-say" data-ja="${escapeHtml(p.ja.trim())}" aria-pressed="false" aria-label="Play pronunciation of ${escapeHtml(p.en)}">${SAY_ICON}</button>`
        : ''}
      <div class="phrase-tools">
        <button type="button" class="btn btn-sm btn-paper js-copy" data-copy="${escapeHtml(p.ja || p.romaji)}">Copy Japanese</button>
      </div>
      </div>`
      )
      .join('');

    el.innerHTML = `
      ${eyebrow('言葉', 'Say it!')}
      <div class="card">
        <h2>Say it like a pro 🎤</h2>
        <p>${escapeHtml(DATA.phrases.pronunciationTip)}</p>
        <div class="say-controls">
          <span class="say-help"><span class="say-help-dot" aria-hidden="true">${SAY_ICON}</span>Tap to hear it in Japanese</span>
          <button type="button" class="btn btn-sm btn-paper slow-toggle js-slow" aria-pressed="${slowMode}">🐢 Slow</button>
        </div>
      </div>
      <div class="search-row">
        <label class="sr-only" for="phrase-search">Search phrases</label>
        <input id="phrase-search" type="search" placeholder="Find a phrase…" value="${escapeHtml(phraseQuery)}" autocomplete="off">
      </div>
      <div class="cat-tabs" role="tablist">${chips}</div>
      <div class="phrase-grid">${cards || '<p class="muted">No matches — try another word!</p>'}</div>`;

    el.querySelector('#phrase-search').addEventListener('input', (e) => {
      phraseQuery = e.target.value;
      renderPhrases();
      const input = document.getElementById('phrase-search');
      if (input) {
        input.focus();
        const len = input.value.length;
        input.setSelectionRange(len, len);
      }
    });
    el.querySelectorAll('.js-cat').forEach((btn) => {
      btn.addEventListener('click', () => {
        phraseCat = btn.dataset.cat;
        renderPhrases();
      });
    });
    el.querySelectorAll('.js-phrase').forEach((card) => {
      card.addEventListener('click', () => card.classList.toggle('flipped'));
    });
    el.querySelectorAll('.js-say').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sayPhrase(btn);
      });
    });
    const slowBtn = el.querySelector('.js-slow');
    if (slowBtn) {
      slowBtn.addEventListener('click', () => {
        slowMode = !slowMode;
        slowBtn.setAttribute('aria-pressed', String(slowMode));
        try {
          localStorage.setItem(SLOW_KEY, slowMode ? '1' : '0');
        } catch { /* ignore */ }
        if (sayer.audio && sayer.btn) {
          sayer.audio.playbackRate = slowMode ? 0.75 : 1;
        }
      });
    }
    el.querySelectorAll('.js-copy').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = btn.dataset.copy;
        try {
          await navigator.clipboard.writeText(text);
          const prev = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => (btn.textContent = prev), 1200);
        } catch {
          btn.textContent = 'Copy failed';
        }
      });
    });
  }

  function renderStays() {
    const el = document.getElementById('panel-stays');
    const stays = DATA.stays
      .map((s) => {
        const map = mapsLink(s.mapsQuery, s.mapsUrl);
        const photoHtml = renderPlacePhoto(s.mapsQuery, s.mapsUrl, s.name);
        return `
        <article class="card stay-card">
          <h3>${escapeHtml(s.name)} ${statusPill(s.status)}</h3>
          ${photoHtml}
          <p class="muted">${escapeHtml(s.area)} · ${escapeHtml(s.nights)}</p>
          <p class="kv"><span>Check-in:</span> ${escapeHtml(s.checkIn)}</p>
          <p class="kv"><span>Checkout:</span> ${escapeHtml(s.checkOut)}</p>
          ${s.notes ? `<p class="item-detail">${linkify(s.notes)}</p>` : ''}
          ${s.mismatch ? `<div class="callout">${escapeHtml(s.mismatch)}</div>` : ''}
          <div class="item-actions">
            ${map ? `<a class="btn btn-sm btn-primary" href="${escapeHtml(map)}" target="_blank" rel="noopener noreferrer">Open Maps</a>` : ''}
            <a class="btn btn-sm btn-paper" href="${escapeHtml(searchLink(s.mapsQuery))}" target="_blank" rel="noopener noreferrer">Google</a>
          </div>
        </article>`;
      })
      .join('');

    const trains = DATA.trains
      .map((t) => {
        return `
        <article class="card">
          <h3>${escapeHtml(t.label)} ${statusPill(t.status)}</h3>
          <p class="muted">${escapeHtml(t.date)}</p>
          <p class="kv"><span>From:</span> ${escapeHtml(t.from)}</p>
          <p class="kv"><span>To:</span> ${escapeHtml(t.to)}</p>
          <p class="kv"><span>Seats:</span> ${escapeHtml(t.car)}</p>
          ${t.notes ? `<p class="item-detail">${linkify(t.notes)}</p>` : ''}
          ${t.mismatch ? `<div class="callout">${escapeHtml(t.mismatch)}</div>` : ''}
        </article>`;
      })
      .join('');

    el.innerHTML = `
      <h2 class="sr-only">Hotels & trains</h2>
      ${eyebrow('宿', 'Hotels')}
      <p style="margin-top:0">Hotels below are the real booked ones. Train status is shown below; two return seats still need tickets.</p>
      ${stays}
      <div class="section-title">${eyebrow('電車', '🚂 Trains')}</div>
      <h2 class="sr-only">Trains</h2>
      ${trains}`;
  }

  function renderParty() {
    const el = document.getElementById('panel-party');
    const notes = (DATA.party.notes || [])
      .map((n) => `<li>${linkify(n)}</li>`)
      .join('');
    // Kids' names for the adults (data/overrides.json → party.nicknames)
    const nicks = DATA.party.nicknames || {};
    const nickFor = (name) => {
      const n = nicks[String(name || '').trim()];
      return n && n !== name ? n : '';
    };
    // "Alyssa" → "Tia (Alyssa)"; "Pete" → "Uncle Pete" (nickname already says it)
    const whoLabel = (who) => {
      const n = nickFor(who);
      if (!n) return who;
      return n.toLowerCase().includes(String(who).toLowerCase()) ? n : `${n} (${who})`;
    };
    // Optional extras per wish (data/overrides.json → party.priorities.add):
    // "when" (suggested day) and "url" (Google Maps link)
    const pri = (DATA.party.priorities || [])
      .map((p) => {
        const when = p.when ? `<div class="wish-when">📅 ${escapeHtml(p.when)}</div>` : '';
        const url = /^https?:\/\//.test(String(p.url || ''))
          ? `<div class="item-actions wish-actions"><a class="btn btn-sm btn-indigo" href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer">Maps</a></div>`
          : '';
        return `<li class="${when || url ? 'wish-rich' : ''}"><strong>${escapeHtml(whoLabel(p.who))}:</strong> ${escapeHtml(p.what)}${when}${url}</li>`;
      })
      .join('');
    const members = (DATA.party.members || [])
      .map((name, i) => {
        const nick = nickFor(name);
        const names = nick
          ? `<span class="crew-nick">${escapeHtml(nick)}</span><span class="crew-real">${escapeHtml(name)}</span>`
          : `<span class="crew-nick">${escapeHtml(name)}</span>`;
        return `<li class="crew-member${nick ? ' has-nick' : ''}"><span class="crew-num">${i + 1}</span><span class="crew-names">${names}</span></li>`;
      })
      .join('');
    const hasNicks = (DATA.party.members || []).some((m) => nickFor(m));
    el.innerHTML = `
      ${eyebrow('仲間', 'Crew')}
      <div class="card">
        <h2>🎪 The circus crew</h2>
        <p class="muted">${escapeHtml(DATA.party.party)}</p>
        ${hasNicks ? `<p class="crew-hint">Big names = what Amaya &amp; Ellie call everyone!</p>` : ''}
        ${members ? `<ol class="crew-list">${members}</ol>` : ''}
      </div>
      <div class="card">
        <h2>Crew notes</h2>
        <ul>${notes}</ul>
      </div>
      <div class="card">
        <h2>Wish list</h2>
        <ul>${pri}</ul>
      </div>
      <div class="card">
        <h2>Useful links</h2>
        <div class="item-actions" style="flex-direction:column;align-items:stretch">
          <a class="btn btn-primary" href="${escapeHtml(DATA.meta.docUrl)}" target="_blank" rel="noopener noreferrer">Edit Doc (shared plan)</a>
          <a class="btn btn-paper" href="${escapeHtml(DATA.links.kansaiPassVideo)}" target="_blank" rel="noopener noreferrer">Kansai Wide Area Pass video</a>
          <a class="btn btn-paper" href="${escapeHtml(DATA.links.amanohashidateVideo1)}" target="_blank" rel="noopener noreferrer">Amanohashidate video 1</a>
          <a class="btn btn-paper" href="${escapeHtml(DATA.links.amanohashidateVideo2)}" target="_blank" rel="noopener noreferrer">Amanohashidate video 2</a>
          <a class="btn btn-paper" href="${escapeHtml(DATA.links.zakuKnives)}" target="_blank" rel="noopener noreferrer">Zaku Knives</a>
          <a class="btn btn-paper" href="${escapeHtml(DATA.links.washletGuide)}" target="_blank" rel="noopener noreferrer">Japanese toilet buttons guide</a>
          <a class="btn btn-paper" href="${escapeHtml(DATA.links.washletVideo)}" target="_blank" rel="noopener noreferrer">Japanese toilet buttons video</a>
        </div>
      </div>`;
  }


  function renderJetLag() {
    const el = document.getElementById('panel-jetlag');
    el.innerHTML = `
      ${eyebrow('時差', 'Coming home')}
      <div class="card">
        <h2>Jet Lag: Coming Home</h2>
        <p>Return leg only. Kids stay on Tokyo time — this shift is for Chris.</p>
      </div>
      <article class="card">
        <h3>Last days in Tokyo</h3>
        <p class="muted">Oct 15–17</p>
        <ul>
          <li>Protect Chris's sleep. No naps after <strong>3pm Tokyo</strong>.</li>
          <li>Saturday, stay up until about <strong>11pm Tokyo</strong> (<strong>7am LA</strong>).</li>
          <li>Don't shift the kids.</li>
        </ul>
      </article>
      <article class="card">
        <h3>Flight NH126</h3>
        <p class="muted">Sun Oct 18</p>
        <p class="kv"><span>Departs:</span> Haneda <strong>9:05pm Tokyo</strong> (<strong>5:05am LA</strong>)</p>
        <p class="kv"><span>Lands:</span> about <strong>3:10pm LA</strong></p>
        <ul>
          <li>Sleep <strong>9pm–1am Tokyo</strong> (<strong>5–9am LA</strong>) with an eye mask.</li>
          <li>Wake about <strong>1am Tokyo</strong> (<strong>9am LA</strong>): light, water, food, and caffeine.</li>
          <li>Stay awake the rest of the flight.</li>
          <li>No car nap on landing.</li>
        </ul>
      </article>
      <article class="card">
        <h3>Sunday after landing</h3>
        <ul>
          <li>Outdoor light <strong>4–6pm LA</strong>.</li>
          <li>Early dinner, then bed with the kids about <strong>9–9:30pm LA</strong>.</li>
          <li>Only a <strong>20-minute nap</strong>, and only before <strong>5pm LA</strong>.</li>
        </ul>
      </article>
      <article class="card">
        <h3>Monday Oct 19 · workday</h3>
        <ul>
          <li>Up by <strong>7am LA</strong>. Outdoor light before work.</li>
          <li>Coffee only before noon.</li>
          <li>Short walk in the <strong>2–4pm</strong> danger zone.</li>
          <li>Bed by <strong>10pm</strong>.</li>
        </ul>
        <div class="callout">Functional Monday. The fog clears Tuesday.</div>
      </article>`;
  }

  const panels = {
    today: renderToday,
    itinerary: renderItinerary,
    phrases: renderPhrases,
    stays: renderStays,
    party: renderParty,
    jetlag: renderJetLag
  };

  function showPanel(name) {
    stopSaying();
    document.querySelectorAll('.panel').forEach((p) => {
      p.classList.toggle('active', p.id === `panel-${name}`);
    });
    document.querySelectorAll('.nav-tabs button').forEach((b) => {
      b.setAttribute('aria-selected', b.dataset.panel === name ? 'true' : 'false');
    });
    if (panels[name]) panels[name]();
    try {
      sessionStorage.setItem('cvj-tab', name);
    } catch { /* ignore */ }
  }

  function init() {
    document.getElementById('doc-btn').href = DATA.meta.docUrl;
    document.getElementById('last-synced').textContent = DATA.meta.lastSynced;
    document.getElementById('banner-text').textContent = DATA.meta.banner;

    document.querySelectorAll('.nav-tabs button').forEach((btn) => {
      btn.addEventListener('click', () => showPanel(btn.dataset.panel));
    });

    let start = 'today';
    try {
      start = sessionStorage.getItem('cvj-tab') || 'today';
    } catch { /* ignore */ }
    showPanel(start);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
