// Assign Utils object to the global namespace
window.StruMLApp = window.StruMLApp || {};

window.StruMLApp.Utils = {
    // Store current scroll position before modal opens
    scrollPosition: 0,
    
    // Store current cell tooltip
    matrixCellTooltip: null,
    
    // Save current scroll position
    saveScrollPosition() {
        this.scrollPosition = window.scrollY;
    },
    
    // Restore saved scroll position
    restoreScrollPosition() {
        setTimeout(() => {
            window.scrollTo(0, this.scrollPosition);
        }, 10);
    },
    
    // ID generation - always use UUID or fallback to random string
    generateItemId() {
        // Check if uuidv4 is available
        if (typeof uuidv4 !== 'undefined') {
            return uuidv4();
        } else {
            // Fallback implementation for UUID
            return 'id-' + Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
        }
    },
    
    // Extract type from tags
    getTypeFromTags(tags) {
        if (!tags) return '';
        const tagsList = tags.split(',').map(tag => tag.trim());
        const typeTag = tagsList.find(tag => tag.startsWith('type::'));
        return typeTag ? typeTag.split('::')[1] : '';
    },
    
    // Get icon for list type
    getListTypeIcon(type) {
        // Access LIST_TYPES from the global namespace
        const LIST_TYPES = window.StruMLApp.Constants?.LIST_TYPES || {};
        return LIST_TYPES[type]?.icon || 'bi-circle';
    },
    
    // Show alert toast
    showAlert(message, type = 'success', duration = 3000) {
        const toastId = `toast-${Date.now()}`;
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <span class="bg-${type} rounded me-2" style="width:16px; height:16px;"></span>
                    <strong class="me-auto">StruML</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        const toastContainer = document.getElementById('toast-container');
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { 
            autohide: true, 
            delay: duration 
        });
        
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    },
    
    customValueMapping: {
        'max': 9,
        'very high': 8,
        'high': 7,
        'slightly high': 6,
        'neutral': 5,
        'slightly low': 4,
        'low': 3,
        'very low': 2,
        'min': 1
    },

    // Extract numeric value from relation names with number in parentheses
    // Example: "high (8)" or "good (+5)" or "bad (-3)"
    extractNumericValueFromRelation(relation) {
        if (!relation) return null;
        
        // Convert emoji representations to numeric values
        const emojiMap = {
            '🟥': -3, '🔴': -2, '▾': -1,
            '▴': 1, '🟢': 2, '🟩': 3,
            '🔹': 1, '🔷': 2, '🟦': 3
        };
        
        // Check for emoji representation
        for (const [emoji, value] of Object.entries(emojiMap)) {
            if (relation.includes(emoji)) {
                return {
                    value: Math.abs(value),
                    isPositive: value > 0,
                    isNegative: value < 0,
                    original: relation
                };
            }
        }
        
        // Look for pattern: any text followed by a number in parentheses
        const match = relation.match(/\(([+-]?\d+)\)/);
        if (!match) return null;
        
        // Return the extracted number and whether it's positive
        const numString = match[1];
        const value = parseInt(numString, 10);
        const isPositive = numString.includes('+');
        
        return {
            value: Math.abs(value), // Absolute value (1-10)
            isPositive, // Explicitly marked as positive with +
            isNegative: value < 0, // Negative value
            original: relation // Keep original relation name
        };
    },

    // Get color for relation based on numeric value
    getColorForRelation(relation) {
        const extracted = this.extractNumericValueFromRelation(relation);
        if (!extracted) return null;
        
        const { value, isPositive, isNegative } = extracted;
        
        // Ensure value is between 1 and 10
        const normalizedValue = Math.min(Math.max(value, 1), 10);
        
        // Intensity ranges from 0.2 (lightest) to 0.9 (darkest)
        const intensity = 0.2 + (normalizedValue / 10) * 0.7;
        
        // Blue for neutral values (1-10)
        if (!isPositive && !isNegative) {
            return `rgba(0, 0, 255, ${intensity})`;
        }
        // Green for positive values (+1 to +10)
        else if (isPositive) {
            return `rgba(0, 128, 0, ${intensity})`;
        }
        // Red for negative values (-1 to -10)
        else if (isNegative) {
            return `rgba(255, 0, 0, ${intensity})`;
        }
        
        return null;
    },

    // Get CSS class for relation based on numeric value
    getRelationColorClass(relation) {
        const extracted = this.extractNumericValueFromRelation(relation);
        if (!extracted) return '';
        
        const { value, isPositive, isNegative } = extracted;
        
        // Ensure value is between 1 and 10
        const normalizedValue = Math.min(Math.max(value, 1), 10);
        
        // Scale value to 1-5 range for class names
        const intensityLevel = Math.ceil(normalizedValue / 2);
        
        // Blue for neutral values (1-10)
        if (!isPositive && !isNegative) {
            return `relation-blue-${intensityLevel}`;
        }
        // Green for positive values (+1 to +10)
        else if (isPositive) {
            return `relation-green-${intensityLevel}`;
        }
        // Red for negative values (-1 to -10)
        else if (isNegative) {
            return `relation-red-${intensityLevel}`;
        }
        
        return '';
    },

    // Function to convert any relation value to numeric value
    getNumericValueForRelation(relation) {
        if (!relation) return 0;
        
        // Access RELATION_TYPES from the global namespace
        const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};

        // If it's one of our standard values, use the predefined value
        const knownRelation = RELATION_TYPES[relation.toLowerCase()];
        if (knownRelation) {
            return knownRelation.value;
        }
        
        // Check custom value mapping
        const normalizedRelation = relation.toLowerCase();
        if (this.customValueMapping[normalizedRelation] !== undefined) {
            return this.customValueMapping[normalizedRelation];
        }
        
        // For other values, try to convert to a number or use 1 as fallback
        const numericValue = parseInt(relation);
        return !isNaN(numericValue) ? Math.min(Math.max(numericValue, 1), 9) : 1;
    },
    
    // Render markdown content safely
    renderMarkdown(markdown) {
        if (!markdown) return '';
        
        const rawHtml = marked.parse(markdown);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');

        doc.querySelectorAll('a').forEach(link => {
            if (!link.hasAttribute('target')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
        
        return DOMPurify.sanitize(doc.body.innerHTML, {
            USE_PROFILES: { html: true },
            ADD_ATTR: ['target', 'rel']
        });
    },
    
    // Find item by ID
    findItemById(items, id) {
        if (!items || !Array.isArray(items) || !id) return null;
        
        for (const item of items) {
            if (item.id === id) return item;
            
            if (item.items && item.items.length > 0) {
                const found = this.findItemById(item.items, id);
                if (found) return found;
            }
        }
        return null;
    },

    // Find item by title
    findItemByTitle(items, title) {
        if (!items || !Array.isArray(items) || !title) return null;
        
        for (const item of items) {
            if (item.title === title) return item;
            
            if (item.items && item.items.length > 0) {
                const found = this.findItemByTitle(item.items, title);
                if (found) return found;
            }
        }
        return null;
    },

    // Find item ID by title (recursive)
    findItemIdByTitle(items, title) {
        if (!items || !Array.isArray(items) || !title) return null;

        for (const item of items) {
            if (item.title === title) return item.id; // Return ID if title matches

            if (item.items && item.items.length > 0) {
                const foundId = this.findItemIdByTitle(item.items, title);
                if (foundId) return foundId; // Return ID found in children
            }
        }
        return null; // Not found
    },
    
    // Find parent of item by ID
    findParentOfItem(items, id, parent = null) {
        if (!items || !Array.isArray(items) || !id) return null;
        
        for (const item of items) {
            if (item.id === id) return parent;
            
            if (item.items && item.items.length > 0) {
                const found = this.findParentOfItem(item.items, id, item);
                if (found) return found;
            }
        }
        return null;
    },
    
    // Remove item by ID
    removeItemById(items, id) {
        if (!items || !Array.isArray(items) || !id) return false;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === id) {
                items.splice(i, 1);
                return true;
            }
            
            if (items[i].items && items[i].items.length > 0) {
                if (this.removeItemById(items[i].items, id)) {
                    return true;
                }
            }
        }
        return false;
    },
    
    // Add new item
    addItem(items, newItem, parentId = null) {
        if (!newItem) return false;
        
        if (!parentId) {
            items.push(newItem);
            return true;
        }
        
        const parent = this.findItemById(items, parentId);
        if (parent) {
            if (!parent.items) parent.items = [];
            
            if (!newItem.id) {
                newItem.id = this.generateItemId();
            }
            
            parent.items.push(newItem);
            return true;
        }
        
        return false;
    },
    
    // Check if item has any of the specified tags
    itemHasAnyTag(item, tags) {
        if (!item.tags) return false;
        
        const itemTags = item.tags.split(',').map(tag => tag.trim())
            .filter(tag => !tag.startsWith('type::') && !tag.includes('>>'));
        return tags.some(tag => itemTags.includes(tag));
    },
    
    // Check if item has ALL of the specified tags (for AND mode)
    itemHasAllTags(item, tags) {
        if (!item.tags) return false;
        
        const itemTags = item.tags.split(',').map(tag => tag.trim())
            .filter(tag => !tag.startsWith('type::') && !tag.includes('>>'));
            
        return tags.every(tag => itemTags.includes(tag));
    },

    // Check if item or any child has any of the specified tags
    itemHasAnyTagRecursive(item, tags) {
        if (this.itemHasAnyTag(item, tags)) return true;
        
        if (item.items && item.items.length > 0) {
            return item.items.some(child => this.itemHasAnyTagRecursive(child, tags));
        }
        
        return false;
    },
    
    // Extract all tags from items, excluding special tags
    extractAllTags(items) {
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
    },
    
    // Filter items by tags with AND/OR logic and subitem control
    filterItemsByTags(items, tags, filterMode = 'OR', showSubItems = true) {
        if (tags.includes('all')) return items;
        
        // First, create a map of matching items and their ancestors
        const matchingItems = new Set();
        
        // Identify all matching items based on filter mode
        const findMatches = (item, path = []) => {
            const newPath = [...path, item.id];
            
            // For AND mode, the item must have ALL tags
            // For OR mode, the item must have ANY of the tags
            const isMatch = filterMode === 'AND' 
                ? this.itemHasAllTags(item, tags)
                : this.itemHasAnyTag(item, tags);
                
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
    },
    
    // Build HTML for document navigation - fixed indentation
    buildDocumentNavigationHtml(items, activeItemId = null, navExpandedItems = {}, depth = 0) {
        if (!items || items.length === 0) return '';
        
        let html = '<ul class="doc-nav">';
        
        items.forEach(item => {
            const isActive = item.id === activeItemId;
            const hasChildren = item.items && item.items.length > 0;
            const isExpanded = navExpandedItems[item.id];
            
            // Only expand top-level by default (depth === 0)
            const shouldBeExpanded = depth === 0 ? true : isExpanded;
            
            const listType = this.getTypeFromTags(item.tags) || '';
            const listIcon = this.getListTypeIcon(listType);
            
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
                            ${this.buildDocumentNavigationHtml(item.items, activeItemId, navExpandedItems, depth + 1)}
                        </div>` : 
                        ''}
                </li>
            `;
        });
        
        html += '</ul>';
        return html;
    },
    
    // Attach event handlers to navigation elements
    attachNavigationHandlers() {
        const navContainer = document.getElementById('document-navigation');
        if (!navContainer) return;
        
        // Toggle handlers
        navContainer.querySelectorAll('.doc-nav-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = e.currentTarget.dataset.id;
                if (!itemId) return;
                
                const collapseElement = document.getElementById(`nav-collapse-${itemId}`);
                if (!collapseElement) return;
                
                const icon = e.currentTarget.querySelector('i');
                if (!icon) return;
                
                try {
                    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement);
                    
                    if (icon.classList.contains('bi-chevron-down')) {
                        bsCollapse.hide();
                        icon.classList.replace('bi-chevron-down', 'bi-chevron-right');
                        window.app?.toggleNavExpansion(itemId, false);
                    } else {
                        bsCollapse.show();
                        icon.classList.replace('bi-chevron-right', 'bi-chevron-down');
                        window.app?.toggleNavExpansion(itemId, true);
                    }
                } catch (err) {
                    console.error('Navigation toggle error:', err);
                }
            });
        });
        
        // Link click handlers
        navContainer.querySelectorAll('.doc-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = e.currentTarget.dataset.id;
                if (!itemId) return;
                
                window.app?.setCurrentItemId(itemId);
                window.app?.scrollToItem(itemId);
                
                // Update active class
                setTimeout(() => {
                    navContainer.querySelectorAll('.doc-nav-link').forEach(navLink => {
                        navLink.classList.remove('active');
                    });
                    e.currentTarget.classList.add('active');
                }, 10);
            });
        });
    },
    
    // Show confirmation dialog for drag operations
    showDragConfirmation(source, target, onConfirm, onCancel) {
        const title = `Confirm Move`;
        const message = `Are you sure you want to move the item <strong>${source.title}</strong> ${target ? `to be a child of <strong>${target.title}</strong>` : 'to the top level'}?`;
        
        const modalHtml = `
            <div class="modal fade" id="drag-confirm-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="drag-cancel-btn" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="drag-confirm-btn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalElement = document.getElementById('drag-confirm-modal');
        
        const modal = new bootstrap.Modal(modalElement);
        
        document.getElementById('drag-cancel-btn').addEventListener('click', () => {
            if (onCancel) onCancel();
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });
        });
        
        document.getElementById('drag-confirm-btn').addEventListener('click', () => {
            if (onConfirm) onConfirm();
            modal.hide();
            modalElement.addEventListener('hidden.bs.modal', () => {
                modalElement.remove();
            });
        });
        
        modal.show();
    },
    
    // Get local path for markdown info files
    getLocalMarkdownPath(itemTitle) {
        const sanitizedTitle = itemTitle
            .replace(/[^a-zA-Z0-9]+/g, "_")
            .replace(/^_|_$/g, "");
        return `info/docs/pages/sections/${sanitizedTitle}.md`;
    },
    
    // Check if a tag is a relation tag
    isRelationTag(tag) {
        return tag.includes(">>") && tag.split(">>").length === 2;
    },

    // Get all relations from tags
    getRelationsFromTags(tags) {
        if (!tags) return [];
        
        return tags.split(',')
            .map(tag => tag.trim())
            .filter(tag => this.isRelationTag(tag))
            .map(relationTag => {
                const [relation, target] = relationTag.split(">>");
                return { 
                    relation, 
                    target: target.trim() 
                };
            });
    },

    // Add a relation to item tags
    addRelationToTags(tags, relation, target) {
        if (!tags && !relation && !target) return '';
        
        // Handle case where tags might be a JSON string (from tagify)
        let normalizedTags = tags;
        if (tags && typeof tags === 'string' && tags.trim().startsWith('[{')) {
            try {
                // Try to parse JSON formatted tags
                const parsedTags = JSON.parse(tags);
                if (Array.isArray(parsedTags)) {
                    // Extract 'value' property from each tag object
                    normalizedTags = parsedTags.map(tag => tag.value || '').filter(t => t).join(', ');
                }
            } catch (err) {
                // If parsing fails, use tags as-is
                console.warn("Failed to parse tags JSON:", err);
            }
        }
        
        let tagList = normalizedTags ? normalizedTags.split(',').map(t => t.trim()).filter(t => t) : [];
        
        // Remove any existing relation to the same target
        tagList = tagList.filter(tag => {
            if (!tag.includes('>>')) return true;
            const [_, tagTarget] = tag.split('>>');
            return tagTarget.trim() !== target;
        });
        
        // Add the new relation
        tagList.push(`${relation}>>${target}`);
        
        return tagList.join(', ');
    },

    // Remove a relation from item tags
    removeRelationFromTags(tags, target) {
        if (!tags || !target) return tags;
        
        // Handle case where tags might be a JSON string
        let normalizedTags = tags;
        if (tags && typeof tags === 'string' && tags.trim().startsWith('[{')) {
            try {
                const parsedTags = JSON.parse(tags);
                if (Array.isArray(parsedTags)) {
                    normalizedTags = parsedTags.map(tag => tag.value || '').filter(t => t).join(', ');
                }
            } catch (err) {
                console.warn("Failed to parse tags JSON:", err);
            }
        }
        
        const tagList = normalizedTags.split(',')
            .map(tag => tag.trim())
            .filter(tag => {
                if (!tag.includes('>>')) return true;
                const [_, tagTarget] = tag.split('>>');
                return tagTarget.trim() !== target;
            });
        
        return tagList.join(', ');
    },
    
    // Update references to a renamed item in relations
    updateRelationReferences(items, oldTitle, newTitle) {
        if (!items || !Array.isArray(items) || !oldTitle || !newTitle) return false;
        
        let updatesCount = 0;
        
        const updateItemRelations = (item) => {
            if (item.tags) {
                const relations = this.getRelationsFromTags(item.tags);
                let updated = false;
                
                // Check if this item has relations to the old title
                relations.forEach(rel => {
                    if (rel.target === oldTitle) {
                        updated = true;
                        updatesCount++;
                    }
                });
                
                // Update tags if needed
                if (updated) {
                    // Replace all occurrences of the old title in relation tags
                    let updatedTags = [];
                    item.tags.split(',').forEach(tag => {
                        const trimmedTag = tag.trim();
                        if (this.isRelationTag(trimmedTag)) {
                            const [relation, target] = trimmedTag.split('>>');
                            if (target.trim() === oldTitle) {
                                updatedTags.push(`${relation}>>${newTitle}`);
                            } else {
                                updatedTags.push(trimmedTag);
                            }
                        } else {
                            updatedTags.push(trimmedTag);
                        }
                    });
                    item.tags = updatedTags.join(', ');
                }
            }
            
            // Recursively process children
            if (item.items && item.items.length > 0) {
                item.items.forEach(updateItemRelations);
            }
        };
        
        items.forEach(updateItemRelations);
        return updatesCount;
    },
    
    // Render relations for display
    renderRelationTags(relations) {
        if (!relations || relations.length === 0) {
            return '<div class="alert alert-info">No relations defined</div>';
        }
        
        // Access RELATION_TYPES from the global namespace
        const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
        let html = '<div class="relation-tags">';
        
        relations.forEach(rel => {
            const relType = rel.relation;
            const relInfo = RELATION_TYPES[relType] || { 
                icon: 'bi-link', 
                label: relType, 
                level: ''
            };
            
            // Check for numeric value in relation name
            const colorClass = this.getRelationColorClass(relType);
            
            // Use either standard level class or new color class
            let levelClass;
            if (colorClass) {
                levelClass = colorClass;
            } else {
                levelClass = relInfo.level ? `relation-${relInfo.level}` : '';
            }
            
            html += `
            <span class="relation-tag ${levelClass}" data-relation="${relType}>>${rel.target}">
                <i class="bi ${relInfo.icon}"></i>
                ${relInfo.label}:
                <span class="relation-target ms-1">${rel.target}</span>
                <button type="button" class="btn-close ms-2" style="font-size: 0.5rem;" data-relation="${relType}>>${rel.target}" aria-label="Remove"></button>
            </span>`;
        });
        
        html += '</div>';
        return html;
    },
    
    // Update related items in info panel
    updateRelatedItems(items, currentItem) {
        if (!currentItem) return;
        
        const relatedItemsContainer = document.getElementById('related-items');
        const relatedItemsList = document.getElementById('related-items-list');
        
        if (!relatedItemsContainer || !relatedItemsList) return;
        
        // Get relations FROM this item TO others (source relations)
        const sourceRelations = this.getRelationsFromTags(currentItem.tags || '');
        
        // Get relations TO this item FROM others (target relations)
        const targetRelations = [];
        const findTargetRelations = (items) => {
            items.forEach(item => {
                if (item.id !== currentItem.id && item.tags) {
                    const relations = this.getRelationsFromTags(item.tags);
                    relations.forEach(rel => {
                        if (rel.target === currentItem.title) {
                            targetRelations.push({
                                sourceItem: item,
                                relation: rel.relation
                            });
                        }
                    });
                }
                
                if (item.items && item.items.length > 0) {
                    findTargetRelations(item.items);
                }
            });
        };
        
        findTargetRelations(items);
        
        // Display both types of relations
        if (sourceRelations.length > 0 || targetRelations.length > 0) {
            relatedItemsContainer.classList.remove('d-none');
            relatedItemsList.innerHTML = '';
            
            // First show source relations (FROM current TO others)
            if (sourceRelations.length > 0) {
                const sourceHeader = document.createElement('h6');
                sourceHeader.className = 'mt-2 mb-2';
                sourceHeader.innerHTML = `<small><strong>Relations from ${currentItem.title}:</strong></small>`;
                relatedItemsList.appendChild(sourceHeader);
                
                sourceRelations.forEach(rel => {
                    const targetItem = this.findItemByTitle(items, rel.target);
                    
                    const itemElement = document.createElement('a');
                    itemElement.href = `#${targetItem?.id || ''}`;
                    itemElement.className = 'list-group-item list-group-item-action py-2';
                    itemElement.dataset.id = targetItem?.id || '';
                    
                    // Get relation styling
                    const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
                    const relInfo = RELATION_TYPES[rel.relation] || { 
                        icon: 'bi-link', 
                        label: rel.relation 
                    };
                    
                    const colorClass = this.getRelationColorClass(rel.relation);
                    
                    itemElement.innerHTML = `
                        <div class="d-flex align-items-center">
                            <div class="me-2 ${colorClass}">
                                <i class="bi ${relInfo.icon}"></i>
                            </div>
                            <div>
                                <div><strong>${rel.target}</strong></div>
                                <div class="small text-muted">${relInfo.label || rel.relation}</div>
                            </div>
                        </div>
                    `;
                    
                    if (targetItem) {
                        itemElement.addEventListener('click', (e) => {
                            e.preventDefault();
                            window.app?.setCurrentItemId(targetItem.id);
                            window.StruMLApp.Main?.infoPanel?.hide(); // Use global reference
                        });
                        relatedItemsList.appendChild(itemElement);
                    }
                });
            }
            
            // Then show target relations (TO current FROM others)
            if (targetRelations.length > 0) {
                const targetHeader = document.createElement('h6');
                targetHeader.className = 'mt-3 mb-2';
                targetHeader.innerHTML = `<small><strong>Relations to ${currentItem.title}:</strong></small>`;
                relatedItemsList.appendChild(targetHeader);
                
                targetRelations.forEach(rel => {
                    const itemElement = document.createElement('a');
                    itemElement.href = `#${rel.sourceItem.id}`;
                    itemElement.className = 'list-group-item list-group-item-action py-2';
                    itemElement.dataset.id = rel.sourceItem.id;
                    
                    // Get relation styling
                    const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
                    const relInfo = RELATION_TYPES[rel.relation] || { 
                        icon: 'bi-link', 
                        label: rel.relation 
                    };
                    
                    const colorClass = this.getRelationColorClass(rel.relation);
                    
                    itemElement.innerHTML = `
                        <div class="d-flex align-items-center">
                            <div class="me-2 ${colorClass}">
                                <i class="bi ${relInfo.icon}"></i>
                            </div>
                            <div>
                                <div><strong>${rel.sourceItem.title}</strong></div>
                                <div class="small text-muted">${relInfo.label || rel.relation}</div>
                            </div>
                        </div>
                    `;
                    
                    itemElement.addEventListener('click', (e) => {
                        e.preventDefault();
                        window.app?.setCurrentItemId(rel.sourceItem.id);
                        window.StruMLApp.Main?.infoPanel?.hide(); // Use global reference
                    });
                    
                    relatedItemsList.appendChild(itemElement);
                });
            }
        } else {
            relatedItemsContainer.classList.add('d-none');
        }
    },
    
    // Toggle sidebar visibility
    toggleSidebar(collapse) {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const mainHeader = document.getElementById('main-header');
        const expandSidebarBtn = document.getElementById('expand-sidebar-btn');
        
        if (collapse) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
            mainHeader.classList.add('expanded');
            expandSidebarBtn.classList.remove('d-none');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
            mainHeader.classList.remove('expanded');
            expandSidebarBtn.classList.add('d-none');
        }
    },

    // Populate selectors for matrix editor
    populateItemSelectors(items) {
        const sourceSelect = document.getElementById('source-item-select');
        const targetSelect = document.getElementById('target-item-select');
        
        if (!sourceSelect || !targetSelect) return;
        
        // Clear existing options except the first
        sourceSelect.innerHTML = '<option value="">Select item for rows...</option>';
        targetSelect.innerHTML = '<option value="">Select item for columns...</option>';
        
        // Get all items with children
        const itemsWithChildren = [];
        
        const collectItemsWithChildren = (items, depth = 0, path = '') => {
            items.forEach(item => {
                if (item.items && item.items.length > 0) {
                    const itemPath = path ? `${path} > ${item.title}` : item.title;
                    itemsWithChildren.push({ 
                        id: item.id, 
                        title: item.title,
                        path: itemPath,
                        depth
                    });
                    
                    collectItemsWithChildren(item.items, depth + 1, itemPath);
                }
            });
        };
        
        collectItemsWithChildren(items);
        
        // Add options to selects
        itemsWithChildren.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.path;
            option.style.paddingLeft = `${item.depth * 10}px`;
            
            const targetOption = option.cloneNode(true);
            
            sourceSelect.appendChild(option);
            targetSelect.appendChild(targetOption);
        });
    },

    // Process a matrix based on source and target items - updated to use semicolons and filter type items
    processMatrix(items, sourceItemId, targetItemId, cellValues = "") {
        const sourceItem = this.findItemById(items, sourceItemId);
        const targetItem = this.findItemById(items, targetItemId);
        
        if (!sourceItem?.items || !targetItem?.items) return null;
        
        // Parse cell values if provided - using semicolons now instead of commas
        let validValues = [];
        if (cellValues && cellValues.trim()) {
            validValues = cellValues.split(';').map(v => v.trim()).filter(v => v);
        }
        
        // Build matrix - exclude items with type tags
        const matrix = {
            sourceItem,
            targetItem,
            rows: sourceItem.items
                .filter(item => !item.tags || !item.tags.includes('type::'))
                .map(item => ({ id: item.id, title: item.title, content: item.content })),
            columns: targetItem.items
                .filter(item => !item.tags || !item.tags.includes('type::'))
                .map(item => ({ id: item.id, title: item.title, content: item.content })),
            cellValues: validValues,
            data: {}
        };
        
        // Initialize data
        sourceItem.items
            .filter(item => !item.tags || !item.tags.includes('type::'))
            .forEach(row => {
                if (!matrix.data[row.id]) {
                    matrix.data[row.id] = {};
                }
                
                // Get relations from row to any target column
                const relations = this.getRelationsFromTags(row.tags || '');
                
                targetItem.items
                    .filter(item => !item.tags || !item.tags.includes('type::'))
                    .forEach(col => {
                        // Find if there's a relation to this column
                        const relation = relations.find(rel => rel.target === col.title);
                        matrix.data[row.id][col.id] = relation ? relation.relation : '';
                    });
            });
        
        return matrix;
    },

    // Load matrix into the editor UI
    loadMatrixEditor(matrix) {
        if (!matrix) return;
        
        const container = document.getElementById('matrix-container');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create HTML table
        const table = document.createElement('table');
        table.className = 'table table-bordered';
        
        // Create header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const cornerCell = document.createElement('th');
        
        headerRow.appendChild(cornerCell);
        
        // Add column headers with tooltips for content
        matrix.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.title;
            th.dataset.id = col.id;
            th.dataset.content = col.content || '';
            th.style.cursor = 'help';
            
            // Add mouse events for custom tooltip
            th.addEventListener('mouseenter', (e) => this.showMatrixCellTooltip(e, col));
            th.addEventListener('mouseleave', () => this.hideMatrixCellTooltip());
            
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body rows
        const tbody = document.createElement('tbody');
        
        matrix.rows.forEach(row => {
            const tr = document.createElement('tr');
            
            // Add row header with tooltip
            const rowHeader = document.createElement('th');
            rowHeader.textContent = row.title;
            rowHeader.dataset.id = row.id;
            rowHeader.dataset.content = row.content || '';
            rowHeader.style.cursor = 'help';
            
            // Add mouse events for custom tooltip
            rowHeader.addEventListener('mouseenter', (e) => this.showMatrixCellTooltip(e, row));
            rowHeader.addEventListener('mouseleave', () => this.hideMatrixCellTooltip());
            
            tr.appendChild(rowHeader);
            
            matrix.columns.forEach(col => {
                const td = document.createElement('td');
                td.dataset.row = row.id;
                td.dataset.col = col.id;
                
                // Determine if we use select or input based on cell values
                if (matrix.cellValues && matrix.cellValues.length > 0) {
                    // Create selector with defined values
                    const select = document.createElement('select');
                    select.className = 'form-select form-select-sm';
                    
                    // Empty option
                    const emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = '--';
                    select.appendChild(emptyOption);
                    
                    // Custom cell values
                    matrix.cellValues.forEach(value => {
                        const option = document.createElement('option');
                        option.value = value;
                        option.textContent = value;
                        
                        if (matrix.data[row.id][col.id] === value) {
                            option.selected = true;
                        }
                        
                        select.appendChild(option);
                    });
                    
                    // Event listener for changes
                    select.addEventListener('change', (e) => {
                        matrix.data[row.id][col.id] = e.target.value;
                    });
                    
                    td.appendChild(select);
                } else {
                    // Use a text input field
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'form-control form-control-sm';
                    input.value = matrix.data[row.id][col.id] || '';
                    
                    // Event listener for changes
                    input.addEventListener('input', (e) => {
                        matrix.data[row.id][col.id] = e.target.value;
                    });
                    
                    td.appendChild(input);
                }
                
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
        
        // Store matrix in window for access when saving
        window.currentMatrix = matrix;
    },
    
    // Show tooltip for matrix cells
    showMatrixCellTooltip(event, item) {
        if (!item.content) return;
        
        const tooltip = document.getElementById('matrix-cell-tooltip');
        if (!tooltip) return;
        
        tooltip.innerHTML = `<strong>${item.title}</strong><br>${item.content.substring(0, 300)}${item.content.length > 300 ? '...' : ''}`;
        tooltip.style.display = 'block';
        tooltip.style.left = (event.pageX + 10) + 'px';
        tooltip.style.top = (event.pageY + 10) + 'px';
        
        this.matrixCellTooltip = tooltip;
    },
    
    // Hide tooltip for matrix cells
    hideMatrixCellTooltip() {
        if (this.matrixCellTooltip) {
            this.matrixCellTooltip.style.display = 'none';
        }
    },

    // Save matrix changes back to item tags
    saveMatrixChanges(matrix) {
        if (!matrix || !matrix.sourceItem || !matrix.targetItem) return false;
        
        // Update relations in each source item's tags
        matrix.sourceItem.items
            .filter(item => !item.tags || !item.tags.includes('type::'))
            .forEach(row => {
                if (!row.id || !matrix.data[row.id]) return;
                
                // Start with existing tags
                let tags = row.tags || '';
                
                // Remove any existing relations to target items
                matrix.targetItem.items
                    .filter(item => !item.tags || !item.tags.includes('type::'))
                    .forEach(col => {
                        tags = this.removeRelationFromTags(tags, col.title);
                    });
                
                // Add new relations
                matrix.targetItem.items
                    .filter(item => !item.tags || !item.tags.includes('type::'))
                    .forEach(col => {
                        const relation = matrix.data[row.id][col.id];
                        if (relation) {
                            tags = this.addRelationToTags(tags, relation, col.title);
                        }
                    });
                
                // Update row tags
                row.tags = tags;
            });
        
        return true;
    },

    // Create heatmap visualization for matrix data - improved column labels and rotation
    createHeatmap(container, matrixItem, items) {
        if (!d3 || !container || !matrixItem) return null;
        
        // Clear the container
        container.innerHTML = '';
        
        // Extract source and target items from tags
        const tags = matrixItem.tags ? matrixItem.tags.split(',').map(tag => tag.trim()) : [];
        const sourceItemTag = tags.find(tag => tag.startsWith('source-item::'));
        const targetItemTag = tags.find(tag => tag.startsWith('target-item::'));
        const cellValuesTag = tags.find(tag => tag.startsWith('values::'));
        
        if (!sourceItemTag || !targetItemTag) {
            container.innerHTML = '<div class="alert alert-warning">Invalid matrix configuration: source or target item not specified</div>';
            return null;
        }
        
        // Extract source and target item titles
        const sourceItemTitle = sourceItemTag.split('::')[1];
        const targetItemTitle = targetItemTag.split('::')[1];
        
        // Find source and target items
        const sourceItem = this.findItemByTitle(items, sourceItemTitle);
        const targetItem = this.findItemByTitle(items, targetItemTitle);
        
        if (!sourceItem?.items || !targetItem?.items) {
            container.innerHTML = '<div class="alert alert-warning">Source or target items not found or contain no children</div>';
            return null;
        }
        
        // Create a wrapper div for horizontal scrolling
        const scrollContainer = document.createElement('div');
        scrollContainer.className = 'heatmap-container';
        container.appendChild(scrollContainer);
        
        // Create the heatmap data structure
        const heatmapData = [];
        
        // Get filtered items (exclude type items)
        const sourceItems = sourceItem.items.filter(item => !item.tags || !item.tags.includes('type::'));
        const targetItems = targetItem.items.filter(item => !item.tags || !item.tags.includes('type::'));
        
        // Generate data for heatmap
        sourceItems.forEach(sourceChild => {
            const rowData = {
                row: sourceChild.title,
                values: []
            };
            
            // Get all relations from this source item
            const relations = this.getRelationsFromTags(sourceChild.tags || '');
            
            // For each target item, check if there's a relation
            targetItems.forEach(targetChild => {
                const relation = relations.find(rel => rel.target === targetChild.title);
                
                // Convert relation to a numeric value for the heatmap using the mapping function
                let value = 0;
                if (relation) {
                    value = this.getNumericValueForRelation(relation.relation);
                }
                
                rowData.values.push({
                    value: value,
                    relation: relation ? relation.relation : ''
                });
            });
            
            heatmapData.push(rowData);
        });
        
        // Create columns array for the heatmap
        const columns = targetItems.map(item => item.title);
        
        // Check if we have data
        if (heatmapData.length === 0 || columns.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">No valid data found for heatmap visualization</div>';
            return null;
        }
        
        // Set dimensions for heatmap
        const gridSize = 60;
        const width = Math.max(gridSize * columns.length + 250, 800);
        const height = gridSize * heatmapData.length + 200;
        
        // Create the SVG element
        const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "heatmap-svg");
        
        // Color scale (using blues)
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([0, 9]); // Set domain to match our 9 levels
        
        // Setup margins for better column label placement
        const margin = {top: 150, right: 20, bottom: 20, left: 200};
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        
        // Create a group for the main grid
        const mainGroup = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);
        
        // Create tooltip
        const tooltip = d3.select("#d3-tooltip");
        
        // Add column labels with better rotation
        svg.selectAll(".colLabel")
            .data(columns)
            .join("text")
            .attr("class", "colLabel")
            .attr("x", 0)
            .attr("y", 0)
            .attr("transform", (d, i) => {
                // Calculate center of the column for rotation
                const x = margin.left + i * gridSize + gridSize / 2;
                const y = margin.top - 10; // Position above the grid
                return `translate(${x}, ${y}) rotate(-70)`;
            })
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .style("fill", "#333")
            .text(d => d) // No truncation needed due to rotation
            .append("title") // Add tooltip for full text
            .text(d => d);
        
        // Add row labels
        svg.selectAll(".rowLabel")
            .data(heatmapData)
            .join("text")
            .attr("class", "rowLabel")
            .attr("x", margin.left - 10)
            .attr("y", (d, i) => margin.top + i * gridSize + gridSize / 2)
            .attr("text-anchor", "end")
            .attr("alignment-baseline", "middle")
            .style("font-size", "13px")
            .style("fill", "#333")
            .text(d => d.row.length > 25 ? d.row.substring(0, 23) + '...' : d.row)
            .append("title") // Add tooltip with full text
            .text(d => d.row);
        
        // Create heatmap cells with improved coloring for relationships
        heatmapData.forEach((row, rowIndex) => {
            mainGroup.selectAll(`.cell-${rowIndex}`)
                .data(row.values)
                .join("rect")
                .attr("class", "cell")
                .attr("x", (d, colIndex) => colIndex * gridSize)
                .attr("y", rowIndex * gridSize)
                .attr("width", gridSize)
                .attr("height", gridSize)
                .attr("fill", d => {
                    // Get value to determine color
                    if (d.relation) {
                        // Extract numeric value if available
                        const numericInfo = window.StruMLApp.Utils.extractNumericValueFromRelation(d.relation); // Use global Utils
                        if (numericInfo) {
                            // Determine color based on if it's positive, negative or neutral
                            const value = numericInfo.value;
                            const normalized = Math.min(Math.max(value / 3, 0), 1); // Normalize to 0-1 scale (max value 3)
                            
                            if (numericInfo.isNegative) {
                                // Red gradient for negative values
                                return `rgba(255, 0, 0, ${0.2 + normalized * 0.7})`;
                            } else if (numericInfo.isPositive) {
                                // Green gradient for positive values
                                return `rgba(0, 128, 0, ${0.2 + normalized * 0.7})`;
                            } else {
                                // Blue gradient for neutral values
                                return `rgba(0, 0, 255, ${0.2 + normalized * 0.7})`;
                            }
                        }
                    }
                    // Standard color scale fallback
                    return colorScale(d.value);
                })
                .attr("stroke", "#fff")
                .attr("stroke-width", 1)
        
                .on("mouseover", function(event, d) {
                    // Show tooltip
                    const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
                    const relationLabels = Object.entries(RELATION_TYPES).reduce((acc, [key, val]) => {
                        acc[key] = val.label;
                        return acc;
                    }, {});
                    
                    tooltip.style("opacity", 1)
                        .html(`<strong>Value:</strong> ${d.relation ? relationLabels[d.relation] || d.relation : 'None'}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                        
                    // Highlight cell
                    d3.select(this).attr("stroke", "#333").attr("stroke-width", 2);
                })
                .on("mouseout", function() {
                    // Hide tooltip
                    tooltip.style("opacity", 0);
                    
                    // Restore cell appearance
                    d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
                });
                
            // Add values inside cells
            mainGroup.selectAll(`.value-${rowIndex}`)
                .data(row.values)
                .join("text")
                .attr("x", (d, colIndex) => colIndex * gridSize + gridSize / 2)
                .attr("y", rowIndex * gridSize + gridSize / 2)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .text(d => d.value === 0 ? "" : d.value)  // Show the actual value, not just "1"
                .style("font-size", "14px")
                .style("fill", d => d.value > 4 ? "#fff" : "#000")  // White text for darker cells
                .style("pointer-events", "none");  // Ensure text doesn't interfere with mouse events
        });
        
        // Append the SVG to the container
        scrollContainer.appendChild(svg.node());
        
        return svg.node();
    },

    // Create Sankey diagram from matrix data
    createSankeyDiagram(container, matrixItem, items) {
        if (!d3 || !container || !matrixItem) return null;

        // Clear the container
        container.innerHTML = '';

        // Extract source and target items from tags
        const tags = matrixItem.tags ? matrixItem.tags.split(',').map(tag => tag.trim()) : [];
        const sourceItemTag = tags.find(tag => tag.startsWith('source-item::'));
        const targetItemTag = tags.find(tag => tag.startsWith('target-item::'));

        if (!sourceItemTag || !targetItemTag) {
            container.innerHTML = '<div class="alert alert-warning">Invalid matrix configuration: source or target item not specified</div>';
            return null;
        }

        // Extract source and target item titles
        const sourceItemTitle = sourceItemTag.split('::')[1];
        const targetItemTitle = targetItemTag.split('::')[1];

        // Find source and target items
        const sourceItem = this.findItemByTitle(items, sourceItemTitle);
        const targetItem = this.findItemByTitle(items, targetItemTitle);

        if (!sourceItem?.items || !targetItem?.items) {
            container.innerHTML = '<div class="alert alert-warning">Source or target items not found or contain no children</div>';
            return null;
        }

        // Filter out items with type tags
        const filteredSourceItems = sourceItem.items.filter(item => !item.tags || !item.tags.includes('type::'));
        const filteredTargetItems = targetItem.items.filter(item => !item.tags || !item.tags.includes('type::'));

        // Create SVG element for the Sankey diagram
        const width = Math.max(800, container.clientWidth);
        const height = 500;

        const svg = d3.create("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("class", "sankey-svg");

        // Create tooltip
        const tooltip = d3.select("#d3-tooltip");

        // Prepare Sankey diagram data
        const nodes = [];
        const links = [];

        // Add source nodes
        filteredSourceItems.forEach((item) => {
            nodes.push({ name: item.title });
        });

        // Add target nodes (offset by source item count)
        const sourceOffset = filteredSourceItems.length;
        filteredTargetItems.forEach((item) => {
            nodes.push({ name: item.title });
        });

        // Create links from the matrix data
        filteredSourceItems.forEach((sourceChild, sourceIndex) => {
            // Get all relations from this source item's tags
            const relations = this.getRelationsFromTags(sourceChild.tags || '');
            
            filteredTargetItems.forEach((targetChild, targetIndex) => {
                // Look for relations to this target
                const relation = relations.find(rel => rel.target === targetChild.title);
                if (relation && relation.relation) {
                    // Get value based on relation type using the mapping function
                    const value = this.getNumericValueForRelation(relation.relation);
                    
                    // Check if the relation has a numeric value in parentheses
                    const relationColor = this.getColorForRelation(relation.relation);
                    
                    links.push({
                        source: sourceIndex,
                        target: sourceOffset + targetIndex,
                        value: value,
                        type: relation.relation,
                        relationValue: value, // Store the actual value
                        relationColor: relationColor // Store the color if available
                    });
                }
            });
        });

        // Check if we have valid data
        if (nodes.length === 0 || links.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">No relationships found between source and target items</div>';
            return null;
        }

        // Create the Sankey diagram
        const sankey = d3.sankey()
            .nodeWidth(30)
            .nodePadding(20)
            .extent([[20, 20], [width - 20, height - 20]]);

        // Generate the Sankey layout
        const graph = sankey({
            nodes: nodes.map(d => Object.assign({}, d)),
            links: links.map(d => Object.assign({}, d))
        });

        // Add links
        svg.append("g")
            .selectAll("path")
            .data(graph.links)
            .join("path")
            .attr("class", "sankey-link")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", d => {
                // If we have a dynamic relation color, use it
                if (d.relationColor) {
                    return d.relationColor;
                }
                
                // Otherwise, fall back to standard colors based on relation type
                if (d.type === 'extremely-high') return "#006E00";
                if (d.type === 'very-high') return "#17A217";
                if (d.type === 'high') return "#2CBA00";
                if (d.type === 'slightly-high') return "#64DC00";
                if (d.type === 'neutral') return "#808080";
                if (d.type === 'slightly-low') return "#FFC800";
                if (d.type === 'low') return "#FF9600";
                if (d.type === 'very-low') return "#FF6400";
                if (d.type === 'extremely-low') return "#FF0000";
                return "#6c757d"; // Default gray
            })

            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("fill", "none")
            .attr("stroke-opacity", 0.5)
            .on("mouseover", function(event, d) {
                // Show link info on hover with the actual relation value
                d3.select(this).attr("stroke-opacity", 0.8);
                tooltip.style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`<strong>${d.source.name}</strong> >> <strong>${d.target.name}</strong><br/>
                        ${d.type} (Value: ${d.relationValue})`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("stroke-opacity", 0.5);
                tooltip.style("opacity", 0);
            });

        // Add nodes
        const node = svg.append("g")
            .selectAll("g")
            .data(graph.nodes)
            .join("g")
            .attr("class", "sankey-node");

        // Add node rectangles
        node.append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("height", d => d.y1 - d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("fill", (d, i) => d3.schemeCategory10[i % 10])
            .attr("fill-opacity", 0.8)
            .attr("stroke", "#555")
            .on("mouseover", function(event, d) {
                // Highlight node on hover
                d3.select(this).attr("fill-opacity", 1);
                tooltip.style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`<strong>${d.name}</strong>`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill-opacity", 0.8);
                tooltip.style("opacity", 0);
            });

        // Add node labels
        node.append("text")
            .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr("y", d => (d.y1 + d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
            .text(d => d.name)
            .style("font-size", "12px")
            .style("font-weight", "bold");

        // Append the SVG to the container
        container.appendChild(svg.node());

        return svg.node();
    }
};
