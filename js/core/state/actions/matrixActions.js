/**
 * Matrix Actions
 * Contains actions related to matrix functionality
 */

import { showAlert } from '../../../core/utils.js';
import { findItemById, findItemByTitle } from '../../../components/item/ItemUtils.js';
import { processMatrix, loadMatrixEditor, saveMatrixChanges } from '../../../components/matrix/MatrixUtils.js';
import { populateItemSelectors } from '../../../components/navigation/NavigationUtils.js';

/**
 * Open matrix editor in a modal
 * @param {Object} matrixItem - Matrix item to edit (optional)
 * @param {Array} items - Current items array
 * @param {Function} setItems - State setter for items
 * @param {Function} updateItem - Function to update an item
 */
export const openMatrixEditor = (matrixItem, items, setItems, updateItem) => {
    if (items.length === 0) {
        showAlert("No items to create matrix with", "warning");
        return;
    }

    const modalElement = document.getElementById('matrix-editor-modal');
    if (!modalElement) return;
    const modal = new bootstrap.Modal(modalElement);
    
    // Populate source and target selectors
    populateItemSelectors(items);
    
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
            const sourceItem = findItemByTitle(items, sourceItemTitle);
            const targetItem = findItemByTitle(items, targetItemTitle);
            
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
                const matrix = processMatrix(items, sourceItem.id, targetItem.id, cellValues);
                
                if (matrix) {
                    loadMatrixEditor(matrix);
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
                showAlert("Please select both source and target items", "warning");
                return;
            }
            
            const matrix = processMatrix(items, sourceId, targetId, cellValues);
            if (!matrix) {
                showAlert("Could not build matrix with selected items", "warning");
                return;
            }
            
            loadMatrixEditor(matrix);
        };
    }
    
    // Save matrix button handler
    const saveBtn = document.getElementById('save-matrix-btn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            if (!window.currentMatrix) {
                showAlert("No matrix data to save", "warning");
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
            
            const success = saveMatrixChanges(window.currentMatrix);
            if (success) {
                showAlert("Matrix saved successfully", "success");
                // Update the state to trigger UI refresh
                setItems([...items]);
                modal.hide();
            } else {
                showAlert("Failed to save matrix", "danger");
            }
        };
    }
    
    modal.show();
};

/**
 * Handle chat JSON display
 * @param {Object} jsonItemData - JSON data to display
 * @param {Object} targetItem - Target item
 * @param {Function} updateItem - Function to update an item
 * @param {Function} addItem - Function to add an item
 */
export const handleChatJsonDisplay = (jsonItemData, targetItem, updateItem, addItem) => {
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
                    ${renderMarkdown(jsonItemData.content)}
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
                showAlert(`Content added to "${targetItem.title}"`, "success");
            } catch (error) {
                console.error("Error appending content:", error);
                showAlert("Error adding content", "danger");
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
                        id: generateItemId(),
                        title: subitemData.title,
                        content: subitemData.content || '',
                        tags: subitemData.tags || '',
                        items: subitemData.items || []
                    };
                    
                    // Add it as a child of the current item
                    addItem(newItem, targetItem.id);
                    showAlert(`Sub-item "${newItem.title}" added`, "success");
                    
                    // Disable the button after adding
                    btn.disabled = true;
                    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Added';
                }
            } catch (error) {
                console.error("Error adding sub-item:", error);
                showAlert("Error adding sub-item", "danger");
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
                            id: generateItemId(),
                            title: subitemData.title,
                            content: subitemData.content || '',
                            tags: subitemData.tags || '',
                            items: subitemData.items || []
                        };
                        
                        // Add it as a child of the current item
                        addItem(newItem, targetItem.id);
                        addedCount++;
                    });
                    
                    showAlert(`${addedCount} sub-items added to "${targetItem.title}"`, "success");
                    
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
                showAlert("Error adding sub-items", "danger");
            }
        });
    }
    
    // Scroll chat to bottom to show the new content
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

// Import missing functions from utils.js
import { generateItemId, renderMarkdown } from '../../../core/utils.js';