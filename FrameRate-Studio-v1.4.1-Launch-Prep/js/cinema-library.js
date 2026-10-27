/* FrameRate Studio v1.3 — account-scoped Watchlist + Profile/Stats.
 * User-controlled text is always inserted via textContent; remote poster URLs are validated.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'fr_watchlist';
  const MAX_ITEMS = 1000;
  const STATUS = ['want_to_watch', 'watching', 'watched'];
  const MESSAGES = {
    en: { myCinema: 'My Cinema', title: 'Your film life, in one place', subtitle: 'Your watchlist, imported history and review stats.', watchlist: 'Watchlist', stats: 'Profile & Stats', add: '＋ Add to Watchlist', remove: 'Remove from Watchlist', open: 'Open My Cinema', all: 'All films', want: 'Want to Watch', watching: 'Watching', watched: 'Watched', search: 'Search your watchlist…', empty: 'Your watchlist is empty.', emptyHint: 'Search for a film, select it, then add it to your watchlist.', profileGuest: 'Guest profile', library: 'Letterboxd library', diary: 'Dated diary logs', ratings: 'Rated films', average: 'Average imported rating', saved: 'Saved review drafts', watchlistCount: 'Watchlist films', distribution: 'Rating distribution', status: 'Status', added: 'Added', removeConfirm: 'Remove this film from your watchlist?', allHistory: 'Imported entries are based on your Letterboxd ZIP/CSV or RSS data. Stats do not guess missing information.', noRatings: 'No imported ratings yet', noResults: 'No films match the current filter.', likedLabel: 'Liked films', rewatchesLabel: 'Rewatches', account: 'Signed-in profile', countLabel: 'films', statusWant: 'Want to Watch', statusWatching: 'Watching', statusWatched: 'Watched', addedToast: 'Added to your watchlist.', removedToast: 'Removed from your watchlist.', statusToast: 'Watchlist status updated.', noFilm: 'Select a film first to add it to your watchlist.' },
    darija: { myCinema: 'السينما ديالي', title: 'الحياة السينمائية ديالك فبلاصة وحدة', subtitle: 'Watchlist، سجل Letterboxd والإحصائيات ديال المراجعات.', watchlist: 'لائحة المشاهدة', stats: 'البروفايل والإحصائيات', add: '＋ زيد للائحة', remove: 'حيد من اللائحة', open: 'حل السينما ديالي', all: 'كاع الأفلام', want: 'باغي نتفرج', watching: 'كنشوف دابا', watched: 'تفرجت', search: 'قلب فاللائحة…', empty: 'اللائحة ديالك خاوية دابا.', emptyHint: 'قلب على فيلم، اختارو، ومن بعد زيدو للائحة ديالك.', profileGuest: 'حساب زائر', library: 'مكتبة Letterboxd', diary: 'مشاهدات بالتاريخ', ratings: 'أفلام عندها تقييم', average: 'معدل التقييمات المستوردة', saved: 'مسودات المراجعات المحفوظة', watchlistCount: 'أفلام فاللائحة', distribution: 'توزيع التقييمات', status: 'الحالة', added: 'تزاد', removeConfirm: 'واش متأكد بغيتي تحيد الفيلم من اللائحة؟', allHistory: 'المعطيات جاية من ZIP/CSV أو RSS ديال Letterboxd. ما كنخمّنش المعلومات الناقصة.', noRatings: 'مازال ما دخلتي حتى تقييم مستورد', noResults: 'ما كاين حتى فيلم مطابق لهاد الفلتر.', likedLabel: 'أفلام عجبوك', rewatchesLabel: 'إعادات المشاهدة', account: 'البروفايل', countLabel: 'أفلام', statusWant: 'باغي نتفرج', statusWatching: 'كنشوف دابا', statusWatched: 'تفرجت', addedToast: 'تزاد الفيلم للائحة ديالك.', removedToast: 'تحيد الفيلم من اللائحة.', statusToast: 'تبدلات حالة الفيلم.', noFilm: 'اختار فيلم الأول باش تزيدو للائحة.' },
    ar: { myCinema: 'سينمائي', title: 'حياتك السينمائية في مكان واحد', subtitle: 'قائمة المشاهدة وسجل Letterboxd وإحصائيات المراجعات.', watchlist: 'قائمة المشاهدة', stats: 'الملف الشخصي والإحصائيات', add: '＋ أضف للقائمة', remove: 'إزالة من القائمة', open: 'افتح سينمائي', all: 'كل الأفلام', want: 'أريد مشاهدته', watching: 'أشاهده الآن', watched: 'شاهدته', search: 'ابحث في قائمتك…', empty: 'قائمة المشاهدة فارغة.', emptyHint: 'ابحث عن فيلم وحدده ثم أضفه إلى القائمة.', profileGuest: 'ملف زائر', library: 'مكتبة Letterboxd', diary: 'سجلات مشاهدة مؤرخة', ratings: 'أفلام بتقييم', average: 'متوسط التقييمات المستوردة', saved: 'مسودات مراجعات محفوظة', watchlistCount: 'أفلام في القائمة', distribution: 'توزيع التقييمات', status: 'الحالة', added: 'أضيف', removeConfirm: 'هل تريد إزالة هذا الفيلم من القائمة؟', allHistory: 'البيانات مستمدة من ملفات Letterboxd أو RSS المستوردة. لا نخمن المعلومات الناقصة.', noRatings: 'لا توجد تقييمات مستوردة بعد', noResults: 'لا توجد أفلام تطابق هذا الفلتر.', likedLabel: 'أفلام أعجبتك', rewatchesLabel: 'إعادات المشاهدة', account: 'الملف المسجل', countLabel: 'أفلام', statusWant: 'أريد مشاهدته', statusWatching: 'أشاهده الآن', statusWatched: 'شاهدته', addedToast: 'تمت إضافة الفيلم إلى القائمة.', removedToast: 'تمت إزالة الفيلم من القائمة.', statusToast: 'تم تحديث حالة الفيلم.', noFilm: 'اختر فيلماً أولاً لإضافته إلى القائمة.' },
    fr: { myCinema: 'Mon Cinéma', title: 'Votre vie cinéphile au même endroit', subtitle: 'Liste de visionnage, historique Letterboxd et statistiques.', watchlist: 'À voir', stats: 'Profil & statistiques', add: '＋ Ajouter à la liste', remove: 'Retirer de la liste', open: 'Ouvrir Mon Cinéma', all: 'Tous les films', want: 'À voir', watching: 'En cours', watched: 'Vu', search: 'Rechercher dans la liste…', empty: 'Votre liste est vide.', emptyHint: 'Recherchez un film, sélectionnez-le puis ajoutez-le à votre liste.', profileGuest: 'Profil invité', library: 'Bibliothèque Letterboxd', diary: 'Entrées datées', ratings: 'Films notés', average: 'Note moyenne importée', saved: 'Brouillons de critiques', watchlistCount: 'Films dans la liste', distribution: 'Répartition des notes', status: 'Statut', added: 'Ajouté', removeConfirm: 'Retirer ce film de votre liste ?', allHistory: 'Les données proviennent des fichiers Letterboxd ou du flux RSS importés. Les données manquantes ne sont pas inventées.', noRatings: 'Aucune note importée', account: 'Profil connecté', countLabel: 'films', statusWant: 'À voir', statusWatching: 'En cours', statusWatched: 'Vu', addedToast: 'Film ajouté à la liste.', removedToast: 'Film retiré de la liste.', statusToast: 'Statut mis à jour.', noFilm: 'Sélectionnez d’abord un film.' },
    es: { myCinema: 'Mi Cine', title: 'Tu vida cinéfila en un solo lugar', subtitle: 'Lista, historial de Letterboxd y estadísticas.', watchlist: 'Por ver', stats: 'Perfil y estadísticas', add: '＋ Añadir a la lista', remove: 'Quitar de la lista', open: 'Abrir Mi Cine', all: 'Todas las películas', want: 'Por ver', watching: 'Viendo', watched: 'Vistas', search: 'Buscar en la lista…', empty: 'Tu lista está vacía.', emptyHint: 'Busca una película, selecciónala y añádela a la lista.', profileGuest: 'Perfil de invitado', library: 'Biblioteca de Letterboxd', diary: 'Registros con fecha', ratings: 'Películas puntuadas', average: 'Nota media importada', saved: 'Borradores guardados', watchlistCount: 'Películas en la lista', distribution: 'Distribución de notas', status: 'Estado', added: 'Añadida', removeConfirm: '¿Quitar esta película de tu lista?', allHistory: 'Los datos provienen de archivos o RSS de Letterboxd importados. No se inventan datos faltantes.', noRatings: 'Aún no hay notas importadas', account: 'Perfil conectado', countLabel: 'películas', statusWant: 'Por ver', statusWatching: 'Viendo', statusWatched: 'Vista', addedToast: 'Película añadida.', removedToast: 'Película eliminada.', statusToast: 'Estado actualizado.', noFilm: 'Selecciona primero una película.' },
    de: { myCinema: 'Mein Kino', title: 'Dein Filmleben an einem Ort', subtitle: 'Merkliste, Letterboxd-Verlauf und Statistiken.', watchlist: 'Merkliste', stats: 'Profil & Statistiken', add: '＋ Zur Merkliste', remove: 'Aus Merkliste entfernen', open: 'Mein Kino öffnen', all: 'Alle Filme', want: 'Möchte ich sehen', watching: 'Schaue ich gerade', watched: 'Gesehen', search: 'Merkliste durchsuchen…', empty: 'Deine Merkliste ist leer.', emptyHint: 'Suche einen Film, wähle ihn aus und füge ihn hinzu.', profileGuest: 'Gastprofil', library: 'Letterboxd-Bibliothek', diary: 'Datierte Einträge', ratings: 'Bewertete Filme', average: 'Durchschnitt importierter Bewertungen', saved: 'Gespeicherte Review-Entwürfe', watchlistCount: 'Filme auf der Merkliste', distribution: 'Bewertungsverteilung', status: 'Status', added: 'Hinzugefügt', removeConfirm: 'Film von der Merkliste entfernen?', allHistory: 'Daten stammen aus importierten Letterboxd-Dateien oder RSS. Fehlende Daten werden nicht erfunden.', noRatings: 'Noch keine importierten Bewertungen', account: 'Angemeldetes Profil', countLabel: 'Filme', statusWant: 'Möchte ich sehen', statusWatching: 'Schaue ich gerade', statusWatched: 'Gesehen', addedToast: 'Film hinzugefügt.', removedToast: 'Film entfernt.', statusToast: 'Status aktualisiert.', noFilm: 'Wähle zuerst einen Film.' },
    it: { myCinema: 'Il Mio Cinema', title: 'La tua vita cinematografica in un posto', subtitle: 'Lista da vedere, cronologia Letterboxd e statistiche.', watchlist: 'Da vedere', stats: 'Profilo e statistiche', add: '＋ Aggiungi alla lista', remove: 'Rimuovi dalla lista', open: 'Apri Il Mio Cinema', all: 'Tutti i film', want: 'Da vedere', watching: 'In visione', watched: 'Visto', search: 'Cerca nella lista…', empty: 'La lista è vuota.', emptyHint: 'Cerca un film, selezionalo e aggiungilo alla lista.', profileGuest: 'Profilo ospite', library: 'Libreria Letterboxd', diary: 'Voci con data', ratings: 'Film valutati', average: 'Media voti importati', saved: 'Bozze di recensione salvate', watchlistCount: 'Film nella lista', distribution: 'Distribuzione voti', status: 'Stato', added: 'Aggiunto', removeConfirm: 'Rimuovere questo film dalla lista?', allHistory: 'I dati provengono da file Letterboxd o RSS importati. I dati mancanti non vengono inventati.', noRatings: 'Nessun voto importato', account: 'Profilo connesso', countLabel: 'film', statusWant: 'Da vedere', statusWatching: 'In visione', statusWatched: 'Visto', addedToast: 'Film aggiunto.', removedToast: 'Film rimosso.', statusToast: 'Stato aggiornato.', noFilm: 'Seleziona prima un film.' }
  };

  const CinemaLibrary = {
    activeTab: 'watchlist',
    activeFilter: 'all',
    query: '',
    selectedIds: new Set(),
    sortMode: localStorage.getItem('fr_watchlist_sort') || 'newest',
    viewMode: localStorage.getItem('fr_watchlist_view') || 'list',
    searchTimer: null,
    searchRequest: 0,
    lastSearchResults: [],
    activeStatCategory: '',
    activeStatScore: '',
    activeStatItems: [],
    activeStatQuery: '',
    activeStatLimit: 24,
    statPosterCache: new Map(),
    statPosterRequests: new Map(),
    initialized: false,

    t(key) {
      const lang = window.I18n?.currentLang || 'en';
      return (MESSAGES[lang] || MESSAGES.en)[key] || MESSAGES.en[key] || key;
    },

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.ensureModal();
      this.bindEvents();
      this.wrapFilmSelection();
      this.refreshLabels();
      this.updateHeaderButton();
      this.updateCurrentFilmButton();
      const filmTitle = document.getElementById('filmTitleHeading');
      if (filmTitle && window.MutationObserver) {
        const observer = new MutationObserver(() => this.updateCurrentFilmButton());
        observer.observe(filmTitle, { childList: true, characterData: true, subtree: true });
      }
      window.addEventListener('frameratedataready', () => {
        this.updateHeaderButton();
        this.updateCurrentFilmButton();
        if (!document.getElementById('frCinemaModal')?.classList.contains('hidden')) this.render();
      });
      document.addEventListener('framelangchange', () => this.refreshLabels());
      if (window.I18n && typeof window.I18n.setLanguage === 'function' && !window.I18n.setLanguage.__frCinemaWrapped) {
        const originalSetLanguage = window.I18n.setLanguage.bind(window.I18n);
        const wrappedSetLanguage = function (lang) {
          const result = originalSetLanguage(lang);
          queueMicrotask(() => window.CinemaLibrary?.refreshLabels());
          return result;
        };
        wrappedSetLanguage.__frCinemaWrapped = true;
        window.I18n.setLanguage = wrappedSetLanguage;
      }
    },

    ensureModal() {
      if (document.getElementById('frCinemaModal')) return;
      const modal = document.createElement('div');
      modal.id = 'frCinemaModal';
      modal.className = 'fr-cinema-modal hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'frCinemaTitle');
      modal.innerHTML = `
        <button type="button" class="fr-cinema-backdrop" data-cinema-close aria-label="Close My Cinema"></button>
        <section class="fr-cinema-dialog" role="document">
          <header class="fr-cinema-header">
            <div class="min-w-0">
              <p class="fr-cinema-eyebrow">FRAMERATE / PERSONAL LIBRARY</p>
              <h2 id="frCinemaTitle" class="fr-cinema-title">Your film life, in one place</h2>
              <p id="frCinemaSubtitle" class="fr-cinema-subtitle">Your watchlist, imported history and review stats.</p>
            </div>
            <button type="button" class="fr-cinema-close" data-cinema-close aria-label="Close My Cinema">✕</button>
          </header>
          <div class="fr-cinema-profile-strip">
            <div id="frCinemaAvatar" class="fr-cinema-avatar">G</div>
            <div class="min-w-0"><p id="frCinemaProfileName" class="fr-cinema-profile-name">Guest profile</p><p id="frCinemaAccountLabel" class="fr-cinema-account-label">Guest mode · this browser</p></div>
            <span id="frCinemaSyncBadge" class="fr-cinema-sync-badge">Local</span>
          </div>
          <div class="fr-cinema-tabs" role="tablist" aria-label="My Cinema views">
            <button type="button" data-cinema-tab="watchlist" class="fr-cinema-tab active" role="tab" aria-selected="true">Watchlist</button>
            <button type="button" data-cinema-tab="stats" class="fr-cinema-tab" role="tab" aria-selected="false">Profile &amp; Stats</button>
          </div>
          <section id="frCinemaWatchlistPanel" class="fr-cinema-panel" role="tabpanel">
            <div class="fr-cinema-controls">
              <label class="fr-cinema-search-wrap"><span class="sr-only">Search films to add or filter watchlist</span><input id="frCinemaSearch" type="search" class="fr-cinema-search" placeholder="Search films…" autocomplete="off"></label>
              <label class="fr-cinema-filter-wrap"><span class="sr-only">Filter watchlist status</span><select id="frCinemaFilter" class="fr-cinema-filter"><option value="all">All films</option><option value="want_to_watch">Want to Watch</option><option value="watching">Watching</option><option value="watched">Watched</option></select></label>
            </div>
            <div class="fr-cinema-toolbar" aria-label="Watchlist tools">
              <div class="fr-cinema-toolbar-row">
                <label class="fr-cinema-select-all"><input id="frCinemaSelectAll" type="checkbox"><span>Select visible</span></label>
                <label class="fr-cinema-sort-wrap"><span class="sr-only">Sort watchlist</span><select id="frCinemaSort" class="fr-cinema-filter" aria-label="Sort watchlist"><option value="newest">Recently added</option><option value="oldest">Oldest added</option><option value="title">Title A–Z</option><option value="year">Year newest</option></select></label>
                <div class="fr-cinema-view-switch" role="group" aria-label="Watchlist layout">
                  <button type="button" data-watch-view="list" aria-pressed="true" title="List view">☷ List</button>
                  <button type="button" data-watch-view="grid" aria-pressed="false" title="Grid view">▦ Grid</button>
                </div>
              </div>
              <div id="frCinemaBulkActions" class="fr-cinema-bulk-actions hidden">
                <span id="frCinemaSelectedCount" class="fr-cinema-selected-count">0 selected</span>
                <label class="fr-cinema-bulk-status-wrap"><span class="sr-only">Set selected films status</span><select id="frCinemaBulkStatus" class="fr-cinema-filter" aria-label="Set status for selected films"><option value="want_to_watch">Want to Watch</option><option value="watching">Watching</option><option value="watched">Watched</option></select></label>
                <button type="button" class="fr-cinema-tool-button" data-watch-apply-status>Apply status</button>
                <button type="button" class="fr-cinema-tool-button danger" data-watch-remove-selected>Remove selected</button>
                <button type="button" class="fr-cinema-tool-button subtle" data-watch-clear-selection>Clear</button>
              </div>
            </div>
            <div id="frCinemaMovieSearchResults" class="fr-cinema-search-results hidden" aria-live="polite"></div>
            <div id="frCinemaWatchlistList" class="fr-cinema-list"></div>
          </section>
          <section id="frCinemaStatsPanel" class="fr-cinema-panel hidden" role="tabpanel">
            <div id="frCinemaStatsGrid" class="fr-cinema-stats-grid"></div>
            <div class="fr-cinema-rating-card"><div class="fr-cinema-section-title">Rating distribution</div><div id="frCinemaRatingDistribution" class="fr-cinema-rating-distribution"></div></div>
            <section id="frCinemaStatsFilmDrilldown" class="fr-cinema-stats-drilldown hidden"></section>
            <p id="frCinemaDataNote" class="fr-cinema-data-note">Imported entries are based on your Letterboxd ZIP/CSV or RSS data. Stats do not guess missing information.</p>
          </section>
        </section>`;
      document.body.appendChild(modal);
    },

    bindEvents() {
      const modal = document.getElementById('frCinemaModal');
      modal?.addEventListener('click', event => {
        const close = event.target.closest('[data-cinema-close]');
        if (close) { this.close(); return; }
        const tab = event.target.closest('[data-cinema-tab]');
        if (tab) { this.open(tab.dataset.cinemaTab); return; }
        const removeButton = event.target.closest('[data-watch-remove]');
        if (removeButton) { this.removeItem(removeButton.dataset.watchRemove); return; }
        const detailButton = event.target.closest('[data-watch-details]');
        if (detailButton) { void this.openFilmDetails(detailButton.dataset.watchDetails); return; }
        if (event.target.closest('[data-watch-view]')) { this.setViewMode(event.target.closest('[data-watch-view]').dataset.watchView); return; }
        if (event.target.closest('[data-watch-remove-selected]')) { this.removeSelectedItems(); return; }
        if (event.target.closest('[data-watch-apply-status]')) { this.applyBulkStatus(); return; }
        if (event.target.closest('[data-watch-clear-selection]')) { this.selectedIds.clear(); this.renderWatchlist(); return; }
        const addButton = event.target.closest('[data-watch-add-result]');
        if (addButton) { this.addSearchResult(Number(addButton.dataset.watchAddResult)); return; }
        const loadMore = event.target.closest('[data-stat-load-more]');
        if (loadMore) { this.activeStatLimit += 24; this.renderStatFilmTiles(); return; }
        const statCard = event.target.closest('[data-stat-category]');
        if (statCard) { this.showStatFilms(statCard.dataset.statCategory, statCard.dataset.statScore || ''); return; }
      });
      modal?.addEventListener('change', event => {
        if (event.target?.matches('[data-watch-status]')) this.setStatus(event.target.dataset.watchStatus, event.target.value);
        if (event.target?.matches('[data-watch-select]')) {
          const id = event.target.dataset.watchSelect;
          if (event.target.checked) this.selectedIds.add(id); else this.selectedIds.delete(id);
          event.target.closest('.fr-watch-card')?.classList.toggle('is-selected', event.target.checked);
          this.refreshBulkToolbar();
        }
        if (event.target?.id === 'frCinemaSelectAll') {
          this.getFilteredWatchlist().forEach(item => event.target.checked ? this.selectedIds.add(item.id) : this.selectedIds.delete(item.id));
          this.renderWatchlist();
        }
        if (event.target?.id === 'frCinemaFilter') { this.activeFilter = event.target.value; this.renderWatchlist(); }
        if (event.target?.id === 'frCinemaSort') {
          this.sortMode = event.target.value;
          try { localStorage.setItem('fr_watchlist_sort', this.sortMode); } catch (_) {}
          this.renderWatchlist();
        }
      });
      modal?.addEventListener('input', event => {
        if (event.target?.id === 'frCinemaSearch') {
          this.query = event.target.value;
          this.renderWatchlist();
          this.scheduleMovieSearch(this.query);
        }
        if (event.target?.matches?.('[data-stat-search]')) {
          this.activeStatQuery = event.target.value || '';
          this.activeStatLimit = 24;
          this.renderStatFilmTiles();
        }
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !modal?.classList.contains('hidden')) this.close();
      });
    },

    wrapFilmSelection() {
      const app = window.App;
      if (!app || typeof app.selectFilm !== 'function' || app.selectFilm.__frCinemaWrapped) return;
      const original = app.selectFilm;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        const update = () => window.CinemaLibrary?.updateCurrentFilmButton();
        if (result && typeof result.then === 'function') return result.finally(update);
        update();
        return result;
      };
      wrapped.__frCinemaWrapped = true;
      app.selectFilm = wrapped;
    },

    open(tab = 'watchlist') {
      this.activeTab = tab === 'stats' ? 'stats' : 'watchlist';
      this.query = document.getElementById('frCinemaSearch')?.value || '';
      const modal = document.getElementById('frCinemaModal');
      if (!modal) return;
      this.refreshLabels();
      this.render();
      modal.classList.remove('hidden');
      document.body.classList.add('fr-cinema-open');
      const focus = this.activeTab === 'watchlist' ? document.getElementById('frCinemaSearch') : document.querySelector('[data-cinema-tab="stats"]');
      setTimeout(() => focus?.focus(), 40);
    },

    close() {
      document.getElementById('frCinemaModal')?.classList.add('hidden');
      document.body.classList.remove('fr-cinema-open');
      document.getElementById('frMyCinemaBtn')?.focus();
    },

    refreshLabels() {
      const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
      setText('frMyCinemaLabel', this.t('myCinema'));
      setText('frCinemaTitle', this.t('title'));
      setText('frCinemaSubtitle', this.t('subtitle'));
      setText('frCinemaDataNote', this.t('allHistory'));
      document.querySelectorAll('[data-cinema-tab]').forEach(button => {
        button.textContent = this.t(button.dataset.cinemaTab === 'stats' ? 'stats' : 'watchlist');
      });
      const filter = document.getElementById('frCinemaFilter');
      if (filter) {
        const selected = filter.value || this.activeFilter;
        filter.replaceChildren();
        [['all','all'],['want_to_watch','want'],['watching','watching'],['watched','watched']].forEach(([value, key]) => {
          const option = document.createElement('option'); option.value = value; option.textContent = this.t(key); filter.appendChild(option);
        });
        filter.value = selected;
      }
      const search = document.getElementById('frCinemaSearch');
      if (search) search.placeholder = this.t('search');
      this.updateCurrentFilmButton();
    },

    safeUrl(value) {
      try {
        const url = new URL(String(value || ''));
        if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return '';
        return url.href;
      } catch (_) { return ''; }
    },

    cleanItem(item) {
      if (!item || typeof item !== 'object') return null;
      const title = String(item.title || '').trim().slice(0, 240);
      if (!title) return null;
      const status = STATUS.includes(item.status) ? item.status : 'want_to_watch';
      return {
        id: String(item.id || this.itemKey({ title, year: item.year })).slice(0, 300),
        title,
        year: String(item.year || '').slice(0, 12),
        poster: this.safeUrl(item.poster),
        backdrop: this.safeUrl(item.backdrop),
        source: String(item.source || '').slice(0, 30),
        status,
        addedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(item.addedAt || '')) ? item.addedAt : new Date().toISOString().slice(0, 10),
        updatedAt: /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(String(item.updatedAt || '')) ? item.updatedAt : ''
      };
    },

    itemKey(item) {
      return `${String(item?.title || '').trim().toLowerCase()}|${String(item?.year || '').trim()}`;
    },

    recordWatchlistEvent(item, action) {
      if (!item?.title || !['add', 'remove'].includes(action)) return;
      let events = {};
      try {
        const parsed = JSON.parse(localStorage.getItem('fr_watchlist_events') || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) events = parsed;
      } catch (_) { /* recreate a clean event map */ }
      events[this.itemKey(item)] = { action, updatedAt: new Date().toISOString() };
      const entries = Object.entries(events);
      if (entries.length > 2000) events = Object.fromEntries(entries.slice(-2000));
      try { localStorage.setItem('fr_watchlist_events', JSON.stringify(events)); }
      catch (error) { console.warn('[FrameRate Cinema] Could not save watchlist change history:', error); }
    },

    getWatchlist() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (!Array.isArray(raw)) return [];
        return raw.map(item => this.cleanItem(item)).filter(Boolean).slice(0, MAX_ITEMS);
      } catch (_) { return []; }
    },

    saveWatchlist(items) {
      const cleaned = (Array.isArray(items) ? items : []).map(item => this.cleanItem(item)).filter(Boolean).slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      } catch (error) {
        window.App?.showToast?.('Could not save watchlist. Browser storage may be full.');
        console.warn('[FrameRate Cinema] Watchlist save failed:', error);
        return false;
      }
      this.updateHeaderButton();
      this.updateCurrentFilmButton();
      if (!document.getElementById('frCinemaModal')?.classList.contains('hidden')) this.render();
      return true;
    },

    toggleCurrentFilm() {
      const film = window.App?.state?.film;
      if (!film?.title) { window.App?.showToast?.(this.t('noFilm')); return; }
      const watchlist = this.getWatchlist();
      const key = this.itemKey(film);
      const existing = watchlist.find(item => this.itemKey(item) === key);
      if (existing) {
        if (this.saveWatchlist(watchlist.filter(item => this.itemKey(item) !== key))) {
          this.recordWatchlistEvent(existing, 'remove');
          window.App?.showToast?.(this.t('removedToast'));
        }
      } else {
        const item = this.cleanItem({
          id: film.id ? `${film.source || 'film'}:${film.id}` : key,
          title: film.title,
          year: film.year,
          poster: film.poster,
          backdrop: film.backdrop || film.poster,
          source: film.source || '',
          status: 'want_to_watch',
          addedAt: new Date().toISOString().slice(0, 10)
        });
        if (!this.saveWatchlist([item, ...watchlist.filter(old => this.itemKey(old) !== key)])) return;
        this.recordWatchlistEvent(item, 'add');
        window.App?.showToast?.(this.t('addedToast'));
        this.activeTab = 'watchlist';
        this.render();
      }
    },

    setStatus(itemId, status) {
      if (!STATUS.includes(status)) return;
      const list = this.getWatchlist();
      const target = list.find(item => item.id === itemId || this.itemKey(item) === itemId);
      if (!target) return;
      target.status = status;
      target.updatedAt = new Date().toISOString();
      this.saveWatchlist(list);
      window.App?.showToast?.(this.t('statusToast'));
    },

    removeItem(itemId) {
      const list = this.getWatchlist();
      const target = list.find(item => item.id === itemId || this.itemKey(item) === itemId);
      if (!target) return;
      // Save a timestamped remove event as well as deleting locally, so the
      // account/cloud merge cannot re-introduce an older copy after refresh.
      const saved = this.saveWatchlist(list.filter(item => !(item.id === itemId || this.itemKey(item) === itemId)));
      if (!saved) return;
      this.recordWatchlistEvent(target, 'remove');
      window.App?.showToast?.(this.t('removedToast'));
    },

    updateHeaderButton() {
      const count = document.getElementById('frWatchlistCount');
      const list = this.getWatchlist();
      if (count) count.textContent = String(list.length);
      const button = document.getElementById('frMyCinemaBtn');
      if (button) button.setAttribute('aria-label', `${this.t('myCinema')}, ${list.length} films`);
    },

    updateCurrentFilmButton() {
      const button = document.getElementById('frWatchlistToggleBtn');
      const status = document.getElementById('frWatchlistFilmStatus');
      const film = window.App?.state?.film;
      if (!button) return;
      const hasFilm = Boolean(film?.title);
      button.disabled = !hasFilm;
      if (!hasFilm) {
        button.textContent = this.t('add');
        if (status) status.textContent = '';
        return;
      }
      const item = this.getWatchlist().find(entry => this.itemKey(entry) === this.itemKey(film));
      button.textContent = item ? `✓ ${this.t('remove')}` : this.t('add');
      button.classList.toggle('is-saved', Boolean(item));
      if (status) status.textContent = item ? `${this.t('status')}: ${this.statusLabel(item.status)}` : '';
    },

    statusLabel(status) {
      const key = status === 'watching' ? 'statusWatching' : status === 'watched' ? 'statusWatched' : 'statusWant';
      return this.t(key);
    },

    render() {
      this.updateHeaderButton();
      this.updateCurrentFilmButton();
      const watchPanel = document.getElementById('frCinemaWatchlistPanel');
      const statsPanel = document.getElementById('frCinemaStatsPanel');
      const watchTab = document.querySelector('[data-cinema-tab="watchlist"]');
      const statsTab = document.querySelector('[data-cinema-tab="stats"]');
      const isWatchlist = this.activeTab === 'watchlist';
      this.updateProfileHeader();
      watchPanel?.classList.toggle('hidden', !isWatchlist);
      statsPanel?.classList.toggle('hidden', isWatchlist);
      watchTab?.classList.toggle('active', isWatchlist);
      statsTab?.classList.toggle('active', !isWatchlist);
      watchTab?.setAttribute('aria-selected', String(isWatchlist));
      statsTab?.setAttribute('aria-selected', String(!isWatchlist));
      if (isWatchlist) this.renderWatchlist(); else this.renderStats();
    },

    getFilteredWatchlist() {
      const query = String(this.query || '').trim().toLowerCase();
      const list = this.getWatchlist().filter(item => {
        const filterOk = this.activeFilter === 'all' || item.status === this.activeFilter;
        const queryOk = !query || `${item.title} ${item.year}`.toLowerCase().includes(query);
        return filterOk && queryOk;
      });
      const sorters = {
        newest: (a, b) => String(b.addedAt).localeCompare(String(a.addedAt)) || a.title.localeCompare(b.title),
        oldest: (a, b) => String(a.addedAt).localeCompare(String(b.addedAt)) || a.title.localeCompare(b.title),
        title: (a, b) => a.title.localeCompare(b.title) || String(b.year).localeCompare(String(a.year)),
        year: (a, b) => String(b.year || '').localeCompare(String(a.year || '')) || a.title.localeCompare(b.title)
      };
      return list.sort(sorters[this.sortMode] || sorters.newest);
    },

    setViewMode(mode) {
      this.viewMode = mode === 'grid' ? 'grid' : 'list';
      try { localStorage.setItem('fr_watchlist_view', this.viewMode); } catch (_) {}
      this.renderWatchlist();
    },

    refreshBulkToolbar(visibleItems = null) {
      const list = visibleItems || this.getFilteredWatchlist();
      const toolbar = document.getElementById('frCinemaBulkActions');
      const count = document.getElementById('frCinemaSelectedCount');
      const selectAll = document.getElementById('frCinemaSelectAll');
      const view = document.getElementById('frCinemaWatchlistList');
      const visibleIds = new Set(list.map(item => item.id));
      const selectedVisible = [...this.selectedIds].filter(id => visibleIds.has(id)).length;
      if (toolbar) toolbar.classList.toggle('hidden', this.selectedIds.size === 0);
      if (count) count.textContent = `${this.selectedIds.size} selected`;
      if (selectAll) {
        selectAll.checked = list.length > 0 && selectedVisible === list.length;
        selectAll.indeterminate = selectedVisible > 0 && selectedVisible < list.length;
        selectAll.disabled = list.length === 0;
      }
      document.querySelectorAll('[data-watch-view]').forEach(button => {
        const active = button.dataset.watchView === this.viewMode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (view) view.classList.toggle('is-grid', this.viewMode === 'grid');
      const sort = document.getElementById('frCinemaSort');
      if (sort && sort.value !== this.sortMode) sort.value = this.sortMode;
    },

    renderWatchlist() {
      const container = document.getElementById('frCinemaWatchlistList');
      if (!container) return;
      container.replaceChildren();
      if (!['newest', 'oldest', 'title', 'year'].includes(this.sortMode)) this.sortMode = 'newest';
      if (!['grid', 'list'].includes(this.viewMode)) this.viewMode = 'list';
      const allItems = this.getWatchlist();
      const allIds = new Set(allItems.map(item => item.id));
      this.selectedIds = new Set([...this.selectedIds].filter(id => allIds.has(id)));
      const list = this.getFilteredWatchlist();
      if (!list.length) {
        const empty = document.createElement('div'); empty.className = 'fr-cinema-empty';
        const mark = document.createElement('div'); mark.className = 'fr-cinema-empty-mark'; mark.textContent = '▤';
        const title = document.createElement('h3'); title.textContent = allItems.length ? this.t('noResults') : this.t('empty');
        const hint = document.createElement('p'); hint.textContent = this.t('emptyHint');
        empty.append(mark, title, hint); container.appendChild(empty);
        this.refreshBulkToolbar(list);
        return;
      }
      list.forEach(item => {
        const card = document.createElement('article'); card.className = 'fr-watch-card';
        const selectionLabel = document.createElement('label'); selectionLabel.className = 'fr-watch-select-label'; selectionLabel.title = `Select ${item.title}`;
        const selection = document.createElement('input'); selection.type = 'checkbox'; selection.className = 'fr-watch-select'; selection.dataset.watchSelect = item.id; selection.checked = this.selectedIds.has(item.id); selection.setAttribute('aria-label', `Select ${item.title}`);
        selectionLabel.appendChild(selection);
        const posterWrap = document.createElement('div'); posterWrap.className = 'fr-watch-poster-wrap';
        if (item.poster) {
          const img = document.createElement('img'); img.src = item.poster; img.alt = `${item.title} poster`; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
          img.onerror = () => { img.remove(); const fallback = document.createElement('div'); fallback.className = 'fr-watch-poster-fallback'; fallback.textContent = '🎬'; posterWrap.appendChild(fallback); };
          posterWrap.appendChild(img);
        } else { const fallback = document.createElement('div'); fallback.className = 'fr-watch-poster-fallback'; fallback.textContent = '🎬'; posterWrap.appendChild(fallback); }
        const info = document.createElement('div'); info.className = 'fr-watch-info';
        const title = document.createElement('h3'); title.className = 'fr-watch-title'; title.textContent = item.title;
        const meta = document.createElement('p'); meta.className = 'fr-watch-meta'; meta.textContent = [item.year, `${this.t('added')}: ${item.addedAt}`].filter(Boolean).join(' · ');
        info.append(title, meta);
        const controls = document.createElement('div'); controls.className = 'fr-watch-controls';
        const selectLabel = document.createElement('label'); selectLabel.className = 'sr-only'; selectLabel.textContent = this.t('status');
        const select = document.createElement('select'); select.className = 'fr-cinema-filter fr-watch-status'; select.dataset.watchStatus = item.id; select.setAttribute('aria-label', `${this.t('status')} for ${item.title}`);
        [['want_to_watch','statusWant'],['watching','statusWatching'],['watched','statusWatched']].forEach(([value,key]) => { const opt = document.createElement('option'); opt.value = value; opt.textContent = this.t(key); opt.selected = value === item.status; select.appendChild(opt); });
        selectLabel.appendChild(select);
        const details = document.createElement('button'); details.type = 'button'; details.className = 'fr-watch-details'; details.dataset.watchDetails = item.id; details.textContent = 'Film & Details'; details.title = `Open ${item.title} in Film & Details`;
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'fr-watch-remove'; remove.dataset.watchRemove = item.id; remove.textContent = '×'; remove.setAttribute('aria-label', `${this.t('remove')} ${item.title}`); remove.title = this.t('remove');
        controls.append(selectLabel, details, remove);
        card.append(selectionLabel, posterWrap, info, controls); container.appendChild(card);
      });
      this.refreshBulkToolbar(list);
    },

    async openFilmDetails(itemId) {
      const item = this.getWatchlist().find(entry => entry.id === itemId);
      if (!item) return;
      const title = item.title;
      let candidate = null;
      try {
        const results = typeof window.Api?.searchMovies === 'function' ? await window.Api.searchMovies(title) : [];
        const normalize = value => this.normalizeFilmTitle(value);
        const wantedYear = String(item.year || '').trim();
        candidate = (results || []).find(movie => normalize(movie.title) === normalize(title) && wantedYear && String(movie.year || '').trim() === wantedYear)
          || (results || []).find(movie => normalize(movie.title) === normalize(title))
          || null;
      } catch (error) {
        console.warn('[FrameRate Cinema] Could not resolve watchlist film for Film & Details:', error);
      }
      if (!candidate) {
        let id = String(item.id || '');
        if (item.source && id.startsWith(`${item.source}:`)) id = id.slice(item.source.length + 1);
        candidate = { id, source: item.source || '', title: item.title, year: item.year, poster: item.poster, backdrop: item.backdrop || item.poster };
      }
      const app = window.App;
      if (!app || typeof app.selectFilm !== 'function') {
        window.App?.showToast?.('Film details are not available right now.');
        return;
      }
      this.close();
      try {
        const lbData = typeof app.findInLbLibrary === 'function' ? app.findInLbLibrary(candidate.title || item.title, candidate.year || item.year) : null;
        await app.selectFilm(candidate, lbData);
      } catch (error) {
        console.warn('[FrameRate Cinema] Could not open selected watchlist film:', error);
        window.App?.showToast?.('Could not open film details. Try searching for this title from Film & Details.');
      }
    },

    removeSelectedItems() {
      const selected = new Set(this.selectedIds);
      if (!selected.size) return;
      const list = this.getWatchlist();
      const removed = list.filter(item => selected.has(item.id));
      if (!removed.length) { this.selectedIds.clear(); this.renderWatchlist(); return; }
      if (!this.saveWatchlist(list.filter(item => !selected.has(item.id)))) return;
      removed.forEach(item => this.recordWatchlistEvent(item, 'remove'));
      this.selectedIds.clear();
      window.App?.showToast?.(`Removed ${removed.length} film${removed.length === 1 ? '' : 's'} from your watchlist.`);
      this.renderWatchlist();
    },

    applyBulkStatus() {
      const selected = new Set(this.selectedIds);
      const status = document.getElementById('frCinemaBulkStatus')?.value;
      if (!selected.size || !STATUS.includes(status)) return;
      const list = this.getWatchlist();
      let changed = 0;
      list.forEach(item => {
        if (selected.has(item.id) && item.status !== status) {
          item.status = status;
          item.updatedAt = new Date().toISOString();
          changed += 1;
        }
      });
      if (!changed) { window.App?.showToast?.('Selected films already have that status.'); return; }
      this.saveWatchlist(list);
      window.App?.showToast?.(`Updated status for ${changed} film${changed === 1 ? '' : 's'}.`);
    },

    scheduleMovieSearch(query) {
      clearTimeout(this.searchTimer);
      const panel = document.getElementById('frCinemaMovieSearchResults');
      if (!panel) return;
      if (String(query || '').trim().length < 2) { panel.classList.add('hidden'); panel.replaceChildren(); return; }
      const requestId = ++this.searchRequest;
      this.searchTimer = setTimeout(async () => {
        panel.classList.remove('hidden'); panel.textContent = 'Searching the movie catalogue…';
        try {
          const results = await window.Api.searchMovies(String(query).trim());
          if (requestId !== this.searchRequest) return;
          panel.replaceChildren();
          const saved = this.getWatchlist();
          const matches = (results || []).slice(0, 8);
          this.lastSearchResults = matches;
          if (!matches.length) { panel.textContent = 'No movie results. Check the movie catalogue connection and try again.'; return; }
          matches.forEach((movie, index) => {
            const row = document.createElement('article'); row.className = 'fr-cinema-search-result';
            const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy'; img.src = this.safeUrl(movie.poster) || ''; img.onerror = () => img.remove();
            const info = document.createElement('div'); info.className = 'fr-cinema-search-result-info';
            const title = document.createElement('strong'); title.textContent = movie.title || 'Untitled film';
            const year = document.createElement('span'); year.textContent = String(movie.year || ''); info.append(title, year);
            const exists = saved.some(item => this.itemKey(item) === this.itemKey(movie));
            const add = document.createElement('button'); add.type = 'button'; add.className = 'fr-cinema-search-add'; add.dataset.watchAddResult = String(index); add.textContent = exists ? 'Already saved' : '+ Add'; add.disabled = exists;
            row.append(img, info, add); panel.appendChild(row);
          });
        } catch (error) {
          if (requestId !== this.searchRequest) return;
          panel.textContent = 'Search could not reach the movie catalogue. Check movie-data-proxy logs and allowed origins.';
          console.warn('[FrameRate Cinema] Watchlist movie search failed:', error);
        }
      }, 300);
    },

    addSearchResult(index) {
      const movie = this.lastSearchResults?.[index]; if (!movie) return;
      const list = this.getWatchlist();
      if (list.some(item => this.itemKey(item) === this.itemKey(movie))) { window.App?.showToast?.('This film is already in your watchlist.'); return; }
      const cleaned = this.cleanItem({ id: movie.id ? `${movie.source || 'film'}:${movie.id}` : this.itemKey(movie), title: movie.title, year: movie.year, poster: movie.poster, backdrop: movie.backdrop, source: movie.source, status: 'want_to_watch', addedAt: new Date().toISOString().slice(0, 10) });
      if (!cleaned || !this.saveWatchlist([cleaned, ...list])) return;
      this.recordWatchlistEvent(cleaned, 'add');
      window.App?.showToast?.(this.t('addedToast')); this.renderWatchlist(); this.scheduleMovieSearch(this.query);
    },

    letterboxdUrl(item) {
      for (const value of [item?.uri, item?.url, item?.letterboxdUrl, item?.letterboxd_url]) {
        try { const url = new URL(String(value || '')); if (url.protocol === 'https:' && (url.hostname === 'letterboxd.com' || url.hostname.endsWith('.letterboxd.com'))) return url.href; } catch (_) {}
      }
      const slug = String(item?.title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return slug ? `https://letterboxd.com/film/${slug}/` : 'https://letterboxd.com/';
    },

    showStatFilms(category, score = '') {
      const panel = document.getElementById('frCinemaStatsFilmDrilldown'); if (!panel) return;
      const library = this.readArray('fr_lb_zip_library', 3000);
      const reviews = this.readArray('fr_saved_reviews', 100);
      const watchlist = this.getWatchlist();
      let items = [], heading = category;
      if (category === 'watchlist') { items = watchlist; heading = this.t('watchlist'); }
      else if (category === 'library') { items = library; heading = this.t('library'); }
      else if (category === 'diary') { items = library.filter(x => x.watchedDate); heading = this.t('diary'); }
      else if (category === 'ratings') { items = library.filter(x => Number(x.rating) > 0); heading = this.t('ratings'); }
      else if (category === 'liked') { items = library.filter(x => x.liked); heading = this.t('likedLabel'); }
      else if (category === 'rewatches') { items = library.filter(x => x.rewatch); heading = this.t('rewatchesLabel'); }
      else if (category === 'rating') { items = library.filter(x => Number(x.rating) > 0 && (Math.round(Number(x.rating) * 2) / 2).toFixed(1) === String(score)); heading = `${score} ★`; }
      else if (category === 'reviews') { items = reviews.map(x => ({ ...x, title: x.filmTitle || x.title || x.film?.title || 'Saved review', posterUrl: x.posterUrl || x.poster || x.film?.poster, year: x.year || x.film?.year })); heading = this.t('saved'); }

      this.activeStatCategory = category;
      this.activeStatScore = String(score || '');
      this.activeStatItems = items;
      this.activeStatQuery = '';
      this.activeStatLimit = 24;
      panel.replaceChildren();

      const top = document.createElement('div'); top.className = 'fr-cinema-drilldown-header';
      const title = document.createElement('h3'); title.textContent = heading;
      const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.className = 'fr-cinema-drilldown-close';
      close.addEventListener('click', () => panel.classList.add('hidden'));
      top.append(title, close);

      const searchWrap = document.createElement('label'); searchWrap.className = 'fr-cinema-stats-search-wrap';
      const searchLabel = document.createElement('span'); searchLabel.className = 'sr-only'; searchLabel.textContent = `Search ${heading}`;
      const search = document.createElement('input'); search.type = 'search'; search.className = 'fr-cinema-stats-search';
      search.dataset.statSearch = 'true'; search.placeholder = `Search ${heading} by title or year…`;
      search.setAttribute('aria-label', `Search films in ${heading}`); search.autocomplete = 'off';
      searchWrap.append(searchLabel, search);

      const count = document.createElement('p'); count.className = 'fr-cinema-stats-results-count'; count.dataset.statResultsCount = 'true';
      const empty = document.createElement('p'); empty.className = 'fr-cinema-data-note hidden'; empty.dataset.statEmpty = 'true'; empty.textContent = 'No films match this search.';
      const grid = document.createElement('div'); grid.className = 'fr-cinema-film-grid';
      const moreWrap = document.createElement('div'); moreWrap.className = 'fr-cinema-stats-more-wrap';
      const more = document.createElement('button'); more.type = 'button'; more.className = 'fr-cinema-stats-more'; more.dataset.statLoadMore = 'true'; more.textContent = 'Load more films';
      moreWrap.appendChild(more);
      panel.append(top, searchWrap, count, empty, grid, moreWrap);
      panel.classList.remove('hidden');
      this.renderStatFilmTiles();
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      search.focus({ preventScroll: true });
    },

    statPosterUrl(item) {
      return this.safeUrl(item?.posterUrl || item?.poster || item?.image || item?.poster_url || item?.film?.poster || item?.film?.posterUrl);
    },

    renderStatFilmTiles() {
      const panel = document.getElementById('frCinemaStatsFilmDrilldown');
      const grid = panel?.querySelector('.fr-cinema-film-grid');
      const count = panel?.querySelector('[data-stat-results-count]');
      const empty = panel?.querySelector('[data-stat-empty]');
      const moreWrap = panel?.querySelector('.fr-cinema-stats-more-wrap');
      if (!panel || !grid) return;
      const query = String(this.activeStatQuery || '').trim().toLowerCase();
      const filtered = this.activeStatItems.filter(item => {
        const text = [item?.title, item?.year, item?.director, item?.review, ...(Array.isArray(item?.tags) ? item.tags : [])].filter(Boolean).join(' ').toLowerCase();
        return !query || text.includes(query);
      });
      const visible = filtered.slice(0, this.activeStatLimit);
      if (count) count.textContent = filtered.length > visible.length || query ? `${visible.length} shown · ${filtered.length} matches` : `${filtered.length} films`;
      if (empty) { empty.classList.toggle('hidden', filtered.length > 0); empty.textContent = query ? 'No films match this search.' : 'There are no films in this category yet.'; }
      if (moreWrap) moreWrap.classList.toggle('hidden', filtered.length <= visible.length);
      grid.replaceChildren();
      visible.forEach(item => {
        const link = document.createElement('a'); link.className = 'fr-cinema-film-tile';
        link.href = this.letterboxdUrl(item); link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.dataset.statPosterKey = this.itemKey(item);
        const poster = this.statPosterUrl(item) || this.statPosterCache.get(this.itemKey(item)) || '';
        if (poster) {
          const img = document.createElement('img'); img.src = poster; img.alt = `${item.title || 'Film'} poster`; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
          img.onerror = () => { const fallback = document.createElement('div'); fallback.className = 'fr-cinema-film-placeholder'; fallback.textContent = '🎬'; img.replaceWith(fallback); };
          link.appendChild(img);
        } else {
          const placeholder = document.createElement('div'); placeholder.className = 'fr-cinema-film-placeholder'; placeholder.dataset.statPosterPlaceholder = 'true'; placeholder.textContent = '🎬';
          link.appendChild(placeholder);
        }
        const name = document.createElement('span'); name.textContent = `${item.title || 'Film'}${item.year ? ` (${item.year})` : ''}`;
        link.appendChild(name); grid.appendChild(link);
      });
      // Imported Letterboxd ZIP/CSV records have title/year/link but often no poster.
      // Resolve only films currently displayed, and limit concurrency to avoid API bursts.
      void this.hydrateStatPosters(visible.filter(item => !this.statPosterUrl(item) && !this.statPosterCache.has(this.itemKey(item))));
    },

    async hydrateStatPosters(items) {
      const queue = items.slice();
      const worker = async () => {
        while (queue.length) {
          const item = queue.shift();
          if (!item?.title) continue;
          const key = this.itemKey(item);
          if (this.statPosterCache.has(key)) continue;
          if (this.statPosterRequests.has(key)) { await this.statPosterRequests.get(key); continue; }
          if (typeof window.Api?.searchMovies !== 'function') { this.statPosterCache.set(key, ''); continue; }
          const request = (async () => {
            try {
              const results = await window.Api.searchMovies(item.title);
              const wantedTitle = this.normalizeFilmTitle(item.title);
              const wantedYear = String(item.year || '').trim();
              const matched = (results || []).find(candidate => this.normalizeFilmTitle(candidate.title) === wantedTitle && (!wantedYear || !candidate.year || String(candidate.year) === wantedYear))
                || (results || []).find(candidate => this.normalizeFilmTitle(candidate.title) === wantedTitle)
                || (results || [])[0];
              const poster = this.safeUrl(matched?.poster);
              this.statPosterCache.set(key, poster || '');
              if (poster) this.persistLibraryPoster(item, poster);
              this.applyStatPosterToTile(key, poster);
              return poster;
            } catch (error) {
              this.statPosterCache.set(key, '');
              console.warn('[FrameRate Cinema] Could not resolve poster for', item.title, error);
              return '';
            } finally {
              this.statPosterRequests.delete(key);
            }
          })();
          this.statPosterRequests.set(key, request);
          await request;
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, queue.length) }, () => worker()));
    },

    normalizeFilmTitle(value) {
      return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    },

    applyStatPosterToTile(key, poster) {
      if (!poster) return;
      const panel = document.getElementById('frCinemaStatsFilmDrilldown');
      const tile = Array.from(panel?.querySelectorAll('[data-stat-poster-key]') || []).find(node => node.dataset.statPosterKey === key);
      const placeholder = tile?.querySelector('[data-stat-poster-placeholder]');
      if (!tile || !placeholder) return;
      const img = document.createElement('img'); img.src = poster; img.alt = `${tile.querySelector('span')?.textContent || 'Film'} poster`; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
      img.onerror = () => { const fallback = document.createElement('div'); fallback.className = 'fr-cinema-film-placeholder'; fallback.textContent = '🎬'; img.replaceWith(fallback); };
      placeholder.replaceWith(img);
    },

    persistLibraryPoster(item, poster) {
      // Cache the resolved poster on its matching imported record so subsequent
      // visits don't need another catalogue query for the same title/year.
      const library = this.readArray('fr_lb_zip_library', 3000);
      const index = library.findIndex(entry => this.itemKey(entry) === this.itemKey(item));
      if (index >= 0 && !this.statPosterUrl(library[index])) {
        library[index] = { ...library[index], posterUrl: poster };
        try { localStorage.setItem('fr_lb_zip_library', JSON.stringify(library)); }
        catch (error) { console.warn('[FrameRate Cinema] Could not cache imported film poster:', error); }
      }
      const watchlist = this.getWatchlist();
      const watchIndex = watchlist.findIndex(entry => this.itemKey(entry) === this.itemKey(item));
      if (watchIndex >= 0 && !this.statPosterUrl(watchlist[watchIndex])) {
        watchlist[watchIndex] = { ...watchlist[watchIndex], poster };
        try { localStorage.setItem('fr_watchlist', JSON.stringify(watchlist)); }
        catch (error) { console.warn('[FrameRate Cinema] Could not cache watchlist poster:', error); }
      }
    },

    readArray(key, max) {
      try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.slice(0, max) : []; }
      catch (_) { return []; }
    },

    updateProfileHeader() {
      const user = window.FrameRateAuth?.currentUser;
      const email = String(user?.email || '').trim();
      const profileEl = document.getElementById('frCinemaProfileName'); if (profileEl) profileEl.textContent = email || this.t('profileGuest');
      const accountEl = document.getElementById('frCinemaAccountLabel'); if (accountEl) accountEl.textContent = user ? this.t('account') : this.t('profileGuest');
      const avatar = document.getElementById('frCinemaAvatar'); if (avatar) avatar.textContent = (email || 'G').trim().charAt(0).toUpperCase();
      const sync = document.getElementById('frCinemaSyncBadge'); if (sync) { sync.textContent = user && window.FrameRateAuth?.cloudReady ? 'Cloud synced' : 'Local'; sync.classList.toggle('connected', Boolean(user && window.FrameRateAuth?.cloudReady)); }
    },

    renderStats() {
      const grid = document.getElementById('frCinemaStatsGrid');
      const dist = document.getElementById('frCinemaRatingDistribution');
      if (!grid || !dist) return;
      grid.replaceChildren(); dist.replaceChildren();
      const drilldown = document.getElementById('frCinemaStatsFilmDrilldown'); if (drilldown) { drilldown.replaceChildren(); drilldown.classList.add('hidden'); }
      const library = this.readArray('fr_lb_zip_library', 3000);
      const reviews = this.readArray('fr_saved_reviews', 100);
      const watchlist = this.getWatchlist();
      const diary = library.filter(item => String(item.watchedDate || '').trim()).length;
      const rated = library.filter(item => Number.isFinite(Number(item.rating)) && Number(item.rating) > 0).map(item => Number(item.rating));
      const average = rated.length ? rated.reduce((sum, val) => sum + val, 0) / rated.length : null;
      const liked = library.filter(item => Boolean(item.liked)).length;
      const rewatched = library.filter(item => Boolean(item.rewatch)).length;
      const stats = [
        { label: this.t('watchlistCount'), value: watchlist.length, note: this.t('countLabel'), category: 'watchlist' },
        { label: this.t('library'), value: library.length, note: 'ZIP / CSV / RSS', category: 'library' },
        { label: this.t('diary'), value: diary, note: this.t('countLabel'), category: 'diary' },
        { label: this.t('ratings'), value: rated.length, note: this.t('countLabel'), category: 'ratings' },
        { label: this.t('average'), value: average === null ? '—' : `${average.toFixed(2)}/5`, note: average === null ? this.t('noRatings') : `${rated.length} ratings`, category: 'ratings' },
        { label: this.t('saved'), value: reviews.length, note: this.t('countLabel'), category: 'reviews' },
        { label: this.t('likedLabel'), value: liked, note: this.t('countLabel'), category: 'liked' },
        { label: this.t('rewatchesLabel'), value: rewatched, note: this.t('countLabel'), category: 'rewatches' }
      ];
      stats.forEach(stat => {
        const card = document.createElement('button'); card.type = 'button'; card.dataset.statCategory = stat.category; card.className = 'fr-cinema-stat-card fr-cinema-stat-clickable'; card.setAttribute('aria-label', `${stat.label}: show related films`);
        const label = document.createElement('p'); label.className = 'fr-cinema-stat-label'; label.textContent = stat.label;
        const value = document.createElement('strong'); value.className = 'fr-cinema-stat-value'; value.textContent = String(stat.value);
        const note = document.createElement('span'); note.className = 'fr-cinema-stat-note'; note.textContent = stat.note;
        card.append(label, value, note); grid.appendChild(card);
      });

      const counts = new Map();
      rated.forEach(rating => {
        const value = Math.max(0.5, Math.min(5, Math.round(rating * 2) / 2));
        counts.set(value, (counts.get(value) || 0) + 1);
      });
      const maxCount = Math.max(1, ...counts.values());
      for (let score = 5; score >= 0.5; score -= 0.5) {
        const count = counts.get(score) || 0;
        const row = document.createElement('button'); row.type = 'button'; row.dataset.statCategory = 'rating'; row.dataset.statScore = score.toFixed(1); row.className = 'fr-cinema-rating-row fr-cinema-stat-clickable'; row.setAttribute('aria-label', `Show films rated ${score.toFixed(1)} stars`);
        const label = document.createElement('span'); label.className = 'fr-cinema-rating-label'; label.textContent = `${score.toFixed(1)} ★`;
        const track = document.createElement('div'); track.className = 'fr-cinema-rating-track';
        const fill = document.createElement('div'); fill.className = 'fr-cinema-rating-fill'; fill.style.width = `${count ? Math.max(3, count / maxCount * 100) : 0}%`; track.appendChild(fill);
        const value = document.createElement('span'); value.className = 'fr-cinema-rating-count'; value.textContent = String(count);
        row.append(label, track, value); dist.appendChild(row);
      }
    }
  };

  window.CinemaLibrary = CinemaLibrary;
  document.addEventListener('DOMContentLoaded', () => CinemaLibrary.init());
})();
