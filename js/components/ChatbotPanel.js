/**
 * Chatbot Panel Component
 * Provides a horizontal sidebar for AI Assistant interaction
 */

const ChatbotPanel = () => {
  const { state, actions } = useAppContext();
  const { selectedItemId, chatMessages } = state;
  const { sendChatMessage, createItem, selectItem } = actions;
  
  const [queryType, setQueryType] = React.useState('custom request');
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isThinking, setIsThinking] = React.useState(false);
  const [pendingChatItem, setPendingChatItem] = React.useState(null);
  
  const messagesContainerRef = React.useRef(null);
  const inputRef = React.useRef(null);
  
  // Get current item title
  const currentItem = React.useMemo(() => {
    console.log("Current item ID:", selectedItemId); // Debug log for selectedItemId
    console.log("Document items:", state.document.items); // Debug log for document items
    
    if (!selectedItemId) {
      console.log("No selected item ID");
      return null;
    }
    
    // Buscar el ítem en el documento
    const findItem = (items, id) => {
      if (!items || !Array.isArray(items)) return null;
      
      for (const item of items) {
        if (item.id === id) {
          return item;
        }
        
        if (item.items && item.items.length > 0) {
          const found = findItem(item.items, id);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // Usar nuestra propia implementación para asegurar que funcione correctamente
    const item = findItem(state.document.items, selectedItemId);
    console.log("Current item found:", item); // Debug log for found item
    
    if (!item) {
      console.log("Item not found with ID:", selectedItemId);
      
      // Intentar obtener el ítem seleccionado de otra manera
      const selectedItem = document.querySelector('.tree-item.selected');
      if (selectedItem) {
        const title = selectedItem.querySelector('.truncate')?.textContent;
        if (title) {
          console.log("Found selected item in DOM:", title);
          return { title: title };
        }
      }
    }
    
    return item;
  }, [selectedItemId, state.document.items]);
  
  // Scroll to bottom of messages when new messages arrive
  React.useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  
  // Focus input when component mounts
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Handle query type change
  const handleQueryTypeChange = (e) => {
    setQueryType(e.target.value);
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  
  // Handle clear chat history
  const handleClearChatHistory = () => {
    if (selectedItemId && window.confirm('Are you sure you want to clear the chat history for this item?')) {
      window.StruMLApp.Utils.clearChatHistory(selectedItemId);
      actions.loadChatHistory(selectedItemId);
    }
  };
  
  // Handle refresh chat (clear current conversation without deleting history)
  const handleRefreshChat = () => {
    if (window.confirm('Are you sure you want to refresh the chat? Current conversation will be cleared but not saved.')) {
      // Clear the current chat messages in the state
      actions.loadChatHistory(selectedItemId);
      // Clear any pending chat item
      setPendingChatItem(null);
    }
  };
  
  // Handle save chat
  const handleSaveChat = () => {
    try {
      // Get the context item title - either from the current item or default to "Document"
      let contextItemTitle = currentItem ? currentItem.title : "Document";
      let contextItemId = selectedItemId || null;
      
      // Find or create the AI Chats parent item
      const aiChatsItem = window.StruMLApp.Utils.findOrCreateAIChatsItem(state.document, actions.createItem);
      
      if (!aiChatsItem) {
        throw new Error("Could not find or create AI Chats parent item");
      }
      
      // Create a title for the chat item based on the context and first message
      let chatTitle = "AI Chat";
      if (chatMessages.length > 0 && chatMessages[0].sender === 'user') {
        const firstMessage = chatMessages[0].text;
        chatTitle = `${contextItemTitle} > ${firstMessage.substring(0, 30)}${firstMessage.length > 30 ? '...' : ''}`;
      } else {
        chatTitle = `${contextItemTitle} > Chat`;
      }
      
      // Create relation tag to the context item
      const relationTag = `>>${contextItemTitle}`;
      
      // Create a new AI chat item
      const newItem = {
        id: window.StruMLApp.Utils.generateId(),
        title: chatTitle,
        content: chatMessages.map(msg => `**${msg.sender === 'user' ? 'You' : 'AI Assistant'}**: ${msg.text}`).join('\n\n'),
        tags: `ai-generated, ${relationTag}`,
        items: []
      };
      
      // Add the item to the document - as a child of the AI Chats item
      actions.createItem(aiChatsItem.id, newItem);
      
      // Show a message
      window.StruMLApp.Utils.showAlert(`Chat saved as "${chatTitle}"`, "success");
      
      // Store the new item as pending chat item
      setPendingChatItem(newItem);
      
    } catch (error) {
      console.error('Error saving chat:', error);
      window.StruMLApp.Utils.showAlert(`Error saving chat: ${error.message}`, "error");
    }
  };
  
  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() && queryType === 'custom request') return;
    
    setIsLoading(true);
    setIsThinking(true);
    
    try {
      // For custom requests, use the input value
      // For preset queries, use the query type as the message
      const message = queryType === 'custom request' ? inputValue : `Execute ${queryType}`;
      
      await sendChatMessage(message);
      setInputValue('');
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage = `Error: ${error.message}`;
      console.error(errorMessage);
      
      // Add to chat messages directly
      if (messagesContainerRef.current) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'mb-2 p-2 rounded-md bg-gray-50 mr-4';
        errorDiv.innerHTML = `
          <div class="text-xs text-gray-500 mb-1">AI Assistant</div>
          <div class="prose prose-sm max-w-none text-red-500">${errorMessage}</div>
        `;
        messagesContainerRef.current.appendChild(errorDiv);
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };
  
  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle adding JSON content to the current item
  const handleAddJsonContent = (jsonData) => {
    if (!jsonData || !currentItem) return;
    
    // Update the current item with the content from the JSON
    if (jsonData.content) {
      const updatedItem = { ...currentItem };
      updatedItem.content = currentItem.content 
        ? `${currentItem.content}\n\n${jsonData.content}`
        : jsonData.content;
      
      // Update tags if provided
      if (jsonData.tags) {
        updatedItem.tags = currentItem.tags
          ? `${currentItem.tags}, ${jsonData.tags}`
          : jsonData.tags;
      }
      
      // Update the item
      actions.updateItem(updatedItem);
      window.StruMLApp.Utils.showAlert(`Content added to "${currentItem.title}"`, "success");
    }
  };
  
  // Handle adding a JSON item as a child of the current item
  const handleAddJsonItem = (jsonData) => {
    if (!jsonData || !currentItem) return;
    
    // Create a new item with the JSON data
    const newItem = {
      id: window.StruMLApp.Utils.generateId(),
      title: jsonData.title || "",
      content: jsonData.content || "",
      tags: jsonData.tags || "",
      items: []
    };
    
    // Add child items if present
    if (jsonData.items && Array.isArray(jsonData.items)) {
      newItem.items = jsonData.items.map(childItem => ({
        id: window.StruMLApp.Utils.generateId(),
        title: childItem.title || "",
        content: childItem.content || "",
        tags: childItem.tags || "",
        items: []
      }));
    }
    
    // Add the new item as a child of the current item
    actions.createItem(currentItem.id, newItem);
    window.StruMLApp.Utils.showAlert(`Added "${newItem.title}" as a child of "${currentItem.title}"`, "success");
  };
  
  // Handle adding all JSON items as children of the current item
  const handleAddAllJsonItems = (jsonData) => {
    if (!jsonData || !currentItem || !jsonData.items || !Array.isArray(jsonData.items)) return;
    
    // Add each item in the items array as a child of the current item
    jsonData.items.forEach(item => {
      const newItem = {
        id: window.StruMLApp.Utils.generateId(),
        title: item.title || "",
        content: item.content || "",
        tags: item.tags || "",
        items: []
      };
      
      actions.createItem(currentItem.id, newItem);
    });
    
    window.StruMLApp.Utils.showAlert(`Added ${jsonData.items.length} items as children of "${currentItem.title}"`, "success");
  };
  
  // Render JSON preview with draggable badges
  const renderJsonPreview = (message) => {
    if (!message.jsonData) return null;
    
    const jsonData = message.jsonData;
    
    // If this is a response to a custom request and only contains content,
    // automatically update the current item with the content and don't show the preview
    if (queryType === 'custom request' && jsonData.content && !jsonData.title && !jsonData.items) {
      // Use setTimeout to ensure this runs after the component has rendered
      setTimeout(() => {
        handleAddJsonContent(jsonData);
      }, 100);
      
      // Return null to prevent showing the JSON preview
      return null;
    }
    
    // Create a complete item object for the main item
    // Don't use "Generated Item" as a fallback, use an empty string instead
    const mainItem = {
      id: window.StruMLApp.Utils.generateId(), // Temporary ID
      title: jsonData.title || "",
      content: jsonData.content || "",
      tags: jsonData.tags || "",
      items: jsonData.items || []
    };
    
    // Create item objects for child items
    const childItems = jsonData.items ? jsonData.items.map(item => ({
      id: window.StruMLApp.Utils.generateId(), // Temporary ID
      title: item.title || "",
      content: item.content || "",
      tags: item.tags || "",
      items: []
    })) : [];
    
    // Handle drag start for an item
    const handleItemDragStart = (item, e) => {
      // Set a custom drag image if needed
      const dragImage = document.createElement('div');
      dragImage.textContent = item.title;
      dragImage.style.padding = '8px';
      dragImage.style.background = '#f0f9ff';
      dragImage.style.border = '1px solid #bae6fd';
      dragImage.style.borderRadius = '4px';
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-1000px';
      document.body.appendChild(dragImage);
      
      e.dataTransfer.setDragImage(dragImage, 0, 0);
      
      // Clean up the drag image after a short delay
      setTimeout(() => {
        document.body.removeChild(dragImage);
      }, 100);
    };
    
    return (
      <div className="json-item-preview mt-3 border rounded p-3 bg-blue-50">
        <div className="mb-3">
          <span className="text-xs text-gray-500 block mb-1">Drag this item to add it to your document:</span>
          {React.createElement(window.StruMLApp.Components.DraggableItemBadge, {
            item: mainItem,
            onClick: () => {
              if (currentItem) {
                handleAddJsonItem(jsonData);
                window.StruMLApp.Utils.showAlert(`Added "${mainItem.title}" as a child of "${currentItem.title}"`, "success");
              } else {
                window.StruMLApp.Utils.showAlert("Please select an item first to add this as a child", "warning");
              }
            },
            onDragStart: handleItemDragStart,
            onDragEnd: () => {}
          })}
        </div>
        
        {jsonData.content && (
          <div className="mb-3">
            <span className="text-xs text-gray-500">Content Preview:</span>
            <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm max-h-32 overflow-y-auto">
              {jsonData.content.substring(0, 200)}
              {jsonData.content.length > 200 ? '...' : ''}
            </div>
            <button 
              onClick={() => handleAddJsonContent(jsonData)}
              className="mt-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              disabled={!currentItem}
            >
              <i className="bi bi-plus-circle me-1"></i> Add Content to {currentItem ? `"${currentItem.title}"` : "Current Item"}
            </button>
          </div>
        )}
        
        {childItems.length > 0 && (
          <div className="mb-3">
            <span className="text-xs text-gray-500 block mb-1">Child Items ({childItems.length}) - Drag to add:</span>
            <div className="mt-1">
              {childItems.map((item, i) => (
                React.createElement(window.StruMLApp.Components.DraggableItemBadge, {
                  key: i,
                  item: item,
                  onClick: () => {
                    if (currentItem) {
                      const newItem = {
                        id: window.StruMLApp.Utils.generateId(),
                        title: item.title,
                        content: item.content,
                        tags: item.tags,
                        items: []
                      };
                      actions.createItem(currentItem.id, newItem);
                      window.StruMLApp.Utils.showAlert(`Added "${item.title}" as a child of "${currentItem.title}"`, "success");
                    } else {
                      window.StruMLApp.Utils.showAlert("Please select an item first to add this as a child", "warning");
                    }
                  },
                  onDragStart: handleItemDragStart,
                  onDragEnd: () => {}
                })
              ))}
            </div>
            {childItems.length > 1 && (
              <button 
                onClick={() => handleAddAllJsonItems(jsonData)}
                className="mt-2 px-3 py-1 bg-purple-500 text-white text-sm rounded hover:bg-purple-600"
              >
                <i className="bi bi-plus-circle-fill me-1"></i> Add All Child Items
              </button>
            )}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="chatbot-panel bg-white border-l border-gray-200 p-3 flex flex-col h-full">
      {/* Header */}
      <div className="mb-3 pb-2 border-b border-gray-200">
        <div className="flex justify-between items-center mb-1">
          <h3 className="font-medium">AI Assistant</h3>
          <div className="flex space-x-1">
            {chatMessages.length > 0 && (
              <>
                <button
                  onClick={handleRefreshChat}
                  className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  title="Refresh chat (clear current conversation)"
                >
                  <i className="bi bi-arrow-clockwise"></i> Refresh
                </button>
                <button
                  onClick={handleSaveChat}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  title="Save chat as an item"
                >
                  <i className="bi bi-save"></i> Save Chat
                </button>
              </>
            )}
            {chatMessages.length > 0 && selectedItemId && (
              <button
                onClick={handleClearChatHistory}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                title="Clear chat history"
              >
                <i className="bi bi-trash"></i> Clear History
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Current item: <span className="font-medium">{currentItem ? currentItem.title : "Document"}</span>
        </p>
        
        {/* Show pending chat item as a draggable badge if available */}
        {pendingChatItem && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Saved chat:</p>
            {React.createElement(window.StruMLApp.Components.DraggableItemBadge, {
              item: pendingChatItem,
              onClick: (item) => selectItem(item.id),
              onDragStart: () => {},
              onDragEnd: () => {}
            })}
          </div>
        )}
      </div>
      
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto mb-3 border border-gray-200 rounded-md p-2"
      >
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            <p>No messages yet. Ask the AI Assistant for help with your document.</p>
            <p className="text-sm mt-2">Examples:</p>
            <ul className="text-sm text-left mt-1 space-y-1">
              <li>• "Suggest some tags for this item"</li>
              <li>• "Help me write content about [topic]"</li>
              <li>• "Create a list of potential child items"</li>
              <li>• "Summarize this item's content"</li>
            </ul>
          </div>
        ) : (
          <>
            {chatMessages.map((message, index) => (
              <div 
                key={`${index}-${message.timestamp || 0}`}
                className={`mb-2 p-2 rounded-md ${
                  message.sender === 'user' 
                    ? 'bg-blue-50 ml-4' 
                    : 'bg-gray-50 mr-4'
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {message.sender === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: window.StruMLApp.Utils.renderMarkdown(message.text) }}
                />
                {message.sender === 'chatbot' && message.jsonData && renderJsonPreview(message)}
              </div>
            ))}
            
            {/* Thinking animation */}
            {isThinking && (
              <div className="mb-2 p-2 rounded-md bg-gray-50 mr-4 thinking-animation">
                <div className="text-xs text-gray-500 mb-1">AI Assistant</div>
                <div className="flex items-center">
                  <div className="dot-typing"></div>
                  <span className="ml-2 text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Input */}
      <div>
        <div className="mb-2">
          <select
            value={queryType}
            onChange={handleQueryTypeChange}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="custom request">Custom Request</option>
            <option value="create complete item">Create Complete Item</option>
            <option value="suggest tags">Suggest Tags</option>
            <option value="suggest child items">Suggest Child Items</option>
            <option value="improve content">Improve Content</option>
          </select>
        </div>
        
        {queryType === 'custom request' ? (
          <div className="flex">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your question..."
              className="flex-1 p-2 border border-gray-300 rounded-l-md"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              className="px-3 py-2 bg-primary-500 text-white rounded-r-md hover:bg-primary-600 disabled:bg-gray-300"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={handleSendMessage}
            className="w-full p-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:bg-gray-300"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : `Execute ${queryType}`}
          </button>
        )}
      </div>
    </div>
  );
};
