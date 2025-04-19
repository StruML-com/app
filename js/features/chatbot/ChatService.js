/**
 * Chat Service
 * Handles communication with the chat API
 */

import { showAlert } from '../../core/utils.js';
import { findItemById } from '../../components/item/ItemUtils.js';

/**
 * Chat Service class
 */
export class ChatService {
    /**
     * Constructor
     * @param {Object} appContext - Application context
     */
    constructor(appContext) {
        this.appContext = appContext;
    }
    
    /**
     * Send a message to the chat API
     * @param {string} message - Message to send
     * @returns {Promise<boolean>} - Whether the message was sent successfully
     */
    async sendMessage(message) {
        if (!message.trim()) return false;

        const chatLoading = document.getElementById('chat-loading');
        if (chatLoading) {
            chatLoading.classList.remove('d-none');
        }

        this.appContext.setChatMessages(prev => [...prev, { text: message, sender: 'user' }]);

        // Check current item context before sending
        if (!this.appContext.currentItemId) {
            console.error("Send failed: No current item selected.");
            this.appContext.setChatMessages(prev => [...prev, {
                text: "⚠️ Please select an item in the main document view first to provide context for your message.",
                sender: 'chatbot'
            }]);
            this.appContext.updateChatDisplay?.();
            if (chatLoading) {
                chatLoading.classList.add('d-none');
            }
            return false;
        }

        try {
            // Get the request type from the selector
            const queryTypeSelector = document.getElementById('chat-query-type');
            const requestType = queryTypeSelector ? queryTypeSelector.value : 'custom request';

            const currentItem = findItemById(this.appContext.items, this.appContext.currentItemId);

            if (!currentItem) {
                console.error(`Send failed: Could not find item with ID: ${this.appContext.currentItemId}`);
                this.appContext.setChatMessages(prev => [...prev, {
                    text: `⚠️ Error: Could not find the selected item (ID: ${this.appContext.currentItemId}). Please try selecting it again.`,
                    sender: 'chatbot'
                }]);
                this.appContext.updateChatDisplay?.();
                if (chatLoading) {
                    chatLoading.classList.add('d-none');
                }
                return false;
            }

            // Ensure we have the markdown content - fetch it if needed
            let mdDescription = this.appContext.markdownContent;
            if (!mdDescription && currentItem.title) {
                try {
                    mdDescription = await this.appContext.fetchMarkdownContent(currentItem.title);
                } catch (err) {
                    mdDescription = "";
                }
            }

            // Find matching sample item from cached data
            let sampleItem = null;
            if (this.appContext.sampleData && this.appContext.sampleData.items) {
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
                
                sampleItem = findMatchingItem(this.appContext.sampleData.items, currentItem.title);
            }

            // Prepare request payload with ensured markdown description and sample item
            const WEBHOOK_URL = window.StruMLApp.Constants?.WEBHOOK_URL;
            if (!WEBHOOK_URL) {
                throw new Error("Webhook URL is not configured.");
            }

            const requestData = {
                requestType: requestType,
                message: message,
                sessionId: window.chatSessionId || this.appContext.generateItemId(),
                context: {
                    currentItem: {
                        id: currentItem.id,
                        title: currentItem.title,
                        content: currentItem.content || "",
                        tags: currentItem.tags || ""
                    },
                    markdownDescription: mdDescription || "", 
                    documentStructure: this.appContext.items,
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
            
            // Process the response
            this.processResponse(responseData, currentItem);
            
            return true;
        } catch (error) {
            console.error("Error in chat communication:", error);
            this.appContext.setChatMessages(prev => [...prev, {
                text: `Error communicating with AI: ${error.message}`,
                sender: 'chatbot'
            }]);
            return false;
        } finally {
            if (chatLoading) {
                chatLoading.classList.add('d-none');
            }
            this.appContext.updateChatDisplay?.(); // Ensure the UI is updated
        }
    }
    
    /**
     * Process response from webhook
     * @param {Object} responseData - Response data from webhook
     * @param {Object} currentItem - Current item context
     * @returns {boolean} - Whether the response was processed successfully
     */
    processResponse(responseData, currentItem) {
        if (!this.appContext) return false; // Need context
        if (!responseData) return false;

        // Process suggested items if available
        if (responseData && responseData.suggestedItems &&
            responseData.suggestedItems.items &&
            Array.isArray(responseData.suggestedItems.items)) {
            this.appContext.processSuggestedItems(responseData.suggestedItems.items, currentItem);
        }

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
        this.appContext.setChatMessages(prev => {
            const updatedMessages = [...prev, {
                text: responseMessage,
                sender: 'chatbot',
                jsonData: jsonItemData, // Store the JSON data with the message
                timestamp: Date.now() // Add timestamp to ensure state change detection
            }];
            
            return updatedMessages;
        });
        
        return true;
    }
}