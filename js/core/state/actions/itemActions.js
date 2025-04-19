/**
 * Item Actions
 * Contains actions related to item manipulation
 */

import { showAlert, generateItemId } from '../../../core/utils.js';
import { findItemById, addItem as utilsAddItem, removeItemById } from '../../../components/item/ItemUtils.js';
import { updateRelationReferences } from '../../../features/relations/RelationUtils.js';

/**
 * Add a new item
 * @param {Object} newItem - Item to add
 * @param {string} parentId - Parent item ID (optional)
 * @param {Function} setItems - State setter for items
 * @param {Function} setExpandedItems - State setter for expanded items
 * @returns {boolean} - Whether the item was added successfully
 */
export const addItem = (newItem, parentId, setItems, setExpandedItems) => {
    if (!newItem.title) {
        showAlert("Item title is required", "danger");
        return false;
    }

    // Always generate a new unique ID
    if (!newItem.id) {
        newItem.id = generateItemId();
    }
    
    setItems(prevItems => {
        try {
            const newItems = JSON.parse(JSON.stringify(prevItems));
            const success = utilsAddItem(newItems, newItem, parentId);
            
            if (!success) {
                throw new Error("Failed to add item");
            }
            
            return newItems;
        } catch (err) {
            console.error("Error adding item:", err);
            showAlert(`Error adding item: ${err.message}`, "danger");
            return prevItems;
        }
    });
    
    // Expand parent item if adding a child
    if (parentId) {
        setExpandedItems(prev => ({...prev, [parentId]: true}));
    }
    
    showAlert(`Item "${newItem.title}" has been added.`, "success");
    return true;
};

/**
 * Update an existing item
 * @param {Object} updatedItem - Item with updated values
 * @param {Array} items - Current items array
 * @param {Function} setItems - State setter for items
 * @param {Function} checkRelationReferences - Function to check relation references
 * @returns {boolean} - Whether the item was updated successfully
 */
export const updateItem = (updatedItem, items, setItems, checkRelationReferences) => {
    if (!updatedItem || !updatedItem.id) {
        showAlert("Cannot update: Invalid item data", "danger");
        return false;
    }
    
    // Save scroll position before update
    saveScrollPosition();
    
    // Find original item to check title
    const originalItem = findItemById(items, updatedItem.id);
    if (originalItem && originalItem.title !== updatedItem.title) {
        // Title has changed, check for references
        checkRelationReferences(originalItem.title, updatedItem.title, updatedItem, (updatedReferences, count) => {
            if (updatedReferences) {
                showAlert(`Updated ${count} reference${count !== 1 ? 's' : ''} to the renamed item`, "success");
            }
            
            // Perform the update
            performItemUpdate(updatedItem, setItems);
        });
    } else {
        // No title change or no original item found
        performItemUpdate(updatedItem, setItems);
    }
    
    return true;
};

/**
 * Helper for updating an item
 * @param {Object} updatedItem - Item with updated values
 * @param {Function} setItems - State setter for items
 */
export const performItemUpdate = (updatedItem, setItems) => {
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
            showAlert(`Error updating item: ${err.message}`, "danger");
            return prevItems;
        }
    });
    
    // Restore scroll position after update with a slight delay
    restoreScrollPosition();
    
    showAlert(`Item "${updatedItem.title}" has been updated.`, "success");
};

/**
 * Remove an item
 * @param {string} id - ID of the item to remove
 * @param {Function} setItems - State setter for items
 * @returns {boolean} - Whether the item was removed successfully
 */
export const removeItem = (id, setItems) => {
    if (!id) {
        showAlert("Cannot delete: Item ID is missing", "danger");
        return false;
    }
    
    setItems(prevItems => {
        try {
            const newItems = JSON.parse(JSON.stringify(prevItems));
            const removed = removeItemById(newItems, id);
            
            if (!removed) {
                console.warn(`Item with ID ${id} not found for deletion`);
            }
            
            return newItems;
        } catch (err) {
            console.error("Error removing item:", err);
            return prevItems;
        }
    });
    
    showAlert("Item has been deleted.", "success");
    return true;
};

/**
 * Reorder items (for drag-and-drop)
 * @param {string} sourceId - ID of the item to move
 * @param {string} targetId - ID of the target parent item (null for top level)
 * @param {number} newIndex - New index for the item
 * @param {Function} setItems - State setter for items
 */
export const reorderItems = (sourceId, targetId, newIndex, setItems) => {
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
};

/**
 * Check if item title is referenced in relations and offer to update
 * @param {string} oldTitle - Original item title
 * @param {string} newTitle - New item title
 * @param {Object} updatedItem - Item being updated
 * @param {Function} callback - Callback function
 * @param {Array} items - Current items array
 */
export const checkRelationReferences = (oldTitle, newTitle, updatedItem, callback, items) => {
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
        const updateCount = updateRelationReferences(items, oldTitle, newTitle);
        
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
};

// Import missing functions from utils.js
import { saveScrollPosition, restoreScrollPosition } from '../../../core/utils.js';