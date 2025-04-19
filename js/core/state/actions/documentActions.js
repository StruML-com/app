/**
 * Document Actions
 * Contains actions related to document manipulation
 */

import { showAlert, generateItemId } from '../../../core/utils.js';
import { exportDocument } from '../../../features/export/ExportManager.js';

/**
 * Clear the document
 * @param {Function} setItems - State setter for items
 * @param {Function} setFilteredItems - State setter for filtered items
 * @param {Function} setDocumentTitle - State setter for document title
 * @param {Function} setCurrentItemId - State setter for current item ID
 * @param {Function} setExpandedItems - State setter for expanded items
 * @param {Function} setNavExpandedItems - State setter for nav expanded items
 * @param {Function} setChatMessages - State setter for chat messages
 * @param {Function} setOriginalFilename - State setter for original filename
 * @param {string} localStorageKey - Key for local storage
 */
export const clearDocument = (
    setItems,
    setFilteredItems,
    setDocumentTitle,
    setCurrentItemId,
    setExpandedItems,
    setNavExpandedItems,
    setChatMessages,
    setOriginalFilename,
    localStorageKey
) => {
    setItems([]);
    setFilteredItems([]);
    setDocumentTitle("Untitled Document");
    setCurrentItemId(null);
    setExpandedItems({});
    setNavExpandedItems({});
    setChatMessages([]);
    setOriginalFilename("");
    localStorage.removeItem(localStorageKey);
    showAlert("Document has been cleared.", "success");
};

/**
 * Import a document
 * @param {Object} data - Document data
 * @param {string} filename - Original filename
 * @param {Function} setChatMessages - State setter for chat messages
 * @param {Function} setCurrentItemId - State setter for current item ID
 * @param {Function} setItems - State setter for items
 * @param {Function} setFilteredItems - State setter for filtered items
 * @param {Function} setActiveTags - State setter for active tags
 * @param {Function} setDocumentTitle - State setter for document title
 * @param {Function} setOriginalFilename - State setter for original filename
 * @param {Function} setExpandedItems - State setter for expanded items
 * @param {Function} setNavExpandedItems - State setter for nav expanded items
 * @param {Function} updateDocumentNavigation - Function to update document navigation
 * @param {Function} updateTagFilters - Function to update tag filters
 * @returns {boolean} - Whether the document was imported successfully
 */
export const importDocument = (
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
    updateDocumentNavigation,
    updateTagFilters
) => {
    setChatMessages([]);
    setCurrentItemId(null);
    
    if (!data || !data.items || !Array.isArray(data.items)) {
        showAlert("Invalid document format. Missing items array.", "danger");
        return false;
    }
    
    // Generate new UUIDs for all items
    const generateIds = (items) => {
        if (!items) return;
        
        for (const item of items) {
            item.id = generateItemId();
            
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
    
    showAlert("Document imported successfully.", "success");
    return true;
};

/**
 * Export document to the specified format
 * @param {string} format - Export format ('json', 'md', 'html', 'csv')
 * @param {Object} data - Document data (title, items)
 * @param {string} originalFilename - Original filename for export
 */
export { exportDocument };