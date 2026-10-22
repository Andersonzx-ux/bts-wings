/* UI do player WINGS — BTS
   Dois "mundos" (luz / sombra) e um círculo da capa por faixa no plano de fundo. */

const ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
    repeatOne: '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>'
};

// Composições do fundo: centro do círculo (% da tela), tamanho (em vmax) e giro inicial.
const POSES = [
    { x: 80, y: 64, s: 118 }, { x: 14, y: 72, s: 104 }, { x: 72, y: 22, s: 96 },
    { x: 22, y: 28, s: 128 }, { x: 90, y: 88, s: 142 }, { x: 52, y: 58, s: 150 }
];
const WORLD_MODES = ['auto', 'light', 'dark'];
const WORLD_LABEL = { auto: 'Auto', light: 'Luz', dark: 'Sombra' };
const WORLD_THEME_COLOR = { light: '#FDFDFD', dark: '#0F0F0F' };

class UI {
    constructor(player, albumData) {
        this.player = player;
        this.albumData = albumData;
        this.currentLyrics = null;
        this.activeLyricIndex = -1;
        this.motifSlot = 0;
        this.currentMotif = null;

        const $ = (id) => document.getElementById(id);
        this.elements = {
            albumTitle: $('album-title'), albumArtist: $('album-artist'), albumMeta: $('album-meta'),
            tracklist: $('tracklist'),
            currentKicker: $('current-kicker'), currentTitle: $('current-title'), currentComposers: $('current-composers'),
            progressBar: $('progress-bar'), timeCurrent: $('time-current'), timeTotal: $('time-total'),
            btnShuffle: $('btn-shuffle'), btnPrev: $('btn-prev'), btnPlay: $('btn-play-pause'),
            btnNext: $('btn-next'), btnRepeat: $('btn-repeat'), volumeBar: $('volume-bar'),
            lyricsSection: $('lyrics-section'), lyricsTitle: $('lyrics-title'), lyricsComposers: $('lyrics-composers'),
            lyricsContent: $('lyrics-content'), btnToggleLyrics: $('btn-toggle-lyrics'), btnExpandLyrics: $('btn-expand-lyrics'), btnTranslation: $('btn-translation'),
            btnAbout: $('btn-about'), btnAwards: $('btn-awards'), btnCredits: $('btn-credits'),
            btnWorld: $('btn-world'), worldLabel: $('world-label'), metaTheme: $('meta-theme-color'),
            motifs: [$('motif-a'), $('motif-b')]
        };

        this.worldMode = 'auto';
        try {
            const saved = localStorage.getItem('wings_world');
            if (WORLD_MODES.includes(saved)) this.worldMode = saved;
        } catch (e) { /* sem storage */ }

        this.init();
    }

    init() {
        this.renderAlbumInfo();
        this.renderTracklist();
        this.renderModals();
        this.setupEventListeners();
        this.elements.btnPlay.innerHTML = ICONS.play;
        this.elements.volumeBar.value = this.player.audio.volume;
        this.updateRangeFill(this.elements.volumeBar, '--volume', this.player.audio.volume * 100);
        this.updateRepeatButton();
        this.elements.btnShuffle.classList.toggle('active', this.player.isShuffle);
        this.applyWorld();
        this.setupMediaSession();
        let showTr = true;
        try { showTr = localStorage.getItem('wings_translation') !== '0'; } catch (e) { /* padrão: ligado */ }
        this.elements.lyricsSection.classList.toggle('show-tr', showTr);
        this.elements.btnTranslation.setAttribute('aria-pressed', String(showTr));
        this.elements.btnTranslation.addEventListener('click', () =>
            this.setTranslationVisible(!this.elements.lyricsSection.classList.contains('show-tr')));
        requestAnimationFrame(() => { this.ready = true; });
    }

    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    parseLRC(rawText) {
        if (!rawText) return null;
        const timeTag = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
        const result = [];
        let hasTimestamps = false;
        rawText.split(/\r?\n/).forEach(line => {
            const tags = [...line.matchAll(timeTag)];
            if (tags.length === 0) return;
            hasTimestamps = true;
            const text = line.replace(timeTag, '').trim();
            tags.forEach(tag => {
                const ms = parseInt((tag[3] || '0').padEnd(3, '0').slice(0, 3), 10);
                result.push({ time: parseInt(tag[1], 10) * 60 + parseInt(tag[2], 10) + ms / 1000, text });
            });
        });
        if (!hasTimestamps) return null;
        return result.sort((a, b) => a.time - b.time);
    }

    updateRangeFill(el, prop, percent) {
        el.style.setProperty(prop, `${Math.max(0, Math.min(100, percent))}%`);
    }

