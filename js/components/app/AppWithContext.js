/**
 * AppWithContext Component
 * Wraps the App component with the DataContext provider
 */

import React from 'react';
import App from './App.js';

/**
 * AppWithContext component
 * Wraps the App component with the DataContext provider
 */
const AppWithContext = () => {
    const { DataProvider } = window.StruMLApp.State; // Get Provider from State
    return (
        <DataProvider>
            <App />
        </DataProvider>
    );
};

export default AppWithContext;