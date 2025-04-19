/**
 * Relation utility functions
 * Contains utility functions specific to relation handling
 */

import { findItemById, findItemByTitle } from '../../components/item/ItemUtils.js';

// Custom value mapping for relation names
export const customValueMapping = {
    'max': 9,
    'very high': 8,
    'high': 7,
    'slightly high': 6,
    'neutral': 5,
    'slightly low': 4,
    'low': 3,
    'very low': 2,
    'min': 1
};

// Extract numeric value from relation names with number in parentheses
// Example: "high (8)" or "good (+5)" or "bad (-3)"
export function extractNumericValueFromRelation(relation) {
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
}

// Get color for relation based on numeric value
export function getColorForRelation(relation) {
    const extracted = extractNumericValueFromRelation(relation);
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
}

// Get CSS class for relation based on numeric value
export function getRelationColorClass(relation) {
    const extracted = extractNumericValueFromRelation(relation);
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
}

// Function to convert any relation value to numeric value
export function getNumericValueForRelation(relation) {
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
    if (customValueMapping[normalizedRelation] !== undefined) {
        return customValueMapping[normalizedRelation];
    }
    
    // For other values, try to convert to a number or use 1 as fallback
    const numericValue = parseInt(relation);
    return !isNaN(numericValue) ? Math.min(Math.max(numericValue, 1), 9) : 1;
}

// Get relations from tags
export function getRelationsFromTags(tags) {
    if (!tags) return [];
    
    return tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.includes('>>'))
        .map(tag => {
            const [relation, target] = tag.split('>>').map(part => part.trim());
            return { 
                relation, 
                target,
                original: tag
            };
        });
}

// Check if a tag is a relation tag
export function isRelationTag(tag) {
    return tag && tag.includes('>>');
}

// Add relation to tags
export function addRelationToTags(tags, relation, target) {
    if (!relation || !target) return tags || '';
    
    // Normalize inputs
    const normalizedRelation = relation.trim();
    const normalizedTarget = target.trim();
    
    // Create relation tag
    const relationTag = `${normalizedRelation}>>${normalizedTarget}`;
    
    // If no existing tags, just return the relation tag
    if (!tags) return relationTag;
    
    // Check if this relation to this target already exists
    const existingTags = tags.split(',').map(tag => tag.trim());
    const existingRelationIndex = existingTags.findIndex(tag => 
        tag.includes('>>') && tag.split('>>')[1].trim() === normalizedTarget
    );
    
    // If relation to this target exists, replace it
    if (existingRelationIndex >= 0) {
        existingTags[existingRelationIndex] = relationTag;
        return existingTags.join(', ');
    }
    
    // Otherwise, add the new relation tag
    return tags + ', ' + relationTag;
}

// Remove relation from tags
export function removeRelationFromTags(tags, target) {
    if (!tags || !target) return tags || '';
    
    // Normalize target
    const normalizedTarget = target.trim();
    
    // Split tags and filter out the relation to the specified target
    const filteredTags = tags.split(',')
        .map(tag => tag.trim())
        .filter(tag => {
            if (!tag.includes('>>')) return true;
            
            const relationTarget = tag.split('>>')[1].trim();
            return relationTarget !== normalizedTarget;
        });
    
    return filteredTags.join(', ');
}

// Update relation references when an item title changes
export function updateRelationReferences(items, oldTitle, newTitle) {
    if (!items || !Array.isArray(items) || !oldTitle || !newTitle || oldTitle === newTitle) {
        return 0;
    }
    
    let updateCount = 0;
    
    const updateItemRelations = (item) => {
        if (!item || !item.tags) return;
        
        // Check if this item has relations to the renamed item
        const relations = getRelationsFromTags(item.tags);
        let updated = false;
        
        for (const relation of relations) {
            if (relation.target === oldTitle) {
                // Update the relation target
                const oldTag = `${relation.relation}>>${oldTitle}`;
                const newTag = `${relation.relation}>>${newTitle}`;
                
                // Replace the old tag with the new one
                item.tags = item.tags.replace(oldTag, newTag);
                updated = true;
                updateCount++;
            }
        }
        
        // Process children recursively
        if (item.items && item.items.length > 0) {
            item.items.forEach(updateItemRelations);
        }
    };
    
    // Process all items
    items.forEach(updateItemRelations);
    
    return updateCount;
}

