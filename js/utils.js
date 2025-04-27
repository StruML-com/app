/**
 * StruML Utility Functions
 */

// Initialize the global namespace
window.StruMLApp = window.StruMLApp || {};
window.StruMLApp.Utils = {};

// Generate a unique ID
window.StruMLApp.Utils.generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Sanitize and render markdown content
window.StruMLApp.Utils.renderMarkdown = (content) => {
  if (!content) return '';
  const rawHtml = marked.parse(content);
  return DOMPurify.sanitize(rawHtml);
};

// Parse tags string into an array of tag objects
window.StruMLApp.Utils.parseTags = (tagsString) => {
  if (!tagsString) return [];
  
  return tagsString.split(',').map(tag => {
    tag = tag.trim();
    if (!tag) return null;
    
    // Check for special tag formats
    if (tag.includes('::')) {
      const [type, value] = tag.split('::').map(part => part.trim());
      return { type, value, full: tag };
    }
    
    // Check for relation tags
    if (tag.includes('>>')) {
      const [relation, target] = tag.split('>>').map(part => part.trim());
      return { type: 'relation', relation, target, full: tag };
    }
    
    // Regular tag
    return { type: 'default', value: tag, full: tag };
  }).filter(Boolean);
};

// Extract relations from tags
window.StruMLApp.Utils.extractRelations = (tagsString) => {
  const tags = window.StruMLApp.Utils.parseTags(tagsString);
  return tags.filter(tag => tag.type === 'relation');
};

// Save data to local storage
window.StruMLApp.Utils.saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to local storage:', error);
    return false;
  }
};

// Load data from local storage
window.StruMLApp.Utils.loadFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from local storage:', error);
    return null;
  }
};

// Download data as a file
window.StruMLApp.Utils.downloadFile = (data, filename, type = 'application/json') => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

// Export document as JSON
window.StruMLApp.Utils.exportAsJson = (document) => {
  const data = JSON.stringify(document, null, 2);
  window.StruMLApp.Utils.downloadFile(data, `${document.title || 'document'}.struml.json`, 'application/json');
};

// Export document as Markdown
window.StruMLApp.Utils.exportAsMarkdown = (document) => {
  let markdown = `# ${document.title || 'Untitled Document'}\n\n`;
  
  const processItem = (item, level = 1) => {
    const heading = '#'.repeat(Math.min(level, 6));
    markdown += `${heading} ${item.title}\n\n`;
    
    if (item.content) {
      markdown += `${item.content}\n\n`;
    }
    
    if (item.tags) {
      markdown += `Tags: ${item.tags}\n\n`;
    }
    
    if (item.items && item.items.length > 0) {
      item.items.forEach(subItem => {
        processItem(subItem, level + 1);
      });
    }
  };
  
  if (document.items && document.items.length > 0) {
    document.items.forEach(item => {
      processItem(item);
    });
  }
  
  window.StruMLApp.Utils.downloadFile(markdown, `${document.title || 'document'}.md`, 'text/markdown');
};

// Export document as HTML
window.StruMLApp.Utils.exportAsHtml = (document) => {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${document.title || 'Untitled Document'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: #e5e7eb; margin-right: 5px; font-size: 0.8em; }
  </style>
</head>
<body>
  <h1>${document.title || 'Untitled Document'}</h1>
`;
  
  const processItem = (item, level = 2) => {
    const headingLevel = Math.min(level, 6);
    html += `<h${headingLevel}>${item.title}</h${headingLevel}>`;
    
    if (item.content) {
      html += `<div>${window.StruMLApp.Utils.renderMarkdown(item.content)}</div>`;
    }
    
    if (item.tags) {
      html += `<div class="tags">`;
      window.StruMLApp.Utils.parseTags(item.tags).forEach(tag => {
        html += `<span class="tag">${tag.full}</span>`;
      });
      html += `</div>`;
    }
    
    if (item.items && item.items.length > 0) {
      item.items.forEach(subItem => {
        processItem(subItem, level + 1);
      });
    }
  };
  
  if (document.items && document.items.length > 0) {
    document.items.forEach(item => {
      processItem(item);
    });
  }
  
  html += `</body></html>`;
  
  window.StruMLApp.Utils.downloadFile(html, `${document.title || 'document'}.html`, 'text/html');
};

// Export document as CSV
window.StruMLApp.Utils.exportAsCsv = (document) => {
  let csv = 'ID,Title,Parent ID,Content,Tags\n';
  
  const processItem = (item, parentId = '') => {
    // Escape content and tags for CSV
    const escapeCsv = (text) => {
      if (!text) return '';
      return `"${text.replace(/"/g, '""')}"`;
    };
    
    csv += `${item.id},${escapeCsv(item.title)},${parentId},${escapeCsv(item.content)},${escapeCsv(item.tags)}\n`;
    
    if (item.items && item.items.length > 0) {
      item.items.forEach(subItem => {
        processItem(subItem, item.id);
      });
    }
  };
  
  if (document.items && document.items.length > 0) {
    document.items.forEach(item => {
      processItem(item);
    });
  }
  
  window.StruMLApp.Utils.downloadFile(csv, `${document.title || 'document'}.csv`, 'text/csv');
};

