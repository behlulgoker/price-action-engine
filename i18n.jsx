/**
 * Internationalization (i18n) System for Price Action Engine
 * @description React Context-based localization with hook API
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { tr } from './locales/tr.js';
import { en } from './locales/en.js';

// Available languages
const LANGUAGES = {
    tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷', translations: tr },
    en: { code: 'en', name: 'English', flag: '🇬🇧', translations: en },
};

const DEFAULT_LANGUAGE = 'tr';
const STORAGE_KEY = 'priceActionEngine_language';

// Create context
const LanguageContext = createContext(null);

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - The translations object
 * @param {string} path - Dot-separated key path (e.g., 'common.search')
 * @returns {string} The translated string or the key if not found
 */
const getNestedValue = (obj, path) => {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            console.warn(`[i18n] Missing translation key: ${path}`);
            return path; // Return key as fallback
        }
    }

    return result;
};

/**
 * Language Provider Component
 * Wraps the app and provides language context
 */
export const LanguageProvider = ({ children }) => {
    // Initialize from localStorage or use default
    const [language, setLanguageState] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && LANGUAGES[saved]) {
                return saved;
            }
        }
        return DEFAULT_LANGUAGE;
    });

    // Current language data
    const currentLang = LANGUAGES[language] || LANGUAGES[DEFAULT_LANGUAGE];

    // Persist language to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, language);
    }, [language]);

    // Set language with validation
    const setLanguage = useCallback((code) => {
        if (LANGUAGES[code]) {
            setLanguageState(code);
        } else {
            console.warn(`[i18n] Unknown language code: ${code}`);
        }
    }, []);

    // Translation function
    const t = useCallback((key, fallback = null) => {
        const value = getNestedValue(currentLang.translations, key);
        if (value === key && fallback) {
            return fallback;
        }
        return value;
    }, [currentLang]);

    // Context value
    const value = {
        language,
        setLanguage,
        t,
        currentLang,
        languages: LANGUAGES,
        isRTL: false, // For future RTL support
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

/**
 * useTranslation Hook
 * @returns {Object} { t, language, setLanguage, currentLang, languages }
 */
export const useTranslation = () => {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }

    return context;
};

/**
 * Language Selector Component
 * Displays flag buttons for language switching
 */
export const LanguageSelector = ({ className = '' }) => {
    const { language, setLanguage, languages } = useTranslation();

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {Object.values(languages).map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-2 py-1 rounded text-lg transition-all ${language === lang.code
                            ? 'bg-blue-600 scale-110'
                            : 'bg-gray-700 hover:bg-gray-600 opacity-60 hover:opacity-100'
                        }`}
                    title={lang.name}
                    aria-label={`Switch to ${lang.name}`}
                >
                    {lang.flag}
                </button>
            ))}
        </div>
    );
};

// Export languages for external use
export { LANGUAGES };
