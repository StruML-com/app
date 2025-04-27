/**
 * StruML State Management using React Context API
 */

const defaultDocument = {
  title: 'Untitled Document',
  items: []
};

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2,8);
}

function assignIdsToItems(items) {
  return items.map(item => {
    if (!item.id) {
      item.id = generateUniqueId();
    }
    if (item.items && item.items.length > 0) {
      item.items = assignIdsToItems(item.items);
    }
    return item;
  });
}

// Use utility functions from utils.js
const createEmptyItem = window.StruMLApp.Utils.createEmptyItem;
const deepCopy = window.StruMLApp.Utils.deepCopy;
const parseTags = window.StruMLApp.Utils.parseTags;
const saveToLocalStorage = window.StruMLApp.Utils.saveToLocalStorage;
const loadFromLocalStorage = window.StruMLApp.Utils.loadFromLocalStorage;
const findItemById = window.StruMLApp.Utils.findItemById;

// Function to format timestamp as YYYY-MM-DD-HH-MM-SS
function formatTimestamp(date) {
  return date.getFullYear() + '-' + 
         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
         String(date.getDate()).padStart(2, '0') + '-' + 
         String(date.getHours()).padStart(2, '0') + '-' + 
         String(date.getMinutes()).padStart(2, '0') + '-' + 
         String(date.getSeconds()).padStart(2, '0');
}

// Initial state
const initialState = {
  document: { ...defaultDocument },
  selectedItemId: null,
  isEditing: false,
  editingItem: null,
  sidebarVisible: true,
  filteredItems: null,
  showTagFilter: false,
  chatMessages: [],
  isChatbotOpen: true
};

// Create context
const AppContext = React.createContext();

