/**
 * Markdown Editor Component
 * Provides a WYSIWYG editing experience for Markdown content using EasyMDE
 */

const MarkdownEditor = ({ value, onChange }) => {
  const editorRef = React.useRef(null);
  const easyMDERef = React.useRef(null);
  const isInternalChange = React.useRef(false);
  const lastKnownValue = React.useRef(value);
  
  // Initialize EasyMDE only once
  React.useEffect(() => {
    if (!editorRef.current || easyMDERef.current) return;
    
    // Check if EasyMDE is available
    if (typeof EasyMDE === 'undefined') {
      console.error('EasyMDE is not loaded. Falling back to basic textarea.');
      return;
    }
    
    // Initialize EasyMDE
    try {
      easyMDERef.current = new EasyMDE({
        element: editorRef.current,
        spellChecker: false,
        autofocus: false,
        initialValue: value || '',
        toolbar: [
          'heading', 'bold', 'italic', 'strikethrough', '|',
          'quote', 'unordered-list', 'ordered-list', 'task', '|',
          'link', 'image', 'table', '|',
          'code', 'preview', 'side-by-side', 'fullscreen'
        ],
        status: false,
        minHeight: '200px',
        maxHeight: '400px',
        renderingConfig: {
          singleLineBreaks: false,
          codeSyntaxHighlighting: true,
        }
      });
      
      // Set initial value
      if (value) {
        easyMDERef.current.value(value);
      }
      lastKnownValue.current = value || '';
      
      // Handle changes
      easyMDERef.current.codemirror.on('change', () => {
        if (isInternalChange.current) return;
        
        const newValue = easyMDERef.current.value();
        if (newValue !== lastKnownValue.current) {
          lastKnownValue.current = newValue;
          onChange(newValue);
        }
      });
    } catch (error) {
      console.error('Error initializing EasyMDE:', error);
    }
    
    // Cleanup on unmount
    return () => {
      if (easyMDERef.current) {
        try {
          // No explicit cleanup needed for EasyMDE
          easyMDERef.current = null;
        } catch (error) {
          console.error('Error cleaning up EasyMDE:', error);
        }
      }
    };
  }, []); // Empty dependency array - only run once on mount
  
  // Handle external value changes separately
  React.useEffect(() => {
    if (!easyMDERef.current) return;
    
    // Only update if the value has actually changed and it's not from internal editing
    if (value !== lastKnownValue.current) {
      try {
        // Mark this as an internal change to prevent change handler from firing
        isInternalChange.current = true;
        
        // Update the editor value
        easyMDERef.current.value(value || '');
        lastKnownValue.current = value || '';
        
        // Reset the internal change flag after a short delay
        setTimeout(() => {
          isInternalChange.current = false;
        }, 5);
      } catch (error) {
        console.error('Error updating EasyMDE value:', error);
        isInternalChange.current = false;
      }
    }
  }, [value]);
  
  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* EasyMDE Container */}
      <textarea ref={editorRef} className="easymde-editor"></textarea>
    </div>
  );
};
