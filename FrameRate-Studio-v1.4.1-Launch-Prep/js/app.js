/**
 * FrameRate Studio — Complete Application Controller
 * Includes:
 * - Direct Letterboxd .ZIP Archive Importer (Merges watched.csv, ratings.csv, diary.csv, reviews.csv, likes/films.csv)
 * - In-Modal Library Search Bar & Filter Tabs (All, Rated, Reviewed, Liked)
 * - Automatic Pre-fill of Film Metadata, Star Rating, Liked Heart, Watch Date & Existing Review
 * - Smart Fuzzy Autocomplete Search + 0px Blur Full-Page Backdrop + Dual Theme Engine
 */

const App = {
  state: {
    step: 1,
    theme: 'dark',
    backdropIntensity: 70,
    backdropBlur: 6,
    activeBackdropUrl: '',
    film: null,
    rating: 4.0,
    hoverRating: null,
    watched: true,
    liked: false,
    rewatch: false,
    spoilers: false,
    watchedDate: new Date().toISOString().slice(0, 10),
    format: 'Cinema',
    vibes: ['Atmospheric'],
    notes: { craft: '', soul: '', friction: '', free: '' },
    dna: { top4: '', lens: '', avoid: '' },
    importedReview: '',
    importedTags: []
  },

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
    })[char]);
  },

  // Backdrop URLs flow into CSS url() values. Normalize and accept HTTPS only.
  safeImageUrl(value) {
    try {
      const url = new URL(String(value ?? '').trim());
      if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return '';
      return url.href;
    } catch (_) {
      return '';
    }
  },

  safeLetterboxdUrl(value, fallback = 'https://letterboxd.com/') {
    try {
      const url = new URL(String(value || ''));
      const host = url.hostname.toLowerCase();
      if (url.protocol === 'https:' && (host === 'letterboxd.com' || host.endsWith('.letterboxd.com'))) {
        return url.href;
      }
    } catch (_) { /* malformed imported URL; use the canonical fallback */ }
    return fallback;
  },

  lbLibrary: [],
  lbFilterMode: 'all',
  lbSearchQuery: '',

  liveSearchTimer: null,
  liveSuggestionsList: [],
  activeSuggestionIdx: -1,

  formatsList: ['Cinema', 'IMAX', '35mm / 70mm', 'Home Cinema', 'Streaming', 'Film Festival'],
  vibesList: [
    'Atmospheric', 'Visceral', 'Slow Burn', 'Hypnotic',
    'Emotional Wreck', 'Razor-Sharp', 'Dreamlike', 'Anxiety-Inducing',
    'Visual Poetry', 'Crowdpleaser', 'Bleak', 'Timeless'
  ],

  ratingTiers: {
    0.5: '0.5 - Abysmal',
    1.0: '1.0 - Deeply Flawed',
    1.5: '1.5 - Disappointing',
    2.0: '2.0 - Subpar',
    2.5: '2.5 - Mixed Bag',
    3.0: '3.0 - Solid & Watchable',
    3.5: '3.5 - Very Good',
    4.0: '4.0 - Great Cinema',
    4.5: '4.5 - Essential / Near-Perfect',
    5.0: '5.0 - Instant Masterpiece'
  },

  init() {
    this.ensureJsZipLoaded();
    this.upgradeLetterboxdModalUI();
    this.injectUserLogBannerUI();

    const savedTheme = localStorage.getItem('fr_theme') || 'dark';
    this.applyTheme(savedTheme);

    const savedLang = localStorage.getItem('fr_lang') || 'en';
    if (typeof I18n !== 'undefined') I18n.setLanguage(savedLang);

    this.loadSavedSettings();
    void this.loadSavedLbLibrary();
    // Re-read the account-scoped library after Supabase restores the signed-in profile.
    window.addEventListener('frameratedataready', () => { void this.loadSavedLbLibrary(); });

    const dateInput = document.getElementById('watchedDateInput');
    if (dateInput) {
      dateInput.value = this.state.watchedDate;
      dateInput.addEventListener('change', e => {
        this.state.watchedDate = e.target.value;
      });
    }

    document.addEventListener('click', e => {
      const wrapper = document.getElementById('searchBoxWrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        this.hideLiveSuggestions();
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('trailerModal')?.classList.contains('hidden')) {
        this.closeTrailer();
      }
    });

    this.renderInteractiveStarStage();
    this.renderStarPills();
    this.renderFormatChips();
    this.renderVibeChips();
    this.updateStarUI(this.state.rating, false);
    this.updateDiaryActionButtons();
    this.initCineCardInteractiveSuite();
    this.initCursorExperience();
    this.initGlobalHoverEffects();
    this.initShareSheetKeyboardSupport();

    // Deep link from Taste Lab: wait until workspace restoration finishes,
    // otherwise the previous saved film can overwrite the user's selection.
    const tasteParams = new URLSearchParams(window.location.search);
    const tasteMovieId = Number(tasteParams.get('frMovieId'));
    if (Number.isSafeInteger(tasteMovieId) && tasteMovieId > 0) {
      const posterPath = String(tasteParams.get('frMoviePoster') || '');
      const backdropPath = String(tasteParams.get('frMovieBackdrop') || '');
      const rawGenres = String(tasteParams.get('frMovieGenres') || '');
      const item = {
        id: tasteMovieId,
        source: 'tmdb',
        title: String(tasteParams.get('frMovieTitle') || 'Selected film').slice(0, 180),
        year: String(tasteParams.get('frMovieYear') || '').slice(0, 4),
        overview: String(tasteParams.get('frMovieOverview') || '').slice(0, 1600),
        genres: rawGenres.split('|').map(x => x.trim()).filter(Boolean).slice(0, 10),
        poster: posterPath ? 'https://image.tmdb.org/t/p/w500' + (posterPath.startsWith('/') ? posterPath : '/' + posterPath) : '',
        backdrop: backdropPath ? 'https://image.tmdb.org/t/p/original' + (backdropPath.startsWith('/') ? backdropPath : '/' + backdropPath) : ''
      };
      let tasteDeepLinkHandled = false;
      const openTasteFilm = () => {
        if (tasteDeepLinkHandled) return;
        tasteDeepLinkHandled = true;
        this.selectFilm(item)
          .then(() => {
            this.goToStep(1);
            // Protect this explicit film choice from any later auth/cloud restore event.
            window.dispatchEvent(new CustomEvent('frameratestudio:taste-film-selected', { detail: { id: tasteMovieId } }));
            // Ensure the new choice, not the old draft captured during startup, is saved.
            window.setTimeout(() => window.FrameRateWorkspace?.saveNow?.(), 0);
            // The selected film is now stored by workspace-persistence; remove the
            // one-time URL payload so future refreshes restore the saved workspace.
            const cleanUrl = new URL(window.location.href);
            ['frMovieId', 'frMovieTitle', 'frMovieYear', 'frMoviePoster', 'frMovieBackdrop', 'frMovieOverview', 'frMovieGenres'].forEach(key => cleanUrl.searchParams.delete(key));
            window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
          })
          .catch(error => {
            console.error('[FrameRate] Could not open Taste Lab film:', error);
            this.showToast('Could not load this film. Try searching for it in FrameRate Studio.');
          });
      };
      window.addEventListener('framerateworkspace:restored', openTasteFilm, { once: true });
    }
  },

  // Dynamically loads JSZip if not already present in index.html
  ensureJsZipLoaded() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-jszip]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.JSZip));
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.setAttribute('data-jszip', 'true');
      s.onload = () => resolve(window.JSZip);
      s.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(s);
    });
  },

  // Upgrades #rssModal automatically with ZIP + CSV Importer, Search Bar, Filters & Stats
  upgradeLetterboxdModalUI() {
    const modal = document.getElementById('rssModal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="glass-card rounded-3xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between border-b theme-border pb-3 shrink-0">
          <h3 class="text-sm sm:text-base font-black theme-text-primary flex items-center gap-2">
            <svg class="w-4 h-4 text-lbGreen" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="3.2"/><circle cx="12" cy="12" r="3.2"/><circle cx="18" cy="12" r="3.2"/></svg>
            <span>Letterboxd Library Importer (.ZIP Archive, .CSV & RSS)</span>
          </h3>
          <button onclick="App.toggleModal('rssModal')" class="theme-text-muted hover:text-frOrange p-1">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Primary Action: Upload Full Letterboxd Export .ZIP or .CSV -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
          <label class="md:col-span-7 flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 border-dashed border-lbGreen/50 hover:border-lbGreen bg-lbGreen/5 hover:bg-lbGreen/10 cursor-pointer transition text-center">
            <div class="flex items-center gap-2 text-xs font-extrabold text-lbGreen">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span id="zipUploadTitle">Import Letterboxd Export (.ZIP) or .CSV</span>
            </div>
            <p class="text-[11px] theme-text-muted">Merges watched.csv, ratings.csv, diary.csv, reviews.csv &amp; likes automatically!</p>
            <input id="lbArchiveInput" type="file" accept=".zip,.csv,application/zip,text/csv" multiple onchange="App.handleArchiveUpload(event)" class="hidden">
          </label>

          <!-- Optional RSS Sync Box -->
          <div class="md:col-span-5 theme-subcard rounded-2xl p-3.5 flex flex-col justify-between space-y-2">
            <span class="text-[11px] font-bold theme-text-secondary">Or Sync Public Diary via RSS:</span>
            <div class="flex gap-1.5">
              <input id="rssUsernameInput" type="text" placeholder="Username (e.g. 3b3aliy)..." onkeydown="if(event.key==='Enter') App.fetchRssDiary()" class="flex-1 theme-input rounded-xl px-3 py-2 text-xs focus:outline-none">
              <button onclick="App.fetchRssDiary()" class="px-3.5 py-2 rounded-xl bg-frOrange text-white font-extrabold text-xs hover:opacity-90 transition shrink-0">RSS</button>
            </div>
            <p class="text-[10px] theme-text-muted leading-tight">Note: RSS only shows dated Diary logs. Use .ZIP for all Watched, Ratings &amp; Reviews.</p>
          </div>
        </div>

        <!-- Imported Library Search Bar & Filter Pills -->
        <div id="lbLibraryControls" class="hidden space-y-2.5 pt-2 border-t theme-border shrink-0">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div id="lbLibraryStats" class="text-[11px] font-mono font-bold text-lbGreen"></div>
            <button onclick="App.clearSavedLbLibrary()" class="text-[11px] text-rose-400 hover:underline font-semibold">Clear Imported Library</button>
          </div>

          <div class="flex flex-col sm:flex-row gap-2">
            <div class="relative flex-1">
              <input id="lbModalSearchInput" type="text" placeholder="Search your imported films by title, year, or review..." oninput="App.handleLbModalSearch(this.value)" class="w-full theme-input rounded-xl pl-3.5 pr-8 py-2 text-xs focus:outline-none">
            </div>
            <div class="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" id="lbModalFilterPills">
              <button onclick="App.setLbModalFilter('all')" data-lb-filter="all" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-lbGreen text-black">All</button>
              <button onclick="App.setLbModalFilter('rated')" data-lb-filter="rated" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold theme-input">Rated ★</button>
              <button onclick="App.setLbModalFilter('reviewed')" data-lb-filter="reviewed" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold theme-input">Has Review</button>
              <button onclick="App.setLbModalFilter('liked')" data-lb-filter="liked" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold theme-input">Liked ♥</button>
            </div>
          </div>
        </div>

        <!-- Imported Films Grid Stage -->
        <div id="rssResultsStage" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 overflow-y-auto pr-1 flex-1 min-h-[180px]">
          <div class="col-span-full flex flex-col items-center justify-center py-10 text-center space-y-2">
            <p class="text-xs font-bold theme-text-secondary">No Letterboxd Data Loaded Yet</p>
            <p class="text-[11px] theme-text-muted max-w-md">Upload your Letterboxd Export <strong>.ZIP</strong> file above (Settings &rarr; Import &amp; Export &rarr; Export Your Data) to browse and search all your watched films, star ratings, likes, and reviews.</p>
          </div>
        </div>
      </div>
    `;
  },

  // Injects a banner in Step 1 Showcase to display the user's imported Letterboxd Rating & Review
  injectUserLogBannerUI() {
    const showcase = document.getElementById('filmShowcaseStage');
    if (!showcase || document.getElementById('userLbImportedBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'userLbImportedBanner';
    banner.className = 'hidden mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-lbGreen/10 border border-lbGreen/30 space-y-2';
    banner.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded bg-lbGreen text-black font-mono text-[10px] font-extrabold uppercase">Your Letterboxd Log</span>
          <span id="userLbBannerStars" class="text-sm font-black font-mono text-lbGreen"></span>
          <span id="userLbBannerLiked" class="hidden text-xs font-bold text-frAmber">♥ Liked</span>
          <span id="userLbBannerRewatch" class="hidden text-[11px] font-mono text-frBlueLight">• Rewatch</span>
        </div>
        <span id="userLbBannerDate" class="text-[11px] font-mono theme-text-muted"></span>
      </div>
      <p id="userLbBannerReview" class="hidden text-xs theme-text-primary italic leading-relaxed border-t border-lbGreen/20 pt-2"></p>
    `;

    const hero = document.getElementById('filmHeroBanner');
    if (hero && hero.nextSibling) {
      showcase.insertBefore(banner, hero.nextSibling);
    } else {
      showcase.appendChild(banner);
    }
  },

  /* ================= THEME ENGINE ================= */
  toggleTheme() {
    const next = this.state.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    this.showToast(next === 'light' ? 'Daylight White Theme Activated' : 'Obsidian Dark Theme Activated');
  },

  applyTheme(theme) {
    this.state.theme = theme;
    localStorage.setItem('fr_theme', theme);
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    html.classList.toggle('dark', theme === 'dark');

    const sunIcon = document.getElementById('themeIconSun');
    const moonIcon = document.getElementById('themeIconMoon');
    const label = document.getElementById('themeToggleLabel');

    if (sunIcon && moonIcon && label) {
      sunIcon.classList.toggle('hidden', theme !== 'dark');
      moonIcon.classList.toggle('hidden', theme === 'dark');
      const key = theme === 'dark' ? 'theme_light' : 'theme_dark';
      label.setAttribute('data-i18n', key);
      label.textContent = typeof I18n !== 'undefined' ? I18n.t(key) : (theme === 'dark' ? 'Light' : 'Dark');
    }

    this.updateBackdropFilters();
  },

  /* ================= FULL-PAGE BACKDROP & 0px BLUR CONTROLLER ================= */
  setFullPageBackdrop(url) {
    const safeUrl = this.safeImageUrl(url);
    if (!safeUrl) return false;
    this.state.activeBackdropUrl = safeUrl;

    const ambient = document.getElementById('ambientBackdrop');
    if (ambient) {
      ambient.style.backgroundImage = `url("${safeUrl}")`;
      ambient.classList.add('has-image');
      this.updateBackdropFilters();
    }

    const hero = document.getElementById('filmHeroBanner');
    if (hero) hero.style.backgroundImage = `url("${safeUrl}")`;

    const cineCard = document.getElementById('cineCardElement');
    if (cineCard) cineCard.style.backgroundImage = `url("${safeUrl}")`;

    document.querySelectorAll('[data-backdrop-thumb]').forEach(el => {
      const match = el.getAttribute('data-backdrop-thumb') === safeUrl;
      el.classList.toggle('ring-2', match);
      el.classList.toggle('ring-frOrange', match);
      el.classList.toggle('scale-[1.02]', match);
    });
    return true;
  },

  setBackdropIntensity(val) {
    this.state.backdropIntensity = Number(val);
    const slider = document.getElementById('backdropIntensitySlider');
    if (slider && Number(slider.value) !== this.state.backdropIntensity) {
      slider.value = this.state.backdropIntensity;
    }
    this.updateBackdropFilters();
  },

  setBackdropBlur(val) {
    this.state.backdropBlur = Number(val);
    const slider = document.getElementById('backdropBlurSlider');
    if (slider && Number(slider.value) !== this.state.backdropBlur) {
      slider.value = this.state.backdropBlur;
    }
    const label = document.getElementById('blurValueLabel');
    if (label) label.textContent = `${this.state.backdropBlur}px`;
    this.updateBackdropFilters();
  },

  updateBackdropFilters() {
    const ambient = document.getElementById('ambientBackdrop');
    const vignette = document.getElementById('ambientVignette');
    if (!ambient) return;

    const num = this.state.backdropIntensity;
    const blurPx = this.state.backdropBlur;
    const isLight = this.state.theme === 'light';

    const brightness = isLight
      ? 0.96 - (num / 100) * 0.16
      : 0.18 + (num / 100) * 0.72;

    ambient.style.filter = `blur(${blurPx}px) brightness(${brightness.toFixed(2)}) saturate(1.25)`;
    ambient.style.transform = blurPx === 0 ? 'scale(1.0)' : 'scale(1.06)';
    ambient.style.opacity = (!this.state.activeBackdropUrl || num === 0) ? '0' : '1';

    if (vignette) {
      const vigOpacity = Math.max(0.25, 1 - (num / 130));
      vignette.style.opacity = vigOpacity.toFixed(2);
    }
  },

  applyCustomBackdropInput() {
    const input = document.getElementById('customBackdropUrl');
    if (!input || !input.value.trim()) {
      this.showToast('Paste a valid image URL first');
      return;
    }
    const url = this.safeImageUrl(input.value);
    if (!url || !this.setFullPageBackdrop(url)) {
      this.showToast('Use a valid HTTPS image URL.');
      return;
    }

    if (this.state.film) {
      const existing = (this.state.film.backdrops || [])
        .map(item => this.safeImageUrl(item)).filter(Boolean);
      if (!existing.includes(url)) {
        this.state.film.backdrops = [url, ...existing];
      }
      this.renderBackdropsGallery(this.state.film.backdrops);
    }
    input.value = '';
    this.showToast('Custom full-page backdrop applied');
  },

  /* ================= STEP NAVIGATION ================= */
  goToStep(stepNum) {
    this.state.step = stepNum;
    [1, 2, 3, 4].forEach(n => {
      const page = document.getElementById(`page-${n}`);
      if (page) {
        page.classList.toggle('hidden', n !== stepNum);
        if (n === stepNum) {
          page.classList.remove('animate-fadeIn', 'fr-page-enter');
          void page.offsetWidth;
          page.classList.add('animate-fadeIn', 'fr-page-enter');
        }
      }
      const tab = document.getElementById(`stepTab-${n}`);
      if (tab) {
        tab.className = n === stepNum
          ? 'tab-active px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap'
          : 'tab-inactive px-3.5 py-2 rounded-xl transition flex items-center gap-2 whitespace-nowrap';
      }
    });

    document.getElementById('activeFilmMiniBar')?.classList.toggle('hidden', !(this.state.film && stepNum > 1));
    if (stepNum === 4) this.syncCineCard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ================= SMART LIVE AUTOCOMPLETE + FUZZY SEARCH ================= */
  handleLiveSearchInput(rawVal) {
    const q = (rawVal || '').trim();
    clearTimeout(this.liveSearchTimer);

    if (q.length < 2) {
      this.liveSearchRequestId = (this.liveSearchRequestId || 0) + 1;
      this.hideLiveSuggestions();
      return;
    }

    const requestId = (this.liveSearchRequestId || 0) + 1;
    this.liveSearchRequestId = requestId;
    this.liveSearchTimer = setTimeout(async () => {
      const dropdown = document.getElementById('liveSuggestionsDropdown');
      if (!dropdown) return;
      let results = [];
      try { results = await Api.searchMovies(q); }
      catch (error) {
        if (requestId !== this.liveSearchRequestId) return;
        console.warn('[FrameRate] Live film search failed:', error);
        dropdown.innerHTML = `<div class="px-4 py-3 text-xs theme-text-muted">Movie search is unavailable. Check the movie-data-proxy configuration.</div>`;
        dropdown.classList.remove('hidden');
        return;
      }
      if (requestId !== this.liveSearchRequestId || document.getElementById('movieSearchInput')?.value.trim() !== q) return;
      this.liveSearchesList = results.slice(0, 7);
      this.liveSuggestionsList = this.liveSearchesList;
      this.activeSuggestionIdx = -1;

      if (!this.liveSuggestionsList.length) {
        this.hideLiveSuggestions();
        return;
      }

      const corrected = Api.getFuzzyCorrectedQuery(q);
      const showCorrectedHint = corrected.toLowerCase() !== q.toLowerCase();

      dropdown.innerHTML = '';
      if (showCorrectedHint) {
        const hint = document.createElement('div');
        hint.className = 'px-4 py-1.5 bg-frOrange/10 text-[11px] font-mono text-frOrange flex items-center justify-between';
        hint.innerHTML = `<span>Closest match for: <strong>${this.escapeHtml(corrected)}</strong></span><span>Smart Match</span>`;
        dropdown.appendChild(hint);
      }

      this.liveSuggestionsList.forEach((item, idx) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.dataset.sugIdx = idx;
        row.className = 'w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-frOrange/15 transition focus:outline-none';
        row.innerHTML = `
          <img src="${this.escapeHtml(item.poster)}" alt="${this.escapeHtml(item.title)}" class="w-9 h-12 object-cover rounded-lg bg-black border border-white/10 shrink-0">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-extrabold theme-text-primary truncate">${this.escapeHtml(item.title)}</p>
            <p class="text-[11px] theme-text-muted truncate">${this.escapeHtml(item.year)} ${item.director ? '• ' + this.escapeHtml(item.director) : ''}</p>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 theme-text-muted shrink-0">Select &rarr;</span>
        `;
        row.addEventListener('click', () => {
          this.hideLiveSuggestions();
          document.getElementById('movieSearchInput').value = item.title;
          const matchedLb = this.findInLbLibrary(item.title, item.year);
          this.selectFilm(item, matchedLb);
        });
        dropdown.appendChild(row);
      });

      dropdown.classList.remove('hidden');
    }, 200);
  },

  handleSearchKeydown(e) {
    const dropdown = document.getElementById('liveSuggestionsDropdown');
    const isVisible = dropdown && !dropdown.classList.contains('hidden');

    if (e.key === 'Escape') {
      this.hideLiveSuggestions();
      return;
    }

    if (isVisible && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const max = this.liveSuggestionsList.length - 1;
      if (max < 0) return;
      if (e.key === 'ArrowDown') {
        this.activeSuggestionIdx = this.activeSuggestionIdx < max ? this.activeSuggestionIdx + 1 : 0;
      } else {
        this.activeSuggestionIdx = this.activeSuggestionIdx > 0 ? this.activeSuggestionIdx - 1 : max;
      }
      dropdown.querySelectorAll('[data-sug-idx]').forEach(el => {
        el.classList.toggle('bg-frOrange/20', Number(el.dataset.sugIdx) === this.activeSuggestionIdx);
      });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isVisible && this.activeSuggestionIdx >= 0 && this.liveSuggestionsList[this.activeSuggestionIdx]) {
        const chosen = this.liveSuggestionsList[this.activeSuggestionIdx];
        this.hideLiveSuggestions();
        document.getElementById('movieSearchInput').value = chosen.title;
        const matchedLb = this.findInLbLibrary(chosen.title, chosen.year);
        this.selectFilm(chosen, matchedLb);
      } else {
        this.hideLiveSuggestions();
        this.searchMovie();
      }
    }
  },

  hideLiveSuggestions() {
    document.getElementById('liveSuggestionsDropdown')?.classList.add('hidden');
  },

  clearSearchBox() {
    const input = document.getElementById('movieSearchInput');
    if (input) input.value = '';
    this.hideLiveSuggestions();
    document.getElementById('searchResultsGrid')?.classList.add('hidden');
  },

  async searchMovie() {
    this.hideLiveSuggestions();
    const input = document.getElementById('movieSearchInput');
    const grid = document.getElementById('searchResultsGrid');
    const badge = document.getElementById('currentStatusBadge');
    if (!input || !grid) return;

    const query = input.value.trim();
    if (!query) {
      this.showToast('Please enter a film title to search');
      return;
    }

    if (badge) badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-frAmber animate-ping"></span><span>Searching...</span>`;
    grid.classList.remove('hidden');
    grid.innerHTML = `<div class="col-span-full py-6 text-center text-xs theme-text-muted">Searching cinema database...</div>`;

    let results = [];
    try {
      results = await Api.searchMovies(query);
    } catch (error) {
      console.error('[FrameRate] Film search failed:', error);
      if (badge) badge.textContent = 'Search unavailable';
      grid.innerHTML = `<div class="col-span-full py-6 text-center text-xs theme-text-muted">Could not reach the movie catalogue. Check Supabase → Edge Functions → movie-data-proxy logs, TMDB secret, and allowed origins, then try again.</div>`;
      this.showToast('Film search failed. Check the movie-data-proxy configuration.');
      return;
    }
    if (badge) badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-lbGreen"></span><span>${results.length} Found</span>`;

    if (!results.length) {
      grid.innerHTML = `<div class="col-span-full py-6 text-center text-xs theme-text-muted">No matching films found. Try another title.</div>`;
      return;
    }

    grid.innerHTML = '';
    results.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'group text-left rounded-2xl overflow-hidden theme-subcard hover:border-frOrange transition flex flex-col focus:outline-none';
      card.innerHTML = `
        <div class="aspect-[2/3] w-full bg-black overflow-hidden relative">
          <img src="${this.escapeHtml(item.poster)}" alt="${this.escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
        </div>
        <div class="p-2.5">
          <p class="text-xs font-bold theme-text-primary truncate">${this.escapeHtml(item.title)}</p>
          <p class="text-[10px] font-mono theme-text-muted">${this.escapeHtml(item.year)}</p>
        </div>
      `;
      card.addEventListener('click', () => {
        const matchedLb = this.findInLbLibrary(item.title, item.year);
        this.selectFilm(item, matchedLb);
      });
      grid.appendChild(card);
    });
  },

  async quickSelectCurated(slug) {
    const item = Api.curatedCatalog[slug];
    if (!item) return;
    const matchedLb = this.findInLbLibrary(item.title, item.year);
    await this.selectFilm({
      id: item.id,
      source: 'curated',
      curatedSlug: slug,
      title: item.title,
      year: item.year,
      poster: item.poster,
      backdrop: item.backdrop
    }, matchedLb);
  },

  // Checks if a film exists in the user's imported Letterboxd ZIP library
  findInLbLibrary(title, year) {
    if (!this.lbLibrary || !this.lbLibrary.length || !title) return null;
    const normTitle = title.toLowerCase().trim();
    return (
      this.lbLibrary.find(e => e.title.toLowerCase().trim() === normTitle && (!year || !e.year || String(e.year) === String(year))) ||
      this.lbLibrary.find(e => e.title.toLowerCase().trim() === normTitle) ||
      null
    );
  },

  async selectFilm(item, diaryOverrides = null) {
    this.hideLiveSuggestions();
    const details = await Api.getMovieDetails(item);
    // Preserve the catalog source for workspace restore; iTunes IDs must not be
    // mistaken for TMDB IDs when a saved draft is reopened on another device.
    if (item?.source) details.source = item.source;
    if (item?.curatedSlug) details.curatedSlug = item.curatedSlug;
    this.state.film = details;
    this.closeTrailer();
    this.updateTrailerButton();

    // Check if user has this film in their imported Letterboxd library
    const lbData = diaryOverrides || this.findInLbLibrary(details.title, details.year);

    if (lbData) {
      this.state.watched = true;
      if (typeof lbData.rating === 'number' && !isNaN(lbData.rating) && lbData.rating > 0) {
        this.setStars(lbData.rating);
      }
      this.state.liked = Boolean(lbData.liked);
      this.state.rewatch = Boolean(lbData.rewatch);

      if (lbData.watchedDate) {
        this.state.watchedDate = lbData.watchedDate;
        const dateInput = document.getElementById('watchedDateInput');
        if (dateInput) dateInput.value = lbData.watchedDate;
      }

      this.state.importedReview = (lbData.review || '').trim();
      this.state.importedTags = lbData.tags || [];

      // Populate Step 3 & Step 4 with existing review if available
      if (this.state.importedReview) {
        const freeEl = document.getElementById('noteFreeThought');
        if (freeEl) freeEl.value = this.state.importedReview;

        const v2El = document.getElementById('reviewVariation2');
        if (v2El) v2El.textContent = this.state.importedReview;

        const cardQuote = document.getElementById('cardQuotePreview');
        if (cardQuote) cardQuote.textContent = `"${this.state.importedReview}"`;
      }

      this.updateDiaryActionButtons();
      this.renderUserLbBanner(lbData);
    } else {
      this.state.importedReview = '';
      this.state.importedTags = [];
      document.getElementById('userLbImportedBanner')?.classList.add('hidden');
    }

    document.getElementById('filmEmptyState')?.classList.add('hidden');
    const stage = document.getElementById('filmShowcaseStage');
    stage?.classList.remove('hidden');
    document.getElementById('searchResultsGrid')?.classList.add('hidden');

    document.getElementById('filmPosterImg').src = details.poster;
    document.getElementById('filmTitleHeading').textContent = details.title;
    document.getElementById('filmYearBadge').textContent = details.year;
    document.getElementById('filmDirectorBadge').textContent = `Dir. ${details.director}`;
    document.getElementById('filmRuntimeBadge').textContent = `${details.runtime} mins`;
    document.getElementById('filmTaglineText').textContent = details.tagline ? `"${details.tagline}"` : '';
    document.getElementById('filmOverviewText').textContent = details.overview;
    document.getElementById('filmCastList').textContent = (details.cast || []).join(' • ');

    const logoBox = document.getElementById('filmClearLogoContainer');
    const logoImg = document.getElementById('filmClearLogoImg');
    if (logoBox && logoImg) {
      if (details.clearLogo) {
        logoImg.src = details.clearLogo;
        logoBox.classList.remove('hidden');
      } else {
        logoBox.classList.add('hidden');
      }
    }

    const genresContainer = document.getElementById('filmGenresList');
    if (genresContainer) {
      genresContainer.innerHTML = (details.genres || [])
        .map(g => `<span class="px-2.5 py-1 rounded-lg theme-subcard text-[11px] font-bold">${this.escapeHtml(g)}</span>`)
        .join('');
    }

    const qEncoded = encodeURIComponent(details.title);
    const lbSlug = details.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const defaultLetterboxdUrl = `https://letterboxd.com/film/${lbSlug}/`;
    document.getElementById('extLinkLetterboxd').href = this.safeLetterboxdUrl(lbData?.uri, defaultLetterboxdUrl);
    document.getElementById('extLinkImdb').href = details.imdb_id
      ? `https://www.imdb.com/title/${details.imdb_id}/`
      : `https://www.imdb.com/find/?q=${qEncoded}`;
    document.getElementById('extLinkTmdb').href = `https://www.themoviedb.org/movie/${details.id}`;
    document.getElementById('extLinkJustWatch').href = `https://www.justwatch.com/us/search?q=${qEncoded}`;

    document.getElementById('miniBarPoster').src = details.poster;
    document.getElementById('miniBarTitle').textContent = details.title;
    document.getElementById('miniBarYear').textContent = `(${details.year})`;
    document.getElementById('miniBarDirector').textContent = `Directed by ${details.director}`;

    const primaryBackdrop = details.backdrop || (details.backdrops && details.backdrops[0]) || details.poster;
    this.setFullPageBackdrop(primaryBackdrop);
    this.renderBackdropsGallery(details.backdrops || [primaryBackdrop]);
    this.syncCineCard();

    stage?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    this.showToast(
      lbData
        ? `Loaded "${details.title}" + Your Letterboxd Rating & Data!`
        : `Loaded "${details.title}" (${details.year})`
    );
  },

  updateTrailerButton() {
    const button = document.getElementById('btnWatchTrailer');
    if (!button) return;
    const film = this.state?.film;
    const trailer = film?.trailer;
    const hasFilm = Boolean(film?.title);
    const hasTrailer = Boolean(trailer?.site === 'YouTube' && /^[A-Za-z0-9_-]{6,20}$/.test(String(trailer.key || '')));
    // Keep the Trailer action visible for every selected film; fall back to YouTube search.
    button.classList.toggle('hidden', !hasFilm);
    button.setAttribute('aria-hidden', String(!hasFilm));
    button.disabled = !hasFilm;
    button.title = hasTrailer ? `Watch ${film.title} trailer` : `Find a trailer for ${film?.title || 'this film'}`;
  },

  openTrailer() {
    const film = this.state?.film;
    const trailer = film?.trailer;
    if (!film?.title) { this.showToast('Select a film first.'); return; }

    const modal = document.getElementById('trailerModal');
    const frame = document.getElementById('trailerPlayer');
    const title = document.getElementById('trailerModalTitle');
    const external = document.getElementById('trailerOpenYoutube');
    const notice = document.getElementById('trailerPlayerNotice');
    const noticeTitle = document.getElementById('trailerPlayerNoticeTitle');
    const noticeBody = document.getElementById('trailerPlayerNoticeBody');
    if (!modal || !frame) return;

    const hasTrailer = Boolean(
      trailer?.site === 'YouTube' &&
      /^[A-Za-z0-9_-]{6,20}$/.test(String(trailer.key || ''))
    );

    if (title) {
      title.textContent = hasTrailer
        ? `${film.title} — ${trailer.name || 'Trailer'}`
        : `${film.title} — Trailer unavailable`;
    }

    if (hasTrailer) {
      frame.classList.remove('hidden');
      notice?.classList.add('hidden');
      if (noticeTitle) noticeTitle.textContent = 'Trailer unavailable';
      if (noticeBody) noticeBody.textContent = 'No embeddable trailer was found for this film yet.';
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailer.key)}?autoplay=1&rel=0`;
      if (external) {
        external.href = `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`;
        external.textContent = 'Open on YouTube ↗';
        external.classList.remove('hidden');
      }
    } else {
      // Do not redirect users automatically. Keep them in FrameRate and explain
      // that the shared movie-data proxy may not have returned a trailer.
      frame.src = 'about:blank';
      frame.classList.add('hidden');
      notice?.classList.remove('hidden');
      if (noticeTitle) noticeTitle.textContent = 'No embedded trailer found';
      if (noticeBody) {
        noticeBody.textContent = 'FrameRate could not find a trailer that can play inside this page. Check the movie-data proxy configuration, or use the optional YouTube search link.';
      }
      const query = encodeURIComponent(`${film.title} ${film.year || ''} official trailer`.trim());
      if (external) {
        external.href = `https://www.youtube.com/results?search_query=${query}`;
        external.textContent = 'Search on YouTube ↗';
        external.classList.remove('hidden');
      }
      this.showToast('No embedded trailer was found. You can stay here or search YouTube manually.');
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('trailerCloseBtn')?.focus();
  },

  closeTrailer() {
    const modal = document.getElementById('trailerModal');
    const frame = document.getElementById('trailerPlayer');
    const notice = document.getElementById('trailerPlayerNotice');
    if (frame) {
      frame.src = 'about:blank';
      frame.classList.remove('hidden');
    }
    notice?.classList.add('hidden');
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  },

  renderUserLbBanner(lbData) {
    const banner = document.getElementById('userLbImportedBanner');
    if (!banner) return;

    banner.classList.remove('hidden');
    document.getElementById('userLbBannerStars').textContent = lbData.rating
      ? `${this.formatStarAscii(lbData.rating)} (${lbData.rating.toFixed(1)})`
      : 'Watched';
    document.getElementById('userLbBannerLiked')?.classList.toggle('hidden', !lbData.liked);
    document.getElementById('userLbBannerRewatch')?.classList.toggle('hidden', !lbData.rewatch);
    document.getElementById('userLbBannerDate').textContent = lbData.watchedDate ? `Logged: ${lbData.watchedDate}` : '';

    const revEl = document.getElementById('userLbBannerReview');
    if (revEl) {
      if (lbData.review) {
        revEl.textContent = `"${lbData.review}"`;
        revEl.classList.remove('hidden');
      } else {
        revEl.classList.add('hidden');
      }
    }
  },

  renderBackdropsGallery(backdrops) {
    const grid = document.getElementById('fanartBackdropGrid');
    if (!grid) return;

    const safeBackdrops = Array.isArray(backdrops)
      ? [...new Set(backdrops.map(url => this.safeImageUrl(url)).filter(Boolean))]
      : [];
    if (!safeBackdrops.length) {
      grid.innerHTML = `<div class="col-span-full text-center py-4 text-xs theme-text-muted">No additional HTTPS backdrops found. Paste a valid HTTPS image URL above.</div>`;
      return;
    }

    grid.innerHTML = '';
    safeBackdrops.forEach((url, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-backdrop-thumb', url);
      const isCurrent = url === this.state.activeBackdropUrl;
      btn.className = `group relative aspect-video rounded-xl overflow-hidden bg-black border border-white/15 transition duration-300 focus:outline-none ${
        isCurrent ? 'ring-2 ring-frOrange scale-[1.02]' : 'hover:border-frOrange'
      }`;
      btn.innerHTML = `
        <img src="${this.escapeHtml(url)}" alt="Backdrop ${idx + 1}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
          <span class="text-[10px] font-mono font-bold text-white uppercase">Set Full-Page Backdrop</span>
        </div>
      `;
      btn.addEventListener('click', () => {
        this.setFullPageBackdrop(url);
        this.showToast('Full-page backdrop applied');
      });
      grid.appendChild(btn);
    });
  },

  /* ================= STEP 2: LETTERBOXD INTERACTIVE HALF-STAR CONSOLE ================= */
  renderInteractiveStarStage() {
    const stage = document.getElementById('interactiveStarStage');
    if (!stage) return;
    stage.innerHTML = '';

    for (let i = 1; i <= 5; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'lb-star-wrapper relative w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center select-none';
      wrapper.dataset.starIndex = i;

      wrapper.innerHTML = `
        <svg class="w-full h-full pointer-events-none" viewBox="0 0 24 24">
          <defs>
            <clipPath id="leftHalfClip-${i}">
              <rect x="0" y="0" width="12" height="24" />
            </clipPath>
          </defs>
          <path id="starBase-${i}" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="rgba(148, 163, 184, 0.22)" stroke="rgba(148, 163, 184, 0.45)" stroke-width="1.2" stroke-linejoin="round"/>
          <path id="starHalf-${i}" clip-path="url(#leftHalfClip-${i})" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="#00e054" class="hidden"/>
          <path id="starFull-${i}" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="#00e054" class="hidden"/>
        </svg>
      `;

      const computeStarValue = clientX => {
        const rect = wrapper.getBoundingClientRect();
        return (clientX - rect.left) < rect.width / 2 ? i - 0.5 : i;
      };

      wrapper.addEventListener('mousemove', e => {
        const val = computeStarValue(e.clientX);
        this.state.hoverRating = val;
        this.updateStarUI(val, true);
      });

      wrapper.addEventListener('click', e => {
        this.setStars(computeStarValue(e.clientX));
      });

      wrapper.addEventListener('touchstart', e => {
        if (e.touches && e.touches[0]) {
          this.setStars(computeStarValue(e.touches[0].clientX));
        }
      }, { passive: true });

      stage.appendChild(wrapper);
    }
  },

  handleStarStageLeave() {
    this.state.hoverRating = null;
    this.updateStarUI(this.state.rating, false);
  },

  renderStarPills() {
    const box = document.getElementById('starPillsBox');
    if (!box) return;
    box.innerHTML = '';

    for (let v = 0.5; v <= 5.0; v += 0.5) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.ratingPill = v.toFixed(1);
      btn.className = 'py-1.5 rounded-lg font-mono text-[11px] font-bold theme-input hover:border-lbGreen transition';
      btn.textContent = v.toFixed(1);
      btn.addEventListener('click', () => this.setStars(v));
      box.appendChild(btn);
    }
  },

  setStars(val) {
    this.state.rating = val;
    this.updateStarUI(val, false);
    this.syncCineCard();
    this.updateCardMetaInfo();
  },

  updateStarUI(displayVal, isHover = false) {
    for (let i = 1; i <= 5; i++) {
      const halfEl = document.getElementById(`starHalf-${i}`);
      const fullEl = document.getElementById(`starFull-${i}`);
      if (!halfEl || !fullEl) continue;

      halfEl.classList.add('hidden');
      fullEl.classList.add('hidden');

      if (displayVal !== null) {
        if (displayVal >= i) fullEl.classList.remove('hidden');
        else if (displayVal >= i - 0.5) halfEl.classList.remove('hidden');
      }
    }

    const numDisplay = document.getElementById('liveStarNumberDisplay');
    const tierText = document.getElementById('liveStarTierText');
    const badge = document.getElementById('starRatingBadge');
    const miniPill = document.getElementById('miniBarRatingPill');

    if (displayVal === null) {
      if (numDisplay) numDisplay.textContent = '-';
      if (tierText) tierText.textContent = 'Unrated (Click any star to rate)';
      if (!isHover && badge) badge.textContent = 'Unrated';
      if (!isHover && miniPill) miniPill.textContent = 'Unrated';
    } else {
      const formatted = `${displayVal.toFixed(1)} / 5.0`;
      const starsAscii = this.formatStarAscii(displayVal);
      if (numDisplay) numDisplay.textContent = `${starsAscii}  ${displayVal.toFixed(1)}`;
      if (tierText) tierText.textContent = this.ratingTiers[displayVal] || formatted;
      if (!isHover && badge) badge.textContent = `${starsAscii} (${displayVal.toFixed(1)})`;
      if (!isHover && miniPill) miniPill.textContent = `${starsAscii} ${displayVal.toFixed(1)}`;
    }

    document.querySelectorAll('[data-rating-pill]').forEach(btn => {
      const v = parseFloat(btn.dataset.ratingPill);
      if (this.state.rating === v) {
        btn.classList.add('bg-lbGreen', 'text-black', 'border-lbGreen');
      } else {
        btn.classList.remove('bg-lbGreen', 'text-black', 'border-lbGreen');
      }
    });
  },

  formatStarAscii(val) {
    if (!val) return 'UNRATED';
    const full = Math.floor(val);
    const half = val % 1 >= 0.5 ? '\u00BD' : '';
    return '\u2605'.repeat(full) + half;
  },

  /* ================= LETTERBOXD DIARY ACTIONS ================= */
  toggleWatched() {
    this.state.watched = !this.state.watched;
    this.updateDiaryActionButtons();
  },

  toggleLiked() {
    this.state.liked = !this.state.liked;
    if (this.state.liked) this.state.watched = true;
    this.updateDiaryActionButtons();
    this.syncCineCard();
  },

  toggleRewatch() {
    this.state.rewatch = !this.state.rewatch;
    if (this.state.rewatch) this.state.watched = true;
    this.updateDiaryActionButtons();
  },

  toggleSpoilers(checked) {
    this.state.spoilers = Boolean(checked);
  },

  updateDiaryActionButtons() {
    document.getElementById('btnWatched')?.classList.toggle('active-watched', this.state.watched);

    const btnHeart = document.getElementById('btnHeart');
    const heartSvg = document.getElementById('heartSvg');
    if (btnHeart && heartSvg) {
      btnHeart.classList.toggle('active-liked', this.state.liked);
      heartSvg.setAttribute('fill', this.state.liked ? 'currentColor' : 'none');
    }

    const btnRewatch = document.getElementById('btnRewatch');
    const rewatchText = document.getElementById('rewatchText');
    if (btnRewatch && rewatchText) {
      btnRewatch.classList.toggle('active-rewatch', this.state.rewatch);
      if (typeof I18n !== 'undefined') {
        rewatchText.textContent = this.state.rewatch ? I18n.t('btn_rewatch') : I18n.t('btn_first_watch');
      }
    }
  },

  renderFormatChips() {
    const container = document.getElementById('formatChipsContainer');
    if (!container) return;
    container.innerHTML = '';

    this.formatsList.forEach(fmt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = this.state.format === fmt;
      btn.className = `px-3 py-1.5 rounded-xl text-xs font-bold transition ${
        active ? 'bg-frOrange text-white shadow-md shadow-frOrange/25' : 'theme-input hover:border-frOrange/50'
      }`;
      btn.textContent = fmt;
      btn.addEventListener('click', () => {
        this.state.format = fmt;
        this.renderFormatChips();
        this.syncCineCard();
      });
      container.appendChild(btn);
    });
  },

  renderVibeChips() {
    const container = document.getElementById('vibeChipsContainer');
    if (!container) return;
    container.innerHTML = '';

    this.vibesList.forEach(vibe => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const active = this.state.vibes.includes(vibe);
      btn.className = `px-3 py-1.5 rounded-xl text-xs font-bold transition ${
        active ? 'bg-lbGreen/20 border border-lbGreen text-lbGreen' : 'theme-input hover:border-lbGreen/50'
      }`;
      btn.textContent = vibe;
      btn.addEventListener('click', () => {
        if (this.state.vibes.includes(vibe)) {
          this.state.vibes = this.state.vibes.filter(v => v !== vibe);
        } else {
          this.state.vibes.push(vibe);
        }
        this.renderVibeChips();
      });
      container.appendChild(btn);
    });
  },

  /* ================= STEP 3 & STEP 4: BREAKDOWN & AI STUDIO ================= */
  appendQuickPrompt(textareaId, phrase) {
    const el = document.getElementById(textareaId);
    if (!el) return;
    const current = el.value.trim();
    el.value = current ? `${current}. ${phrase}` : phrase;
    el.focus();
  },

  collectBreakdownNotes() {
    this.state.notes.craft = document.getElementById('noteCraft')?.value || '';
    this.state.notes.soul = document.getElementById('noteSoul')?.value || '';
    this.state.notes.friction = document.getElementById('noteFriction')?.value || '';
    this.state.notes.free = document.getElementById('noteFreeThought')?.value || '';
  },

 buildMasterPrompt() {
    this.collectBreakdownNotes();
    const lang = typeof I18n !== 'undefined' ? I18n.currentLang : 'en';
    return Api.buildDetailedMasterPrompt(this.state, lang);
  },

  copyMasterPrompt() {
    navigator.clipboard.writeText(this.buildMasterPrompt());
    this.showToast('Detailed Studio Master Prompt copied to clipboard!');
  },

  async generateReviews() {
    const btn = document.getElementById('btnGenerateReviews');
    const badge = document.getElementById('activeAiBadge');
    const prompt = this.buildMasterPrompt();
    const lang = typeof I18n !== 'undefined' ? I18n.currentLang : 'en';

    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.7';
    }
    if (badge) {
      badge.textContent = 'Generating with AI...';
    }

    const out = await Api.generateReviewsWithAI(prompt, this.state, lang);

    document.getElementById('reviewVariation1').textContent = out.v1;
    document.getElementById('reviewVariation2').textContent = out.v2;
    document.getElementById('reviewVariation3').textContent = out.v3;

    this.useVariationOnCard(1);

    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }

    if (badge && out._agentLabel) {
      badge.textContent = `✓ ${out._agentLabel}`;
    }

    if (out._errorNote) {
      this.showToast(`${out._errorNote} — Used Local Fallback`);
    } else {
      this.showToast(`Generated via ${out._agentLabel || 'AI Studio'}`);
    }
  },

  useVariationOnCard(idx) {
    const text = document.getElementById(`reviewVariation${idx}`)?.textContent || '';
    const cardQuote = document.getElementById('cardQuotePreview');
    if (cardQuote && text) {
      cardQuote.textContent = `"${text.replace(/^"|"$/g, '').trim()}"`;
    }
    this.showToast(`Variation ${idx} applied to Cine-Card`);
  },

  syncCineCard() {
    const f = this.state.film;
    if (f) {
      document.getElementById('cardPosterImg').src = f.poster;
      document.getElementById('cardFilmTitle').textContent = f.title;
      document.getElementById('cardFilmYear').textContent = f.year;
    }
    document.getElementById('cardRatingStars').textContent = this.formatStarAscii(this.state.rating);

    const likedBadge = document.getElementById('cardLikedHeart');
    if (likedBadge) {
      likedBadge.classList.toggle('hidden', !this.state.liked);
      likedBadge.classList.toggle('inline-flex', this.state.liked);
    }

    const fmtBadge = document.getElementById('cardFormatBadge');
    if (fmtBadge) {
      fmtBadge.textContent = this.state.format;
      fmtBadge.classList.remove('hidden');
    }
  },

  /* ================= FRAME RATE SHARE SHEET ================= */
  openShareSheet() {
    const modal = document.getElementById('frShareSheet');
    if (!modal) {
      this.showToast('Share panel is unavailable');
      return;
    }
    const film = this.state.film || {};
    const title = document.getElementById('frShareFilmTitle');
    const subtitle = document.getElementById('frShareFilmSubtitle');
    const poster = document.getElementById('frShareFilmPoster');
    const quote = document.getElementById('frShareQuote');
    const link = document.getElementById('frShareLinkText');
    const posterSrc = film.poster || document.getElementById('cardPosterImg')?.src || '';
    if (title) title.textContent = film.title ? `${film.title}${film.year ? ` (${film.year})` : ''}` : 'My FrameRate Review';
    if (subtitle) subtitle.textContent = film.director ? `Directed by ${film.director} · ${this.formatStarAscii(this.state.rating)} ${this.state.rating ? `${this.state.rating.toFixed(1)}/5` : ''}` : 'A cinematic verdict from FrameRate Studio';
    if (poster) {
      if (posterSrc) { poster.src = posterSrc; poster.classList.remove('hidden'); }
      else { poster.removeAttribute('src'); poster.classList.add('hidden'); }
    }
    if (quote) quote.textContent = (document.getElementById('cardQuotePreview')?.textContent || 'Your review will appear here after you select a film.').trim();
    if (link) link.textContent = this.getFilmShareUrl();
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('fr-share-open');
    modal.querySelector('[data-share-close]')?.focus();
  },

  closeShareSheet(event) {
    if (event && event.target && !event.target.closest('[data-share-close]') && !event.target.classList.contains('fr-share-backdrop')) return;
    const modal = document.getElementById('frShareSheet');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('fr-share-open');
  },

  initShareSheetKeyboardSupport() {
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.closeShareSheet();
    });
    const modal = document.getElementById('frShareSheet');
    modal?.addEventListener('click', event => {
      if (event.target.classList.contains('fr-share-backdrop')) this.closeShareSheet(event);
    });
  },

  getFilmShareUrl() {
    const filmLink = document.getElementById('extLinkLetterboxd')?.href || '';
    if (this.state.film && /^https?:\/\//i.test(filmLink) && !filmLink.endsWith('#')) return filmLink;
    const current = new URL(window.location.href);
    if (/^https?:$/.test(current.protocol) && !['localhost', '127.0.0.1', '::1'].includes(current.hostname)) {
      return current.href;
    }
    return 'https://letterboxd.com/';
  },

  async writeClipboardText(text, successMessage = 'Copied to clipboard') {
    const value = String(text || '').trim();
    if (!value) {
      this.showToast('There is nothing to copy yet');
      return false;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement('textarea');
        field.value = value;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Clipboard permission denied');
      }
      this.showToast(successMessage);
      return true;
    } catch (error) {
      this.showToast('Clipboard access was blocked by your browser');
      return false;
    }
  },

  copyShareLink() {
    return this.writeClipboardText(this.getFilmShareUrl(), 'Film link copied');
  },

  copyShareReview() {
    const text = (document.getElementById('cardQuotePreview')?.textContent || '').trim();
    return this.writeClipboardText(text, 'Review copied');
  },

  async copyShareImage() {
    this.closeShareSheet();
    await this.shareCineCard(null);
  },

  async downloadShareImage() {
    this.closeShareSheet();
    await this.downloadCineCardPng(null);
  },

  async shareNative() {
    const text = window.Api?.buildSocialShareText?.() || this.buildShareTextFallback();
    const url = this.getFilmShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: this.state.film?.title || 'FrameRate Studio', text, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    await this.writeClipboardText(`${text}\n${url}`, 'Share text and link copied');
  },

  buildShareTextFallback() {
    const film = this.state.film || {};
    const quote = (document.getElementById('cardQuotePreview')?.textContent || '').trim();
    const rating = this.state.rating ? `${this.state.rating.toFixed(1)}/5` : 'Unrated';
    return `${film.title || 'My film review'}${film.year ? ` (${film.year})` : ''}\nRating: ${rating}\n\n${quote}\n\n#FrameRateStudio #Cinema`;
  },

  shareToSocial(platform) {
    const film = this.state.film || {};
    const shareUrl = this.getFilmShareUrl();
    const shareText = window.Api?.buildSocialShareText?.() || this.buildShareTextFallback();
    const title = `${film.title || 'My FrameRate review'}${film.year ? ` (${film.year})` : ''}`;
    const q = encodeURIComponent;
    const destinations = {
      whatsapp: `https://wa.me/?text=${q(`${shareText}\n${shareUrl}`)}`,
      x: `https://twitter.com/intent/tweet?text=${q(shareText)}&url=${q(shareUrl)}`,
      telegram: `https://t.me/share/url?url=${q(shareUrl)}&text=${q(shareText)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${q(shareUrl)}`,
      reddit: `https://www.reddit.com/submit?url=${q(shareUrl)}&title=${q(title)}`
    };
    const destination = destinations[platform];
    if (!destination) return;
    window.open(destination, '_blank', 'noopener,noreferrer');
    this.closeShareSheet();
    this.showToast('Share page requested. Attach the downloaded PNG if you want to include your card.');
  },

  /* ================= FOUR REALISTIC ARTIFACT CURSORS ================= */
  cursorPresets: {
    harry: { label: 'Harry Potter Wand', color: '#e9bd73', desc: 'A slim, warm wood wand with a soft spell glow' },
    spider: { label: 'Spider-Man Web', color: '#e84a4f', desc: 'A compact red-and-blue web-pattern mask cursor' },
    saber: { label: 'Star Wars Lightsaber', color: '#55b9ff', desc: 'A small metal hilt and luminous energy blade' },
    thor: { label: "Thor's Hammer", color: '#8dbdff', desc: 'A forged metal hammer with a leather grip and storm light' }
  },

  cursorSvg(style, cls = '') {
    const uid = `fr-${String(style).replace(/[^a-z0-9_-]/gi, '')}-${String(cls).replace(/[^a-z0-9_-]/gi, '-') || 'icon'}`;
    const svg = {
      harry: `<svg viewBox="0 0 40 40" class="${cls}" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2d6a0"/><stop offset=".2" stop-color="#a76b37"/><stop offset=".52" stop-color="#5f351d"/><stop offset=".78" stop-color="#b57a42"/><stop offset="1" stop-color="#392015"/></linearGradient><linearGradient id="${uid}-edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0c9"/><stop offset=".45" stop-color="#bd8750"/><stop offset="1" stop-color="#382016"/></linearGradient><radialGradient id="${uid}-spell"><stop stop-color="#fff9d9"/><stop offset=".35" stop-color="#f8d992"/><stop offset="1" stop-color="#f4ad4e" stop-opacity="0"/></radialGradient><filter id="${uid}-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.4"/></filter></defs><path d="M3.8 3.8 C8 6.4 13 12.6 18.2 18.8 S28.6 30.1 32.6 34.2" fill="none" stroke="#23150f" stroke-width="5.4" stroke-linecap="round"/><path d="M3.6 3.6 C8.2 6.7 13.3 12.8 18.5 18.9 S28.7 30.2 32.8 34.3" fill="none" stroke="url(#${uid}-wood)" stroke-width="3.2" stroke-linecap="round"/><path d="M5 5.2 C9.5 8.6 14 14.5 19 20.2 S28.2 30.3 31.2 32.8" fill="none" stroke="#f7d5a1" stroke-opacity=".67" stroke-width=".8" stroke-linecap="round"/><path d="M13.2 14.8l2.1-1.4m2.8 4.2l2.4-1.4m2.8 4.1l2.1-1.4" stroke="#3b2015" stroke-opacity=".8" stroke-width=".7" stroke-linecap="round"/><ellipse cx="3.2" cy="3.3" rx="5" ry="5" fill="url(#${uid}-spell)" filter="url(#${uid}-glow)"/><path d="M3 0.8l.8 1.6 1.7.8-1.7.8L3 5.7l-.8-1.7-1.7-.8 1.7-.8Z" fill="#fff7d7" stroke="#edb95f" stroke-width=".55"/><path d="M8 8l1.2 1.5M11.2 11.7l.8 1" stroke="#fff0cb" stroke-width=".75" stroke-linecap="round" opacity=".9"/></svg>`,
      spider: `<svg viewBox="0 0 40 40" class="${cls}" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}-red" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff8882"/><stop offset=".28" stop-color="#cf2734"/><stop offset=".65" stop-color="#8e1527"/><stop offset="1" stop-color="#3a1625"/></linearGradient><linearGradient id="${uid}-blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#75caff"/><stop offset=".3" stop-color="#1d5ea4"/><stop offset="1" stop-color="#102a58"/></linearGradient><linearGradient id="${uid}-eye" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#fff"/><stop offset=".65" stop-color="#e8f5ff"/><stop offset="1" stop-color="#9bc8e7"/></linearGradient><filter id="${uid}-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx=".4" dy="1.2" stdDeviation=".8" flood-color="#050914" flood-opacity=".8"/></filter></defs><path d="M7 5.2L17.2 3.2 21 5.6 24.8 3.2 34.3 5.8 32.5 18.7 27.3 29.1 20 35.5 12.6 29.1 7.1 18.7Z" fill="url(#${uid}-red)" stroke="#1a1722" stroke-width="1.8" stroke-linejoin="round" filter="url(#${uid}-shadow)"/><path d="M8.2 17.6L12.7 28.8 19.7 34.1 19.7 8.2 16.2 5.5 9 7Z" fill="url(#${uid}-blue)" opacity=".9"/><path d="M21 8.1V33.8L27.1 28.5 31.7 17.8 31 7.5 24.9 5.4Z" fill="url(#${uid}-red)" opacity=".92"/><path d="M8 7L20 15L33 7M7.5 13L20 18.8L32.5 13M10 21L20 22.5L30 21M13 28L20 26L27 28M12 7L10.8 18.8L15 29M27.8 7L29.2 18.5L25.3 29" stroke="#f6b3b0" stroke-opacity=".5" stroke-width=".65" fill="none"/><path d="M8.5 14.8Q13.9 11.5 18.2 17.6L15.1 22Q10.6 22.4 8.5 14.8Z" fill="url(#${uid}-eye)" stroke="#29141d" stroke-width="1.1"/><path d="M31.5 14.8Q26.1 11.5 21.8 17.6L24.9 22Q29.4 22.4 31.5 14.8Z" fill="url(#${uid}-eye)" stroke="#29141d" stroke-width="1.1"/><path d="M20 5.8V33M5.5 17.5L15 18.9M34.5 17.5L25 18.9" stroke="#fff0ee" stroke-opacity=".42" stroke-width=".55" fill="none"/></svg>`,
      saber: `<svg viewBox="0 0 40 40" class="${cls}" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}-blade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".22" stop-color="#dff8ff"/><stop offset=".58" stop-color="#4cbdff"/><stop offset="1" stop-color="#176dd5"/></linearGradient><linearGradient id="${uid}-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".17" stop-color="#9ba9b8"/><stop offset=".32" stop-color="#f3f6fa"/><stop offset=".53" stop-color="#647383"/><stop offset=".74" stop-color="#d6dee7"/><stop offset="1" stop-color="#3e4b59"/></linearGradient><linearGradient id="${uid}-grip" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#3e4855"/><stop offset=".4" stop-color="#131b28"/><stop offset=".7" stop-color="#697786"/><stop offset="1" stop-color="#202a36"/></linearGradient><filter id="${uid}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.1"/></filter></defs><path d="M3.2 3.1L22.3 22.2" stroke="#54bfff" stroke-width="6.4" stroke-linecap="round" opacity=".34" filter="url(#${uid}-glow)"/><path d="M3.2 3.1L22.3 22.2" stroke="url(#${uid}-blade)" stroke-width="3.3" stroke-linecap="round"/><path d="M3.3 3.2L22.1 22" stroke="#ffffff" stroke-width=".7" stroke-linecap="round" opacity=".95"/><path d="M18.7 20.6L22.1 17.2L25.1 20.2L21.7 23.6Z" fill="url(#${uid}-metal)" stroke="#344253" stroke-width=".8"/><path d="M21 22.1L31.7 32.8Q33 34.1 34.3 32.8L35.1 32Q36.1 31 35 29.9L24.3 19.2Z" fill="url(#${uid}-grip)" stroke="#111a25" stroke-width="1.1"/><path d="M24.3 22.6L31.5 29.8M26.4 20.5L33.6 27.7" stroke="url(#${uid}-metal)" stroke-width="1.4"/><path d="M24.9 24.5L29.6 19.8L31.8 22L27.1 26.7Z" fill="url(#${uid}-metal)" stroke="#303b48" stroke-width=".8"/><path d="M30.3 30.1L33.8 33.6" stroke="#dce5ee" stroke-width="1.1" stroke-linecap="round"/></svg>`,
      thor: `<svg viewBox="0 0 40 40" class="${cls}" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}-steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4fbff"/><stop offset=".17" stop-color="#8a9bad"/><stop offset=".33" stop-color="#e4eef8"/><stop offset=".52" stop-color="#687b91"/><stop offset=".72" stop-color="#d8e4ef"/><stop offset="1" stop-color="#37485d"/></linearGradient><linearGradient id="${uid}-face" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d9e8f6"/><stop offset=".25" stop-color="#7d91a7"/><stop offset=".5" stop-color="#43566d"/><stop offset=".75" stop-color="#9aafc2"/><stop offset="1" stop-color="#34465a"/></linearGradient><linearGradient id="${uid}-leather" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b27e50"/><stop offset=".28" stop-color="#4c3024"/><stop offset=".5" stop-color="#a46b3e"/><stop offset=".75" stop-color="#392319"/><stop offset="1" stop-color="#8d5934"/></linearGradient><filter id="${uid}-glow" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="1.5"/></filter></defs><path d="M4.7 4.2L26.7 26.1L34.6 34" stroke="#4daaff" stroke-width="4.2" stroke-linecap="round" opacity=".2" filter="url(#${uid}-glow)"/><path d="M15.1 13.7L31.8 31.1L34.2 33.5" stroke="#171f2a" stroke-width="6" stroke-linecap="round"/><path d="M15.1 13.7L31.8 31.1L34.2 33.5" stroke="url(#${uid}-leather)" stroke-width="4.1" stroke-linecap="round"/><path d="M29.5 29L32.3 31.8M26.7 26.2L29.5 29M23.9 23.4L26.7 26.2" stroke="#d7b080" stroke-width=".8" stroke-linecap="round"/><path d="M3.3 4.9L5.6 2.5L20.8 2.6L25.8 7.2L25.5 15.2L20.9 19.9L5.9 19.4L2.5 15.5Z" fill="url(#${uid}-face)" stroke="#2e4054" stroke-width="1.3" stroke-linejoin="round"/><path d="M5.6 4.2L20.1 4L23.4 7.4L23.1 14.5L19.2 17.8L5.9 17.3L4.3 14.6L4.5 7.4Z" fill="none" stroke="#f4f8fc" stroke-opacity=".62" stroke-width=".8"/><path d="M7 6.5H19.5M6.2 9.4H22.5M5.6 12.5H22M7 15.4H19.8" stroke="#d8e6f2" stroke-opacity=".45" stroke-width=".55"/><path d="M12.8 3.5L15 7.5L11.8 11.5L16 12.1L13.1 17.1L18 12.8L14.6 11.2L17.4 7.3Z" fill="#e8f7ff" stroke="#6db7ff" stroke-width=".45"/><path d="M24.8 7.4L29.1 5.8L27.6 10.3L31.4 12.1L26.7 13L25.2 17.4L24.1 12.9L20.3 11.1L24.1 9.9Z" fill="#f0f8ff" opacity=".9"/></svg>`,
      default: `<svg viewBox="0 0 40 40" class="${cls}" aria-hidden="true" focusable="false"><path d="M3 2.8L3.2 31.3L10.1 24.7L16.4 36.4L22.1 33.3L16.1 21.8L25.8 21.5Z" fill="#111827" stroke="#ffffff" stroke-width="2.1" stroke-linejoin="round"/><path d="M5.2 6.1L5.3 26.4L10.8 21.2L17.1 32.9L19.2 31.8L13 20L21.4 20.1Z" fill="#ffffff" stroke="#151a22" stroke-width=".75" stroke-linejoin="round"/></svg>`
    };
    return svg[style] || svg.default;
  },

  cursorAtmosphereSvg(style) {
    const scenes = {
      harry: `<svg viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fr-magic-thread" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f5c978" stop-opacity="0"/><stop offset=".5" stop-color="#c6a3ff" stop-opacity=".58"/><stop offset="1" stop-color="#f5c978" stop-opacity="0"/></linearGradient></defs><g fill="none" stroke="url(#fr-magic-thread)" stroke-width="1.3"><path d="M-20 520Q150 410 255 500T480 435" stroke-dasharray="2 14"/><path d="M1030 180Q850 260 770 150T570 205" stroke-dasharray="2 12"/><path d="M120 0Q210 70 170 150T220 260M840 700Q770 620 820 560T790 450"/></g><g fill="#f8d88d"><path class="fr-magic-dust" d="M135 140l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path class="fr-magic-dust delay" d="M830 490l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/><path class="fr-magic-dust delay2" d="M700 110l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>`,
      spider: `<svg viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#b7eaff" stroke-width="1.1" stroke-opacity=".65"><path d="M0 0L175 145L0 300M0 0H245L175 145L0 110M0 0L125 220L0 440M1000 0L825 145L1000 300M1000 0H755L825 145L1000 110M1000 0L875 220L1000 440M0 700L175 555L0 400M1000 700L825 555L1000 400"/><path d="M0 65L175 145L65 0M0 160L175 145L0 260M1000 65L825 145L935 0M1000 160L825 145L1000 260M0 520L175 555L0 650M1000 520L825 555L1000 650" stroke-dasharray="3 7"/><path class="fr-web-thread" d="M175 145Q220 230 175 315T175 480M825 145Q780 230 825 315T825 480" stroke-width="1.7"/></g></svg>`,
      saber: `<svg viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fr-saber-wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#57c9ff" stop-opacity="0"/><stop offset=".48" stop-color="#57c9ff" stop-opacity=".55"/><stop offset=".55" stop-color="#f4fdff" stop-opacity=".7"/><stop offset="1" stop-color="#57c9ff" stop-opacity="0"/></linearGradient></defs><path class="fr-saber-sweep" d="M-130 680L530 -40L650 10L-20 730Z" fill="url(#fr-saber-wash)"/><path d="M0 80L180 0M820 700L1000 620" stroke="#68d9ff" stroke-width="2" stroke-opacity=".45"/><path d="M0 110L130 40M870 660L1000 590" stroke="#ffffff" stroke-width=".7" stroke-opacity=".55"/></svg>`,
      thor: `<svg viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke-linejoin="round" stroke-linecap="round"><path class="fr-thor-bolt" d="M170 -25L128 100L169 90L110 225L205 130L164 138L214 18" stroke="#a5d9ff" stroke-width="4.2"/><path class="fr-thor-bolt delay" d="M870 170L812 295L853 284L780 445L885 338L840 345L908 205" stroke="#d9f4ff" stroke-width="4.2"/><path class="fr-thor-bolt delay2" d="M530 520L490 588L521 582L478 680L548 602L519 607L552 545" stroke="#80bfff" stroke-width="3.1"/></g><path d="M0 0L80 30M920 680L1000 700" stroke="#d8f2ff" stroke-width="1" stroke-opacity=".3"/></svg>`
    };
    return scenes[style] || '';
  },

  initCursorExperience() {
    if (!document.getElementById('frCursorHalo')) {
      const atmosphere = document.createElement('div');
      atmosphere.id = 'frCursorAtmosphere';
      atmosphere.className = 'fr-cursor-atmosphere';
      atmosphere.setAttribute('aria-hidden', 'true');
      const halo = document.createElement('div');
      halo.id = 'frCursorHalo';
      halo.className = 'fr-cursor-halo';
      halo.setAttribute('aria-hidden', 'true');
      const core = document.createElement('div');
      core.id = 'frCursorCore';
      core.className = 'fr-cursor-core';
      core.setAttribute('aria-hidden', 'true');
      core.innerHTML = this.cursorSvg('default', 'fr-cursor-glyph');
      document.body.append(atmosphere, halo, core);
    }
    this.applyCursorStyle(localStorage.getItem('fr_cursor_style') || 'default');

    if (!this._cursorListenersAttached) {
      this._cursorListenersAttached = true;
      const moveCursor = event => {
        if (event.pointerType === 'touch') return;
        const core = document.getElementById('frCursorCore');
        const halo = document.getElementById('frCursorHalo');
        if (!core || !halo) return;
        core.style.left = `${event.clientX}px`;
        core.style.top = `${event.clientY}px`;
        halo.style.left = `${event.clientX}px`;
        halo.style.top = `${event.clientY}px`;
        const hovering = event.target?.closest?.('button, a, select, input:not([type="text"]), .lb-star-wrapper, [role="button"]');
        core.classList.toggle('is-hovering', Boolean(hovering));
        halo.classList.toggle('is-hovering', Boolean(hovering));
        const spotlight = event.target?.closest?.('.glass-card, .theme-subcard, .share-card-interactive');
        if (spotlight) {
          const rect = spotlight.getBoundingClientRect();
          spotlight.style.setProperty('--spot-x', `${Math.round(event.clientX - rect.left)}px`);
          spotlight.style.setProperty('--spot-y', `${Math.round(event.clientY - rect.top)}px`);
          spotlight.classList.add('fr-spotlight-active');
        }
      };
      document.addEventListener('pointermove', moveCursor, { passive: true });
      document.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch' || event.button !== 0) return;
        document.getElementById('frCursorCore')?.classList.add('is-pressed');
        this.spawnCursorClickEffect(event.clientX, event.clientY);
      }, { passive: true });
      const release = () => document.getElementById('frCursorCore')?.classList.remove('is-pressed');
      document.addEventListener('pointerup', release, { passive: true });
      document.addEventListener('pointercancel', release, { passive: true });
      document.addEventListener('pointerover', event => {
        const item = event.target?.closest?.('.glass-card, .theme-subcard, .share-card-interactive');
        if (item) item.classList.add('fr-spotlight-active');
      }, { passive: true });
      document.addEventListener('pointerout', event => {
        const item = event.target?.closest?.('.glass-card, .theme-subcard, .share-card-interactive');
        if (item && !item.contains(event.relatedTarget)) item.classList.remove('fr-spotlight-active');
      }, { passive: true });
      document.addEventListener('click', event => {
        const wrap = document.getElementById('cursorChooserWrap');
        if (wrap && !wrap.contains(event.target)) this.closeCursorPicker();
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') this.closeCursorPicker();
      });
    }
  },

  spawnCursorClickEffect(x, y) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    const style = document.getElementById('frCursorCore')?.dataset.style || 'default';
    if (style === 'default') return;
    const burst = document.createElement('span');
    burst.className = `fr-cursor-burst fr-burst-${style}`;
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    const glyph = this.cursorSvg(style, 'fr-click-burst-svg');
    const effects = {
      harry: `<svg class="fr-burst-scene" viewBox="0 0 80 80"><path d="M10 15Q30 0 47 18T70 20M10 57Q28 40 45 58T73 55" fill="none" stroke="#f4d48b" stroke-width="1.2" stroke-dasharray="2 5"/><path d="M40 7l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM17 37l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM62 41l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff1b9"/></svg>`,
      spider: `<svg class="fr-burst-scene" viewBox="0 0 80 80"><g fill="none" stroke="#d9f8ff" stroke-width="1.4"><path d="M40 40L4 4M40 40L40 0M40 40L76 4M40 40L0 40M40 40H80M40 40L4 76M40 40V80M40 40L76 76"/><path d="M18 18Q40 28 62 18M18 62Q40 52 62 62M18 18Q28 40 18 62M62 18Q52 40 62 62" stroke-opacity=".9"/></g></svg>`,
      saber: `<span class="fr-burst-saber-slash"></span>`,
      thor: `<svg class="fr-burst-scene" viewBox="0 0 80 80"><path d="M15 0L7 25L18 22L8 47L30 25L19 28L28 6M61 27L52 49L62 46L51 71L72 50L62 53L70 33" fill="none" stroke="#a9dcff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 39L15 31M64 8L79 1" stroke="#fff" stroke-width="1.5"/></svg>`
    };
    burst.innerHTML = `<span class="fr-click-burst-symbol">${glyph}</span>${effects[style] || ''}`;
    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), 900);
  },

  applyCursorStyle(style) {
    const allowed = Object.keys(this.cursorPresets).concat('default');
    const next = allowed.includes(style) ? style : 'default';
    const body = document.body;
    const core = document.getElementById('frCursorCore');
    const halo = document.getElementById('frCursorHalo');
    const atmosphere = document.getElementById('frCursorAtmosphere');
    const preset = this.cursorPresets[next] || { label: 'Windows Cursor', color: '#ffffff', desc: 'Native system pointer' };
    body?.classList.toggle('fr-custom-cursor', next !== 'default');
    body?.setAttribute('data-fr-cursor-style', next);
    if (core) {
      core.dataset.style = next;
      core.innerHTML = next === 'default' ? '' : this.cursorSvg(next, 'fr-cursor-glyph');
      core.style.setProperty('--cursor-main', preset.color);
    }
    if (halo) halo.dataset.style = next;
    if (atmosphere) {
      atmosphere.dataset.style = next;
      atmosphere.innerHTML = next === 'default' ? '' : this.cursorAtmosphereSvg(next);
      atmosphere.classList.toggle('is-active', next !== 'default');
    }
    const button = document.getElementById('cursorStyleToggle');
    const label = document.getElementById('cursorStyleLabel');
    const preview = document.getElementById('cursorStylePreview');
    if (label) label.textContent = preset.label;
    if (preview) preview.innerHTML = this.cursorSvg(next === 'default' ? 'default' : next, 'fr-preview-svg');
    if (button) {
      button.title = `Cursor style: ${preset.label}. Open to choose another style.`;
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', next !== 'default' ? 'true' : 'false');
    }
    document.querySelectorAll('[data-cursor-choice]').forEach(choice => {
      const active = choice.dataset.cursorChoice === next;
      choice.classList.toggle('is-selected', active);
      choice.setAttribute('aria-pressed', String(active));
      const glyph = choice.querySelector('.fr-choice-glyph');
      if (glyph) glyph.innerHTML = this.cursorSvg(choice.dataset.cursorChoice, 'fr-choice-svg');
    });
    try { localStorage.setItem('fr_cursor_style', next); } catch (_) {}
  },

  toggleCursorPicker() {
    const chooser = document.getElementById('cursorChooser');
    const button = document.getElementById('cursorStyleToggle');
    if (!chooser || !button) return;
    const opening = chooser.classList.contains('hidden');
    chooser.classList.toggle('hidden', !opening);
    chooser.setAttribute('aria-hidden', String(!opening));
    button.setAttribute('aria-expanded', String(opening));
    if (opening) {
      const active = chooser.querySelector(`[data-cursor-choice="${this.getCursorStyle()}"]`);
      active?.focus({ preventScroll: true });
    }
  },

  getCursorStyle() {
    return document.getElementById('frCursorCore')?.dataset.style || localStorage.getItem('fr_cursor_style') || 'fr';
  },

  closeCursorPicker() {
    const chooser = document.getElementById('cursorChooser');
    const button = document.getElementById('cursorStyleToggle');
    if (!chooser || chooser.classList.contains('hidden')) return;
    chooser.classList.add('hidden');
    chooser.setAttribute('aria-hidden', 'true');
    button?.setAttribute('aria-expanded', 'false');
  },

  selectCursorStyle(style) {
    this.applyCursorStyle(style);
    this.closeCursorPicker();
    const preset = this.cursorPresets[style];
    this.showToast(`Cursor style: ${preset?.label || 'System cursor'}`);
  },

  cycleCursorStyle() {
    const styles = Object.keys(this.cursorPresets).concat('default');
    const current = this.getCursorStyle();
    const next = styles[(styles.indexOf(current) + 1) % styles.length];
    this.applyCursorStyle(next);
    this.showToast(`Cursor style: ${this.cursorPresets[next]?.label || 'System default'}`);
  },

  initGlobalHoverEffects() {
    // Section entrances run every time a step is opened; pointer tracking powers subtle card spotlights.
    document.querySelectorAll('#page-1, #page-2, #page-3, #page-4').forEach(page => {
      if (!page.classList.contains('hidden')) page.classList.add('fr-page-enter');
    });
  },

  copyText(elId) {
    const el = document.getElementById(elId);
    if (!el) return;
    navigator.clipboard.writeText(el.textContent.trim());
    this.showToast('Review copied to clipboard');
  },

  /* ================= LETTERBOXD .ZIP & .CSV FULL ARCHIVE IMPORTER ================= */
  toggleModal(id) {
    document.getElementById(id)?.classList.toggle('hidden');
  },

  async loadSavedLbLibrary() {
    let saved = null;
    try {
      if (window.FrameRateLibraryStore) saved = await window.FrameRateLibraryStore.get();
    } catch (error) {
      console.warn('[FrameRate Library] IndexedDB read failed; using the synced browser copy:', error);
    }
    if (!Array.isArray(saved) || !saved.length) {
      try {
        const fallback = JSON.parse(localStorage.getItem('fr_lb_zip_library') || '[]');
        if (Array.isArray(fallback)) {
          saved = fallback;
          if (saved.length && window.FrameRateLibraryStore) {
            try { await window.FrameRateLibraryStore.set(saved); } catch (error) {
              console.warn('[FrameRate Library] Could not migrate the browser copy to IndexedDB:', error);
            }
          }
        }
      } catch (error) {
        console.warn('[FrameRate Library] Could not read the saved Letterboxd library:', error);
      }
    }
    this.lbLibrary = Array.isArray(saved) ? saved : [];
    this.renderLbLibraryModal();
    return this.lbLibrary;
  },

  clearSavedLbLibrary() {
    this.lbLibrary = [];
    if (window.FrameRateLibraryStore) {
      void window.FrameRateLibraryStore.clear().catch(error =>
        console.warn('[FrameRate Library] Could not clear the full local archive:', error)
      );
    }
    localStorage.removeItem('fr_lb_zip_library');
    document.getElementById('lbLibraryControls')?.classList.add('hidden');
    const stage = document.getElementById('rssResultsStage');
    if (stage) {
      stage.innerHTML = `<div class="col-span-full py-10 text-center text-xs theme-text-muted">Library cleared. Upload a Letterboxd .ZIP or .CSV file above.</div>`;
    }
    this.showToast('Imported Letterboxd library cleared');
  },

  async handleArchiveUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const titleEl = document.getElementById('zipUploadTitle');
    if (titleEl) titleEl.textContent = `Reading ${files[0].name}...`;

    const recordsMap = new Map();

    const getOrCreateRecord = (title, year) => {
      const cleanTitle = (title || '').trim();
      const cleanYear = (year || '').trim();
      const key = `${cleanTitle.toLowerCase()}__${cleanYear}`;
      if (!recordsMap.has(key)) {
        recordsMap.set(key, {
          title: cleanTitle,
          year: cleanYear,
          uri: '',
          rating: null,
          liked: false,
          rewatch: false,
          watchedDate: '',
          review: '',
          tags: []
        });
      }
      return recordsMap.get(key);
    };

    try {
      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.zip')) {
          const JSZipLib = await this.ensureJsZipLoaded();
          const zip = await JSZipLib.loadAsync(file);

          const csvFilesOrder = [
            'watched.csv',
            'ratings.csv',
            'diary.csv',
            'reviews.csv',
            'likes/films.csv'
          ];

          for (const targetPath of csvFilesOrder) {
            const zipEntry =
              zip.file(targetPath) ||
              Object.values(zip.files).find(z => z.name.toLowerCase().endsWith(targetPath));

            if (zipEntry) {
              const csvContent = await zipEntry.async('string');
              const isLikesFile = targetPath.includes('likes/');
              this.mergeCsvIntoMap(csvContent, recordsMap, getOrCreateRecord, isLikesFile);
            }
          }
        } else if (lowerName.endsWith('.csv')) {
          const csvContent = await file.text();
          const isLikesFile = lowerName.includes('like');
          this.mergeCsvIntoMap(csvContent, recordsMap, getOrCreateRecord, isLikesFile);
        }
      }

      const merged = Array.from(recordsMap.values()).reverse();
      if (!merged.length) {
        if (titleEl) titleEl.textContent = 'Import Letterboxd Export (.ZIP) or .CSV';
        this.showToast('No movie entries found in the selected file');
        return;
      }

      this.lbLibrary = merged;
      let fullArchiveSaved = false;
      if (window.FrameRateLibraryStore) {
        try { fullArchiveSaved = await window.FrameRateLibraryStore.set(merged); }
        catch (storageErr) {
          console.warn('[FrameRate Library] Full archive could not be saved to IndexedDB:', storageErr);
        }
      }
      // Keep the existing compact account-sync snapshot for older builds and cloud
      // portability. The complete local archive lives separately in IndexedDB.
      try {
        localStorage.setItem('fr_lb_zip_library', JSON.stringify(merged.slice(0, 3000)));
      } catch (storageErr) {
        console.warn('Storage quota exceeded; the full local archive may still be available in IndexedDB:', storageErr);
      }

      if (titleEl) titleEl.textContent = `Loaded ${merged.length} Films from ${files[0].name}`;
      this.lbFilterMode = 'all';
      this.lbSearchQuery = '';
      this.renderLbLibraryModal();
      this.showToast(fullArchiveSaved
        ? `Imported and saved all ${merged.length} Letterboxd films on this browser.`
        : `Imported ${merged.length} films for this session. Full local storage was unavailable; keep this ZIP to re-import later.`);
    } catch (err) {
      console.error('Archive parse error:', err);
      if (titleEl) titleEl.textContent = 'Import Letterboxd Export (.ZIP) or .CSV';
      this.showToast('Error reading file. Make sure it is a valid Letterboxd .ZIP or .CSV');
    }
  },

  // True RFC-4180 Multi-Line CSV Parser (Properly handles multi-paragraph reviews with newlines & quotes)
  parseCsvRowsRfc4180(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const nextCh = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && nextCh === '"') {
          currentCell += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          currentCell += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (ch === '\r' && nextCh === '\n') {
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
          currentRow = [];
          currentCell = '';
          i++;
        } else if (ch === '\n' || ch === '\r') {
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += ch;
        }
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
    }

    return rows;
  },

  mergeCsvIntoMap(csvText, recordsMap, getOrCreateRecord, isLikesFile = false) {
    const rows = this.parseCsvRowsRfc4180(csvText);
    if (rows.length < 2) return;

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const idxName = headers.findIndex(h => h === 'name' || h === 'title');
    const idxYear = headers.findIndex(h => h === 'year');
    const idxUri = headers.findIndex(h => h === 'letterboxd uri' || h === 'uri');
    const idxRating = headers.findIndex(h => h === 'rating');
    const idxWatchedDate = headers.findIndex(h => h === 'watched date');
    const idxDate = headers.findIndex(h => h === 'date');
    const idxRewatch = headers.findIndex(h => h === 'rewatch');
    const idxReview = headers.findIndex(h => h === 'review');
    const idxTags = headers.findIndex(h => h === 'tags');

    if (idxName === -1) return;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const title = r[idxName];
      if (!title) continue;

      const year = idxYear !== -1 ? r[idxYear] : '';
      const rec = getOrCreateRecord(title, year);

      if (idxUri !== -1 && r[idxUri]) rec.uri = r[idxUri];

      if (idxRating !== -1 && r[idxRating]) {
        const val = parseFloat(r[idxRating]);
        if (!isNaN(val) && val > 0) rec.rating = val;
      }

      if (isLikesFile) {
        rec.liked = true;
      }

      if (idxRewatch !== -1 && (r[idxRewatch] || '').toLowerCase() === 'yes') {
        rec.rewatch = true;
      }

      const dateCandidate = (idxWatchedDate !== -1 && r[idxWatchedDate]) || (idxDate !== -1 && r[idxDate]) || '';
      if (dateCandidate && (!rec.watchedDate || idxWatchedDate !== -1)) {
        rec.watchedDate = dateCandidate;
      }

      if (idxReview !== -1 && r[idxReview]) {
        // Strip HTML tags from Letterboxd review text
        const cleanRev = r[idxReview]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>\s*<p>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .trim();
        if (cleanRev) rec.review = cleanRev;
      }

      if (idxTags !== -1 && r[idxTags]) {
        rec.tags = r[idxTags].split(',').map(t => t.trim()).filter(Boolean);
      }
    }
  },

  handleLbModalSearch(val) {
    this.lbSearchQuery = (val || '').trim().toLowerCase();
    this.renderLbLibraryModal();
  },

  setLbModalFilter(mode) {
    this.lbFilterMode = mode;
    document.querySelectorAll('[data-lb-filter]').forEach(btn => {
      const active = btn.getAttribute('data-lb-filter') === mode;
      btn.className = active
        ? 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-lbGreen text-black'
        : 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold theme-input';
    });
    this.renderLbLibraryModal();
  },

  renderLbLibraryModal() {
    const controls = document.getElementById('lbLibraryControls');
    const statsEl = document.getElementById('lbLibraryStats');
    const stage = document.getElementById('rssResultsStage');
    if (!stage) return;

    if (!this.lbLibrary.length) {
      controls?.classList.add('hidden');
      return;
    }

    controls?.classList.remove('hidden');

    const total = this.lbLibrary.length;
    const ratedCount = this.lbLibrary.filter(x => x.rating > 0).length;
    const revCount = this.lbLibrary.filter(x => x.review && x.review.length > 0).length;
    const likedCount = this.lbLibrary.filter(x => x.liked).length;

    if (statsEl) {
      statsEl.textContent = `${total} Films • ${ratedCount} Rated • ${revCount} Reviews • ${likedCount} Liked`;
    }

    const filtered = this.lbLibrary.filter(item => {
      if (this.lbFilterMode === 'rated' && !item.rating) return false;
      if (this.lbFilterMode === 'reviewed' && !item.review) return false;
      if (this.lbFilterMode === 'liked' && !item.liked) return false;

      if (this.lbSearchQuery) {
        const hay = `${item.title} ${item.year} ${item.review || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
        return hay.includes(this.lbSearchQuery);
      }
      return true;
    });

    if (!filtered.length) {
      stage.innerHTML = `<div class="col-span-full py-8 text-center text-xs theme-text-muted">No films match your current search/filter.</div>`;
      return;
    }

    stage.innerHTML = '';
    filtered.slice(0, 90).forEach(entry => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rounded-2xl theme-subcard hover:border-lbGreen text-left transition p-3 flex flex-col justify-between gap-2 group focus:outline-none';

      const starsBadge = entry.rating ? this.formatStarAscii(entry.rating) : 'Watched';
      const likedBadge = entry.liked ? `<span class="text-frAmber font-bold">♥</span>` : '';
      const reviewSnippet = entry.review
        ? `<p class="text-[11px] theme-text-secondary italic line-clamp-2 border-t border-white/5 pt-1.5">"${this.escapeHtml(entry.review)}"</p>`
        : '';

      btn.innerHTML = `
        <div class="w-full space-y-1">
          <div class="flex items-start justify-between gap-1.5">
            <p class="text-xs font-extrabold theme-text-primary group-hover:text-lbGreen transition line-clamp-1">${this.escapeHtml(entry.title)}</p>
            <span class="text-[10px] font-mono theme-text-muted shrink-0">${this.escapeHtml(entry.year || '')}</span>
          </div>
          <div class="flex items-center gap-2 text-[11px] font-mono">
            <span class="text-lbGreen font-black">${starsBadge}</span>
            ${likedBadge}
            ${entry.review ? `<span class="px-1.5 py-0.2 rounded bg-frBlueLight/15 text-frBlueLight text-[9px] uppercase font-bold">Review</span>` : ''}
          </div>
          ${reviewSnippet}
        </div>
        <div class="flex items-center justify-between w-full pt-1 text-[10px] font-mono theme-text-muted">
          <span>${this.escapeHtml(entry.watchedDate || 'Logged')}</span>
          <span class="text-frOrange opacity-0 group-hover:opacity-100 transition font-bold">Load Film &rarr;</span>
        </div>
      `;

      btn.addEventListener('click', async () => {
        this.toggleModal('rssModal');
        this.goToStep(1);
        const searchInput = document.getElementById('movieSearchInput');
        if (searchInput) searchInput.value = entry.title;

        const found = await Api.searchMovies(`${entry.title} ${entry.year || ''}`.trim());
        if (found.length > 0) {
          await this.selectFilm(found[0], entry);
        } else {
          await this.selectFilm({
            id: Date.now(),
            source: 'letterboxd',
            title: entry.title,
            year: entry.year || '—',
            director: 'Imported from Letterboxd',
            overview: entry.review || 'Imported from your personal Letterboxd archive.',
            poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
            backdrop: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80'
          }, entry);
        }
      });

      stage.appendChild(btn);
    });
  },

  /* ================= ROBUST LETTERBOXD RSS SYNC ================= */
  normalizeLetterboxdUsername(input) {
    let value = String(input || '').trim();
    if (!value) return '';

    try {
      if (/^https?:\/\//i.test(value)) {
        const parsed = new URL(value);
        if (!/^(www\.)?letterboxd\.com$/i.test(parsed.hostname)) return '';
        value = parsed.pathname.split('/').filter(Boolean)[0] || '';
      } else {
        value = value
          .replace(/^@/, '')
          .replace(/^(?:www\.)?letterboxd\.com\//i, '')
          .split(/[?#]/, 1)[0]
          .split('/').filter(Boolean)[0] || '';
      }
    } catch (_) {
      return '';
    }

    if (/^(rss|films|diary|reviews|watchlist|lists)$/i.test(value)) return '';
    return /^[a-z0-9][a-z0-9_-]{0,39}$/i.test(value) ? value : '';
  },

  letterboxdDescriptionText(descriptionHtml) {
    try {
      const doc = new DOMParser().parseFromString(String(descriptionHtml || ''), 'text/html');
      doc.querySelectorAll('img, script, style').forEach(node => node.remove());
      doc.querySelectorAll('p, div').forEach(node => {
        if (/^\s*watched on\b/i.test(node.textContent || '')) node.remove();
      });
      return Array.from(doc.body.children)
        .map(node => (node.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n\n')
        .trim();
    } catch (_) {
      return String(descriptionHtml || '')
        .replace(/<img\b[^>]*>/gi, '')
        .replace(/<p>\s*Watched on [^<]*<\/p>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  },

  parseLetterboxdRssXml(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(String(xmlText || ''), 'application/xml');
    if (xml.getElementsByTagName('parsererror').length) {
      throw new Error('Letterboxd returned an invalid RSS/XML response.');
    }

    const LETTERBOXD_NS = 'https://letterboxd.com';
    const TMDB_NS = 'https://themoviedb.org';
    const getText = (node, namespace, localName) => {
      const found = node.getElementsByTagNameNS(namespace, localName)[0];
      return found ? String(found.textContent || '').trim() : '';
    };
    const getPlainText = (node, name) => {
      const found = node.getElementsByTagName(name)[0];
      return found ? String(found.textContent || '').trim() : '';
    };

    return Array.from(xml.getElementsByTagName('item')).map(node => {
      const guid = getPlainText(node, 'guid');
      const link = getPlainText(node, 'link');
      // The feed also contains list posts. Only import film diary entries.
      if (/letterboxd-list-/i.test(guid) || /\/list\//i.test(link)) return null;

      const rawTitle = getPlainText(node, 'title');
      const description = getPlainText(node, 'description');
      const pubDate = getPlainText(node, 'pubDate');
      const structuredTitle = getText(node, LETTERBOXD_NS, 'filmTitle');
      const fallback = this.parseLetterboxdRssItem(rawTitle, description, pubDate);
      const title = structuredTitle || fallback.title;
      if (!title || !title.trim()) return null;

      const structuredYear = getText(node, LETTERBOXD_NS, 'filmYear');
      const ratingText = getText(node, LETTERBOXD_NS, 'memberRating');
      const watchedDate = getText(node, LETTERBOXD_NS, 'watchedDate') || fallback.watchedDate;
      const likedText = getText(node, LETTERBOXD_NS, 'memberLike');
      const rewatchText = getText(node, LETTERBOXD_NS, 'rewatch');
      const htmlDoc = new DOMParser().parseFromString(description, 'text/html');
      const poster = htmlDoc.querySelector('img')?.getAttribute('src') || '';
      const releaseYear = structuredYear || fallback.year || '';
      const parsedRating = ratingText !== '' && Number.isFinite(Number(ratingText))
        ? Number(ratingText)
        : fallback.rating;

      return {
        title: title.trim(),
        year: String(releaseYear),
        rating: parsedRating,
        liked: likedText === '' ? null : likedText.toLowerCase() === 'yes',
        rewatch: rewatchText === '' ? null : rewatchText.toLowerCase() === 'yes',
        watchedDate,
        review: this.letterboxdDescriptionText(description),
        posterUrl: poster,
        tmdbId: getText(node, TMDB_NS, 'movieId') || '',
        link,
        tags: []
      };
    }).filter(Boolean);
  },

  async fetchRssDiary() {
    const input = document.getElementById('rssUsernameInput');
    const rawInput = input?.value.trim() || '';
    const stage = document.getElementById('rssResultsStage');
    const button = input?.parentElement?.querySelector('button');
    if (!rawInput || !stage) {
      this.showToast('Enter your Letterboxd username or profile URL first');
      input?.focus();
      return;
    }

    const username = this.normalizeLetterboxdUsername(rawInput);
    if (!username) {
      stage.innerHTML = `
        <div class="col-span-full text-center py-6 px-4 rounded-2xl bg-frOrange/10 border border-frOrange/30">
          <p class="text-xs font-bold text-frOrange">That doesn't look like a Letterboxd username or profile URL.</p>
          <p class="text-[11px] theme-text-secondary mt-1">Enter just the username (for example, <strong>3b3aliy</strong>) or a link like https://letterboxd.com/username/.</p>
        </div>`;
      return;
    }

    const originalButtonText = button?.textContent || 'Sync RSS';
    if (button) {
      button.disabled = true;
      button.textContent = 'Syncing…';
      button.classList.add('opacity-70');
    }
    stage.innerHTML = `<div class="col-span-full text-center py-8 text-xs theme-text-muted"><span class="fr-loading-pulse inline-block mr-2">●</span> Connecting to @${this.escapeHtml(username)}’s public Letterboxd diary…</div>`;

    const rssUrl = `https://letterboxd.com/${encodeURIComponent(username)}/rss/`;
    const pendingControllers = new Set();
    const timeoutFetchText = async (url) => {
      const controller = new AbortController();
      pendingControllers.add(controller);
      const timer = setTimeout(() => controller.abort(), 8500);
      try {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'omit',
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          const corsDetail = response.headers.get('X-Cors-Error');
          throw new Error(corsDetail || `HTTP ${response.status}`);
        }
        const body = await response.text();
        if (!body || body.length < 40) throw new Error('Empty feed response');
        return body;
      } finally {
        clearTimeout(timer);
        pendingControllers.delete(controller);
      }
    };

    const parseProxyResponse = async (kind, url) => {
      const body = await timeoutFetchText(url);
      if (kind === 'rss2json') {
        let data;
        try { data = JSON.parse(body); } catch (_) { throw new Error('RSS-to-JSON returned invalid JSON'); }
        if (data.status !== 'ok' || !Array.isArray(data.items)) {
          throw new Error(data.message || 'RSS-to-JSON could not read the feed');
        }
        const entries = data.items
          .filter(item => !/\/list\//i.test(String(item.link || item.guid || '')) && !/letterboxd-list-/i.test(String(item.guid || '')))
          .map(item => this.parseLetterboxdRssItem(
            item.title || '', item.description || item.content || '', item.pubDate || item.published || ''
          ))
          .filter(entry => entry.title && entry.year);
        if (!entries.length) throw new Error('No diary entries found in RSS-to-JSON response');
        return entries;
      }

      let xmlText = body;
      if (kind === 'allorigins-json') {
        let data;
        try { data = JSON.parse(body); } catch (_) { throw new Error('AllOrigins returned invalid JSON'); }
        xmlText = data.contents || '';
      }
      if (!/<(?:rss|rdf:RDF|feed)\b/i.test(xmlText)) {
        throw new Error('The proxy did not return an RSS feed');
      }
      const entries = this.parseLetterboxdRssXml(xmlText);
      if (!entries.length) throw new Error('The feed was reachable but contained no diary items');
      return entries;
    };

    const attempts = [
      {
        name: 'CORS.dev', kind: 'xml',
        url: `https://proxy.cors.dev/${rssUrl}`
      },
      {
        name: 'AllOrigins', kind: 'xml',
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`
      },
      {
        name: 'AllOrigins JSON', kind: 'allorigins-json',
        url: `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`
      },
      {
        name: 'RSS2JSON', kind: 'rss2json',
        url: `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
      },
      {
        name: 'CodeTabs', kind: 'xml',
        url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`
      }
    ];

    try {
      const successful = await Promise.any(attempts.map(async attempt => {
        const entries = await parseProxyResponse(attempt.kind, attempt.url);
        return { entries, via: attempt.name };
      }));
      // Stop any slower proxy requests once one source returns a usable feed.
      pendingControllers.forEach(controller => controller.abort());

      const incoming = successful.entries;
      // Merge with the existing ZIP/CSV library instead of replacing it.
      const keyFor = entry => `${String(entry.title || '').trim().toLowerCase()}|${String(entry.year || '').trim()}`;
      const merged = new Map((this.lbLibrary || []).map(entry => [keyFor(entry), { ...entry }]));
      for (const entry of incoming) {
        const key = keyFor(entry);
        const prior = merged.get(key) || {};
        merged.set(key, {
          ...prior,
          ...entry,
          rating: entry.rating ?? prior.rating ?? null,
          liked: entry.liked ?? prior.liked ?? false,
          rewatch: entry.rewatch ?? prior.rewatch ?? false,
          watchedDate: entry.watchedDate || prior.watchedDate || '',
          review: entry.review || prior.review || '',
          tags: Array.isArray(entry.tags) && entry.tags.length ? entry.tags : (prior.tags || [])
        });
      }
      this.lbLibrary = Array.from(merged.values());
      try {
        localStorage.setItem('fr_lb_zip_library', JSON.stringify(this.lbLibrary));
      } catch (storageError) {
        console.warn('Could not persist Letterboxd library:', storageError);
      }
      this.renderLbLibraryModal();
      this.showToast(`Synced ${incoming.length} diary entries from @${username} via ${successful.via}`);
    } catch (error) {
      pendingControllers.forEach(controller => controller.abort());
      console.warn('Letterboxd RSS sync failed:', error);
      stage.innerHTML = `
        <div class="col-span-full text-center py-6 px-4 space-y-2 rounded-2xl bg-frOrange/10 border border-frOrange/30">
          <p class="text-xs font-bold text-frOrange">Couldn't load @${this.escapeHtml(username)}’s RSS feed.</p>
          <p class="text-[11px] theme-text-secondary leading-relaxed max-w-lg mx-auto">Check that the username is correct and the Letterboxd profile is public. If a proxy is temporarily unavailable, try again later. RSS usually contains only recent diary activity, not your entire watched/rated library.</p>
          <a href="${rssUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex mt-1 px-3 py-2 rounded-xl theme-input text-[11px] font-bold hover:border-frOrange">Open the public RSS feed ↗</a>
          <p class="text-[10px] theme-text-muted">For a complete history, import your Letterboxd ZIP export instead.</p>
        </div>`;
      this.showToast('Letterboxd RSS sync failed — check the username or try again');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalButtonText;
        button.classList.remove('opacity-70');
      }
    }
  },

  parseLetterboxdRssItem(rawTitle, descHtml, pubDate) {
    let cleanTitle = String(rawTitle || '').trim();
    let year = '';
    let rating = null;

    const titleAndRating = cleanTitle.split(/\s+-\s+(?=[★½☆])/);
    if (titleAndRating.length > 1) {
      const starPart = titleAndRating.pop();
      const fullStars = (starPart.match(/★/g) || []).length;
      const halfStar = /½|☆½/.test(starPart) ? 0.5 : 0;
      if (fullStars > 0 || halfStar > 0) rating = Math.min(5, fullStars + halfStar);
      cleanTitle = titleAndRating.join(' - ').trim();
    }

    const yearMatch = cleanTitle.match(/,\s*(\d{4})$/);
    if (yearMatch) {
      year = yearMatch[1];
      cleanTitle = cleanTitle.replace(/,\s*\d{4}$/, '').trim();
    }

    const cleanRev = this.letterboxdDescriptionText(descHtml || '');
    let watchedDate = '';
    if (pubDate) {
      const date = new Date(pubDate);
      if (!Number.isNaN(date.getTime())) watchedDate = date.toISOString().slice(0, 10);
    }

    return {
      title: cleanTitle,
      year,
      rating,
      liked: null,
      rewatch: null,
      watchedDate,
      review: cleanRev,
      posterUrl: '',
      tags: []
    };
  },

  /* ================= SETTINGS & API VAULT ================= */
  loadSavedSettings() {
    const keys = Api.getKeys();
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('cfgAiProvider', keys.provider || 'auto');
    setVal('cfgGroq', keys.groq);
    setVal('cfgOpenai', keys.openai);
    setVal('cfgGemini', keys.gemini);
    setVal('cfgOpenrouter', keys.openrouter);
    this.updateActiveAiBadge(keys.provider);
    window.FrameRateAuth?.updateCredentialStatusUI?.();

    try {
      const dna = JSON.parse(localStorage.getItem('fr_dna') || '{}');
      this.state.dna = { top4: dna.top4 || '', lens: dna.lens || '', avoid: dna.avoid || '' };
    } catch (e) {
      this.state.dna = { top4: '', lens: '', avoid: '' };
    }
    setVal('dnaTop4', this.state.dna.top4);
    setVal('dnaLens', this.state.dna.lens);
    setVal('dnaAvoid', this.state.dna.avoid);
  },

  async saveKeys() {
    const provider = document.getElementById('cfgAiProvider')?.value || 'auto';
    localStorage.setItem('fr_ai_provider', provider);
    const cloudModel = document.getElementById('cfgAiModelSelect')?.value || localStorage.getItem('fr_ai_model') || 'auto-discover';
    if (cloudModel) localStorage.setItem('fr_ai_model', cloudModel);
    const credentials = {
      groq: document.getElementById('cfgGroq')?.value.trim() || '',
      openai: document.getElementById('cfgOpenai')?.value.trim() || '',
      gemini: document.getElementById('cfgGemini')?.value.trim() || '',
      openrouter: document.getElementById('cfgOpenrouter')?.value.trim() || ''
    };
    const auth = window.FrameRateAuth;
    try {
      if (auth?.currentUser?.id && !auth.cloudReady) {
        this.showToast('Your account is still syncing. Wait a moment before saving AI keys to the cloud vault.');
        return;
      }
      if (auth?.currentUser?.id && auth.cloudReady) {
        // The Edge Function encrypts keys at rest; secret values never enter the
        // normal cloud-sync JSONB payload or remain in the signed-in browser cache.
        const response = await auth.saveCloudCredentials(credentials);
        Object.keys(credentials).forEach(providerKey => {
          if (credentials[providerKey]) {
            const input = document.getElementById(`cfg${providerKey[0].toUpperCase()}${providerKey.slice(1)}`);
            if (input) input.value = '';
          }
        });
        auth.updateCredentialStatusUI();
        this.updateActiveAiBadge(provider);
        if (window.Api) Api.populateModelDropdowns(provider, cloudModel);
        this.toggleModal('vaultModal');
        this.showToast(response.saved?.length ? `Saved ${response.saved.map(item => item.toUpperCase()).join(', ')} securely to your account.` : 'AI preferences saved. Existing cloud keys were kept.');
      } else {
        // Blank password fields mean "no change", not "delete the stored key".
        // This preserves previously saved Guest keys when the masked inputs are cleared.
        const supplied = Object.entries(credentials).filter(([, value]) => Boolean(value));
        supplied.forEach(([providerKey, value]) => localStorage.setItem(`fr_key_${providerKey}`, value));
        this.updateActiveAiBadge(provider);
        auth?.updateCredentialStatusUI?.();
        this.toggleModal('vaultModal');
        const retained = Object.keys(credentials).filter(providerKey => Api.hasAvailableCredential(providerKey));
        this.showToast(supplied.length
          ? `Saved ${supplied.map(([providerKey]) => providerKey.toUpperCase()).join(', ')} in Guest Mode. Existing keys were preserved.`
          : retained.length
            ? `Settings saved. Existing ${retained.map(providerKey => providerKey.toUpperCase()).join(', ')} keys were kept.`
            : 'Settings saved. Enter an API key to enable a cloud AI provider.');
      }
    } catch (error) {
      this.showToast(`Could not save API keys: ${error.message || 'Cloud vault unavailable'}`);
    }
  },

  async removeApiKey(provider) {
    try {
      const auth = window.FrameRateAuth;
      if (auth?.currentUser?.id && !auth.cloudReady) {
        this.showToast('Your account is still syncing. Wait a moment before removing an AI key.');
        return;
      }
      if (auth?.currentUser?.id && auth.cloudReady && !auth.credentialStatusError) {
        // Deleting is idempotent; ask the server even if status hasn't finished
        // loading yet, so a saved cloud key can't be left behind accidentally.
        await auth.deleteCloudCredential(provider);
      } else {
        localStorage.removeItem(`fr_key_${provider}`);
      }
      const input = document.getElementById(`cfg${provider[0].toUpperCase()}${provider.slice(1)}`);
      if (input) input.value = '';
      if (window.Api) {
        Api.cachedGeminiModels = null;
        Api.cachedGeminiModelsApiKey = null;
        Api.populateModelDropdowns(localStorage.getItem('fr_ai_provider') || 'auto', localStorage.getItem('fr_ai_model') || 'auto-discover');
      }
      this.showToast(`${provider.toUpperCase()} key removed from ${auth?.currentUser?.id ? 'this account' : 'this browser'}.`);
    } catch (error) {
      this.showToast(`Could not remove key: ${error.message || 'Cloud vault unavailable'}`);
    }
  },

  updateActiveAiBadge(provider) {
    const badge = document.getElementById('activeAiBadge');
    if (!badge) return;
    const names = {
      auto: 'Agent: Auto',
      groq: 'Agent: Groq Llama 3.3',
      openai: 'Agent: ChatGPT',
      gemini: 'Agent: Gemini 1.5',
      openrouter: 'Agent: OpenRouter',
      local: 'Agent: Local Critic'
    };
    badge.textContent = names[provider] || 'Agent: Auto';
  },

  saveDNA() {
    this.state.dna = {
      top4: document.getElementById('dnaTop4')?.value.trim() || '',
      lens: document.getElementById('dnaLens')?.value.trim() || '',
      avoid: document.getElementById('dnaAvoid')?.value.trim() || ''
    };
    localStorage.setItem('fr_dna', JSON.stringify(this.state.dna));
    this.toggleModal('dnaModal');
    this.showToast('Writing DNA saved');
  },

  refreshDynamicLabels() {
    this.updateDiaryActionButtons();
    this.applyTheme(this.state.theme);
  },

  resetWorkspace() {
    this.closeTrailer();
    this.state.film = null;
    this.updateTrailerButton();
    this.state.activeBackdropUrl = '';
    this.state.rating = 4.0;
    this.state.watched = true;
    this.state.liked = false;
    this.state.rewatch = false;
    this.state.spoilers = false;
    this.state.format = 'Cinema';
    this.state.vibes = ['Atmospheric'];
    this.state.notes = { craft: '', soul: '', friction: '', free: '' };
    this.state.importedReview = '';

    ['noteCraft', 'noteSoul', 'noteFriction', 'noteFreeThought', 'movieSearchInput', 'customBackdropUrl'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const spoilersBox = document.getElementById('spoilersCheckbox');
    if (spoilersBox) spoilersBox.checked = false;

    const ambient = document.getElementById('ambientBackdrop');
    if (ambient) {
      ambient.style.backgroundImage = 'none';
      ambient.classList.remove('has-image');
      ambient.style.opacity = '0';
    }

    document.getElementById('filmEmptyState')?.classList.remove('hidden');
    document.getElementById('filmShowcaseStage')?.classList.add('hidden');
    document.getElementById('searchResultsGrid')?.classList.add('hidden');
    document.getElementById('activeFilmMiniBar')?.classList.add('hidden');
    document.getElementById('userLbImportedBanner')?.classList.add('hidden');

    this.renderFormatChips();
    this.renderVibeChips();
    this.updateStarUI(4.0, false);
    this.updateDiaryActionButtons();
    this.goToStep(1);
    this.showToast('Workspace reset');
  },

 showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'glass-card px-4 py-2.5 rounded-xl border-l-4 border-l-frOrange text-xs font-bold theme-text-primary shadow-xl flex items-center gap-2 animate-fadeIn pointer-events-auto';
    const statusDot = document.createElement('span');
    statusDot.className = 'w-2 h-2 rounded-full bg-lbGreen shrink-0';
    statusDot.setAttribute('aria-hidden', 'true');
    const messageText = document.createElement('span');
    messageText.textContent = String(message ?? '');
    messageText.style.overflowWrap = 'anywhere';
    toast.append(statusDot, messageText);
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 2600);
  },

 /* ================= CINEMA MINI-GAMES & HD PNG EXPORT ================= */
  arcadeState: {
    activeGame: 'guessr',
    score: 0,
    streak: 0,
    guessrRound: null,
    directorRound: null,
    yearRound: null,
    // Independent shuffle bags: the same answer film will not recur in a game
    // until every eligible film in that game's pool has been used.
    usedMovieKeys: { guessr: [], director: [], year: [] },
    moviePoolCache: null,
    moviePoolCacheKey: null,
    moviePoolPromise: null,
    moviePoolPromiseKey: null
  },

  arcadeMoviesPool: [
    { title: 'Blade Runner 2049', year: 2017, director: 'Denis Villeneuve', img: 'https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg' },
    { title: 'Parasite', year: 2019, director: 'Bong Joon-ho', img: 'https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
    { title: 'Dune: Part Two', year: 2024, director: 'Denis Villeneuve', img: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg' },
    { title: 'In the Mood for Love', year: 2000, director: 'Wong Kar-wai', img: 'https://image.tmdb.org/t/p/w780/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg' },
    { title: 'Pulp Fiction', year: 1994, director: 'Quentin Tarantino', img: 'https://image.tmdb.org/t/p/w780/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg' },
    { title: 'The Dark Knight', year: 2008, director: 'Christopher Nolan', img: 'https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
    { title: 'Interstellar', year: 2014, director: 'Christopher Nolan', img: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
    { title: 'The Godfather', year: 1972, director: 'Francis Ford Coppola', img: 'https://image.tmdb.org/t/p/w780/3bhkrj58Vtu7enYsRolD1fZdja1.jpg' },
    { title: 'Fight Club', year: 1999, director: 'David Fincher', img: 'https://image.tmdb.org/t/p/w780/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg' },
    { title: 'Goodfellas', year: 1990, director: 'Martin Scorsese', img: 'https://image.tmdb.org/t/p/w780/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg' },
    { title: 'Spirited Away', year: 2001, director: 'Hayao Miyazaki', img: 'https://image.tmdb.org/t/p/w780/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg' },
    { title: 'Oppenheimer', year: 2023, director: 'Christopher Nolan', img: 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' }
  ],

  // Distractors are deliberately broader than the currently loaded poster pool,
  // so the director quiz still has four distinct answers when TMDB is unavailable.
  arcadeDirectorDistractors: [
    'Christopher Nolan', 'Denis Villeneuve', 'Bong Joon-ho', 'Wong Kar-wai',
    'Quentin Tarantino', 'Francis Ford Coppola', 'David Fincher', 'Martin Scorsese',
    'Hayao Miyazaki', 'Steven Spielberg', 'Alfred Hitchcock', 'Stanley Kubrick',
    'Akira Kurosawa', 'Greta Gerwig', 'Sofia Coppola', 'Jordan Peele',
    'Park Chan-wook', 'Yorgos Lanthimos', 'Paul Thomas Anderson', 'Wes Anderson',
    'Ridley Scott', 'James Cameron', 'Robert Zemeckis', 'Jim Jarmusch',
    'Céline Sciamma', 'Guillermo del Toro', 'Barry Jenkins', 'Chloé Zhao',
    'Luca Guadagnino', 'David Lynch', 'Spike Lee', 'Alfonso Cuarón',
    'Peter Jackson', 'Buster Keaton', 'Charlie Chaplin', 'John Carpenter',
    'Richard Linklater', 'Michael Mann', 'Jonathan Demme', 'Asghar Farhadi'
  ],

  arcadeMovieKey(movie) {
    return `${String(movie?.title || '').trim().toLocaleLowerCase()}|${String(movie?.year || '').trim()}`;
  },

  shuffleArcadeItems(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Keep the pool status in sync even when a cached pool is reused after the
  // Arcade HTML has been re-created. This was the source of the stuck "loading…" label.
  updateArcadePoolCount(pool) {
    const countEl = document.getElementById('arcadePoolCount');
    if (!countEl) return;
    const count = Array.isArray(pool) ? pool.length : 0;
    countEl.textContent = count > 0 ? String(count) : 'unavailable';
    countEl.setAttribute('aria-label', count > 0 ? `${count} films available` : 'Film pool unavailable');
  },

  // If a catalogue image expires, show a designed fallback rather than a broken/blank poster.
  handleArcadePosterError(img) {
    if (!img || img.dataset.arcadeFailed === 'true') return;
    img.dataset.arcadeFailed = 'true';
    img.style.display = 'none';
    img.setAttribute('aria-hidden', 'true');
    const fallback = img.parentElement?.querySelector('.fr-arcade-poster-fallback');
    if (fallback) {
      fallback.classList.remove('hidden');
      fallback.setAttribute('aria-hidden', 'false');
      fallback.setAttribute('role', 'img');
      fallback.setAttribute('aria-label', 'Film poster unavailable');
    }
  },

  arcadePosterFallbackMarkup() {
    return `<div class="fr-arcade-poster-fallback hidden" aria-hidden="true">
      <svg viewBox="0 0 80 100" width="58" height="72" focusable="false" aria-hidden="true">
        <defs><linearGradient id="frPosterFallbackMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb078"/><stop offset=".48" stop-color="#ff5522"/><stop offset="1" stop-color="#7c260d"/></linearGradient></defs>
        <rect x="10" y="7" width="60" height="86" rx="7" fill="#101318" stroke="url(#frPosterFallbackMetal)" stroke-width="2"/>
        <path d="M22 23h36M22 31h28M22 39h32" stroke="#ff9a65" stroke-width="2" stroke-linecap="round" opacity=".7"/>
        <path d="M24 70l12-15 9 10 7-8 7 13z" fill="url(#frPosterFallbackMetal)" opacity=".9"/>
        <circle cx="40" cy="48" r="5" fill="#ffd4b9" opacity=".8"/>
      </svg>
      <span>POSTER UNAVAILABLE</span>
    </div>`;
  },

  drawArcadeMovie(gameId, pool) {
    if (!pool || pool.length === 0) return null;
    if (!this.arcadeState.usedMovieKeys[gameId]) this.arcadeState.usedMovieKeys[gameId] = [];
    const used = this.arcadeState.usedMovieKeys[gameId];
    let available = pool.filter(movie => !used.includes(this.arcadeMovieKey(movie)));
    if (available.length === 0) {
      // A full cycle has completed; start a fresh shuffled cycle.
      used.length = 0;
      available = [...pool];
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    used.push(this.arcadeMovieKey(chosen));
    return chosen;
  },

  async getArcadeMoviesPool() {
    const keys = window.Api?.getKeys?.() || {};
    const tmdbKey = (keys.tmdb || '').trim();
    const hasSharedMovieProxy = Boolean(window.FrameRateAuth?.client);
    const cacheKey = tmdbKey ? 'personal-tmdb' : hasSharedMovieProxy ? 'shared-tmdb-proxy' : 'local-only';
    const state = this.arcadeState;

    if (state.moviePoolCache && state.moviePoolCacheKey === cacheKey) {
      this.updateArcadePoolCount(state.moviePoolCache);
      return state.moviePoolCache;
    }
    if (state.moviePoolPromise && state.moviePoolPromiseKey === cacheKey) {
      // The request may have started before switchArcadeGame rebuilt the HTML.
      return state.moviePoolPromise.then(pool => {
        this.updateArcadePoolCount(pool);
        return pool;
      });
    }

    state.moviePoolPromiseKey = cacheKey;
    state.moviePoolPromise = (async () => {
      const candidates = [...this.arcadeMoviesPool];
      const addMovie = movie => {
        if (!movie || !movie.title || !movie.year) return;
        const key = this.arcadeMovieKey(movie);
        if (!candidates.some(existing => this.arcadeMovieKey(existing) === key)) candidates.push(movie);
      };

      // Add the curated film catalog already shipped with the app.
      const curated = window.Api?.curatedCatalog || {};
      Object.entries(curated).forEach(([slug, movie]) => addMovie({
        title: movie.title,
        year: Number(movie.year),
        director: movie.director || '',
        img: movie.poster || movie.posterUrl || movie.poster_path || movie.image || '',
        id: `curated-${slug}`,
        tmdbId: movie.id || null
      }));

      // Add the film currently selected in the main workspace, if any.
      const activeFilm = this.state?.film;
      if (activeFilm?.title && activeFilm?.year) addMovie({
        title: activeFilm.title,
        year: Number(activeFilm.year),
        director: activeFilm.director || '',
        img: activeFilm.poster || activeFilm.posterUrl || activeFilm.poster_path || activeFilm.image || '',
        id: `active-${activeFilm.id || activeFilm.title}`,
        tmdbId: activeFilm.id || null
      });

      // Use the shared server proxy when available, otherwise a legacy local TMDB key.
      // Requests fail independently so one unavailable page won't break the mini-games.
      if (tmdbKey || hasSharedMovieProxy) {
        const pages = [1, 2, 3, 4];
        const pageResults = await Promise.all(pages.map(async page => {
          try {
            const movies = window.Api?.getPopularTmdbMovies
              ? await window.Api.getPopularTmdbMovies(page)
              : [];
            return (movies || []).map(movie => {
              const year = Number((movie.release_date || '').slice(0, 4));
              if (!movie.title || !movie.poster_path || !Number.isFinite(year) || year < 1888) return null;
              return {
                title: movie.title,
                year,
                director: '',
                img: `https://image.tmdb.org/t/p/w780${movie.poster_path}`,
                id: `tmdb-${movie.id}`,
                tmdbId: movie.id
              };
            }).filter(Boolean);
          } catch (_) {
            return [];
          }
        }));
        pageResults.flat().forEach(addMovie);
      }

      const pool = candidates.filter(movie => movie.title && Number.isFinite(Number(movie.year)) && movie.img);
      state.moviePoolCache = pool.length ? pool : [...this.arcadeMoviesPool];
      state.moviePoolCacheKey = cacheKey;
      this.updateArcadePoolCount(state.moviePoolCache);
      return state.moviePoolCache;
    })().catch(() => {
      const fallback = [...this.arcadeMoviesPool];
      state.moviePoolCache = fallback.filter(movie => movie.title && movie.year && movie.img);
      state.moviePoolCacheKey = cacheKey;
      this.updateArcadePoolCount(state.moviePoolCache);
      return state.moviePoolCache;
    });

    return state.moviePoolPromise;
  },

  async getArcadeMovieDirector(movie) {
    const current = String(movie?.director || '').trim();
    if (current && !['director', 'tmdb catalog', 'featured director', 'cinema'].includes(current.toLowerCase())) {
      return current;
    }
    const tmdbKey = (window.Api?.getKeys?.().tmdb || '').trim();
    const hasSharedMovieProxy = Boolean(window.FrameRateAuth?.client);
    if ((!tmdbKey && !hasSharedMovieProxy) || !movie?.tmdbId) return '';
    try {
      const data = await window.Api?.getTmdbMovieDetails?.(movie.tmdbId);
      const director = (data?.credits?.crew || []).find(person => person.job === 'Director')?.name || '';
      if (director) movie.director = director;
      return director;
    } catch (_) {
      return '';
    }
  },

  initCineCardInteractiveSuite() {
    const card = document.getElementById('cineCardElement');
    if (!card) return;

    // 1. Fix Poster visibility on Step 4
    const posterImg = document.getElementById('cardPosterImg');
    if (posterImg) {
      posterImg.removeAttribute('crossorigin');
      if (this.state.film && this.state.film.poster) {
        posterImg.src = this.state.film.poster;
      }
    }

    const origSync = this.syncCineCard.bind(this);
    this.syncCineCard = () => {
      const pEl = document.getElementById('cardPosterImg');
      if (pEl) pEl.removeAttribute('crossorigin');
      origSync();
      this.updateCardMetaInfo();
    };

    card.classList.remove('sm:flex-row');
    card.classList.add('flex-col');

    // Override Api.shareImageToPlatform so it NEVER opens the annoying Windows system share popup!
    if (window.Api) {
      window.Api.shareImageToPlatform = async platform => {
        await this.shareCineCard(null, platform);
      };
    }

    // Upgrade the toolbar buttons above the card to include the new Cinema Arcade
    const foilBtn = document.getElementById('btnToggleFoil');
    if (foilBtn) {
      foilBtn.onclick = () => this.toggleCardFoil();
      foilBtn.setAttribute('aria-pressed', card.classList.contains('foil-mode') ? 'true' : 'false');
    }

    const arcadeBtn = document.getElementById('btnCinemaArcade');
    if (arcadeBtn) arcadeBtn.onclick = () => this.toggleCinemaArcade();

    // Inject Cinema Arcade Stage right above the 3D card stage
    const stage3d = card.parentElement;
    if (stage3d && !document.getElementById('cinemaArcadeBox')) {
      const arcade = document.createElement('div');
      arcade.id = 'cinemaArcadeBox';
      arcade.className = 'hidden theme-subcard rounded-3xl p-5 border-2 border-frOrange/40 space-y-4 animate-fadeIn';
      stage3d.parentElement.insertBefore(arcade, stage3d);
    }

    // 3D Tilt on Card
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -5;
      const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 5;
      const percentX = Math.round((x / rect.width) * 100);
      const percentY = Math.round((y / rect.height) * 100);

      card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      card.style.setProperty('--glare-x', `${percentX}%`);
      card.style.setProperty('--glare-y', `${percentY}%`);
      card.style.setProperty('--foil-pos', `${percentX}% ${percentY}%`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    });

    this.updateCardMetaInfo();
  },

  toggleCardFoil() {
    const card = document.getElementById('cineCardElement');
    const button = document.getElementById('btnToggleFoil');
    if (!card || !button) return;
    const enabled = card.classList.toggle('foil-mode');
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    const label = button.querySelector('span:last-child');
    if (label) label.textContent = enabled ? 'Holo Effect: On' : 'Holo Effect: Off';
    this.showToast(enabled ? 'Holographic effect enabled' : 'Holographic effect disabled');
  },

  resetArcadeScore() {
    this.arcadeState.score = 0;
    this.arcadeState.streak = 0;
    const score = document.getElementById('arcadeScoreVal');
    const streak = document.getElementById('arcadeStreakVal');
    if (score) score.textContent = '0';
    if (streak) streak.textContent = '0';
    this.showToast('Mini-game score reset');
  },

  /* ================= CINEMA MINI-GAMES ================= */
  toggleCinemaArcade() {
    const box = document.getElementById('cinemaArcadeBox');
    if (!box) return;
    const isHidden = box.classList.toggle('hidden');
    const launcher = document.getElementById('btnCinemaArcade');
    if (launcher) launcher.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
    if (!isHidden) {
      this.switchArcadeGame(this.arcadeState.activeGame || 'guessr');
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  },

  switchArcadeGame(gameId) {
    this.arcadeState.activeGame = gameId;
    const box = document.getElementById('cinemaArcadeBox');
    if (!box) return;

    box.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 border-b theme-border pb-3">
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="App.switchArcadeGame('guessr')" aria-label="Play Guess the Film" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${gameId === 'guessr' ? 'bg-frOrange text-white' : 'theme-input'}">
            🎞️ Guess the Film
          </button>
          <button type="button" onclick="App.switchArcadeGame('director')" aria-label="Play Guess the Director" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${gameId === 'director' ? 'bg-frOrange text-white' : 'theme-input'}">
            🎬 Guess the Director
          </button>
          <button type="button" onclick="App.switchArcadeGame('year')" aria-label="Play Guess the Release Year" class="px-3 py-1.5 rounded-xl text-xs font-extrabold transition ${gameId === 'year' ? 'bg-frOrange text-white' : 'theme-input'}">
            📅 Guess the Year
          </button>
        </div>

        <div class="flex items-center gap-3">
          <span class="px-3 py-1 rounded-full bg-lbGreen/15 border border-lbGreen/40 text-lbGreen font-mono text-xs font-black">
            🏆 Score: <span id="arcadeScoreVal">${this.arcadeState.score}</span>
          </span>
          <span class="px-3 py-1 rounded-full bg-frAmber/15 border border-frAmber/40 text-frAmber font-mono text-xs font-black">
            🔥 Streak: <span id="arcadeStreakVal">${this.arcadeState.streak}</span>
          </span>
          <button type="button" onclick="App.resetArcadeScore()" class="theme-input rounded-lg px-2 py-1 text-[10px] font-bold">Reset score</button>
          <button type="button" onclick="App.toggleCinemaArcade()" class="theme-text-muted hover:text-rose-400 text-xs font-bold px-2">Close ✕</button>
        </div>
      </div>
      <p class="text-xs theme-text-muted">Choose a game above. Correct answers add points and build your streak. Pool: <strong id="arcadePoolCount">loading…</strong> films. A correct film will not repeat in the same game until the available pool has been used up.</p>
      <div id="arcadeGameStage" class="pt-1"></div>
    `;

    if (gameId === 'guessr') this.startGuessrRound();
    else if (gameId === 'director') this.startDirectorQuiz();
    else if (gameId === 'year') this.startYearQuiz();
    else this.startGuessrRound();
  },

  // GAME 1: BLURRY FRAME GUESSR
  async startGuessrRound() {
    const stage = document.getElementById('arcadeGameStage');
    if (!stage) return;
    stage.innerHTML = '<p class="text-xs theme-text-muted py-6 text-center">Loading a fresh film question…</p>';

    const pool = await this.getArcadeMoviesPool();
    if (!pool.length) {
      stage.textContent = 'No film questions are available right now. Please try again.';
      return;
    }

    const correct = this.drawArcadeMovie('guessr', pool);
    const correctKey = this.arcadeMovieKey(correct);
    const wrongChoices = this.shuffleArcadeItems(pool
      .filter(movie => this.arcadeMovieKey(movie) !== correctKey))
      .slice(0, 3);
    if (wrongChoices.length < 3) {
      stage.textContent = 'Not enough different films to build a question.';
      return;
    }
    const options = this.shuffleArcadeItems([correct, ...wrongChoices]);
    const safeTitle = value => this.escapeHtml(String(value ?? ''));
    const safeImg = value => this.escapeHtml(String(value ?? ''));

    this.arcadeState.guessrRound = {
      correct,
      blur: 7,
      pointsAvailable: 400,
      step: 0,
      finished: false,
      options
    };

    stage.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        <div class="md:col-span-5 flex flex-col items-center">
          <div id="guessrMysteryFrame" class="fr-mystery-poster w-40 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-white/20 bg-black relative shadow-xl">
            <img id="guessrMysteryImg" src="${safeImg(correct.img)}" alt="Mystery film poster, partially obscured until you answer" class="w-full h-full object-cover transition-all duration-500" style="filter: blur(7px) brightness(.88) saturate(.92); transform: scale(1.07);" loading="eager" draggable="false" onerror="App.handleArcadePosterError(this)">
            ${this.arcadePosterFallbackMarkup()}
            <div class="fr-mystery-veil" aria-hidden="true"><span class="fr-mystery-mark">?</span><span class="fr-mystery-label">MYSTERY POSTER</span></div>
          </div>
        </div>

        <div class="md:col-span-7 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-extrabold uppercase font-mono text-frOrange">Guess the Film (+<span id="guessrPtsLabel">400</span> points)</span>
            <button type="button" id="btnGuessrHint" onclick="App.revealGuessrHint()" class="px-3 py-1 rounded-lg bg-frBlueLight/15 border border-frBlueLight/40 text-frBlueLight text-[11px] font-bold hover:opacity-90 transition">
              💡 Show a clue (−100 points)
            </button>
          </div>

          <p id="guessrClueText" class="text-xs font-mono theme-text-secondary bg-black/25 px-3 py-2 rounded-xl">
            Guess the film from the obscured poster. Clues reveal the year and director, but cost points.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="guessrChoicesBox">
            ${options.map((option, i) => `
              <button type="button" onclick="App.submitGuessrAnswer(${i})" class="p-3 rounded-xl theme-input hover:border-frOrange text-left text-xs font-bold transition flex items-center justify-between gap-2">
                <span>${safeTitle(option.title)}</span>
                <span class="text-[10px] font-mono theme-text-muted">Select</span>
              </button>
            `).join('')}
          </div>

          <div id="guessrNextBox" class="hidden pt-2 flex justify-end">
            <button type="button" onclick="App.startGuessrRound()" class="px-5 py-2 rounded-xl bg-lbGreen text-black font-black text-xs">
              Next Film &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  },

    async revealGuessrHint() {
    const r = this.arcadeState.guessrRound;
    if (!r || r.finished) return;

    const hintButton = document.getElementById('btnGuessrHint');
    const img = document.getElementById('guessrMysteryImg');
    const ptsEl = document.getElementById('guessrPtsLabel');
    const clueEl = document.getElementById('guessrClueText');

    if (r.step === 0) {
      r.step = 1;
      r.blur = Math.max(3, r.blur - 2);
      r.pointsAvailable = Math.max(200, r.pointsAvailable - 100);
      if (img) { img.style.filter = `blur(${r.blur}px) brightness(.9) saturate(.96)`; img.style.transform = 'scale(1.06)'; }
      if (ptsEl) ptsEl.textContent = r.pointsAvailable;
      if (clueEl) clueEl.textContent = `Clue: Released in ${r.correct.year}.`;
      if (hintButton) hintButton.textContent = '🎬 Reveal director (−100 points)';
      this.playCinemaSoundFX('clapper');
      return;
    }

    if (r.step !== 1 || !hintButton) return;
    // Director metadata is often missing from the popular-movie list, so resolve it
    // from TMDB before charging points or consuming the second clue.
    hintButton.disabled = true;
    const previousButtonText = hintButton.textContent;
    hintButton.textContent = 'Finding director clue…';
    const director = await this.getArcadeMovieDirector(r.correct);
    if (r.finished) return;
    if (!director) {
      if (clueEl) clueEl.textContent = 'Director clue is unavailable for this film. No points were deducted; try again or answer now.';
      hintButton.disabled = false;
      hintButton.textContent = previousButtonText;
      return;
    }

    r.step = 2;
    r.blur = Math.max(3, r.blur - 2);
    r.pointsAvailable = Math.max(200, r.pointsAvailable - 100);
    if (img) { img.style.filter = `blur(${r.blur}px) brightness(.9) saturate(.96)`; img.style.transform = 'scale(1.06)'; }
    if (ptsEl) ptsEl.textContent = r.pointsAvailable;
    if (clueEl) clueEl.textContent = `Clue: Directed by ${director}.`;
    hintButton.classList.add('hidden');
    hintButton.disabled = false;
    hintButton.textContent = previousButtonText;
    this.playCinemaSoundFX('clapper');
  },

  submitGuessrAnswer(idx) {
    const r = this.arcadeState.guessrRound;
    if (!r || r.finished) return;
    const chosen = r.options[idx];
    if (!chosen) return;
    r.finished = true;
    const isWin = this.arcadeMovieKey(chosen) === this.arcadeMovieKey(r.correct);

    const img = document.getElementById('guessrMysteryImg');
    if (img) { img.style.filter = 'blur(0px) brightness(1) saturate(1)'; img.style.transform = 'scale(1)'; }
    document.getElementById('guessrMysteryFrame')?.classList.add('is-revealed');
    document.getElementById('btnGuessrHint')?.classList.add('hidden');
    document.querySelectorAll('#guessrChoicesBox button').forEach((button, i) => {
      button.disabled = true;
      if (this.arcadeMovieKey(r.options[i]) === this.arcadeMovieKey(r.correct)) button.classList.add('border-lbGreen', 'text-lbGreen');
      else if (i === idx) button.classList.add('border-rose-500', 'text-rose-400');
    });

    const clueEl = document.getElementById('guessrClueText');
    if (isWin) {
      this.arcadeState.score += r.pointsAvailable;
      this.arcadeState.streak += 1;
      this.triggerCinemaBurst(img);
      if (clueEl) {
        clueEl.className = 'text-xs font-mono text-lbGreen bg-lbGreen/15 border border-lbGreen/40 px-3 py-2 rounded-xl font-bold';
        clueEl.textContent = `✓ CORRECT! It's ${r.correct.title} (${r.correct.year}) — You earned +${r.pointsAvailable} pts!`;
      }
    } else {
      this.arcadeState.streak = 0;
      this.playCinemaSoundFX('tear');
      if (clueEl) {
        clueEl.className = 'text-xs font-mono text-rose-400 bg-rose-500/15 border border-rose-500/40 px-3 py-2 rounded-xl font-bold';
        clueEl.textContent = `✕ Wrong! The film was ${r.correct.title} (${r.correct.year}) by ${r.correct.director}.`;
      }
    }

    const score = document.getElementById('arcadeScoreVal');
    const streak = document.getElementById('arcadeStreakVal');
    if (score) score.textContent = this.arcadeState.score;
    if (streak) streak.textContent = this.arcadeState.streak;
    document.getElementById('guessrNextBox')?.classList.remove('hidden');
  },

  // GAME 2: GUESS THE DIRECTOR
  async startDirectorQuiz() {
    const stage = document.getElementById('arcadeGameStage');
    if (!stage) return;
    stage.innerHTML = '<p class="text-xs theme-text-muted py-6 text-center">Finding a film and its director…</p>';

    const pool = await this.getArcadeMoviesPool();
    if (!pool.length) {
      stage.textContent = 'No film questions are available right now. Please try again.';
      return;
    }

    // First try the broad pool, using TMDB credits for dynamic titles when needed.
    let correct = this.drawArcadeMovie('director', pool);
    let director = await this.getArcadeMovieDirector(correct);
    if (!director) {
      // If a live title has no usable credits, fall back to a title with known local metadata.
      const knownDirectorPool = pool.filter(movie => {
        const d = String(movie.director || '').trim().toLowerCase();
        return d && !['director', 'tmdb catalog', 'featured director', 'cinema'].includes(d);
      });
      correct = this.drawArcadeMovie('director', knownDirectorPool);
      director = correct ? await this.getArcadeMovieDirector(correct) : '';
    }
    if (!correct || !director) {
      stage.textContent = 'Director details are unavailable. Check your TMDB key or try another game.';
      return;
    }
    correct.director = director;

    const allDirectorNames = [
      ...pool.map(movie => movie.director || ''),
      ...this.arcadeDirectorDistractors
    ].map(name => String(name).trim()).filter(Boolean);
    const uniqueDistractors = [...new Set(allDirectorNames)].filter(name => name !== director);
    const wrongDirectors = this.shuffleArcadeItems(uniqueDistractors).slice(0, 3);
    if (wrongDirectors.length < 3) {
      stage.textContent = 'Not enough different director choices are available.';
      return;
    }
    const options = this.shuffleArcadeItems([...wrongDirectors, director]);
    const safe = value => this.escapeHtml(String(value ?? ''));

    this.arcadeState.directorRound = { correct, options, finished: false };
    stage.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-center py-1">
        <div class="md:col-span-4 flex justify-center">
          <div class="fr-arcade-poster-shell w-36 sm:w-40 aspect-[2/3] rounded-2xl border border-white/15 shadow-xl bg-black">
            <img src="${safe(correct.img)}" alt="Poster for ${safe(correct.title)}" loading="eager" class="w-full h-full object-cover" onerror="App.handleArcadePosterError(this)">
            ${this.arcadePosterFallbackMarkup()}
          </div>
        </div>
        <div class="md:col-span-8 space-y-3">
          <div>
            <h4 class="text-sm font-black theme-text-primary">Who directed this film?</h4>
            <p class="text-xs theme-text-muted mt-1">${safe(correct.title)} (${safe(correct.year)})</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2" id="directorChoicesBox">
            ${options.map((name, i) => `
              <button type="button" onclick="App.submitDirectorAnswer(${i})" class="p-3 rounded-xl theme-input hover:border-frOrange text-left text-xs font-bold transition">${safe(name)}</button>
            `).join('')}
          </div>
          <p id="directorStatusMsg" class="text-xs font-mono font-bold" aria-live="polite">Choose the correct director from the four options.</p>
          <div id="directorNextBox" class="hidden pt-1 flex justify-end">
            <button type="button" onclick="App.startDirectorQuiz()" class="px-5 py-2 rounded-xl bg-lbGreen text-black font-black text-xs">Next Question →</button>
          </div>
        </div>
      </div>
    `;
  },

    submitDirectorAnswer(index) {
    const round = this.arcadeState.directorRound;
    if (!round || round.finished) return;
    round.finished = true;
    const chosen = round.options[index];
    if (typeof chosen !== 'string') return;
    const correct = chosen === round.correct.director;
    const msg = document.getElementById('directorStatusMsg');
    const buttons = document.querySelectorAll('#directorChoicesBox button');
    buttons.forEach((button, i) => {
      button.disabled = true;
      if (round.options[i] === round.correct.director) button.classList.add('border-lbGreen', 'text-lbGreen');
      else if (i === index) button.classList.add('border-rose-500', 'text-rose-400');
    });

    if (correct) {
      this.arcadeState.score += 250;
      this.arcadeState.streak += 1;
      this.triggerCinemaBurst(document.getElementById('directorChoicesBox'));
      if (msg) {
        msg.className = 'text-xs font-mono font-black text-lbGreen';
        msg.textContent = `Correct! ${round.correct.title} was directed by ${round.correct.director}. +250 points.`;
      }
    } else {
      this.arcadeState.streak = 0;
      this.playCinemaSoundFX('tear');
      if (msg) {
        msg.className = 'text-xs font-mono font-black text-rose-400';
        msg.textContent = `Not quite. The director was ${round.correct.director}.`;
      }
    }

    const next = document.getElementById('directorNextBox');
    if (next) next.classList.remove('hidden');
    const score = document.getElementById('arcadeScoreVal');
    const streak = document.getElementById('arcadeStreakVal');
    if (score) score.textContent = this.arcadeState.score;
    if (streak) streak.textContent = this.arcadeState.streak;
  },

  // GAME 3: GUESS THE RELEASE YEAR
  async startYearQuiz() {
    const stage = document.getElementById('arcadeGameStage');
    if (!stage) return;
    stage.innerHTML = '<p class="text-xs theme-text-muted py-6 text-center">Loading a fresh release-year question…</p>';

    const pool = await this.getArcadeMoviesPool();
    if (!pool.length) {
      stage.textContent = 'No film questions are available right now. Please try again.';
      return;
    }

    const correct = this.drawArcadeMovie('year', pool);
    const otherYears = [...new Set(pool
      .map(movie => Number(movie.year))
      .filter(year => Number.isFinite(year) && year !== Number(correct.year)))];
    const options = this.shuffleArcadeItems(otherYears).slice(0, 3);
    options.push(Number(correct.year));
    const shuffledOptions = this.shuffleArcadeItems(options);
    if (shuffledOptions.length < 4) {
      stage.textContent = 'Not enough different release years are available.';
      return;
    }
    const safe = value => this.escapeHtml(String(value ?? ''));

    this.arcadeState.yearRound = { correct, options: shuffledOptions, finished: false };
    stage.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-center py-1">
        <div class="md:col-span-4 flex justify-center">
          <div class="fr-arcade-poster-shell w-36 sm:w-40 aspect-[2/3] rounded-2xl border border-white/15 shadow-xl bg-black">
            <img src="${safe(correct.img)}" alt="Poster for ${safe(correct.title)}" loading="eager" class="w-full h-full object-cover" onerror="App.handleArcadePosterError(this)">
            ${this.arcadePosterFallbackMarkup()}
          </div>
        </div>
        <div class="md:col-span-8 space-y-3">
          <div>
            <h4 class="text-sm font-black theme-text-primary">What year was this film released?</h4>
            <p class="text-xs theme-text-muted mt-1">${safe(correct.title)} · Directed by ${safe(correct.director || 'director unknown')}</p>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="yearChoicesBox">
            ${shuffledOptions.map((year, i) => `
              <button type="button" onclick="App.submitYearAnswer(${i})" class="p-3 rounded-xl theme-input hover:border-frOrange text-center text-sm font-black font-mono transition">${safe(year)}</button>
            `).join('')}
          </div>
          <p id="yearStatusMsg" class="text-xs font-mono font-bold" aria-live="polite">Choose one of the four years.</p>
          <div id="yearNextBox" class="hidden pt-1 flex justify-end">
            <button type="button" onclick="App.startYearQuiz()" class="px-5 py-2 rounded-xl bg-lbGreen text-black font-black text-xs">Next Question →</button>
          </div>
        </div>
      </div>
    `;
  },

    submitYearAnswer(index) {
    const round = this.arcadeState.yearRound;
    if (!round || round.finished) return;
    round.finished = true;
    const chosen = round.options[index];
    if (chosen == null) return;
    const correct = Number(chosen) === Number(round.correct.year);
    const msg = document.getElementById('yearStatusMsg');
    const buttons = document.querySelectorAll('#yearChoicesBox button');
    buttons.forEach((button, i) => {
      button.disabled = true;
      if (Number(round.options[i]) === Number(round.correct.year)) button.classList.add('border-lbGreen', 'text-lbGreen');
      else if (i === index) button.classList.add('border-rose-500', 'text-rose-400');
    });

    if (correct) {
      this.arcadeState.score += 250;
      this.arcadeState.streak += 1;
      this.triggerCinemaBurst(document.getElementById('yearChoicesBox'));
      if (msg) {
        msg.className = 'text-xs font-mono font-black text-lbGreen';
        msg.textContent = `Correct! ${round.correct.title} was released in ${round.correct.year}. +250 points.`;
      }
    } else {
      this.arcadeState.streak = 0;
      this.playCinemaSoundFX('tear');
      if (msg) {
        msg.className = 'text-xs font-mono font-black text-rose-400';
        msg.textContent = `The correct release year is ${round.correct.year}.`;
      }
    }

    const next = document.getElementById('yearNextBox');
    if (next) next.classList.remove('hidden');
    const score = document.getElementById('arcadeScoreVal');
    const streak = document.getElementById('arcadeStreakVal');
    if (score) score.textContent = this.arcadeState.score;
    if (streak) streak.textContent = this.arcadeState.streak;
  },

  /* ================= CARD METADATA, SOUND EFFECTS & CONFETTI ================= */
  updateCardMetaInfo() {
    const dateEl = document.getElementById('cardMetaDate');
    const formatEl = document.getElementById('cardMetaFormat');
    if (dateEl) dateEl.textContent = this.state.watchedDate ? `Reviewed ${this.state.watchedDate}` : 'Review date not set';
    if (formatEl) formatEl.textContent = this.state.format || 'Format not set';
  },

  playCinemaSoundFX(type = 'clapper') {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'tear') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.16);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.17);
        osc.start();
        osc.stop(ctx.currentTime + 0.17);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.24);
        osc.start();
        osc.stop(ctx.currentTime + 0.24);
      }
    } catch (e) {}
  },

  triggerCinemaBurst(originEl) {
    this.playCinemaSoundFX('clapper');
    const icons = ['🍿', '⭐', '🎬', '🎞️', '✨', '🏆'];
    const rect = originEl
      ? originEl.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };

    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;

    const flash = document.createElement('div');
    flash.className = 'cinema-flash-overlay';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 550);

    for (let i = 0; i < 22; i++) {
      const p = document.createElement('span');
      p.className = 'cinema-particle';
      p.textContent = icons[Math.floor(Math.random() * icons.length)];

      const angle = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.5;
      const velocity = 80 + Math.random() * 140;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity - 60;
      const rot = (Math.random() - 0.5) * 540;
      const sc = 0.8 + Math.random() * 0.7;
      const dur = 0.75 + Math.random() * 0.55;

      p.style.left = `${startX}px`;
      p.style.top = `${startY}px`;
      p.style.setProperty('--tx', `${tx.toFixed(0)}px`);
      p.style.setProperty('--ty', `${ty.toFixed(0)}px`);
      p.style.setProperty('--rot', `${rot.toFixed(0)}deg`);
      p.style.setProperty('--sc', sc.toFixed(2));
      p.style.setProperty('--dur', `${dur.toFixed(2)}s`);

      document.body.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000 + 100);
    }
  },

  /* ================= CORS-SAFE HD CANVAS IMAGE RENDERER (POSTER, BACKDROP & WATERMARK) ================= */
  loadCorsImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve(null);
      const proxyUrl = url.startsWith('data:')
        ? url
        : `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1400&output=jpg`;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const directImg = new Image();
        directImg.crossOrigin = 'anonymous';
        directImg.onload = () => resolve(directImg);
        directImg.onerror = () => resolve(null);
        directImg.src = url;
      };
      img.src = proxyUrl;
    });
  },

  drawRoundBox(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  async renderHighResCardCanvas() {
    const f = this.state.film || {
      title: document.getElementById('cardFilmTitle')?.textContent || 'Tenet',
      year: document.getElementById('cardFilmYear')?.textContent || '2020',
      director: 'Christopher Nolan',
      poster: document.getElementById('cardPosterImg')?.src || '',
      backdrop: this.state.activeBackdropUrl || ''
    };

    const width = 1280;
    const height = 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, width, height);

    const bgUrl = this.state.activeBackdropUrl || f.backdrop || f.poster;
    const bgImg = await this.loadCorsImage(bgUrl);
    if (bgImg) {
      const scale = Math.max(width / bgImg.width, height / bgImg.height);
      const bw = bgImg.width * scale;
      const bh = bgImg.height * scale;
      ctx.save();
      ctx.globalAlpha = 0.58;
      ctx.drawImage(bgImg, (width - bw) / 2, (height - bh) / 2, bw, bh);
      ctx.restore();
    }

    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, 'rgba(7, 9, 14, 0.92)');
    grad.addColorStop(0.5, 'rgba(10, 14, 22, 0.78)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0.94)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 3;
    this.drawRoundBox(ctx, 24, 24, width - 48, height - 48, 32);
    ctx.stroke();

    const posterImg = await this.loadCorsImage(f.poster);
    const pW = 270;
    const pH = 405;
    const pX = 76;
    const pY = 86;

    if (posterImg) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;
      this.drawRoundBox(ctx, pX, pY, pW, pH, 22);
      ctx.clip();
      ctx.drawImage(posterImg, pX, pY, pW, pH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 3;
      this.drawRoundBox(ctx, pX, pY, pW, pH, 22);
      ctx.stroke();
    }

    const textX = pX + pW + 56;
    const maxW = width - textX - 80;
    let curY = pY + 55;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${f.title} (${f.year || ''})`, textX, curY, maxW);

    curY += 38;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(`DIRECTED BY ${(f.director || 'DIRECTOR').toUpperCase()} • ${this.state.format.toUpperCase()}`, textX, curY, maxW);

    curY += 54;
    const starsStr = this.formatStarAscii(this.state.rating);
    const numStr = this.state.rating ? ` ${this.state.rating.toFixed(1)}/5` : '';
    ctx.fillStyle = '#00e054';
    ctx.font = '900 38px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${starsStr}${numStr}`, textX, curY);

    if (this.state.liked) {
      const starsW = ctx.measureText(`${starsStr}${numStr}`).width;
      ctx.fillStyle = '#ff8000';
      ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('  ♥ Liked', textX + starsW + 12, curY - 3);
    }

    curY += 54;
    const rawQuote = (document.getElementById('cardQuotePreview')?.textContent || '').trim();
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'italic 500 26px "Plus Jakarta Sans", sans-serif';

    const words = rawQuote.split(/\s+/);
    let line = '';
    let linesCount = 0;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      if (ctx.measureText(testLine).width > maxW && i > 0) {
        ctx.fillText(line.trim(), textX, curY);
        line = words[i] + ' ';
        curY += 38;
        linesCount++;
        if (linesCount >= 4) {
          line += '...';
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), textX, curY);

    const metaY = height - 104;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, metaY);
    ctx.lineTo(width - 48, metaY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 17px "JetBrains Mono", monospace';
    const reviewMeta = `REVIEWED ${this.state.watchedDate || '—'}  •  ${(this.state.format || 'FORMAT').toUpperCase()}`;
    ctx.fillText(reviewMeta, 76, metaY + 42, 650);

    const wmW = 300;
    const wmH = 50;
    const wmX = width - wmW - 68;
    const wmY = metaY + 16;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 15, 22, 0.9)';
    this.drawRoundBox(ctx, wmX, wmY, wmW, wmH, 25);
    ctx.fill();
    ctx.strokeStyle = '#ff5522';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(wmX + 28, wmY + wmH / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5522';
    ctx.fill();

    ctx.font = '900 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Frame', wmX + 44, wmY + 32);
    const fw = ctx.measureText('Frame').width;
    ctx.fillStyle = '#ff5522';
    ctx.fillText('Rate', wmX + 44 + fw, wmY + 32);
    const rw = ctx.measureText('Rate').width;
    ctx.font = '700 14px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(' • STUDIO', wmX + 46 + fw + rw, wmY + 31);
    ctx.restore();

    return canvas;
  },

  async downloadCineCardPng(btnEl) {
    this.triggerCinemaBurst(btnEl);
    this.showToast('📸 Rendering HD Card with Poster, Backdrop & Watermark...');

    try {
      const canvas = await this.renderHighResCardCanvas();
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 1.0));
      const slug = (this.state.film?.title || 'framerate-card').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const fileName = `${slug}-verdict.png`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      this.showToast(`✅ Downloaded HD Card: ${fileName}`);
    } catch (err) {
      console.error('Export error:', err);
      this.showToast('Error exporting card image');
    }
  },

  // Copies the PNG Image directly to Clipboard (NO annoying Windows Share popup!)
  async shareCineCard(btnEl, platform = null) {
    this.triggerCinemaBurst(btnEl);
    this.updateCardMetaInfo();
    this.showToast('🖼️ Copying HD Card Image to Clipboard...');

    try {
      const canvas = await this.renderHighResCardCanvas();
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 1.0));

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        this.showToast('✅ Card IMAGE Copied! Go to WhatsApp or X and press Ctrl+V to paste the photo!');
        if (platform === 'x') {
          const text = window.Api ? window.Api.buildSocialShareText() : '';
          setTimeout(() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank'), 450);
        }
        return;
      }

      await this.downloadCineCardPng(btnEl);
    } catch (err) {
      await this.downloadCineCardPng(btnEl);
    }
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());