/**
 * UI Actions
 * Contains actions related to UI manipulation
 */

import { buildDocumentNavigationHtml, attachNavigationHandlers } from '../../../components/navigation/NavigationUtils.js';
import { extractAllTags, filterItemsByTags } from '../../../components/item/ItemUtils.js';
import { findItemById, findParentOfItem } from '../../../components/item/ItemUtils.js';

/**
 * Toggle item expansion
 * @param {string} id - ID of the item to toggle
 * @param {Function} setExpandedItems - State setter for expanded items
 */
export const toggleItemExpansion = (id, setExpandedItems) => {
    setExpandedItems(prev => ({...prev, [id]: !prev[id]}));
};

/**
 * Toggle navigation item expansion
 * @param {string} id - ID of the item to toggle
 * @param {boolean} isExpanded - Whether the item should be expanded
 * @param {Function} setNavExpandedItems - State setter for nav expanded items
 */
export const toggleNavExpansion = (id, isExpanded, setNavExpandedItems) => {
    setNavExpandedItems(prev => ({...prev, [id]: isExpanded}));
};

/**
 * Toggle tag filter
 * @param {string} tag - Tag to toggle
 * @param {Function} setActiveTags - State setter for active tags
 */
export const toggleTagFilter = (tag, setActiveTags) => {
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
};

/**
 * Toggle item details visibility
 * @param {Function} setShowItemDetails - State setter for show item details
 */
export const toggleShowItemDetails = (setShowItemDetails) => {
    setShowItemDetails(prev => !prev);
};

/**
 * Update document navigation in UI
 * @param {Array} items - Current items array
 * @param {Array} filteredItems - Filtered items array
 * @param {Array} activeTags - Active tags array
 * @param {string} currentItemId - Current item ID
 * @param {Object} navExpandedItems - Navigation expanded items object
 */
export const updateDocumentNavigation = (items, filteredItems, activeTags, currentItemId, navExpandedItems) => {
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
        navContainer.innerHTML = buildDocumentNavigationHtml(itemsToDisplay, currentItemId, navExpandedItems);
        
        navContainer.querySelectorAll('[id^="nav-collapse-"]').forEach(collapse => {
            new bootstrap.Collapse(collapse, { toggle: false });
        });
        
        attachNavigationHandlers();
    }
};

/**
 * Update tag filters in UI
 * @param {Array} items - Current items array
 * @param {Array} activeTags - Active tags array
 * @param {Function} toggleTagFilter - Function to toggle tag filter
 * @param {Function} setFilteredItems - State setter for filtered items
 */
export const updateTagFilters = (items, activeTags, toggleTagFilter, setFilteredItems) => {
    const tagFiltersContainer = document.getElementById('tag-filters');
    if (!tagFiltersContainer) return;
    
    const allTags = extractAllTags(items);
    
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
                setFilteredItems(filterItemsByTags(items, activeTags, mode, showSubitems));
            }
        });
        
        showSubitemsCheckbox.addEventListener('change', () => {
            const showSubitems = showSubitemsCheckbox.checked;
            localStorage.setItem('show-subitems', showSubitems);
            if (!activeTags.includes('all')) {
                // Apply the filter with the subitem setting
                const mode = filterModeSelect.value;
                setFilteredItems(filterItemsByTags(items, activeTags, mode, showSubitems));
            }
        });
    }
};

/**
 * Scroll to an item by ID
 * @param {string} itemId - ID of the item to scroll to
 * @param {Array} items - Current items array
 * @param {Function} setExpandedItems - State setter for expanded items
 */
export const scrollToItem = (itemId, items, setExpandedItems) => {
    const itemElement = document.getElementById(itemId);
    if (itemElement) {
        let current = itemId;
        while (current) {
            const parent = findParentOfItem(items, current);
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
};