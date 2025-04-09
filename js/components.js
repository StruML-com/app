// Assign Components object to the global namespace
window.StruMLApp = window.StruMLApp || {};

window.StruMLApp.Components = (() => {
    // Access React, Utils, State from global scope
    const React = window.React;
    const Utils = window.StruMLApp.Utils;
    const { DataContext } = window.StruMLApp.State;
    const RELATION_TYPES = window.StruMLApp.Constants?.RELATION_TYPES || {}; // Access constants

    // Matrix Visualization component - improved with memoization
    const MatrixVisualization = React.memo(({ item, items }) => {
        const [activeTab, setActiveTab] = React.useState('heatmap');
        const context = React.useContext(DataContext);
        
        // Refs for the visualization containers
        const heatmapRef = React.useRef(null);
        const sankeyRef = React.useRef(null);
        
        // Effect to create visualizations when component mounts or item changes
        React.useEffect(() => {
            if (activeTab === 'heatmap' && heatmapRef.current) {
                Utils.createHeatmap(heatmapRef.current, item, items);
            } else if (activeTab === 'sankey' && sankeyRef.current) {
                Utils.createSankeyDiagram(sankeyRef.current, item, items);
            }
        }, [item, items, activeTab]);
        
        // Event handlers
        const handleTabChange = tab => {
            setActiveTab(tab);
        };
        
        const handleEditMatrix = () => {
            context.openMatrixEditor(item);
        };
        
        return (
            <div className="matrix-visualization">
                <div className="d-flex justify-content-between align-items-center matrix-visualization-title">
                <span>Matrix Visualizations (<i class="bi bi-beaker"></i>experimental feature)</span>
                <button 
                    className="btn btn-primary"
                    onClick={handleEditMatrix}
                >
                    <i className="bi bi-pencil me-1"></i> Edit Matrix
                </button>
                </div>
                <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                        <button 
                            className={`nav-link ${activeTab === 'heatmap' ? 'active' : ''}`}
                            onClick={() => handleTabChange('heatmap')}
                        >
                            <i className="bi bi-grid-3x3 me-1"></i> Heatmap
                        </button>
                    </li>
                    <li className="nav-item">
                        <button 
                            className={`nav-link ${activeTab === 'sankey' ? 'active' : ''}`}
                            onClick={() => handleTabChange('sankey')}
                        >
                            <i className="bi bi-diagram-3 me-1"></i> Sankey Diagram
                        </button>
                    </li>
                </ul>
                <div className="visualization-container">
                    <div ref={heatmapRef} style={{ display: activeTab === 'heatmap' ? 'block' : 'none' }}></div>
                    <div ref={sankeyRef} style={{ display: activeTab === 'sankey' ? 'block' : 'none' }}></div>
                </div>
            </div>
        );
    });

    // Empty State component for when no items are present
    const EmptyState = React.memo(({ isFiltered, onAddItem }) => {
        return (
            <div className="text-center py-5">
                <p className="lead">
                    {isFiltered 
                        ? 'No items found with the selected tags.' 
                        : 'No items yet. Create your first item to get started.'}
                </p>
                {!isFiltered && (
                    <button 
                        className="btn btn-primary"
                        onClick={onAddItem}
                    >
                        <i className="bi bi-plus-circle me-2"></i> Add First Item
                    </button>
                )}
            </div>
        );
    });

    // Item component - renders a single item with all its properties
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
        const listType = React.useMemo(() => Utils.getTypeFromTags(item.tags) || '', [item.tags]);
        const listIcon = React.useMemo(() => Utils.getListTypeIcon(listType), [listType]);
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
                        
                        Utils.showDragConfirmation(
                            sourceItem, 
                            targetItem,
                            () => {
                                reorderItems(sourceItem.id, item.id, evt.newIndex);
                                Utils.showAlert(`Item "${sourceItem.title}" moved successfully.`, "success");
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
            const markersItem = Utils.findItemByTitle(context.items, "📄Markers");
            
            if (!markersItem) {
                Utils.showAlert("No 'Markers' item found. Please create an item titled '📄Markers' first.", "warning");
                return;
            }
            
            // Create a matrix with the current item as source and Markers as target
            const matrixItem = {
                id: Utils.generateItemId(),
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
            Utils.saveScrollPosition();
            
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
                    const allTags = Utils.extractAllTags(context.items);
                    
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
                const relations = Utils.getRelationsFromTags(item.tags);
                relationsList.innerHTML = Utils.renderRelationTags(relations);
                
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
                            const newTags = Utils.removeRelationFromTags(item.tags, relationStr.split('>>')[1]);
                            tagsInput.value = newTags; // Update the hidden input value
                            item.tags = newTags; // Update the item object directly for immediate feedback
                            
                            // Re-render relations list
                            const updatedRelations = Utils.getRelationsFromTags(newTags);
                            relationsList.innerHTML = Utils.renderRelationTags(updatedRelations);
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
                            Utils.showAlert("Please enter both relation type and target item", "warning");
                            return;
                        }
                        
                        // Add relation to tags
                        const currentTags = tagsInput ? tagsInput.value : item.tags;
                        const updatedTags = Utils.addRelationToTags(currentTags, relationType, targetTitle);
                        if (tagsInput) tagsInput.value = updatedTags; // Update hidden input
                        item.tags = updatedTags; // Update item object

                        // Update relations list
                        const relations = Utils.getRelationsFromTags(updatedTags);
                        relationsList.innerHTML = Utils.renderRelationTags(relations);
                        
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
                Utils.restoreScrollPosition();
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
            
            // REMOVED: Utils.updateRelatedItems(context.items, item);
        }, [context.items, fetchMarkdownContent, item, setCurrentItemId, setIsInfoPanelOpen]);

        const handleAddChild = React.useCallback(() => {
            // Save scroll position
            Utils.saveScrollPosition();
            
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
                    const allTags = Utils.extractAllTags(context.items);
                    
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
                Utils.restoreScrollPosition();
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
            
            const relations = Utils.getRelationsFromTags(item.tags);
            if (relations.length === 0) return []; // Return empty array if no relations
            
            return relations; // Return the array of relation objects
        }, [item.tags]);

        // Memoized incoming relation calculation
        const incomingRelations = React.useMemo(() => {
            const incoming = [];
            if (!context || !context.items) return incoming; // Ensure context and items exist

            context.items.forEach(sourceItem => {
                if (sourceItem.id === item.id) return; // Don't link item to itself
                const relations = Utils.getRelationsFromTags(sourceItem.tags);
                relations.forEach(rel => {
                    if (rel.target === item.title) {
                        // Found an incoming relation
                        incoming.push({ ...rel, sourceTitle: sourceItem.title, sourceId: sourceItem.id }); // Add source title and ID
                    }
                });
            });
            return incoming;
        }, [context.items, item.id, item.title]);

        // Reusable function to render a single relation tag
        const renderSingleRelation = (rel, index, isIncoming = false) => {
            const relInfo = RELATION_TYPES[rel.relation] || { 
                icon: 'bi-link', 
                label: rel.relation,
                level: '' 
            };
            const colorClass = Utils.getRelationColorClass(rel.relation);
            const levelClass = colorClass || (relInfo.level ? `relation-${relInfo.level}` : '');
            const targetOrSourceTitle = isIncoming ? rel.sourceTitle : rel.target;
            const targetOrSourceId = isIncoming ? rel.sourceId : Utils.findItemIdByTitle(context.items, rel.target); // Find target ID for outgoing

            const handleClick = (e) => {
                e.preventDefault();
                if (targetOrSourceId) {
                    context.scrollToItem(targetOrSourceId);
                    context.setCurrentItemId(targetOrSourceId); // Also select the item
                } else {
                    Utils.showAlert(`Item "${targetOrSourceTitle}" not found.`, "warning");
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
            <div className={`item-container ${listClass} ${hasChildren ? 'has-children' : ''}`} id={item.id} data-id={item.id}>
                <div className={`item-header ${isSelected ? 'bg-light' : ''}`} id={`${encodeURIComponent(item.title.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}\s-]/gu, '').toLowerCase())}`}>
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
                        
                        {/* REMOVED Tag display from here */}
                        
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
                                dangerouslySetInnerHTML={{ __html: Utils.renderMarkdown(item.content) }}
                            ></div>
                        )}
                        
                        {/* Restore conditional rendering with explicit boolean check */}
                        {showItemDetails === true && (
                            <div className="item-details-section mt-3 border-top pt-3">
                                {/* Tags Display Area */}
                                {renderedTags && renderedTags.length > 0 && (
                                    <div className="item-tags-display mb-3">
                                        <h6><i className="bi bi-tags me-1"></i>Tags</h6>
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

    // Document component - Shows the document content
    const Document = React.memo(() => {
        const context = React.useContext(DataContext);
        
        if (!context) {
            return <div>Loading document context...</div>;
        }
        
        const { 
            items, 
            filteredItems,
            activeTags
        } = context;
        
        const documentRef = React.useRef(null);
        
        // Memoize displayed items
        const displayItems = React.useMemo(() => {
            // Default to all items if filtering is active but filteredItems is somehow empty/invalid
            if (!activeTags.includes('all') && (!filteredItems || filteredItems.length === 0)) {
                 // If filtering is active but results are empty, show all items as a fallback?
                 // Or perhaps better to rely on EmptyState? Let's stick to original logic for now.
                 // Consider adding a console warning here if filteredItems is empty when filtering.
                 // console.warn("Filtering active but filteredItems is empty. Showing EmptyState.");
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
            
            Utils.showDragConfirmation(
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
                        context.setItems(newItems);
                        Utils.showAlert(`Item "${sourceItem.title}" moved successfully.`, "success");
                    }
                },
                () => {
                    context.setItems([...items]);
                }
            );
        }, [context, displayItems, items]);
        
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

    // App component - Main application component
    const App = React.memo(() => {
        const [isInitialized, setIsInitialized] = React.useState(false);
        const context = React.useContext(DataContext);

        // Initialize event handlers and data
        React.useEffect(() => {
            // Setup handlers
            const destroyHandlers = window.StruMLApp.Main?.setupEventHandlers(); // Call from main.js
            
            // Try to load data from localStorage
            const savedData = localStorage.getItem(window.StruMLApp.Constants?.LOCAL_STORAGE_KEY);
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    if (parsedData && parsedData.items && parsedData.items.length > 0) {
                        window.StruMLApp.Main?.initializeApp(parsedData); // Call from main.js
                    }
                } catch (error) {
                    console.error("Failed to load data:", error);
                }
            }
            
            // Mark as initialized after setup
            setIsInitialized(true);

            return destroyHandlers;
        }, []);
        
        // Setup global app functions and load initial data if needed
         React.useEffect(() => {
           if (isInitialized && context) {
             window.app = context; // Make context globally available as window.app
 
             // Initialize the Chatbot module *after* context is available
             if (window.StruMLApp.Chatbot && typeof window.StruMLApp.Chatbot.init === 'function') {
                 console.log("Initializing Chatbot module..."); // Debug log
                 window.StruMLApp.Chatbot.init(context);
             } else {
                 console.error("Chatbot module or init function not found."); // Debug log
             }
 
             // Define function to add top level item globally
            window.addTopLevelItem = () => {
                // Save scroll position
                Utils.saveScrollPosition();
                
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
                
                // Clear form
                if (titleInput) titleInput.value = '';
                if (originalTitleInput) originalTitleInput.value = '';
                if (tagsInput) tagsInput.value = '';
                if (contentInput) contentInput.value = '';
                if (idInput) idInput.value = '';
                if (parentIdInput) parentIdInput.value = '';
                
                // Initialize or reset editor
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
                
                // Initialize or reset tagify
                if (tagsInput) {
                    if (!window.tagify) {
                        // Get all tags as whitelist
                        const allTags = Utils.extractAllTags(context.items);
                        
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
                    } else {
                        window.tagify.removeAllTags();
                    }
                }
                
                // Reset relations list
                if (relationsList) {
                    relationsList.innerHTML = '<div class="alert alert-info">No relations defined</div>';
                }
                
                const editorTitle = document.getElementById('item-editor-title');
                if (editorTitle) editorTitle.textContent = 'Add New Item';
                
                // Restore scroll position when modal closes
                modalElement.addEventListener('hidden.bs.modal', function onHidden() {
                    Utils.restoreScrollPosition();
                    modalElement.removeEventListener('hidden.bs.modal', onHidden);
                });
                
                modal.show();
            };

            // Load initial data if available (passed from main.js)
            if (window.initialData) {
                context.importDocument(window.initialData, window.initialFilename || "");
                window.initialData = null;
                window.initialFilename = null;
            }
          }
        }, [isInitialized, context]); // Depend on context being available
        
        if (!isInitialized || !context) {
            // Show loading or welcome screen until initialized
            return null; // Or a loading indicator
        }
        
        return <Document />;
    });

    // Application with context wrapper
    const AppWithContext = () => {
        const { DataProvider } = window.StruMLApp.State; // Get Provider from State
        return (
            <DataProvider>
                <App />
            </DataProvider>
        );
    };

    // Return the components
    return {
        MatrixVisualization,
        EmptyState,
        Item,
        Document,
        App,
        AppWithContext
    };
})();
