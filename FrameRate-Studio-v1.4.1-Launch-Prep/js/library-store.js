(function () {
  'use strict';

  // Keep complete Letterboxd imports out of localStorage's small quota.
  // Each browser-local library is isolated by FrameRate's existing account scope.
  const DB_NAME = 'framerate-library-v1';
  const STORE_NAME = 'libraries';
  const DB_VERSION = 1;

  function currentScope() {
    const auth = window.FrameRateAuth;
    try {
      if (auth && typeof auth.getProfileScope === 'function') {
        return String(auth.getProfileScope() || 'guest');
      }
      if (auth && auth.currentUser && auth.currentUser.id) {
        return String(auth.currentUser.id);
      }
    } catch (error) {
      console.warn('[FrameRate Library] Could not resolve account scope:', error);
    }
    return 'guest';
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not available in this browser.'));
        return;
      }
      let request;
      try {
        request = window.indexedDB.open(DB_NAME, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'scope' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open the local library database.'));
      request.onblocked = () => reject(new Error('The local library database is busy in another tab. Close older FrameRate tabs and retry.'));
    });
  }

  async function get() {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(currentScope());
        request.onsuccess = () => {
          const record = request.result;
          resolve(record && Array.isArray(record.rows) ? record.rows : null);
        };
        request.onerror = () => reject(request.error || new Error('Could not read the local Letterboxd library.'));
        transaction.onabort = () => reject(transaction.error || new Error('The local library read was interrupted.'));
      });
    } finally {
      db.close();
    }
  }

  async function set(rows) {
    if (!Array.isArray(rows)) throw new TypeError('The Letterboxd library must be an array.');
    const db = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put({
          scope: currentScope(),
          rows,
          count: rows.length,
          updatedAt: new Date().toISOString()
        });
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Could not save the complete Letterboxd library.'));
        transaction.onabort = () => reject(transaction.error || new Error('The local library save was interrupted.'));
      });
      return true;
    } finally {
      db.close();
    }
  }

  async function clear() {
    const db = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(currentScope());
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error('Could not clear the local Letterboxd library.'));
        transaction.onabort = () => reject(transaction.error || new Error('The local library clear was interrupted.'));
      });
      return true;
    } finally {
      db.close();
    }
  }

  window.FrameRateLibraryStore = Object.freeze({ get, set, clear });
})();