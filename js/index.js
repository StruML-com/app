/**
 * StruDoL - Structured Domain Language
 * Main entry point for the application
 */

// Import core modules
import { generateItemId, showAlert, saveScrollPosition, restoreScrollPosition, renderMarkdown, toggleSidebar, getLocalMarkdownPath } from './core/utils.js';

// Import state
import { DataContext, DataProvider } from './core/state/index.js';

// Import components
import {
    App,
    AppWithContext,
    Document,
    EmptyState,
    Item,
    MatrixVisualization
} from './components/index.js';

// Import item utilities
import {
    findItemById,
    findItemByTitle,
    findItemIdByTitle,
    findParentOfItem,
    removeItemById,
    addItem,
    getTypeFromTags,
    getListTypeIcon,
    itemHasAnyTag,
    itemHasAllTags,
    extractAllTags,
    filterItemsByTags
} from './components/item/ItemUtils.js';

// Import relation utilities
import { 
    getRelationsFromTags, 
    isRelationTag, 
    addRelationToTags, 
    removeRelationFromTags, 
    updateRelationReferences, 
    renderRelationTags, 
    updateRelatedItems 
} from './features/relations/RelationUtils.js';

// Import navigation utilities
import { 
    buildDocumentNavigationHtml, 
    attachNavigationHandlers, 
    showDragConfirmation, 
    populateItemSelectors 
} from './components/navigation/NavigationUtils.js';

// Import matrix utilities
import { 
    processMatrix, 
    loadMatrixEditor, 
    saveMatrixChanges, 
    createHeatmap, 
    createSankeyDiagram 
} from './components/matrix/MatrixUtils.js';

// Import export functionality
import { exportDocument } from './features/export/ExportManager.js';

// Import chatbot functionality
import * as ChatbotManager from './features/chatbot/ChatbotManager.js';

// Constants
const WEBHOOK_URL = window.StruMLConfig?.WEBHOOK_URL;
const LOCAL_STORAGE_KEY = window.StruMLConfig?.LOCAL_STORAGE_KEY || 'struml-data';
const LIST_TYPES = {
    priority: { icon: 'bi-bullseye', color: 'danger' },
    weight: { icon: 'bi-shield', color: 'success' },
    sequence: { icon: 'bi-collection', color: 'primary' },
    steps: { icon: 'bi-diagram-3', color: 'info' },
    temporality: { icon: 'bi-calendar-event', color: 'purple' },
    range: { icon: 'bi-graph-up-arrow', color: 'orange' },
    category: { icon: 'bi-folder', color: 'warning' },
    matrix: { icon: 'bi-table', color: 'teal' }
};
const RELATION_TYPES = {
    'extremely-high': { icon: 'bi-arrow-up-circle-fill', label: 'Extremely High', level: 'extremely-high', value: 9 },
    'very-high': { icon: 'bi-arrow-up-circle-fill', label: 'Very High', level: 'very-high', value: 8 },
    'high': { icon: 'bi-arrow-up-circle-fill', label: 'High', level: 'high', value: 7 },
    'slightly-high': { icon: 'bi-arrow-up-circle-fill', label: 'Slightly High', level: 'slightly-high', value: 6 },
    'neutral': { icon: 'bi-dash-circle-fill', label: 'Neutral', level: 'neutral', value: 5 },
    'slightly-low': { icon: 'bi-arrow-down-circle-fill', label: 'Slightly Low', level: 'slightly-low', value: 4 },
    'low': { icon: 'bi-arrow-down-circle-fill', label: 'Low', level: 'low', value: 3 },
    'very-low': { icon: 'bi-arrow-down-circle-fill', label: 'Very Low', level: 'very-low', value: 2 },
    'extremely-low': { icon: 'bi-arrow-down-circle-fill', label: 'Extremely Low', level: 'extremely-low', value: 1 },
    'related': { icon: 'bi-link', label: 'Related', level: '', value: 1 },
    'depends': { icon: 'bi-box-arrow-in-down-right', label: 'Depends on', level: '', value: 1 }
};

// Assign constants to the global namespace for backward compatibility
window.StruMLApp.Constants = {
    WEBHOOK_URL,
    LOCAL_STORAGE_KEY,
    LIST_TYPES,
    RELATION_TYPES
};

// Assign utility functions to the global namespace for backward compatibility
window.StruMLApp.Utils = {
    generateItemId,
    showAlert,
    saveScrollPosition,
    restoreScrollPosition,
    renderMarkdown,
    toggleSidebar,
    getLocalMarkdownPath,
    findItemById,
    findItemByTitle,
    findItemIdByTitle,
    findParentOfItem,
    removeItemById,
    addItem,
    getTypeFromTags,
    getListTypeIcon,
    itemHasAnyTag,
    itemHasAllTags,
    extractAllTags,
    filterItemsByTags,
    getRelationsFromTags,
    isRelationTag,
    addRelationToTags,
    removeRelationFromTags,
    updateRelationReferences,
    renderRelationTags,
    updateRelatedItems,
    buildDocumentNavigationHtml,
    attachNavigationHandlers,
    showDragConfirmation,
    populateItemSelectors,
    processMatrix,
    loadMatrixEditor,
    saveMatrixChanges,
    createHeatmap,
    createSankeyDiagram
};

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('StruDoL application initializing...');
    
    // Initialize the application components
    initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
    // Setup event handlers
    setupEventHandlers();
    
    // Initialize the chatbot
    ChatbotManager.init(window.app);
    
    // Assign chatbot to global namespace for backward compatibility
    window.StruMLApp.Chatbot = ChatbotManager;
    
    console.log('StruDoL application initialized');
}

/**
 * Setup event handlers
 */
function setupEventHandlers() {
    // Setup event handlers for buttons, modals, etc.
    // This would be a simplified version of the setupEventHandlers function in main.js
    console.log('Setting up event handlers...');
    
    // Example: Setup sidebar toggle buttons
    const collapseSidebarBtn = document.getElementById('collapse-sidebar-btn');
    const expandSidebarBtn = document.getElementById('expand-sidebar-btn');
    
    if (collapseSidebarBtn) {
        collapseSidebarBtn.addEventListener('click', () => toggleSidebar(true));
    }
    
    if (expandSidebarBtn) {
        expandSidebarBtn.addEventListener('click', () => toggleSidebar(false));
    }
    
    // More event handlers would be set up here...
}

// Export functions for module usage
export {
    // Core functions
    initializeApp,
    setupEventHandlers,
    
    // State
    DataContext,
    DataProvider,
    
    // Components
    App,
    AppWithContext,
    Document,
    EmptyState,
    Item,
    MatrixVisualization,
    
    // Features
    exportDocument,
    ChatbotManager
};