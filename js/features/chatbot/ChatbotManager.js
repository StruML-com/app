/**
 * Chatbot Manager
 * Handles chatbot functionality and UI interaction
 */

import { showAlert } from '../../core/utils.js';
import { ChatUI } from './ChatUI.js';
import { ChatService } from './ChatService.js';

// Private variables
let appContext = null; // Reference to the main app context
let chatbotPanelInstance = null; // Bootstrap Offcanvas instance
let chatService = null; // Chat service instance
let chatUI = null; // Chat UI instance

/**
 * Initialize chatbot UI and store context
 * @param {Object} appContextRef - Reference to the main app context
 */
export function init(appContextRef) {
    // Store the app context reference
    appContext = appContextRef;

    // Initialize chat service
    chatService = new ChatService(appContext);
    
    // Initialize chat UI
    chatUI = new ChatUI(appContext, chatService);
    chatUI.init();

    // Initialize Bootstrap Offcanvas
    const chatbotPanelElement = document.getElementById('chatbot-panel');
    if (chatbotPanelElement) {
        chatbotPanelInstance = new bootstrap.Offcanvas(chatbotPanelElement);
        
        // Add close button handler
        const closeBtn = chatbotPanelElement.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (chatbotPanelInstance) {
                    chatbotPanelInstance.hide();
                }
            });
        }
    } else {
        console.error("Chatbot panel element ('#chatbot-panel') not found.");
        return; // Cannot proceed without the panel element
    }
}

/**
 * Show the chatbot panel
 */
export function showPanel() {
    if (chatbotPanelInstance) {
        chatbotPanelInstance.show();
        
        // Focus the input field
        setTimeout(() => {
            const chatInput = document.getElementById('chat-input');
            if (chatInput) {
                chatInput.focus();
            }
        }, 300);
    } else {
        console.error("Chatbot panel instance not available.");
        showAlert("Could not open chatbot panel.", "danger");
    }
}

/**
 * Process response from webhook
 * @param {Object} responseData - Response data from webhook
 * @param {Object} currentItem - Current item context
 * @returns {boolean} - Whether the response was processed successfully
 */
export function processWebhookResponse(responseData, currentItem) {
    if (!appContext) return false; // Need context
    if (!responseData) return false;

    return chatService.processResponse(responseData, currentItem);
}

/**
 * Send a message to the chatbot
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} - Whether the message was sent successfully
 */
export async function sendMessage(message) {
    if (!chatService) {
        console.error("Chat service not initialized");
        return false;
    }
    
    return await chatService.sendMessage(message);
}