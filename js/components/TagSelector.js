/**
 * TagSelector Component
 * Provides a wrapper around TagEditor with additional functionality for the item editor
 */

const TagSelector = ({ value, onChange, allTags = [] }) => {
  const [suggestions, setSuggestions] = React.useState([]);
  
  // Extract all tags from the provided list or use empty array
  React.useEffect(() => {
    if (allTags && allTags.length > 0) {
      setSuggestions(allTags);
    } else {
      // If no tags provided, we could fetch them from the app state or API
      setSuggestions([]);
    }
  }, [allTags]);
  
  // Handle tag change
  const handleTagChange = (tagsString) => {
    if (typeof onChange === 'function') {
      onChange(tagsString);
    }
  };
  
  return (
    <div className="tag-selector">
      <div className="mb-2">
        <div className="d-flex justify-content-between align-items-center">
          <label className="form-label mb-1">Tags</label>
          <small className="text-muted">(Drag to reorder)</small>
        </div>
        <small className="form-text text-muted d-block mb-2">
          Use comma to separate tags. Special formats: <code>type::value</code>, <code>priority::value</code>, etc.
        </small>
      </div>
      
      <TagEditor
        value={value}
        onChange={handleTagChange}
        placeholder="Add tags (e.g. important, type::section, priority::high)"
        whitelist={suggestions}
      />
      
      {/* Tag suggestions - hidden for now to fix duplication issue */}
      <div id="tag-suggestions-container" style={{ display: 'none' }}>
        <div className="mt-2">
          <div className="d-flex flex-wrap gap-1 tag-suggestions">
            {suggestions.slice(0, 10).map((tag, index) => (
              <button
                key={`suggestion-${index}`}
                type="button"
                className="btn btn-sm btn-outline-secondary tag-suggestion"
                onClick={() => {
                  // Add this tag if it's not already in the list
                  const currentTags = value ? value.split(',').map(t => t.trim()) : [];
                  if (!currentTags.includes(tag)) {
                    const newTags = [...currentTags, tag].join(', ');
                    handleTagChange(newTags);
                  }
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
