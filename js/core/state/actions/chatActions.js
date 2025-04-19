/**
 * Chat Actions
 * Contains actions related to chat functionality
 */

import { findItemById } from '../../../components/item/ItemUtils.js';
import { renderMarkdown } from '../../../core/utils.js';

/**
 * Update chat display with support for JSON data
 * @param {Array} chatMessages - Chat messages array
 * @param {Array} items - Current items array
 * @param {string} currentItemId - Current item ID
 * @param {Function} handleChatJsonDisplayRef - Reference to JSON display handler
 */
export const updateChatDisplay = (chatMessages, items, currentItemId, handleChatJsonDisplayRef) => {
    const chatMessagesContainer = document.getElementById('chat-messages');
    if (!chatMessagesContainer) {
        console.error("Chat messages container not found");
        return;
    }
    
    // Clear the container
    chatMessagesContainer.innerHTML = '';
    
    // Add each message with proper sanitization
    chatMessages.forEach((msg, index) => {
        const messageElement = document.createElement('div');
        messageElement.className = `${msg.sender === 'user' ? 'alert alert-secondary' : 'alert alert-primary'} mb-2`;
        messageElement.dataset.messageIndex = index;
        
        // Sanitize and render markdown
        const safeHTML = DOMPurify.sanitize(renderMarkdown(msg.text), {
            USE_PROFILES: { html: true },
            ADD_ATTR: ['target', 'rel']
        });
        
        messageElement.innerHTML = safeHTML;
        chatMessagesContainer.appendChild(messageElement);
        
        // If this message has JSON data, recreate the JSON preview using the ref
        if (msg.sender === 'chatbot' && msg.jsonData && handleChatJsonDisplayRef.current) {
            // Find the current item based on currentItemId
            const currentItem = findItemById(items, currentItemId);
            if (currentItem) {
                setTimeout(() => {
                    try {
                        handleChatJsonDisplayRef.current(msg.jsonData, currentItem);
                    } catch (err) {
                        console.error("Error displaying JSON:", err);
                    }
                }, 10); // Small timeout to ensure DOM is ready
            } else {
                console.error("Current item not found for JSON display");
            }
        }
    });
    
    // Scroll to the bottom
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
};

/**
 * Send message to AI Assistant
 * @param {string} message - Message to send
 * @param {string} currentItemId - Current item ID
 * @param {Array} items - Current items array
 * @param {Function} setChatMessages - State setter for chat messages
 * @param {Function} updateChatDisplay - Function to update chat display
 * @param {Function} processSuggestedItems - Function to process suggested items
 * @param {Object} sampleData - Sample data
 * @param {Function} fetchMarkdownContent - Function to fetch markdown content
 * @param {string} markdownContent - Current markdown content
 * @param {Function} handleChatJsonDisplayRef - Reference to JSON display handler
 * @returns {Promise<void>} - Promise that resolves when the message is sent
 */