// Render relation tags as HTML
export function renderRelationTags(relations) {
    if (!relations || !relations.length) {
        return '<div class="alert alert-info">No relations defined</div>';
    }
    
    // Access RELATION_TYPES from the global namespace
    const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
    
    let html = '';
    
    relations.forEach(rel => {
        const relType = rel.relation.toLowerCase();
        const relInfo = RELATION_TYPES[relType] || { 
            icon: 'bi-link', 
            label: rel.relation,
            level: ''
        };
        
        const colorClass = getRelationColorClass(rel.relation) || '';
        
        html += `
            <span class="relation-tag ${colorClass}" data-relation="${rel.original}">
                <i class="bi ${relInfo.icon}"></i>
                <span class="relation-label">${relInfo.label}</span>
                <span class="relation-target">${rel.target}</span>
                <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-1" title="Remove relation">
                    <i class="bi bi-x-circle"></i>
                </button>
            </span>
        `;
    });
    
    return html;
}

// Update related items in the info panel
export function updateRelatedItems(items, currentItem) {
    if (!currentItem) return;
    
    const relatedItemsList = document.getElementById('related-items-list');
    if (!relatedItemsList) return;
    
    // Clear the list
    relatedItemsList.innerHTML = '';
    
    // Find all items that have relations to the current item
    const targetRelations = [];
    
    // Function to find items with relations to the current item
    const findTargetRelations = (items) => {
        if (!items || !Array.isArray(items)) return;
        
        items.forEach(item => {
            if (item.tags) {
                const relations = getRelationsFromTags(item.tags);
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
    
    // Get outgoing relations from the current item
    const outgoingRelations = getRelationsFromTags(currentItem.tags);
    
    // If no relations in either direction, show a message
    if (targetRelations.length === 0 && outgoingRelations.length === 0) {
        relatedItemsList.innerHTML = '<div class="alert alert-info">No related items found</div>';
        return;
    }
    
    // Add incoming relations section if there are any
    if (targetRelations.length > 0) {
        const incomingHeader = document.createElement('div');
        incomingHeader.className = 'relation-section-title';
        incomingHeader.textContent = 'Incoming Relations';
        relatedItemsList.appendChild(incomingHeader);
        
        targetRelations.forEach(rel => {
            const listItem = document.createElement('a');
            listItem.href = `#${rel.sourceItem.id}`;
            listItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            
            // Access RELATION_TYPES from the global namespace
            const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
            const relType = rel.relation.toLowerCase();
            const relInfo = RELATION_TYPES[relType] || { 
                icon: 'bi-link', 
                label: rel.relation,
                level: ''
            };
            
            const colorClass = getRelationColorClass(rel.relation) || '';
            
            listItem.innerHTML = `
                <div>
                    <span class="fw-bold">${rel.sourceItem.title}</span>
                </div>
                <span class="relation-tag ${colorClass}">
                    <i class="bi ${relInfo.icon}"></i>
                    <span class="relation-label">${relInfo.label}</span>
                </span>
            `;
            
            relatedItemsList.appendChild(listItem);
        });
    }
    
    // Add outgoing relations section if there are any
    if (outgoingRelations.length > 0) {
        const outgoingHeader = document.createElement('div');
        outgoingHeader.className = 'relation-section-title mt-3';
        outgoingHeader.textContent = 'Outgoing Relations';
        relatedItemsList.appendChild(outgoingHeader);
        
        outgoingRelations.forEach(rel => {
            const targetItem = findItemByTitle(items, rel.target);
            
            const listItem = document.createElement('a');
            listItem.href = targetItem ? `#${targetItem.id}` : '#';
            listItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            
            // Access RELATION_TYPES from the global namespace
            const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
            const relType = rel.relation.toLowerCase();
            const relInfo = RELATION_TYPES[relType] || { 
                icon: 'bi-link', 
                label: rel.relation,
                level: ''
            };
            
            const colorClass = getRelationColorClass(rel.relation) || '';
            
            listItem.innerHTML = `
                <div>
                    <span class="fw-bold">${rel.target}</span>
                </div>
                <span class="relation-tag ${colorClass}">
                    <i class="bi ${relInfo.icon}"></i>
                    <span class="relation-label">${relInfo.label}</span>
                </span>
            `;
            
            relatedItemsList.appendChild(listItem);
        });
    }
}