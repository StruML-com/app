/**
 * CSV Exporter
 * Handles export to CSV format
 */

/**
 * Export document data to CSV format
 * @param {Array} items - Document items
 * @returns {string} - CSV string representation of the document
 */
export function exportToCSV(items) {
    // CSV header
    let csv = 'Title,ParentItem,Content,Tags\n';
    
    const processItems = (itemsList, parent = '') => {
        if (!itemsList || !Array.isArray(itemsList)) return '';
        
        let result = '';
        
        itemsList.forEach(item => {
            // Escape fields for CSV - preserve newlines in content
            const escapedTitle = `"${item.title.replace(/"/g, '""')}"`;
            const escapedParentItem = `"${parent.replace(/"/g, '""')}"`;
            
            // Preserve newlines in content but make sure they're properly escaped for CSV
            // (Double quotes around field + double any internal quotes)
            let escapedContent = '""';
            if (item.content) {
                // Replace any double quotes with two double quotes (CSV escape)
                const contentWithEscapedQuotes = item.content.replace(/"/g, '""');
                // Keep newlines intact - they're allowed in CSV fields when the field is quoted
                escapedContent = `"${contentWithEscapedQuotes}"`;
            }
            
            const escapedTags = item.tags ? `"${item.tags.replace(/"/g, '""')}"` : '""';
            
            // Add row
            result += `${escapedTitle},${escapedParentItem},${escapedContent},${escapedTags}\n`;
            
            // Process children recursively with current item as parent
            if (item.items && item.items.length > 0) {
                result += processItems(item.items, item.title);
            }
        });
        
        return result;
    };
   
    csv += processItems(items);
    return csv;
}