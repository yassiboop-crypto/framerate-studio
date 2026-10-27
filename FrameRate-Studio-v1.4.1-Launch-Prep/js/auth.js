/*
 * FrameRate Studio — Guest mode + Supabase email/password + Google auth.
 * Only explicitly allow-listed app data/preferences are uploaded. Raw AI
 * provider keys use the separate encrypted server vault; Supabase tokens are
 * never included in the app's cloud-sync payload.
 */
(function () {
  'use strict';

  // App data and non-secret preferences (including selected AI provider/model)
  // sync per account. Raw AI credentials are never placed in this payload:
  // signed-in keys use the encrypted server vault, while Guest keys stay local.
  const STORAGE_KEYS = [
    'fr_theme',
    'fr_lang',
    'fr_cursor_style',
    'fr_ai_provider',
    'fr_ai_model',
    'fr_dna',
    'fr_saved_reviews',
    'fr_lb_zip_library',
    'fr_watchlist',
    'fr_watchlist_events',
    'fr_workspace_draft'
  ];
  const PROFILE_LOCAL_KEYS = new Set([
    ...STORAGE_KEYS,
    'fr_ai_provider',
    'fr_ai_model',
    'fr_key_tmdb',
    'fr_key_fanart',
    'fr_key_groq',
    'fr_key_openai',
    'fr_key_gemini',
    'fr_key_openrouter'
  ]);
  const PROFILE_STORAGE_PREFIX = 'fr_profile_local_v1:';
  const PROFILE_MIGRATION_KEY = 'fr_profile_migration_v2_done';
  const LEGACY_SHARED_DATA_KEY = 'fr_legacy_shared_app_data_v1';
  const TABLE = 'framerate_user_data';
  const OWNER_KEY = 'fr_cloud_owner_id';
  const GUEST_BACKUP_KEY = 'fr_guest_backup_v1';
  const CONFIG = window.FRAMERATE_SUPABASE_CONFIG || {};

  const Auth = {
    client: null,
    configured: false,
    currentUser: null,
    cloudReady: false,
    applyingRemote: false,
    syncing: false,
    syncTimer: null,
    guestBackupTimer: null,
    handlingUserId: null,
    signOutPromise: null,
    lastSyncAt: null,
    originalStorageGet: null,
    originalStorageSet: null,
    originalStorageRemove: null,
    profileMigrationDone: false,
    legacyProfileMigrated: false,
    sessionGeneration: 0,
    syncRequested: false,
    credentialStatus: {},
    credentialStatusError: '',

    init() {
      this.injectAccountButton();
      this.patchLocalStorage();
      this.migrateLegacyProfileSettings();
      this.configureClient();
      this.updateHeader();
      if (this.legacyProfileMigrated) {
        this.showToast('Old shared API settings were moved to Guest mode for privacy. Re-enter them under the account that should use them.');
      }
      this.bindModalEvents();

      // Save a recoverable guest snapshot before any account replaces local data.
      if (this.configured && !localStorage.getItem(OWNER_KEY)) this.saveGuestBackupNow();

      if (!this.configured) {
        this.setSyncStatus('Guest mode is active. Add Supabase settings to enable accounts and cloud sync.');
        // If a previous configured build left an account marker but no client is
        // available now, restore this browser to its separate guest snapshot.
        if (localStorage.getItem(OWNER_KEY)) this.handleSignedOut();
        return;
      }

      // Supabase recommends a synchronous auth-state listener; defer async work
      // to a microtask so no Supabase call is awaited inside this callback.
      this.client.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          queueMicrotask(() => this.handleSession(session, event));
        } else if (event === 'SIGNED_OUT') {
          const generation = ++this.sessionGeneration;
          clearTimeout(this.syncTimer);
          this.syncTimer = null;
          this.syncRequested = false;
          this.cloudReady = false;
          queueMicrotask(() => this.handleSignedOut(generation));
        } else if (event === 'PASSWORD_RECOVERY') {
          queueMicrotask(() => {
            this.openModal();
            this.showRecoveryPanel();
            this.showMessage('Enter a new password for your account.', 'info');
          });
        }
      });
    },

    configureClient() {
      const url = String(CONFIG.url || '').trim();
      const key = String(CONFIG.publishableKey || CONFIG.anonKey || '').trim();
      const placeholders = /YOUR_PROJECT_REF|YOUR_SUPABASE|YOUR_ANON_KEY|<project-ref>|<publishable-key>/i;
      if (!url.startsWith('https://') || !key || placeholders.test(url) || placeholders.test(key)) return;
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('[FrameRate Auth] Supabase JS CDN did not load. Guest mode remains available.');
        return;
      }
      try {
        this.client = window.supabase.createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
          }
        });
        this.configured = true;
      } catch (error) {
        console.error('[FrameRate Auth] Could not initialize Supabase:', error);
      }
    },

    injectAccountButton() {
      // The header button is part of index.html; it calls openModal inline.
      // Avoid a second listener so it opens once per click.
      const existing = document.getElementById('frAuthOpenBtn');
      if (existing) existing.setAttribute('aria-haspopup', 'dialog');
    },

    bindModalEvents() {
      const signInMode = document.getElementById('frAuthModeSignIn');
      const signUpMode = document.getElementById('frAuthModeSignUp');
      signInMode?.addEventListener('click', () => this.setMode('signin'));
      signUpMode?.addEventListener('click', () => this.setMode('signup'));
      document.getElementById('frAuthForm')?.addEventListener('submit', event => {
        event.preventDefault();
        const mode = this.mode || 'signin';
        if (mode === 'signup') this.signUp();
        else this.signIn();
      });
      document.getElementById('frAuthGoogleBtn')?.addEventListener('click', () => this.signInWithGoogle());
      document.getElementById('frAuthGuestBtn')?.addEventListener('click', () => this.closeModal());
      document.getElementById('frAuthForgotBtn')?.addEventListener('click', () => this.sendPasswordReset());
      document.getElementById('frAuthSyncNowBtn')?.addEventListener('click', () => this.syncNow());
      document.getElementById('frAuthSignOutBtn')?.addEventListener('click', () => this.signOut());
      document.getElementById('frAuthRecoveryPanel')?.addEventListener('submit', event => {
        event.preventDefault();
        this.updatePassword();
      });
      document.getElementById('frAuthModal')?.addEventListener('click', event => {
        if (event.target?.id === 'frAuthModal') this.closeModal();
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') this.closeModal();
      });
      this.setMode('signin');
    },

    patchLocalStorage() {
      if (this.originalStorageSet) return;
      this.originalStorageGet = Storage.prototype.getItem;
      this.originalStorageSet = Storage.prototype.setItem;
      this.originalStorageRemove = Storage.prototype.removeItem;
      const auth = this;

      Storage.prototype.getItem = function (key) {
        const name = String(key);
        if (this === window.localStorage && PROFILE_LOCAL_KEYS.has(name)) {
          return auth.originalStorageGet.call(this, auth.profileStorageKey(name));
        }
        return auth.originalStorageGet.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        const name = String(key);
        if (this === window.localStorage && PROFILE_LOCAL_KEYS.has(name)) {
          auth.originalStorageSet.call(this, auth.profileStorageKey(name), String(value));
          auth.onLocalDataChanged(name);
          return;
        }
        auth.originalStorageSet.call(this, key, value);
        if (this === window.localStorage) auth.onLocalDataChanged(name);
      };
      Storage.prototype.removeItem = function (key) {
        const name = String(key);
        if (this === window.localStorage && PROFILE_LOCAL_KEYS.has(name)) {
          auth.originalStorageRemove.call(this, auth.profileStorageKey(name));
          auth.onLocalDataChanged(name);
          return;
        }
        auth.originalStorageRemove.call(this, key);
        if (this === window.localStorage) auth.onLocalDataChanged(name);
      };
    },

    getProfileScope() {
      // Read the owner marker with the original method to avoid recursive calls.
      const owner = this.originalStorageGet
        ? this.originalStorageGet.call(localStorage, OWNER_KEY)
        : localStorage.getItem(OWNER_KEY);
      return owner || this.currentUser?.id || 'guest';
    },

    profileStorageKey(key, scope = this.getProfileScope()) {
      return `${PROFILE_STORAGE_PREFIX}${encodeURIComponent(scope)}:${key}`;
    },

    migrateLegacyProfileSettings() {
      if (this.profileMigrationDone || !this.originalStorageGet || !this.originalStorageSet) return;
      if (this.originalStorageGet.call(localStorage, PROFILE_MIGRATION_KEY) === '1') {
        this.profileMigrationDone = true;
        return;
      }
      this.profileMigrationDone = true;

      // Legacy values had no owner namespace. If the browser already carries an
      // account marker, the global app cache may belong to a different account;
      // quarantine it instead of merging it into whichever account opens first.
      // API settings are kept in the separate Guest profile because the old
      // global keys contain no reliable information about their intended owner.
      const legacyOwner = this.originalStorageGet.call(localStorage, OWNER_KEY);
      let quarantine = {};
      try {
        const old = this.originalStorageGet.call(localStorage, LEGACY_SHARED_DATA_KEY);
        if (old) {
          const parsed = JSON.parse(old);
          if (parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object') {
            quarantine = { ...parsed.data };
          }
        }
      } catch (_) { /* keep a fresh recovery payload */ }

      for (const key of PROFILE_LOCAL_KEYS) {
        const legacyValue = this.originalStorageGet.call(localStorage, key);
        if (legacyValue === null) continue;

        if (STORAGE_KEYS.includes(key) && legacyOwner) {
          // Preserve potentially-unsynced values for manual recovery, but do not
          // load them into a signed-in account or let them contaminate another.
          if (!Object.prototype.hasOwnProperty.call(quarantine, key)) quarantine[key] = legacyValue;
        } else {
          // In Guest mode, keep old data in the Guest namespace. API settings
          // migrate to Guest even if an account marker exists, since ownership
          // cannot be proven. Users can re-save them under the intended account.
          const scope = 'guest';
          const scopedKey = this.profileStorageKey(key, scope);
          const alreadyScoped = this.originalStorageGet.call(localStorage, scopedKey);
          if (alreadyScoped === null) this.originalStorageSet.call(localStorage, scopedKey, legacyValue);
          if (!STORAGE_KEYS.includes(key)) this.legacyProfileMigrated = true;
        }
        this.originalStorageRemove.call(localStorage, key);
      }

      if (legacyOwner && Object.keys(quarantine).length) {
        this.originalStorageSet.call(localStorage, LEGACY_SHARED_DATA_KEY, JSON.stringify({
          version: 1,
          quarantinedAt: new Date().toISOString(),
          previousOwner: legacyOwner,
          data: quarantine
        }));
      }
      this.originalStorageSet.call(localStorage, PROFILE_MIGRATION_KEY, '1');
    },

    onLocalDataChanged(key) {
      if (this.applyingRemote || !STORAGE_KEYS.includes(key)) return;
      const ownerId = localStorage.getItem(OWNER_KEY);
      if (this.currentUser && ownerId === this.currentUser.id && this.configured) {
        this.queueCloudSync();
      } else if (!ownerId && this.configured) {
        clearTimeout(this.guestBackupTimer);
        this.guestBackupTimer = setTimeout(() => this.saveGuestBackupNow(), 450);
      }
    },

    readLocalPayload() {
      const payload = {};
      STORAGE_KEYS.forEach(key => {
        const value = localStorage.getItem(key); // active account/Guest namespace
        if (value !== null) payload[key] = value;
      });
      return payload;
    },

    saveGuestBackupNow() {
      if (!this.configured || localStorage.getItem(OWNER_KEY)) return;
      try {
        const payload = this.readLocalPayload();
        this.originalStorageSet.call(localStorage, GUEST_BACKUP_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn('[FrameRate Auth] Could not refresh the guest backup:', error);
      }
    },

    getGuestBackup() {
      try {
        const raw = localStorage.getItem(GUEST_BACKUP_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (_) {
        return {};
      }
    },

    async handleSession(session, eventName = '') {
      const user = session?.user;
      if (!user?.id || !this.configured) {
        if (!user?.id && eventName === 'INITIAL_SESSION' && this.originalStorageGet.call(localStorage, OWNER_KEY)) {
          await this.handleSignedOut();
        }
        this.updateHeader();
        return;
      }
      if (this.currentUser?.id === user.id && this.cloudReady) {
        this.updateHeader();
        return;
      }
      if (this.handlingUserId === user.id) return;

      const generation = ++this.sessionGeneration;
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
      this.syncRequested = false;
      this.cloudReady = false;
      this.handlingUserId = user.id;

      const previousOwner = this.originalStorageGet.call(localStorage, OWNER_KEY);
      if (this.currentUser?.id !== user.id) { this.credentialStatus = {}; this.credentialStatusError = ''; }
      const mayMergeLocal = !previousOwner || previousOwner === user.id;
      const localPayload = mayMergeLocal ? this.readLocalPayload() : {};
      this.currentUser = user;

      // Switch the storage namespace immediately. The app's normal localStorage
      // reads now resolve to this user ID, never the previous account's cache.
      this.applyingRemote = true;
      try {
        // Changing OWNER_KEY switches all app data reads to the new profile's
        // namespace. Previous profile cache remains isolated under its own ID.
        this.originalStorageSet.call(localStorage, OWNER_KEY, user.id);
      } finally {
        this.applyingRemote = false;
      }
      if (previousOwner && previousOwner !== user.id) this.refreshApplicationFromStorage();
      this.updateHeader();
      this.setSyncStatus('Connecting your saved data to the cloud…');

      try {
        const { data: row, error } = await this.client
          .from(TABLE)
          .select('payload, updated_at')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (generation !== this.sessionGeneration || this.currentUser?.id !== user.id ||
            this.originalStorageGet.call(localStorage, OWNER_KEY) !== user.id) return;

        const remotePayload = row?.payload && typeof row.payload === 'object'
          ? this.sanitizeCloudPayload(row.payload)
          : null;
        const merged = this.sanitizeCloudPayload(remotePayload
          ? (mayMergeLocal ? this.mergePayloads(localPayload, remotePayload, previousOwner === user.id) : remotePayload)
          : localPayload);

        this.writeLocalPayload(merged, true);
        this.cloudReady = true;
        this.lastSyncAt = row?.updated_at || null;

        // The session may change while the network call is in flight. The
        // generation/user check prevents a stale request from writing another
        // account's snapshot into the active browser cache or cloud row.
        if (generation !== this.sessionGeneration || this.currentUser?.id !== user.id ||
            this.originalStorageGet.call(localStorage, OWNER_KEY) !== user.id) return;
        const { error: saveError } = await this.client.from(TABLE).upsert({
          user_id: user.id,
          payload: merged,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (saveError) throw saveError;
        if (generation !== this.sessionGeneration || this.currentUser?.id !== user.id ||
            this.originalStorageGet.call(localStorage, OWNER_KEY) !== user.id) return;

        this.lastSyncAt = new Date().toISOString();
        this.setSyncStatus('Cloud sync is connected. Saved reviews, imported Letterboxd data, writing DNA and preferences are synced.');
        this.showToast(remotePayload ? 'Account data synced to this browser.' : 'Guest data connected to your account.');
      } catch (error) {
        if (generation !== this.sessionGeneration || this.currentUser?.id !== user.id) return;
        this.cloudReady = false;
        // Never leave the previous account's payload visible if another account
        // failed to load. Clearing is preferable to exposing stale private data.
        if (previousOwner && previousOwner !== user.id) this.writeLocalPayload({}, true);
        this.setSyncStatus(`Signed in, but cloud sync failed: ${this.friendlyError(error)}. Check the Supabase table and RLS policies.`);
        console.error('[FrameRate Auth] Account sync failed:', error);
      } finally {
        if (generation === this.sessionGeneration && this.currentUser?.id === user.id) {
          this.handlingUserId = null;
          this.refreshApplicationFromStorage();
          window.dispatchEvent(new CustomEvent('frameratedataready'));
          this.updateHeader();
          if (this.cloudReady) void this.refreshCloudCredentials();
          if (this.syncRequested && this.cloudReady) {
            clearTimeout(this.syncTimer);
            this.syncTimer = setTimeout(() => this.syncCurrentPayload(), 250);
          }
        }
      }
    },

    writeLocalPayload(payload, replace = false) {
      this.applyingRemote = true;
      try {
        STORAGE_KEYS.forEach(key => {
          const value = Object.prototype.hasOwnProperty.call(payload || {}, key) ? payload[key] : undefined;
          if (typeof value === 'string') {
            localStorage.setItem(key, value); // routes to the currently active account namespace
          } else if (replace) {
            localStorage.removeItem(key); // clears only the active account/Guest namespace
          }
        });
        this.refreshApplicationFromStorage();
      } finally {
        this.applyingRemote = false;
      }
    },

    mergePayloads(localPayload, remotePayload, preferLocalScalars = false) {
      // If this is a fresh browser joining an existing account, account settings
      // win over local defaults; locally-created lists and non-empty writing DNA
      // are still merged. Same-browser offline edits prefer local values.
      const merged = { ...localPayload, ...remotePayload };
      if (preferLocalScalars) Object.assign(merged, remotePayload, localPayload);
      const arrayKeys = ['fr_saved_reviews', 'fr_lb_zip_library', 'fr_watchlist'];
      arrayKeys.forEach(key => {
        const local = this.parseArray(localPayload[key]);
        const remote = this.parseArray(remotePayload[key]);
        if (!local.length && !remote.length) return;
        const keyOf = key === 'fr_saved_reviews'
          ? item => `${String(item?.title || '').trim().toLowerCase()}|${String(item?.year || '')}|${String(item?.review || '').trim()}`
          : item => `${String(item?.title || '').trim().toLowerCase()}|${String(item?.year || '').trim()}`;
        let result = [];
        if (key === 'fr_watchlist') {
          // For a duplicate film, retain the status with the newest update time
          // so a status change made on another device does not get overwritten
          // by an older local cache. Ties prefer the local copy.
          const byFilm = new Map();
          [...remote, ...local].forEach(item => {
            if (!item || typeof item !== 'object') return;
            const signature = keyOf(item);
            if (!signature) return;
            const current = byFilm.get(signature);
            const stamp = entry => Date.parse(entry?.updatedAt || entry?.addedAt || '') || 0;
            if (!current || stamp(item) >= stamp(current)) byFilm.set(signature, item);
          });
          result = Array.from(byFilm.values()).sort((a, b) => String(b.addedAt || '').localeCompare(String(a.addedAt || '')));
        } else {
          const seen = new Set();
          // Local first preserves changes just made in guest/browser mode.
          [...local, ...remote].forEach(item => {
            if (!item || typeof item !== 'object') return;
            const signature = keyOf(item);
            if (!signature || seen.has(signature)) return;
            seen.add(signature);
            result.push(item);
          });
        }
        // Match the local app's current library limits.
        const limit = key === 'fr_saved_reviews' ? 100 : (key === 'fr_watchlist' ? 1000 : 3000);
        merged[key] = JSON.stringify(result.slice(0, limit));
      });

      // Watchlist deletions must survive union-merging local and cloud snapshots.
      // Each title/year signature has a timestamped last action (add/remove).
      // This prevents an old cloud copy from resurrecting a movie removed locally.
      const localWatchlistEvents = this.parseObject(localPayload.fr_watchlist_events);
      const remoteWatchlistEvents = this.parseObject(remotePayload.fr_watchlist_events);
      const watchlistEvents = { ...remoteWatchlistEvents };
      const eventStamp = event => Date.parse(event?.updatedAt || '') || 0;
      Object.entries(localWatchlistEvents).forEach(([signature, event]) => {
        if (!event || typeof event !== 'object') return;
        if (!watchlistEvents[signature] || eventStamp(event) >= eventStamp(watchlistEvents[signature])) {
          watchlistEvents[signature] = event;
        }
      });
      merged.fr_watchlist_events = JSON.stringify(Object.fromEntries(Object.entries(watchlistEvents).sort((a, b) => eventStamp(a[1]) - eventStamp(b[1])).slice(-2000)));
      const mergedWatchlist = this.parseArray(merged.fr_watchlist);
      const signatureForFilm = item => `${String(item?.title || '').trim().toLowerCase()}|${String(item?.year || '').trim()}`;
      merged.fr_watchlist = JSON.stringify(mergedWatchlist.filter(item => {
        const event = watchlistEvents[signatureForFilm(item)];
        return !(event && event.action === 'remove');
      }).slice(0, 1000));

      const localDna = this.parseObject(localPayload.fr_dna);
      const remoteDna = this.parseObject(remotePayload.fr_dna);
      const nonEmptyLocalDna = Object.fromEntries(Object.entries(localDna).filter(([, value]) => String(value ?? '').trim() !== ''));
      if (Object.keys(localDna).length || Object.keys(remoteDna).length) {
        merged.fr_dna = JSON.stringify({ ...nonEmptyLocalDna, ...remoteDna, ...(preferLocalScalars ? localDna : {}) });
      }

      const localDraft = this.parseObject(localPayload.fr_workspace_draft);
      const remoteDraft = this.parseObject(remotePayload.fr_workspace_draft);
      if (preferLocalScalars) {
        if (localPayload.fr_workspace_draft) merged.fr_workspace_draft = localPayload.fr_workspace_draft;
      } else if (localDraft.film?.title && !remoteDraft.film?.title) {
        merged.fr_workspace_draft = localPayload.fr_workspace_draft;
      }
      return merged;
    },

    parseArray(raw) {
      try { const value = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(value) ? value : []; }
      catch (_) { return []; }
    },

    parseObject(raw) {
      try { const value = typeof raw === 'string' ? JSON.parse(raw) : raw; return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
      catch (_) { return {}; }
    },

    hasCloudCredential(provider) {
      return Boolean(this.currentUser?.id && this.cloudReady && this.credentialStatus?.[provider]);
    },

    async invokeCredentialVault(payload) {
      if (!this.client || !this.configured) throw new Error('Configure Supabase before using the cloud AI vault.');
      if (!this.currentUser?.id || !this.cloudReady) throw new Error('Sign in and wait for account sync before using cloud AI keys.');
      const { data, error } = await this.client.functions.invoke('credential-vault', { body: payload });
      if (error) throw new Error(error.message || 'The secure AI vault request failed. Deploy supabase/functions/credential-vault first.');
      if (data?.error) throw new Error(data.error);
      return data || {};
    },

    async refreshCloudCredentials() {
      const userId = this.currentUser?.id;
      if (!userId || !this.cloudReady || !this.client) {
        this.updateCredentialStatusUI();
        return false;
      }
      try {
        let response = await this.invokeCredentialVault({ action: 'status' });
        if (this.currentUser?.id !== userId || !this.cloudReady) return false;
        let statuses = response.credentials && typeof response.credentials === 'object' ? response.credentials : {};

        // Migrate credentials this account had saved in its own old local namespace.
        // They are sent to the server once, encrypted there, then removed from localStorage.
        const providers = ['groq', 'openai', 'gemini', 'openrouter'];
        const localToMigrate = {};
        providers.forEach(provider => {
          const localKey = (localStorage.getItem(`fr_key_${provider}`) || '').trim();
          if (localKey && !statuses[provider]) localToMigrate[provider] = localKey;
        });
        if (Object.keys(localToMigrate).length) {
          response = await this.invokeCredentialVault({ action: 'save', credentials: localToMigrate });
          if (this.currentUser?.id !== userId || !this.cloudReady) return false;
          statuses = response.credentials && typeof response.credentials === 'object' ? response.credentials : statuses;
        }

        providers.forEach(provider => {
          if (statuses[provider]) localStorage.removeItem(`fr_key_${provider}`);
        });
        this.credentialStatus = Object.fromEntries(providers.map(provider => [provider, Boolean(statuses[provider])]));
        this.credentialStatusError = '';
        if (window.Api) {
          Api.cachedGeminiModels = null;
          Api.cachedGeminiModelsApiKey = null;
        }
        this.updateCredentialStatusUI();
        if (window.App && typeof App.loadSavedSettings === 'function') App.loadSavedSettings();
        if (window.Api && typeof Api.populateModelDropdowns === 'function') {
          const provider = localStorage.getItem('fr_ai_provider') || 'auto';
          const model = localStorage.getItem('fr_ai_model') || 'auto-discover';
          Api.populateModelDropdowns(provider, model);
        }
        return true;
      } catch (error) {
        if (this.currentUser?.id === userId) {
          this.credentialStatusError = error.message || 'Cloud credential vault is not ready.';
          this.updateCredentialStatusUI();
          console.warn('[FrameRate Auth] Cloud credential vault is unavailable:', error);
        }
        return false;
      }
    },

    async saveCloudCredentials(credentials) {
      const clean = {};
      ['groq', 'openai', 'gemini', 'openrouter'].forEach(provider => {
        const value = typeof credentials?.[provider] === 'string' ? credentials[provider].trim() : '';
        if (value) clean[provider] = value;
      });
      if (!Object.keys(clean).length) return { saved: [], credentials: this.credentialStatus };
      const userId = this.currentUser?.id;
      const response = await this.invokeCredentialVault({ action: 'save', credentials: clean });
      if (this.currentUser?.id !== userId) throw new Error('The active account changed while saving. Sign in again before retrying.');
      Object.keys(clean).forEach(provider => localStorage.removeItem(`fr_key_${provider}`));
      this.credentialStatus = response.credentials || this.credentialStatus;
      this.credentialStatusError = '';
      this.updateCredentialStatusUI();
      return response;
    },

    async deleteCloudCredential(provider) {
      if (!['groq', 'openai', 'gemini', 'openrouter'].includes(provider)) throw new Error('Unknown AI provider.');
      if (this.currentUser?.id && this.cloudReady) {
        const userId = this.currentUser.id;
        const response = await this.invokeCredentialVault({ action: 'delete', provider });
        if (this.currentUser?.id !== userId) throw new Error('The active account changed.');
        this.credentialStatus = response.credentials || { ...this.credentialStatus, [provider]: false };
      }
      localStorage.removeItem(`fr_key_${provider}`);
      this.updateCredentialStatusUI();
      if (window.App && typeof App.loadSavedSettings === 'function') App.loadSavedSettings();
      return true;
    },

    updateCredentialStatusUI() {
      const status = document.getElementById('frCredentialStatus');
      if (status) {
        if (this.credentialStatusError) {
          status.textContent = `Cloud vault unavailable: ${this.credentialStatusError}. Local guest keys remain local; deploy the Supabase functions and run the schema. `;
        } else if (this.currentUser?.id && this.cloudReady) {
          const names = ['groq', 'openai', 'gemini', 'openrouter'].filter(provider => this.credentialStatus?.[provider]);
          status.textContent = names.length
            ? `Secure cloud vault connected. Saved: ${names.map(name => name.toUpperCase()).join(', ')}. Keys stay server-side for AI requests.`
            : 'Secure cloud vault connected. No AI keys saved yet; enter a key below to save it to this account.';
        } else if (this.currentUser?.id) {
          status.textContent = 'Account is still syncing. Wait a moment before saving cloud AI keys.';
        } else {
          status.textContent = 'Guest mode: AI keys stay in this browser. Sign in to save them encrypted to your account and use them on other devices.';
        }
      }
      ['groq', 'openai', 'gemini', 'openrouter'].forEach(provider => {
        const input = document.getElementById(`cfg${provider[0].toUpperCase()}${provider.slice(1)}`);
        if (!input) return;
        if (this.currentUser?.id && this.credentialStatus?.[provider]) {
          input.value = '';
          input.placeholder = 'Saved securely — leave blank to keep this key';
        } else if (!input.value) {
          const placeholders = { groq: 'gsk_...', openai: 'sk-...', gemini: 'AIzaSy...', openrouter: 'sk-or-v1-...' };
          input.placeholder = placeholders[provider];
        }
      });
    },

    refreshApplicationFromStorage() {
      try {
        if (window.App) {
          App.state.dna = this.parseObject(localStorage.getItem('fr_dna'));
          App.applyTheme(localStorage.getItem('fr_theme') || 'dark');
          if (window.I18n) I18n.setLanguage(localStorage.getItem('fr_lang') || 'en');
          if (typeof App.loadSavedSettings === 'function') App.loadSavedSettings();
          if (typeof App.applyCursorStyle === 'function') App.applyCursorStyle(localStorage.getItem('fr_cursor_style') || 'fr');
          if (Array.isArray(App.lbLibrary)) App.lbLibrary = [];
          if (typeof App.loadSavedLbLibrary === 'function') App.loadSavedLbLibrary();
        }
        if (window.Api) {
          // Dynamic model controls and model-list caches are also account-specific.
          // Do not leave Account A's selected model visible after switching to B.
          Api.cachedGeminiModels = null;
          Api.cachedGeminiModelsApiKey = null;
          if (typeof Api.getKeys === 'function' && typeof Api.populateModelDropdowns === 'function') {
            const apiSettings = Api.getKeys();
            Api.populateModelDropdowns(apiSettings.provider || 'auto', apiSettings.model || 'auto-discover');
            const customModelInput = document.getElementById('cfgCustomModelInput');
            if (customModelInput) {
              customModelInput.value = ['auto-discover', 'local-critic'].includes(apiSettings.model) ? '' : (apiSettings.model || '');
            }
            const modelHint = document.getElementById('modelStatusHint');
            if (modelHint) modelHint.textContent = '';
          }
          if (typeof Api.renderSavedReviewsHistory === 'function') Api.renderSavedReviewsHistory();
        }
      } catch (error) {
        console.warn('[FrameRate Auth] UI refresh after sync failed:', error);
      }
    },

    queueCloudSync() {
      const owner = this.originalStorageGet.call(localStorage, OWNER_KEY);
      if (!this.configured || !this.currentUser || owner !== this.currentUser.id) return;
      this.syncRequested = true;
      // While an account is loading, wait. In particular, never let a pending
      // debounce from account A write the local cache into account B's row.
      if (!this.cloudReady || this.handlingUserId) return;
      clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => this.syncCurrentPayload(), 1300);
      this.setSyncStatus('Changes detected. Cloud sync queued…');
    },

    isCurrentSyncContext(userId, generation) {
      const owner = this.originalStorageGet.call(localStorage, OWNER_KEY);
      return this.sessionGeneration === generation &&
        this.currentUser?.id === userId && owner === userId &&
        this.cloudReady && !this.handlingUserId;
    },

    async syncCurrentPayload() {
      const userId = this.currentUser?.id;
      const generation = this.sessionGeneration;
      const owner = this.originalStorageGet.call(localStorage, OWNER_KEY);
      if (!this.configured || !userId || owner !== userId || !this.cloudReady || this.handlingUserId) return;
      if (this.syncing) { this.syncRequested = true; return; }
      this.syncRequested = false;
      this.syncing = true;
      try {
        const localPayload = this.readLocalPayload();
        // Pull the latest snapshot, but verify the active account after every
        // await before touching local data or writing a row.
        const { data: row, error: readError } = await this.client
          .from(TABLE)
          .select('payload, updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (readError) throw readError;
        if (!this.isCurrentSyncContext(userId, generation)) return;
        const remotePayload = this.sanitizeCloudPayload(row?.payload);
        const payload = this.sanitizeCloudPayload(this.mergePayloads(localPayload, remotePayload, true));
        this.writeLocalPayload(payload, true);
        if (!this.isCurrentSyncContext(userId, generation)) return;
        const { error } = await this.client.from(TABLE).upsert({
          user_id: userId,
          payload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (error) throw error;
        if (!this.isCurrentSyncContext(userId, generation)) return;
        this.lastSyncAt = new Date().toISOString();
        this.setSyncStatus(`Synced just now · ${this.currentUser.email || 'Google account'}`);
      } catch (error) {
        if (this.sessionGeneration === generation && this.currentUser?.id === userId) {
          this.cloudReady = false;
          this.setSyncStatus(`Cloud sync failed: ${this.friendlyError(error)}. Your local data is still saved in this browser.`);
          console.error('[FrameRate Auth] Cloud save failed:', error);
        }
      } finally {
        this.syncing = false;
        if (this.sessionGeneration === generation) this.updateHeader();
        // If a save was requested during a previous in-flight operation, run it
        // only after the new account is fully active.
        if (this.syncRequested && this.cloudReady && !this.handlingUserId && this.currentUser) {
          clearTimeout(this.syncTimer);
          this.syncTimer = setTimeout(() => this.syncCurrentPayload(), 250);
        }
      }
    },

    sanitizeCloudPayload(payload) {
      const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
      const safe = {};
      for (const key of STORAGE_KEYS) {
        if (typeof source[key] === 'string') safe[key] = source[key];
      }
      // Keep only the explicit app-data/preferences allow-list; raw provider
      // credentials are intentionally absent from this payload in every build.
      return safe;
    },

    async syncNow() {
      if (!this.configured || !this.currentUser) {
        this.showMessage('Sign in with Supabase to sync your data.', 'error');
        return;
      }
      this.setSyncStatus('Syncing your saved data…');
      const button = document.getElementById('frAuthSyncNowBtn');
      if (button) button.disabled = true;
      try {
        if (!this.cloudReady) {
          // Re-run account bootstrap after a previous transient connection error.
          const { data, error } = await this.client.auth.getSession();
          if (error) throw error;
          if (data?.session?.user?.id === this.currentUser.id) {
            await this.handleSession(data.session, 'MANUAL_REFRESH');
          }
        } else {
          await this.syncCurrentPayload();
        }
      } catch (error) {
        this.showMessage(this.friendlyError(error), 'error');
      } finally {
        if (button) button.disabled = false;
      }
      this.showMessage(this.cloudReady ? 'Sync complete.' : 'Sync could not complete. Check the setup and try again.', this.cloudReady ? 'success' : 'error');
    },

    async signIn() {
      if (!this.ensureConfigured()) return;
      const email = document.getElementById('frAuthEmail')?.value.trim() || '';
      const password = document.getElementById('frAuthPassword')?.value || '';
      if (!email || !password) return this.showMessage('Enter your email and password.', 'error');
      this.setBusy(true);
      this.clearMessage();
      try {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.session) await this.handleSession(data.session, 'SIGN_IN_ACTION');
        this.showMessage(this.cloudReady ? 'You are signed in and cloud sync is connected.' : 'You are signed in. Finish the database setup to enable cloud sync.', this.cloudReady ? 'success' : 'info');
      } catch (error) {
        this.showMessage(this.friendlyError(error), 'error');
      } finally {
        this.setBusy(false);
      }
    },

    async signUp() {
      if (!this.ensureConfigured()) return;
      const email = document.getElementById('frAuthEmail')?.value.trim() || '';
      const password = document.getElementById('frAuthPassword')?.value || '';
      if (!email || password.length < 8) return this.showMessage('Enter a valid email and a password with at least 8 characters.', 'error');
      this.setBusy(true);
      this.clearMessage();
      try {
        const { data, error } = await this.client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: this.getRedirectUrl() }
        });
        if (error) throw error;
        if (data?.session) {
          await this.handleSession(data.session, 'SIGN_UP_ACTION');
          this.showMessage('Account created. Your data is connecting to the cloud.', 'success');
        } else {
          this.showMessage('Account request received. Check your email to confirm the address, then sign in.', 'success');
        }
      } catch (error) {
        this.showMessage(this.friendlyError(error), 'error');
      } finally {
        this.setBusy(false);
      }
    },

    async signInWithGoogle() {
      if (!this.ensureConfigured()) return;
      this.setBusy(true);
      this.clearMessage();
      try {
        const { error } = await this.client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: this.getRedirectUrl() }
        });
        if (error) throw error;
      } catch (error) {
        this.showMessage(this.friendlyError(error), 'error');
        this.setBusy(false);
      }
    },

    async sendPasswordReset() {
      if (!this.ensureConfigured()) return;
      const email = document.getElementById('frAuthEmail')?.value.trim() || '';
      if (!email) return this.showMessage('Enter your email first, then choose Forgot password.', 'error');
      this.setBusy(true);
      try {
        const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: this.getRedirectUrl() });
        if (error) throw error;
        this.showMessage('If password recovery is enabled, an email with a reset link will arrive shortly.', 'success');
      } catch (error) {
        this.showMessage(this.friendlyError(error), 'error');
      } finally {
        this.setBusy(false);
      }
    },

    async updatePassword() {
      if (!this.ensureConfigured()) return;
      const password = document.getElementById('frAuthNewPassword')?.value || '';
      if (password.length < 8) return this.showMessage('Use at least 8 characters for the new password.', 'error');
      this.setBusy(true);
      try {
        const { error } = await this.client.auth.updateUser({ password });
        if (error) throw error;
        const { data: sessionData } = await this.client.auth.getSession();
        if (sessionData?.session) await this.handleSession(sessionData.session, 'USER_UPDATED');
        this.showMessage('Password updated successfully.', 'success');
        document.getElementById('frAuthRecoveryPanel')?.classList.add('hidden');
        if (this.currentUser) document.getElementById('frAuthSignedInPanel')?.classList.remove('hidden');
        else document.getElementById('frAuthGuestPanel')?.classList.remove('hidden');
      } catch (error) {
        this.showMessage(this.friendlyError(error), 'error');
      } finally {
        this.setBusy(false);
      }
    },

    async signOut() {
      if (!this.configured) return;
      try {
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
        await this.handleSignedOut();
        this.showMessage('Signed out. This browser is now using its guest data.', 'success');
      } catch (error) {
        this.showMessage(this.friendlyError(error), 'error');
      }
    },

    async handleSignedOut(expectedGeneration = this.sessionGeneration) {
      if (this.signOutPromise) return this.signOutPromise;
      if (!this.currentUser && !this.originalStorageGet.call(localStorage, OWNER_KEY)) {
        this.updateHeader();
        return;
      }
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
      this.syncRequested = false;
      this.cloudReady = false;
      this.signOutPromise = Promise.resolve().then(async () => {
        // A new sign-in may have completed while this sign-out callback was
        // queued. Never let a stale SIGNED_OUT event erase that user's data.
        if (expectedGeneration !== this.sessionGeneration) {
          this.signOutPromise = null;
          return;
        }
        this.applyingRemote = true;
        try {
          // Remove the account marker first so every operation below addresses
          // Guest's namespace. The signed-in account's local cache is left under
          // its own namespace and is never visible to Guest.
          this.originalStorageRemove.call(localStorage, OWNER_KEY);
          STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
          const guest = this.getGuestBackup();
          STORAGE_KEYS.forEach(key => {
            if (typeof guest[key] === 'string') localStorage.setItem(key, guest[key]);
          });
          this.currentUser = null;
          this.cloudReady = false;
          this.credentialStatus = {};
          this.credentialStatusError = '';
          this.lastSyncAt = null;
          this.refreshApplicationFromStorage();
        } finally {
          this.applyingRemote = false;
          if (expectedGeneration === this.sessionGeneration) {
            this.updateHeader();
            this.updateCredentialStatusUI();
            document.getElementById('frAuthGuestPanel')?.classList.remove('hidden');
            document.getElementById('frAuthSignedInPanel')?.classList.add('hidden');
            document.getElementById('frAuthRecoveryPanel')?.classList.add('hidden');
            document.getElementById('frAuthConfigNote')?.classList.toggle('hidden', this.configured);
            this.setSyncStatus('Guest mode is active. Sign in whenever you want to sync.');
            window.dispatchEvent(new CustomEvent('frameratedataready'));
          }
          this.signOutPromise = null;
        }
      });
      return this.signOutPromise;
    },

    mergeGuestDataIntoAccount() {
      const guest = this.getGuestBackup();
      return this.mergePayloads(this.readLocalPayload(), guest);
    },

    setMode(mode) {
      this.mode = mode === 'signup' ? 'signup' : 'signin';
      const signIn = document.getElementById('frAuthModeSignIn');
      const signUp = document.getElementById('frAuthModeSignUp');
      const submit = document.getElementById('frAuthSubmitBtn');
      const password = document.getElementById('frAuthPassword');
      if (signIn) { signIn.classList.toggle('active', this.mode === 'signin'); signIn.setAttribute('aria-selected', String(this.mode === 'signin')); }
      if (signUp) { signUp.classList.toggle('active', this.mode === 'signup'); signUp.setAttribute('aria-selected', String(this.mode === 'signup')); }
      if (submit) submit.innerHTML = this.mode === 'signup' ? 'Create account <span aria-hidden="true">↗</span>' : 'Sign in securely <span aria-hidden="true">↗</span>';
      if (password) password.autocomplete = this.mode === 'signup' ? 'new-password' : 'current-password';
      this.clearMessage();
    },

    showRecoveryPanel() {
      document.getElementById('frAuthGuestPanel')?.classList.add('hidden');
      document.getElementById('frAuthSignedInPanel')?.classList.add('hidden');
      document.getElementById('frAuthRecoveryPanel')?.classList.remove('hidden');
    },

    openModal() {
      const modal = document.getElementById('frAuthModal');
      if (!modal) return;
      modal.classList.remove('hidden');
      document.body.classList.add('fr-auth-open');
      document.getElementById('frAuthConfigNote')?.classList.toggle('hidden', this.configured);
      document.getElementById('frAuthGuestPanel')?.classList.toggle('hidden', Boolean(this.currentUser));
      document.getElementById('frAuthSignedInPanel')?.classList.toggle('hidden', !this.currentUser);
      document.getElementById('frAuthRecoveryPanel')?.classList.add('hidden');
      const email = document.getElementById('frAuthUserEmail');
      if (email) email.textContent = this.currentUser?.email || 'Signed in with Google';
      this.setSyncStatus(this.configured
        ? (this.cloudReady ? 'Cloud sync is connected.' : 'Your account is signed in. Checking cloud sync…')
        : 'Guest mode is active; cloud accounts are not configured yet.');
      setTimeout(() => (this.currentUser ? document.getElementById('frAuthSyncNowBtn') : document.getElementById('frAuthEmail'))?.focus(), 40);
    },

    closeModal() {
      document.getElementById('frAuthModal')?.classList.add('hidden');
      document.body.classList.remove('fr-auth-open');
    },

    setBusy(busy) {
      ['frAuthSubmitBtn', 'frAuthGoogleBtn', 'frAuthSyncNowBtn', 'frAuthSignOutBtn', 'frAuthForgotBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = Boolean(busy);
      });
      const submit = document.getElementById('frAuthSubmitBtn');
      if (submit && busy) submit.textContent = 'Please wait…';
      else if (submit) submit.innerHTML = this.mode === 'signup' ? 'Create account <span aria-hidden="true">↗</span>' : 'Sign in securely <span aria-hidden="true">↗</span>';
    },

    showMessage(message, type = 'info') {
      const el = document.getElementById('frAuthMessage');
      if (!el) return;
      el.textContent = String(message || '');
      el.className = `fr-auth-message fr-auth-message-${type}`;
      el.classList.remove('hidden');
    },

    clearMessage() {
      document.getElementById('frAuthMessage')?.classList.add('hidden');
    },

    setSyncStatus(message) {
      const el = document.getElementById('frAuthSyncStatus');
      if (el) el.textContent = message;
    },

    updateHeader() {
      const btn = document.getElementById('frAuthOpenBtn');
      const label = document.getElementById('frAuthHeaderLabel');
      if (!btn || !label) return;
      label.textContent = this.currentUser ? (this.currentUser.email?.split('@')[0] || 'Account') : 'Guest · Sync';
      btn.title = this.currentUser ? `Signed in as ${this.currentUser.email || 'Google account'} · Manage sync` : 'Guest mode · Sign in to sync your data';
      btn.classList.toggle('fr-auth-connected', Boolean(this.currentUser && this.cloudReady));
      btn.setAttribute('aria-label', btn.title);
    },

    getRedirectUrl() {
      return `${window.location.origin}${window.location.pathname}`;
    },

    ensureConfigured() {
      if (!this.configured || !this.client) {
        this.showMessage('Cloud accounts are not configured. Follow README.md to add your Supabase URL and public key. Guest mode still works.', 'error');
        return false;
      }
      return true;
    },

    friendlyError(error) {
      const message = String(error?.message || 'Unknown error');
      if (/Invalid login credentials/i.test(message)) return 'Email or password was not accepted.';
      if (/Email not confirmed/i.test(message)) return 'Please confirm your email address using the link sent to you.';
      if (/provider is not enabled|Unsupported provider/i.test(message)) return 'Google sign-in is not enabled yet in Supabase Auth settings.';
      if (/Failed to fetch|NetworkError/i.test(message)) return 'Network request failed. Check your connection and Supabase project URL.';
      if (/relation .* does not exist|Could not find the table/i.test(message)) return `The ${TABLE} table is missing. Run supabase/schema.sql in the Supabase SQL Editor.`;
      if (/row-level security|permission denied|violates row-level/i.test(message)) return 'The database rejected this request. Check the RLS policies in supabase/schema.sql.';
      return message;
    },

    showToast(message) {
      if (window.App && typeof App.showToast === 'function') App.showToast(message);
    }
  };

  window.FrameRateAuth = Auth;
  // Install account-scoped storage before App.init() reads any saved settings.
  // This also migrates unscoped API credentials from earlier FrameRate builds.
  Auth.patchLocalStorage();
  Auth.migrateLegacyProfileSettings();
  document.addEventListener('DOMContentLoaded', () => Auth.init());
})();