    /* ---------- Cabeçalho ---------- */
    renderAlbumInfo() {
        const { elements, albumData } = this;
        const title = albumData.title || 'Álbum';
        elements.albumTitle.setAttribute('aria-label', title);
        elements.albumTitle.textContent = '';
        [...title].forEach(ch => {
            const sp = document.createElement('span');
            sp.setAttribute('aria-hidden', 'true');
            sp.textContent = ch;
            elements.albumTitle.appendChild(sp);
        });
        elements.albumArtist.textContent = albumData.artist || '';
        const n = albumData.tracks.length;
        const parts = [`${n} faixas`];
        if (albumData.releaseDate) parts.push(albumData.releaseDate);
        if (albumData.totalDuration) parts.push(albumData.totalDuration);
        elements.albumMeta.textContent = parts.join('  ·  ');
    }

    /* ---------- Faixas ---------- */
    renderTracklist() {
        const { tracklist } = this.elements;
        tracklist.innerHTML = '';
        this.albumData.tracks.forEach((track, index) => {
            const li = document.createElement('li');
            li.className = 'track-item';
            li.dataset.index = index;
            li.tabIndex = 0;
            li.setAttribute('role', 'button');

            const num = document.createElement('span');
            num.className = 'track-num';
            num.textContent = String(track.number).padStart(2, '0');

            const details = document.createElement('div');
            details.className = 'track-details';
            const title = document.createElement('span');
            title.className = 'track-title';
            title.textContent = track.title;
            details.appendChild(title);
            const credit = document.createElement('span');
            credit.className = 'credit';
            credit.textContent = track.credit || '';
            details.appendChild(credit);

            const dur = document.createElement('span');
            dur.className = 'track-duration';
            dur.textContent = track.duration || '';

            const marker = document.createElement('span');
            marker.className = 'track-marker';
            marker.setAttribute('aria-hidden', 'true');
            marker.style.backgroundImage = `url("assets/motifs/${track.motif || 'dark'}.jpg")`;
            li.append(num, marker, details, dur);
            const play = () => this.player.playTrack(index);
            li.addEventListener('click', play);
            li.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
            });
            tracklist.appendChild(li);
        });
    }

    /* ---------- Modais ---------- */
    renderModals() {
        const { albumData, elements } = this;
        const about = document.getElementById('about-content');
        const meta = [];
        if (albumData.releaseDate) meta.push(`<p><strong>Lançamento:</strong> ${albumData.releaseDate}</p>`);
        if (albumData.genre) meta.push(`<p><strong>Gênero:</strong> ${albumData.genre}</p>`);
        if (albumData.labels && albumData.labels.length) meta.push(`<p><strong>Gravadora:</strong> ${albumData.labels.join(', ')}</p>`);
        about.innerHTML = `<p>${albumData.description || ''}</p><br>${meta.join('')}`;

        const awards = albumData.awards || [];
        if (awards.length === 0) elements.btnAwards.hidden = true;
        else document.getElementById('awards-content').innerHTML = awards.map(a =>
            `<div class="award-card"><h3>${a.title}</h3><p class="award-meta">${a.detail || ''}</p></div>`).join('');

        const credits = albumData.technicalCredits || {};
        const keys = Object.keys(credits);
        if (keys.length === 0) elements.btnCredits.hidden = true;
        else document.getElementById('credits-content').innerHTML =
            `<div class="credits-grid">${keys.map(k => `<div class="credit-item"><h4>${k}</h4><p>${credits[k]}</p></div>`).join('')}</div>`;
    }

    /* ---------- Mundos: luz e sombra ---------- */
    resolveWorld() {
        if (this.worldMode === 'light' || this.worldMode === 'dark') return this.worldMode;
        // Auto: toca = sombra, parado = luz (a capa tem os dois lados)
        return this.player.isPlaying ? 'dark' : 'light';
    }

    applyWorld(originEl) {
        const root = document.documentElement;
        const world = this.resolveWorld();
        const paint = () => {
            root.dataset.world = world;
            this.elements.metaTheme.setAttribute('content', WORLD_THEME_COLOR[world]);
        };
        root.classList.toggle('is-playing', !!this.player.isPlaying);
        this.elements.worldLabel.textContent = WORLD_LABEL[this.worldMode];
        this.elements.btnWorld.setAttribute('aria-label', `Mundo: ${WORLD_LABEL[this.worldMode]}. Clique para alternar.`);
        if (root.dataset.world === world) return;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!this.ready || reduce || !document.startViewTransition) { paint(); return; }

        // O círculo nasce no botão que causou a troca (play, no modo automático)
        const el = originEl || this.elements.btnPlay;
        const r = el.getBoundingClientRect();
        root.style.setProperty('--wx', `${r.left + r.width / 2}px`);
        root.style.setProperty('--wy', `${r.top + r.height / 2}px`);
        root.classList.add('vt');
        const vt = document.startViewTransition(paint);
        vt.finished.finally(() => root.classList.remove('vt'));
    }

    cycleWorld() {
        this.worldMode = WORLD_MODES[(WORLD_MODES.indexOf(this.worldMode) + 1) % WORLD_MODES.length];
        try { localStorage.setItem('wings_world', this.worldMode); } catch (e) { /* ignora */ }
        this.applyWorld(this.elements.btnWorld);
    }

    /* ---------- Plano de fundo ---------- */
    setMotif(name, trackNumber = 1) {
        if (!name) return;
        const next = this.elements.motifs[this.motifSlot % 2];
        const prev = this.elements.motifs[(this.motifSlot + 1) % 2];
        const src = `assets/motifs/${name}.jpg`;
        const pose = POSES[(trackNumber * 5) % POSES.length];
        this.motifSlot++;
        next.style.setProperty('--mx', `${pose.x}%`);
        next.style.setProperty('--my', `${pose.y}%`);
        next.style.setProperty('--ms', pose.s);
        next.style.rotate = `${(trackNumber * 67) % 360}deg`;
        const show = () => {
            next.classList.add('is-visible');
            prev.classList.remove('is-visible');
        };
        next.classList.remove('is-visible');
        const probe = new Image();
        probe.onload = probe.onerror = () => { next.src = src; requestAnimationFrame(() => requestAnimationFrame(show)); };
        probe.src = src;
    }

    /* ---------- Tela bloqueada / central de mídia (Media Session) ---------- */
    setupMediaSession() {
        if (!('mediaSession' in navigator)) return;
        const { player } = this;
        const audio = player.audio;
        const set = (action, fn) => { try { navigator.mediaSession.setActionHandler(action, fn); } catch (e) { /* não suportado */ } };

        set('play', () => audio.play());
        set('pause', () => audio.pause());
        set('previoustrack', () => player.prevTrack());
        set('nexttrack', () => player.nextTrack());
        set('seekto', (d) => {
            if (d.fastSeek && 'fastSeek' in audio) audio.fastSeek(d.seekTime); else audio.currentTime = d.seekTime;
            this.updatePositionState();
        });
        // Sem seekbackward/seekforward, o iOS troca os botões de faixa por ±10 s
        set('seekbackward', null);
        set('seekforward', null);
        set('stop', () => { audio.pause(); audio.currentTime = 0; });
    }

    updateMediaMetadata(track) {
        if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
        const abs = (path) => new URL(path, document.baseURI).href;
        const cover = abs(this.albumData.cover || 'assets/cover.jpg');
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.credit && track.credit !== this.albumData.artist
                ? `${this.albumData.artist} · ${track.credit}` : (this.albumData.artist || ''),
            album: this.albumData.title || '',
            artwork: [
                { src: cover, sizes: '640x640', type: 'image/jpeg' },
                { src: cover, sizes: '512x512', type: 'image/jpeg' },
                { src: cover, sizes: '256x256', type: 'image/jpeg' }
            ]
        });
    }

    updatePositionState() {
        if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
        const a = this.player.audio;
        if (!isFinite(a.duration) || a.duration <= 0) return;
        try {
            navigator.mediaSession.setPositionState({
                duration: a.duration,
                playbackRate: a.playbackRate || 1,
                position: Math.min(a.currentTime, a.duration)
            });
        } catch (e) { /* valores inválidos momentâneos */ }
    }

    /* ---------- Eventos ---------- */
    setupEventListeners() {
        const { elements, player } = this;
        elements.btnPlay.addEventListener('click', () => player.togglePlay());
        elements.btnNext.addEventListener('click', () => player.nextTrack());
        elements.btnPrev.addEventListener('click', () => player.prevTrack());
        elements.btnShuffle.addEventListener('click', () => {
            elements.btnShuffle.classList.toggle('active', player.toggleShuffle());
        });
        elements.btnRepeat.addEventListener('click', () => { player.toggleRepeat(); this.updateRepeatButton(); });

        elements.progressBar.addEventListener('input', (e) => {
            player.seek(parseFloat(e.target.value));
            this.updateRangeFill(elements.progressBar, '--progress', parseFloat(e.target.value));
        });
        elements.volumeBar.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            player.setVolume(v);
            this.updateRangeFill(elements.volumeBar, '--volume', v * 100);
        });

        elements.btnWorld.addEventListener('click', () => this.cycleWorld());

        elements.btnToggleLyrics.addEventListener('click', () => {
            const collapsed = elements.lyricsSection.classList.toggle('lyrics-collapsed');
            elements.btnToggleLyrics.setAttribute('aria-expanded', String(!collapsed));
            elements.btnToggleLyrics.setAttribute('aria-label', collapsed ? 'Mostrar letra' : 'Esconder letra');
        });

        const setFocus = (on) => {
            elements.lyricsSection.classList.toggle('lyrics-focus', on);
            document.body.classList.toggle('lyrics-open', on);
            elements.btnExpandLyrics.setAttribute('aria-pressed', String(on));
            elements.btnExpandLyrics.setAttribute('aria-label', on ? 'Sair da tela cheia' : 'Letra em tela cheia');
            if (on) {
                elements.lyricsSection.classList.remove('lyrics-collapsed');
                elements.btnToggleLyrics.setAttribute('aria-expanded', 'true');
            }
            this.activeLyricIndex = -2; // força recentralizar a linha atual
            this.updateActiveLyric(player.audio.currentTime);
        };
        elements.btnExpandLyrics.addEventListener('click', () => setFocus(!elements.lyricsSection.classList.contains('lyrics-focus')));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.lyricsSection.classList.contains('lyrics-focus')) setFocus(false);
        });

        [['btn-about', 'modal-about'], ['btn-awards', 'modal-awards'], ['btn-credits', 'modal-credits']].forEach(([b, m]) => {
            const modal = document.getElementById(m);
            document.getElementById(b).addEventListener('click', () => modal.showModal());
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
            modal.querySelector('.close-modal').addEventListener('click', () => modal.close());
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.closest && e.target.closest('input, textarea, dialog')) return;
            if (e.code === 'Space') { e.preventDefault(); player.togglePlay(); }
            else if (e.code === 'ArrowRight' && e.shiftKey) player.nextTrack();
            else if (e.code === 'ArrowLeft' && e.shiftKey) player.prevTrack();
        });
    }

    updateRepeatButton() {
        const { btnRepeat } = this.elements;
        const mode = this.player.repeatMode;
        btnRepeat.innerHTML = mode === 2 ? ICONS.repeatOne : ICONS.repeat;
        btnRepeat.classList.toggle('active', mode !== 0);
        btnRepeat.setAttribute('aria-label', ['Repetir: desligado', 'Repetir: álbum', 'Repetir: faixa'][mode]);
    }

    updatePlayerControlsState() {
        this.elements.btnPlay.innerHTML = this.player.isPlaying ? ICONS.pause : ICONS.play;
        this.elements.btnPlay.setAttribute('aria-label', this.player.isPlaying ? 'Pausar' : 'Tocar');
    }

    /* ---------- Faixa atual ---------- */
    onTrackChange(index) {
        const { elements } = this;
        const track = this.albumData.tracks[index];
        if (!track) return;

        elements.currentKicker.textContent = `Faixa ${String(track.number).padStart(2, '0')}`;
        elements.currentTitle.textContent = track.title;
        elements.currentComposers.textContent = track.credit || '';
        elements.lyricsTitle.textContent = track.title;
        elements.lyricsComposers.textContent = track.credit || '';
        elements.timeTotal.textContent = track.duration ? track.duration.padStart(5, '0') : '00:00';
        elements.timeCurrent.textContent = '00:00';
        elements.progressBar.value = 0;
        this.updateRangeFill(elements.progressBar, '--progress', 0);

        elements.tracklist.querySelectorAll('.track-item').forEach((li, i) => {
            const active = i === index;
            li.classList.toggle('active', active);
            if (active) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
        });

        this.setMotif(track.motif, track.number);
        this.updateMediaMetadata(track);
        this.renderLyrics(track);
        this.updatePlayerControlsState();
    }

    // Junta a tradução às linhas da letra. Aceita tradução em LRC (casa pelo tempo)
    // ou em texto simples (casa pela ordem das linhas não vazias).
    pairTranslation(originalLines, translationRaw) {
        const out = new Array(originalLines.length).fill('');
        const tr = (translationRaw || '').trim();
        if (!tr) return out;
        const trParsed = this.parseLRC(tr);
        if (trParsed && originalLines[0] && originalLines[0].time !== undefined) {
            originalLines.forEach((line, i) => {
                let best = null, bestDiff = 0.8;
                trParsed.forEach(t => {
                    const d = Math.abs(t.time - line.time);
                    if (d <= bestDiff) { best = t; bestDiff = d; }
                });
                if (best) out[i] = best.text;
            });
            return out;
        }
        const plain = tr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let k = 0;
        originalLines.forEach((line, i) => { if (line.text && line.text.trim() && k < plain.length) out[i] = plain[k++]; });
        return out;
    }

    renderLyrics(track) {
        const { lyricsContent, btnTranslation } = this.elements;
        this.currentLyrics = null;
        this.activeLyricIndex = -1;
        const raw = (track.lyrics || '').trim();
        const hasTr = !!(track.translation || '').trim();
        const ok = !!(raw && hasTr);
        btnTranslation.classList.toggle('no-tr', !ok);
        btnTranslation.title = ok ? 'Tradução' : 'Esta faixa ainda não tem tradução';

        const addLine = (container, text, tr, i) => {
            const p = document.createElement('p');
            p.className = 'lyrics-line';
            if (i !== null) p.dataset.index = i;
            const main = document.createElement('span');
            main.className = 'lyrics-main';
            main.textContent = text || ' ';
            p.appendChild(main);
            if (tr) {
                const t = document.createElement('span');
                t.className = 'lyrics-tr';
                t.textContent = tr;
                p.appendChild(t);
            }
            container.appendChild(p);
        };

        if (!raw) {
            lyricsContent.classList.remove('lyrics-synced', 'lyrics-plain');
            lyricsContent.innerHTML = '<p class="empty-state">Letra ainda não adicionada para esta faixa.</p>';
            return;
        }
        const parsed = this.parseLRC(raw);
        lyricsContent.innerHTML = '';
        if (parsed && parsed.length) {
            this.currentLyrics = parsed;
            lyricsContent.classList.add('lyrics-synced');
            lyricsContent.classList.remove('lyrics-plain');
            const trs = this.pairTranslation(parsed, track.translation);
            parsed.forEach((line, i) => addLine(lyricsContent, line.text, trs[i], i));
        } else {
            lyricsContent.classList.remove('lyrics-synced');
            lyricsContent.classList.add('lyrics-plain');
            const lines = raw.split(/\r?\n/).map(t => ({ text: t.trim() }));
            const trs = this.pairTranslation(lines, track.translation);
            lines.forEach((line, i) => addLine(lyricsContent, line.text, trs[i], null));
        }
        lyricsContent.scrollTop = 0;
    }

    setTranslationVisible(on) {
        this.elements.lyricsSection.classList.toggle('show-tr', on);
        this.elements.btnTranslation.setAttribute('aria-pressed', String(on));
        try { localStorage.setItem('wings_translation', on ? '1' : '0'); } catch (e) { /* ignora */ }
        this.activeLyricIndex = -2; // recentraliza a linha atual com a nova altura
        this.updateActiveLyric(this.player.audio.currentTime);
    }

    updateActiveLyric(currentTime) {
        if (!this.currentLyrics) return;
        let idx = -1;
        for (let i = 0; i < this.currentLyrics.length; i++) {
            if (currentTime >= this.currentLyrics[i].time) idx = i; else break;
        }
        if (idx === this.activeLyricIndex) return;
        this.activeLyricIndex = idx;

        const container = this.elements.lyricsContent;
        const items = container.querySelectorAll('.lyrics-line');
        items.forEach((el, i) => el.classList.toggle('active', i === idx));

        // Rola só o quadro da letra (nunca a página) e só se ele estiver aberto
        if (idx >= 0 && items[idx] && !this.elements.lyricsSection.classList.contains('lyrics-collapsed')) {
            const el = items[idx];
            const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
            container.scrollTo({ top, behavior: 'smooth' });
        }
    }

    onProgressUpdate(currentTime, duration) {
        const { elements } = this;
        elements.timeCurrent.textContent = this.formatTime(currentTime);
        if (isFinite(duration) && duration > 0) {
            elements.timeTotal.textContent = this.formatTime(duration);
            const pct = (currentTime / duration) * 100;
            if (document.activeElement !== elements.progressBar) elements.progressBar.value = pct;
            this.updateRangeFill(elements.progressBar, '--progress', pct);
        }
        this.updateActiveLyric(currentTime);
        const now = Date.now();
        if (now - (this.lastPosSync || 0) > 1000) { this.lastPosSync = now; this.updatePositionState(); }
    }

    onStateChange() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = this.player.isPlaying ? 'playing' : 'paused';
            this.updatePositionState();
        }
        this.updatePlayerControlsState();
        // pequeno atraso: trocar de faixa pausa e retoma o áudio, e isso não deve piscar o tema
        clearTimeout(this.worldTimer);
        this.worldTimer = setTimeout(() => this.applyWorld(), 220);
    }
}
