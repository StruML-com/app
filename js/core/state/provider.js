/**
 * Data Provider
 * Provides state and actions to the application
 */

import React from 'react';
import DataContext from './context.js';

// Import actions
import {
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    checkRelationReferences,
    performItemUpdate
} from './actions/itemActions.js';

import {
    toggleItemExpansion,
    toggleNavExpansion,
    toggleTagFilter,
    toggleShowItemDetails,
    updateDocumentNavigation,
    updateTagFilters,
    scrollToItem
} from './actions/uiActions.js';

import {
    clearDocument,
    importDocument,
    exportDocument
} from './actions/documentActions.js';

import {
    updateChatDisplay,
    sendChatMessage,
    processSuggestedItems,
    fetchMarkdownContent
} from './actions/chatActions.js';

import {
    openMatrixEditor,
    handleChatJsonDisplay
} from './actions/matrixActions.js';

// Constants
const LOCAL_STORAGE_KEY = window.StruMLConfig?.LOCAL_STORAGE_KEY || 'struml-data';

/**
 * Data Provider component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const DataProvider = ({ children }) => {
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
            setFilteredItems(window.StruMLApp.Utils.filterItemsByTags(items, activeTags));
        }

        updateDocumentNavigationCallback();
        updateTagFiltersCallback();
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
            
            setFilteredItems(window.StruMLApp.Utils.filterItemsByTags(items, activeTags, filterMode, showSubitems));
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
        
        updateDocumentNavigationCallback();
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
            const currentItem = window.StruMLApp.Utils.findItemById(items, currentItemId);
            if (currentItem) {
                window.StruMLApp.Utils.updateRelatedItems(items, currentItem);
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

    // Set the ref after defining the function
    React.useEffect(() => {
        handleChatJsonDisplayRef.current = (jsonItemData, targetItem) => {
            handleChatJsonDisplay(
                jsonItemData, 
                targetItem, 
                updateItemCallback, 
                addItemCallback
            );
        };
    }, [items]); // Depend on items to ensure we have the latest state

    // Callback wrappers for actions
    const toggleItemExpansionCallback = React.useCallback((id) => {
        toggleItemExpansion(id, setExpandedItems);
    }, []);

    const toggleNavExpansionCallback = React.useCallback((id, isExpanded) => {
        toggleNavExpansion(id, isExpanded, setNavExpandedItems);
    }, []);

    const toggleTagFilterCallback = React.useCallback((tag) => {
        toggleTagFilter(tag, setActiveTags);
    }, []);

    const toggleShowItemDetailsCallback = React.useCallback(() => {
        toggleShowItemDetails(setShowItemDetails);
    }, []);

    const updateDocumentNavigationCallback = React.useCallback(() => {
        updateDocumentNavigation(
            items,
            filteredItems,
            activeTags,
            currentItemId,
            navExpandedItems
        );
    }, [items, filteredItems, activeTags, currentItemId, navExpandedItems]);

    const updateTagFiltersCallback = React.useCallback(() => {
        updateTagFilters(
            items,
            activeTags,
            toggleTagFilterCallback,
            setFilteredItems
        );
    }, [items, activeTags, toggleTagFilterCallback]);

    const scrollToItemCallback = React.useCallback((itemId) => {
        scrollToItem(itemId, items, setExpandedItems);
    }, [items]);

    const addItemCallback = React.useCallback((newItem, parentId = null) => {
        return addItem(newItem, parentId, setItems, setExpandedItems);
    }, []);

    const updateItemCallback = React.useCallback((updatedItem) => {
        return updateItem(
            updatedItem,
            items,
            setItems,
            (oldTitle, newTitle, updatedItem, callback) => {
                checkRelationReferences(oldTitle, newTitle, updatedItem, callback, items);
            }
        );
    }, [items]);

    const removeItemCallback = React.useCallback((id) => {
        return removeItem(id, setItems);
    }, []);

    const reorderItemsCallback = React.useCallback((sourceId, targetId, newIndex) => {
        reorderItems(sourceId, targetId, newIndex, setItems);
    }, []);

    const clearDocumentCallback = React.useCallback(() => {
        clearDocument(
            setItems,
            setFilteredItems,
            setDocumentTitle,
            setCurrentItemId,
            setExpandedItems,
            setNavExpandedItems,
            setChatMessages,
            setOriginalFilename,
            LOCAL_STORAGE_KEY
        );
    }, []);

    const importDocumentCallback = React.useCallback((data, filename = "") => {
        return importDocument(
            data,
            filename,
            setChatMessages,
            setCurrentItemId,
            setItems,
            setFilteredItems,
            setActiveTags,
            setDocumentTitle,
            setOriginalFilename,
            setExpandedItems,
            setNavExpandedItems,
            updateDocumentNavigationCallback,
            updateTagFiltersCallback
        );
    }, [updateDocumentNavigationCallback, updateTagFiltersCallback]);

    const updateChatDisplayCallback = React.useCallback(() => {
        updateChatDisplay(
            chatMessages,
            items,
            currentItemId,
            handleChatJsonDisplayRef
        );
    }, [chatMessages, items, currentItemId]);

    const sendChatMessageCallback = React.useCallback(async (message) => {
        await sendChatMessage(
            message,
            currentItemId,
            items,
            setChatMessages,
            updateChatDisplayCallback,
            processSuggestedItemsCallback,
            sampleData,
            fetchMarkdownContentCallback,
            markdownContent,
            handleChatJsonDisplayRef
        );
    }, [currentItemId, items, updateChatDisplayCallback, sampleData, markdownContent]);

    const processSuggestedItemsCallback = React.useCallback((suggestedItemsArray, currentItem) => {
        processSuggestedItems(suggestedItemsArray, currentItem, addItemCallback);
    }, [addItemCallback]);

    const fetchMarkdownContentCallback = React.useCallback(async (itemTitle) => {
        return await fetchMarkdownContent(itemTitle, setMarkdownContent);
    }, []);

    const openMatrixEditorCallback = React.useCallback((matrixItem = null) => {
        openMatrixEditor(matrixItem, items, setItems, updateItemCallback);
    }, [items, updateItemCallback]);

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
        showItemDetails,
        
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
        addItem: addItemCallback,
        updateItem: updateItemCallback,
        removeItem: removeItemCallback,
        clearDocument: clearDocumentCallback,
        toggleItemExpansion: toggleItemExpansionCallback,
        toggleNavExpansion: toggleNavExpansionCallback,
        toggleTagFilter: toggleTagFilterCallback,
        importDocument: importDocumentCallback,
        exportDocument,
        sendChatMessage: sendChatMessageCallback,
        processSuggestedItems: processSuggestedItemsCallback,
        fetchMarkdownContent: fetchMarkdownContentCallback,
        updateDocumentNavigation: updateDocumentNavigationCallback,
        updateTagFilters: updateTagFiltersCallback,
        scrollToItem: scrollToItemCallback,
        reorderItems: reorderItemsCallback,
        openMatrixEditor: openMatrixEditorCallback,
        checkRelationReferences,
        updateChatDisplay: updateChatDisplayCallback,
        toggleShowItemDetails: toggleShowItemDetailsCallback
    };

    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
};