/**
 * Matrix utility functions
 * Contains utility functions specific to matrix visualization and editing
 */

import { findItemById } from '../../components/item/ItemUtils.js';
import { getNumericValueForRelation, getRelationsFromTags } from '../../features/relations/RelationUtils.js';

// Process matrix data for visualization
export function processMatrix(items, sourceItemId, targetItemId, cellValues = "") {
    if (!items || !sourceItemId || !targetItemId) return null;
    
    // Find source and target items
    const sourceItem = findItemById(items, sourceItemId);
    const targetItem = findItemById(items, targetItemId);
    
    if (!sourceItem || !targetItem) return null;
    if (!sourceItem.items || !sourceItem.items.length || !targetItem.items || !targetItem.items.length) return null;
    
    // Parse cell values if provided
    const cellValueOptions = cellValues.split(';').map(v => v.trim()).filter(v => v);
    
    // Create matrix data structure
    const matrix = {
        sourceItem,
        targetItem,
        rows: sourceItem.items.map(item => ({
            id: item.id,
            title: item.title
        })),
        columns: targetItem.items.map(item => ({
            id: item.id,
            title: item.title
        })),
        cellValues: cellValueOptions,
        data: {}
    };
    
    // Initialize empty data cells
    matrix.rows.forEach(row => {
        matrix.data[row.id] = {};
        matrix.columns.forEach(col => {
            matrix.data[row.id][col.id] = null;
        });
    });
    
    // Fill in existing relations
    matrix.rows.forEach(row => {
        const rowItem = findItemById(items, row.id);
        if (rowItem && rowItem.tags) {
            const relations = getRelationsFromTags(rowItem.tags);
            
            relations.forEach(rel => {
                // Find the target column item by title
                const targetCol = matrix.columns.find(col => {
                    const colItem = findItemById(items, col.id);
                    return colItem && colItem.title === rel.target;
                });
                
                if (targetCol) {
                    matrix.data[row.id][targetCol.id] = rel.relation;
                }
            });
        }
    });
    
    return matrix;
}

// Load matrix editor with data
export function loadMatrixEditor(matrix) {
    if (!matrix) return;
    
    const matrixContainer = document.getElementById('matrix-container');
    if (!matrixContainer) return;
    
    // Store current matrix in global variable for access by event handlers
    window.currentMatrix = matrix;
    
    // Create table
    let tableHtml = '<table class="matrix-table">';
    
    // Header row
    tableHtml += '<tr><th></th>';
    matrix.columns.forEach(col => {
        tableHtml += `<th title="${col.title}">${col.title.substring(0, 15)}${col.title.length > 15 ? '...' : ''}</th>`;
    });
    tableHtml += '</tr>';
    
    // Data rows
    matrix.rows.forEach(row => {
        tableHtml += `<tr><th title="${row.title}">${row.title.substring(0, 15)}${row.title.length > 15 ? '...' : ''}</th>`;
        
        matrix.columns.forEach(col => {
            const cellValue = matrix.data[row.id][col.id];
            const cellClass = cellValue ? 'has-value' : '';
            
            tableHtml += `
                <td class="${cellClass}">
                    <div class="matrix-cell-value" 
                         data-row-id="${row.id}" 
                         data-col-id="${col.id}"
                         data-row-title="${row.title}"
                         data-col-title="${col.title}"
                         data-value="${cellValue || ''}">
                        ${cellValue || ''}
                    </div>
                </td>
            `;
        });
        
        tableHtml += '</tr>';
    });
    
    tableHtml += '</table>';
    
    // Add the table to the container
    matrixContainer.innerHTML = tableHtml;
    
    // Add event listeners to cell values
    document.querySelectorAll('.matrix-cell-value').forEach(cell => {
        cell.addEventListener('click', function() {
            // Remove selected class from all cells
            document.querySelectorAll('.matrix-cell-value').forEach(c => c.classList.remove('selected'));
            
            // Add selected class to this cell
            this.classList.add('selected');
            
            // Show cell values if available
            if (matrix.cellValues && matrix.cellValues.length > 0) {
                const rowId = this.dataset.rowId;
                const colId = this.dataset.colId;
                const rowTitle = this.dataset.rowTitle;
                const colTitle = this.dataset.colTitle;
                
                // Create popup with cell value options
                const popup = document.createElement('div');
                popup.className = 'matrix-cell-popup';
                popup.style.position = 'absolute';
                popup.style.zIndex = '1000';
                popup.style.backgroundColor = 'white';
                popup.style.border = '1px solid #ccc';
                popup.style.borderRadius = '4px';
                popup.style.padding = '0.5rem';
                popup.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
                
                // Add header
                popup.innerHTML = `<div class="mb-2"><strong>${rowTitle}</strong> → <strong>${colTitle}</strong></div>`;
                
                // Add value options
                popup.innerHTML += '<div class="matrix-cell-options">';
                
                // Add empty option
                popup.innerHTML += `
                    <button class="btn btn-sm btn-outline-secondary mb-1 me-1" data-value="">
                        Clear
                    </button>
                `;
                
                // Add cell value options
                matrix.cellValues.forEach(value => {
                    const isSelected = value === this.dataset.value;
                    popup.innerHTML += `
                        <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-primary'} mb-1 me-1" data-value="${value}">
                            ${value}
                        </button>
                    `;
                });
                
                popup.innerHTML += '</div>';
                
                // Position popup near the cell
                const rect = this.getBoundingClientRect();
                const containerRect = matrixContainer.getBoundingClientRect();
                
                popup.style.left = (rect.left - containerRect.left + matrixContainer.scrollLeft) + 'px';
                popup.style.top = (rect.bottom - containerRect.top + matrixContainer.scrollTop) + 'px';
                
                // Add to container
                matrixContainer.appendChild(popup);
                
                // Add event listeners to buttons
                popup.querySelectorAll('button').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const value = this.dataset.value;
                        
                        // Update cell value
                        cell.textContent = value;
                        cell.dataset.value = value;
                        
                        // Update matrix data
                        matrix.data[rowId][colId] = value;
                        
                        // Remove popup
                        popup.remove();
                    });
                });
                
                // Close popup when clicking outside
                document.addEventListener('click', function closePopup(e) {
                    if (!popup.contains(e.target) && e.target !== cell) {
                        popup.remove();
                        document.removeEventListener('click', closePopup);
                    }
                });
            }
        });
        
        // Add tooltip on hover
        cell.addEventListener('mouseenter', function(e) {
            showMatrixCellTooltip(e, this);
        });
        
        cell.addEventListener('mouseleave', function() {
            hideMatrixCellTooltip();
        });
    });
}

