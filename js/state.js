// Assign State object to the global namespace
window.StruMLApp = window.StruMLApp || {};

window.StruMLApp.State = (() => {
    // Access React from the global scope
    const React = window.React;
    const Utils = window.StruMLApp.Utils; // Access Utils globally
    const Export = window.StruMLApp.Export; // Access Export globally

    // Constants (will be defined in main.js, but needed here)
    const LOCAL_STORAGE_KEY = window.StruMLConfig?.LOCAL_STORAGE_KEY || 'struml-data';

    /**
     * Main context provider for application data
     */
    const DataContext = React.createContext(null);

    const DataProvider = ({ children }) => {
        // Core state
        const [items, setItems] = React.useState([]);
        const [filteredItems, setFilteredItems] = React.useState([]);
        const [documentTitle, setDocumentTitle] = React.useState("Untitled Document");
        
        // UI state
        const [activeTags, setActiveTags] = React.useState(['all']);
        const [currentItemId, setCurrentItemId] = React.useState(null);
        const [expandedItems, setExpandedItems] = React.useState({});
        const [navExpandedItems, setNavExpandedItems] = React.useState({});
        const [isInfoPanelOpen, setIsInfoPanelOpen] = React.useState(false);
        const [showItemDetails, setShowItemDetails] = React.useState(true); // State for item details visibility
        
        // Chat and info state
        const [chatMessages, setChatMessages] = React.useState([]);
        const [markdownContent, setMarkdownContent] = React.useState("");
        const [originalFilename, setOriginalFilename] = React.useState("");
        const [sampleData, setSampleData] = React.useState(null); // Add this line for sample data caching

        // Reference for the handleChatJsonDisplay function to avoid circular dependencies
        const handleChatJsonDisplayRef = React.useRef(null);

        // Toggle tag filter
        const toggleTagFilter = React.useCallback((tag) => {
            setActiveTags(prev => {
                if (tag === 'all') return ['all'];
                
                if (prev.includes(tag)) {
                    const newTags = prev.filter(t => t !== tag);
                    return newTags.length === 0 || (newTags.length === 1 && newTags[0] === 'all') 
                        ? ['all'] 
                        : newTags;
                } else {
                    return [...prev.filter(t => t !== 'all'), tag];
                }
            });
        }, []);
        
        // Initialize app from local storage
        React.useEffect(() => {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    setItems(parsedData.items || []);
                    setFilteredItems(parsedData.items || []);
                    setDocumentTitle(parsedData.title || "Untitled Document");
                    
                    const expanded = {};
                    const navExpanded = {};
                    const processItems = (itemList, depth = 0) => {
                        if (!itemList) return;
                        itemList.forEach(item => {
                            if (item && item.id) {
                                expanded[item.id] = true;
                                // Only expand top-level items in navigation by default
                                navExpanded[item.id] = depth === 0;
                                if (item.items && item.items.length > 0) {
                                    processItems(item.items, depth + 1);
                                }
                            }
                        });
                    };
                    processItems(parsedData.items || []);
                    setExpandedItems(expanded);
                    setNavExpandedItems(navExpanded);
                } catch (error) {
                    console.error("Failed to load saved data:", error);
                }
            }
        }, []);
        
        // Save to local storage and update filters when items change
        React.useEffect(() => {
            if (items.length > 0) {
                const dataToSave = {
                    title: documentTitle,
                    items: items
                };
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
            }

            if (activeTags.includes('all')) {
                setFilteredItems(items);
            } else {
                setFilteredItems(Utils.filterItemsByTags(items, activeTags));
            }

            updateDocumentNavigation();
            updateTagFilters();
        }, [items, documentTitle, navExpandedItems]); // Dependencies for saving and filtering
        
        // Update tag filters based on activeTags
        React.useEffect(() => {
            if (activeTags.includes('all')) {
                setFilteredItems(items);
            } else {
                const filterModeSelect = document.getElementById('tag-filter-mode');
                const showSubitemsCheckbox = document.getElementById('show-subitems-checkbox');
                
                const filterMode = filterModeSelect ? filterModeSelect.value : 'OR';
                const showSubitems = showSubitemsCheckbox ? showSubitemsCheckbox.checked : true;
                
                setFilteredItems(Utils.filterItemsByTags(items, activeTags, filterMode, showSubitems));
            }
            
            const tagFilterBtn = document.getElementById('tag-filter-btn');
            if (tagFilterBtn) {
                if (activeTags.includes('all')) {
                    tagFilterBtn.classList.remove('filtering', 'text-danger', 'fw-bold');
                    tagFilterBtn.style.animation = '';
                } else {
                    tagFilterBtn.classList.add('filtering', 'text-danger', 'fw-bold');
                    tagFilterBtn.style.animation = 'flash-red 0.8s infinite';
                    
                    if (!document.getElementById('flash-animation-style')) {
                        const styleEl = document.createElement('style');
                        styleEl.id = 'flash-animation-style';
                        styleEl.textContent = `
                            @keyframes flash-red {
                                0% { background-color: rgba(220, 53, 69, 0.1); }
                                50% { background-color: rgba(220, 53, 69, 0.3); }
                                100% { background-color: rgba(220, 53, 69, 0.1); }
                            }
                        `;
                        document.head.appendChild(styleEl);
                    }
                }
            }
            
            updateDocumentNavigation();
        }, [activeTags, items]); // Dependencies for tag filtering UI

        // Update sidebar state when classes change
        React.useEffect(() => {
            const mainContent = document.getElementById('main-content');
            const mainHeader = document.getElementById('main-header');
            const sidebar = document.getElementById('sidebar');
            const expandSidebarBtn = document.getElementById('expand-sidebar-btn');

            if (window.MutationObserver && sidebar) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach(mutation => {
                        if (mutation.attributeName === 'class') {
                            const isCollapsed = sidebar.classList.contains('collapsed');
                            if (isCollapsed) {
                                mainContent?.classList.add('expanded');
                                mainHeader?.classList.add('expanded');
                                expandSidebarBtn?.classList.remove('d-none');
                            } else {
                                mainContent?.classList.remove('expanded');
                                mainHeader?.classList.remove('expanded');
                                expandSidebarBtn?.classList.add('d-none');
                            }
                        }
                    });
                });
                
                observer.observe(sidebar, { attributes: true });
                return () => observer.disconnect();
            }
        }, []);
        
        // Update related items when current item changes
        React.useEffect(() => {
            if (currentItemId) {
                const currentItem = Utils.findItemById(items, currentItemId);
                if (currentItem) {
                    Utils.updateRelatedItems(items, currentItem);
                }
            }
        }, [currentItemId, items]);

        // Fetch sample data once on component mount
        React.useEffect(() => {
            const fetchSampleData = async () => {
                try {
                    const metamodel = window.StruMLConfig?.METAMODEL || "bm";
                    const sampleFilePath = `${metamodel}/sample.struml.json`;
                    
                    const response = await fetch(sampleFilePath);
                    
                    if (response.ok) {
                        const data = await response.json();
                        setSampleData(data);
                    }
                } catch (err) {
                    console.error("Error loading sample data:", err);
                }
            };
            
            fetchSampleData();
        }, []);
        
        // Update tag filters in UI
        const updateTagFilters = React.useCallback(() => {
            const tagFiltersContainer = document.getElementById('tag-filters');
            if (!tagFiltersContainer) return;
            
            const allTags = Utils.extractAllTags(items);
            
            tagFiltersContainer.innerHTML = '';
            
            if (allTags.length === 0) {
                tagFiltersContainer.innerHTML = '<div class="text-muted">No tags available</div>';
                return;
            }
            
            const allButton = document.createElement('button');
            allButton.className = `btn ${activeTags.includes('all') ? 'btn-secondary' : 'btn-outline-secondary'} w-100 mb-2`;
            allButton.textContent = 'All Tags';
            allButton.addEventListener('click', () => {
                toggleTagFilter('all');
            });
            tagFiltersContainer.appendChild(allButton);
            
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'd-flex flex-wrap gap-1';
            tagFiltersContainer.appendChild(tagsContainer);
            
            allTags.forEach(tag => {
                const button = document.createElement('button');
                button.className = `btn btn-sm ${activeTags.includes(tag) ? 'btn-secondary' : 'btn-outline-secondary'} me-1 mb-1`;
                button.textContent = tag;
                button.addEventListener('click', () => {
                    toggleTagFilter(tag);
                });
                tagsContainer.appendChild(button);
            });
            
            // Add event listeners for filter mode and subitem checkbox
            const filterModeSelect = document.getElementById('tag-filter-mode');
            const showSubitemsCheckbox = document.getElementById('show-subitems-checkbox');
            
            if (filterModeSelect && showSubitemsCheckbox) {
                // Set initial values from localStorage if available
                const savedFilterMode = localStorage.getItem('tag-filter-mode') || 'OR';
                const savedShowSubitems = localStorage.getItem('show-subitems') !== 'false';
                
                filterModeSelect.value = savedFilterMode;
                showSubitemsCheckbox.checked = savedShowSubitems;
                
                filterModeSelect.addEventListener('change', () => {
                    const mode = filterModeSelect.value;
                    localStorage.setItem('tag-filter-mode', mode);
                    if (!activeTags.includes('all')) {
                        // Apply the filter with the new mode
                        const showSubitems = showSubitemsCheckbox.checked;
                        setFilteredItems(Utils.filterItemsByTags(items, activeTags, mode, showSubitems));
                    }
                });
                
                showSubitemsCheckbox.addEventListener('change', () => {
                    const showSubitems = showSubitemsCheckbox.checked;
                    localStorage.setItem('show-subitems', showSubitems);
                    if (!activeTags.includes('all')) {
                        // Apply the filter with the subitem setting
                        const mode = filterModeSelect.value;
                        setFilteredItems(Utils.filterItemsByTags(items, activeTags, mode, showSubitems));
                    }
                });
            }
        }, [items, activeTags, toggleTagFilter]);
        
        // Update document navigation in UI
        const updateDocumentNavigation = React.useCallback(() => {
            const navContainer = document.getElementById('document-navigation');
            if (navContainer) {
                const itemContainers = document.querySelectorAll('.item-container');
                itemContainers.forEach(container => {
                    const id = container.dataset.id;
                    if (id) {
                        container.id = id;
                    }
                });
                
                const itemsToDisplay = activeTags.includes('all') ? items : filteredItems;
                navContainer.innerHTML = Utils.buildDocumentNavigationHtml(itemsToDisplay, currentItemId, navExpandedItems);
                
                navContainer.querySelectorAll('[id^="nav-collapse-"]').forEach(collapse => {
                    new bootstrap.Collapse(collapse, { toggle: false });
                });
                
                Utils.attachNavigationHandlers();
            }
        }, [items, filteredItems, activeTags, currentItemId, navExpandedItems]);
        
        // Update navigation when dependencies change
        React.useEffect(() => {
            updateDocumentNavigation();
        }, [updateDocumentNavigation]);
        
        // Update tag filters when dependencies change
        React.useEffect(() => {
            updateTagFilters();
        }, [updateTagFilters]);
        
        // Toggle navigation item expansion
        const toggleNavExpansion = React.useCallback((id, isExpanded) => {
            setNavExpandedItems(prev => ({...prev, [id]: isExpanded}));
        }, []);
        
        // Scroll to an item by ID - updated to scroll to top instead of center
        const scrollToItem = React.useCallback((itemId) => {
            const itemElement = document.getElementById(itemId);
            if (itemElement) {
                let current = itemId;
                while (current) {
                    const parent = Utils.findParentOfItem(items, current);
                    if (parent && parent.id) {
                        setExpandedItems(prev => ({...prev, [parent.id]: true}));
                        current = parent.id;
                    } else {
                        current = null;
                    }
                }
                
                setTimeout(() => {
                    // Use 'start' instead of 'center' for block
                    itemElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                    });
                }, 100);
            }
        }, [items, setExpandedItems]);
        
        // Fetch markdown content for info panel
        const fetchMarkdownContent = React.useCallback(async (itemTitle) => {
            try {
                const path = Utils.getLocalMarkdownPath(itemTitle);
                
                const response = await fetch(path);
                
                if (!response.ok) {
                    throw new Error(`Error loading file: ${response.status}`);
                }
                
                const text = await response.text();
                setMarkdownContent(text || "No description available for this item.");
                
                const infoPanelContent = document.getElementById('info-panel-content');
                if (infoPanelContent) {
                    infoPanelContent.innerHTML = DOMPurify.sanitize(
                        Utils.renderMarkdown(text),
                        {
                            USE_PROFILES: { html: true },
                            ADD_ATTR: ['target', 'rel']
                        }
                    );
                }
                
                return text;
            } catch (error) {
                console.log(`Info file not found for: ${itemTitle} - This is expected behavior.`);
                const fallbackContent = `No information available for "${itemTitle}".`;
                
                setMarkdownContent(fallbackContent);
                
                const infoPanelContent = document.getElementById('info-panel-content');
                if (infoPanelContent) {
                    infoPanelContent.innerHTML = DOMPurify.sanitize(`
                        <div class="alert alert-info">
                            <strong>No information available for "${itemTitle}"</strong><br><br>
                            <p>This is normal if you haven't created info files yet.</p>
                            <p>To add information, create a markdown file at this path: <code>${Utils.getLocalMarkdownPath(itemTitle)}</code></p>
                        </div>
                    `);
                }
                
                return fallbackContent;
            }
        }, [setMarkdownContent]);

        // Update chat display with support for JSON data
        const updateChatDisplay = React.useCallback(() => {
            const chatMessagesContainer = document.getElementById('chat-messages');
            if (!chatMessagesContainer) {
                console.error("Chat messages container not found");
                return;
            }
            
            // Clear the container
            chatMessagesContainer.innerHTML = '';
            
            // Add each message with proper sanitization
            chatMessages.forEach((msg, index) => {
                const messageElement = document.createElement('div');
                messageElement.className = `${msg.sender === 'user' ? 'alert alert-secondary' : 'alert alert-primary'} mb-2`;
                messageElement.dataset.messageIndex = index;
                
                // Sanitize and render markdown
                const safeHTML = DOMPurify.sanitize(Utils.renderMarkdown(msg.text), {
                    USE_PROFILES: { html: true },
                    ADD_ATTR: ['target', 'rel']
                });
                
                messageElement.innerHTML = safeHTML;
                chatMessagesContainer.appendChild(messageElement);
                
                // If this message has JSON data, recreate the JSON preview using the ref
                if (msg.sender === 'chatbot' && msg.jsonData && handleChatJsonDisplayRef.current) {
                    // Find the current item based on currentItemId
                    const currentItem = Utils.findItemById(items, currentItemId);
                    if (currentItem) {
                        setTimeout(() => {
                            try {
                                handleChatJsonDisplayRef.current(msg.jsonData, currentItem);
                            } catch (err) {
                                console.error("Error displaying JSON:", err);
                            }
                        }, 10); // Small timeout to ensure DOM is ready
                    } else {
                        console.error("Current item not found for JSON display");
                    }
                }
            });

            
            // Scroll to the bottom
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, [chatMessages, items, currentItemId]);
        
        // Reorder items (for drag-and-drop)
        const reorderItems = React.useCallback((sourceId, targetId, newIndex) => {
            if (!sourceId) return;

            setItems(prevItems => {
                try {
                    const newItems = JSON.parse(JSON.stringify(prevItems));
                    
                    // Handle top-level reordering
                    if (!targetId) {
                        for (let i = 0; i < newItems.length; i++) {
                            if (newItems[i].id === sourceId) {
                                const [movedItem] = newItems.splice(i, 1);
                                newItems.splice(newIndex, 0, movedItem);
                                return newItems;
                            }
                        }
                    }
                    
                    // Handle reordering within a parent
                    const findAndReorder = (items) => {
                        for (const item of items) {
                            if (item.id === targetId && item.items) {
                                for (let i = 0; i < item.items.length; i++) {
                                    if (item.items[i].id === sourceId) {
                                        const [movedItem] = item.items.splice(i, 1);
                                        item.items.splice(newIndex, 0, movedItem);
                                        return true;
                                    }
                                }
                            }
                            
                            if (item.items && item.items.length > 0) {
                                if (findAndReorder(item.items)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    };
                    
                    findAndReorder(newItems);
                    return newItems;
                } catch (error) {
                    console.error("Error during item reordering:", error);
                    return prevItems;
                }
            });
        }, []);

        // Add a new item with UUID approach
        const addItem = React.useCallback((newItem, parentId = null) => {
            if (!newItem.title) {
                Utils.showAlert("Item title is required", "danger");
                return false;
            }

            // Always generate a new unique ID
            if (!newItem.id) {
                newItem.id = Utils.generateItemId();
            }
            
            setItems(prevItems => {
                try {
                    const newItems = JSON.parse(JSON.stringify(prevItems));
                    const success = Utils.addItem(newItems, newItem, parentId);
                    
                    if (!success) {
                        throw new Error("Failed to add item");
                    }
                    
                    return newItems;
                } catch (err) {
                    console.error("Error adding item:", err);
                    Utils.showAlert(`Error adding item: ${err.message}`, "danger");
                    return prevItems;
                }
            });
            
            // Expand parent item if adding a child
            if (parentId) {
                setExpandedItems(prev => ({...prev, [parentId]: true}));
            }
            
            Utils.showAlert(`Item "${newItem.title}" has been added.`, "success");
            return true;
        }, []);

        // Check if item title is referenced in relations and offer to update
        const checkRelationReferences = React.useCallback((oldTitle, newTitle, updatedItem, callback) => {
            if (oldTitle === newTitle || !oldTitle || !newTitle) {
                // No change or invalid titles
                if (callback) callback(false);
                return;
            }
            
            // Setup the confirmation modal
            const oldTitleRef = document.getElementById('old-title-ref');
            const newTitleRef = document.getElementById('new-title-ref');
            if (oldTitleRef) oldTitleRef.textContent = oldTitle;
            if (newTitleRef) newTitleRef.textContent = newTitle;
            
            const modalElement = document.getElementById('update-relations-modal');
            if (!modalElement) {
                console.error("Update relations modal not found");
                if (callback) callback(false); // Proceed without confirmation
                return;
            }
            const modal = new bootstrap.Modal(modalElement);
            
            // Setup handlers
            const confirmBtn = document.getElementById('confirm-update-btn');
            const skipBtn = document.getElementById('skip-update-btn');
            
            const confirmHandler = () => {
                // Update all references
                const updateCount = Utils.updateRelationReferences(items, oldTitle, newTitle);
                
                // Complete the item update with the callback
                if (callback) callback(true, updateCount);
                
                // Cleanup
                modal.hide();
                confirmBtn.removeEventListener('click', confirmHandler);
                skipBtn.removeEventListener('click', skipHandler);
            };
            
            const skipHandler = () => {
                // Complete the item update without updating references
                if (callback) callback(false);
                
                // Cleanup
                modal.hide();
                confirmBtn.removeEventListener('click', confirmHandler);
                skipBtn.removeEventListener('click', skipHandler);
            };
            
            // Attach event handlers
            confirmBtn.addEventListener('click', confirmHandler);
            skipBtn.addEventListener('click', skipHandler);
            
            // Show the modal
            modal.show();
        }, [items]);

        // Helper for updating an item
        const performItemUpdate = React.useCallback((updatedItem) => {
            setItems(prevItems => {
                try {
                    const newItems = JSON.parse(JSON.stringify(prevItems));
                    
                    // Find and update item by ID (which never changes)
                    const findAndUpdateItem = (items) => {
                        for (let i = 0; i < items.length; i++) {
                            if (items[i].id === updatedItem.id) {
                                // Store any children from the existing item
                                const children = items[i].items || [];
                                
                                // Replace the entire item
                                items[i] = {...updatedItem};
                                
                                // Preserve children if not provided in the update
                                if (!items[i].items || items[i].items.length === 0) {
                                    items[i].items = children;
                                }
                                
                                return true;
                            }
                            
                            // Recursively search in children
                            if (items[i].items && items[i].items.length > 0) {
                                if (findAndUpdateItem(items[i].items)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    };
                    
                    const updated = findAndUpdateItem(newItems);
                    
                    if (!updated) {
                        console.warn(`Item with ID ${updatedItem.id} not found in current items`);
                        return prevItems;
                    }
                    
                    return newItems;
                } catch (err) {
                    console.error("Error updating item:", err);
                    Utils.showAlert(`Error updating item: ${err.message}`, "danger");
                    return prevItems;
                }
            });
            
            // Restore scroll position after update with a slight delay
            Utils.restoreScrollPosition();
            
            Utils.showAlert(`Item "${updatedItem.title}" has been updated.`, "success");
        }, []);

        // Update an existing item - with reference updating
        const updateItem = React.useCallback((updatedItem) => {
            if (!updatedItem || !updatedItem.id) {
                Utils.showAlert("Cannot update: Invalid item data", "danger");
                return false;
            }
            
            // Save scroll position before update
            Utils.saveScrollPosition();
            
            // Find original item to check title
            const originalItem = Utils.findItemById(items, updatedItem.id);
            if (originalItem && originalItem.title !== updatedItem.title) {
                // Title has changed, check for references
                checkRelationReferences(originalItem.title, updatedItem.title, updatedItem, (updatedReferences, count) => {
                    if (updatedReferences) {
                        Utils.showAlert(`Updated ${count} reference${count !== 1 ? 's' : ''} to the renamed item`, "success");
                    }
                    
                    // Perform the update
                    performItemUpdate(updatedItem);
                });
            } else {
                // No title change or no original item found
                performItemUpdate(updatedItem);
            }
            
            return true;
        }, [items, checkRelationReferences, performItemUpdate]);

        // Remove an item
        const removeItem = React.useCallback((id) => {
            if (!id) {
                Utils.showAlert("Cannot delete: Item ID is missing", "danger");
                return false;
            }
            
            setItems(prevItems => {
                try {
                    const newItems = JSON.parse(JSON.stringify(prevItems));
                    const removed = Utils.removeItemById(newItems, id);
                    
                    if (!removed) {
                        console.warn(`Item with ID ${id} not found for deletion`);
                    }
                    
                    return newItems;
                } catch (err) {
                    console.error("Error removing item:", err);
                    return prevItems;
                }
            });
            
            Utils.showAlert("Item has been deleted.", "success");
            return true;
        }, []);

        // Clear the document
        const clearDocument = React.useCallback(() => {
            setItems([]);
            setFilteredItems([]);
            setDocumentTitle("Untitled Document");
            setCurrentItemId(null);
            setExpandedItems({});
            setNavExpandedItems({});
            setChatMessages([]);
            setOriginalFilename("");
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            Utils.showAlert("Document has been cleared.", "success");
        }, []);

        // Import a document with UUID generation
        const importDocument = React.useCallback((data, filename = "") => {
            setChatMessages([]);
            setCurrentItemId(null);
            
            if (!data || !data.items || !Array.isArray(data.items)) {
                Utils.showAlert("Invalid document format. Missing items array.", "danger");
                return false;
            }
            
            // Generate new UUIDs for all items
            const generateIds = (items) => {
                if (!items) return;
                
                for (const item of items) {
                    item.id = Utils.generateItemId();
                    
                    if (item.items && item.items.length > 0) {
                        generateIds(item.items);
                    }
                }
            };
            
            // Generate all new IDs
            generateIds(data.items);
            
            setItems(data.items);
            setFilteredItems(data.items);
            setActiveTags(['all']);
            
            if (filename) {
                // Remove timestamp from filename if present (format: YYYY-MM-DD-HH-MM-SS)
                const filenameWithoutExtension = filename.replace(/\.(json)$/, '')
                                                        .replace(/_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/, '');
                setDocumentTitle(filenameWithoutExtension);
                setOriginalFilename(filenameWithoutExtension);
            } else {
                setDocumentTitle(data.title || "Imported Document");
            }
            
            const expanded = {};
            const navExpanded = {};
            
            const processItems = (itemList, depth = 0) => {
                if (!itemList) return;
                itemList.forEach(item => {
                    if (item && item.id) {
                        expanded[item.id] = true;
                        navExpanded[item.id] = depth === 0;
                        
                        if (item.items && item.items.length > 0) {
                            processItems(item.items, depth + 1);
                        }
                    }
                });
            };
            
            processItems(data.items);
            
            setExpandedItems(expanded);
            setNavExpandedItems(navExpanded);
            
            setTimeout(() => {
                updateDocumentNavigation();
                updateTagFilters();
            }, 100);
            
            Utils.showAlert("Document imported successfully.", "success");
            return true;
        }, [updateDocumentNavigation, updateTagFilters]);

        // Toggle item expansion in UI
        const toggleItemExpansion = React.useCallback((id) => {
            setExpandedItems(prev => ({...prev, [id]: !prev[id]}));
        }, []);

        // Process suggested items function - simplified since we're removing the feature
        const processSuggestedItems = React.useCallback((suggestedItemsArray, currentItem) => {
            // We'll keep this function but simplify it as it may be called from elsewhere
            if (!Array.isArray(suggestedItemsArray) || !currentItem || !suggestedItemsArray.length) {
                return;
            }
            
            try {
                // We'll only process the items to directly add them without showing suggestions UI
                suggestedItemsArray
                    .filter(item => item && (item.name || item.title))
                    .forEach(item => {
                        const newItem = {
                            id: Utils.generateItemId(),
                            title: item.name || item.title || 'Unnamed Item',
                            content: item.content || '',
                            tags: item.tags || '',
                            items: []
                        };
                        
                        // Add directly as child of current item
                        addItem(newItem, currentItem.id);
                    });
                
                if (suggestedItemsArray.length > 0) {
                    Utils.showAlert(`Added ${suggestedItemsArray.length} new items to "${currentItem.title}"`, "success");
                }
            } catch (error) {
                console.error("Error processing suggested items:", error);
            }
        }, [addItem]);

        // Define handleChatJsonDisplay function (note the use of ref pattern to avoid circular dependencies)
        const handleChatJsonDisplay = React.useCallback((jsonItemData, targetItem) => {
            if (!jsonItemData || !targetItem) {
                console.error("handleChatJsonDisplay: Missing data", { jsonItemData, targetItem });
                return;
            }
            
            const chatMessagesContainer = document.getElementById('chat-messages');
            if (!chatMessagesContainer) {
                console.error("handleChatJsonDisplay: Chat messages container not found");
                return;
            }
            
            // Find the last message container which should be the one with our JSON data
            const lastMessageContainer = chatMessagesContainer.lastElementChild;
            if (!lastMessageContainer) {
                console.error("handleChatJsonDisplay: Last message container not found");
                return;
            }
            
            // Check if this JSON has already been displayed to prevent duplication
            if (lastMessageContainer.querySelector('.json-item-preview')) {
                console.log("JSON preview already exists for this message, skipping");
                return;
            }

            
            // Create the JSON preview element
            const jsonPreviewElement = document.createElement('div');
            jsonPreviewElement.className = 'json-item-preview mt-1 border rounded p-1';
            
            // Create a styled representation of the JSON item that matches document style
            let previewHtml = `
                <div class="json-item-header d-flex justify-content-between align-items-center mb-2">
                    <h5 class="m-0">${jsonItemData.title || 'Unnamed Item'}</h5>
                    ${jsonItemData.tags ? `
                        <div class="item-tags">
                            ${jsonItemData.tags.split(',').map(tag => 
                                `<span class="item-tag">${tag.trim()}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
            
            // Handle item content if available
            if (jsonItemData.content) {
                previewHtml += `
                    <div class="json-item-content mb-3">
                        <div class="markdown-content">
                            ${Utils.renderMarkdown(jsonItemData.content)}
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2 append-content-btn" data-content="${
                            encodeURIComponent(jsonItemData.content)
                        }">
                            <i class="bi bi-plus-circle me-1"></i> Add this content to current item
                        </button>
                    </div>
                `;
            }
            
            // Handle sub-items if available
            if (jsonItemData.items && jsonItemData.items.length > 0) {
                previewHtml += `
                    <div class="json-item-subitems">
                        <h6 class="mb-2">Available sub-items:</h6>
                        <div class="list-group">
                `;
                
                // Add each sub-item with a similar style to document items
                jsonItemData.items.forEach((subitem, index) => {
                    previewHtml += `
                        <div class="list-group-item json-subitem" data-index="${index}">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="mb-1">${subitem.title}</h6>
                                ${subitem.tags ? `
                                    <div class="item-tags">
                                        ${subitem.tags.split(',').map(tag => 
                                            `<span class="item-tag">${tag.trim()}</span>`
                                        ).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            ${subitem.content ? `
                                <div class="json-subitem-content mb-2 small">
                                    <p class="text-muted">${subitem.content.substring(0, 100)}${subitem.content.length > 100 ? '...' : ''}</p>
                                </div>
                            ` : ''}
                            <div class="d-flex justify-content-end">
                                <button class="btn btn-sm btn-primary add-subitem-btn" data-index="${index}">
                                    <i class="bi bi-plus-circle me-1"></i> Add this sub-item
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                previewHtml += `
                        </div>
                        <div class="mt-3">
                            <button class="btn btn-sm btn-success add-all-subitems-btn">
                                <i class="bi bi-plus-circle-fill me-1"></i> Add all sub-items
                            </button>
                        </div>
                    </div>
                `;
            }
            
            // Set the HTML content
            jsonPreviewElement.innerHTML = previewHtml;
            
            // Append the preview element to the last message
            lastMessageContainer.appendChild(jsonPreviewElement);
            
            // Add event handlers for the buttons
            
            // Handler for "Append Content" button
            const appendContentBtn = jsonPreviewElement.querySelector('.append-content-btn');
            if (appendContentBtn) {
                appendContentBtn.addEventListener('click', () => {
                    try {
                        // Get the encoded content and decode it
                        const encodedContent = appendContentBtn.getAttribute('data-content');
                        const content = decodeURIComponent(encodedContent);
                        
                        // Format content with blockquote style (> prefix)
                        const formattedContent = content;
                        
                        // Append to the current item's content
                        const updatedItem = { ...targetItem };
                        updatedItem.content = targetItem.content 
                            ? `${targetItem.content}\n\n${formattedContent}`
                            : formattedContent;
                        
                        // Update the item
                        updateItem(updatedItem);
                        Utils.showAlert(`Content added to "${targetItem.title}"`, "success");
                    } catch (error) {
                        console.error("Error appending content:", error);
                        Utils.showAlert("Error adding content", "danger");
                    }
                });
            }
            
            // Handler for individual "Add Sub-item" buttons
            const addSubitemBtns = jsonPreviewElement.querySelectorAll('.add-subitem-btn');
            addSubitemBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    try {
                        const index = parseInt(btn.getAttribute('data-index'), 10);
                        const subitemData = jsonItemData.items[index];
                        
                        if (subitemData) {
                            // Create a new item with the sub-item data
                            const newItem = {
                                id: Utils.generateItemId(),
                                title: subitemData.title,
                                content: subitemData.content || '',
                                tags: subitemData.tags || '',
                                items: subitemData.items || []
                            };
                            
                            // Add it as a child of the current item
                            addItem(newItem, targetItem.id);
                            Utils.showAlert(`Sub-item "${newItem.title}" added`, "success");
                            
                            // Disable the button after adding
                            btn.disabled = true;
                            btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Added';
                        }
                    } catch (error) {
                        console.error("Error adding sub-item:", error);
                        Utils.showAlert("Error adding sub-item", "danger");
                    }
                });
            });
            
            // Handler for "Add All Sub-items" button
            const addAllBtn = jsonPreviewElement.querySelector('.add-all-subitems-btn');
            if (addAllBtn) {
                addAllBtn.addEventListener('click', () => {
                    try {
                        if (jsonItemData.items && jsonItemData.items.length > 0) {
                            let addedCount = 0;
                            
                            jsonItemData.items.forEach(subitemData => {
                                // Create a new item for each sub-item
                                const newItem = {
                                    id: Utils.generateItemId(),
                                    title: subitemData.title,
                                    content: subitemData.content || '',
                                    tags: subitemData.tags || '',
                                    items: subitemData.items || []
                                };
                                
                                // Add it as a child of the current item
                                addItem(newItem, targetItem.id);
                                addedCount++;
                            });
                            
                            Utils.showAlert(`${addedCount} sub-items added to "${targetItem.title}"`, "success");
                            
                            // Disable the button and all individual add buttons
                            addAllBtn.disabled = true;
                            addAllBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> All Added';
                            
                            addSubitemBtns.forEach(btn => {
                                btn.disabled = true;
                                btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Added';
                            });
                        }
                    } catch (error) {
                        console.error("Error adding all sub-items:", error);
                        Utils.showAlert("Error adding sub-items", "danger");
                    }
                });
            }
            
            // Scroll chat to bottom to show the new content
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }, [updateItem, addItem]);

        // Set the ref after defining the function
        React.useEffect(() => {
            handleChatJsonDisplayRef.current = handleChatJsonDisplay;
        }, [handleChatJsonDisplay]);

        // Open matrix editor in a modal
        const openMatrixEditor = React.useCallback((matrixItem = null) => {
            if (items.length === 0) {
                Utils.showAlert("No items to create matrix with", "warning");
                return;
            }

            const modalElement = document.getElementById('matrix-editor-modal');
            if (!modalElement) return;
            const modal = new bootstrap.Modal(modalElement);
            
            // Populate source and target selectors
            Utils.populateItemSelectors(items);
            
            // Clear matrix container
            const matrixContainer = document.getElementById('matrix-container');
            if (matrixContainer) {
                matrixContainer.innerHTML = 
                    '<div class="alert alert-info">Select source and target items to build the matrix</div>';
            }
            
            // Clear current matrix
            window.currentMatrix = null;
            
            // If we're editing an existing matrix item
            if (matrixItem) {
                // Extract source and target items from tags
                const tags = matrixItem.tags ? matrixItem.tags.split(',').map(tag => tag.trim()) : [];
                const sourceItemTag = tags.find(tag => tag.startsWith('source-item::'));
                const targetItemTag = tags.find(tag => tag.startsWith('target-item::'));
                const valuesTag = tags.find(tag => tag.startsWith('values::'));
                
                if (sourceItemTag && targetItemTag) {
                    // Extract IDs
                    const sourceItemTitle = sourceItemTag.split('::')[1];
                    const targetItemTitle = targetItemTag.split('::')[1];
                    
                    // Find source and target items by title
                    const sourceItem = Utils.findItemByTitle(items, sourceItemTitle);
                    const targetItem = Utils.findItemByTitle(items, targetItemTitle);
                    
                    if (sourceItem && targetItem) {
                        // Set select values
                        const sourceSelect = document.getElementById('source-item-select');
                        const targetSelect = document.getElementById('target-item-select');
                        if (sourceSelect) sourceSelect.value = sourceItem.id;
                        if (targetSelect) targetSelect.value = targetItem.id;
                        
                        // Set cell values if present
                        const cellValuesInput = document.getElementById('matrix-cell-values');
                        if (cellValuesInput) {
                            if (valuesTag) {
                                cellValuesInput.value = valuesTag.split('::')[1];
                            } else {
                                cellValuesInput.value = '';
                            }
                        }
                        
                        // Create and load the matrix
                        const cellValues = cellValuesInput ? cellValuesInput.value : '';
                        const matrix = Utils.processMatrix(items, sourceItem.id, targetItem.id, cellValues);
                        
                        if (matrix) {
                            Utils.loadMatrixEditor(matrix);
                        }
                    }
                }
            }
            
            // Load matrix button handler
            const loadBtn = document.getElementById('load-matrix-btn');
            if (loadBtn) {
                loadBtn.onclick = () => {
                    const sourceSelect = document.getElementById('source-item-select');
                    const targetSelect = document.getElementById('target-item-select');
                    const cellValuesInput = document.getElementById('matrix-cell-values');
                    
                    const sourceId = sourceSelect ? sourceSelect.value : '';
                    const targetId = targetSelect ? targetSelect.value : '';
                    const cellValues = cellValuesInput ? cellValuesInput.value : '';
                    
                    if (!sourceId || !targetId) {
                        Utils.showAlert("Please select both source and target items", "warning");
                        return;
                    }
                    
                    const matrix = Utils.processMatrix(items, sourceId, targetId, cellValues);
                    if (!matrix) {
                        Utils.showAlert("Could not build matrix with selected items", "warning");
                        return;
                    }
                    
                    Utils.loadMatrixEditor(matrix);
                };
            }
            
            // Save matrix button handler
            const saveBtn = document.getElementById('save-matrix-btn');
            if (saveBtn) {
                saveBtn.onclick = () => {
                    if (!window.currentMatrix) {
                        Utils.showAlert("No matrix data to save", "warning");
                        return;
                    }
                    
                    // If editing an existing matrix item, update its tags
                    if (matrixItem) {
                        const sourceItem = window.currentMatrix.sourceItem;
                        const targetItem = window.currentMatrix.targetItem;
                        const cellValuesInput = document.getElementById('matrix-cell-values');
                        const cellValues = cellValuesInput ? cellValuesInput.value : '';
                        
                        // Create separate tags for normal tags and special matrix tags
                        const regularTags = matrixItem.tags ? 
                            matrixItem.tags.split(',')
                                .map(tag => tag.trim())
                                .filter(tag => !tag.startsWith('source-item::') && 
                                               !tag.startsWith('target-item::') && 
                                               !tag.startsWith('values::') &&
                                               !tag.startsWith('type::'))
                                .join(', ') : '';
                        
                        // Build new tags
                        let newTags = 'type::matrix';
                        newTags += `, source-item::${sourceItem.title}`;
                        newTags += `, target-item::${targetItem.title}`;
                        
                        if (cellValues.trim()) {
                            newTags += `, values::${cellValues.trim()}`;
                        }
                        
                        if (regularTags) {
                            newTags += ', ' + regularTags;
                        }
                        
                        // Update the item
                        matrixItem.tags = newTags;
                        updateItem(matrixItem);
                    }
                    
                    const success = Utils.saveMatrixChanges(window.currentMatrix);
                    if (success) {
                        Utils.showAlert("Matrix saved successfully", "success");
                        // Update the state to trigger UI refresh
                        setItems([...items]);
                        modal.hide();
                    } else {
                        Utils.showAlert("Failed to save matrix", "danger");
                    }
                };
            }
            
            modal.show();
        }, [items, updateItem]);

        // Send message to AI Assistant - rewritten with integrated processing
        const sendChatMessage = React.useCallback(async (message) => {
            if (!message.trim()) return;

            const chatLoading = document.getElementById('chat-loading');
            if (chatLoading) {
                chatLoading.classList.remove('d-none');
            }

            setChatMessages(prev => [...prev, { text: message, sender: 'user' }]);

            // --- Check current item context BEFORE sending ---
            if (!currentItemId) {
                console.error("Send failed: No current item selected.");
                setChatMessages(prev => [...prev, {
                    text: "⚠️ Please select an item in the main document view first to provide context for your message.",
                    sender: 'chatbot'
                }]);
                updateChatDisplay();
                if (chatLoading) {
                    chatLoading.classList.add('d-none');
                }
                return;
            }
            // --- End Check ---

            try {
                // Get the request type from the selector
                const queryTypeSelector = document.getElementById('chat-query-type');
                const requestType = queryTypeSelector ? queryTypeSelector.value : 'custom request';

                const currentItem = Utils.findItemById(items, currentItemId);

                if (!currentItem) {
                    console.error(`Send failed: Could not find item with ID: ${currentItemId}`);
                    setChatMessages(prev => [...prev, {
                        text: `⚠️ Error: Could not find the selected item (ID: ${currentItemId}). Please try selecting it again.`,
                        sender: 'chatbot'
                    }]);
                    updateChatDisplay();
                    if (chatLoading) {
                        chatLoading.classList.add('d-none');
                    }
                    return;
                }

                // Ensure we have the markdown content - fetch it if needed
                let mdDescription = markdownContent;
                if (!mdDescription && currentItem.title) {
                    try {
                        mdDescription = await fetchMarkdownContent(currentItem.title);
                    } catch (err) {
                        mdDescription = "";
                    }
                }

                // Find matching sample item from cached data
                let sampleItem = null;
                if (sampleData && sampleData.items) {
                    const findMatchingItem = (items, targetTitle) => {
                        if (!items || !Array.isArray(items)) return null;
                        
                        for (const item of items) {
                            if (item.title && item.title.toLowerCase() === targetTitle.toLowerCase()) {
                                return item;
                            }
                            
                            if (item.items && item.items.length > 0) {
                                const found = findMatchingItem(item.items, targetTitle);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    
                    sampleItem = findMatchingItem(sampleData.items, currentItem.title);
                }

                // Prepare request payload with ensured markdown description and sample item
                const WEBHOOK_URL = window.StruMLApp.Constants?.WEBHOOK_URL;
                if (!WEBHOOK_URL) {
                    throw new Error("Webhook URL is not configured.");
                }

                const requestData = {
                    requestType: requestType,
                    message: message,
                    sessionId: window.chatSessionId || Utils.generateItemId(),
                    context: {
                        currentItem: {
                            id: currentItem.id,
                            title: currentItem.title,
                            content: currentItem.content || "",
                            tags: currentItem.tags || ""
                        },
                        markdownDescription: mdDescription || "", 
                        documentStructure: items,
                        sampleItem: sampleItem 
                    }
                };

                // Send request to webhook
                const response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });

                if (!response.ok) {
                    let errorBody = `HTTP error! Status: ${response.status}`;
                    try {
                        const errorJson = await response.json();
                        errorBody += ` - ${JSON.stringify(errorJson)}`;
                    } catch (e) {
                        // Ignore if response body is not JSON
                    }
                    throw new Error(errorBody);
                }

                // Process the response 
                const responseData = await response.json();

                // Process suggested items if available
                if (responseData && responseData.suggestedItems &&
                    responseData.suggestedItems.items &&
                    Array.isArray(responseData.suggestedItems.items)) {
                    processSuggestedItems(responseData.suggestedItems.items, currentItem);
                }

                if (responseData) {
                    let responseMessage = "";
                    let jsonItemData = null;
                    
                    // Extract message content from various response formats
                    if (responseData.json && responseData.json.message) {
                        responseMessage = responseData.json.message;
                    } else if (responseData.message) {
                        responseMessage = responseData.message;
                    } else if (responseData.text) {
                        responseMessage = responseData.text;
                    } else if (typeof responseData === 'string') {
                        responseMessage = responseData;
                    } else if (Array.isArray(responseData) && responseData[0] && responseData[0].message) {
                        responseMessage = responseData[0].message;
                    } else if (Array.isArray(responseData) && responseData[0] && responseData[0].json && responseData[0].json.message) {
                        responseMessage = responseData[0].json.message;
                    } else {
                        responseMessage = "Received response from AI but couldn't parse the message properly.";
                    }

                    // Check if the response contains JSON data within markdown code blocks
                    const jsonMatch = responseMessage.match(/```json\n([\s\S]*?)\n```/);
                    if (jsonMatch && jsonMatch[1]) {
                        try {
                            // Extract and parse the JSON
                            jsonItemData = JSON.parse(jsonMatch[1].trim());
                            
                            // Create a formatted message without the JSON code block
                            const textBeforeJson = responseMessage.substring(0, jsonMatch.index).trim();
                            const textAfterJson = responseMessage.substring(jsonMatch.index + jsonMatch[0].length).trim();
                            
                            // Keep any text that was before or after the JSON block
                            responseMessage = [
                                textBeforeJson,
                                "📋 AI-generated suggestion (see action buttons below)",
                                textAfterJson
                            ].filter(part => part).join("\n\n");
                        } catch (err) {
                            console.error("Error parsing JSON from response:", err);
                            // Keep the original message if parsing fails
                        }
                    }

                    // Add the message to chat history and force immediate display
                    setChatMessages(prev => {
                        const updatedMessages = [...prev, {
                            text: responseMessage,
                            sender: 'chatbot',
                            jsonData: jsonItemData, // Store the JSON data with the message
                            timestamp: Date.now() // Add timestamp to ensure state change detection
                        }];
                        
                        return updatedMessages;
                    });

                    
                    // Ensure we update the chat display IMMEDIATELY after receiving a response
                    setTimeout(() => {
                        // First, update the chat UI to show the message
                        updateChatDisplay();
                        
                        // Then, after the message is visible, process any JSON data if present
                        if (handleChatJsonDisplayRef.current && jsonItemData && currentItem) {
                            handleChatJsonDisplayRef.current(jsonItemData, currentItem);
                        } else if (jsonItemData) {
                            console.warn("JSON data present but couldn't be displayed:", {
                                refExists: !!handleChatJsonDisplayRef.current,
                                jsonData: !!jsonItemData,
                                itemExists: !!currentItem
                            });
                        }
                    }, 50); // Reduced timeout for more immediate response


                }
            } catch (error) {
                console.error("Error in chat communication:", error);
                setChatMessages(prev => [...prev, {
                    text: `Error communicating with AI: ${error.message}`,
                    sender: 'chatbot'
                }]);
            } finally {
                if (chatLoading) {
                    chatLoading.classList.add('d-none');
                }
            updateChatDisplay(); // Ensure the UI is updated
            }
        }, [items, currentItemId, setChatMessages, updateChatDisplay, processSuggestedItems, sampleData, fetchMarkdownContent, markdownContent]);

        // Toggle item details visibility
        const toggleShowItemDetails = React.useCallback(() => {
            setShowItemDetails(prev => !prev);
        }, []);

        // Context value for provider
        const contextValue = {
            // State
            items,
            filteredItems,
            documentTitle,
            activeTags,
            currentItemId,
            expandedItems,
            navExpandedItems,
            chatMessages,
            isInfoPanelOpen,
            markdownContent,
            originalFilename,
            showItemDetails, // Expose state
            
            // State setters
            setItems,
            setFilteredItems,
            setDocumentTitle,
            setCurrentItemId,
            setExpandedItems,
            setNavExpandedItems,
            setOriginalFilename,
            setIsInfoPanelOpen,
            setChatMessages,
            
            // Action methods
            addItem,
            updateItem,
            removeItem,
            clearDocument,
            toggleItemExpansion,
            toggleNavExpansion,
            toggleTagFilter,
            importDocument,
            exportDocument: Export.exportDocument.bind(Export), // Bind export functions
            sendChatMessage,
            processSuggestedItems,
            fetchMarkdownContent,
            updateDocumentNavigation,
            updateTagFilters,
            scrollToItem,
            reorderItems,
            openMatrixEditor,
            checkRelationReferences,
            updateChatDisplay,
            toggleShowItemDetails // Expose toggle function
        };

        return (
            <DataContext.Provider value={contextValue}>
                {children}
            </DataContext.Provider>
        );
    };

    // Return the context and provider
    return {
        DataContext,
        DataProvider
    };
})();
