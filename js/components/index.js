/**
 * Components Index
 * Exports all components for easy importing
 */

// App components
import App from './app/App.js';
import AppWithContext from './app/AppWithContext.js';

// Document components
import Document from './document/Document.js';
import EmptyState from './document/EmptyState.js';

// Item components
import Item from './item/Item.js';

// Matrix components
import MatrixVisualization from './matrix/MatrixVisualization.js';

// Export all components
export {
    App,
    AppWithContext,
    Document,
    EmptyState,
    Item,
    MatrixVisualization
};

// For backward compatibility with the global namespace
window.StruMLApp = window.StruMLApp || {};
window.StruMLApp.Components = {
    App,
    AppWithContext,
    Document,
    EmptyState,
    Item,
    MatrixVisualization
};