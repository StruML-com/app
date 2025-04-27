/**
 * dnd-kit Utilities for StruML
 * This file contains helper functions for drag and drop functionality
 */

// Create a namespace for dnd-kit utilities
window.StruMLApp = window.StruMLApp || {};
window.StruMLApp.DndUtils = (() => {
  // Access the dnd-kit libraries from the global scope
  const DndKit = window.DndKit || {};
  const Sortable = window.Sortable || {};
  
  // Helper function to find an item by ID in the tree
  const findItemById = (items, id, path = []) => {
    for (let i = 0; i < items.length; i++) {
      const currentPath = [...path, i];
      if (items[i].id === id) {
        return {
          item: items[i],
          path: currentPath,
          index: i
        };
      }
      
      if (items[i].items && items[i].items.length > 0) {
        const result = findItemById(items[i].items, id, currentPath);
        if (result) return result;
      }
    }
    
    return null;
  };
  
  // Helper function to find the parent of an item
  const findParentItem = (items, id, parent = null, parentPath = []) => {
    for (let i = 0; i < items.length; i++) {
      const currentPath = [...parentPath, i];
      if (items[i].id === id) {
        return {
          parent,
          parentPath,
          index: i
        };
      }
      
      if (items[i].items && items[i].items.length > 0) {
        const result = findParentItem(items[i].items, id, items[i], currentPath);
        if (result) return result;
      }
    }
    
    return null;
  };
  
  // Helper function to get all item IDs in a flat array
  const flattenItemIds = (items) => {
    let ids = [];
    
    items.forEach(item => {
      ids.push(item.id);
      
      if (item.items && item.items.length > 0) {
        ids = [...ids, ...flattenItemIds(item.items)];
      }
    });
    
    return ids;
  };
  
  // Helper function to move an item in the tree
  const moveItem = (items, activeId, overId, position = 'after') => {
    // Find the active item and its parent
    const activeResult = findParentItem(items, activeId);
    if (!activeResult) return items;
    
    const { parent: activeParent, index: activeIndex } = activeResult;
    
    // Find the over item and its parent
    const overResult = findParentItem(items, overId);
    if (!overResult) return items;
    
    const { parent: overParent, index: overIndex } = overResult;
    
    // Create a deep copy of the items
    const newItems = JSON.parse(JSON.stringify(items));
    
    // Remove the active item from its current position
    let activeItem;
    if (activeParent) {
      // Find the active parent in the new items
      const newActiveParent = findItemById(newItems, activeParent.id).item;
      activeItem = newActiveParent.items.splice(activeIndex, 1)[0];
    } else {
      activeItem = newItems.splice(activeIndex, 1)[0];
    }
    
    // Insert the active item at its new position
    if (overParent) {
      // Find the over parent in the new items
      const newOverParent = findItemById(newItems, overParent.id).item;
      
      // Calculate the new index based on position
      const newIndex = position === 'after' ? overIndex + 1 : overIndex;
      
      // Insert the active item
      if (!newOverParent.items) newOverParent.items = [];
      newOverParent.items.splice(newIndex, 0, activeItem);
    } else {
      // Calculate the new index based on position
      const newIndex = position === 'after' ? overIndex + 1 : overIndex;
      
      // Insert the active item at the top level
      newItems.splice(newIndex, 0, activeItem);
    }
    
    return newItems;
  };
  
  // Helper function to determine if an item can be dropped at a position
  const canDropItem = (items, activeId, overId) => {
    // Don't allow dropping an item onto itself
    if (activeId === overId) return false;
    
    // Don't allow dropping a parent onto its child (would create circular reference)
    const activeItem = findItemById(items, activeId)?.item;
    if (!activeItem) return false;
    
    // Check if overId is a descendant of activeId
    const isDescendant = (parent, childId) => {
      if (!parent.items) return false;
      
      for (const child of parent.items) {
        if (child.id === childId) return true;
        if (isDescendant(child, childId)) return true;
      }
      
      return false;
    };
    
    return !isDescendant(activeItem, overId);
  };
  
  // Helper function to create a confirmation dialog for item moves
  const confirmItemMove = (sourceItem, targetParent, onConfirm, onCancel) => {
    // Directly call the confirm function without showing a modal
    // This is a simpler approach that doesn't require Bootstrap
    if (confirm(`Are you sure you want to move "${sourceItem.title}" ${targetParent ? `to be a child of "${targetParent.title}"` : 'to the top level'}?`)) {
      if (onConfirm) onConfirm();
    } else {
      if (onCancel) onCancel();
    }
  };
  
  // Return public methods
  return {
    findItemById,
    findParentItem,
    flattenItemIds,
    moveItem,
    canDropItem,
    confirmItemMove
  };
})();
