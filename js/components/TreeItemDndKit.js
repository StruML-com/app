/**
 * TreeItemDndKit Component
 * A tree item component that uses dnd-kit for drag and drop functionality
 */

const TreeItemDndKit = ({ item, level = 0, filteredItems }) => {
  const { state, actions } = useAppContext();
  const { selectedItemId, document } = state;
  const { selectItem, reorderItems } = actions;
  
  const [isExpanded, setIsExpanded] = React.useState(true);
  
  // Get references to dnd-kit libraries
  const { useDraggable, useDroppable } = DndKit;
  
  // Set up draggable
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item }
  });
  
  // Set up droppable for before position
  const { setNodeRef: setBeforeDroppableRef, isOver: isOverBefore } = useDroppable({
    id: `${item.id}-before`,
    data: { 
      itemId: item.id,
      position: 'before'
    }
  });
  
  // Set up droppable for after position
  const { setNodeRef: setAfterDroppableRef, isOver: isOverAfter } = useDroppable({
    id: `${item.id}-after`,
    data: { 
      itemId: item.id,
      position: 'after'
    }
  });
  
  // Set up droppable for inside position
  const { setNodeRef: setInsideDroppableRef, isOver: isOverInside } = useDroppable({
    id: `${item.id}-inside`,
    data: { 
      itemId: item.id,
      position: 'inside'
    }
  });
  
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
  
  // Determine if any drop indicator should be shown
  const dropPosition = isOverBefore ? 'before' : isOverAfter ? 'after' : isOverInside ? 'inside' : null;
  
  return (
    <div>
      {/* Before drop area */}
      <div 
        ref={setBeforeDroppableRef}
        className={`h-2 ${isOverBefore ? 'bg-blue-100' : ''}`}
      ></div>
      
      <div 
        ref={setDraggableNodeRef}
        className={`tree-item flex items-center px-2 py-1 cursor-pointer ${isSelected ? 'selected' : ''} ${isHighlighted ? 'bg-blue-50' : ''} ${isDragging ? 'is-dragging' : ''} ${dropPosition ? `drop-${dropPosition}` : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleSelect}
        data-item-id={item.id}
        {...attributes}
        {...listeners}
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
      
      {/* Inside drop area - only visible when dragging */}
      <div 
        ref={setInsideDroppableRef}
        className={`h-full w-full ${isOverInside ? 'bg-blue-50' : ''}`}
        style={{ display: isDragging ? 'block' : 'none', minHeight: '10px' }}
      ></div>
      
      {/* After drop area */}
      <div 
        ref={setAfterDroppableRef}
        className={`h-2 ${isOverAfter ? 'bg-blue-100' : ''}`}
      ></div>
      
      {hasVisibleChildren && isExpanded && (
        <div>
          {visibleChildren.map(childItem => (
            <TreeItemDndKit 
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

// Export the component
window.StruMLApp.Components = window.StruMLApp.Components || {};
window.StruMLApp.Components.TreeItemDndKit = TreeItemDndKit;
