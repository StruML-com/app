/**
 * Chat UI
 * Handles chat user interface interactions
 */

import { showAlert } from '../../core/utils.js';

/**
 * Chat UI class
 */
export class ChatUI {
    /**
     * Constructor
     * @param {Object} appContext - Application context
     * @param {Object} chatService - Chat service instance
     */
    constructor(appContext, chatService) {
        this.appContext = appContext;
        this.chatService = chatService;
        
        // UI elements
        this.chatInput = null;
        this.chatSendBtn = null;
        this.queryTypeSelector = null;
        this.customQuestionContainer = null;
        this.presetButtonsContainer = null;
        this.executePresetBtn = null;
    }
    
    /**
     * Initialize chat UI
     */
    init() {
        // Get UI elements
        this.chatInput = document.getElementById('chat-input');
        this.chatSendBtn = document.getElementById('chat-send-btn');
        this.queryTypeSelector = document.getElementById('chat-query-type');
        this.customQuestionContainer = document.getElementById('custom-question-container');
        this.presetButtonsContainer = document.getElementById('preset-buttons-container');
        this.executePresetBtn = document.getElementById('execute-preset-btn');
        
        // Set up event handlers
        this.setupQueryTypeSelector();
        this.setupSendButton();
        this.setupInputKeypress();
        this.setupPresetButton();
    }
    
