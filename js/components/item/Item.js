/**
 * Item Component
 * Renders a single item with all its properties
 */

import React from 'react';
import { DataContext } from '../../core/state.js';
import MatrixVisualization from '../matrix/MatrixVisualization.js';
import { 
    findItemById, 
    findItemByTitle, 
    findItemIdByTitle, 
    getTypeFromTags, 
    getListTypeIcon 
} from './ItemUtils.js';
import { 
    getRelationsFromTags, 
    getRelationColorClass 
} from '../../features/relations/RelationUtils.js';
import { 
    saveScrollPosition, 
    restoreScrollPosition, 
    renderMarkdown 
} from '../../core/utils.js';

/**
 * Item component
 * @param {Object} props - Component props
 * @param {Object} props.item - Item to render
 * @param {number} props.depth - Depth level of the item
 */
const Item = React.memo(({ item, depth = 0 }) => {
    const context = React.useContext(DataContext);
    if (!context) return <div>Loading...</div>;
    
    const {
        currentItemId,
        expandedItems,
        toggleItemExpansion,
        setCurrentItemId,
        setIsInfoPanelOpen,
        fetchMarkdownContent,
        reorderItems,
        addItem,
        items // Need full items list for context
    } = context;
    
    const isExpanded = expandedItems[item.id];
    const hasChildren = React.useMemo(() => Boolean(item.items && item.items.length > 0), [item.items]);
    const isSelected = currentItemId === item.id;
    const isMatrixItem = React.useMemo(() => Boolean(item.tags && item.tags.includes('type::matrix')), [item.tags]);
    
    const itemRef = React.useRef(null);
    const listType = React.useMemo(() => getTypeFromTags(item.tags) || '', [item.tags]);
    const listIcon = React.useMemo(() => getListTypeIcon(listType), [listType]);
    const listClass = listType ? `list-${listType}` : '';

    // Setup sortable for drag-and-drop
    React.useEffect(() => {
        if (itemRef.current && hasChildren && isExpanded) {
            const sortable = new Sortable(itemRef.current, {
                group: 'items',
                animation: 150,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                handle: '.item-drag-handle',
                onEnd: function(evt) {
                    if (!item.items || evt.oldIndex === undefined || evt.newIndex === undefined) {
                        return;
                    }
                    
                    if (evt.oldIndex < 0 || evt.oldIndex >= item.items.length ||
                        evt.newIndex < 0 || evt.newIndex >= item.items.length) {
                        return;
                    }

                    const sourceItem = item.items[evt.oldIndex];
                    if (!sourceItem) return;

                    const targetItem = item;
                    const originalItems = [...item.items];
                    
                    window.StruMLApp.Utils.showDragConfirmation(
                        sourceItem, 
                        targetItem,
                        () => {
                            reorderItems(sourceItem.id, item.id, evt.newIndex);
                            window.StruMLApp.Utils.showAlert(`Item "${sourceItem.title}" moved successfully.`, "success");
                        },
                        () => {
                            evt.from.classList.add('restoring');
                            setTimeout(() => {
                                evt.from.innerHTML = '';
                                originalItems.forEach(child => {
                                    const placeholder = document.createElement('div');
                                    placeholder.className = 'item-placeholder';
                                    placeholder.dataset.id = child.id;
                                    placeholder.innerHTML = '<div class="p-2">Restoring...</div>';
                                    evt.from.appendChild(placeholder);
                                });
                                
                                setTimeout(() => {
                                    context.updateDocumentNavigation();
                                    context.setItems(prevItems => [...prevItems]); 
                                    evt.from.classList.remove('restoring');
                                }, 50);
                            }, 50);
                        }
                    );
                }
            });
            
            return () => sortable.destroy();
        }
    }, [hasChildren, isExpanded, item, context, reorderItems]);

    // Memoized handlers
    const handleToggleExpand = React.useCallback(() => {
        toggleItemExpansion(item.id);
    }, [toggleItemExpansion, item.id]);

    const handleCreateMatrix = React.useCallback(() => {
        // Find if we have a Markers item
        const markersItem = findItemByTitle(context.items, "📄Markers");
        
        if (!markersItem) {
            window.StruMLApp.Utils.showAlert("No 'Markers' item found. Please create an item titled '📄Markers' first.", "warning");
            return;
        }
        
        // Create a matrix with the current item as source and Markers as target
        const matrixItem = {
            id: window.StruMLApp.Utils.generateItemId(),
            title: `Matrix: ${item.title} x Markers`,
            content: `Matrix showing relationship between ${item.title} elements and standard markers.`,
            tags: "type::matrix, source-item::" + item.title + ", target-item::📄Markers, values::🟥(-3);🔴(-2);▾(-1);▴(+1);🟢(+2);🟩(+3);🔹(1);🔷(2);🟦(3)"
        };
        
        context.addItem(matrixItem);
        setTimeout(() => {
            context.openMatrixEditor(matrixItem);
        }, 300);
    }, [context.items, context.addItem, context.openMatrixEditor, item.title]);

    const handleEditItem = React.useCallback(() => {
        // Save scroll position before opening modal
        saveScrollPosition();
        
        const modalElement = document.getElementById('item-editor-modal');
        if (!modalElement) return;
        const modal = new bootstrap.Modal(modalElement);
        const titleInput = document.getElementById('item-title');
        const tagsInput = document.getElementById('item-tags');
        const contentInput = document.getElementById('item-content');
        const idInput = document.getElementById('item-id');
        const originalTitleInput = document.getElementById('original-title');
        const parentIdInput = document.getElementById('parent-id');
        const relationsList = document.getElementById('relations-list');
        
        // Fill the form with current values
        if (titleInput) titleInput.value = item.title || '';
        if (originalTitleInput) originalTitleInput.value = item.title || '';
        if (tagsInput) tagsInput.value = item.tags || '';
        if (contentInput) contentInput.value = item.content || '';
        if (idInput) idInput.value = item.id;
        if (parentIdInput) parentIdInput.value = '';
        
        // Initialize SimpleMDE
        if (window.simpleMDE) {
            window.simpleMDE.value(item.content || '');
            setTimeout(() => window.simpleMDE.codemirror.refresh(), 10);
        } else if (contentInput) {
            window.simpleMDE = new SimpleMDE({ 
                element: contentInput,
                spellChecker: false,
                status: false
            });
        }
        
        // Initialize Tagify
        if (tagsInput) {
            if (!window.tagify) {
                // Get all tags from all items to use as whitelist
                const allTags = window.StruMLApp.Utils.extractAllTags(context.items);
                
                window.tagify = new Tagify(tagsInput, {
                    dropdown: {
                        enabled: 1,
                        maxItems: 5,
                        position: "text",
                        closeOnSelect: false,
                        highlightFirst: true,
                        searchKeys: ["value"]
                    },
                    whitelist: allTags,
                    enforceWhitelist: false,
                    pattern: /^(?!.*>>)/,
                    maxTags: 50
                });
                
                new DragSort(window.tagify.DOM.scope, {
                    selector: '.' + window.tagify.settings.classNames.tag,
                    callbacks: {
                        dragEnd: function() {
                            window.tagify.updateValueByDOMTags();
                        }
                    }
                });
            } else {
                window.tagify.removeAllTags();
                
                // Filter out relation tags
                const normalTags = item.tags ? item.tags.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => !tag.includes('>>'))
                    .join(', ') : '';
                
                window.tagify.addTags(normalTags);
                
                // Ensure DragSort is initialized after tags are added
                new DragSort(window.tagify.DOM.scope, {
                    selector: '.' + window.tagify.settings.classNames.tag,
                    callbacks: {
                        dragEnd: function() {
                            window.tagify.updateValueByDOMTags();
                        }
                    }
                });
            }
        }
        
        // Show relations in the relation list
        if (relationsList) {
            const relations = getRelationsFromTags(item.tags);
            relationsList.innerHTML = window.StruMLApp.Utils.renderRelationTags(relations);
            
            // Clear relation inputs
            const relationType = document.getElementById('relation-type');
            const relationTarget = document.getElementById('relation-target');
            if (relationType) relationType.value = '';
            if (relationTarget) relationTarget.value = '';
            
            // Setup click handler for removing relations
            relationsList.addEventListener('click', function(e) {
                if (e.target.tagName === 'BUTTON' || e.target.parentElement.tagName === 'BUTTON') {
                    const button = e.target.tagName === 'BUTTON' ? e.target : e.target.parentElement;
                    const relationStr = button.dataset.relation;
                    
                    if (relationStr && tagsInput) {
                        // Update item's tags by removing this relation
                        const newTags = window.StruMLApp.Utils.removeRelationFromTags(item.tags, relationStr.split('>>')[1]);
                        tagsInput.value = newTags; // Update the hidden input value
                        item.tags = newTags; // Update the item object directly for immediate feedback
                        
                        // Re-render relations list
                        const updatedRelations = getRelationsFromTags(newTags);
                        relationsList.innerHTML = window.StruMLApp.Utils.renderRelationTags(updatedRelations);
                    }
                }
            });
            
            // Setup add relation button
            const addRelationBtn = document.getElementById('add-relation-btn');
            if (addRelationBtn) {
                addRelationBtn.onclick = function() {
                    const relationTypeInput = document.getElementById('relation-type');
                    const targetTitleInput = document.getElementById('relation-target');
                    const relationType = relationTypeInput ? relationTypeInput.value : '';
                    const targetTitle = targetTitleInput ? targetTitleInput.value : '';

                    if (!relationType || !targetTitle) {
                        window.StruMLApp.Utils.showAlert("Please enter both relation type and target item", "warning");
                        return;
                    }
                    
                    // Add relation to tags
                    const currentTags = tagsInput ? tagsInput.value : item.tags;
                    const updatedTags = window.StruMLApp.Utils.addRelationToTags(currentTags, relationType, targetTitle);
                    if (tagsInput) tagsInput.value = updatedTags; // Update hidden input
                    item.tags = updatedTags; // Update item object

                    // Update relations list
                    const relations = getRelationsFromTags(updatedTags);
                    relationsList.innerHTML = window.StruMLApp.Utils.renderRelationTags(relations);
                    
                    // Clear inputs for next entry
                    if (relationTypeInput) relationTypeInput.value = '';
                    if (targetTitleInput) targetTitleInput.value = '';
                };
            }
        }
        
        const editorTitle = document.getElementById('item-editor-title');
        if (editorTitle) editorTitle.textContent = 'Edit Item';
        
        // Add event listener for modal hidden to restore scroll position
        modalElement.addEventListener('hidden.bs.modal', function onHidden() {
            restoreScrollPosition();
            modalElement.removeEventListener('hidden.bs.modal', onHidden);
        });
        
        modal.show();
    }, [context.items, item, context.openMatrixEditor]); // Added dependencies

    const handleOpenChat = React.useCallback(() => {
        setCurrentItemId(item.id);
        
        const contextSpan = document.getElementById('current-item-title');
         if (contextSpan) contextSpan.textContent = item.title;
         
         window.StruMLApp.Chatbot?.showPanel(); // Use new Chatbot module
     }, [setCurrentItemId, item.id, item.title]);

     const handleOpenInfo = React.useCallback(async () => {
        setCurrentItemId(item.id);
        await fetchMarkdownContent(item.title);
        setIsInfoPanelOpen(true);
        
        const panelTitle = document.getElementById('info-panel-title');
        if (panelTitle) panelTitle.textContent = `About ${item.title}`;
        
        window.StruMLApp.Main?.infoPanel?.show(); // Use global reference
    }, [context.items, fetchMarkdownContent, item, setCurrentItemId, setIsInfoPanelOpen]);

    const handleAddChild = React.useCallback(() => {
        // Save scroll position
        saveScrollPosition();
        
        const modalElement = document.getElementById('item-editor-modal');
        if (!modalElement) return;
        const modal = new bootstrap.Modal(modalElement);
        const titleInput = document.getElementById('item-title');
        const tagsInput = document.getElementById('item-tags');
        const contentInput = document.getElementById('item-content');
        const idInput = document.getElementById('item-id');
        const originalTitleInput = document.getElementById('original-title');
        const parentIdInput = document.getElementById('parent-id');
        const relationsList = document.getElementById('relations-list');
        
        if (titleInput) titleInput.value = '';
        if (originalTitleInput) originalTitleInput.value = '';
        if (tagsInput) tagsInput.value = '';
        if (contentInput) contentInput.value = '';
        if (idInput) idInput.value = '';
        if (parentIdInput) parentIdInput.value = item.id;
        
        if (window.simpleMDE) {
            window.simpleMDE.value('');
            setTimeout(() => window.simpleMDE.codemirror.refresh(), 10);
        } else if (contentInput) {
            window.simpleMDE = new SimpleMDE({ 
                element: contentInput,
                spellChecker: false,
                status: false
            });
        }
        
        if (tagsInput) {
            if (!window.tagify) {
                // Get all tags from all items to use as whitelist
                const allTags = window.StruMLApp.Utils.extractAllTags(context.items);
                
                window.tagify = new Tagify(tagsInput, {
                    dropdown: {
                        enabled: 1,
                        maxItems: 5,
                        position: "text",
                        closeOnSelect: false,
                        highlightFirst: true,
                        searchKeys: ["value"]
                    },
                    whitelist: allTags,
                    enforceWhitelist: false,
                    maxTags: 50
                });
                
                new DragSort(window.tagify.DOM.scope, {
                    selector: '.' + window.tagify.settings.classNames.tag,
                    callbacks: {
                        dragEnd: function() {
                            window.tagify.updateValueByDOMTags();
                        }
                    }
                });
            } else {
                window.tagify.removeAllTags();
                
                // Ensure DragSort is initialized after tags are cleared
                new DragSort(window.tagify.DOM.scope, {
                    selector: '.' + window.tagify.settings.classNames.tag,
                    callbacks: {
                        dragEnd: function() {
                            window.tagify.updateValueByDOMTags();
                        }
                    }
                });
            }
        }
        
        // Reset relations list
        if (relationsList) {
            relationsList.innerHTML = '<div class="alert alert-info">No relations defined</div>';
        }
        
        const editorTitle = document.getElementById('item-editor-title');
        if (editorTitle) editorTitle.textContent = 'Add New Item';
        
        // Add event listener for modal hidden to restore scroll position
        modalElement.addEventListener('hidden.bs.modal', function onHidden() {
            restoreScrollPosition();
            modalElement.removeEventListener('hidden.bs.modal', onHidden);
        });
        
        modal.show();
    }, [context.items, item.id]);

    // Memoized tag rendering
    const renderedTags = React.useMemo(() => {
        if (!item.tags) return []; // Return empty array if no tags
        
        return item.tags.split(',').map((tag, index) => {
            const trimmedTag = tag.trim();
            if (!trimmedTag) return null;
            
            // Skip relation tags and type tags
            if (trimmedTag.includes('>>') || trimmedTag.startsWith('type::')) return null;
            
            // Use the new unified tag class
            return (
                <span key={`${item.id}-tag-${index}`} className="strudol-tag">
                    {trimmedTag}
                </span>
            );
        }).filter(tag => tag !== null);
    }, [item.id, item.tags]);

    // Memoized outgoing relation calculation
    const outgoingRelations = React.useMemo(() => {
        if (!item.tags) return []; // Return empty array if no relations
        
        const relations = getRelationsFromTags(item.tags);
        if (relations.length === 0) return []; // Return empty array if no relations
        
        return relations; // Return the array of relation objects
    }, [item.tags]);

    // Memoized incoming relation calculation
    const incomingRelations = React.useMemo(() => {
        const incoming = [];
        if (!context || !context.items) return incoming; // Ensure context and items exist

        context.items.forEach(sourceItem => {
            if (sourceItem.id === item.id) return; // Don't link item to itself
            const relations = getRelationsFromTags(sourceItem.tags);
            relations.forEach(rel => {
                // Match both direct title matches and is>> relations
                if (rel.target === item.title || 
                    (rel.relation === 'is' && rel.target === item.title)) {
                    // Found an incoming relation
                    incoming.push({ 
                        ...rel, 
                        sourceTitle: sourceItem.title, 
                        sourceId: sourceItem.id,
                        relation: rel.relation === 'is' ? 'is' : rel.relation
                    });
                }
            });
        });
        return incoming;
    }, [context.items, item.id, item.title]);

    // Reusable function to render a single relation tag
    const renderSingleRelation = (rel, index, isIncoming = false) => {
        const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {};
        const relInfo = RELATION_TYPES[rel.relation] || { 
            icon: 'bi-link', 
            label: rel.relation,
            level: '' 
        };
        const colorClass = getRelationColorClass(rel.relation);
        const levelClass = colorClass || (relInfo.level ? `relation-${relInfo.level}` : '');
        const targetOrSourceTitle = isIncoming ? rel.sourceTitle : rel.target;
        const targetOrSourceId = isIncoming ? rel.sourceId : findItemIdByTitle(context.items, rel.target); // Find target ID for outgoing

        const handleClick = (e) => {
            e.preventDefault();
            if (targetOrSourceId) {
                context.scrollToItem(targetOrSourceId);
                context.setCurrentItemId(targetOrSourceId); // Also select the item
            } else {
                window.StruMLApp.Utils.showAlert(`Item "${targetOrSourceTitle}" not found.`, "warning");
            }
        };

        return (
            <span key={`${item.id}-${isIncoming ? 'in' : 'out'}-rel-${index}`} className={`relation-tag ${levelClass}`}>
                <i className={`bi ${relInfo.icon}`}></i>
                {isIncoming ? `${rel.sourceTitle} ${relInfo.label}` : `${relInfo.label}:`}
                &nbsp;
                <a href="#" onClick={handleClick} className="relation-target" title={`Go to item: ${targetOrSourceTitle}`}>
                    {isIncoming ? '' : targetOrSourceTitle}
                </a>
            </span>
        );
    };

    // Access global state for showing details
    const { showItemDetails } = context;

    return (
        <div className={`item-container ${listClass} ${hasChildren ? 'has-children' : ''} ${isSelected ? 'active' : ''}`} id={item.id} data-id={item.id}>
            <div className="item-header" id={`${encodeURIComponent(item.title.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\s-]/gu, '').toLowerCase())}`}>
                <div className="item-title-area">
                    <button 
                        className="btn btn-sm btn-link p-0 me-2"
                        onClick={handleToggleExpand}
                    >
                        <i className={`bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                    </button>
                    
                    <div className="item-icon">
                        <i className={`bi ${listIcon}`}></i>
                    </div>
                    
                    <h5 className="item-title">{item.title}</h5>
                    
                    <div className="item-actions">
                        <span className="item-drag-handle action-btn">
                            <i className="bi bi-arrows-move"></i>
                        </span>
                        
                        <button 
                            className="action-btn"
                            onClick={handleEditItem}
                            title="Edit this item"
                        >
                            <i className="bi bi-pencil"></i>
                        </button>
                        
                        <button
                            className="action-btn"
                            onClick={handleOpenInfo}
                            title="Learn more about this concept"
                        >
                            <i className="bi bi-info-circle"></i>
                        </button>
                        
                        {hasChildren && (
                            <button
                                className="action-btn"
                                onClick={handleCreateMatrix}
                                title="Create matrix with this item"
                            >
                                <i className="bi bi-table"></i>
                            </button>
                        )}
                        
                        <button
                            className="action-btn add-btn"
                            onClick={handleAddChild}
                            title="Add a child item"
                        >
                            <i className="bi bi-plus-circle"></i>
                        </button>
                        
                        <button
                            className="action-btn chatbot-btn"
                            onClick={handleOpenChat}
                            title="Ask AI about this item"
                            data-bs-toggle="tooltip" 
                            data-bs-placement="top" 
                            data-bs-title="Opens/closes the AI assistant panel for help and content generation."
                        >
                            <i className="bi bi-robot"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            {isExpanded && (
                <div className="item-content">
                    {item.content && (
                        <div 
                            className="markdown-content"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
                        ></div>
                    )}
                    
                    {/* Restore conditional rendering with explicit boolean check */}
                    {showItemDetails === true && (
                        <div className="item-details-section mt-2 pt-2">
                            {/* Tags Display Area */}
                    {renderedTags && renderedTags.length > 0 && (
                        <div className="d-flex align-items-center item-tags-display">
                            {renderedTags}
                        </div>
                    )}

                            {/* Relations Section */}
                            {(outgoingRelations.length > 0 || incomingRelations.length > 0) && (
                                <div className="row">
                                    {/* Left Column: Outgoing Relations */}
                                    <div className="col-md-6">
                                        <h6><i className="bi bi-arrow-right-circle me-1"></i>Outgoing Relations</h6>
                                        {outgoingRelations.length > 0 ? (
                                            <div className="relation-tags mt-2">
                                                {outgoingRelations.map((rel, index) => renderSingleRelation(rel, index, false))}
                                            </div>
                                        ) : (
                                            <div className="text-muted small mt-2">None</div>
                                        )}
                                    </div>

                                    {/* Right Column: Incoming Relations */}
                                    <div className="col-md-6">
                                        <h6><i className="bi bi-arrow-left-circle me-1"></i>Incoming Relations</h6>
                                        {incomingRelations.length > 0 ? (
                                            <div className="relation-tags mt-2">
                                                {incomingRelations.map((rel, index) => renderSingleRelation(rel, index, true))}
                                            </div>
                                        ) : (
                                            <div className="text-muted small mt-2">None</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Matrix Visualization (if applicable) - Placed after conditional details */}
                    {isMatrixItem && (
                        <MatrixVisualization item={item} items={context.items} />
                    )}
                </div>
            )}
            
            {hasChildren && (
                <div 
                    ref={itemRef}
                    className={`item-children collapse ${isExpanded ? 'show' : ''}`}
                    id={`collapse-${item.id}`}
                >
                    {item.items.map(child => (
                        <Item 
                            key={child.id} 
                            item={child} 
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
});

export default Item;