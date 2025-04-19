/**
 * HTML Exporter
 * Handles export to HTML format
 */

import { renderMarkdown } from '../../core/utils.js';

/**
 * Export document data to HTML format
 * @param {Array} items - Document items
 * @param {string} documentTitle - Document title
 * @returns {string} - HTML string representation of the document
 */
export function exportToHTML(items, documentTitle) {
    // Create notice at the top for copying to document editor
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${documentTitle || 'Untitled Document'}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            .notice {
                background-color: #f8d7da;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 5px;
                border: 1px solid #f5c6cb;
            }
            .item-tags {
                color: #6c757d;
                font-size: 0.9em;
                margin-bottom: 10px;
            }
            .item-content {
                margin-bottom: 20px;
            }
            h1, h2, h3, h4, h5, h6 {
                margin-top: 1.5em;
                margin-bottom: 0.5em;
            }
            h1 { font-size: 2em; }
            h2 { font-size: 1.75em; }
            h3 { font-size: 1.5em; }
            h4 { font-size: 1.25em; }
            h5 { font-size: 1.1em; }
            h6 { font-size: 1em; }
            code {
                background-color: #f8f9fa;
                padding: 2px 4px;
                border-radius: 3px;
                font-family: monospace;
            }
            pre {
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
                overflow-x: auto;
            }
            img {
                max-width: 100%;
                height: auto;
            }
        </style>
    </head>
    <body>
        <div class="notice">
            <strong>Copy & Paste Instructions:</strong> Copy this entire content and paste it into your document editor (like Word or Google Docs).
        </div>
        <h1>${documentTitle || 'Untitled Document'}</h1>
    `;
    
    const processItems = (itemsList, depth = 0) => {
        if (!itemsList || !Array.isArray(itemsList)) return '';
        
        let result = '';
        
        itemsList.forEach(item => {
            // Add title using appropriate heading level
            const headingLevel = Math.min(depth + 2, 6);
            result += `<h${headingLevel}>${item.title}</h${headingLevel}>`;
            
            // Add tags if available
            if (item.tags) {
                const tags = item.tags.split(',')
                    .map(tag => tag.trim())
                    .filter(tag => !tag.includes('>>') && !tag.startsWith('type::'))
                    .join(', ');
                
                if (tags) {
                    result += `<div class="item-tags">Tags: ${tags}</div>`;
                }
            }
            
            // Add content if available
            if (item.content) {
                // Convert markdown to HTML
                const htmlContent = renderMarkdown(item.content);
                result += `<div class="item-content">${htmlContent}</div>`;
            }
            
            // Process children recursively
            if (item.items && item.items.length > 0) {
                result += processItems(item.items, depth + 1);
            }
        });
        
        return result;
    };
    
    html += processItems(items);
    html += `
    </body>
    </html>`;
    
    return html;
}