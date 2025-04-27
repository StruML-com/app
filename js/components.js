/**
 * StruML React Components
 */

// Header component
const Header = () => {
  const { state, actions } = useAppContext();
  const { document } = state;
  const { updateDocumentTitle, createNewDocument, importDocument, toggleSidebar } = actions;
  
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(document.title);
  
  React.useEffect(() => {
    setTitleValue(document.title);
  }, [document.title]);
  
  const handleTitleChange = (e) => {
    setTitleValue(e.target.value);
  };
  
  const handleTitleSubmit = () => {
    updateDocumentTitle(titleValue);
    setIsEditingTitle(false);
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitleValue(document.title);
      setIsEditingTitle(false);
    }
  };
  
  const handleImportClick = () => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.struml.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedDocument = JSON.parse(event.target.result);
          importDocument(importedDocument);
        } catch (error) {
          alert('Error importing document: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };
  
  const handleExportClick = (format) => {
    switch (format) {
      case 'json':
        window.StruMLApp.Utils.exportAsJson(document);
        break;
      case 'markdown':
        window.StruMLApp.Utils.exportAsMarkdown(document);
        break;
      case 'html':
        window.StruMLApp.Utils.exportAsHtml(document);
        break;
      case 'csv':
        window.StruMLApp.Utils.exportAsCsv(document);
        break;
      default:
        break;
    }
  };
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="mr-4 p-2 rounded-md hover:bg-gray-100"
          title="Toggle Sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
        
        {isEditingTitle ? (
          <input
            type="text"
            value={titleValue}
            onChange={handleTitleChange}
            onBlur={handleTitleSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="border border-gray-300 rounded-md px-2 py-1 text-lg font-medium"
          />
        ) : (
          <h1 
            onClick={() => setIsEditingTitle(true)}
            className="text-lg font-medium cursor-pointer hover:text-primary-600"
            title="Click to edit document title"
          >
            {document.title}
          </h1>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="relative dropdown">
          <button 
            className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100"
            onClick={(e) => {
              const dropdown = e.currentTarget.nextElementSibling;
              dropdown.classList.toggle('hidden');
              e.stopPropagation();
              
              const closeDropdown = () => {
                dropdown.classList.add('hidden');
                document.removeEventListener('click', closeDropdown);
              };
              
              document.addEventListener('click', closeDropdown);
            }}
          >
            File
          </button>
          <div className="absolute right-0 mt-1 w-48 bg-white shadow-lg rounded-md border border-gray-200 hidden z-10">
            <ul className="py-1">
              <li>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    createNewDocument();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  New Document
                </button>
              </li>
              <li>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImportClick();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Import Document
                </button>
              </li>
              <li className="border-t border-gray-200 mt-1 pt-1">
                <div className="px-4 py-1 text-xs text-gray-500">Export As</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportClick('json');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  JSON
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportClick('markdown');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  Markdown
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportClick('html');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  HTML
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportClick('csv');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  CSV
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

// Tag component
const Tag = ({ tag }) => {
  let tagClass = 'tag tag-default';
  
  if (tag.type === 'relation') {
    tagClass = 'tag tag-relation';
  } else if (tag.type !== 'default') {
    tagClass = `tag tag-${tag.type}`;
  }
  
  return (
    <span className={tagClass} title={tag.full}>
      {tag.full}
    </span>
  );
};

// Tags list component
const TagsList = ({ tagsString }) => {
  const tags = window.StruMLApp.Utils.parseTags(tagsString);
  
  if (!tags.length) return null;
  
  return (
    <div className="flex flex-wrap mt-1">
      {tags.map((tag, index) => (
        <Tag key={index} tag={tag} />
      ))}
    </div>
  );
};

// Tree item component with drag and drop functionality
const TreeItem = ({ item, level = 0, filteredItems }) => {
  const { state, actions } = useAppContext();
  const { selectedItemId, document } = state;
  const { selectItem, reorderItems } = actions;
  
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropPosition, setDropPosition] = React.useState(null);
  
  const hasChildren = item.items && item.items.length > 0;
  const isSelected = selectedItemId === item.id;
  
  const isVisible = (currentItem) => {
    if (!filteredItems) return true;
    if (filteredItems.includes(currentItem.id)) return true;
    
    if (currentItem.items && currentItem.items.length > 0) {
      return currentItem.items.some(isVisible);
    }
    
    return false;
  };
  
  const visibleChildren = hasChildren && filteredItems
    ? item.items.filter(isVisible)
    : item.items;
  
  const hasVisibleChildren = visibleChildren && visibleChildren.length > 0;
  
  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleSelect = () => {
    selectItem(item.id);
  };
  
  const isHighlighted = filteredItems && filteredItems.includes(item.id);
  
  // Drag and drop handlers
  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a delay to prevent immediate drag start
    setTimeout(() => {
      setIsDragging(true);
    }, 0);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
    setDropPosition(null);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isDragging) return; // Don't allow dropping onto self while dragging
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const relativeY = mouseY - rect.top;
    
    // Determine drop position (before, after, or inside)
    if (relativeY < rect.height * 0.25) {
      setDropPosition('before');
    } else if (relativeY > rect.height * 0.75) {
      setDropPosition('after');
    } else {
      // Always allow dropping inside, even if the item doesn't have children yet
      setDropPosition('inside');
    }
    
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDragLeave = () => {
    setDropPosition(null);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if this is a JSON item from the chatbot
    let jsonData = null;
    try {
      const jsonString = e.dataTransfer.getData('application/json');
      if (jsonString) {
        jsonData = JSON.parse(jsonString);
      }
    } catch (error) {
      console.error('Error parsing JSON data:', error);
    }
    
    if (jsonData) {
      // This is a new item from the chatbot
      
      // Determine the parent ID for the drop
      let targetParentId = null;
      
      if (dropPosition === 'inside') {
        // Drop as a child of this item
        targetParentId = item.id;
      } else {
        // Find the parent of this item
        const parentInfo = window.StruMLApp.DndUtils.findParentItem(document.items, item.id);
        
        if (parentInfo) {
          targetParentId = parentInfo.parent ? parentInfo.parent.id : null;
        } else {
          // This is a top-level item
          targetParentId = null;
        }
      }
      
      // Create a new item with the JSON data
      const newItem = {
        id: window.StruMLApp.Utils.generateId(),
        title: jsonData.title || "New Item",
        content: jsonData.content || "",
        tags: jsonData.tags || "",
        items: []
      };
      
      // Add child items if present
      if (jsonData.items && Array.isArray(jsonData.items)) {
        newItem.items = jsonData.items.map(childItem => ({
          id: window.StruMLApp.Utils.generateId(),
          title: childItem.title || "Child Item",
          content: childItem.content || "",
          tags: childItem.tags || "",
          items: []
        }));
      }
      
      // Add the new item to the document
      actions.createItem(targetParentId, newItem);
      window.StruMLApp.Utils.showAlert(`Added "${newItem.title}" to the document`, "success");
      
    } else {
      // This is an existing item being reordered
      const draggedItemId = e.dataTransfer.getData('text/plain');
      if (!draggedItemId || draggedItemId === item.id) {
        setDropPosition(null);
        return;
      }
      
      // Find the dragged item
      const draggedItem = window.StruMLApp.DndUtils.findItemById(document.items, draggedItemId)?.item;
      if (!draggedItem) {
        setDropPosition(null);
        return;
      }
      
      // Check if we can drop this item (prevent circular references)
      if (!window.StruMLApp.DndUtils.canDropItem(document.items, draggedItemId, item.id)) {
        setDropPosition(null);
        return;
      }
      
      // Determine the parent ID and position for the drop
      let targetParentId = null;
      let newIndex = 0;
      
      if (dropPosition === 'inside') {
        // Drop as a child of this item
        targetParentId = item.id;
        newIndex = 0; // Add to the beginning of children
      } else {
        // Find the parent of this item
        const parentInfo = window.StruMLApp.DndUtils.findParentItem(document.items, item.id);
        
        if (parentInfo) {
          targetParentId = parentInfo.parent ? parentInfo.parent.id : null;
          newIndex = dropPosition === 'before' ? parentInfo.index : parentInfo.index + 1;
        } else {
          // This is a top-level item
          targetParentId = null;
          
          // Find the index of this item in the top-level items
          const topLevelIndex = document.items.findIndex(i => i.id === item.id);
          newIndex = dropPosition === 'before' ? topLevelIndex : topLevelIndex + 1;
        }
      }
      
      // Show confirmation dialog
      window.StruMLApp.DndUtils.confirmItemMove(
        draggedItem,
        targetParentId ? window.StruMLApp.DndUtils.findItemById(document.items, targetParentId)?.item : null,
        () => {
          // Confirmed - perform the reordering
          reorderItems(draggedItemId, targetParentId, newIndex);
          window.StruMLApp.Utils.showAlert(`Item "${draggedItem.title}" moved successfully.`, "success");
        },
        () => {
          // Cancelled - do nothing
          window.StruMLApp.Utils.showAlert("Move cancelled.", "info");
        }
      );
    }
    
    setDropPosition(null);
  };
  
  return (
    <div>
      <div 
        className={`tree-item flex items-center px-2 py-1 cursor-pointer ${isSelected ? 'selected' : ''} ${isHighlighted ? 'bg-blue-50' : ''} ${isDragging ? 'is-dragging' : ''} ${dropPosition ? `drop-${dropPosition}` : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        draggable="true"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-item-id={item.id}
      >
        {/* Drop indicator */}
        {dropPosition && (
          <div className={`drop-indicator ${dropPosition} ${dropPosition === 'inside' ? 'active' : ''}`}></div>
        )}
        
        {/* Drag handle */}
        <div className="drag-handle mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-grip-vertical" viewBox="0 0 16 16">
            <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        </div>
        
        {hasVisibleChildren && (
          <button 
            onClick={toggleExpand}
            className="mr-1 p-1 rounded-md hover:bg-gray-200 doc-nav-toggle"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-3 w-3 transform ${isExpanded ? 'rotate-90' : ''}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        {!hasVisibleChildren && <div className="w-5"></div>}
        <span className="truncate">{item.title}</span>
        {item.items && item.items.length > 0 && (
          <span className="ml-1 text-xs text-gray-500">
            ({item.items.length})
          </span>
        )}
      </div>
      
      {hasVisibleChildren && isExpanded && (
        <div>
          {visibleChildren.map(childItem => (
            <TreeItem 
              key={childItem.id} 
              item={childItem} 
              level={level + 1}
              filteredItems={filteredItems}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Sidebar component
const Sidebar = () => {
  const { state, actions } = useAppContext();
  const { document, filteredItems, showTagFilter } = state;
  const { createItem, toggleTagFilter } = actions;
  
  // State for tracking expand/collapse all
  const [allExpanded, setAllExpanded] = React.useState(true);
  
  const isItemVisible = (item) => {
    if (!filteredItems) return true;
    const isVisible = (currentItem) => {
      if (filteredItems.includes(currentItem.id)) return true;
      if (currentItem.items && currentItem.items.length > 0) {
        return currentItem.items.some(isVisible);
      }
      return false;
    };
    return isVisible(item);
  };
  
  const visibleItems = filteredItems 
    ? document.items.filter(isItemVisible)
    : document.items;
  
  // Reference to the sidebar element
  const sidebarRef = React.useRef(null);
  
  // Function to expand or collapse all items
  const handleExpandCollapseAll = () => {
    const newExpandedState = !allExpanded;
    setAllExpanded(newExpandedState);
    
    // Function to recursively set the expanded state of all items
    const setExpandedStateForAllItems = (items, expanded) => {
      items.forEach(item => {
        // Set the expanded state for this item
        const itemId = item.id;
        const itemElement = sidebarRef.current.querySelector(`[data-item-id="${itemId}"]`);
        
        if (itemElement) {
          const toggleButton = itemElement.querySelector('.doc-nav-toggle');
          if (toggleButton) {
            const icon = toggleButton.querySelector('svg');
            const isCurrentlyExpanded = icon && icon.classList.contains('rotate-90');
            
            if (expanded && !isCurrentlyExpanded) {
              toggleButton.click(); // Expand if not already expanded
            } else if (!expanded && isCurrentlyExpanded) {
              toggleButton.click(); // Collapse if currently expanded
            }
          }
        }
        
        // Recursively set the expanded state for child items
        if (item.items && item.items.length > 0) {
          setExpandedStateForAllItems(item.items, expanded);
        }
      });
    };
    
    // Start the recursive process with the top-level items
    if (sidebarRef.current) {
      // Use the recursive function to handle all items
      setExpandedStateForAllItems(document.items, newExpandedState);
    }
  };
  
  return (
    <div ref={sidebarRef} className="w-96 border-r border-gray-200 bg-white h-full overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-medium">Document Structure</h2>
          <div className="flex items-center">
            <button 
              onClick={toggleTagFilter}
              className={`p-1 rounded-md hover:bg-gray-100 mr-1 ${showTagFilter ? 'text-blue-600' : ''}`}
              title="Toggle tag filter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={() => createItem()}
              className="p-1 rounded-md hover:bg-gray-100"
              title="Add top-level item"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Expand/Collapse All button */}
        <button 
          onClick={handleExpandCollapseAll}
          className="w-full py-1 px-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center justify-center"
          title={allExpanded ? "Collapse all items" : "Expand all items"}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 mr-1" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            {allExpanded ? (
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            )}
          </svg>
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>
      
      {showTagFilter && <TagFilter />}
      
      <div className="py-2 flex-1 overflow-y-auto">
        {visibleItems.map(item => (
          <TreeItem 
            key={item.id} 
            item={item} 
            filteredItems={filteredItems}
          />
        ))}
        
        {visibleItems.length === 0 && (
          <div className="px-4 py-3 text-gray-500 text-sm">
            {document.items.length === 0 
              ? "No items in this document. Click the + button to add an item."
              : "No items match the current filter."}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to find the path from root to an item
const findItemPath = (items, itemId, path = []) => {
  for (const item of items) {
    if (item.id === itemId) {
      return [...path, item];
    }
    
    if (item.items && item.items.length > 0) {
      const foundPath = findItemPath(item.items, itemId, [...path, item]);
      if (foundPath) return foundPath;
    }
  }
  
  return null;
};

// Breadcrumbs component
const Breadcrumbs = ({ item, document }) => {
  const { actions } = useAppContext();
  const { selectItem } = actions;
  
  // Find the path from root to the current item
  const path = findItemPath(document.items, item.id);
  
  if (!path || path.length <= 1) return null;
  
  return (
    <div className="flex items-center text-sm text-gray-500 mb-3 overflow-x-auto">
      {path.map((pathItem, index) => (
        <React.Fragment key={pathItem.id}>
          {index > 0 && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mx-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          )}
          <span 
            className={`hover:text-primary-600 cursor-pointer ${index === path.length - 1 ? 'font-medium text-gray-700' : ''}`}
            onClick={() => index < path.length - 1 && selectItem(pathItem.id)}
          >
            {pathItem.title}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

// Item view component
const ItemView = ({ item }) => {
  const { state, actions } = useAppContext();
  const { document, isChatbotOpen } = state;
  const { startEditingItem, deleteItem, createItem, selectItem, toggleChatbot } = actions;
  
  const handleEdit = () => {
    startEditingItem(item.id);
  };
  
  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteItem(item.id);
    }
  };
  
  const handleAddChild = () => {
    createItem(item.id);
  };
  
  const handleToggleChatbot = () => {
    toggleChatbot();
  };
  
  return (
    <div className="p-4">
      {/* Breadcrumbs navigation */}
      <Breadcrumbs item={item} document={document} />
      
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold">{item.title}</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleEdit}
            className="px-3 py-1 bg-primary-500 text-white rounded-md hover:bg-primary-600"
            title="Edit this item"
          >
            Edit
          </button>
          <button 
            onClick={handleAddChild}
            className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
            title="Add a child item"
          >
            Add Child
          </button>
          <button 
            onClick={handleDelete}
            className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
            title="Delete this item"
          >
            Delete
          </button>
          <button 
            onClick={handleToggleChatbot}
            className={`px-3 py-1 ${isChatbotOpen ? 'bg-purple-500 hover:bg-purple-600' : 'bg-purple-400 hover:bg-purple-500'} text-white rounded-md`}
            title={isChatbotOpen ? "Close AI Assistant" : "Open AI Assistant"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            {isChatbotOpen ? " Close AI" : " AI Assistant"}
          </button>
        </div>
      </div>
      
      <TagsList tagsString={item.tags} />
      
      {item.content && (
        <div 
          className="markdown-content mt-4 prose"
          dangerouslySetInnerHTML={{ __html: window.StruMLApp.Utils.renderMarkdown(item.content) }}
        ></div>
      )}
      
      {/* Relations - displayed below content */}
      <RelationsView item={item} allItems={document.items} />
      
      {item.items && item.items.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Child Items</h3>
          <div className="space-y-4">
            {item.items.map(childItem => (
              <ItemCard 
                key={childItem.id}
                item={childItem}
                onClick={() => selectItem(childItem.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Welcome screen component
const WelcomeScreen = () => {
  const { actions } = useAppContext();
  const { createItem } = actions;
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Welcome to StruML</h2>
      <p className="text-gray-600 mb-6 max-w-lg">
        StruML helps you create structured documents with hierarchical items, tags, and relations.
        Get started by creating your first item or selecting an existing one from the sidebar.
      </p>
      <button 
        onClick={() => createItem()}
        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
      >
        Create First Item
      </button>
      <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-lg">
        <h3 className="font-medium mb-2">Quick Tips:</h3>
        <ul className="text-left text-gray-600 space-y-2">
          <li>• Use the sidebar to navigate through your document structure</li>
          <li>• Add tags to items for better organization and filtering</li>
          <li>• Create relations between items to show connections</li>
          <li>• Use Markdown in the content field for rich formatting</li>
        </ul>
      </div>
    </div>
  );
};

// Item editor component
const ItemEditor = () => {
  const { state, actions } = useAppContext();
  const { editingItem } = state;
  const { updateEditingItem, saveEditingItem, cancelEditingItem } = actions;
  
  if (!editingItem) return null;
  
  const handleTitleChange = (e) => {
    updateEditingItem({ title: e.target.value });
  };
  
  const handleTagsChange = (e) => {
    // Handle both event objects and direct string values
    const tagsValue = typeof e === 'string' ? e : (e.target ? e.target.value : '');
    updateEditingItem({ tags: tagsValue });
  };
  
  const handleContentChange = (value) => {
    updateEditingItem({ content: value });
  };
  
  const handleSave = () => {
    saveEditingItem();
  };
  
  const handleCancel = () => {
    cancelEditingItem();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Edit Item</h2>
          <button 
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editingItem.title || ''}
              onChange={handleTitleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="mb-4">
            <TagSelector
              value={editingItem.tags || ''}
              onChange={handleTagsChange}
              allTags={window.StruMLApp.Utils.extractAllTags(state.document.items)}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <MarkdownEditor
              value={editingItem.content || ''}
              onChange={handleContentChange}
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
          >
            Save Changes
          </button>
          <button
            onClick={() => {
              handleSave();
              // Export the document as JSON after saving
              setTimeout(() => {
                window.StruMLApp.Utils.exportAsJson(state.document);
              }, 100);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Save and Export
          </button>
        </div>
      </div>
    </div>
  );
};

// Main content component
const MainContent = () => {
  const { state } = useAppContext();
  const { document, selectedItemId, isEditing, isChatbotOpen } = state;
  
  const selectedItem = selectedItemId 
    ? window.StruMLApp.Utils.findItemById(document.items, selectedItemId)
    : null;
  
  return (
    <div className="flex-1 overflow-hidden bg-white flex">
      <div className={`flex-1 overflow-y-auto ${isChatbotOpen ? 'w-2/3' : 'w-full'}`}>
        {selectedItem ? (
          <ItemView item={selectedItem} />
        ) : (
          // Make sure WelcomeScreen is defined before using it
          document.items.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">No Item Selected</h2>
              <p className="text-gray-600 mb-6 max-w-lg">
                Please select an item from the sidebar to view or edit its content.
              </p>
            </div>
          )
        )}
        
        {isEditing && <ItemEditor />}
      </div>
      
      {isChatbotOpen && (
        <div className="w-1/3 border-l border-gray-200">
          <ChatbotPanel />
        </div>
      )}
    </div>
  );
};
