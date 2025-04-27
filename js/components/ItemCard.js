/**
 * ItemCard Component
 * A reusable component that displays an item's title, tags, and content
 * Used in the main document view and potentially other parts of the application
 */

const ItemCard = ({ item, onClick }) => {
  // Handle click on the card
  const handleClick = () => {
    if (onClick) onClick(item);
  };
  
  // Parse and render the item's content (truncated if too long)
  const renderTruncatedContent = (content) => {
    if (!content) return null;
    
    // Truncate content if it's too long (more than 150 characters)
    const truncated = content.length > 150 
      ? content.substring(0, 150) + '...' 
      : content;
    
    // Render the truncated content as markdown
    return window.StruMLApp.Utils.renderMarkdown(truncated);
  };
  
  return (
    <div 
      className="item-card p-4 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      {/* Item title */}
      <h3 className="text-lg font-medium mb-2">{item.title}</h3>
      
      {/* Item tags */}
      {item.tags && (
        <div className="mb-2">
          <TagsList tagsString={item.tags} />
        </div>
      )}
      
      {/* Item content (truncated) */}
      {item.content && (
        <div 
          className="markdown-content text-sm text-gray-600 mt-2 prose prose-sm"
          dangerouslySetInnerHTML={{ __html: renderTruncatedContent(item.content) }}
        ></div>
      )}
      
      <style jsx>{`
        .item-card {
          transition: all 0.2s ease;
        }
        
        .item-card:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

// Export the component
window.StruMLApp.Components = window.StruMLApp.Components || {};
window.StruMLApp.Components.ItemCard = ItemCard;
