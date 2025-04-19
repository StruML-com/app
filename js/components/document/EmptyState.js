/**
 * Empty State Component
 * Shown when there are no items to display
 */

import React from 'react';

/**
 * Empty State component
 * @param {Object} props - Component props
 * @param {boolean} props.isFiltered - Whether the empty state is due to filtering
 * @param {Function} props.onAddItem - Callback to add a new item
 */
const EmptyState = React.memo(({ isFiltered, onAddItem }) => {
    // Show welcome screen when there are no items
    React.useEffect(() => {
        const welcomeScreen = document.getElementById('welcome-screen');
        const documentContent = document.getElementById('document-content');
        if (welcomeScreen && documentContent) {
            welcomeScreen.classList.remove('d-none');
            documentContent.classList.add('d-none');
        }
    }, []);

    return null;
});

export default EmptyState;