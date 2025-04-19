/**
 * Markdown Exporter
 * Handles export to Markdown format
 */

/**
 * Export document data to Markdown format
 * @param {Array} items - Document items
 * @param {string} documentTitle - Document title
 * @returns {string} - Markdown string representation of the document
 */
export function exportToMarkdown(items, documentTitle) {
    let markdown = `# ${documentTitle || 'Untitled Document'}\n\n`;
    
    const processItems = (itemsList, depth = 0) => {
        if (!itemsList || !Array.isArray(itemsList)) return '';
        
        let result = '';
        
        itemsList.forEach(item => {
            // Add heading based on depth
            const heading = '#'.repeat(Math.min(depth + 2, 6));
            result += `${heading} ${item.title}\n\n`;
            
            // Add tags if available
            if (item.tags) {
                const tags = item.tags.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => !tag.includes('>>') && !tag.startsWith('type::'))
                    .join(', ');
                
                if (tags) {
                    result += `**Tags:** ${tags}\n\n`;
                }
            }
            
            // Add content if available
            if (item.content) {
                result += `${item.content}\n\n`;
            }
            
            // Process children recursively
            if (item.items && item.items.length > 0) {
                result += processItems(item.items, depth + 1);
            }
        });
        
        return result;
    };
    
    markdown += processItems(items);
    return markdown;
}