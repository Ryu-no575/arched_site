/* Shared by the sign-in shell and authenticated app. No credentials are stored here. */
(function () {
  'use strict';
  if (!window.archedStorage109) {
    var memory = Object.create(null), nativeStore;
    try { nativeStore = window.localStorage; } catch (_) {}
    function warning() {
      window.ARCHED_STORAGE_TEMPORARY109 = true;
      window.dispatchEvent(new Event('arched-storage-warning'));
    }
    window.archedStorage109 = {
      getItem: function (key) {
        if (Object.prototype.hasOwnProperty.call(memory, key)) return memory[key];
        try { return nativeStore ? nativeStore.getItem(key) : null; } catch (_) { warning(); return null; }
      },
      setItem: function (key, value) {
        value = String(value);
        try { if (!nativeStore) throw Error(); nativeStore.setItem(key, value); delete memory[key]; }
        catch (_) { memory[key] = value; warning(); }
      },
      removeItem: function (key) {
        try { if (!nativeStore) throw Error(); nativeStore.removeItem(key); delete memory[key]; }
        catch (_) { memory[key] = null; warning(); }
      }
    };
  }
  if (!Object.hasOwn) Object.hasOwn = function (o, key) { return Object.prototype.hasOwnProperty.call(o, key); };
  if (!Array.prototype.at) Object.defineProperty(Array.prototype, 'at', { value: function (n) { n = Math.trunc(n) || 0; return this[n < 0 ? this.length + n : n]; }, configurable: true, writable: true });
  // The app uses structuredClone only for JSON study records.
  if (!window.structuredClone) window.structuredClone = function (v) { return JSON.parse(JSON.stringify(v)); };
  if (!window.ResizeObserver) {
    window.ResizeObserver = function (callback) { this.targets = []; this.callback = callback; this.update = function () { callback(this.targets.map(function (t) { return { target: t, contentRect: t.getBoundingClientRect() }; })); }.bind(this); };
    window.ResizeObserver.prototype.observe = function (target) { if (!this.targets.length) window.addEventListener('resize', this.update); this.targets.push(target); this.update(); };
    window.ResizeObserver.prototype.disconnect = function () { window.removeEventListener('resize', this.update); this.targets = []; };
  }
  var setting = window.archedStorage109.getItem('arched_display109') || 'auto';
  var constrained = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) || !!(navigator.connection && navigator.connection.saveData);
  var light = setting === 'light' || (setting === 'auto' && constrained);
  window.ARCHED_PERFORMANCE109 = { light: light, pixelRatio: light ? 1 : Math.min(window.devicePixelRatio || 1, 2) };
  document.documentElement.classList.toggle('arched-light109', light);
  function ready() {
    if (document.getElementById('displaySettings109')) return;
    var target = document.querySelector('.member-controls57') || document.querySelector('.topnav') || document.querySelector('main');
    if (!target) return;
    var label = document.createElement('label'); label.id = 'displaySettings109'; label.textContent = 'Display ';
    var select = document.createElement('select'); select.setAttribute('aria-label', 'Display performance');
    [['auto', 'Auto'], ['light', 'Light'], ['standard', 'Standard']].forEach(function (row) { var o = document.createElement('option'); o.value = row[0]; o.textContent = row[1]; select.appendChild(o); });
    select.value = setting;
    select.onchange = function () {
      window.archedStorage109.setItem('arched_display109', select.value);
      // Do not reload mid-question or interrupt an outstanding progress sync.
      window.ARCHED_PERFORMANCE109.light = select.value === 'light' || (select.value === 'auto' && constrained);
      window.ARCHED_PERFORMANCE109.pixelRatio = window.ARCHED_PERFORMANCE109.light ? 1 : Math.min(window.devicePixelRatio || 1, 2);
      document.documentElement.classList.toggle('arched-light109', window.ARCHED_PERFORMANCE109.light);
      window.dispatchEvent(new Event('resize'));
    };
    label.appendChild(select); target.appendChild(label);
    var status = document.createElement('div'); status.id = 'deviceNotice109'; status.setAttribute('role', 'status'); status.hidden = true; document.body.appendChild(status);
    function update() {
      status.textContent = window.ARCHED_STORAGE_TEMPORARY109 ? 'Browser storage is unavailable or full. Keep this tab open until account sync shows Saved. Offline progress may be lost when this tab closes.' : navigator.onLine === false ? 'You are offline. Keep this tab open; account sync will retry when connected.' : '';
      status.hidden = !status.textContent;
    }
    window.addEventListener('arched-storage-warning', update); window.addEventListener('online', update); window.addEventListener('offline', update); update();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
})();
