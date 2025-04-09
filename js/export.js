// Assign Export object to the global namespace
window.StruMLApp = window.StruMLApp || {};

window.StruMLApp.Export = {
    // Export to various formats
    exportDocument(format = 'json') {
        // Access state and utils from global namespace
        const documentTitle = window.app?.documentTitle || "Untitled Document";
        const items = window.app?.items || [];
        const originalFilename = window.app?.originalFilename || "";
        const Utils = window.StruMLApp.Utils;

        // Create a deep copy of the data to modify for export
        const dataForExport = {
            title: documentTitle,
            items: JSON.parse(JSON.stringify(items))
        };
        
        // Remove IDs if format is json
        if (format === 'json') {
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
        }
        
        let blob, url, filename, content;
        const timestamp = new Date().toISOString()
            .replace(/T/, '-')
            .replace(/\..+/, '')
            .replace(/:/g, '-')
            .substring(0, 19);
        
        if (format === 'json') {
            content = JSON.stringify(dataForExport, null, 2);
            blob = new Blob([content], { type: "application/json" });
            filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.json`;
        }
        else if (format === 'md') {
            // Convert to markdown
            content = this.convertToMarkdown(items, documentTitle); // Use 'this' to call helper
            blob = new Blob([content], { type: "text/markdown" });
            filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.md`;
        }
        else if (format === 'html') {
            // Convert to HTML
            content = this.convertToHTML(items, documentTitle); // Use 'this' to call helper
            blob = new Blob([content], { type: "text/html" });
            filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.html`;
        }
        else if (format === 'csv') {
            // Convert to CSV
            content = this.convertToCSV(items); // Use 'this' to call helper
            blob = new Blob([content], { type: "text/csv" });
            filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.csv`;
        }
        
        // If we have content to download
        if (blob) {    
            url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            Utils.showAlert(`Document exported as ${format.toUpperCase()} successfully.`, "success");
        }
    },

    // Helper function to convert to Markdown
    convertToMarkdown(items, documentTitle) {
        let markdown = `# ${documentTitle}\n\n`;
        
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
    },

    // Helper function to convert to DOC-ready HTML
    convertToHTML(items, documentTitle) {
        const Utils = window.StruMLApp.Utils; // Access Utils globally

        // Create notice at the top for copying to document editor
        let html = `
        <div style="background-color: #f8d7da; padding: 15px; margin-bottom: 20px; border-radius: 5px; border: 1px solid #f5c6cb;">
            <strong>Copy & Paste Instructions:</strong> Copy this entire content and paste it into your document editor (like Word or Google Docs).
        </div>
        <h1>${documentTitle}</h1>`;
        
        const processItems = (itemsList, depth = 0) => {
            if (!itemsList || !Array.isArray(itemsList)) return '';
            
            let result = '';
            
            itemsList.forEach(item => {
                // Add title using appropriate heading level
                const headingLevel = Math.min(depth + 2, 6);
                result += `<h${headingLevel}>${item.title}</h${headingLevel}>`;
                
                // Add content if available
                if (item.content) {
                    // Convert markdown to HTML for better document conversion
                    const htmlContent = Utils.renderMarkdown(item.content);
                    result += htmlContent;
                }
                
                // Process children recursively
                if (item.items && item.items.length > 0) {
                    result += processItems(item.items, depth + 1);
                }
            });
            
            return result;
        };
        
        html += processItems(items);
        return html;
    },

    // Helper function to convert to CSV with hierarchical structure
    convertToCSV(items) {
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
};