    /**
     * Set up query type selector
     */
    setupQueryTypeSelector() {
        if (!this.queryTypeSelector) return;
        
        // Helper function to update visibility
        const updateVisibility = (selectedValue) => {
            if (selectedValue === 'custom request') {
                this.customQuestionContainer?.classList.remove('d-none');
                this.presetButtonsContainer?.classList.add('d-none');
                setTimeout(() => this.chatInput?.focus(), 50);
            } else {
                this.customQuestionContainer?.classList.add('d-none');
                this.presetButtonsContainer?.classList.remove('d-none');
            }
        };
        
        // Set initial state based on the default selected value
        updateVisibility(this.queryTypeSelector.value);
        
        // Add event listener for changes
        this.queryTypeSelector.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            updateVisibility(selectedValue);
        });
    }
    
    /**
     * Set up send button
     */
    setupSendButton() {
        if (!this.chatSendBtn || !this.chatInput) return;
        
        this.chatSendBtn.addEventListener('click', () => {
            const message = this.chatInput.value.trim();
            if (message) {
                this.sendMessage(message);
            }
        });
    }
    
    /**
     * Set up input keypress
     */
    setupInputKeypress() {
        if (!this.chatInput) return;
        
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = this.chatInput.value.trim();
                if (message) {
                    this.sendMessage(message);
                }
            }
        });
    }
    
    /**
     * Set up preset button
     */
    setupPresetButton() {
        if (!this.executePresetBtn || !this.queryTypeSelector) return;
        
        this.executePresetBtn.addEventListener('click', () => {
            const selectedType = this.queryTypeSelector.value;
            
            if (selectedType && selectedType !== 'custom request') {
                const message = `Execute ${selectedType}`;
                this.sendMessage(message);
            }
        });
    }
    
    /**
     * Send a message
     * @param {string} message - Message to send
     */
    async sendMessage(message) {
        // Check context before sending
        if (!this.appContext) {
            showAlert("Error: Application context is missing.", "danger");
            return;
        }
        
        const currentItemId = this.appContext.currentItemId;
        if (!currentItemId) {
            showAlert("⚠️ Please select an item first.", "warning");
            this.appContext.setChatMessages(prev => [...prev, {
                text: "⚠️ Please select an item in the main document view first to provide context for your message.",
                sender: 'chatbot'
            }]);
            this.appContext.updateChatDisplay?.();
            return;
        }
        
        // Send the message
        const success = await this.chatService.sendMessage(message);
        
        if (success) {
            // Clear input
            this.chatInput.value = '';
        }
    }
    
    /**
     * Update chat display
     */
    updateDisplay() {
        const chatMessagesContainer = document.getElementById('chat-messages');
        if (!chatMessagesContainer || !this.appContext.chatMessages) {
            console.error("Chat messages container not found or no messages");
            return;
        }
        
        // Clear the container
        chatMessagesContainer.innerHTML = '';
        
        // Add each message with proper sanitization
        this.appContext.chatMessages.forEach((msg, index) => {
            const messageElement = document.createElement('div');
            messageElement.className = `${msg.sender === 'user' ? 'alert alert-secondary' : 'alert alert-primary'} mb-2`;
            messageElement.dataset.messageIndex = index;
            
            // Sanitize and render markdown
            const safeHTML = DOMPurify.sanitize(this.appContext.renderMarkdown(msg.text), {
                USE_PROFILES: { html: true },
                ADD_ATTR: ['target', 'rel']
            });
            
            messageElement.innerHTML = safeHTML;
            chatMessagesContainer.appendChild(messageElement);
            
            // If this message has JSON data, display it
            if (msg.sender === 'chatbot' && msg.jsonData) {
                this.displayJsonData(msg.jsonData, messageElement);
            }
        });
        
        // Scroll to the bottom
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
    
    /**
     * Display JSON data in chat
     * @param {Object} jsonData - JSON data to display
     * @param {HTMLElement} messageElement - Message element to append to
     */
    displayJsonData(jsonData, messageElement) {
        if (!jsonData || !messageElement) return;
        
        // Create the JSON preview element
        const jsonPreviewElement = document.createElement('div');
        jsonPreviewElement.className = 'json-item-preview mt-1 border rounded p-1';
        
        // Create a styled representation of the JSON item that matches document style
        let previewHtml = `
            <div class="json-item-header d-flex justify-content-between align-items-center mb-2">
                <h5 class="m-0">${jsonData.title || 'Unnamed Item'}</h5>
                ${jsonData.tags ? `
                    <div class="item-tags">
                        ${jsonData.tags.split(',').map(tag => 
                            `<span class="item-tag">${tag.trim()}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // Handle item content if available
        if (jsonData.content) {
            previewHtml += `
                <div class="json-item-content mb-3">
                    <div class="markdown-content">
                        ${this.appContext.renderMarkdown(jsonData.content)}
                    </div>
                    <button class="btn btn-sm btn-outline-primary mt-2 append-content-btn" data-content="${
                        encodeURIComponent(jsonData.content)
                    }">
                        <i class="bi bi-plus-circle me-1"></i> Add this content to current item
                    </button>
                </div>
            `;
        }
        
        // Handle sub-items if available
        if (jsonData.items && jsonData.items.length > 0) {
            previewHtml += `
                <div class="json-item-subitems">
                    <h6 class="mb-2">Available sub-items:</h6>
                    <div class="list-group">
            `;
            
            // Add each sub-item with a similar style to document items
            jsonData.items.forEach((subitem, index) => {
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
        
        // Append the preview element to the message
        messageElement.appendChild(jsonPreviewElement);
        
        // Add event handlers for the buttons
        this.setupJsonPreviewButtons(jsonPreviewElement, jsonData);
    }
    
    /**
     * Set up JSON preview buttons
     * @param {HTMLElement} jsonPreviewElement - JSON preview element
     * @param {Object} jsonData - JSON data
     */
    setupJsonPreviewButtons(jsonPreviewElement, jsonData) {
        if (!jsonPreviewElement || !jsonData) return;
        
        // Get current item
        const currentItem = this.appContext.findItemById(this.appContext.items, this.appContext.currentItemId);
        if (!currentItem) return;
        
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
                    const updatedItem = { ...currentItem };
                    updatedItem.content = currentItem.content 
                        ? `${currentItem.content}\n\n${formattedContent}`
                        : formattedContent;
                    
                    // Update the item
                    this.appContext.updateItem(updatedItem);
                    showAlert(`Content added to "${currentItem.title}"`, "success");
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
                    const subitemData = jsonData.items[index];
                    
                    if (subitemData) {
                        // Create a new item with the sub-item data
                        const newItem = {
                            title: subitemData.title,
                            content: subitemData.content || '',
                            tags: subitemData.tags || '',
                            items: subitemData.items || []
                        };
                        
                        // Add it as a child of the current item
                        this.appContext.addItem(newItem, currentItem.id);
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
                    if (jsonData.items && jsonData.items.length > 0) {
                        let addedCount = 0;
                        
                        jsonData.items.forEach(subitemData => {
                            // Create a new item for each sub-item
                            const newItem = {
                                title: subitemData.title,
                                content: subitemData.content || '',
                                tags: subitemData.tags || '',
                                items: subitemData.items || []
                            };
                            
                            // Add it as a child of the current item
                            this.appContext.addItem(newItem, currentItem.id);
                            addedCount++;
                        });
                        
                        showAlert(`${addedCount} sub-items added to "${currentItem.title}"`, "success");
                        
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
    }
}