/**
 * JSON Exporter
 * Handles export to JSON format
 */

/**
 * Export document data to JSON format
 * @param {Object} data - Document data (title, items)
 * @returns {string} - JSON string representation of the document
 */
export function exportToJSON(data) {
    if (!data) return '{}';
    
    // Create a deep copy of the data to modify for export
    const dataForExport = {
        title: data.title || "Untitled Document",
        items: JSON.parse(JSON.stringify(data.items || []))
    };
    
    // Remove IDs from the exported data
    const removeIdsRecursive = (items) => {
        if (!items || !Array.isArray(items)) return;
        
        items.forEach(item => {
            // Delete the ID property
            delete item.id;
            
            // Process children recursively
            if (item.items && Array.isArray(item.items)) {
                removeIdsRecursive(item.items);
            }
        });
    };
    
    removeIdsRecursive(dataForExport.items);
    
    // Return formatted JSON string
    return JSON.stringify(dataForExport, null, 2);
}