export const sendChatMessage = async (
    message,
    currentItemId,
    items,
    setChatMessages,
    updateChatDisplay,
    processSuggestedItems,
    sampleData,
    fetchMarkdownContent,
    markdownContent,
    handleChatJsonDisplayRef
) => {
    if (!message.trim()) return;

    const chatLoading = document.getElementById('chat-loading');
    if (chatLoading) {
        chatLoading.classList.remove('d-none');
    }

    setChatMessages(prev => [...prev, { text: message, sender: 'user' }]);

    // Check current item context before sending
    if (!currentItemId) {
        console.error("Send failed: No current item selected.");
        setChatMessages(prev => [...prev, {
            text: "⚠️ Please select an item in the main document view first to provide context for your message.",
            sender: 'chatbot'
        }]);
        updateChatDisplay();
        if (chatLoading) {
            chatLoading.classList.add('d-none');
        }
        return;
    }

    try {
        // Get the request type from the selector
        const queryTypeSelector = document.getElementById('chat-query-type');
        const requestType = queryTypeSelector ? queryTypeSelector.value : 'custom request';

        const currentItem = findItemById(items, currentItemId);

        if (!currentItem) {
            console.error(`Send failed: Could not find item with ID: ${currentItemId}`);
            setChatMessages(prev => [...prev, {
                text: `⚠️ Error: Could not find the selected item (ID: ${currentItemId}). Please try selecting it again.`,
                sender: 'chatbot'
            }]);
            updateChatDisplay();
            if (chatLoading) {
                chatLoading.classList.add('d-none');
            }
            return;
        }

        // Ensure we have the markdown content - fetch it if needed
        let mdDescription = markdownContent;
        if (!mdDescription && currentItem.title) {
            try {
                mdDescription = await fetchMarkdownContent(currentItem.title);
            } catch (err) {
                mdDescription = "";
            }
        }

        // Find matching sample item from cached data
        let sampleItem = null;
        if (sampleData && sampleData.items) {
            const findMatchingItem = (items, targetTitle) => {
                if (!items || !Array.isArray(items)) return null;
                
                for (const item of items) {
                    if (item.title && item.title.toLowerCase() === targetTitle.toLowerCase()) {
                        return item;
                    }
                    
                    if (item.items && item.items.length > 0) {
                        const found = findMatchingItem(item.items, targetTitle);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            sampleItem = findMatchingItem(sampleData.items, currentItem.title);
        }

        // Prepare request payload with ensured markdown description and sample item
        const WEBHOOK_URL = window.StruMLApp.Constants?.WEBHOOK_URL;
        if (!WEBHOOK_URL) {
            throw new Error("Webhook URL is not configured.");
        }

        const requestData = {
            requestType: requestType,
            message: message,
            sessionId: window.chatSessionId || generateItemId(),
            context: {
                currentItem: {
                    id: currentItem.id,
                    title: currentItem.title,
                    content: currentItem.content || "",
                    tags: currentItem.tags || ""
                },
                markdownDescription: mdDescription || "", 
                documentStructure: items,
                sampleItem: sampleItem 
            }
        };

        // Send request to webhook
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        if (!response.ok) {
            let errorBody = `HTTP error! Status: ${response.status}`;
            try {
                const errorJson = await response.json();
                errorBody += ` - ${JSON.stringify(errorJson)}`;
            } catch (e) {
                // Ignore if response body is not JSON
            }
            throw new Error(errorBody);
        }

        // Process the response 
        const responseData = await response.json();

        // Process suggested items if available
        if (responseData && responseData.suggestedItems &&
            responseData.suggestedItems.items &&
            Array.isArray(responseData.suggestedItems.items)) {
            processSuggestedItems(responseData.suggestedItems.items, currentItem);
        }

        if (responseData) {
            let responseMessage = "";
            let jsonItemData = null;
            
            // Extract message content from various response formats
            if (responseData.json && responseData.json.message) {
                responseMessage = responseData.json.message;
            } else if (responseData.message) {
                responseMessage = responseData.message;
            } else if (responseData.text) {
                responseMessage = responseData.text;
            } else if (typeof responseData === 'string') {
                responseMessage = responseData;
            } else if (Array.isArray(responseData) && responseData[0] && responseData[0].message) {
                responseMessage = responseData[0].message;
            } else if (Array.isArray(responseData) && responseData[0] && responseData[0].json && responseData[0].json.message) {
                responseMessage = responseData[0].json.message;
            } else {
                responseMessage = "Received response from AI but couldn't parse the message properly.";
            }

            // Check if the response contains JSON data within markdown code blocks
            const jsonMatch = responseMessage.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                try {
                    // Extract and parse the JSON
                    jsonItemData = JSON.parse(jsonMatch[1].trim());
                    
                    // Create a formatted message without the JSON code block
                    const textBeforeJson = responseMessage.substring(0, jsonMatch.index).trim();
                    const textAfterJson = responseMessage.substring(jsonMatch.index + jsonMatch[0].length).trim();
                    
                    // Keep any text that was before or after the JSON block
                    responseMessage = [
                        textBeforeJson,
                        "📋 AI-generated suggestion (see action buttons below)",
                        textAfterJson
                    ].filter(part => part).join("\n\n");
                } catch (err) {
                    console.error("Error parsing JSON from response:", err);
                    // Keep the original message if parsing fails
                }
            }

            // Add the message to chat history
            setChatMessages(prev => {
                const updatedMessages = [...prev, {
                    text: responseMessage,
                    sender: 'chatbot',
                    jsonData: jsonItemData, // Store the JSON data with the message
                    timestamp: Date.now() // Add timestamp to ensure state change detection
                }];
                
                return updatedMessages;
            });

            
            // Ensure we update the chat display IMMEDIATELY after receiving a response
            setTimeout(() => {
                // First, update the chat UI to show the message
                updateChatDisplay();
                
                // Then, after the message is visible, process any JSON data if present
                if (handleChatJsonDisplayRef.current && jsonItemData && currentItem) {
                    handleChatJsonDisplayRef.current(jsonItemData, currentItem);
                } else if (jsonItemData) {
                    console.warn("JSON data present but couldn't be displayed:", {
                        refExists: !!handleChatJsonDisplayRef.current,
                        jsonData: !!jsonItemData,
                        itemExists: !!currentItem
                    });
                }
            }, 50); // Reduced timeout for more immediate response
        }
    } catch (error) {
        console.error("Error in chat communication:", error);
        setChatMessages(prev => [...prev, {
            text: `Error communicating with AI: ${error.message}`,
            sender: 'chatbot'
        }]);
    } finally {
        if (chatLoading) {
            chatLoading.classList.add('d-none');
        }
        updateChatDisplay(); // Ensure the UI is updated
    }
};

/**
 * Process suggested items from chat
 * @param {Array} suggestedItemsArray - Array of suggested items
 * @param {Object} currentItem - Current item
 * @param {Function} addItem - Function to add an item
 */
export const processSuggestedItems = (suggestedItemsArray, currentItem, addItem) => {
    // We'll keep this function but simplify it as it may be called from elsewhere
    if (!Array.isArray(suggestedItemsArray) || !currentItem || !suggestedItemsArray.length) {
        return;
    }
    
    try {
        // We'll only process the items to directly add them without showing suggestions UI
        suggestedItemsArray
            .filter(item => item && (item.name || item.title))
            .forEach(item => {
                const newItem = {
                    id: generateItemId(),
                    title: item.name || item.title || 'Unnamed Item',
                    content: item.content || '',
                    tags: item.tags || '',
                    items: []
                };
                
                // Add directly as child of current item
                addItem(newItem, currentItem.id);
            });
        
        if (suggestedItemsArray.length > 0) {
            showAlert(`Added ${suggestedItemsArray.length} new items to "${currentItem.title}"`, "success");
        }
    } catch (error) {
        console.error("Error processing suggested items:", error);
    }
};

/**
 * Fetch markdown content for info panel
 * @param {string} itemTitle - Title of the item
 * @param {Function} setMarkdownContent - State setter for markdown content
 * @returns {Promise<string>} - Promise that resolves with the markdown content
 */
export const fetchMarkdownContent = async (itemTitle, setMarkdownContent) => {
    try {
        const path = getLocalMarkdownPath(itemTitle);
        
        const response = await fetch(path);
        
        if (!response.ok) {
            throw new Error(`Error loading file: ${response.status}`);
        }
        
        const text = await response.text();
        setMarkdownContent(text || "No description available for this item.");
        
        const infoPanelContent = document.getElementById('info-panel-content');
        if (infoPanelContent) {
            infoPanelContent.innerHTML = DOMPurify.sanitize(
                renderMarkdown(text),
                {
                    USE_PROFILES: { html: true },
                    ADD_ATTR: ['target', 'rel']
                }
            );
        }
        
        return text;
    } catch (error) {
        console.log(`Info file not found for: ${itemTitle} - This is expected behavior.`);
        const fallbackContent = `No information available for "${itemTitle}".`;
        
        setMarkdownContent(fallbackContent);
        
        const infoPanelContent = document.getElementById('info-panel-content');
        if (infoPanelContent) {
            infoPanelContent.innerHTML = DOMPurify.sanitize(`
                <div class="alert alert-info">
                    <strong>No information available for "${itemTitle}"</strong><br><br>
                    <p>This is normal if you haven't created info files yet.</p>
                    <p>To add information, create a markdown file at this path: <code>${getLocalMarkdownPath(itemTitle)}</code></p>
                </div>
            `);
        }
        
        return fallbackContent;
    }
};

// Import missing functions from utils.js
import { generateItemId, showAlert, getLocalMarkdownPath } from '../../../core/utils.js';