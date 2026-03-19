/**
 * Shared utility functions — imported by all pages.
 */

export const setCurrentYear = (selector = '#current-year') => {
    const el = document.querySelector(selector);
    if (el) el.textContent = new Date().getFullYear();
};

export const formatDate = (
    dateString,
    options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
) => new Date(dateString).toLocaleDateString(undefined, options);
