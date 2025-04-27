/**
 * Tag Filter Component
 * Provides UI for filtering items by tags with AND/OR logic
 */

const TagFilter = () => {
  const [filterTags, setFilterTags] = React.useState([]);
  const [filterLogic, setFilterLogic] = React.useState('OR');
  const [showSubitems, setShowSubitems] = React.useState(true);
  const [tagInput, setTagInput] = React.useState('');
  const [tagSuggestions, setTagSuggestions] = React.useState([]);
  
  const { state, actions } = useAppContext();
  const { document } = state;
  const { setFilteredItems } = actions;
  
  // Extract all unique tags from the document
  const allTags = React.useMemo(() => {
    const tags = new Set();
    
    const extractTags = (items) => {
      items.forEach(item => {
        if (item.tags) {
          parseTags(item.tags).forEach(tag => {
            tags.add(tag.full);
          });
        }
        
        if (item.items && item.items.length > 0) {
          extractTags(item.items);
        }
      });
    };
    
    extractTags(document.items);
    return Array.from(tags).sort();
  }, [document]);
  
  // Update tag suggestions when input changes
  React.useEffect(() => {
    if (!tagInput) {
      setTagSuggestions([]);
      return;
    }
    
    const lowerInput = tagInput.toLowerCase();
    const suggestions = allTags
      .filter(tag => tag.toLowerCase().includes(lowerInput))
      .filter(tag => !filterTags.includes(tag))
      .slice(0, 5);
    
    setTagSuggestions(suggestions);
  }, [tagInput, allTags, filterTags]);
  
  // Apply filters when filter tags or logic changes
  React.useEffect(() => {
    if (filterTags.length === 0) {
      setFilteredItems(null);
      return;
    }
    
    const filteredItems = [];
    
    const checkItemTags = (item) => {
      if (!item.tags) return false;
      
      const itemTags = parseTags(item.tags).map(tag => tag.full);
      
      if (filterLogic === 'AND') {
        return filterTags.every(tag => itemTags.includes(tag));
      } else {
        return filterTags.some(tag => itemTags.includes(tag));
      }
    };
    
    const processItems = (items, parentMatches = false) => {
      items.forEach(item => {
        const itemMatches = checkItemTags(item);
        
        if (itemMatches || (showSubitems && parentMatches)) {
          filteredItems.push(item.id);
        }
        
        if (item.items && item.items.length > 0) {
          processItems(item.items, itemMatches || (showSubitems && parentMatches));
        }
      });
    };
    
    processItems(document.items);
    setFilteredItems(filteredItems);
  }, [filterTags, filterLogic, showSubitems, document, setFilteredItems]);
  
  const handleAddTag = (tag) => {
    if (!tag || filterTags.includes(tag)) return;
    
    setFilterTags([...filterTags, tag]);
    setTagInput('');
  };
  
  const handleRemoveTag = (tag) => {
    setFilterTags(filterTags.filter(t => t !== tag));
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput) {
      handleAddTag(tagInput);
    }
  };
  
  const handleClearFilters = () => {
    setFilterTags([]);
    setTagInput('');
  };
  
  return (
    <div className="p-3 border-t border-b border-gray-200">
      <h3 className="font-medium mb-2">Filter by Tags</h3>
      
      <div className="mb-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {filterTags.map((tag, index) => (
            <div key={index} className="tag tag-filter flex items-center">
              <span>{tag}</span>
              <button 
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add tag to filter..."
            className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
          />
          
          {tagSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
              {tagSuggestions.map((tag, index) => (
                <div
                  key={index}
                  onClick={() => handleAddTag(tag)}
                  className="px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <span className="text-sm mr-2">Logic:</span>
          <select
            value={filterLogic}
            onChange={(e) => setFilterLogic(e.target.value)}
            className="border border-gray-300 rounded-md text-sm py-1"
          >
            <option value="OR">OR</option>
            <option value="AND">AND</option>
          </select>
        </div>
        
        <button
          onClick={handleClearFilters}
          className="text-sm text-blue-600 hover:text-blue-800"
          disabled={filterTags.length === 0}
        >
          Clear Filters
        </button>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="showSubitems"
          checked={showSubitems}
          onChange={(e) => setShowSubitems(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="showSubitems" className="text-sm">
          Show subitems when parent matches
        </label>
      </div>
    </div>
  );
};
