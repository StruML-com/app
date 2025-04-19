/**
 * Core utility functions
 * Contains general utility functions used throughout the application
 */

// Generate a unique ID for items
export function generateItemId() {
    // Check if uuidv4 is available
    if (typeof uuidv4 !== 'undefined') {
        return uuidv4();
    } else {
        // Fallback implementation for UUID
        return 'id-' + Math.random().toString(36).substring(2, 15) + 
              Math.random().toString(36).substring(2, 15);
    }
}

// Show alert toast
export function showAlert(message, type = 'success', duration = 3000) {
    const toastId = `toast-${Date.now()}`;
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <span class="bg-${type} rounded me-2" style="width:16px; height:16px;"></span>
                <strong class="me-auto">StruML</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    const toastContainer = document.getElementById('toast-container');
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { 
        autohide: true, 
        delay: duration 
    });
    
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// Store current scroll position
let scrollPosition = 0;

// Save current scroll position
export function saveScrollPosition() {
    scrollPosition = window.scrollY;
}

// Restore saved scroll position
export function restoreScrollPosition() {
    setTimeout(() => {
        window.scrollTo(0, scrollPosition);
    }, 10);
}

// Render markdown content safely
export function renderMarkdown(markdown) {
    if (!markdown) return '';
    
    const rawHtml = marked.parse(markdown);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    doc.querySelectorAll('a').forEach(link => {
        if (!link.hasAttribute('target')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
    
    return DOMPurify.sanitize(doc.body.innerHTML, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel']
    });
}

// Toggle sidebar visibility
export function toggleSidebar(collapse) {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const mainHeader = document.getElementById('main-header');
    const expandSidebarBtn = document.getElementById('expand-sidebar-btn');
    
    if (sidebar) {
        if (collapse) {
            sidebar.classList.add('collapsed');
            mainContent?.classList.add('expanded');
            mainHeader?.classList.add('expanded');
            expandSidebarBtn?.classList.remove('d-none');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent?.classList.remove('expanded');
            mainHeader?.classList.remove('expanded');
            expandSidebarBtn?.classList.add('d-none');
        }
    }
}

// Get local markdown path for an item
export function getLocalMarkdownPath(itemTitle) {
    if (!itemTitle) return '';
    
    // Convert title to filename-friendly format
    const filename = itemTitle.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `docs/${filename}.md`;
}