// Show tooltip for matrix cell
export function showMatrixCellTooltip(event, item) {
    const tooltip = document.getElementById('matrix-cell-tooltip');
    if (!tooltip) return;
    
    const rowTitle = item.dataset.rowTitle;
    const colTitle = item.dataset.colTitle;
    const value = item.dataset.value;
    
    tooltip.innerHTML = `
        <div><strong>From:</strong> ${rowTitle}</div>
        <div><strong>To:</strong> ${colTitle}</div>
        ${value ? `<div><strong>Relation:</strong> ${value}</div>` : '<div>No relation set</div>'}
    `;
    
    tooltip.style.display = 'block';
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
}

// Hide matrix cell tooltip
export function hideMatrixCellTooltip() {
    const tooltip = document.getElementById('matrix-cell-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Save matrix changes to items
export function saveMatrixChanges(matrix) {
    if (!matrix) return false;
    
    try {
        // For each row, update its relations
        matrix.rows.forEach(row => {
            // Find the actual item
            const rowItem = findItemById(window.app.items, row.id);
            if (!rowItem) return;
            
            // Get existing tags without relations to columns
            let tags = rowItem.tags || '';
            
            // Remove existing relations to column items
            matrix.columns.forEach(col => {
                const colItem = findItemById(window.app.items, col.id);
                if (colItem) {
                    // Remove relation to this column item if it exists
                    tags = tags.split(',')
                        .map(tag => tag.trim())
                        .filter(tag => {
                            if (!tag.includes('>>')) return true;
                            const target = tag.split('>>')[1].trim();
                            return target !== colItem.title;
                        })
                        .join(', ');
                }
            });
            
            // Add new relations based on matrix data
            matrix.columns.forEach(col => {
                const value = matrix.data[row.id][col.id];
                if (value) {
                    const colItem = findItemById(window.app.items, col.id);
                    if (colItem) {
                        // Add relation tag
                        if (tags) {
                            tags += ', ';
                        }
                        tags += `${value}>>${colItem.title}`;
                    }
                }
            });
            
            // Update the item
            rowItem.tags = tags;
            window.app.updateItem(rowItem);
        });
        
        return true;
    } catch (error) {
        console.error("Error saving matrix changes:", error);
        return false;
    }
}

// Create heatmap visualization
export function createHeatmap(container, matrixItem, items) {
    if (!container || !matrixItem || !items) return;
    
    // Extract source and target items from tags
    const tags = matrixItem.tags ? matrixItem.tags.split(',').map(tag => tag.trim()) : [];
    const sourceItemTag = tags.find(tag => tag.startsWith('source-item::'));
    const targetItemTag = tags.find(tag => tag.startsWith('target-item::'));
    const valuesTag = tags.find(tag => tag.startsWith('values::'));
    
    if (!sourceItemTag || !targetItemTag) {
        container.innerHTML = '<div class="alert alert-warning">Matrix configuration is incomplete. Please edit the matrix item.</div>';
        return;
    }
    
    // Extract titles
    const sourceItemTitle = sourceItemTag.split('::')[1];
    const targetItemTitle = targetItemTag.split('::')[1];
    
    // Find source and target items
    const sourceItem = window.StruMLApp.Utils.findItemByTitle(items, sourceItemTitle);
    const targetItem = window.StruMLApp.Utils.findItemByTitle(items, targetItemTitle);
    
    if (!sourceItem || !targetItem) {
        container.innerHTML = '<div class="alert alert-warning">Source or target items not found. Please check matrix configuration.</div>';
        return;
    }
    
    // Parse cell values if provided
    const cellValues = valuesTag ? valuesTag.split('::')[1].split(';').map(v => v.trim()) : [];
    
    // Prepare data for heatmap
    const rows = [];
    const maxValue = 9; // Maximum value for color scale
    
    // Process each row (source item's children)
    if (sourceItem.items && sourceItem.items.length > 0) {
        sourceItem.items.forEach(rowItem => {
            const rowData = {
                id: rowItem.id,
                title: rowItem.title,
                values: []
            };
            
            // Get relations from this row item
            const relations = rowItem.tags ? window.StruMLApp.Utils.getRelationsFromTags(rowItem.tags) : [];
            
            // Process each column (target item's children)
            if (targetItem.items && targetItem.items.length > 0) {
                targetItem.items.forEach(colItem => {
                    // Find relation to this column item
                    const relation = relations.find(rel => rel.target === colItem.title);
                    
                    // Get numeric value for the relation
                    const value = relation 
                        ? window.StruMLApp.Utils.getNumericValueForRelation(relation.relation) 
                        : 0;
                    
                    rowData.values.push({
                        colId: colItem.id,
                        colTitle: colItem.title,
                        value: value,
                        relation: relation ? relation.relation : null
                    });
                });
            }
            
            rows.push(rowData);
        });
    }
    
    // Create heatmap using D3
    const margin = { top: 80, right: 25, bottom: 30, left: 150 };
    const width = Math.max(500, 150 + (targetItem.items?.length || 0) * 40);
    const height = Math.max(300, 80 + (sourceItem.items?.length || 0) * 25);
    
    // Clear container
    container.innerHTML = '';
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = d3.scaleBand()
        .range([0, width])
        .domain(targetItem.items?.map(d => d.title) || [])
        .padding(0.05);
    
    const y = d3.scaleBand()
        .range([0, height])
        .domain(sourceItem.items?.map(d => d.title) || [])
        .padding(0.05);
    
    // Create color scale
    const colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateBlues)
        .domain([0, maxValue]);
    
    // Add X axis labels
    svg.append('g')
        .style('font-size', 12)
        .attr('transform', `translate(0,-10)`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('class', 'heatmap-column-label')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end');
    
    // Add Y axis labels
    svg.append('g')
        .style('font-size', 12)
        .call(d3.axisLeft(y).tickSize(0))
        .attr('class', 'heatmap-row-label');
    
    // Create tooltip
    const tooltip = d3.select('#d3-tooltip');
    
    // Add heatmap cells
    rows.forEach(row => {
        row.values.forEach(cell => {
            const colTitle = cell.colTitle;
            const rowTitle = row.title;
            
            svg.append('rect')
                .attr('x', x(colTitle))
                .attr('y', y(rowTitle))
                .attr('width', x.bandwidth())
                .attr('height', y.bandwidth())
                .attr('class', 'heatmap-cell')
                .style('fill', cell.value ? colorScale(cell.value) : '#f8f9fa')
                .on('mouseover', function(event) {
                    tooltip.style('display', 'block')
                        .html(`
                            <div><strong>From:</strong> ${rowTitle}</div>
                            <div><strong>To:</strong> ${colTitle}</div>
                            ${cell.relation ? `<div><strong>Relation:</strong> ${cell.relation}</div>` : '<div>No relation</div>'}
                            ${cell.value ? `<div><strong>Value:</strong> ${cell.value}</div>` : ''}
                        `)
                        .style('left', (event.pageX + 10) + 'px')
                        .style('top', (event.pageY + 10) + 'px');
                })
                .on('mouseout', function() {
                    tooltip.style('display', 'none');
                });
        });
    });
}

// Create Sankey diagram visualization
export function createSankeyDiagram(container, matrixItem, items) {
    if (!container || !matrixItem || !items) return;
    
    // Extract source and target items from tags
    const tags = matrixItem.tags ? matrixItem.tags.split(',').map(tag => tag.trim()) : [];
    const sourceItemTag = tags.find(tag => tag.startsWith('source-item::'));
    const targetItemTag = tags.find(tag => tag.startsWith('target-item::'));
    
    if (!sourceItemTag || !targetItemTag) {
        container.innerHTML = '<div class="alert alert-warning">Matrix configuration is incomplete. Please edit the matrix item.</div>';
        return;
    }
    
    // Extract titles
    const sourceItemTitle = sourceItemTag.split('::')[1];
    const targetItemTitle = targetItemTag.split('::')[1];
    
    // Find source and target items
    const sourceItem = window.StruMLApp.Utils.findItemByTitle(items, sourceItemTitle);
    const targetItem = window.StruMLApp.Utils.findItemByTitle(items, targetItemTitle);
    
    if (!sourceItem || !targetItem) {
        container.innerHTML = '<div class="alert alert-warning">Source or target items not found. Please check matrix configuration.</div>';
        return;
    }
    
    // Prepare data for Sankey diagram
    const nodes = [];
    const links = [];
    
    // Add source nodes
    if (sourceItem.items && sourceItem.items.length > 0) {
        sourceItem.items.forEach((item, index) => {
            nodes.push({
                id: item.id,
                name: item.title,
                group: 'source'
            });
        });
    }
    
    // Add target nodes
    if (targetItem.items && targetItem.items.length > 0) {
        targetItem.items.forEach((item, index) => {
            nodes.push({
                id: item.id,
                name: item.title,
                group: 'target'
            });
        });
    }
    
    // Add links between nodes
    if (sourceItem.items && sourceItem.items.length > 0) {
        sourceItem.items.forEach(sourceChild => {
            // Get relations from this source item
            const relations = sourceChild.tags ? window.StruMLApp.Utils.getRelationsFromTags(sourceChild.tags) : [];
            
            // Process relations to target items
            relations.forEach(relation => {
                // Find target node by title
                const targetNode = nodes.find(node => 
                    node.group === 'target' && 
                    node.name === relation.target
                );
                
                if (targetNode) {
                    // Get numeric value for the relation
                    const value = window.StruMLApp.Utils.getNumericValueForRelation(relation.relation);
                    
                    // Add link
                    links.push({
                        source: sourceChild.id,
                        target: targetNode.id,
                        value: value,
                        relation: relation.relation
                    });
                }
            });
        });
    }
    
    // Create Sankey diagram using D3
    const width = Math.max(600, container.clientWidth);
    const height = Math.max(400, 100 + nodes.length * 15);
    
    // Clear container
    container.innerHTML = '';
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Create Sankey generator
    const sankey = d3.sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 5], [width - 1, height - 5]]);
    
    // Format data for Sankey
    const graph = {
        nodes: nodes,
        links: links.map(d => ({...d}))
    };
    
    // Generate Sankey layout
    const {nodes: sankeyNodes, links: sankeyLinks} = sankey(graph);
    
    // Create tooltip
    const tooltip = d3.select('#d3-tooltip');
    
    // Add links
    svg.append('g')
        .selectAll('path')
        .data(sankeyLinks)
        .join('path')
        .attr('class', 'sankey-link')
        .attr('d', d3.sankeyLinkHorizontal())
        .style('stroke', d => {
            // Color based on relation value
            const value = d.value;
            return d3.interpolateBlues(value / 9);
        })
        .style('stroke-width', d => Math.max(1, d.width))
        .on('mouseover', function(event, d) {
            tooltip.style('display', 'block')
                .html(`
                    <div><strong>From:</strong> ${d.source.name}</div>
                    <div><strong>To:</strong> ${d.target.name}</div>
                    <div><strong>Relation:</strong> ${d.relation}</div>
                    <div><strong>Value:</strong> ${d.value}</div>
                `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('display', 'none');
        });
    
    // Add nodes
    const node = svg.append('g')
        .selectAll('rect')
        .data(sankeyNodes)
        .join('rect')
        .attr('class', 'sankey-node')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('height', d => d.y1 - d.y0)
        .attr('width', d => d.x1 - d.x0)
        .style('fill', d => d.group === 'source' ? '#6c757d' : '#007bff')
        .on('mouseover', function(event, d) {
            tooltip.style('display', 'block')
                .html(`<div><strong>${d.name}</strong></div>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY + 10) + 'px');
        })
        .on('mouseout', function() {
            tooltip.style('display', 'none');
        });
    
    // Add node labels
    svg.append('g')
        .selectAll('text')
        .data(sankeyNodes)
        .join('text')
        .attr('class', 'sankey-node-label')
        .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr('y', d => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
        .text(d => d.name)
        .style('font-size', '10px')
        .style('pointer-events', 'none');
}