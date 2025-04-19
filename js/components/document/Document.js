/**
 * Document Component
 * Renders the main document content with all items
 */

import React from 'react';
import { DataContext } from '../../core/state.js';
import Item from '../item/Item.js';
import EmptyState from './EmptyState.js';
import { showDragConfirmation } from '../../components/navigation/NavigationUtils.js';

/**
 * Document component
 */
const Document = React.memo(() => {
    const context = React.useContext(DataContext);
    
    if (!context) {
        return <div>Loading document context...</div>;
    }
    
    const { 
        items, 
        filteredItems,
        activeTags,
        setItems
    } = context;
    
    const documentRef = React.useRef(null);
    
    // Memoize displayed items
    const displayItems = React.useMemo(() => {
        // Default to all items if filtering is active but filteredItems is somehow empty/invalid
        if (!activeTags.includes('all') && (!filteredItems || filteredItems.length === 0)) {
            return filteredItems || []; // Ensure it's at least an empty array
        }
        return activeTags.includes('all') ? items : (filteredItems || []); // Ensure filteredItems is an array
    }, [activeTags, items, filteredItems]);
    
    // Sortable drag handler
    const handleSortEnd = React.useCallback((evt) => {
        if (!displayItems || evt.oldIndex === undefined || evt.newIndex === undefined) {
            return;
        }
        
        if (evt.oldIndex < 0 || evt.oldIndex >= displayItems.length ||
            evt.newIndex < 0 || evt.newIndex >= displayItems.length) {
            return;
        }
        
        const sourceItem = displayItems[evt.oldIndex];
        if (!sourceItem) return;
        
        showDragConfirmation(
            sourceItem, 
            null,
            () => {
                const newItems = [...items];
                let sourceIndex = -1;
                for (let i = 0; i < newItems.length; i++) {
                    if (newItems[i].id === sourceItem.id) {
                        sourceIndex = i;
                        break;
                    }
                }
                
                if (sourceIndex >= 0) {
                    const [movedItem] = newItems.splice(sourceIndex, 1);
                    newItems.splice(evt.newIndex, 0, movedItem);
                    setItems(newItems);
                    window.StruMLApp.Utils.showAlert(`Item "${sourceItem.title}" moved successfully.`, "success");
                }
            },
            () => {
                setItems([...items]);
            }
        );
    }, [context, displayItems, items, setItems]);
    
    // Setup sortable for top-level items
    React.useEffect(() => {
        if (documentRef.current) {
            const sortable = new Sortable(documentRef.current, {
                group: 'items',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                handle: '.item-drag-handle',
                onEnd: handleSortEnd
            });
            
            return () => {
                if (sortable && typeof sortable.destroy === 'function') {
                    sortable.destroy();
                }
            };
        }
    }, [handleSortEnd]);
    
    // Handler to add top-level item
    const handleAddTopLevelItem = React.useCallback(() => {
        if (window.addTopLevelItem) {
            window.addTopLevelItem();
        }
    }, []);
    
    return (
        <div className="document-container">
            <div ref={documentRef} className="items-container">
                {displayItems.length > 0 ? (
                    displayItems.map(item => (
                        <Item key={item.id} item={item} />
                    ))
                ) : (
                    <EmptyState 
                        isFiltered={!activeTags.includes('all')} 
                        onAddItem={handleAddTopLevelItem} 
                    />
                )}
            </div>
        </div>
    );
});

export default Document;