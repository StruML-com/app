/**
 * State Index
 * Exports all state-related modules
 */

import React from 'react';
import DataContext from './context.js';
import { DataProvider } from './provider.js';

// Export context and provider
export {
    DataContext,
    DataProvider
};

// For backward compatibility with the global namespace
window.StruMLApp = window.StruMLApp || {};
window.StruMLApp.State = {
    DataContext,
    DataProvider
};