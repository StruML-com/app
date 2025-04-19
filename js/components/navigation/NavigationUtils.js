/**
 * Navigation utility functions
 * Contains utility functions specific to document navigation
 */

import { getTypeFromTags, getListTypeIcon } from '../../components/item/ItemUtils.js';

// Build HTML for document navigation
export function buildDocumentNavigationHtml(items, activeItemId = null, navExpandedItems = {}, depth = 0) {
    if (!items || items.length === 0) return '';
    
    let html = '<ul class="doc-nav">';
    
    items.forEach(item => {
        const isActive = item.id === activeItemId;
        const hasChildren = item.items && item.items.length > 0;
        const isExpanded = navExpandedItems[item.id];
        
        // Only expand top-level by default (depth === 0)
        const shouldBeExpanded = depth === 0 ? true : isExpanded;
        
        const listType = getTypeFromTags(item.tags) || '';
        const listIcon = getListTypeIcon(listType);
        
        // Calculate indentation - consistent padding strategy
        const indentPadding = depth * 20; // 20px per level
        
        html += `
            <li class="doc-nav-item">
                <div style="padding-left: ${indentPadding}px;">
                    ${hasChildren ? 
                        `<span class="doc-nav-toggle" data-id="${item.id}">
                            <i class="bi ${shouldBeExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}"></i>
                        </span>` : 
                        `<span class="doc-nav-indent"></span>`
                    }
                    
                    <i class="bi ${listIcon} me-1" style="font-size: 0.8rem;"></i>
                    
                    <a class="doc-nav-link ${isActive ? 'active' : ''}" 
                       href="#${item.id}" 
                       data-id="${item.id}"
                       title="${item.title}">
                        ${item.title.substring(0, 35)}${item.title.length > 35 ? '...' : ''}
                    </a>
                </div>
                ${hasChildren ? 
                    `<div class="collapse ${shouldBeExpanded ? 'show' : ''}" id="nav-collapse-${item.id}">
                        ${buildDocumentNavigationHtml(item.items, activeItemId, navExpandedItems, depth + 1)}
                    </div>` : 
                    ''}
            </li>
        `;
    });
    
    html += '</ul>';
    return html;
}

// Attach event handlers to navigation elements
export function attachNavigationHandlers() {
    // Handle navigation toggle clicks
    document.querySelectorAll('.doc-nav-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const itemId = toggle.dataset.id;
            const icon = toggle.querySelector('i');
            const collapseElement = document.getElementById(`nav-collapse-${itemId}`);
            
            if (collapseElement) {
                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement);
                
                if (icon.classList.contains('bi-chevron-right')) {
                    bsCollapse.show();
                    icon.classList.replace('bi-chevron-right', 'bi-chevron-down');
                    
                    // Update state via global app reference
                    if (window.app?.toggleNavExpansion) {
                        window.app.toggleNavExpansion(itemId, true);
                    }
                } else {
                    bsCollapse.hide();
                    icon.classList.replace('bi-chevron-down', 'bi-chevron-right');
                    
                    // Update state via global app reference
                    if (window.app?.toggleNavExpansion) {
                        window.app.toggleNavExpansion(itemId, false);
                    }
                }
            }
        });
    });
    
    // Handle navigation link clicks
    document.querySelectorAll('.doc-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const itemId = link.dataset.id;
            
            // Update current item via global app reference
            if (window.app?.setCurrentItemId) {
                window.app.setCurrentItemId(itemId);
            }
            
            // Scroll to the item
            if (window.app?.scrollToItem) {
                window.app.scrollToItem(itemId);
            } else {
                // Fallback if app reference not available
                const itemElement = document.getElementById(itemId);
                if (itemElement) {
                    itemElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
            
            // Update URL hash
            window.location.hash = itemId;
        });
    });
}

// Show drag confirmation dialog
export function showDragConfirmation(source, target, onConfirm, onCancel) {
    if (!source || !target) {
        if (onCancel) onCancel();
        return;
    }
    
    const confirmText = `Move "${source.title}" ${target.id ? `under "${target.title}"` : 'to top level'}?`;
    
    if (confirm(confirmText)) {
        if (onConfirm) onConfirm();
    } else {
        if (onCancel) onCancel();
    }
}

// Populate item selectors for matrix editor
export function populateItemSelectors(items) {
    const sourceSelect = document.getElementById('source-item-select');
    const targetSelect = document.getElementById('target-item-select');
    
    if (!sourceSelect || !targetSelect) return;
    
    // Clear existing options except the first one
    sourceSelect.innerHTML = '<option value="">Select item for rows...</option>';
    targetSelect.innerHTML = '<option value="">Select item for columns...</option>';
    
    // Items with children for selection
    const itemsWithChildren = [];
    
    // Collect items that have children
    const collectItemsWithChildren = (items, depth = 0, path = '') => {
        if (!items || !Array.isArray(items)) return;
        
        items.forEach(item => {
            if (item.items && item.items.length > 0) {
                itemsWithChildren.push({ 
                    id: item.id,
                    title: item.title,
                    depth,
                    path: path ? `${path} > ${item.title}` : item.title
                });
                
                // Recursively process children
                collectItemsWithChildren(item.items, depth + 1, path ? `${path} > ${item.title}` : item.title);
            }
        });
    };
    
    collectItemsWithChildren(items);
    
    // Add options to selects
    itemsWithChildren.forEach(item => {
        const indent = '—'.repeat(item.depth);
        const displayText = item.depth > 0 ? `${indent} ${item.title}` : item.title;
        
        const sourceOption = document.createElement('option');
        sourceOption.value = item.id;
        sourceOption.textContent = displayText;
        sourceOption.title = item.path;
        sourceSelect.appendChild(sourceOption);
        
        const targetOption = document.createElement('option');
        targetOption.value = item.id;
        targetOption.textContent = displayText;
        targetOption.title = item.path;
        targetSelect.appendChild(targetOption);
    });
}