/**
 * App Component
 * Main application component that initializes the app
 */

import React from 'react';
import { DataContext } from '../../core/state.js';
import Document from '../document/Document.js';
import { saveScrollPosition, restoreScrollPosition } from '../../core/utils.js';
import { extractAllTags } from '../../components/item/ItemUtils.js';

/**
 * App component
 */
const App = React.memo(() => {
    const [isInitialized, setIsInitialized] = React.useState(false);
    const context = React.useContext(DataContext);

    // Initialize event handlers and data
    React.useEffect(() => {
        // Setup handlers
        const destroyHandlers = window.StruMLApp.Main?.setupEventHandlers(); // Call from main.js
        
        // Try to load data from localStorage
        const savedData = localStorage.getItem(window.StruMLApp.Constants?.LOCAL_STORAGE_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData && parsedData.items && parsedData.items.length > 0) {
                    window.StruMLApp.Main?.initializeApp(parsedData); // Call from main.js
                }
            } catch (error) {
                console.error("Failed to load data:", error);
            }
        }
        
        // Mark as initialized after setup
        setIsInitialized(true);

        return destroyHandlers;
    }, []);
    
    // Setup global app functions and load initial data if needed
    React.useEffect(() => {
        if (isInitialized && context) {
            window.app = context; // Make context globally available as window.app

            // Initialize the Chatbot module *after* context is available
            if (window.StruMLApp.Chatbot && typeof window.StruMLApp.Chatbot.init === 'function') {
                console.log("Initializing Chatbot module..."); // Debug log
                window.StruMLApp.Chatbot.init(context);
            } else {
                console.error("Chatbot module or init function not found."); // Debug log
            }

            // Define function to add top level item globally
            window.addTopLevelItem = () => {
                // Save scroll position
                saveScrollPosition();
                
                const modalElement = document.getElementById('item-editor-modal');
                if (!modalElement) return;
                const modal = new bootstrap.Modal(modalElement);
                const titleInput = document.getElementById('item-title');
                const tagsInput = document.getElementById('item-tags');
                const contentInput = document.getElementById('item-content');
                const idInput = document.getElementById('item-id');
                const originalTitleInput = document.getElementById('original-title');
                const parentIdInput = document.getElementById('parent-id');
                const relationsList = document.getElementById('relations-list');
                
                // Clear form
                if (titleInput) titleInput.value = '';
                if (originalTitleInput) originalTitleInput.value = '';
                if (tagsInput) tagsInput.value = '';
                if (contentInput) contentInput.value = '';
                if (idInput) idInput.value = '';
                if (parentIdInput) parentIdInput.value = '';
                
                // Initialize or reset editor
                if (window.simpleMDE) {
                    window.simpleMDE.value('');
                    setTimeout(() => window.simpleMDE.codemirror.refresh(), 10);
                } else if (contentInput) {
                    window.simpleMDE = new SimpleMDE({ 
                        element: contentInput,
                        spellChecker: false,
                        status: false
                    });
                }
                
                // Initialize or reset tagify
                if (tagsInput) {
                    if (!window.tagify) {
                        // Get all tags as whitelist
                        const allTags = extractAllTags(context.items);
                        
                        window.tagify = new Tagify(tagsInput, {
                            dropdown: {
                                enabled: 1,
                                maxItems: 5,
                                position: "text",
                                closeOnSelect: false,
                                highlightFirst: true,
                                searchKeys: ["value"]
                            },
                            whitelist: allTags,
                            enforceWhitelist: false,
                            maxTags: 50
                        });
                    } else {
                        window.tagify.removeAllTags();
                    }
                }
                
                // Reset relations list
                if (relationsList) {
                    relationsList.innerHTML = '<div class="alert alert-info">No relations defined</div>';
                }
                
                const editorTitle = document.getElementById('item-editor-title');
                if (editorTitle) editorTitle.textContent = 'Add New Item';
                
                // Restore scroll position when modal closes
                modalElement.addEventListener('hidden.bs.modal', function onHidden() {
                    restoreScrollPosition();
                    modalElement.removeEventListener('hidden.bs.modal', onHidden);
                });
                
                modal.show();
            };

            // Load initial data if available (passed from main.js)
            if (window.initialData) {
                context.importDocument(window.initialData, window.initialFilename || "");
                window.initialData = null;
                window.initialFilename = null;
            }
        }
    }, [isInitialized, context]); // Depend on context being available
    
    if (!isInitialized || !context) {
        // Show loading or welcome screen until initialized
        return null; // Or a loading indicator
    }
    
    return <Document />;
});

export default App;