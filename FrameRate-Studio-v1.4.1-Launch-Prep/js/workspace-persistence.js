/* Persist the current working draft locally so the account sync can carry it across devices. */
(function () {
  'use strict';
  const KEY = 'fr_workspace_draft';
  let timer = null;
  let restoring = false;
  let restoreQueued = false;

  function readInput(id) { return document.getElementById(id)?.value ?? ''; }
  function readChecked(id) { return Boolean(document.getElementById(id)?.checked); }

  function capture() {
    const app = window.App;
    if (!app?.state) return null;
    if (typeof app.collectBreakdownNotes === 'function') app.collectBreakdownNotes();
    app.state.dna = app.state.dna || {};
    return {
      version: 1,
      step: Number(app.state.step || 1),
      film: app.state.film || null,
      rating: app.state.rating ?? null,
      watched: Boolean(app.state.watched),
      liked: Boolean(app.state.liked),
      rewatch: Boolean(app.state.rewatch),
      spoilers: Boolean(app.state.spoilers),
      watchedDate: readInput('watchedDateInput') || app.state.watchedDate || '',
      format: app.state.format || 'Cinema',
      vibes: Array.isArray(app.state.vibes) ? [...app.state.vibes] : [],
      notes: {
        craft: readInput('noteCraft'),
        soul: readInput('noteSoul'),
        friction: readInput('noteFriction'),
        free: readInput('noteFreeThought')
      },
      dna: {
        top4: readInput('dnaTop4') || app.state.dna.top4 || '',
        lens: readInput('dnaLens') || app.state.dna.lens || '',
        avoid: readInput('dnaAvoid') || app.state.dna.avoid || ''
      },
      importedReview: app.state.importedReview || '',
      importedTags: Array.isArray(app.state.importedTags) ? [...app.state.importedTags] : [],
      activeBackdropUrl: app.state.activeBackdropUrl || '',
      backdropIntensity: Number(app.state.backdropIntensity ?? 70),
      backdropBlur: Number(app.state.backdropBlur ?? 6),
      reviewVariations: {
        v1: document.getElementById('reviewVariation1')?.textContent || '',
        v2: document.getElementById('reviewVariation2')?.textContent || '',
        v3: document.getElementById('reviewVariation3')?.textContent || ''
      },
      cardQuote: document.getElementById('cardQuotePreview')?.textContent || ''
    };
  }

  function saveNow() {
    if (restoring) return;
    try {
      const draft = capture();
      if (draft) localStorage.setItem(KEY, JSON.stringify(draft));
    } catch (error) {
      console.warn('[FrameRate Workspace] Could not save current draft:', error);
    }
  }

  function scheduleSave() {
    if (restoring) return;
    clearTimeout(timer);
    timer = setTimeout(saveNow, 280);
  }

  async function restoreFromStorage() {
    if (!window.App) return;
    if (restoring) { restoreQueued = true; return; }
    let draft;
    try { draft = JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (_) { draft = null; }
    if (!draft || typeof draft !== 'object') return;

    restoring = true;
    try {
      const app = window.App;
      const originalFilm = draft.film;
      if (originalFilm && originalFilm.title && typeof app.selectFilm === 'function') {
        let selection = { ...originalFilm };
        const catalog = window.Api?.curatedCatalog || {};
        const curated = Object.entries(catalog).find(([, item]) => String(item.id) === String(originalFilm.id));
        if (curated) {
          selection.source = 'curated';
          selection.curatedSlug = curated[0];
        } else if (!selection.source && originalFilm.id) {
          selection.source = 'tmdb';
        }
        try { await app.selectFilm(selection, null); }
        catch (error) { console.warn('[FrameRate Workspace] Film preview could not be restored:', error); }
      }

      const st = app.state;
      st.step = Math.min(4, Math.max(1, Number(draft.step || 1)));
      st.film = originalFilm || st.film || null;
      if (typeof app.updateTrailerButton === 'function') app.updateTrailerButton();
      st.rating = draft.rating === null ? null : (Number.isFinite(Number(draft.rating)) ? Number(draft.rating) : 4);
      st.watched = Boolean(draft.watched);
      st.liked = Boolean(draft.liked);
      st.rewatch = Boolean(draft.rewatch);
      st.spoilers = Boolean(draft.spoilers);
      st.watchedDate = draft.watchedDate || st.watchedDate;
      st.format = draft.format || 'Cinema';
      st.vibes = Array.isArray(draft.vibes) ? draft.vibes : ['Atmospheric'];
      st.notes = { craft: '', soul: '', friction: '', free: '', ...(draft.notes || {}) };
      st.dna = { top4: '', lens: '', avoid: '', ...(draft.dna || {}) };
      st.importedReview = draft.importedReview || '';
      st.importedTags = Array.isArray(draft.importedTags) ? draft.importedTags : [];
      st.activeBackdropUrl = draft.activeBackdropUrl || '';
      st.backdropIntensity = Number(draft.backdropIntensity ?? 70);
      st.backdropBlur = Number(draft.backdropBlur ?? 6);

      const assign = (id, value) => { const element = document.getElementById(id); if (element) element.value = value ?? ''; };
      const assignChecked = (id, value) => { const element = document.getElementById(id); if (element) element.checked = Boolean(value); };
      assign('watchedDateInput', st.watchedDate);
      assignChecked('spoilersCheckbox', st.spoilers);
      assign('noteCraft', st.notes.craft);
      assign('noteSoul', st.notes.soul);
      assign('noteFriction', st.notes.friction);
      assign('noteFreeThought', st.notes.free);
      assign('dnaTop4', st.dna.top4);
      assign('dnaLens', st.dna.lens);
      assign('dnaAvoid', st.dna.avoid);
      assign('backdropIntensitySlider', String(st.backdropIntensity));
      assign('backdropBlurSlider', String(st.backdropBlur));

      if (typeof app.renderFormatChips === 'function') app.renderFormatChips();
      if (typeof app.renderVibeChips === 'function') app.renderVibeChips();
      if (typeof app.updateDiaryActionButtons === 'function') app.updateDiaryActionButtons();
      if (typeof app.setStars === 'function') app.setStars(st.rating);
      if (typeof app.setBackdropIntensity === 'function') app.setBackdropIntensity(st.backdropIntensity);
      if (typeof app.setBackdropBlur === 'function') app.setBackdropBlur(st.backdropBlur);
      if (st.activeBackdropUrl && typeof app.setFullPageBackdrop === 'function') app.setFullPageBackdrop(st.activeBackdropUrl);

      ['v1', 'v2', 'v3'].forEach((key, i) => {
        const element = document.getElementById(`reviewVariation${i + 1}`);
        const value = draft.reviewVariations?.[key];
        if (element && value) element.textContent = value;
      });
      const quote = document.getElementById('cardQuotePreview');
      if (quote && draft.cardQuote) quote.textContent = draft.cardQuote;
      if (typeof app.goToStep === 'function') app.goToStep(st.step);
      if (typeof app.syncCineCard === 'function') app.syncCineCard();
    } catch (error) {
      console.warn('[FrameRate Workspace] Draft restore failed:', error);
    } finally {
      restoring = false;
      if (restoreQueued) {
        restoreQueued = false;
        setTimeout(restoreFromStorage, 0);
      }
    }
  }

  function init() {
    // Wait for auth to replace any account-owned local snapshot. Guest browsers
    // can restore their current draft immediately.
    if (!localStorage.getItem('fr_cloud_owner_id')) restoreFromStorage();
    window.addEventListener('frameratedataready', () => restoreFromStorage());

    const watchRoot = document.querySelector('main');
    ['input', 'change', 'click'].forEach(eventName => {
      watchRoot?.addEventListener(eventName, () => scheduleSave(), true);
    });
    document.addEventListener('change', event => {
      if (['watchedDateInput', 'spoilersCheckbox', 'dnaTop4', 'dnaLens', 'dnaAvoid'].includes(event.target?.id)) scheduleSave();
    }, true);

    // AI responses and Letterboxd imports update result nodes asynchronously.
    // Observe these DOM changes too, so the latest visible review is included.
    const reviewObserver = new MutationObserver(() => scheduleSave());
    ['reviewVariation1', 'reviewVariation2', 'reviewVariation3', 'cardQuotePreview'].forEach(id => {
      const el = document.getElementById(id);
      if (el) reviewObserver.observe(el, { childList: true, characterData: true, subtree: true });
    });

    // Save after async film selection / generation methods finish, not only when
    // their initiating click fires (network-backed calls may take longer).
    ['selectFilm', 'quickSelectCurated', 'generateReviews', 'setStars', 'toggleWatched', 'toggleLiked', 'toggleRewatch', 'toggleSpoilers', 'setFullPageBackdrop', 'useVariationOnCard', 'goToStep'].forEach(name => {
      const original = window.App?.[name];
      if (typeof original !== 'function' || original.__frWrapped) return;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        if (result && typeof result.then === 'function') return result.finally(scheduleSave);
        scheduleSave();
        return result;
      };
      wrapped.__frWrapped = true;
      window.App[name] = wrapped;
    });
    scheduleSave();
  }

  window.FrameRateWorkspace = { saveNow, restoreFromStorage };
  document.addEventListener('DOMContentLoaded', init);
})();
