/**
 * TagEditor Component
 * Provides a rich tag editing experience using Tagify
 */

const TagEditor = ({ value, onChange, placeholder = "Add tags...", whitelist = [] }) => {
  const inputRef = React.useRef(null);
  const tagifyRef = React.useRef(null);
  
  // Initialize Tagify
  React.useEffect(() => {
    if (!inputRef.current) return;
    
    // Check if Tagify is available
    if (typeof Tagify === 'undefined') {
      console.error('Tagify is not loaded. Falling back to basic input.');
      return;
    }
    
    // Initialize Tagify if not already initialized
    if (!tagifyRef.current) {
      // Create Tagify instance with default settings
      tagifyRef.current = new Tagify(inputRef.current, {
        dropdown: {
          enabled: 1,
          maxItems: 5,
          position: "text",
          closeOnSelect: false,
          highlightFirst: true,
          searchKeys: ["value"]
        },
        whitelist: whitelist || [],
        enforceWhitelist: false,
        maxTags: 50,
        transformTag: transformTag,
        callbacks: {
          add: onTagsChange,
          remove: onTagsChange,
          invalid: onInvalidTag
        }
      });
      
      // Initialize drag-and-drop functionality
      if (typeof DragSort !== 'undefined') {
        new DragSort(tagifyRef.current.DOM.scope, {
          selector: '.' + tagifyRef.current.settings.classNames.tag,
          callbacks: {
            dragEnd: function() {
              tagifyRef.current.updateValueByDOMTags();
              onTagsChange();
            }
          }
        });
      }
      
      // Set initial value
      if (value) {
        tagifyRef.current.addTags(value);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (tagifyRef.current) {
        tagifyRef.current.destroy();
        tagifyRef.current = null;
      }
    };
  }, []);
  
  // Update whitelist if it changes
  React.useEffect(() => {
    if (tagifyRef.current && whitelist && whitelist.length > 0) {
      tagifyRef.current.settings.whitelist = whitelist;
    }
  }, [whitelist]);
  
  // Update tags when value prop changes
  React.useEffect(() => {
    if (tagifyRef.current && value !== undefined) {
      // Remove all existing tags
      tagifyRef.current.removeAllTags();
      
      // Add new tags if value is not empty
      if (value) {
        tagifyRef.current.addTags(value);
      }
    }
  }, [value]);
  
  // Transform tag function to add custom styling based on tag content
  function transformTag(tagData) {
    // Check for special tag formats
    if (tagData.value.includes('::')) {
      const [type, value] = tagData.value.split('::');
      
      // Add custom classes based on tag type
      switch (type.toLowerCase()) {
        case 'type':
          tagData.class = 'tagify__tag--type';
          break;
        case 'priority':
          tagData.class = 'tagify__tag--priority';
          break;
        case 'status':
          tagData.class = 'tagify__tag--status';
          break;
        case 'relation':
          tagData.class = 'tagify__tag--relation';
          break;
        default:
          // For other custom types
          tagData.class = `tagify__tag--${type.toLowerCase()}`;
      }
    }
    
    return tagData;
  }
  
  // Handle tag changes
  function onTagsChange() {
    if (tagifyRef.current && typeof onChange === 'function') {
      // Get tags as string
      const tagsString = tagifyRef.current.value
        .map(tag => tag.value)
        .join(', ');
      
      onChange(tagsString);
    }
  }
  
  // Handle invalid tags
  function onInvalidTag(e) {
    console.warn('Invalid tag:', e.detail.data);
    // You could show a toast or other notification here
  }
  
  return (
    <div className="tagify-container">
      <input
        ref={inputRef}
        type="text"
        className="form-control"
        placeholder={placeholder}
      />
    </div>
  );
};
