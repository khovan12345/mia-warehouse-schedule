/**
 * Storage management for MIA.VN Warehouse Schedule System
 * Handles localStorage operations with data persistence
 */

import { CONFIG } from "./config.js";

class StorageManager {
  constructor() {
    this.prefix = CONFIG.storage.prefix;
    this.keys = CONFIG.storage.keys;
    this.checkStorageAvailability();
  }

  /**
   * Check if localStorage is available
   */
  checkStorageAvailability() {
    try {
      const testKey = `${this.prefix}test`;
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      this.isAvailable = true;
    } catch (e) {
      console.warn("localStorage is not available:", e);
      this.isAvailable = false;
    }
  }

  /**
   * Get full key with prefix
   * @param {string} key - Storage key
   * @returns {string} Full key with prefix
   */
  getFullKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   * @returns {boolean} Success status
   */
  save(key, data) {
    if (!this.isAvailable) return false;

    try {
      const serialized = JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
        version: "2.0.0",
      });
      localStorage.setItem(this.getFullKey(key), serialized);
      return true;
    } catch (e) {
      console.error("Error saving to localStorage:", e);
      return false;
    }
  }

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Loaded data or default value
   */
  load(key, defaultValue = null) {
    if (!this.isAvailable) return defaultValue;

    try {
      const item = localStorage.getItem(this.getFullKey(key));
      if (!item) return defaultValue;

      const parsed = JSON.parse(item);
      return parsed.data || defaultValue;
    } catch (e) {
      console.error("Error loading from localStorage:", e);
      return defaultValue;
    }
  }

  /**
   * Remove data from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    if (!this.isAvailable) return false;

    try {
      localStorage.removeItem(this.getFullKey(key));
      return true;
    } catch (e) {
      console.error("Error removing from localStorage:", e);
      return false;
    }
  }

  /**
   * Clear all storage with prefix
   * @returns {boolean} Success status
   */
  clearAll() {
    if (!this.isAvailable) return false;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.error("Error clearing localStorage:", e);
      return false;
    }
  }

  /**
   * Get storage size in bytes
   * @returns {number} Total size in bytes
   */
  getSize() {
    if (!this.isAvailable) return 0;

    let size = 0;
    const keys = Object.keys(localStorage);

    keys.forEach((key) => {
      if (key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        size += key.length + (value ? value.length : 0);
      }
    });

    return size * 2; // UTF-16 encoding
  }

  /**
   * Check if storage quota is exceeded
   * @returns {boolean} True if quota exceeded
   */
  isQuotaExceeded() {
    // Most browsers have 5-10MB limit
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    return this.getSize() > maxSize * 0.9; // 90% threshold
  }

  /**
   * Save schedule data
   * @param {Object} schedule - Schedule data
   * @returns {boolean} Success status
   */
  saveSchedule(schedule) {
    return this.save(this.keys.schedule, schedule);
  }

  /**
   * Load schedule data
   * @returns {Object|null} Schedule data
   */
  loadSchedule() {
    return this.load(this.keys.schedule, {});
  }

  /**
   * Save employee data
   * @param {Array} employees - Employee data
   * @returns {boolean} Success status
   */
  saveEmployees(employees) {
    return this.save(this.keys.employees, employees);
  }

  /**
   * Load employee data
   * @returns {Array} Employee data
   */
  loadEmployees() {
    return this.load(
      this.keys.employees,
      CONFIG.employees.database.slice(0, 3)
    );
  }

  /**
   * Save user settings
   * @param {Object} settings - User settings
   * @returns {boolean} Success status
   */
  saveSettings(settings) {
    return this.save(this.keys.settings, settings);
  }

  /**
   * Load user settings
   * @returns {Object} User settings
   */
  loadSettings() {
    return this.load(this.keys.settings, {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      strategy: "balanced",
      employeeCount: 3,
      sundayWorkload: 50,
      theme: "light",
      notifications: true,
    });
  }

  /**
   * Save theme preference
   * @param {string} theme - Theme name
   * @returns {boolean} Success status
   */
  saveTheme(theme) {
    return this.save(this.keys.theme, theme);
  }

  /**
   * Load theme preference
   * @returns {string} Theme name
   */
  loadTheme() {
    return this.load(this.keys.theme, "light");
  }

  /**
   * Save custom peak days
   * @param {Array} peakDays - Array of peak days
   * @returns {boolean} Success status
   */
  savePeakDays(peakDays) {
    return this.save(this.keys.peakDays, peakDays);
  }

  /**
   * Load custom peak days
   * @returns {Array} Peak days
   */
  loadPeakDays() {
    return this.load(this.keys.peakDays, []);
  }

  // Custom configuration (optional advanced settings)
  saveCustomConfig(cfg) {
    return this.save('customConfig', cfg);
  }

  loadCustomConfig() {
    return this.load('customConfig', null);
  }

  /**
   * Export all data
   * @returns {Object} All stored data
   */
  exportAll() {
    const data = {
      schedule: this.loadSchedule(),
      employees: this.loadEmployees(),
      settings: this.loadSettings(),
      peakDays: this.loadPeakDays(),
      exportDate: new Date().toISOString(),
      version: "2.0.0",
    };

    return data;
  }

  /**
   * Import all data
   * @param {Object} data - Data to import
   * @returns {boolean} Success status
   */
  importAll(data) {
    try {
      if (data.schedule) this.saveSchedule(data.schedule);
      if (data.employees) this.saveEmployees(data.employees);
      if (data.settings) this.saveSettings(data.settings);
      if (data.peakDays) this.savePeakDays(data.peakDays);

      return true;
    } catch (e) {
      console.error("Error importing data:", e);
      return false;
    }
  }

  /**
   * Auto-save functionality
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   * @param {number} delay - Delay in milliseconds
   */
  autoSave(key, data, delay = 1000) {
    if (this.autoSaveTimers && this.autoSaveTimers[key]) {
      clearTimeout(this.autoSaveTimers[key]);
    }

    if (!this.autoSaveTimers) {
      this.autoSaveTimers = {};
    }

    this.autoSaveTimers[key] = setTimeout(() => {
      this.save(key, data);
      delete this.autoSaveTimers[key];
    }, delay);
  }

  /**
   * Get last sync time
   * @returns {Date|null} Last sync date
   */
  getLastSync() {
    const timestamp = this.load(this.keys.lastSync);
    return timestamp ? new Date(timestamp) : null;
  }

  /**
   * Update last sync time
   * @returns {boolean} Success status
   */
  updateLastSync() {
    return this.save(this.keys.lastSync, new Date().toISOString());
  }

  /**
   * Migrate old data format
   * @returns {boolean} Success status
   */
  migrateData() {
    try {
      // Check for old format data
      const oldSchedule = localStorage.getItem("warehouse_schedule");
      if (oldSchedule) {
        // Migrate to new format
        const schedule = JSON.parse(oldSchedule);
        this.saveSchedule(schedule);
        localStorage.removeItem("warehouse_schedule");
      }

      return true;
    } catch (e) {
      console.error("Error migrating data:", e);
      return false;
    }
  }

  /**
   * Create backup
   * @returns {string} Backup data as base64 string
   */
  createBackup() {
    const data = this.exportAll();
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  }

  /**
   * Restore from backup
   * @param {string} backup - Backup data as base64 string
   * @returns {boolean} Success status
   */
  restoreBackup(backup) {
    try {
      const json = decodeURIComponent(escape(atob(backup)));
      const data = JSON.parse(json);
      return this.importAll(data);
    } catch (e) {
      console.error("Error restoring backup:", e);
      return false;
    }
  }
}

// Create singleton instance
const storage = new StorageManager();

// Export instance and class
export { storage as default, StorageManager };