// Create provider component
const AppProvider = ({ children }) => {
  const [state, setState] = React.useState(initialState);
  
  // Actions
  const actions = {
    setDocument: (document) => {
      setState(prevState => ({ ...prevState, document }));
      saveToLocalStorage('struml-document', document);
    },
    
    createNewDocument: () => {
      const newDocument = { ...defaultDocument };
      setState(prevState => ({
        ...prevState,
        document: newDocument,
        selectedItemId: null,
        editingItem: null,
        isEditing: false
      }));
      saveToLocalStorage('struml-document', newDocument);
    },
    
    importDocument: (document) => {
      const newDocument = { ...document, items: assignIdsToItems(document.items || []) };
      setState(prevState => ({
        ...prevState,
        document: newDocument,
        selectedItemId: null,
        editingItem: null,
        isEditing: false
      }));
      saveToLocalStorage('struml-document', newDocument);
    },
    
    updateDocumentTitle: (title) => {
      setState(prevState => {
        const document = { ...prevState.document, title };
        saveToLocalStorage('struml-document', document);
        return { ...prevState, document };
      });
    },
    
    loadChatHistory: (itemId) => {
      const messages = window.StruMLApp.Utils.loadChatHistory(itemId);
      setState(prevState => ({
        ...prevState,
        chatMessages: messages
      }));
    },
    
    selectItem: (itemId) => {
      setState(prevState => {
        // If the selected item changes, save the current chat history and load the new one
        if (prevState.selectedItemId !== itemId) {
          // Save the current chat history
          if (prevState.selectedItemId && prevState.chatMessages.length > 0) {
            window.StruMLApp.Utils.saveChatHistory(prevState.selectedItemId, prevState.chatMessages);
          }
          
          // Load the chat history for the new item
          const messages = window.StruMLApp.Utils.loadChatHistory(itemId);
          
          return {
            ...prevState,
            selectedItemId: itemId,
            chatMessages: messages
          };
        }
        
        return { ...prevState, selectedItemId: itemId };
      });
    },
    
    startEditingItem: (itemId) => {
      setState(prevState => {
        const item = findItemById(prevState.document.items, itemId);
        if (!item) return prevState;
        
        return {
          ...prevState,
          isEditing: true,
          editingItem: { ...item }
        };
      });
    },
    
    cancelEditingItem: () => {
      setState(prevState => ({
        ...prevState,
        isEditing: false,
        editingItem: null
      }));
    },
    
    updateEditingItem: (updates) => {
      setState(prevState => ({
        ...prevState,
        editingItem: {
          ...prevState.editingItem,
          ...updates
        }
      }));
    },
    
    saveEditingItem: () => {
      setState(prevState => {
        if (!prevState.editingItem) return prevState;
        
        const originalItem = findItemById(prevState.document.items, prevState.editingItem.id);
        const titleChanged = originalItem && originalItem.title !== prevState.editingItem.title;
        
        // Create a deep copy of the document
        const updatedDocument = deepCopy(prevState.document);
        
        // Find and update the item
        const updateItemInTree = (items) => {
          return items.map(item => {
            if (item.id === prevState.editingItem.id) {
              return { ...prevState.editingItem };
            }
            
            if (item.items && item.items.length > 0) {
              return {
                ...item,
                items: updateItemInTree(item.items)
              };
            }
            
            return item;
          });
        };
        
        updatedDocument.items = updateItemInTree(updatedDocument.items);
        
        // Save to local storage
        saveToLocalStorage('struml-document', updatedDocument);
        
        // Update state
        const newState = {
          ...prevState,
          document: updatedDocument,
          isEditing: false,
          editingItem: null
        };
        
        // Update relation references if title changed
        if (titleChanged && originalItem) {
          setTimeout(() => {
            actions.updateRelationReferences(originalItem.title, prevState.editingItem.title);
          }, 0);
        }
        
        return newState;
      });
    },
    
    createItem: (parentId = null, itemData = null) => {
      setState(prevState => {
        // Use provided item data or create a new empty item
        const newItem = itemData || createEmptyItem();
        
        // Ensure the item has an ID
        if (!newItem.id) {
          newItem.id = generateUniqueId();
        }
        
        // Create a deep copy of the document
        const updatedDocument = deepCopy(prevState.document);
        
        if (!parentId) {
          // Add as top-level item
          updatedDocument.items.push(newItem);
        } else {
          // Add as child of specified parent
          const addToParent = (items) => {
            return items.map(item => {
              if (item.id === parentId) {
                return {
                  ...item,
                  items: [...(item.items || []), newItem]
                };
              }
              
              if (item.items && item.items.length > 0) {
                return {
                  ...item,
                  items: addToParent(item.items)
                };
              }
              
              return item;
            });
          };
          
          updatedDocument.items = addToParent(updatedDocument.items);
        }
        
        // Save to local storage
        saveToLocalStorage('struml-document', updatedDocument);
        
        return {
          ...prevState,
          document: updatedDocument,
          selectedItemId: newItem.id
        };
      });
      
      // Return the ID of the new item (useful for chaining)
      return itemData?.id || null;
    },
    
    deleteItem: (itemId) => {
      setState(prevState => {
        // Create a deep copy of the document
        const updatedDocument = deepCopy(prevState.document);
        
        // Remove the item from the tree
        const removeFromTree = (items) => {
          return items.filter(item => {
            if (item.id === itemId) {
              return false;
            }
            
            if (item.items && item.items.length > 0) {
              item.items = removeFromTree(item.items);
            }
            
            return true;
          });
        };
        
        updatedDocument.items = removeFromTree(updatedDocument.items);
        
        // Update selected item if it was deleted
        const newSelectedItemId = prevState.selectedItemId === itemId ? null : prevState.selectedItemId;
        
        // Save to local storage
        saveToLocalStorage('struml-document', updatedDocument);
        
        return {
          ...prevState,
          document: updatedDocument,
          selectedItemId: newSelectedItemId
        };
      });
    },
    
    toggleSidebar: () => {
      setState(prevState => ({
        ...prevState,
        sidebarVisible: !prevState.sidebarVisible
      }));
    },
    
    setFilteredItems: (itemIds) => {
      setState(prevState => ({
        ...prevState,
        filteredItems: itemIds
      }));
    },
    
    toggleTagFilter: () => {
      setState(prevState => ({
        ...prevState,
        showTagFilter: !prevState.showTagFilter
      }));
    },
    
    toggleChatbot: () => {
      setState(prevState => ({
        ...prevState,
        isChatbotOpen: !prevState.isChatbotOpen
      }));
    },
    
    sendChatMessage: async (message) => {
      // If no item is selected, the check is now handled in ChatbotPanel.js
      // Add user message to chat and save to history
      const updatedMessages = [...state.chatMessages, { sender: 'user', text: message }];
      setState(prevState => ({
        ...prevState,
        chatMessages: updatedMessages
      }));
      
      // Save chat history after adding user message
      if (state.selectedItemId) {
        window.StruMLApp.Utils.saveChatHistory(state.selectedItemId, updatedMessages);
      }
      
      try {
        // Get the webhook URL from config
        const WEBHOOK_URL = window.StruMLConfig?.WEBHOOK_URL;
        if (!WEBHOOK_URL) {
          throw new Error("Webhook URL is not configured");
        }
        
        // Get the current item for context
        const currentItem = findItemById(
          state.document.items, 
          state.selectedItemId
        );
        
        if (!currentItem) {
          throw new Error("No item selected");
        }
        
        // Generate a session ID if not already present
        if (!window.chatSessionId) {
          window.chatSessionId = generateUniqueId();
        }
        
        // Get additional information from metamodel and sample
        let markdownDescription = null;
        let sampleItem = null;
        
        try {
          markdownDescription = await window.StruMLApp.Utils.getItemInfo(currentItem.title);
          sampleItem = await window.StruMLApp.Utils.getSampleItem(currentItem.title);
        } catch (infoError) {
          console.error("Error getting additional item information:", infoError);
          // Continue with the request even if additional info fails
        }
        
        // Prepare the initial data
        const inputData = {
          requestType: message.toLowerCase().includes('execute') ? message.substring(8) : 'custom request',
          message: message,
          sessionId: window.chatSessionId,
          itemTitle: currentItem.title,
          context: {
            currentItem: {
              id: currentItem.id,
              title: currentItem.title,
              content: currentItem.content || "",
              tags: currentItem.tags || ""
            },
            documentStructure: state.document // Include the entire document for filtering
          },
          markdownDescription: markdownDescription || "",
          sampleItem: sampleItem ? JSON.parse(sampleItem) : {}
        };
        
        // Generate the prompt using the template
        const promptText = await window.StruMLApp.Utils.generateItemPrompt(inputData);
        
        // Send the request to the webhook with the prompt and additional fields
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            "userPrompt": promptText,
            "sessionId": formatTimestamp(new Date()),
            "userId": "struml"
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // Process the response
        const responseData = await response.json();
        
        // Extract the message from the response
        let responseMessage = "";
        let jsonData = null;
        
        if (responseData) {
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
              jsonData = JSON.parse(jsonMatch[1].trim());
              
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
        } else {
          responseMessage = "Received empty response from AI.";
        }
        
        // Add AI response to chat and save to history
        const updatedMessagesWithResponse = [
          ...state.chatMessages,
          { 
            sender: 'chatbot', 
            text: responseMessage,
            jsonData: jsonData, // Store the JSON data with the message
            timestamp: Date.now() // Add timestamp to ensure state change detection
          }
        ];
        
        setState(prevState => ({
          ...prevState,
          chatMessages: updatedMessagesWithResponse
        }));
        
        // Save chat history after adding AI response
        if (state.selectedItemId) {
          window.StruMLApp.Utils.saveChatHistory(state.selectedItemId, updatedMessagesWithResponse);
        }
        
        // Process suggested items if available
        if (responseData && responseData.suggestedItems && 
            responseData.suggestedItems.items && 
            Array.isArray(responseData.suggestedItems.items)) {
          
          // Process the suggested items
          const suggestedItems = responseData.suggestedItems.items;
          
          // Add the suggested items to the current item
          suggestedItems.forEach(item => {
            if (item && (item.name || item.title)) {
              const newItem = {
                id: generateUniqueId(),
                title: item.name || item.title || 'Unnamed Item',
                content: item.content || '',
                tags: item.tags || '',
                items: []
              };
              
              // Add as child of current item
              actions.createItem(currentItem.id, newItem);
            }
          });
          
          if (suggestedItems.length > 0) {
            // Add a message about the added items
            setState(prevState => ({
              ...prevState,
              chatMessages: [
                ...prevState.chatMessages,
                { 
                  sender: 'chatbot', 
                  text: `Added ${suggestedItems.length} new items to "${currentItem.title}"`,
                  timestamp: Date.now() + 1 // Ensure different timestamp
                }
              ]
            }));
          }
        }
        
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Add error message to chat
        setState(prevState => ({
          ...prevState,
          chatMessages: [
            ...prevState.chatMessages,
            { sender: 'chatbot', text: `Sorry, there was an error processing your request: ${error.message}` }
          ]
        }));
      }
    },
    
    updateRelationReferences: (oldTitle, newTitle) => {
      if (oldTitle === newTitle) return;
      
      setState(prevState => {
        // Create a deep copy of the document
        const updatedDocument = deepCopy(prevState.document);
        
        // Update relation references in all items
        const updateRelationsInItems = (items) => {
          return items.map(item => {
            if (item.tags) {
              const tags = parseTags(item.tags);
              let tagsChanged = false;
              
              // Check for relation tags that reference the old title
              tags.forEach(tag => {
                if (tag.type === 'relation' && tag.target === oldTitle) {
                  tag.target = newTitle;
                  tag.full = `${tag.relation}>>${newTitle}`;
                  tagsChanged = true;
                }
              });
              
              // Update tags string if any relations were changed
              if (tagsChanged) {
                item.tags = tags.map(tag => tag.full).join(', ');
              }
            }
            
            if (item.items && item.items.length > 0) {
              item.items = updateRelationsInItems(item.items);
            }
            
            return item;
          });
        };
        
        updatedDocument.items = updateRelationsInItems(updatedDocument.items);
        
        // Save to local storage
        saveToLocalStorage('struml-document', updatedDocument);
        
        return {
          ...prevState,
          document: updatedDocument
        };
      });
    },
    
    reorderItems: (sourceId, targetParentId, newIndex) => {
      setState(prevState => {
        try {
          // Create a deep copy of the document
          const updatedDocument = deepCopy(prevState.document);
          
          // Find the source item and its parent
          let sourceItem = null;
          let sourceParent = null;
          let sourceIndex = -1;
          
          // Function to find the source item and its parent
          const findSourceItem = (items, parent = null) => {
            for (let i = 0; i < items.length; i++) {
              if (items[i].id === sourceId) {
                sourceItem = items[i];
                sourceParent = parent;
                sourceIndex = i;
                return true;
              }
              
              if (items[i].items && items[i].items.length > 0) {
                if (findSourceItem(items[i].items, items[i])) {
                  return true;
                }
              }
            }
            return false;
          };
          
          findSourceItem(updatedDocument.items);
          
          if (!sourceItem) {
            console.error(`Source item with ID ${sourceId} not found`);
            return prevState;
          }
          
          // Remove the source item from its current position
          if (sourceParent) {
            sourceParent.items.splice(sourceIndex, 1);
          } else {
            updatedDocument.items.splice(sourceIndex, 1);
          }
          
          // Add the source item to its new position
          if (targetParentId) {
            // Find the target parent
            const findTargetParent = (items) => {
              for (const item of items) {
                if (item.id === targetParentId) {
                  return item;
                }
                
                if (item.items && item.items.length > 0) {
                  const found = findTargetParent(item.items);
                  if (found) return found;
                }
              }
              return null;
            };
            
            const targetParent = findTargetParent(updatedDocument.items);
            if (!targetParent) {
              console.error(`Target parent with ID ${targetParentId} not found`);
              return prevState;
            }
            
            if (!targetParent.items) targetParent.items = [];
            targetParent.items.splice(newIndex, 0, sourceItem);
          } else {
            // Add to top level
            updatedDocument.items.splice(newIndex, 0, sourceItem);
          }
          
          // Save to local storage
          saveToLocalStorage('struml-document', updatedDocument);
          
          return {
            ...prevState,
            document: updatedDocument
          };
        } catch (err) {
          console.error("Error reordering items:", err);
          return prevState;
        }
      });
    },
    
    updateItem: (updatedItem) => {
      setState(prevState => {
        if (!updatedItem || !updatedItem.id) {
          console.error("Cannot update: Invalid item data");
          return prevState;
        }
        
        // Create a deep copy of the document
        const updatedDocument = deepCopy(prevState.document);
        
        // Find and update the item
        const updateItemInTree = (items) => {
          return items.map(item => {
            if (item.id === updatedItem.id) {
              // Preserve children if not provided in the update
              const children = updatedItem.items || item.items || [];
              return { ...updatedItem, items: children };
            }
            
            if (item.items && item.items.length > 0) {
              return {
                ...item,
                items: updateItemInTree(item.items)
              };
            }
            
            return item;
          });
        };
        
        updatedDocument.items = updateItemInTree(updatedDocument.items);
        
        // Save to local storage
        saveToLocalStorage('struml-document', updatedDocument);
        
        return {
          ...prevState,
          document: updatedDocument
        };
      });
    }
  };
  
  // Load document from local storage on mount
  React.useEffect(() => {
    const savedDocument = loadFromLocalStorage('struml-document');
    
    if (savedDocument) {
      actions.setDocument(savedDocument);
    } else {
      // Try to load the sample document
      fetch('./sample.struml.json')
        .then(response => response.json())
        .then(sampleDocument => {
          actions.setDocument(sampleDocument);
        })
        .catch(error => {
          console.error('Error loading sample document:', error);
        });
    }
  }, []);
  
  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Export the provider and hook
window.StruMLApp.State = {
  AppProvider,
  useAppContext,
  AppContext
};
