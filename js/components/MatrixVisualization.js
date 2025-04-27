/**
 * Matrix Visualization Component
 * Provides visualization for relationships between two sets of items
 */

const MatrixVisualization = ({ sourceItem, targetItem, cellValues = [] }) => {
  const [visualizationType, setVisualizationType] = React.useState('heatmap');
  const [matrixData, setMatrixData] = React.useState(null);
  const [isEditing, setIsEditing] = React.useState(false);
  
  const heatmapRef = React.useRef(null);
  const sankeyRef = React.useRef(null);
  
  const { state, actions } = useAppContext();
  
  // Process matrix data from source and target items
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
  
  // Render visualizations when data changes
  React.useEffect(() => {
    if (!matrixData) return;
    
    if (visualizationType === 'heatmap' && heatmapRef.current) {
      renderHeatmap();
    } else if (visualizationType === 'sankey' && sankeyRef.current) {
      renderSankeyDiagram();
    }
  }, [matrixData, visualizationType]);
  
  // Render heatmap visualization
  const renderHeatmap = () => {
    if (!heatmapRef.current || !matrixData) return;
    
    const container = heatmapRef.current;
    container.innerHTML = '';
    
    // Create table for heatmap
    const table = document.createElement('table');
    table.className = 'matrix-heatmap';
    
    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Empty corner cell
    headerRow.appendChild(document.createElement('th'));
    
    // Column headers
    matrixData.columns.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column.title;
      th.title = column.content || column.title;
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body rows
    const tbody = document.createElement('tbody');
    
    matrixData.rows.forEach(row => {
      const tr = document.createElement('tr');
      
      // Row header
      const th = document.createElement('th');
      th.textContent = row.title;
      th.title = row.content || row.title;
      tr.appendChild(th);
      
      // Data cells
      matrixData.columns.forEach(column => {
        const td = document.createElement('td');
        const value = matrixData.data[row.id][column.id] || '';
        
        // Set cell content
        if (value) {
          td.textContent = value;
          
          // Set cell color based on relation type
          const relationStyle = getRelationStyle(value);
          td.className = relationStyle.color;
          
          // Add tooltip
          td.title = `${row.title} ${value} ${column.title}`;
        }
        
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
  };
  
  // Render Sankey diagram visualization
  const renderSankeyDiagram = () => {
    if (!sankeyRef.current || !matrixData || !window.d3) return;
    
    const container = sankeyRef.current;
    container.innerHTML = '';
    
    // Set dimensions
    const width = container.clientWidth || 600;
    const height = 400;
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Prepare data for Sankey diagram
    const nodes = [];
    const links = [];
    
    // Add source nodes
    matrixData.rows.forEach((row, index) => {
      nodes.push({ 
        name: row.title,
        id: row.id,
        group: 'source'
      });
    });
    
    // Add target nodes
    matrixData.columns.forEach((column, index) => {
      nodes.push({ 
        name: column.title,
        id: column.id,
        group: 'target'
      });
    });
    
    // Create links
    matrixData.rows.forEach((row, sourceIndex) => {
      matrixData.columns.forEach((column, targetIndex) => {
        const value = matrixData.data[row.id][column.id];
        if (value) {
          // Convert relation to numeric value
          const numericValue = getNumericValueForRelation(value);
          
          links.push({
            source: sourceIndex,
            target: matrixData.rows.length + targetIndex,
            value: numericValue,
            relation: value
          });
        }
      });
    });
    
    // Create Sankey generator
    const sankey = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [width - 1, height - 5]]);
    
    // Generate layout
    const graph = sankey({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });
    
    // Add links
    svg.append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', d => getRelationColor(d.relation))
      .attr('stroke-width', d => Math.max(1, d.width))
      .attr('fill', 'none')
      .attr('opacity', 0.5)
      .append('title')
      .text(d => `${d.source.name} ${d.relation} ${d.target.name}`);
    
    // Add nodes
    svg.append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => d.y1 - d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => d.group === 'source' ? '#3b82f6' : '#10b981')
      .attr('opacity', 0.8)
      .append('title')
      .text(d => d.name);
    
    // Add node labels
    svg.append('g')
      .selectAll('text')
      .data(graph.nodes)
      .join('text')
      .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
      .text(d => d.name)
      .attr('font-size', '10px');
  };
  
  // Helper function to get relation style
  const getRelationStyle = (relation) => {
    const relationTypes = {
      'depends': { color: 'bg-blue-100 text-blue-800' },
      'supports': { color: 'bg-green-100 text-green-800' },
      'contradicts': { color: 'bg-red-100 text-red-800' },
      'related': { color: 'bg-purple-100 text-purple-800' },
      'extremely-high': { color: 'bg-green-200 text-green-900' },
      'very-high': { color: 'bg-green-100 text-green-800' },
      'high': { color: 'bg-green-50 text-green-700' },
      'slightly-high': { color: 'bg-green-50 text-green-600' },
      'neutral': { color: 'bg-gray-100 text-gray-800' },
      'slightly-low': { color: 'bg-red-50 text-red-600' },
      'low': { color: 'bg-red-50 text-red-700' },
      'very-low': { color: 'bg-red-100 text-red-800' },
      'extremely-low': { color: 'bg-red-200 text-red-900' }
    };
    
    return relationTypes[relation] || { color: 'bg-gray-100 text-gray-800' };
  };
  
  // Helper function to get relation color for Sankey diagram
  const getRelationColor = (relation) => {
    const relationColors = {
      'depends': '#3b82f6', // blue
      'supports': '#10b981', // green
      'contradicts': '#ef4444', // red
      'related': '#8b5cf6', // purple
      'extremely-high': '#047857', // dark green
      'very-high': '#059669', // green
      'high': '#10b981', // light green
      'slightly-high': '#34d399', // very light green
      'neutral': '#6b7280', // gray
      'slightly-low': '#f87171', // light red
      'low': '#ef4444', // red
      'very-low': '#dc2626', // dark red
      'extremely-low': '#b91c1c' // very dark red
    };
    
    return relationColors[relation] || '#6b7280'; // default gray
  };
  
  // Helper function to get numeric value for relation
  const getNumericValueForRelation = (relation) => {
    const relationValues = {
      'extremely-high': 9,
      'very-high': 8,
      'high': 7,
      'slightly-high': 6,
      'neutral': 5,
      'slightly-low': 4,
      'low': 3,
      'very-low': 2,
      'extremely-low': 1,
      'depends': 5,
      'supports': 7,
      'contradicts': 3,
      'related': 5
    };
    
    return relationValues[relation] || 1;
  };
  
  // Handle visualization type change
  const handleVisualizationTypeChange = (type) => {
    setVisualizationType(type);
  };
  
  // Handle edit button click
  const handleEditClick = () => {
    setIsEditing(true);
    // Open matrix editor modal
    if (typeof actions.openMatrixEditor === 'function') {
      const matrixItem = {
        id: sourceItem.id + '-matrix-' + targetItem.id,
        title: `Matrix: ${sourceItem.title} x ${targetItem.title}`,
        tags: `type::matrix, source-item::${sourceItem.title}, target-item::${targetItem.title}`,
        content: `Matrix showing relationships between ${sourceItem.title} and ${targetItem.title}.`
      };
      
      if (cellValues.length > 0) {
        matrixItem.tags += `, values::${cellValues.join(';')}`;
      }
      
      actions.openMatrixEditor(matrixItem);
    }
  };
  
  return (
    <div className="matrix-visualization border rounded-md p-4 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Matrix Visualization</h3>
        <div className="flex space-x-2">
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn ${visualizationType === 'heatmap' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleVisualizationTypeChange('heatmap')}
            >
              <i className="bi bi-grid-3x3"></i> Heatmap
            </button>
            <button
              type="button"
              className={`btn ${visualizationType === 'sankey' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleVisualizationTypeChange('sankey')}
            >
              <i className="bi bi-diagram-3"></i> Sankey
            </button>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleEditClick}
          >
            <i className="bi bi-pencil"></i> Edit
          </button>
        </div>
      </div>
      
      <div className="visualization-container" style={{ minHeight: '300px' }}>
        <div 
          ref={heatmapRef} 
          className="heatmap-container"
          style={{ display: visualizationType === 'heatmap' ? 'block' : 'none' }}
        ></div>
        <div 
          ref={sankeyRef} 
          className="sankey-container"
          style={{ display: visualizationType === 'sankey' ? 'block' : 'none' }}
        ></div>
        
        {!matrixData && (
          <div className="alert alert-info">
            No matrix data available. Please edit the matrix to define relationships.
          </div>
        )}
      </div>
    </div>
  );
};
