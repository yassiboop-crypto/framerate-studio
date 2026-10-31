/**
 * FrameRate Studio — Fast Multi-Agent AI Engine + HD Canvas Image Exporter with Watermark
 * Includes:
 * - Gemini BLOCK_NONE Safety Fix + Strict Provider Isolation (never calls expired OpenAI key when Gemini/Groq is selected)
 * - HD Canvas Cine-Card Image Generator (1200x675) with FrameRate Logo & Watermark in bottom-right corner
 * - 1-Click "Copy Card as Image" (Ctrl+V directly into WhatsApp/X/Discord) + "Download PNG Image"
 */

const Api = {
  modelPresets: {
    gemini: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Recommended)' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (Fast & Efficient)' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
      { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Legacy availability may vary)' },
      { id: 'auto-discover', label: '✨ Auto-Detect Available Gemini Model' }
    ],
    groq: [
      { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B (Recommended)' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (Groq)' },
      { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (Groq)' }
    ],
    openai: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Smart)' },
      { id: 'gpt-4o', label: 'GPT-4o (Flagship)' }
    ],
    openrouter: [
      { id: 'google/gemini-2.5-flash:free', label: 'Gemini 2.5 Flash (Free)' },
      { id: 'deepseek/deepseek-chat:free', label: 'DeepSeek V3 Chat (Free)' },
      { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' }
    ],
    auto: [
      { id: 'auto-discover', label: '✨ Auto-Select Best Model for Active Key' }
    ],
    local: [
      { id: 'local-critic', label: 'Built-in Local Critic Engine (Instant)' }
    ]
  },

  curatedCatalog: {
    'blade-runner-2049': {
      id: 335984,
      imdb_id: 'tt1856101',
      title: 'Blade Runner 2049',
      year: '2017',
      runtime: 164,
      director: 'Denis Villeneuve',
      tagline: 'The key to the future is finally unearthed.',
      overview: 'Thirty years after the events of the first film, a new blade runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what is left of society into chaos.',
      genres: ['Science Fiction', 'Drama', 'Mystery'],
      cast: ['Ryan Gosling', 'Harrison Ford', 'Ana de Armas', 'Sylvia Hoeks', 'Robin Wright'],
      poster: 'https://image.tmdb.org/t/p/w780/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/ilRyazdMJwN05exqhwK4tMKBYZs.jpg',
      backdrops: [
        'https://image.tmdb.org/t/p/original/ilRyazdMJwN05exqhwK4tMKBYZs.jpg',
        'https://image.tmdb.org/t/p/original/sAtoMqDVhNDQBc3QJL3RF6hlhGq.jpg',
        'https://image.tmdb.org/t/p/original/mVr0UiqyltcfqxbAUcLl9zWL8ah.jpg',
        'https://image.tmdb.org/t/p/original/8QXGNP0Vb4nsYKub59XpAhiUSQN.jpg'
      ]
    },
    'parasite': {
      id: 496243,
      imdb_id: 'tt6751668',
      title: 'Parasite',
      year: '2019',
      runtime: 133,
      director: 'Bong Joon-ho',
      tagline: 'Act like you own the place.',
      overview: 'All unemployed, Ki-taek’s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.',
      genres: ['Comedy', 'Thriller', 'Drama'],
      cast: ['Song Kang-ho', 'Lee Sun-kyun', 'Cho Yeo-jeong', 'Choi Woo-shik', 'Park So-dam'],
      poster: 'https://image.tmdb.org/t/p/w780/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
      backdrops: [
        'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
        'https://image.tmdb.org/t/p/original/ApiBzeaa95TNYliSbQ8pJv4Fje7.jpg',
        'https://image.tmdb.org/t/p/original/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg'
      ]
    },
    'in-the-mood-for-love': {
      id: 843,
      imdb_id: 'tt0118694',
      title: 'In the Mood for Love',
      year: '2000',
      runtime: 98,
      director: 'Wong Kar-wai',
      tagline: 'Feel the heat, keep the feeling burning.',
      overview: 'Two neighbors in 1962 Hong Kong form a tight bond after both suspect their spouses of extramarital activities, yet agree to keep their bond platonic.',
      genres: ['Drama', 'Romance'],
      cast: ['Tony Leung Chiu-wai', 'Maggie Cheung', 'Rebecca Pan'],
      poster: 'https://image.tmdb.org/t/p/w780/iYypPT4bhqXfq1b6EnmxvRt6b2Y.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/n4GJFGzsc7NinI1VeGDXIcQjtU2.jpg',
      backdrops: ['https://image.tmdb.org/t/p/original/n4GJFGzsc7NinI1VeGDXIcQjtU2.jpg']
    },
    'la-haine': {
      id: 406,
      imdb_id: 'tt0113247',
      title: 'La Haine',
      year: '1995',
      runtime: 98,
      director: 'Mathieu Kassovitz',
      tagline: 'So far so good... so far so good.',
      overview: 'After a chaotic night of rioting in a marginal suburb of Paris, three young friends, Vinz, Hubert and Saïd, wander around waiting for news about a mutual friend.',
      genres: ['Drama', 'Crime'],
      cast: ['Vincent Cassel', 'Hubert Koundé', 'Saïd Taghmaoui'],
      poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      backdrops: [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80'
      ]
    },
    'dune-part-two': {
      id: 693134,
      imdb_id: 'tt15239678',
      title: 'Dune: Part Two',
      year: '2024',
      runtime: 167,
      director: 'Denis Villeneuve',
      tagline: 'Long live the fighters.',
      overview: 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
      genres: ['Science Fiction', 'Adventure'],
      cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem', 'Austin Butler'],
      poster: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
      backdrops: [
        'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
        'https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547VKqEv.jpg',
        'https://image.tmdb.org/t/p/original/lzWHmYdfeFiMIY4JaMmtR7GEli3.jpg'
      ]
    }
  },

  popularTitlesDictionary: [
    'Blade Runner 2049', 'Parasite', 'In the Mood for Love', 'La Haine', 'Dune: Part Two',
    'Tenet', 'Interstellar', 'The Godfather', 'The Dark Knight', 'Pulp Fiction', 'Goodfellas',
    'Taxi Driver', 'Fight Club', 'Inception', 'Oppenheimer', 'The Shawshank Redemption',
    'Se7en', 'Whiplash', 'There Will Be Blood', 'No Country for Old Men', 'Eternal Sunshine of the Spotless Mind',
    'Spirited Away', 'Oldboy', 'Memories of Murder', 'Portrait of a Lady on Fire', 'Anatomy of a Fall',
    'The Zone of Interest', 'Poor Things', 'Aftersun', 'Drive My Car', 'Everything Everywhere All at Once',
    'Mad Max: Fury Road', 'The Grand Budapest Hotel', 'Inglourious Basterds', 'Zodiac', 'The Social Network',
    'Mulholland Drive', '2001: A Space Odyssey', 'Apocalypse Now', 'Stalker', 'Persona',
    'City of God', 'Amélie', 'Cinema Paradiso', 'La La Land', 'Arrival', 'Prisoners', 'Sicario',
    'Heat', 'Collateral', 'Scarface', 'Casino', 'Raging Bull', 'The Departed', 'Shutter Island'
  ],

  cachedGeminiModels: null,
  cachedGeminiModelsApiKey: null,

  // User-owned AI keys are kept local only in Guest Mode. Authenticated users
  // store encrypted credentials server-side and proxy model calls through Supabase.
  getKeys() {
    return {
      provider: (localStorage.getItem('fr_ai_provider') || 'auto').trim(),
      model: (localStorage.getItem('fr_ai_model') || 'auto-discover').trim(),
      // Legacy BYOK keys remain a local fallback for users who have not configured
      // the shared movie proxy yet. New installations do not ask users for these.
      tmdb: (localStorage.getItem('fr_key_tmdb') || '').trim(),
      fanart: (localStorage.getItem('fr_key_fanart') || '').trim(),
      groq: (localStorage.getItem('fr_key_groq') || '').trim(),
      openai: (localStorage.getItem('fr_key_openai') || '').trim(),
      gemini: (localStorage.getItem('fr_key_gemini') || '').trim(),
      openrouter: (localStorage.getItem('fr_key_openrouter') || '').trim()
    };
  },

  hasAvailableCredential(provider) {
    const key = this.getKeys()[provider];
    return Boolean(key || window.FrameRateAuth?.hasCloudCredential?.(provider));
  },

  async invokeMovieProxy(action, payload = {}) {
    const client = window.FrameRateAuth?.client;
    if (!client) return null;
    const { data, error } = await client.functions.invoke('movie-data-proxy', {
      body: { action, ...payload }
    });
    if (error) throw new Error(error.message || 'Shared movie-data proxy is unavailable.');
    return data;
  },

  async searchTmdbMovies(query) {
    try {
      const shared = await this.invokeMovieProxy('search', { query });
      if (shared && Array.isArray(shared.results)) return shared;
    } catch (error) {
      if (!this.getKeys().tmdb) throw error;
    }
    const key = this.getKeys().tmdb;
    if (!key) return null;
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&include_adult=false`);
    if (!response.ok) throw new Error(`TMDB search failed (HTTP ${response.status}).`);
    return await response.json();
  },

  async getTmdbMovieDetails(id) {
    if (!id) return null;
    try {
      const shared = await this.invokeMovieProxy('details', { id });
      if (shared && typeof shared === 'object') return shared;
    } catch (error) {
      if (!this.getKeys().tmdb) throw error;
    }
    const key = this.getKeys().tmdb;
    if (!key) return null;
    const response = await fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?api_key=${encodeURIComponent(key)}&append_to_response=credits,images,videos&include_image_language=en,null`);
    if (!response.ok) throw new Error(`TMDB details failed (HTTP ${response.status}).`);
    return await response.json();
  },

  async getPopularTmdbMovies(page = 1) {
    try {
      const shared = await this.invokeMovieProxy('popular', { page });
      if (shared && Array.isArray(shared.results)) return shared.results;
    } catch (error) {
      if (!this.getKeys().tmdb) throw error;
    }
    const key = this.getKeys().tmdb;
    if (!key) return [];
    const response = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${encodeURIComponent(key)}&language=en-US&page=${encodeURIComponent(page)}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  },

  pickTrailer(videos) {
    const candidates = Array.isArray(videos) ? videos.filter(video =>
      video && video.site === 'YouTube' && /^[A-Za-z0-9_-]{6,20}$/.test(String(video.key || '')) &&
      ['Trailer', 'Teaser'].includes(String(video.type || ''))
    ) : [];
    candidates.sort((a, b) =>
      Number(b.type === 'Trailer') - Number(a.type === 'Trailer') ||
      Number(Boolean(b.official)) - Number(Boolean(a.official))
    );
    const selected = candidates[0];
    return selected ? {
      key: String(selected.key),
      name: String(selected.name || 'Official Trailer').slice(0, 180),
      site: 'YouTube',
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(selected.key)}`
    } : null;
  },

  /* ================= STUDIO UI ENHANCEMENTS & IMAGE SHARE BAR ================= */
  initStudioEnhancements() {
    const retiredGroqModels = new Set([
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'gemma2-9b-it'
    ]);
    const savedModelId = (localStorage.getItem('fr_ai_model') || '').trim();
    if (retiredGroqModels.has(savedModelId)) {
      localStorage.setItem('fr_ai_provider', 'groq');
      localStorage.setItem('fr_ai_model', 'qwen/qwen3.8-27b');
    }

    const genBtn = document.getElementById('btnGenerateReviews');
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.removeAttribute('disabled');
      genBtn.style.opacity = '1';
    }

    if (window.App) {
      window.App.useVariationOnCard = function (idx) {
        const text = document.getElementById(`reviewVariation${idx}`)?.textContent || '';
        const cardQuote = document.getElementById('cardQuotePreview');
        if (cardQuote && text) {
          cardQuote.textContent = `"${text.replace(/^"|"$/g, '').trim()}"`;
        }
      };

      window.App.buildMasterPrompt = function () {
        if (typeof this.collectBreakdownNotes === 'function') this.collectBreakdownNotes();
        const lang = typeof I18n !== 'undefined' ? I18n.currentLang : 'en';
        return Api.buildDetailedMasterPrompt(this.state, lang);
      };

      window.App.copyMasterPrompt = function () {
        navigator.clipboard.writeText(this.buildMasterPrompt());
        if (typeof this.showToast === 'function') {
          this.showToast('Detailed Studio Master Prompt copied to clipboard!');
        }
      };

      window.App.generateReviews = async function () {
        const btn = document.getElementById('btnGenerateReviews');
        const badge = document.getElementById('activeAiBadge');
        // A request may finish after the user changes account. Capture both the
        // auth identity and storage namespace so its private review is never
        // written into the next account's visible workspace/history.
        const authAtStart = window.FrameRateAuth;
        const requestUserId = authAtStart?.currentUser?.id || '';
        const requestOwner = localStorage.getItem('fr_cloud_owner_id') || 'guest';
        const isSameProfile = () => {
          const authNow = window.FrameRateAuth;
          return (localStorage.getItem('fr_cloud_owner_id') || 'guest') === requestOwner &&
            (authNow?.currentUser?.id || '') === requestUserId;
        };
        const prompt = this.buildMasterPrompt();
        const lang = typeof I18n !== 'undefined' ? I18n.currentLang : 'en';

        if (btn) {
          btn.disabled = true;
          btn.style.opacity = '0.65';
        }
        if (badge) {
          badge.textContent = '⏳ Generating Live...';
        }

        try {
          const out = await Api.generateReviewsWithAI(prompt, this.state, lang);
          if (!isSameProfile()) {
            if (window.App && typeof window.App.showToast === 'function') {
              window.App.showToast('AI response discarded because the active account changed during generation.');
            }
            return;
          }

          const v1El = document.getElementById('reviewVariation1');
          const v2El = document.getElementById('reviewVariation2');
          const v3El = document.getElementById('reviewVariation3');

          if (v1El && out.v1) v1El.textContent = out.v1;
          if (v2El && out.v2) v2El.textContent = out.v2;
          if (v3El && out.v3) v3El.textContent = out.v3;

          if (typeof this.useVariationOnCard === 'function') {
            this.useVariationOnCard(1);
          }

          if (badge && out._agentLabel) {
            badge.textContent = `✓ ${out._agentLabel}`;
          }

          Api.saveReviewToHistory(this.state, out.v2 || out.v1, out._agentLabel);

          if (typeof this.showToast === 'function') {
            if (out._errorNote) {
              this.showToast(out._errorNote);
            } else {
              this.showToast(`Generated via ${out._agentLabel || 'AI Studio'}`);
            }
          }
        } catch (err) {
          if (isSameProfile() && typeof this.showToast === 'function') {
            this.showToast(`Error: ${err.message}`);
          } else if (window.App && typeof window.App.showToast === 'function') {
            window.App.showToast('AI request ended after an account change.');
          }
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.removeAttribute('disabled');
            btn.style.opacity = '1';
          }
        }
      };
    }

    // 1. Inject Model Selector inside API Vault Modal (#vaultModal)
    const providerSelect = document.getElementById('cfgAiProvider');
    if (providerSelect && !document.getElementById('cfgAiModelSelect')) {
      const container = providerSelect.parentElement;
      const modelBox = document.createElement('div');
      modelBox.className = 'pt-2 mt-2 border-t theme-border space-y-2';
      modelBox.innerHTML = `
        <div class="flex items-center justify-between">
          <label for="cfgAiModelSelect" class="block text-lbGreen font-bold uppercase font-mono text-[11px]">Select AI Model:</label>
          <div class="flex items-center gap-1.5">
            <button type="button" aria-label="Load AI models using the selected provider key" onclick="Api.fetchAndPopulateModels()" class="px-2.5 py-1 rounded-lg bg-lbGreen/15 hover:bg-lbGreen/25 border border-lbGreen/40 text-lbGreen font-mono text-[10px] font-bold transition">
              ↻ Load Models from Key
            </button>
            <button type="button" aria-label="Test the selected AI model" onclick="Api.testSelectedModel()" class="px-2.5 py-1 rounded-lg bg-frOrange/15 hover:bg-frOrange/25 border border-frOrange/40 text-frOrange font-mono text-[10px] font-bold transition">
              ⚡ Test
            </button>
          </div>
        </div>
        <select id="cfgAiModelSelect" aria-label="Select AI model" onchange="Api.handleModelSelectChange(this.value)" class="w-full theme-input rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none cursor-pointer"></select>
        <input id="cfgCustomModelInput" type="text" aria-label="Custom AI model identifier" placeholder="Or type any custom Model ID..." oninput="Api.handleCustomModelInput(this.value)" class="w-full theme-input rounded-xl px-3 py-1.5 text-[11px] font-mono focus:outline-none">
        <p id="modelStatusHint" class="text-[10px] font-mono theme-text-muted"></p>
      `;
      container.appendChild(modelBox);

      providerSelect.addEventListener('change', () => {
        const providerChoice = providerSelect.value || 'auto';
        localStorage.setItem('fr_ai_provider', providerChoice);
        let nextModel = 'auto-discover';
        if (providerChoice === 'local') {
          nextModel = 'local-critic';
        } else if (providerChoice !== 'auto') {
          const providerModels = this.modelPresets[providerChoice] || [];
          nextModel = providerModels.find(model => model.id !== 'auto-discover')?.id || 'auto-discover';
        }
        localStorage.setItem('fr_ai_model', nextModel);
        this.populateModelDropdowns(providerChoice, nextModel);
        this.handleModelSelectChange(nextModel, providerChoice);
      });
    }

    // 2. Inject Quick Model Switcher right on Step 4 (AI Studio Header)
    const badge = document.getElementById('activeAiBadge');
    if (badge && !document.getElementById('studioQuickModelSelect')) {
      const quickSelect = document.createElement('select');
      quickSelect.id = 'studioQuickModelSelect';
      quickSelect.title = 'Switch AI Model directly';
      quickSelect.setAttribute('aria-label', 'Switch AI model directly');
      quickSelect.className = 'text-[10px] font-mono px-2.5 py-0.5 rounded-full theme-input border border-frOrange/40 text-frOrange font-bold focus:outline-none cursor-pointer';
      quickSelect.addEventListener('change', e => {
        this.handleModelSelectChange(e.target.value);
        if (window.App && typeof window.App.showToast === 'function') {
          window.App.showToast(`Selected Model: ${e.target.value}`);
        }
      });
      badge.parentElement.appendChild(quickSelect);
    }

    // 3. Upgrade on-screen Cine-Card watermark & inject Image Share Suite
    const cineCard = document.getElementById('cineCardElement');
    if (cineCard && !document.getElementById('socialShareSuite')) {
      // Style the bottom-right watermark inside the preview card
      const lastChild = cineCard.lastElementChild;
      if (lastChild && lastChild.textContent.includes('FrameRate')) {
        lastChild.className = 'relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/65 border border-white/15 sm:self-end shrink-0 shadow-lg';
        lastChild.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-frOrange"></span>
          <span class="text-[10px] font-black tracking-tight text-white">Frame<span class="text-frOrange">Rate</span></span>
          <span class="text-[9px] font-mono uppercase tracking-widest text-slate-400">• STUDIO</span>
        `;
      }

      const suite = document.createElement('div');
      suite.id = 'socialShareSuite';
      suite.className = 'fr-share-toolbar space-y-4 pt-3';
      suite.innerHTML = `
        <!-- Primary Image Export & Social Share Toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl theme-subcard border border-frOrange/30">
          <div class="flex flex-wrap items-center gap-2">
            <!-- 1. Copy Card as Real PNG Image to Clipboard -->
            <button type="button" onclick="App.openShareSheet()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-frOrange to-frAmber text-white text-xs font-extrabold shadow-lg shadow-frOrange/25 hover:opacity-95 transition flex items-center gap-2">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              <span>Open Share Studio</span>
            </button>

            <!-- 2. Download HD PNG Image -->
            <button type="button" onclick="Api.exportCineCardImage('download')" class="px-3.5 py-2 rounded-xl bg-lbGreen/15 hover:bg-lbGreen/25 border border-lbGreen/40 text-lbGreen text-xs font-extrabold transition flex items-center gap-1.5">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download Image (PNG)</span>
            </button>

            <!-- 3. Share Image to WhatsApp -->
            <button type="button" onclick="App.shareToSocial('whatsapp')" class="px-3 py-2 rounded-xl theme-input hover:border-lbGreen text-xs font-bold transition flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-lbGreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              <span>WhatsApp</span>
            </button>

            <!-- 4. Share Image to X / Twitter -->
            <button type="button" onclick="App.shareToSocial('x')" class="px-3 py-2 rounded-xl theme-input hover:border-frOrange text-xs font-bold transition flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span>Post on X</span>
            </button>

            <!-- 5. 1-Click Log on Letterboxd -->
            <button type="button" onclick="Api.openAndLogOnLetterboxd()" class="px-3 py-2 rounded-xl theme-input hover:border-lbGreen text-xs font-bold transition flex items-center gap-1.5">
              <span>Open Letterboxd</span>
            </button>
          </div>

          <!-- Card Layout Ratio Switcher -->
          <div class="flex items-center gap-1">
            <span class="text-[10px] font-mono uppercase theme-text-muted mr-1">Ratio:</span>
            <button type="button" onclick="Api.setCineCardLayout('wide')" class="px-2.5 py-1 rounded-lg theme-input text-[10px] font-mono font-bold hover:border-frOrange">Wide 16:9</button>
            <button type="button" onclick="Api.setCineCardLayout('square')" class="px-2.5 py-1 rounded-lg theme-input text-[10px] font-mono font-bold hover:border-frOrange">Square 1:1</button>
            <button type="button" onclick="Api.setCineCardLayout('story')" class="px-2.5 py-1 rounded-lg theme-input text-[10px] font-mono font-bold hover:border-frOrange">Story 9:16</button>
          </div>
        </div>

        <!-- Saved Reviews History Accordion -->
        <details class="group theme-subcard rounded-2xl p-4">
          <summary class="cursor-pointer text-xs font-bold theme-text-primary flex items-center justify-between list-none">
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4 text-frOrange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
              <span>My Saved Reviews History (Auto-Saved Archive)</span>
            </span>
            <span class="text-[10px] font-mono text-frOrange group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div id="savedReviewsHistoryList" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-3 max-h-60 overflow-y-auto"></div>
        </details>
      `;
      cineCard.parentElement.appendChild(suite);
      this.renderSavedReviewsHistory();
    }

    const keys = this.getKeys();
    this.populateModelDropdowns(keys.provider, keys.model);
  },

  /* ================= HD CANVAS CINE-CARD IMAGE GENERATOR WITH WATERMARK ================= */
  currentCardRatio: 'wide',
  lastImageExportCopied: false,

  loadCorsSafeImage(url) {
    return new Promise(resolve => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback via wsrv.nl CORS proxy so TMDB/iTunes images never taint the canvas on file://
        const proxyImg = new Image();
        proxyImg.crossOrigin = 'anonymous';
        proxyImg.onload = () => resolve(proxyImg);
        proxyImg.onerror = () => resolve(null);
        proxyImg.src = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
      };
      img.src = url;
    });
  },

  drawRoundedRect(ctx, x, y, w, h, r) {
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

  async renderCineCardToCanvas() {
    const st = window.App ? window.App.state : {};
    const f = st.film || {
      title: document.getElementById('cardFilmTitle')?.textContent || 'Selected Film',
      year: document.getElementById('cardFilmYear')?.textContent || '2024',
      director: 'Cinema',
      poster: document.getElementById('cardPosterImg')?.src || '',
      backdrop: st.activeBackdropUrl || ''
    };

    const ratio = this.currentCardRatio || 'wide';
    const width = ratio === 'wide' ? 1200 : 1080;
    const height = ratio === 'wide' ? 675 : ratio === 'square' ? 1080 : 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Base Dark Obsidian Fill
    ctx.fillStyle = '#090c12';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Backdrop Image (Cover)
    const bgUrl = st.activeBackdropUrl || f.backdrop || f.poster;
    const bgImg = await this.loadCorsSafeImage(bgUrl);
    if (bgImg) {
      const scale = Math.max(width / bgImg.width, height / bgImg.height);
      const bw = bgImg.width * scale;
      const bh = bgImg.height * scale;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bgImg, (width - bw) / 2, (height - bh) / 2, bw, bh);
      ctx.restore();
    }

    // 3. Rich Cinema Gradient Overlay
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, 'rgba(7, 9, 14, 0.92)');
    grad.addColorStop(0.55, 'rgba(10, 13, 20, 0.82)');
    grad.addColorStop(1, 'rgba(7, 9, 14, 0.94)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // 4. Outer Specular Frame Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 3;
    this.drawRoundedRect(ctx, 24, 24, width - 48, height - 48, 32);
    ctx.stroke();

    // 5. Draw Poster Image
    const posterImg = await this.loadCorsSafeImage(f.poster);
    const isVertical = ratio !== 'wide';
    const posterW = isVertical ? 280 : 270;
    const posterH = Math.round(posterW * 1.5);
    const posterX = isVertical ? (width - posterW) / 2 : 76;
    const posterY = isVertical ? 110 : Math.round((height - posterH) / 2);

    if (posterImg) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 35;
      ctx.shadowOffsetY = 14;
      this.drawRoundedRect(ctx, posterX, posterY, posterW, posterH, 22);
      ctx.clip();
      ctx.drawImage(posterImg, posterX, posterY, posterW, posterH);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 3;
      this.drawRoundedRect(ctx, posterX, posterY, posterW, posterH, 22);
      ctx.stroke();
    }

    // 6. Draw Typography (Title, Year, Director, Stars, Quote)
    const textX = isVertical ? 90 : posterX + posterW + 56;
    const maxTextW = isVertical ? width - 180 : width - textX - 80;
    let curY = isVertical ? posterY + posterH + 70 : posterY + 55;

    ctx.textAlign = isVertical ? 'center' : 'left';
    const anchorX = isVertical ? width / 2 : textX;

    // Film Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${f.title} (${f.year || ''})`, anchorX, curY, maxTextW);

    // Director & Format Subline
    curY += 38;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 21px "JetBrains Mono", monospace';
    const dirLabel = f.director ? `DIR. ${f.director.toUpperCase()}` : 'FEATURE FILM';
    const fmtLabel = st.format ? ` • ${st.format.toUpperCase()}` : '';
    ctx.fillText(`${dirLabel}${fmtLabel}`, anchorX, curY, maxTextW);

    // Star Rating & Liked Heart
    curY += 52;
    const starsStr = window.App ? window.App.formatStarAscii(st.rating) : '★★★★';
    const numStr = st.rating ? ` ${st.rating.toFixed(1)}/5` : '';
    ctx.fillStyle = '#00e054';
    ctx.font = '900 38px "Plus Jakarta Sans", sans-serif';
    const likedStr = st.liked ? '   ♥ LIKED' : '';
    ctx.fillText(`${starsStr}${numStr}${likedStr}`, anchorX, curY);

    // Wrapped Review Quote
    curY += 56;
    const rawQuote = (document.getElementById('cardQuotePreview')?.textContent || '').trim();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'italic 500 26px "Plus Jakarta Sans", sans-serif';

    const words = rawQuote.split(/\s+/);
    let line = '';
    const lineHeight = 38;
    const maxLines = isVertical ? 9 : 6;
    let lineCount = 0;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextW && i > 0) {
        ctx.fillText(line.trim(), anchorX, curY);
        line = words[i] + ' ';
        curY += lineHeight;
        lineCount++;
        if (lineCount >= maxLines - 1) {
          line += '...';
          break;
        }
      } else {
        line = testLine;
      }
    }
    if (line.trim()) {
      ctx.fillText(line.trim(), anchorX, curY);
    }

    // 7. Draw Official FrameRate Studio Watermark Pill in Bottom-Right Corner
    const wmW = 290;
    const wmH = 48;
    const wmX = width - wmW - 48;
    const wmY = height - wmH - 44;

    ctx.save();
    ctx.fillStyle = 'rgba(7, 8, 10, 0.82)';
    this.drawRoundedRect(ctx, wmX, wmY, wmW, wmH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 85, 34, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Orange dot icon inside watermark
    ctx.beginPath();
    ctx.arc(wmX + 26, wmY + wmH / 2, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5522';
    ctx.fill();

    // Watermark text: FrameRate • STUDIO
    ctx.textAlign = 'left';
    ctx.font = '900 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Frame', wmX + 42, wmY + 31);
    const frameW = ctx.measureText('Frame').width;
    ctx.fillStyle = '#ff5522';
    ctx.fillText('Rate', wmX + 42 + frameW, wmY + 31);
    const rateW = ctx.measureText('Rate').width;
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(' • STUDIO', wmX + 44 + frameW + rateW, wmY + 30);
    ctx.restore();

    return canvas;
  },

  async exportCineCardImage(mode = 'copy') {
    this.lastImageExportCopied = false;
    if (window.App) window.App.showToast('Rendering HD Cine-Card Image with Watermark...');

    try {
      const canvas = await this.renderCineCardToCanvas();
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 1.0));
      if (!blob) throw new Error('Could not create image blob');

      const filmTitle = (window.App?.state?.film?.title || 'Film').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const fileName = `framerate-${filmTitle}-card.png`;

      if (mode === 'copy' && navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          this.lastImageExportCopied = true;
          if (window.App) {
            window.App.showToast('✓ Card Image Copied! Press Ctrl+V in WhatsApp, X, or Discord!');
          }
          return blob;
        } catch (clipErr) {
          console.warn('Clipboard image write fallback to download:', clipErr);
        }
      }

      // Download PNG file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      if (window.App) window.App.showToast(`✓ Downloaded HD Image: ${fileName}`);
      return blob;
    } catch (err) {
      console.error('Image export error:', err);
      if (window.App) window.App.showToast('Error rendering card image');
      return null;
    }
  },

  async shareImageToPlatform(platform) {
    // 1. Copy the rendered PNG image directly into the user's clipboard AND try Web Share API if supported
    const blob = await this.exportCineCardImage('copy');
    const text = this.buildSocialShareText();

    if (!blob) {
      if (window.App) window.App.showToast('Could not render the image. Try the Download Image option.');
      return;
    }

    if (navigator.canShare && blob) {
      const file = new File([blob], 'framerate-review.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: window.App?.state?.film?.title || 'FrameRate Review',
            text
          });
          return;
        } catch (e) {}
      }
    }

    // 2. Open WhatsApp / X with the caption and tell the user to press Ctrl+V to paste the copied image!
    const encoded = encodeURIComponent(text);
    if (window.App) {
      window.App.showToast(this.lastImageExportCopied
        ? 'Card image copied. Paste it into your post or message.'
        : 'Clipboard is unavailable; the card was downloaded. Attach the PNG manually.');
    }

    setTimeout(() => {
      if (platform === 'whatsapp') {
        window.open(`https://web.whatsapp.com/`, '_blank', 'noopener');
      } else if (platform === 'x') {
        window.open(`https://twitter.com/intent/tweet?text=${encoded}`, '_blank', 'noopener');
      }
    }, 500);
  },

  buildSocialShareText() {
    const st = window.App ? window.App.state : {};
    const f = st.film || { title: 'Film', year: '2024', director: '' };
    const stars = window.App ? window.App.formatStarAscii(st.rating) : '★★★★';
    const ratingNum = st.rating ? `${st.rating.toFixed(1)}/5` : '';
    const quote = (document.getElementById('cardQuotePreview')?.textContent || '').replace(/^"|"$/g, '').trim();

    return `${f.title} (${f.year}) ${f.director ? '• Dir. ' + f.director : ''}\nRating: ${stars} (${ratingNum})\n\n"${quote}"\n\n#Letterboxd #FrameRateStudio #Cinema`;
  },

  openAndLogOnLetterboxd() {
    const st = window.App ? window.App.state : {};
    const f = st.film || { title: 'film' };
    const quote = (document.getElementById('cardQuotePreview')?.textContent || '').replace(/^"|"$/g, '').trim();
    navigator.clipboard.writeText(quote);

    const lbSlug = f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const lbUrl = document.getElementById('extLinkLetterboxd')?.href || `https://letterboxd.com/film/${lbSlug}/`;
    if (window.App) window.App.showToast('Review copied! Opening film on Letterboxd...');
    setTimeout(() => window.open(lbUrl, '_blank', 'noopener'), 350);
  },

  setCineCardLayout(mode) {
    this.currentCardRatio = mode;
    const card = document.getElementById('cineCardElement');
    if (!card) return;

    if (mode === 'square') {
      card.className = 'relative overflow-hidden rounded-3xl border border-white/20 p-8 shadow-2xl flex flex-col items-center justify-center text-center gap-5 bg-cover bg-center transition-all duration-500 max-w-md mx-auto aspect-square';
    } else if (mode === 'story') {
      card.className = 'relative overflow-hidden rounded-3xl border border-white/20 p-8 shadow-2xl flex flex-col items-center justify-center text-center gap-6 bg-cover bg-center transition-all duration-500 max-w-sm mx-auto min-h-[540px]';
    } else {
      card.className = 'relative overflow-hidden rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center gap-6 bg-cover bg-center transition-all duration-500';
    }
    if (window.App) window.App.showToast(`Card Ratio: ${mode.toUpperCase()}`);
  },

  saveReviewToHistory(state, reviewText, agentLabel) {
    if (!reviewText) return;
    try {
      const list = JSON.parse(localStorage.getItem('fr_saved_reviews') || '[]');
      const entry = {
        id: Date.now(),
        title: state.film?.title || 'Selected Film',
        year: state.film?.year || '',
        rating: state.rating || 4.0,
        review: reviewText,
        agent: agentLabel || 'Studio',
        date: new Date().toISOString().slice(0, 10)
      };
      const updated = [entry, ...list.filter(x => x.review !== reviewText)].slice(0, 100);
      localStorage.setItem('fr_saved_reviews', JSON.stringify(updated));
      this.renderSavedReviewsHistory();
    } catch (e) {}
  },

  renderSavedReviewsHistory() {
    const container = document.getElementById('savedReviewsHistoryList');
    if (!container) return;

    container.replaceChildren();
    let list = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('fr_saved_reviews') || '[]');
      list = Array.isArray(parsed) ? parsed.slice(0, 100) : [];
    } catch (error) {
      console.warn('Could not read saved review history:', error);
    }

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'col-span-full text-xs theme-text-muted py-3 text-center';
      empty.textContent = 'No saved reviews yet. Generate a review above and it will be archived here automatically.';
      container.appendChild(empty);
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl theme-input flex flex-col justify-between gap-2';

      const content = document.createElement('div');
      const header = document.createElement('div');
      header.className = 'flex items-center justify-between text-xs font-bold gap-2';

      const title = document.createElement('span');
      title.textContent = `${String(item.title || 'Film')} (${String(item.year || '')})`;
      const rating = document.createElement('span');
      rating.className = 'font-mono text-lbGreen shrink-0';
      const score = Number(item.rating);
      rating.textContent = `★ ${Number.isFinite(score) ? score.toFixed(1) : '—'}`;
      header.append(title, rating);

      const review = document.createElement('p');
      review.className = 'text-[11px] theme-text-secondary italic line-clamp-2 mt-1';
      review.textContent = `“${String(item.review || '')}”`;
      content.append(header, review);

      const meta = document.createElement('div');
      meta.className = 'flex items-center justify-between gap-2 text-[10px] font-mono theme-text-muted pt-1 border-t theme-border';
      const agent = document.createElement('span');
      agent.textContent = `${String(item.agent || 'Studio')} • ${String(item.date || '')}`;
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'text-frOrange font-bold hover:underline shrink-0';
      copy.textContent = 'Copy';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(String(item.review || ''));
          if (window.App) window.App.showToast('Copied from history!');
        } catch (error) {
          if (window.App) window.App.showToast('Clipboard access is unavailable in this browser context.');
        }
      });
      meta.append(agent, copy);
      card.append(content, meta);
      container.appendChild(card);
    });
  },

  /* ================= PROVIDER & MODEL SELECTOR LOGIC ================= */
  resolveActiveProvider(preferredProvider) {
    const keys = this.getKeys();
    if (preferredProvider && preferredProvider !== 'auto') return preferredProvider;
    if (this.hasAvailableCredential('gemini')) return 'gemini';
    if (this.hasAvailableCredential('groq')) return 'groq';
    if (this.hasAvailableCredential('openai')) return 'openai';
    if (this.hasAvailableCredential('openrouter')) return 'openrouter';
    return 'gemini';
  },

  populateModelDropdowns(providerChoice, selectedModelId = null) {
    const effectiveProvider = this.resolveActiveProvider(providerChoice);
    const presets = this.modelPresets[effectiveProvider] || this.modelPresets.gemini;
    const savedModel = selectedModelId || localStorage.getItem('fr_ai_model') || presets[0]?.id || 'auto-discover';

    const modalSelect = document.getElementById('cfgAiModelSelect');
    const studioSelect = document.getElementById('studioQuickModelSelect');
    const keys = this.getKeys();
    const combined = [...presets];

    // Include models from configured Gemini/Groq providers in the quick switcher.
    ['gemini', 'groq'].forEach(provider => {
      if (this.hasAvailableCredential(provider)) {
        (this.modelPresets[provider] || []).forEach(model => {
          if (!combined.some(existing => existing.id === model.id)) combined.push(model);
        });
      }
    });

    if (savedModel && !combined.some(model => model.id === savedModel)) {
      combined.unshift({ id: savedModel, label: `${savedModel} (Custom / saved)` });
    }

    const fillSelect = select => {
      if (!select) return;
      select.replaceChildren();
      combined.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.label;
        option.selected = model.id === savedModel;
        select.appendChild(option);
      });
      if (combined.some(model => model.id === savedModel)) select.value = savedModel;
    };

    fillSelect(modalSelect);
    fillSelect(studioSelect);
  },

  handleModelSelectChange(modelId, sourceProvider = null) {
    if (!modelId) return;
    localStorage.setItem('fr_ai_model', modelId);

    const providerSelect = document.getElementById('cfgAiProvider');
    const storedProvider = localStorage.getItem('fr_ai_provider') || 'auto';
    let targetProvider = null;

    if (modelId === 'auto-discover') {
      targetProvider = sourceProvider || providerSelect?.value || storedProvider || 'auto';
    } else {
      for (const [provider, models] of Object.entries(this.modelPresets)) {
        if (provider !== 'auto' && models.some(model => model.id === modelId)) {
          targetProvider = provider;
          break;
        }
      }

      if (!targetProvider) {
        const hintedProvider = sourceProvider || providerSelect?.value || storedProvider;
        if (hintedProvider && hintedProvider !== 'auto') {
          targetProvider = hintedProvider;
        } else {
          const lower = modelId.toLowerCase();
          if (lower.includes('gemini')) targetProvider = 'gemini';
          else if (lower.includes('qwen') || lower.includes('llama') || lower.includes('gemma') || lower.includes('mixtral') || lower.includes('gpt-oss')) targetProvider = 'groq';
          else if (lower.startsWith('gpt-')) targetProvider = 'openai';
          else if (lower.includes('/')) targetProvider = 'openrouter';
          else targetProvider = hintedProvider || 'auto';
        }
      }
    }

    if (targetProvider) {
      localStorage.setItem('fr_ai_provider', targetProvider);
      if (providerSelect && providerSelect.value !== targetProvider) providerSelect.value = targetProvider;
    }

    const modalSelect = document.getElementById('cfgAiModelSelect');
    const studioSelect = document.getElementById('studioQuickModelSelect');
    const customInput = document.getElementById('cfgCustomModelInput');
    if (modalSelect && modalSelect.value !== modelId && Array.from(modalSelect.options).some(option => option.value === modelId)) modalSelect.value = modelId;
    if (studioSelect && studioSelect.value !== modelId && Array.from(studioSelect.options).some(option => option.value === modelId)) studioSelect.value = modelId;
    if (customInput) customInput.value = modelId === 'auto-discover' || modelId === 'local-critic' ? '' : modelId;
  },

  handleCustomModelInput(val) {
    const clean = (val || '').trim();
    if (!clean) return;
    const providerChoice = document.getElementById('cfgAiProvider')?.value || localStorage.getItem('fr_ai_provider') || 'auto';
    this.handleModelSelectChange(clean, providerChoice);
  },

  async fetchAndPopulateModels() {
    const hint = document.getElementById('modelStatusHint');
    const providerEl = document.getElementById('cfgAiProvider');
    const auth = window.FrameRateAuth;
    const selectedProvider = providerEl ? providerEl.value : 'auto';
    const inputProviders = ['gemini', 'groq', 'openai', 'openrouter'];
    const typedProvider = inputProviders.find(provider => {
      const input = document.getElementById(`cfg${provider[0].toUpperCase()}${provider.slice(1)}`);
      return Boolean(input?.value?.trim());
    });
    // In Auto mode, respect a key the user just entered instead of defaulting
    // to another provider that may not have credentials yet.
    let currentProvider = selectedProvider !== 'auto'
      ? selectedProvider
      : (typedProvider || this.resolveActiveProvider('auto'));

    const keyFromInputOrLocal = provider => {
      const input = document.getElementById(`cfg${provider[0].toUpperCase()}${provider.slice(1)}`);
      return (input?.value || localStorage.getItem(`fr_key_${provider}`) || '').trim();
    };
    const geminiKey = keyFromInputOrLocal('gemini');
    const groqKey = keyFromInputOrLocal('groq');
    const openaiKey = keyFromInputOrLocal('openai');
    const openrouterKey = keyFromInputOrLocal('openrouter');
    const cloudProviderKey = provider => Boolean(auth?.hasCloudCredential?.(provider));

    // A signed-in user who pastes a new key and clicks "Load AI Models" gets
    // that key saved through the encrypted Edge Function. Do not copy it to
    // browser storage in a signed-in profile.
    if (hint) {
      hint.textContent = `Fetching available models for ${currentProvider.toUpperCase()}...`;
      hint.className = 'text-[10px] font-mono text-frAmber';
    }

    try {
      // A signed-in user who pastes a new key and clicks "Load AI Models" gets
      // that key saved through the encrypted Edge Function. Do not copy it to
      // browser storage in a signed-in profile.
      if (auth?.currentUser?.id && auth.cloudReady && inputProviders.includes(currentProvider) && !cloudProviderKey(currentProvider)) {
        const entered = { gemini: geminiKey, groq: groqKey, openai: openaiKey, openrouter: openrouterKey }[currentProvider];
        if (entered) {
          await auth.saveCloudCredentials({ [currentProvider]: entered });
          const input = document.getElementById(`cfg${currentProvider[0].toUpperCase()}${currentProvider.slice(1)}`);
          if (input) input.value = '';
        }
      }

      let fetchedModels = [];

      if (currentProvider === 'gemini') {
        if (cloudProviderKey('gemini')) {
          const response = await auth.invokeCredentialVault({ action: 'models', provider: 'gemini' });
          fetchedModels = response.models || [];
        } else {
          if (!geminiKey) throw new Error('Please paste your Gemini API Key first');
          if (!auth?.currentUser?.id) localStorage.setItem('fr_key_gemini', geminiKey);
          fetchedModels = await this.fetchGeminiModelsFromApi(geminiKey);
        }
        this.modelPresets.gemini = fetchedModels.map(id => ({ id, label: `${id} (Verified ✓)` }));
        this.populateModelDropdowns('gemini', fetchedModels[0]);
        if (fetchedModels[0]) this.handleModelSelectChange(fetchedModels[0]);
      } else if (currentProvider === 'groq') {
        if (cloudProviderKey('groq')) {
          const response = await auth.invokeCredentialVault({ action: 'models', provider: 'groq' });
          fetchedModels = response.models || [];
        } else {
          if (!groqKey) throw new Error('Please paste your Groq API Key first');
          if (!auth?.currentUser?.id) localStorage.setItem('fr_key_groq', groqKey);
          const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${groqKey}` } });
          if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
          const data = await res.json();
          fetchedModels = (data.data || []).map(m => m.id).filter(id => !id.includes('whisper') && !id.includes('guard') && !id.includes('tts'));
        }
        fetchedModels.sort((a, b) => (a.includes('llama-3.3-70b') ? -1 : b.includes('llama-3.3-70b') ? 1 : 0));
        this.modelPresets.groq = fetchedModels.map(id => ({ id, label: `${id} (Verified ✓)` }));
        this.populateModelDropdowns('groq', fetchedModels[0]);
        if (fetchedModels[0]) this.handleModelSelectChange(fetchedModels[0]);
      } else if (currentProvider === 'openai' || currentProvider === 'openrouter') {
        if (cloudProviderKey(currentProvider)) {
          const response = await auth.invokeCredentialVault({ action: 'models', provider: currentProvider });
          fetchedModels = response.models || [];
        } else {
          const localKey = currentProvider === 'openai' ? openaiKey : openrouterKey;
          if (!localKey) throw new Error(`Please paste your ${currentProvider} API Key first`);
          if (!auth?.currentUser?.id) localStorage.setItem(`fr_key_${currentProvider}`, localKey);
          const endpoint = currentProvider === 'openai' ? 'https://api.openai.com/v1/models' : 'https://openrouter.ai/api/v1/models';
          const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${localKey}` } });
          if (!res.ok) throw new Error(`${currentProvider} HTTP ${res.status}`);
          const data = await res.json();
          fetchedModels = (data.data || []).map(m => m.id).filter(id => currentProvider === 'openai' ? id.startsWith('gpt-') : Boolean(id));
        }
        this.modelPresets[currentProvider] = fetchedModels.map(id => ({ id, label: `${id} (Verified ✓)` }));
        this.populateModelDropdowns(currentProvider, fetchedModels[0]);
        if (fetchedModels[0]) this.handleModelSelectChange(fetchedModels[0]);
      }

      if (hint) {
        hint.textContent = `✓ Loaded ${fetchedModels.length} live models! Selected: ${localStorage.getItem('fr_ai_model')}`;
        hint.className = 'text-[10px] font-mono text-lbGreen font-bold';
      }
      if (window.App) window.App.showToast(`Loaded ${fetchedModels.length} live models!`);
    } catch (err) {
      if (hint) {
        hint.textContent = `✕ ${err.message}`;
        hint.className = 'text-[10px] font-mono text-rose-400 font-bold';
      }
      if (window.App) window.App.showToast(err.message);
    }
  },

  async fetchGeminiModelsFromApi(apiKey) {
    if (
      this.cachedGeminiModels &&
      this.cachedGeminiModels.length > 0 &&
      this.cachedGeminiModelsApiKey === apiKey
    ) {
      return this.cachedGeminiModels;
    }
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) throw new Error(`Gemini Key Error (HTTP ${res.status})`);
    const data = await res.json();
    const valid = (data.models || [])
      .filter(m => {
        const methods = m.supportedGenerationMethods || [];
        const name = (m.name || '').toLowerCase();
        return (
          methods.includes('generateContent') &&
          name.includes('gemini') &&
          !name.includes('embedding') &&
          !name.includes('imagen') &&
          !name.includes('tts') &&
          !name.includes('audio') &&
          !name.includes('robotics') &&
          !name.includes('computer-use')
        );
      })
      .map(m => m.name.replace(/^models\//, ''));

    valid.sort((a, b) => {
      const score = s => {
        if (s === 'gemini-2.5-flash') return 12;
        if (s.includes('flash-lite')) return 11;
        if (s.includes('3.8-flash')) return 10;
        if (s.includes('3.6-flash')) return 9;
        if (s.includes('2.0-flash')) return 8;
        if (s.includes('flash')) return 7;
        return 2;
      };
      return score(b) - score(a);
    });

    this.cachedGeminiModels = valid;
    this.cachedGeminiModelsApiKey = apiKey;
    return valid;
  },

  async testSelectedModel() {
    const hint = document.getElementById('modelStatusHint');
    if (hint) {
      hint.textContent = 'Testing connection with AI model...';
      hint.className = 'text-[10px] font-mono text-frAmber';
    }

    if (document.getElementById('cfgAiProvider')) localStorage.setItem('fr_ai_provider', document.getElementById('cfgAiProvider').value);
    const auth = window.FrameRateAuth;
    const enteredCredentials = {
      gemini: document.getElementById('cfgGemini')?.value.trim() || '',
      groq: document.getElementById('cfgGroq')?.value.trim() || '',
      openai: document.getElementById('cfgOpenai')?.value.trim() || '',
      openrouter: document.getElementById('cfgOpenrouter')?.value.trim() || ''
    };
    try {
      if (auth?.currentUser?.id) {
        if (!auth.cloudReady) throw new Error('Your account is still syncing. Wait a moment, then test the model again.');
        if (Object.values(enteredCredentials).some(Boolean)) {
          await auth.saveCloudCredentials(enteredCredentials);
          Object.keys(enteredCredentials).forEach(provider => {
            const input = document.getElementById(`cfg${provider[0].toUpperCase()}${provider.slice(1)}`);
            if (input && enteredCredentials[provider]) input.value = '';
          });
        }
      } else {
        // Empty password inputs are intentionally blank for saved keys; never
        // interpret them as a request to delete existing Guest credentials.
        Object.entries(enteredCredentials).forEach(([provider, value]) => {
          if (value) localStorage.setItem(`fr_key_${provider}`, value);
        });
      }
    } catch (error) {
      if (hint) { hint.textContent = `✕ ${error.message}`; hint.className = 'text-[10px] font-mono text-rose-400 font-bold'; }
      if (window.App) window.App.showToast(error.message || 'Could not prepare AI credentials.');
      return;
    }

    const dummyState = {
      film: { title: 'Dune: Part Two', year: '2024', director: 'Denis Villeneuve', genres: ['Sci-Fi'] },
      rating: 4.5,
      vibes: ['Atmospheric'],
      notes: { craft: 'Stunning cinematography', soul: 'Powerful', friction: 'None', free: '' },
      dna: { top4: '', lens: '', avoid: '' }
    };

    const res = await this.generateReviewsWithAI('Write 3 short review variations for Dune: Part Two (2024).', dummyState, 'en');
    if (res._errorNote) {
      if (hint) {
        hint.textContent = `✕ ${res._errorNote}`;
        hint.className = 'text-[10px] font-mono text-rose-400 font-bold';
      }
    } else {
      if (hint) {
        hint.textContent = `✓ Working Fast! (${res._agentLabel})`;
        hint.className = 'text-[10px] font-mono text-lbGreen font-bold';
      }
      if (window.App) window.App.showToast(`✓ Success: ${res._agentLabel}`);
    }
  },

  /* ================= FUZZY TYPO-TOLERANCE ENGINE ================= */
  normalizeStr(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/(.)\1+/g, '$1')
      .trim();
  },

  computeSimilarity(rawA, rawB) {
    const a = this.normalizeStr(rawA);
    const b = this.normalizeStr(rawB);
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (b.startsWith(a)) return 0.94;
    if (b.includes(a)) return 0.86;

    const getBigrams = s => {
      const bg = [];
      for (let i = 0; i < s.length - 1; i++) bg.push(s.slice(i, i + 2));
      return bg;
    };

    const bgA = getBigrams(a);
    const bgB = getBigrams(b);
    if (!bgA.length || !bgB.length) return 0;

    let matches = 0;
    const used = new Array(bgB.length).fill(false);
    for (let i = 0; i < bgA.length; i++) {
      for (let j = 0; j < bgB.length; j++) {
        if (!used[j] && bgA[i] === bgB[j]) {
          matches++;
          used[j] = true;
          break;
        }
      }
    }
    return (2.0 * matches) / (bgA.length + bgB.length);
  },

  getFuzzyCorrectedQuery(rawQuery) {
    let bestTitle = rawQuery;
    let bestScore = 0;
    for (const candidate of this.popularTitlesDictionary) {
      const score = this.computeSimilarity(rawQuery, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestTitle = candidate;
      }
    }
    return bestScore >= 0.48 ? bestTitle : rawQuery;
  },

  async searchMovies(query) {
    const keys = this.getKeys();
    const q = (query || '').trim();
    if (!q) return [];

    const correctedQ = this.getFuzzyCorrectedQuery(q);
    const resultsMap = new Map();

    const addResult = item => {
      const key = `${item.title.toLowerCase()}-${item.year}`;
      if (!resultsMap.has(key)) {
        const sim = Math.max(
          this.computeSimilarity(q, item.title),
          this.computeSimilarity(correctedQ, item.title)
        );
        resultsMap.set(key, { ...item, _score: sim });
      }
    };

    Object.entries(this.curatedCatalog).forEach(([slug, item]) => {
      const score = Math.max(
        this.computeSimilarity(q, item.title),
        this.computeSimilarity(q, item.director)
      );
      if (score >= 0.42) {
        addResult({
          id: item.id,
          source: 'curated',
          curatedSlug: slug,
          title: item.title,
          year: item.year,
          director: item.director,
          poster: item.poster,
          backdrop: item.backdrop
        });
      }
    });

    let proxySearchError = null;
    if (keys.tmdb || window.FrameRateAuth?.client) {
      try {
        const queriesToRun = correctedQ.toLowerCase() !== q.toLowerCase() ? [q, correctedQ] : [q];
        for (const searchStr of queriesToRun) {
          const data = await this.searchTmdbMovies(searchStr);
          if (data) {
            (data.results || []).slice(0, 10).forEach(m => {
              addResult({
                id: m.id,
                source: 'tmdb',
                title: m.title,
                year: m.release_date ? m.release_date.slice(0, 4) : '—',
                director: 'TMDB Catalog',
                poster: m.poster_path
                  ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
                  : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
                backdrop: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : ''
              });
            });
          }
          if (resultsMap.size >= 6) break;
        }
      } catch (err) { proxySearchError = err; console.warn('[FrameRate] TMDB search/proxy failed:', err); }
    }

    if (resultsMap.size < 8) {
      try {
        const queriesToRun = correctedQ.toLowerCase() !== q.toLowerCase() ? [q, correctedQ] : [q];
        for (const searchStr of queriesToRun) {
          const itunesRes = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(searchStr)}&media=movie&entity=movie&limit=10`
          );
          if (itunesRes.ok) {
            const itunesData = await itunesRes.json();
            (itunesData.results || []).forEach(item => {
              const hiResPoster = item.artworkUrl100
                ? item.artworkUrl100.replace('100x100bb', '600x900bb')
                : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
              const hiResBackdrop = item.artworkUrl100
                ? item.artworkUrl100.replace('100x100bb', '1400x800bb')
                : '';

              addResult({
                id: item.trackId,
                source: 'itunes',
                title: item.trackName,
                year: item.releaseDate ? item.releaseDate.slice(0, 4) : '—',
                director: item.artistName || 'Director',
                runtime: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 60000) : 120,
                overview: item.longDescription || item.shortDescription || 'No synopsis available.',
                genres: item.primaryGenreName ? [item.primaryGenreName] : ['Cinema'],
                poster: hiResPoster,
                backdrop: hiResBackdrop
              });
            });
          }
          if (resultsMap.size >= 8) break;
        }
      } catch (e) {}
    }

    const finalResults = Array.from(resultsMap.values())
      .sort((a, b) => b._score - a._score)
      .slice(0, 12);
    if (!finalResults.length && proxySearchError && !keys.tmdb) throw proxySearchError;
    return finalResults;
  },

  async getMovieDetails(item) {
    const keys = this.getKeys();

    if (item.source === 'curated' && item.curatedSlug && this.curatedCatalog[item.curatedSlug]) {
      const base = { ...this.curatedCatalog[item.curatedSlug] };
      if (base.id && (keys.tmdb || window.FrameRateAuth?.client)) {
        try {
          const tmdb = await this.getTmdbMovieDetails(base.id);
          base.trailer = this.pickTrailer(tmdb?.videos?.results);
        } catch (_) { /* curated metadata remains available if the proxy is not configured */ }
      }
      const fanart = await this.fetchFanartVisuals(base.id, base.imdb_id);
      if (fanart.clearLogo) base.clearLogo = fanart.clearLogo;
      if (fanart.backdrops.length) {
        base.backdrops = [...new Set([...fanart.backdrops, ...(base.backdrops || [])])];
      }
      return base;
    }

    if (keys.tmdb || window.FrameRateAuth?.client) {
      try {
        // Search-result fallback: items from iTunes/Letterboxd may not carry a TMDB ID,
        // so look them up by title before giving up on TMDB metadata and an in-page trailer.
        let detailId = item.source === 'tmdb' && item.id ? item.id : null;
        if (!detailId && item.title) {
          const lookup = await this.searchTmdbMovies(item.title);
          const candidates = Array.isArray(lookup?.results) ? lookup.results : [];
          const desiredYear = String(item.year || '').slice(0, 4);
          let best = null;
          let bestScore = 0;
          for (const candidate of candidates) {
            const titleScore = this.computeSimilarity(item.title, candidate.title || '');
            const candidateYear = String(candidate.release_date || '').slice(0, 4);
            const yearBonus = desiredYear && candidateYear === desiredYear ? 0.12 : 0;
            const score = titleScore + yearBonus;
            if (score > bestScore) {
              best = candidate;
              bestScore = score;
            }
          }
          if (best && bestScore >= 0.54) detailId = best.id;
        }
        const d = detailId ? await this.getTmdbMovieDetails(detailId) : null;
        if (d) {
          const directorObj = (d.credits?.crew || []).find(c => c.job === 'Director');
          const topCast = (d.credits?.cast || []).slice(0, 6).map(c => c.name);
          const tmdbBackdrops = (d.images?.backdrops || [])
            .slice(0, 8)
            .map(b => `https://image.tmdb.org/t/p/original${b.file_path}`);
          const tmdbLogo = (d.images?.logos || [])[0];

          const movieObj = {
            id: d.id,
            imdb_id: d.imdb_id || '',
            title: d.title,
            year: d.release_date ? d.release_date.slice(0, 4) : item.year || '',
            runtime: d.runtime || 120,
            director: directorObj ? directorObj.name : item.director || 'Director',
            tagline: d.tagline || '',
            overview: d.overview || '',
            genres: (d.genres || []).map(g => g.name),
            cast: topCast.length ? topCast : ['Principal Cast'],
            poster: d.poster_path ? `https://image.tmdb.org/t/p/w780${d.poster_path}` : item.poster,
            backdrop: d.backdrop_path
              ? `https://image.tmdb.org/t/p/original${d.backdrop_path}`
              : tmdbBackdrops[0] || item.poster,
            clearLogo: tmdbLogo ? `https://image.tmdb.org/t/p/w500${tmdbLogo.file_path}` : null,
            backdrops: tmdbBackdrops.length
              ? tmdbBackdrops
              : d.backdrop_path
              ? [`https://image.tmdb.org/t/p/original${d.backdrop_path}`]
              : [item.poster],
            trailer: this.pickTrailer(d.videos?.results)
          };

          const fanart = await this.fetchFanartVisuals(movieObj.id, movieObj.imdb_id);
          if (fanart.clearLogo && !movieObj.clearLogo) movieObj.clearLogo = fanart.clearLogo;
          if (fanart.backdrops.length) {
            movieObj.backdrops = [...new Set([...fanart.backdrops, ...movieObj.backdrops])];
          }
          return movieObj;
        }
      } catch (e) {}
    }

    return {
      id: item.id,
      imdb_id: '',
      title: item.title,
      year: item.year || '2024',
      runtime: item.runtime || 120,
      director: item.director || 'Featured Director',
      tagline: '',
      overview: item.overview || 'Synopsis loaded from cinema catalog.',
      genres: item.genres || ['Drama'],
      cast: ['Principal Cast'],
      poster: item.poster,
      backdrop: item.backdrop || item.poster,
      clearLogo: null,
      trailer: null,
      backdrops: [
        item.backdrop || item.poster,
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80'
      ]
    };
  },

  async fetchFanartVisuals(tmdbId, imdbId) {
    const keys = this.getKeys();
    const result = { clearLogo: null, backdrops: [] };
    if ((!keys.fanart && !window.FrameRateAuth?.client) || (!tmdbId && !imdbId)) return result;

    try {
      const lookupId = tmdbId || imdbId;
      let data = null;
      if (window.FrameRateAuth?.client) {
        try { data = await this.invokeMovieProxy('fanart', { id: lookupId }); } catch (proxyError) {
          if (!keys.fanart) throw proxyError;
        }
      }
      if (!data && keys.fanart) {
        const res = await fetch(`https://webservice.fanart.tv/v3/movies/${encodeURIComponent(lookupId)}?api_key=${encodeURIComponent(keys.fanart)}`);
        if (!res.ok) return result;
        data = await res.json();
      }
      const logos = data?.hdmovielogo || data?.movielogo || [];
      if (logos.length > 0) result.clearLogo = logos[0].url;
      const bgList = data?.moviebackground || [];
      result.backdrops = bgList.slice(0, 8).map(b => b.url).filter(Boolean);
    } catch (e) {}
    return result;
  },

  /* ================= ULTRA-DETAILED STUDIO MASTER PROMPT BUILDER ================= */
  buildDetailedMasterPrompt(state, lang) {
    const f = state.film || {
      title: 'Selected Film',
      year: '2024',
      director: 'Unknown Director',
      runtime: 120,
      genres: ['Drama'],
      cast: ['Lead Cast'],
      tagline: '',
      overview: ''
    };

    const langNames = {
      en: 'English (Natural Cinephile English)',
      darija: 'Moroccan Darija (الدارجة المغربية بأسلوب سينمائي طبيعي وذكي)',
      ar: 'Modern Standard Arabic (العربية الفصحى بأسلوب نقدي سينمائي رفيع)',
      fr: 'French (Français - style Cahiers du Cinéma / Letterboxd)',
      es: 'Spanish (Español - crítica cinematográfica)',
      de: 'German (Deutsch - Filmkritik)',
      it: 'Italian (Italiano - critica cinematografica)'
    };

    const targetLanguage = langNames[lang] || langNames.en;
    const ratingStr = state.rating ? `${state.rating.toFixed(1)} / 5.0 Stars` : 'Unrated';

    return `====================================================================
ROLE & PERSONA: ELITE LETTERBOXD FILM CRITIC & EDITORIAL ESSAYIST
TARGET OUTPUT LANGUAGE: ${targetLanguage}
====================================================================

[1. FILM DOSSIER & METADATA]
- Title: ${f.title}
- Release Year: ${f.year}
- Director: ${f.director}
- Runtime: ${f.runtime || 120} minutes
- Genres: ${(f.genres || ['Cinema']).join(', ')}
- Principal Cast: ${(f.cast || []).join(', ')}
${f.tagline ? `- Official Tagline: "${f.tagline}"` : ''}

[2. VIEWER'S LETTERBOXD DIARY TELEMETRY]
- Star Rating Verdict: ${ratingStr}
- Liked (Hearted on Letterboxd): ${state.liked ? 'YES (Loved / Deeply resonated)' : 'NO'}
- Viewing Context: ${state.rewatch ? 'REWATCH' : 'FIRST-TIME WATCH'}
- Screening Format / Venue: ${state.format || 'Cinema'}
- Spoiler Policy: ${state.spoilers ? 'Spoilers Permitted' : 'STRICTLY NO SPOILERS'}

[3. ATMOSPHERIC & TONAL IMPRESSIONS]
- Selected Mood Tags: ${(state.vibes && state.vibes.length) ? state.vibes.join(', ') : 'Atmospheric, Engaging'}

[4. VIEWER'S PERSONAL ANALYTICAL BREAKDOWN]
- 1. The Craft (Direction, Camera, Lighting, Score, Editing):
  "${state.notes.craft || 'Strong formal control, deliberate framing, and immersive sonic texture.'}"
- 2. The Soul (Performances, Emotional Weight, Chemistry, Script):
  "${state.notes.soul || 'Grounded, deeply human performances that carry the emotional subtext.'}"
- 3. The Friction (Pacing Issues, Structural Flaws, or Reservations):
  "${state.notes.friction || 'Cohesive rhythm throughout with minimal structural friction.'}"
- 4. Standout Scene / Personal Memory / Existing Draft:
  "${state.notes.free || state.importedReview || 'Weave the overall mood and directorial vision into the critique.'}"

[5. CRITIC'S WRITING DNA & STRICT ANTI-CLICHE RULES]
- Critic's Top 4 Favorite Films: ${state.dna.top4 || 'Classic & modern auteur cinema'}
- Primary Critical Lens: ${state.dna.lens || 'Mise-en-scène, visual storytelling, rhythm, and emotional honesty'}
- Custom Forbidden Phrases: ${state.dna.avoid || 'Avoid generic praise'}
- STRICT EDITORIAL RULES:
  1. NEVER write a generic plot summary.
  2. BANNED AI CLICHÉS: Never use "testament to", "masterpiece that delves into", "a rich tapestry", "visceral symphony", "tour de force", or "in conclusion".

[6. REQUIRED 3 REVIEW VARIATIONS]
Generate 3 distinct Letterboxd review styles in ${targetLanguage}:
- Variation 1 (PUNCHY LETTERBOXD ONE-LINER): A razor-sharp, witty, or poetic 1-to-2 sentence micro-review.
- Variation 2 (AUTHENTIC PERSONAL DIARY REVIEW): A natural, engaging 1-to-2 paragraph personal review blending Craft, Soul, and Friction.
- Variation 3 (DEEP CINEPHILE ESSAY & FORMAL CRITIQUE): An incisive 2-paragraph analytical critique examining ${f.director}'s mise-en-scène and themes.`;
  },

  /* ================= ULTRA-FAST & ISOLATED MULTI-AGENT AI CALLER ================= */
  async generateReviewsWithAI(promptText, state, lang) {
    const keys = this.getKeys();
    const chosenModel = (document.getElementById('studioQuickModelSelect')?.value || keys.model || 'auto-discover').trim();

    const sysInstruction = `You are an elite Letterboxd film critic writing in (${lang}).
Produce THREE complete, distinct reviews about the supplied film and the user's notes. Never stop after the opening phrase.
Output exactly these three markers on their own lines and put a complete review after each:
===V1===
A polished 1-2 sentence punchy Letterboxd one-liner.
===V2===
A natural personal diary review of 1-2 complete paragraphs.
===V3===
A substantive, two-paragraph cinephile critique of direction, form, themes, and the user's notes.
Each section must contain real review text, not placeholder instructions. Do not repeat a section. Do not include an introduction or any other markers.`;

    const parseAiOutput = rawText => {
      const cleaned = String(rawText || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const isComplete = (v1, v2, v3) =>
        String(v1 || '').trim().length >= 12 &&
        String(v2 || '').trim().length >= 45 &&
        String(v3 || '').trim().length >= 60;

      if (cleaned.includes('===V1===') && cleaned.includes('===V2===') && cleaned.includes('===V3===')) {
        const p1 = cleaned.split('===V1===')[1] || '';
        const [v1Raw, rest1] = p1.split('===V2===');
        const [v2Raw, v3Raw] = (rest1 || '').split('===V3===');
        if (isComplete(v1Raw, v2Raw, v3Raw)) {
          return { v1: v1Raw.trim(), v2: v2Raw.trim(), v3: v3Raw.trim() };
        }
      }

      const noCode = cleaned.replace(/```json|```/g, '').trim();
      const firstBrace = noCode.indexOf('{');
      const lastBrace = noCode.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          const obj = JSON.parse(noCode.slice(firstBrace, lastBrace + 1));
          const v1 = obj.v1 || obj.variation1 || '';
          const v2 = obj.v2 || obj.variation2 || '';
          const v3 = obj.v3 || obj.variation3 || '';
          if (isComplete(v1, v2, v3)) {
            return { v1: String(v1).trim(), v2: String(v2).trim(), v3: String(v3).trim() };
          }
        } catch (e) {}
      }

      const paras = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      if (paras.length >= 3) {
        const v1 = paras[0], v2 = paras[1], v3 = paras.slice(2).join('\n\n');
        if (isComplete(v1, v2, v3)) return { v1, v2, v3 };
      }
      throw new Error('The model returned an incomplete review set. It did not finish all three variations; try again or choose another model.');
    };

    const fetchWithTimeout = async (url, options, timeoutMs = 15000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    };

    const callOpenAiCompatible = async (url, apiKey, model, provider) => {
      if (window.FrameRateAuth?.hasCloudCredential?.(provider)) {
        const response = await window.FrameRateAuth.invokeCredentialVault({
          action: 'chat', provider, model, system: sysInstruction, prompt: promptText,
          maxTokens: 2600, temperature: 0.68
        });
        return parseAiOutput(response.text || '');
      }
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: sysInstruction },
            { role: 'user', content: promptText }
          ],
          temperature: 0.68,
          max_tokens: 2600
        })
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} (${model}): ${errBody.slice(0, 80)}`);
      }
      const data = await res.json();
      return parseAiOutput(data.choices?.[0]?.message?.content || '');
    };

    const callSingleGeminiModel = async (apiKey, modelName) => {
      const cleanModel = modelName.replace(/^models\//, '');
      if (window.FrameRateAuth?.hasCloudCredential?.('gemini')) {
        const response = await window.FrameRateAuth.invokeCredentialVault({
          action: 'chat', provider: 'gemini', model: cleanModel, system: sysInstruction, prompt: promptText,
          maxTokens: 2600, temperature: 0.68
        });
        const parsed = parseAiOutput(response.text || '');
        return { ...parsed, _agentLabel: `Live: Gemini (${cleanModel})` };
      }
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${sysInstruction}\n\n${promptText}` }] }],
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ],
          generationConfig: {
            temperature: 0.68,
            maxOutputTokens: 2600
          }
        })
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => '');
        throw new Error(`Gemini ${cleanModel} (${res.status}): ${errTxt.slice(0, 70)}`);
      }
      const data = await res.json();
      const rawText = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n');
      const parsed = parseAiOutput(rawText);
      return { ...parsed, _agentLabel: `Live: Gemini (${cleanModel})` };
    };

    const callGeminiFast = async apiKey => {
      let liveModels = [];
      try {
        if (window.FrameRateAuth?.hasCloudCredential?.('gemini')) {
          const response = await window.FrameRateAuth.invokeCredentialVault({ action: 'models', provider: 'gemini' });
          liveModels = response.models || [];
        } else {
          liveModels = await this.fetchGeminiModelsFromApi(apiKey);
        }
      } catch (e) {}

      const tryList = [];
      if (chosenModel && chosenModel !== 'auto-discover' && chosenModel.includes('gemini')) {
        tryList.push(chosenModel);
      }
      liveModels.forEach(m => {
        if (!tryList.includes(m)) tryList.push(m);
      });
      ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'].forEach(m => {
        if (!tryList.includes(m)) tryList.push(m);
      });

      let firstErr = null;
      for (const mName of tryList.slice(0, 4)) {
        try {
          return await callSingleGeminiModel(apiKey, mName);
        } catch (err) {
          if (!firstErr) firstErr = err;
        }
      }
      throw firstErr || new Error('Gemini API call failed');
    };

    // Route by exact preset ownership first. Groq model IDs can contain slashes,
    // so they must not be mistaken for OpenRouter/OpenAI models.
    const lowerModel = chosenModel.toLowerCase();
    const presetProvider = Object.entries(this.modelPresets).find(([provider, models]) =>
      provider !== 'auto' && models.some(model => model.id === chosenModel)
    )?.[0];
    let targetAgent;

    if (chosenModel === 'local-critic') {
      targetAgent = 'local';
    } else if (keys.provider && keys.provider !== 'auto' &&
               ['gemini', 'groq', 'openai', 'openrouter'].includes(keys.provider) &&
               this.hasAvailableCredential(keys.provider)) {
      // The provider selected in API Vault is authoritative. The quick model
      // dropdown combines model lists, so a stale model must not route this
      // request to a different provider.
      targetAgent = keys.provider;
    } else if (chosenModel === 'auto-discover') {
      targetAgent = this.resolveActiveProvider('auto');
    } else if (presetProvider) {
      targetAgent = presetProvider;
    } else if (lowerModel.includes('gemini')) {
      targetAgent = 'gemini';
    } else if (lowerModel.includes('qwen') || lowerModel.includes('llama') || lowerModel.includes('gemma') || lowerModel.includes('mixtral') || lowerModel.includes('gpt-oss')) {
      targetAgent = 'groq';
    } else if (lowerModel.startsWith('gpt-')) {
      targetAgent = 'openai';
    } else if (lowerModel.includes('/')) {
      targetAgent = 'openrouter';
    } else {
      targetAgent = this.resolveActiveProvider('auto');
    }

    const modelIsCompatible = (provider, model) => {
      const value = String(model || '').trim().toLowerCase();
      if (!value || value === 'auto-discover' || value === 'local-critic') return false;
      if (provider === 'gemini') return value.startsWith('gemini-');
      if (provider === 'groq') return /^(qwen\/|openai\/|meta-llama\/|llama-)/i.test(value);
      if (provider === 'openai') return value.startsWith('gpt-');
      if (provider === 'openrouter') return value.includes('/');
      return false;
    };
    const modelForProvider = (provider, fallback) => {
      if (modelIsCompatible(provider, chosenModel)) return chosenModel;
      const storedModel = String(keys.model || '').trim();
      if (modelIsCompatible(provider, storedModel)) return storedModel;
      const firstProviderModel = (this.modelPresets[provider] || []).find(item =>
        item.id && item.id !== 'auto-discover' && item.id !== 'local-critic' && modelIsCompatible(provider, item.id)
      );
      return firstProviderModel ? firstProviderModel.id : fallback;
    };

    try {
      if (targetAgent === 'gemini') {
        if (!this.hasAvailableCredential('gemini')) throw new Error('Gemini API Key is empty in API Vault');
        return await callGeminiFast(keys.gemini);
      }
      if (targetAgent === 'groq') {
        if (!this.hasAvailableCredential('groq')) throw new Error('Groq API Key is empty in API Vault');
        const preferredModel = modelForProvider('groq', 'qwen/qwen3.8-27b');
        const candidates = [...new Set([preferredModel, 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'])];
        let firstGroqError = null;
        for (const model of candidates) {
          try {
            const out = await callOpenAiCompatible('https://api.groq.com/openai/v1/chat/completions', keys.groq, model, 'groq');
            return { ...out, _agentLabel: `Live: Groq (${model})` };
          } catch (error) {
            if (!firstGroqError) firstGroqError = error;
          }
        }
        throw firstGroqError || new Error('No available Groq model succeeded');
      }
      if (targetAgent === 'openai') {
        if (!this.hasAvailableCredential('openai')) throw new Error('OpenAI API Key is empty in API Vault');
        const m = modelForProvider('openai', 'gpt-4o-mini');
        const out = await callOpenAiCompatible('https://api.openai.com/v1/chat/completions', keys.openai, m, 'openai');
        return { ...out, _agentLabel: `Live: OpenAI (${m})` };
      }
      if (targetAgent === 'openrouter') {
        if (!this.hasAvailableCredential('openrouter')) throw new Error('OpenRouter API Key is empty in API Vault');
        const m = modelForProvider('openrouter', 'google/gemini-2.5-flash:free');
        const out = await callOpenAiCompatible('https://openrouter.ai/api/v1/chat/completions', keys.openrouter, m, 'openrouter');
        return { ...out, _agentLabel: `Live: OpenRouter (${m})` };
      }
    } catch (err) {
      // Do not send the user's prompt to a different provider without an explicit choice.
      const localOut = this.synthesizeLocalReviews(state, lang);
      return {
        ...localOut,
        _agentLabel: 'Local Critic Engine',
        _errorNote: err.name === 'AbortError' ? `${targetAgent.toUpperCase()} Timed Out` : err.message
      };
    }

    const localOut = this.synthesizeLocalReviews(state, lang);
    return { ...localOut, _agentLabel: 'Local Critic Engine' };
  },

  synthesizeLocalReviews(state, lang) {
    const film = state.film || { title: 'The Film', director: 'the director', year: '2024', genres: ['Cinema'] };
    const ratingStr = state.rating ? `${state.rating.toFixed(1)}/5` : 'Unrated';
    const craft = state.notes.craft.trim();
    const soul = state.notes.soul.trim();
    const friction = state.notes.friction.trim();
    const free = state.notes.free.trim();
    const vibes = state.vibes.length ? state.vibes.join(', ') : 'atmospheric, absorbing';

    if (lang === 'darija') {
      return {
        v1: `${film.title} (${film.year}): ${craft ? craft.split('.')[0] : 'خدمة بصرية وإخراجية متقونة من ' + film.director}، تجربة كتشدك من أول لقطة حتى للخر. (${ratingStr})`,
        v2: `ملي كتفرج فـ ${film.title} ديال المخرج ${film.director}، أول حاجة كتجبد انتباهك هي الجو العام (${vibes}). من ناحية الصنعة: ${craft || 'الإخراج والتصوير كانو فـ مستوى عالي بزاف'}. أما الروح ديال الفيلم: ${soul || 'الأداء التمثيلي خلا القصة تدخل للقلب بلا تصنع'}. ${friction ? 'رغم أن ' + friction + '،' : ''} كيبقى عمل يستاهل المشاهدة بـ تقييم ${ratingStr}.`,
        v3: `قراءة نقدية فـ ${film.title} (${film.year}): كيبني ${film.director} عالم سينمائي متكامل كيجمع بين ${(film.genres || ['الدراما']).join(' و ')}. القوة الحقيقية ديال العمل كاتجلى فـ ${craft || 'التحكم فـ الكاميرا والإيقاع البصري'}، موازاة مع ${soul || 'عمق الشخصيات وتفاعلها مع الفضاء الدرامي'}. ${friction ? 'وحتى مع ملاحظة ' + friction + '، فإن ' : ''}${free || 'الأثر الفني ديال الفيلم كيبقى راسخ طويل من بعد ما كيسالي الجينيريك.'}`
      };
    }

    if (lang === 'ar') {
      return {
        v1: `${film.title} (${film.year}): ${craft ? craft.split('.')[0] : 'رؤية بصرية آسرة من توقيع ' + film.director} تترك أثراً لا يُمحى. (${ratingStr})`,
        v2: `يقدّم ${film.director} في فيلم ${film.title} تجربة سينمائية تتسم بكونها ${vibes}. على صعيد الحرفة: ${craft || 'برز الإخراج والتصوير بدقة لافتة'}. أما من ناحية الروح والأداء: ${soul || 'كان الحضور التمثيلي صادقاً ومؤثراً للغاية'}. ${friction ? 'ورغم ' + friction + '، ' : ''}يظل الفيلم تجربة تستحق التقدير بتقييم ${ratingStr}.`,
        v3: `في ${film.title} (${film.year})، يصوغ ${film.director} لغة سينمائية تتجاوز السرد التقليدي. تتجلى براعة الصنعة في ${craft || 'تكوين الكادر وتوظيف الإضاءة والصوت'}، بينما يستمد العمل روحه من ${soul || 'أداء تمثيلي متقن يلامس جوهر الشخصيات'}. ${friction ? 'ومع أخذ ' + friction + ' بعين الاعتبار، ' : ''}${free || 'يبقى الفيلم شهادة حية على قوة السينما.'}`
      };
    }

    return {
      v1: `${film.title} (${film.year}): ${craft ? craft.split('.')[0] : film.director + ' conducts a masterclass in mood and visual tension'} — ${vibes} cinema that lingers. (${ratingStr})`,
      v2: `Watching ${film.director}'s ${film.title} (${film.year}) feels ${vibes}. On a craft level, ${craft || 'the framing, lighting, and sonic texture do heavy narrative lifting'}. What gives the film its pulse, however, is its soul: ${soul || 'the performances ground every frame in genuine human stakes'}. ${friction ? 'Even accounting for ' + friction + ', ' : ''}it easily earns its ${ratingStr} verdict.`,
      v3: `In ${film.title} (${film.year}), ${film.director} bridges ${(film.genres || ['Cinema']).join(' and ')} with deliberate formal rigor. The mise-en-scene thrives on ${craft || 'patient camera blocking and atmospheric precision'}, while the emotional architecture rests on ${soul || 'subtext-heavy performances that refuse easy sentimentality'}. ${friction ? 'While ' + friction + ' introduces minor friction, ' : ''}${free || 'the film remains a deeply cohesive piece of filmmaking with a distinct point of view.'}`
    };
  }
};

window.Api = Api;

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => Api.initStudioEnhancements(), 120);
});