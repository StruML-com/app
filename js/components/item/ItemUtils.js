/**
 * Item utility functions
 * Contains utility functions specific to item manipulation
 */

import { showAlert } from '../../core/utils.js';

// Find item by ID
export function findItemById(items, id) {
    if (!items || !Array.isArray(items) || !id) return null;
    
    for (const item of items) {
        if (item.id === id) return item;
        
        if (item.items && item.items.length > 0) {
            const found = findItemById(item.items, id);
            if (found) return found;
        }
    }
    return null;
}

// Find item by title
export function findItemByTitle(items, title) {
    if (!items || !Array.isArray(items) || !title) return null;
    
    for (const item of items) {
        if (item.title === title) return item;
        
        if (item.items && item.items.length > 0) {
            const found = findItemByTitle(item.items, title);
            if (found) return found;
        }
    }
    return null;
}

// Find item ID by title (recursive)
export function findItemIdByTitle(items, title) {
    if (!items || !Array.isArray(items) || !title) return null;

    for (const item of items) {
        if (item.title === title) return item.id; // Return ID if title matches

        if (item.items && item.items.length > 0) {
            const foundId = findItemIdByTitle(item.items, title);
            if (foundId) return foundId; // Return ID found in children
        }
    }
    return null; // Not found
}

// Find parent of item by ID
export function findParentOfItem(items, id, parent = null) {
    if (!items || !Array.isArray(items) || !id) return null;
    
    for (const item of items) {
        if (item.id === id) return parent;
        
        if (item.items && item.items.length > 0) {
            const found = findParentOfItem(item.items, id, item);
            if (found) return found;
        }
    }
    return null;
}

// Remove item by ID
export function removeItemById(items, id) {
    if (!items || !Array.isArray(items) || !id) return false;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].id === id) {
            items.splice(i, 1);
            return true;
        }
        
        if (items[i].items && items[i].items.length > 0) {
            if (removeItemById(items[i].items, id)) {
                return true;
            }
        }
    }
    return false;
}

// Add new item
export function addItem(items, newItem, parentId = null) {
    if (!newItem) return false;
    
    if (!parentId) {
        items.push(newItem);
        return true;
    }
    
    const parent = findItemById(items, parentId);
    if (parent) {
        if (!parent.items) parent.items = [];
        
        if (!newItem.id) {
            newItem.id = generateItemId();
        }
        
        parent.items.push(newItem);
        return true;
    }
    
    return false;
}

// Extract type from tags
export function getTypeFromTags(tags) {
    if (!tags) return '';
    const tagsList = tags.split(',').map(tag => tag.trim());
    const typeTag = tagsList.find(tag => tag.startsWith('type::'));
    return typeTag ? typeTag.split('::')[1] : '';
}

// Get icon for list type
export function getListTypeIcon(type) {
    // Access LIST_TYPES from the global namespace
    const LIST_TYPES = window.StruMLApp.Constants?.LIST_TYPES || {};
    return LIST_TYPES[type]?.icon || 'bi-circle';
}

// Check if item has any of the specified tags
export function itemHasAnyTag(item, tags) {
    if (!item.tags) return false;
    
    const itemTags = item.tags.split(',').map(tag => tag.trim())
        .filter(tag => !tag.startsWith('type::') && !tag.includes('>>'));
    return tags.some(tag => itemTags.includes(tag));
}

// Check if item has ALL of the specified tags (for AND mode)
export function itemHasAllTags(item, tags) {
    if (!item.tags) return false;
    
    const itemTags = item.tags.split(',').map(tag => tag.trim())
        .filter(tag => !tag.startsWith('type::') && !tag.includes('>>'));
        
    return tags.every(tag => itemTags.includes(tag));
}

// Check if item or any child has any of the specified tags
export function itemHasAnyTagRecursive(item, tags) {
    if (itemHasAnyTag(item, tags)) return true;
    
    if (item.items && item.items.length > 0) {
        return item.items.some(child => itemHasAnyTagRecursive(child, tags));
    }
    
    return false;
}

// Extract all tags from items, excluding special tags
export function extractAllTags(items) {
    if (!items || !Array.isArray(items)) return [];
    
    const tagSet = new Set();
    
    const processTags = (item) => {
        if (item.tags) {
            item.tags.split(',').forEach(tag => {
                const trimmedTag = tag.trim();
                // Skip special tags (with ::) and relation tags (with >>)
                if (trimmedTag && !trimmedTag.includes('::') && !trimmedTag.includes('>>')) {
                    tagSet.add(trimmedTag);
                }
            });
        }
        
        if (item.items && item.items.length > 0) {
            item.items.forEach(processTags);
        }
    };
    
    items.forEach(processTags);
    return Array.from(tagSet).sort();
}

// Filter items by tags with AND/OR logic and subitem control
export function filterItemsByTags(items, tags, filterMode = 'OR', showSubItems = true) {
    if (tags.includes('all')) return items;
    
    // First, create a map of matching items and their ancestors
    const matchingItems = new Set();
    
    // Identify all matching items based on filter mode
    const findMatches = (item, path = []) => {
        const newPath = [...path, item.id];
        
        // For AND mode, the item must have ALL tags
        // For OR mode, the item must have ANY of the tags
        const isMatch = filterMode === 'AND' 
            ? itemHasAllTags(item, tags)
            : itemHasAnyTag(item, tags);
            
        if (isMatch) {
            // Add this item and all its ancestors to the set
            newPath.forEach(id => matchingItems.add(id));
            return true;
        }
        
        if (item.items && item.items.length > 0) {
            const hasMatchingChild = item.items.some(child => 
                findMatches(child, newPath)
            );
            if (hasMatchingChild) {
                // Add this item and all its ancestors to the set
                newPath.forEach(id => matchingItems.add(id));
                return true;
            }
        }
        return false;
    };
    
    items.forEach(item => findMatches(item));
    
    // Now clone the structure, keeping only matched items and their ancestors
    const cloneStructure = (itemsArray) => {
        return itemsArray
            .filter(item => matchingItems.has(item.id))
            .map(item => ({
                ...item,
                // If showSubItems is false, only include items that match the filter directly
                items: (item.items && item.items.length > 0 && showSubItems) 
                    ? cloneStructure(item.items) 
                    : []
            }));
    };
    
    return cloneStructure(items);
}