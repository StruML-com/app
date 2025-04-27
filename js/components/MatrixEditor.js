/**
 * Matrix Editor Component
 * Provides UI for editing matrix relationships between two sets of items
 */

const MatrixEditor = ({ matrixItem, allItems, onSave, onCancel }) => {
  const [sourceItem, setSourceItem] = React.useState(null);
  const [targetItem, setTargetItem] = React.useState(null);
  const [cellValues, setCellValues] = React.useState([]);
  const [matrixData, setMatrixData] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Extract source and target items from matrix item tags
  React.useEffect(() => {
    if (!matrixItem || !matrixItem.tags || !allItems) return;
    
    setIsLoading(true);
    
    try {
      const tags = matrixItem.tags.split(',').map(tag => tag.trim());
      
      // Find source item tag
      const sourceItemTag = tags.find(tag => tag.startsWith('source-item::'));
      if (sourceItemTag) {
        const sourceItemTitle = sourceItemTag.split('::')[1];
        const foundSourceItem = findItemByTitle(allItems, sourceItemTitle);
        setSourceItem(foundSourceItem);
      }
      
      // Find target item tag
      const targetItemTag = tags.find(tag => tag.startsWith('target-item::'));
      if (targetItemTag) {
        const targetItemTitle = targetItemTag.split('::')[1];
        const foundTargetItem = findItemByTitle(allItems, targetItemTitle);
        setTargetItem(foundTargetItem);
      }
      
      // Find cell values
      const valuesTag = tags.find(tag => tag.startsWith('values::'));
      if (valuesTag) {
        const valuesString = valuesTag.split('::')[1];
        const values = valuesString.split(';').map(v => v.trim()).filter(v => v);
        setCellValues(values);
      }
    } catch (error) {
      console.error('Error parsing matrix item tags:', error);
    } finally {
      setIsLoading(false);
    }
  }, [matrixItem, allItems]);
  
  // Process matrix data when source and target items are available
  React.useEffect(() => {
    if (!sourceItem || !targetItem) return;
    
    // Filter out items with type tags
    const sourceChildren = sourceItem.items?.filter(item => 
      !item.tags || !item.tags.includes('type::')
    ) || [];
    
    const targetChildren = targetItem.items?.filter(item => 
      !item.tags || !item.tags.includes('type::')
    ) || [];
    
    // Create matrix data structure
    const data = {
      rows: sourceChildren.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content || ''
      })),
      columns: targetChildren.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content || ''
      })),
      values: cellValues,
      data: {}
    };
    
    // Initialize data cells
    sourceChildren.forEach(sourceChild => {
      data.data[sourceChild.id] = {};
      
      // Get relations from source child's tags
      const relations = extractRelations(sourceChild.tags || '');
      
      targetChildren.forEach(targetChild => {
        // Find if there's a relation to this target
        const relation = relations.find(rel => rel.target === targetChild.title);
        data.data[sourceChild.id][targetChild.id] = relation ? relation.relation : '';
      });
    });
    
    setMatrixData(data);
  }, [sourceItem, targetItem, cellValues]);
  
  // Handle source item selection change
  const handleSourceItemChange = (e) => {
    const selectedId = e.target.value;
    const selected = findItemById(allItems, selectedId);
    setSourceItem(selected);
  };
  
  // Handle target item selection change
  const handleTargetItemChange = (e) => {
    const selectedId = e.target.value;
    const selected = findItemById(allItems, selectedId);
    setTargetItem(selected);
  };
  
  // Handle cell values change
  const handleCellValuesChange = (e) => {
    const values = e.target.value.split(';').map(v => v.trim()).filter(v => v);
    setCellValues(values);
  };
  
  // Handle cell value change in the matrix
  const handleCellValueChange = (rowId, colId, value) => {
    setMatrixData(prevData => {
      if (!prevData) return null;
      
      const newData = { ...prevData };
      newData.data[rowId][colId] = value;
      
      return newData;
    });
  };
  
  // Handle save button click
  const handleSave = () => {
    if (!matrixData || !sourceItem || !targetItem) return;
    
    // Update relations in source items
    const updatedSourceItem = { ...sourceItem };
    
    // Update each child item's relations
    if (updatedSourceItem.items) {
      updatedSourceItem.items = updatedSourceItem.items.map(child => {
        if (!matrixData.data[child.id]) return child;
        
        // Get existing tags excluding relations to target items
        const existingTags = child.tags ? child.tags.split(',').map(tag => tag.trim()) : [];
        const nonRelationTags = existingTags.filter(tag => {
          if (!tag.includes('>>')) return true;
          
          // Check if this relation points to any target item
          const [_, target] = tag.split('>>');
          return !targetItem.items.some(targetChild => targetChild.title === target.trim());
        });
        
        // Add new relation tags
        const newRelationTags = [];
        
        targetItem.items.forEach(targetChild => {
          const relationValue = matrixData.data[child.id][targetChild.id];
          if (relationValue) {
            newRelationTags.push(`${relationValue}>>${targetChild.title}`);
          }
        });
        
        // Combine tags
        const updatedTags = [...nonRelationTags, ...newRelationTags].join(', ');
        
        return {
          ...child,
          tags: updatedTags
        };
      });
    }
    
    // Update matrix item tags
    const updatedMatrixItem = { ...matrixItem };
    
    // Update source-item and target-item tags
    let tags = updatedMatrixItem.tags ? updatedMatrixItem.tags.split(',').map(tag => tag.trim()) : [];
    
    // Remove existing source-item, target-item, and values tags
    tags = tags.filter(tag => 
      !tag.startsWith('source-item::') && 
      !tag.startsWith('target-item::') && 
      !tag.startsWith('values::')
    );
    
    // Add updated tags
    tags.push(`source-item::${sourceItem.title}`);
    tags.push(`target-item::${targetItem.title}`);
    
    if (cellValues.length > 0) {
      tags.push(`values::${cellValues.join(';')}`);
    }
    
    updatedMatrixItem.tags = tags.join(', ');
    
    // Call onSave with updated items
    if (typeof onSave === 'function') {
      onSave({
        matrixItem: updatedMatrixItem,
        sourceItem: updatedSourceItem
      });
    }
  };
  
  // Render matrix editor UI
  return (
    <div className="matrix-editor">
      <div className="mb-4">
        <div className="row g-3">
          <div className="col-md-5">
            <label className="form-label">Source Item (Rows)</label>
            <select 
              className="form-select"
              value={sourceItem?.id || ''}
              onChange={handleSourceItemChange}
              disabled={isLoading}
            >
              <option value="">Select source item...</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="col-md-5">
            <label className="form-label">Target Item (Columns)</label>
            <select 
              className="form-select"
              value={targetItem?.id || ''}
              onChange={handleTargetItemChange}
              disabled={isLoading}
            >
              <option value="">Select target item...</option>
              {allItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          
          <div className="col-md-2">
            <label className="form-label">Cell Values</label>
            <input 
              type="text"
              className="form-control"
              value={cellValues.join(';')}
              onChange={handleCellValuesChange}
              placeholder="value1;value2;value3"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
      
      {isLoading && (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading matrix data...</p>
        </div>
      )}
      
      {!isLoading && !matrixData && (
        <div className="alert alert-info">
          Please select source and target items to build the matrix.
        </div>
      )}
      
      {!isLoading && matrixData && (
        <div className="matrix-table-container">
          <table className="table table-bordered matrix-table">
            <thead>
              <tr>
                <th></th>
                {matrixData.columns.map(column => (
                  <th key={column.id} title={column.content || column.title}>
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixData.rows.map(row => (
                <tr key={row.id}>
                  <th title={row.content || row.title}>{row.title}</th>
                  {matrixData.columns.map(column => (
                    <td key={`${row.id}-${column.id}`}>
                      {cellValues.length > 0 ? (
                        <select 
                          className="form-select form-select-sm"
                          value={matrixData.data[row.id][column.id] || ''}
                          onChange={(e) => handleCellValueChange(row.id, column.id, e.target.value)}
                        >
                          <option value="">--</option>
                          {cellValues.map(value => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text"
                          className="form-control form-control-sm"
                          value={matrixData.data[row.id][column.id] || ''}
                          onChange={(e) => handleCellValueChange(row.id, column.id, e.target.value)}
                          placeholder="Relation"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="d-flex justify-content-end mt-4">
        <button 
          type="button"
          className="btn btn-secondary me-2"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isLoading || !matrixData}
        >
          Save Matrix
        </button>
      </div>
    </div>
  );
};
