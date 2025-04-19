/**
 * Export Manager
 * Handles document export to various formats
 */

import { exportToJSON } from './JSONExporter.js';
import { exportToMarkdown } from './MarkdownExporter.js';
import { exportToHTML } from './HTMLExporter.js';
import { exportToCSV } from './CSVExporter.js';
import { showAlert } from '../../core/utils.js';

/**
 * Export document to the specified format
 * @param {string} format - Export format ('json', 'md', 'html', 'csv')
 * @param {Object} data - Document data (title, items)
 * @param {string} originalFilename - Original filename for export
 */
export function exportDocument(format = 'json', data, originalFilename = '') {
    if (!data || !data.items) {
        showAlert("No data to export", "danger");
        return;
    }

    const documentTitle = data.title || "Untitled Document";
    const items = data.items || [];
    
    let blob, url, filename, content;
    const timestamp = new Date().toISOString()
        .replace(/T/, '-')
        .replace(/\..+/, '')
        .replace(/:/g, '-')
        .substring(0, 19);
    
    try {
        switch (format.toLowerCase()) {
            case 'json':
                content = exportToJSON(data);
                blob = new Blob([content], { type: "application/json" });
                filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.json`;
                break;
                
            case 'md':
                content = exportToMarkdown(items, documentTitle);
                blob = new Blob([content], { type: "text/markdown" });
                filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.md`;
                break;
                
            case 'html':
                content = exportToHTML(items, documentTitle);
                blob = new Blob([content], { type: "text/html" });
                filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.html`;
                break;
                
            case 'csv':
                content = exportToCSV(items);
                blob = new Blob([content], { type: "text/csv" });
                filename = `${originalFilename || documentTitle.replace(/\s+/g, '_')}_${timestamp}.csv`;
                break;
                
            default:
                showAlert(`Unsupported export format: ${format}`, "danger");
                return;
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
            
            showAlert(`Document exported as ${format.toUpperCase()} successfully.`, "success");
        }
    } catch (error) {
        console.error(`Error exporting document as ${format}:`, error);
        showAlert(`Error exporting document: ${error.message}`, "danger");
    }
}