// Find an item by ID in the document
window.StruMLApp.Utils.findItemById = (items, id) => {
  if (!items || !id) return null;
  
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
    
    if (item.items && item.items.length > 0) {
      const found = window.StruMLApp.Utils.findItemById(item.items, id);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

// Find an item by title in the document
window.StruMLApp.Utils.findItemByTitle = (items, title) => {
  if (!items || !title) return null;
  
  for (const item of items) {
    if (item.title === title) {
      return item;
    }
    
    if (item.items && item.items.length > 0) {
      const found = window.StruMLApp.Utils.findItemByTitle(item.items, title);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

// Create a new empty item
window.StruMLApp.Utils.createEmptyItem = (parentId = null) => {
  return {
    id: window.StruMLApp.Utils.generateId(),
    title: 'New Item',
    content: '',
    tags: '',
    items: []
  };
};

// Create a deep copy of an object
window.StruMLApp.Utils.deepCopy = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Show an alert message
window.StruMLApp.Utils.showAlert = (message, type = 'success', duration = 3000) => {
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
  if (toastContainer) {
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    if (toastElement) {
      const toast = new bootstrap.Toast(toastElement, { 
        autohide: true, 
        delay: duration 
      });
      
      toast.show();
      
      toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
      });
    }
  }
};

// Extract all unique tags from items
window.StruMLApp.Utils.extractAllTags = (items) => {
  if (!items || !Array.isArray(items)) return [];
  
  const tagSet = new Set();
  
  const processItem = (item) => {
    if (item.tags) {
      const tags = item.tags.split(',').map(tag => tag.trim());
      
      tags.forEach(tag => {
        // Skip empty tags
        if (!tag) return;
        
        // Skip relation tags (with >>)
        if (tag.includes('>>')) return;
        
        // Add tag to set
        tagSet.add(tag);
      });
    }
    
    // Process child items
    if (item.items && item.items.length > 0) {
      item.items.forEach(processItem);
    }
  };
  
  // Process all items
  items.forEach(processItem);
  
  // Convert set to array and sort alphabetically
  return Array.from(tagSet).sort();
};

// Function to save chat history to localStorage
window.StruMLApp.Utils.saveChatHistory = function(itemId, messages) {
  try {
    // Create a unique key for each item
    const key = `struml-chat-history-${itemId}`;
    
    // Save the messages to localStorage
    localStorage.setItem(key, JSON.stringify(messages));
    return true;
  } catch (error) {
    console.error('Error saving chat history:', error);
    return false;
  }
};

// Function to load chat history from localStorage
window.StruMLApp.Utils.loadChatHistory = function(itemId) {
  try {
    // Create a unique key for each item
    const key = `struml-chat-history-${itemId}`;
    
    // Load the messages from localStorage
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
};

// Function to clear chat history from localStorage
window.StruMLApp.Utils.clearChatHistory = function(itemId) {
  try {
    // Create a unique key for each item
    const key = `struml-chat-history-${itemId}`;
    
    // Remove the messages from localStorage
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
};

// Function to get item information from metamodel.struml.json
window.StruMLApp.Utils.getItemInfo = async function(itemTitle) {
  try {
    // Load the metamodel.struml.json file
    const response = await fetch('./bm/metamodel.struml.json');
    if (!response.ok) {
      throw new Error('Could not load metamodel.struml.json file');
    }
    
    const metamodel = await response.json();
    
    // Recursive function to find item by title
    const findItemByTitle = (items, title) => {
      if (!items || !Array.isArray(items)) return null;
      
      for (const item of items) {
        if (item.title === title) {
          return item;
        }
        
        if (item.items && item.items.length > 0) {
          const found = findItemByTitle(item.items, title);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // Find the item in the metamodel
    const foundItem = findItemByTitle(metamodel.items, itemTitle);
    
    if (!foundItem) {
      return null;
    }
    
    // Concatenate summary and description in Markdown format
    let markdownContent = '';
    
    if (foundItem.summary) {
      markdownContent += `## Summary\n\n${foundItem.summary}\n\n`;
    }
    
    if (foundItem.description) {
      markdownContent += `## Description\n\n${foundItem.description}`;
    }
    
    return markdownContent;
  } catch (error) {
    console.error('Error getting item information:', error);
    return null;
  }
};

// Function to get a sample item from sample.struml.json
window.StruMLApp.Utils.getSampleItem = async function(itemTitle) {
  try {
    // Load the sample.struml.json file
    const response = await fetch('./bm/sample.struml.json');
    if (!response.ok) {
      throw new Error('Could not load sample.struml.json file');
    }
    
    const sampleData = await response.json();
    
    // Recursive function to find item by title
    const findItemByTitle = (items, title) => {
      if (!items || !Array.isArray(items)) return null;
      
      for (const item of items) {
        if (item.title === title) {
          return item;
        }
        
        if (item.items && item.items.length > 0) {
          const found = findItemByTitle(item.items, title);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // Find the item in the sample data
    const foundItem = findItemByTitle(sampleData.items, itemTitle);
    
    // Return the complete item as JSON
    return foundItem ? JSON.stringify(foundItem, null, 2) : null;
  } catch (error) {
    console.error('Error getting sample item:', error);
    return null;
  }
};

// Function to load the prompt template from file
window.StruMLApp.Utils.loadPromptTemplate = async function(requestType) {
  try {
    // First, load the generic template
    const genericResponse = await fetch('./bm/prompt_generic_template.txt');
    if (!genericResponse.ok) {
      throw new Error('Could not load generic prompt template file');
    }
    const genericTemplate = await genericResponse.text();
    
    // Determine which specific template to load
    let specificTemplatePath = './bm/prompt_template.txt'; // Default template
    
    // Select the template based on the request type
    switch(requestType) {
      case 'create complete item':
        specificTemplatePath = './bm/prompt_template_create_item.txt';
        break;
      case 'suggest tags':
        specificTemplatePath = './bm/prompt_template_suggest_tags.txt';
        break;
      case 'suggest child items':
        specificTemplatePath = './bm/prompt_template_suggest_children.txt';
        break;
      case 'improve content':
        specificTemplatePath = './bm/prompt_template_improve_content.txt';
        break;
      default:
        // Use the default template for custom requests
        break;
    }
    
    // Load the specific template
    const specificResponse = await fetch(specificTemplatePath);
    if (!specificResponse.ok) {
      console.warn(`Could not load template ${specificTemplatePath}, falling back to default`);
      // If the specific template is not found, try to load the default template
      const defaultResponse = await fetch('./bm/prompt_template.txt');
      if (!defaultResponse.ok) {
        throw new Error('Could not load prompt template file');
      }
      return genericTemplate + "\n\n" + await defaultResponse.text();
    }
    
    // Combine the generic template with the specific template
    const specificTemplate = await specificResponse.text();
    return genericTemplate + "\n\n" + specificTemplate;
  } catch (error) {
    console.error('Error loading prompt template:', error);
    // Fallback template in case of error
    return 'Your task is to generate content for the item titled "{{itemTitle}}".';
  }
};

// Function to filter document structure excluding specific items
window.StruMLApp.Utils.filterDocumentStructure = function(document) {
  if (!document) return null;
  
  // Create a deep copy of the document
  const filteredDocument = window.StruMLApp.Utils.deepCopy(document);
  
  // Function to filter items recursively
  const filterItems = (items) => {
    if (!items || !Array.isArray(items)) return [];
    
    return items.filter(item => {
      // Exclude items with titles "Metamodel" or "🤖 AI Chats"
      if (item.title === "Metamodel" || item.title === "🤖 AI Chats") {
        return false;
      }
      
      // Process child items recursively
      if (item.items && item.items.length > 0) {
        item.items = filterItems(item.items);
      }
      
      return true;
    });
  };
  
  // Filter the items in the document
  filteredDocument.items = filterItems(filteredDocument.items);
  
  return filteredDocument;
};

// Function to find or create an AI Chats parent item
window.StruMLApp.Utils.findOrCreateAIChatsItem = function(document, createItemFn) {
  if (!document || !document.items) return null;
  
  // Try to find the AI Chats item
  const findAIChatsItem = (items) => {
    if (!items || !Array.isArray(items)) return null;
    
    for (const item of items) {
      if (item.title === "🤖 AI Chats") {
        return item;
      }
      
      if (item.items && item.items.length > 0) {
        const found = findAIChatsItem(item.items);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  // Look for the AI Chats item in the document
  let aiChatsItem = findAIChatsItem(document.items);
  
  // If not found and createItemFn is provided, create it
  if (!aiChatsItem && createItemFn) {
    const newItem = {
      id: window.StruMLApp.Utils.generateId(),
      title: "🤖 AI Chats",
      content: "This item contains all AI-generated chats.",
      tags: "system",
      items: []
    };
    
    // Create the item at the top level (no parent)
    const newItemId = createItemFn(null, newItem);
    
    // Return the newly created item
    if (newItemId) {
      aiChatsItem = newItem;
    }
  }
  
  return aiChatsItem;
};

// Function to generate LLM prompts based on item context
window.StruMLApp.Utils.generateItemPrompt = async function(inputData) {
  // Load the template based on the request type
  let promptTemplate = await window.StruMLApp.Utils.loadPromptTemplate(inputData.requestType);
  
  // Process the sampleItem
  const sampleItem = inputData.sampleItem || {};
  let sampleItemString = "No sample item example provided in context.";

  try {
    if (sampleItem && typeof sampleItem === 'object' && Object.keys(sampleItem).length > 0) {
      sampleItemString = JSON.stringify(sampleItem, null, 2);
      if (sampleItemString.length > 4000) {
        sampleItemString = sampleItemString.substring(0, 4000) + '\n... [truncated sampleItem example]';
        console.warn("SampleItem was truncated for the prompt.");
      }
    } else {
      console.log("sampleItem was empty or not provided.");
    }
  } catch (e) {
    console.error("Error stringifying sampleItem for prompt:", e);
    sampleItemString = "Error processing sample item example.";
  }
  
  // Filter the document structure to exclude specific items
  const filteredDocument = window.StruMLApp.Utils.filterDocumentStructure(inputData.context.documentStructure);
  
  // Prepare the context as string
  const contextString = JSON.stringify({
    currentItem: inputData.context.currentItem,
    userMessage: inputData.context.userMessage || "",
    // Include the filtered document structure
    documentStructure: filteredDocument
  }, null, 2);
  
  // Replace placeholders in the template
  promptTemplate = promptTemplate
    .replace(/{{ITEM_TITLE}}/g, inputData.itemTitle)
    .replace(/<ITEM_INFO>[\s\S]*?<\/ITEM_INFO>/g, `<ITEM_INFO>\n${inputData.markdownDescription || "No description available"}\n</ITEM_INFO>`)
    .replace(/<CONTEXT>[\s\S]*?<\/CONTEXT>/g, `<CONTEXT>\n${contextString}\n</CONTEXT>`)
    .replace(/<SAMPLE_ITEM>[\s\S]*?<\/SAMPLE_ITEM>/g, `<SAMPLE_ITEM>\n${sampleItemString}\n</SAMPLE_ITEM>`);
  
  // Return only the prompt text
  return promptTemplate;
};
