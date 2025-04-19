/**
 * Matrix Visualization Component
 * Renders matrix visualizations (heatmap and Sankey diagram)
 */

import React from 'react';
import { DataContext } from '../../core/state.js';
import { createHeatmap, createSankeyDiagram } from './MatrixUtils.js';

/**
 * Matrix Visualization component
 * @param {Object} props - Component props
 * @param {Object} props.item - Matrix item to visualize
 * @param {Array} props.items - All items in the document
 */
const MatrixVisualization = React.memo(({ item, items }) => {
    const [activeTab, setActiveTab] = React.useState('heatmap');
    const context = React.useContext(DataContext);
    
    // Refs for the visualization containers
    const heatmapRef = React.useRef(null);
    const sankeyRef = React.useRef(null);
    
    // Effect to create visualizations when component mounts or item changes
    React.useEffect(() => {
        if (activeTab === 'heatmap' && heatmapRef.current) {
            createHeatmap(heatmapRef.current, item, items);
        } else if (activeTab === 'sankey' && sankeyRef.current) {
            createSankeyDiagram(sankeyRef.current, item, items);
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
                <span>Matrix Visualizations (<i className="bi bi-beaker"></i>experimental feature)</span>
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

export default MatrixVisualization;