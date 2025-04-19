// Assign Main object to the global namespace
window.StruMLApp = window.StruMLApp || {};

window.StruMLApp.Main = (() => {
    // Access dependencies from global scope
    const React = window.React;
    const ReactDOM = window.ReactDOM;
    const Utils = window.StruMLApp.Utils;
    const Export = window.StruMLApp.Export;
    const { DataProvider, DataContext } = window.StruMLApp.State;
    const { AppWithContext } = window.StruMLApp.Components;

    // Constants (moved here)
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

    // Assign constants to the global namespace for Utils/Components to access
    window.StruMLApp.Constants = {
        WEBHOOK_URL,
        LOCAL_STORAGE_KEY,
        LIST_TYPES,
        RELATION_TYPES
    };

    // Bootstrap components initialization (moved here)
    const infoPanelElement = document.getElementById('info-panel');
    // chatbotPanel initialization is now handled in js/chatbot.js
    const infoPanel = infoPanelElement ? new bootstrap.Offcanvas(infoPanelElement) : null;

    /**
     * Chatbot functionality is now handled in js/chatbot.js
     */

    // Setup event handlers for the UI (moved here)
    const setupEventHandlers = () => {
        // Setup UI event handlers map
        const handlers = {
            // Modal dialog handlers
            handleSaveItem: () => {
                try {
                    // Save scroll position
                    Utils.saveScrollPosition();

                    const titleInput = document.getElementById('item-title');
                    const contentInput = document.getElementById('item-content');
                    const tagsInput = document.getElementById('item-tags');
                    const idInput = document.getElementById('item-id');
                    const originalTitleInput = document.getElementById('original-title');
                    const parentIdInput = document.getElementById('parent-id');

                    if (!titleInput || !titleInput.value.trim()) {
                        Utils.showAlert("Title is required", "danger");
                        return;
                    }

                    // Get original title for reference change detection
                    const originalTitle = originalTitleInput ? originalTitleInput.value : '';
                    const newTitle = titleInput.value.trim();

                    // Get tags properly from Tagify if available
                    let normalizedTags = '';
                    if (window.tagify) {
                        try {
                            // Extract regular tags from Tagify
                            normalizedTags = window.tagify.value
                                .map(t => t.value)
                                .filter(tag => !tag.includes('>>') && tag.trim())
                                .join(', ');
                        } catch (e) {
                            console.warn("Error extracting tags from Tagify:", e);
                            normalizedTags = tagsInput ? tagsInput.value : '';
                        }
                    } else if (tagsInput) {
                        normalizedTags = tagsInput.value;
                    }

                    // Get relation tags from the relations list
                    const relationsList = document.getElementById('relations-list');
                    const relationTags = [];

                    if (relationsList) {
                        const relationElements = relationsList.querySelectorAll('.relation-tag');
                        relationElements.forEach(el => {
                            if (el.dataset.relation) {
                                relationTags.push(el.dataset.relation);
                            }
                        });
                    }

                    // Combine regular tags and relation tags
                    let tags = normalizedTags;
                    if (relationTags.length > 0) {
                        tags = tags ? `${tags}, ${relationTags.join(', ')}` : relationTags.join(', ');
                    }

                    // Check if matrix item
                    const isMatrixItem = idInput && idInput.value && normalizedTags.includes('type::matrix');
                    if (isMatrixItem) {
                        // Find existing item to preserve tags
                        const existingItem = Utils.findItemById(window.app.items, idInput.value);
                        if (existingItem && existingItem.tags) {
                            // Extract matrix tags
                            const matrixTags = existingItem.tags.split(',')
                                .map(tag => tag.trim())
                                .filter(tag =>
                                    tag.startsWith('source-item::') ||
                                    tag.startsWith('target-item::') ||
                                    tag.startsWith('values::'))
                                .join(', ');

                            // Add matrix tags if they exist
                            if (matrixTags) {
                                tags = tags ? `${tags}, ${matrixTags}` : matrixTags;
                            }
                        }
                    }

                    // Get content from SimpleMDE
                    let content = '';
                    if (window.simpleMDE) {
                        try {
                            content = window.simpleMDE.value();
                        } catch (e) {
                            console.warn("SimpleMDE error:", e);
                            content = contentInput ? contentInput.value || '' : '';
                        }
                    } else {
                        content = contentInput ? contentInput.value || '' : '';
                    }

                    // Create item data
                    const itemData = {
                        title: newTitle,
                        tags: tags,
                        content: content,
                        items: [] // Preserve children during update
                    };

                    // Hide the modal
                    const modalElement = document.getElementById('item-editor-modal');
                    if (modalElement) {
                        const modalInstance = bootstrap.Modal.getInstance(modalElement);
                        if (modalInstance) {
                            modalInstance.hide();
                        }
                    }

                    const currentId = idInput ? idInput.value : null;
                    const parentId = parentIdInput ? parentIdInput.value : null;

                    if (currentId) {
                        // Editing existing item
                        itemData.id = currentId;

                        // Check if title changed and needs references updated
                        if (originalTitle && originalTitle !== newTitle && window.app?.checkRelationReferences) {
                            window.app.checkRelationReferences(originalTitle, newTitle, itemData, (updated, count) => {
                                if (updated) {
                                    Utils.showAlert(`Updated ${count} reference${count !== 1 ? 's' : ''} to the renamed item`, "success");
                                }
                                window.app.updateItem(itemData);
                            });
                        } else {
                            window.app.updateItem(itemData);
                        }

                        // Open matrix editor if matrix item
                        if (isMatrixItem) {
                            setTimeout(() => {
                                window.app.openMatrixEditor(itemData);
                            }, 300);
                        }
                    } else {
                        // Creating new item
                        itemData.id = Utils.generateItemId();
                        const targetParentId = parentId || null;

                        if (window.app) {
                            window.app.addItem(itemData, targetParentId);
                        }

                        // Open matrix editor if matrix item
                        if (tags.includes('type::matrix')) {
                            setTimeout(() => {
                                const newItem = Utils.findItemById(window.app.items, itemData.id);
                                if (newItem) {
                                    window.app.openMatrixEditor(newItem);
                                }
                            }, 300);
                        }
                    }

                    // Restore scroll position
                    Utils.restoreScrollPosition();
                } catch (error) {
                    console.error("Error saving item:", error);
                    Utils.showAlert("Error saving item: " + error.message, "danger");

                    // Restore scroll position on error
                    Utils.restoreScrollPosition();
                }
            },

            // Button click handlers
            toggleSidebar: (collapse) => {
                Utils.toggleSidebar(collapse);
            },

            handleFileImport: (file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (!data || !data.items) {
                            throw new Error("Invalid document format");
                        }

                        initializeApp(data, file.name); // Use initializeApp from this scope

                        setTimeout(() => {
                            document.dispatchEvent(new Event('app-imported-data'));
                        }, 500);
                    } catch (error) {
                        console.error("Error importing file:", error);
                        Utils.showAlert("Error importing file: " + error.message, "danger");
                    }
                };
                reader.readAsText(file);
            }
        };

        // Load guide content
        const loadGuideContent = async () => {
            try {
                const guideContent = document.getElementById('guide-content');
                if (guideContent) {
                    const response = await fetch('bm/guide.md');
                    if (!response.ok) {
                        guideContent.innerHTML = '<div class="alert alert-warning">Guide content could not be loaded</div>';
                        return;
                    }

                    const text = await response.text();
                    guideContent.innerHTML = Utils.renderMarkdown(text);
                }
            } catch (error) {
                console.error('Error loading guide content:', error);
                const guideContent = document.getElementById('guide-content');
                if (guideContent) {
                    guideContent.innerHTML = '<div class="alert alert-danger">Error loading guide: ' + error.message + '</div>';
                }
            }
        };

        // Setup button handlers
        const buttonHandlers = [
            { id: 'collapse-sidebar-btn', event: 'click', handler: () => handlers.toggleSidebar(true) },
            { id: 'expand-sidebar-btn', event: 'click', handler: () => handlers.toggleSidebar(false) },
            { id: 'save-item-btn', event: 'click', handler: handlers.handleSaveItem },
            { id: 'save-download-btn', event: 'click', handler: () => {
                handlers.handleSaveItem();
                setTimeout(() => window.app?.exportDocument('json'), 500);
            }},
            { id: 'export-before-clear-btn', event: 'click', handler: () => {
                window.app?.exportDocument('json');
            }},
            { id: 'tags-help-btn', event: 'click', handler: () => {
                const helpText = document.getElementById('tags-help-text');
                helpText?.classList.toggle('d-none');
            }},
            { id: 'content-help-btn', event: 'click', handler: () => {
                const helpText = document.getElementById('content-help-text');
                helpText?.classList.toggle('d-none');
            }},
            // Removed handler for non-existent 'list-type-help-btn'
            { id: 'relation-types-help-btn', event: 'click', handler: () => {
                const helpText = document.getElementById('relation-types-help-text');
                helpText?.classList.toggle('d-none');
            }},
            { id: 'export-json-btn', event: 'click', handler: () => window.app?.exportDocument('json') },
            { id: 'export-md-btn', event: 'click', handler: () => window.app?.exportDocument('md') },
            { id: 'export-html-btn', event: 'click', handler: () => window.app?.exportDocument('html') },
            { id: 'export-csv-btn', event: 'click', handler: () => window.app?.exportDocument('csv') },
            { id: 'create-new-btn', event: 'click', handler: () => initializeApp({ title: "New Document", items: [] }) }, // Use initializeApp from this scope
            { id: 'clear-btn', event: 'click', handler: () => {
                const modalElement = document.getElementById('clear-confirm-modal');
                if (modalElement) new bootstrap.Modal(modalElement).show();
            }},
            { id: 'confirm-clear-btn', event: 'click', handler: () => {
                if (window.app) window.app.clearDocument();
                const modalElement = document.getElementById('clear-confirm-modal');
                if (modalElement) bootstrap.Modal.getInstance(modalElement)?.hide();
            }},
            { id: 'import-btn', event: 'click', handler: () => document.getElementById('file-input')?.click() },
            // Removed handler for non-existent 'import-json-btn'
            { id: 'delete-item-btn', event: 'click', handler: () => {
                const idInput = document.getElementById('item-id');
                const id = idInput ? idInput.value : null;
                if (id) {
                    const confirmBtn = document.getElementById('confirm-delete-btn');
                    if (confirmBtn) confirmBtn.dataset.itemId = id;
                    const editorModal = document.getElementById('item-editor-modal');
                    if (editorModal) bootstrap.Modal.getInstance(editorModal)?.hide();
                    const deleteModal = document.getElementById('delete-confirm-modal');
                    if (deleteModal) new bootstrap.Modal(deleteModal).show();
                }
            }},
            { id: 'confirm-delete-btn', event: 'click', handler: () => {
                const confirmBtn = document.getElementById('confirm-delete-btn');
                const id = confirmBtn ? confirmBtn.dataset.itemId : null;
                if (id && window.app) {
                    window.app.removeItem(id);
                    const deleteModal = document.getElementById('delete-confirm-modal');
                    if (deleteModal) bootstrap.Modal.getInstance(deleteModal)?.hide();
                }
            }},
            { id: 'add-top-item-btn', event: 'click', handler: () => window.addTopLevelItem && window.addTopLevelItem() },
            { id: 'collapse-all-items-btn', event: 'click', handler: () => {
                // Toggle between collapse and expand all
                const button = document.getElementById('collapse-all-items-btn');
                if (!button) return;
                const isCollapsed = button.getAttribute('data-collapsed') === 'true';

                if (isCollapsed) {
                    // Expand all
                    document.querySelectorAll('.doc-nav-toggle').forEach(toggle => {
                        const itemId = toggle.dataset.id;
                        const icon = toggle.querySelector('i');

                        if (icon && icon.classList.contains('bi-chevron-right')) {
                            const collapseElement = document.getElementById(`nav-collapse-${itemId}`);
                            if (collapseElement) {
                                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement);
                                bsCollapse.show();
                                icon.classList.replace('bi-chevron-right', 'bi-chevron-down');
                                if (window.app?.toggleNavExpansion) {
                                    window.app.toggleNavExpansion(itemId, true);
                                }
                            }
                        }
                    });

                    if (window.app) {
                        const expandedState = {};
                        const expandAllItems = (items) => {
                            if (!items || !Array.isArray(items)) return;
                            items.forEach(item => {
                                if (item.id) expandedState[item.id] = true;
                                if (item.items && item.items.length > 0) {
                                    expandAllItems(item.items);
                                }
                            });
                        };
                        expandAllItems(window.app.items || []);

                        window.app.setExpandedItems(expandedState);

                        const navExpanded = {};
                        window.app.items.forEach(item => {
                            if (item.id) navExpanded[item.id] = true;
                        });
                        window.app.setNavExpandedItems(navExpanded);
                    }

                    button.innerHTML = '<i class="bi bi-arrows-collapse"></i> Collapse all';
                    button.setAttribute('data-collapsed', 'false');
                    Utils.showAlert("All items have been expanded", "info");
                } else {
                    // Collapse all
                    document.querySelectorAll('.doc-nav-toggle').forEach(toggle => {
                        const itemId = toggle.dataset.id;
                        const icon = toggle.querySelector('i');

                        if (icon && icon.classList.contains('bi-chevron-down')) {
                            const collapseElement = document.getElementById(`nav-collapse-${itemId}`);
                            if (collapseElement) {
                                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement);
                                bsCollapse.hide();
                                icon.classList.replace('bi-chevron-down', 'bi-chevron-right');
                                if (window.app?.toggleNavExpansion) {
                                    window.app.toggleNavExpansion(itemId, false);
                                }
                            }
                        }
                    });

                    if (window.app && window.app.setNavExpandedItems) {
                        window.app.setNavExpandedItems({});
                        window.app.setExpandedItems({});
                    }

                    button.innerHTML = '<i class="bi bi-arrows-expand"></i> Expand all';
                    button.setAttribute('data-collapsed', 'true');
                    Utils.showAlert("All items have been collapsed", "info");
                }
            }},
            { id: 'toggle-item-details-btn', event: 'click', handler: () => {
                if (window.app?.toggleShowItemDetails) {
                    window.app.toggleShowItemDetails();
                    // Update button appearance after state change (use timeout for state update)
                    setTimeout(() => {
                        const button = document.getElementById('toggle-item-details-btn');
                        const icon = button?.querySelector('i');
                        const textSpan = button?.querySelector('span.button-text'); // Select the text span
                        if (button && icon && textSpan && window.app) {
                            if (window.app.showItemDetails) {
                                icon.classList.remove('bi-eye');
                                icon.classList.add('bi-eye-slash');
                                button.title = "Hide Item Details";
                                textSpan.textContent = " Hide Details"; // Update text
                            } else {
                                icon.classList.remove('bi-eye-slash');
                                icon.classList.add('bi-eye');
                                button.title = "Show Item Details";
                                textSpan.textContent = " View Details"; // Update text
                            }
                        }
                    }, 50);
                }
            }}
        ];

        // Add event listener for guide tab
        const guideTab = document.getElementById('guide-tab');
        if (guideTab) {
            guideTab.addEventListener('shown.bs.tab', loadGuideContent);
            guideTab.addEventListener('click', () => {
                if (window.app && window.app.items) {
                    const expanded = {};
                    const expandAllItems = (items) => {
                        if (!items || !Array.isArray(items)) return;
                        items.forEach(item => {
                            if (item.id) expanded[item.id] = true;
                            if (item.items && item.items.length > 0) {
                                expandAllItems(item.items);
                            }
                        });
                    };
                    expandAllItems(window.app.items);
                    window.app.setExpandedItems(expanded);
                }
            });
        }

        // Attach all handlers
        buttonHandlers.forEach(({ id, event, handler }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener(event, handler);
            } else {
                console.warn(`Element with ID ${id} not found for event handler.`);
            }
        });

        // File input handler
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    if (file.name.endsWith('.json')) {
                        handlers.handleFileImport(file);
                    } else {
                        Utils.showAlert("Please upload a valid JSON file", "danger");
                    }
                }
            });
        }

        // File dropzone
        const fileDropzone = document.getElementById('file-dropzone');
        if (fileDropzone) {
            fileDropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileDropzone.classList.add('border-primary');
            });

            fileDropzone.addEventListener('dragleave', () => {
                fileDropzone.classList.remove('border-primary');
            });

            fileDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                fileDropzone.classList.remove('border-primary');

                if (e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.name.endsWith('.json')) {
                        handlers.handleFileImport(file);
                    } else {
                        Utils.showAlert("Please upload a valid JSON file", "danger");
                    }
                }
            });

            fileDropzone.addEventListener('click', () => {
                fileInput?.click();
            });
        }

        // Return cleanup function
        return () => {
            buttonHandlers.forEach(({ id, event, handler }) => {
                const element = document.getElementById(id);
                element?.removeEventListener(event, handler);
            });
            guideTab?.removeEventListener('shown.bs.tab', loadGuideContent);
            // Add cleanup for other listeners if needed
        };
    };

    // Initialize the app with data (moved here)
    const initializeApp = (data, filename = "") => {
        if (!data || !data.items) {
            console.error("Invalid data for initialization");
            Utils.showAlert("Invalid document format", "danger");
            return false;
        }

        if (window.app) {
            const success = window.app.importDocument(data, filename);

            if (success) {
                document.getElementById('welcome-screen')?.classList.add('d-none');
                document.getElementById('document-content')?.classList.remove('d-none');
                document.getElementById('sidebar')?.classList.remove('collapsed');
                document.getElementById('main-content')?.classList.remove('expanded');

                setTimeout(() => {
                    window.app.updateDocumentNavigation();
                    window.app.updateTagFilters();
                }, 200);

                return true;
            }

            return false;
        } else {
            // Store data for later use by the App component
            window.initialData = data;
            window.initialFilename = filename;
            document.getElementById('welcome-screen')?.classList.add('d-none');
            document.getElementById('document-content')?.classList.remove('d-none');
            document.getElementById('sidebar')?.classList.remove('collapsed');
            document.getElementById('main-content')?.classList.remove('expanded');

            return true;
        }
    };

    // Render the application
    const rootElement = document.getElementById('document-content');
    if (rootElement) {
        // Hide sidebar initially
        document.getElementById('sidebar')?.classList.add('collapsed');
        document.getElementById('main-content')?.classList.add('expanded');
        
        const root = ReactDOM.createRoot(rootElement);
        root.render(<AppWithContext />);
    } else {
        console.error("Root element 'document-content' not found.");
    }

    // App component - Main application component
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
 
             // Initialize Bootstrap tooltips
             const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
             const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                 return new bootstrap.Tooltip(tooltipTriggerEl);
             });
 
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
                Utils.saveScrollPosition();
                
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
                        const allTags = Utils.extractAllTags(context.items);
                        
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
                    Utils.restoreScrollPosition();
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

    // Expose necessary functions/objects globally if needed
    return {
        initializeApp,
        setupEventHandlers,
        // ChatbotManager removed - now in js/chatbot.js
        // chatbotPanel removed - now initialized in js/chatbot.js
        infoPanel // Keep infoPanel instance if needed elsewhere
    };

})();
