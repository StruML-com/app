/**
 * DraggableItemBadge Component
 * A reusable component that renders a draggable badge for an item
 * with a drag handle, item title, and click functionality
 */

const DraggableItemBadge = ({ item, onClick, onDragStart, onDragEnd, isDragging }) => {
  // Generate a unique ID for this badge
  const badgeId = `badge-${item.id || window.StruMLApp.Utils.generateId()}`;
  
  // Handle click on the badge
  const handleClick = () => {
    // Check if the item exists in the document structure
    const existsInDocument = item.id && window.StruMLApp.Utils.findItemById(
      window.StruMLApp.State.useAppContext().state.document.items, 
      item.id
    );
    
    if (existsInDocument) {
      // If the item exists, select it
      if (onClick) onClick(item);
    } else {
      // If the item doesn't exist, show an alert
      window.StruMLApp.Utils.showAlert(
        "Este ítem aún no existe. Arrástralo y suéltalo en el árbol de contenidos para crearlo.",
        "warning"
      );
    }
  };
  
  // Set up drag handlers
  const handleDragStart = (e) => {
    // Set the drag data
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData('text/plain', item.title);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add a class to the badge to indicate it's being dragged
    document.getElementById(badgeId).classList.add('dragging');
    
    // Call the onDragStart callback if provided
    if (onDragStart) onDragStart(item, e);
  };
  
  const handleDragEnd = (e) => {
    // Remove the dragging class
    document.getElementById(badgeId).classList.remove('dragging');
    
    // Call the onDragEnd callback if provided
    if (onDragEnd) onDragEnd(item, e);
  };
  
  return (
    <div 
      id={badgeId}
      className={`draggable-item-badge ${isDragging ? 'dragging' : ''}`}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      {/* Drag handle icon */}
      <div className="drag-handle">
        <i className="bi bi-grip-vertical"></i>
      </div>
      
      {/* Item title */}
      <div className="item-title">
        {item.title}
      </div>
      
      <style jsx>{`
        .draggable-item-badge {
          display: flex;
          align-items: center;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 0.5rem;
          margin-bottom: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .draggable-item-badge:hover {
          background-color: #e9ecef;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .draggable-item-badge.dragging {
          opacity: 0.5;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        .drag-handle {
          margin-right: 0.5rem;
          color: #6c757d;
          cursor: grab;
        }
        
        .item-title {
          flex: 1;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

// Export the component
window.StruMLApp.Components = window.StruMLApp.Components || {};
window.StruMLApp.Components.DraggableItemBadge = DraggableItemBadge;
