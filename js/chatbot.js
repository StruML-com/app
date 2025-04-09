// Assign Chatbot object to the global namespace
window.StruMLApp = window.StruMLApp || {};

window.StruMLApp.Chatbot = (() => {
    // Access dependencies from global scope
    const Utils = window.StruMLApp.Utils;

    // Private variables
    let appContext = null; // Reference to the main app context
    let chatbotPanelInstance = null; // Bootstrap Offcanvas instance

    /**
     * Chatbot functionality and UI interaction
     */
    const ChatbotManager = {
        // Initialize chatbot UI and store context
        init: function(appContextRef) {
            // Store the app context reference
            appContext = appContextRef;

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

            // Set up query type selector
            const queryTypeSelector = document.getElementById('chat-query-type');
            const customQuestionContainer = document.getElementById('custom-question-container');
            const presetButtonsContainer = document.getElementById('preset-buttons-container');
            const executePresetBtn = document.getElementById('execute-preset-btn');
            const chatInput = document.getElementById('chat-input');
            const chatSendBtn = document.getElementById('chat-send-btn');

            // Handle query type changes
            if (queryTypeSelector) {
                // Helper function to update visibility
                const updateVisibility = (selectedValue) => {
                    if (selectedValue === 'custom request') {
                        customQuestionContainer?.classList.remove('d-none');
                        presetButtonsContainer?.classList.add('d-none');
                        setTimeout(() => chatInput?.focus(), 50);
                    } else {
                        customQuestionContainer?.classList.add('d-none');
                        presetButtonsContainer?.classList.remove('d-none');
                    }
                };

                // Set initial state based on the default selected value
                updateVisibility(queryTypeSelector.value);

                // Add event listener for changes
                queryTypeSelector.addEventListener('change', (e) => {
                    const selectedValue = e.target.value;
                    updateVisibility(selectedValue);
                });
            }

            // Handle preset execution button click
            if (executePresetBtn && queryTypeSelector && !executePresetBtn._listenerAttached) {
                executePresetBtn._listenerAttached = true;
                executePresetBtn.addEventListener('click', () => {
                    const selectedType = queryTypeSelector.value;

                    if (selectedType && selectedType !== 'custom request') {
                        // Check context before sending
                        if (!appContext) {
                            Utils.showAlert("Error: Application context is missing.", "danger");
                            return;
                        }
                        const currentItemId = appContext.currentItemId;
                        if (!currentItemId) {
                            Utils.showAlert("⚠️ Please select an item first.", "warning");
                            appContext.setChatMessages(prev => [...prev, {
                                text: "⚠️ Please select an item in the main document view first to provide context for your message.",
                                sender: 'chatbot'
                            }]);
                            appContext.updateChatDisplay?.();
                            return;
                        }

                        const message = `Execute ${selectedType}`;
                        if (typeof appContext.sendChatMessage === 'function') {
                            appContext.sendChatMessage(message);
                        } else {
                            Utils.showAlert("Error: Could not send message.", "danger");
                        }
                    }
                });
            }

            // Handle custom message send via button
            if (chatSendBtn && chatInput) {
                chatSendBtn.addEventListener('click', () => {
                    const message = chatInput.value.trim();
                    if (message) {
                        // Check context before sending
                        if (!appContext) {
                             Utils.showAlert("Error: Application context is missing.", "danger");
                             return;
                        }
                        const currentItemId = appContext.currentItemId;
                        if (!currentItemId) {
                            Utils.showAlert("⚠️ Please select an item first.", "warning");
                             appContext.setChatMessages(prev => [...prev, {
                                 text: "⚠️ Please select an item in the main document view first to provide context for your message.",
                                 sender: 'chatbot'
                             }]);
                             appContext.updateChatDisplay?.();
                            return;
                        }

                        if (typeof appContext.sendChatMessage === 'function') {
                            appContext.sendChatMessage(message);
                            chatInput.value = '';
                        } else {
                            Utils.showAlert("Error: Could not send message.", "danger");
                        }
                    }
                });
            }

            // Handle custom message send via Enter key
            if (chatInput) {
                chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        const message = chatInput.value.trim();
                        if (message) {
                             // Check context before sending
                             if (!appContext) {
                                  Utils.showAlert("Error: Application context is missing.", "danger");
                                  return;
                             }
                             const currentItemId = appContext.currentItemId;
                             if (!currentItemId) {
                                  Utils.showAlert("⚠️ Please select an item first.", "warning");
                                  appContext.setChatMessages(prev => [...prev, {
                                      text: "⚠️ Please select an item in the main document view first to provide context for your message.",
                                      sender: 'chatbot'
                                  }]);
                                  appContext.updateChatDisplay?.();
                                 return;
                             }

                            if (typeof appContext.sendChatMessage === 'function') {
                                appContext.sendChatMessage(message);
                                chatInput.value = '';
                            } else {
                                Utils.showAlert("Error: Could not send message.", "danger");
                            }
                        }
                    }
                });
            }
        },

        // Function to show the chatbot panel
        showPanel: function() {
            if (chatbotPanelInstance) {
                chatbotPanelInstance.show();
            } else {
                console.error("Chatbot panel instance not available.");
                Utils.showAlert("Could not open chatbot panel.", "danger");
            }
        },

        // Process response from webhook (kept for potential future use, but processing is now in state.js)
        // This might be removed later if confirmed unused.
        processWebhookResponse: function(responseData, currentItem) {
            if (!appContext) return false; // Need context
            if (!responseData) return false;

            const data = Array.isArray(responseData) ? responseData[0] : responseData;
            if (!data) return false;

            let processedResponse = false;

            if (data.message) {
                if (typeof appContext.setChatMessages === 'function') {
                    appContext.setChatMessages(prev => [...prev, {
                        text: data.message,
                        sender: 'chatbot'
                    }]);
                    processedResponse = true;
                }
            }

            return processedResponse;
        }
    };

    // Expose public methods
    return {
        init: ChatbotManager.init,
        showPanel: ChatbotManager.showPanel,
        // Expose processWebhookResponse if needed, otherwise keep private
        // processWebhookResponse: ChatbotManager.processWebhookResponse
    };

})();
