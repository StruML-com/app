/**
 * Relations View Component
 * Displays outgoing and incoming relations for an item
 */

const RelationsView = ({ item, allItems }) => {
  // Extract outgoing relations from the item's tags
  const outgoingRelations = React.useMemo(() => {
    if (!item.tags) return [];
    return window.StruMLApp.Utils.extractRelations(item.tags);
  }, [item.tags]);
  
  // Find incoming relations from other items
  const incomingRelations = React.useMemo(() => {
    if (!allItems) return [];
    
    const relations = [];
    
    const findIncomingRelations = (items) => {
      items.forEach(sourceItem => {
        if (sourceItem.tags) {
          const itemRelations = window.StruMLApp.Utils.extractRelations(sourceItem.tags);
          
          itemRelations.forEach(relation => {
            if (relation.target === item.title) {
              relations.push({
                sourceItem,
                relation: relation.relation,
                fullTag: relation.full
              });
            }
          });
        }
        
        if (sourceItem.items && sourceItem.items.length > 0) {
          findIncomingRelations(sourceItem.items);
        }
      });
    };
    
    findIncomingRelations(allItems);
    return relations;
  }, [item.title, allItems]);
  
  // Handle navigation to a related item
  const handleNavigateToItem = (itemId) => {
    const { actions } = useAppContext();
    actions.selectItem(itemId);
  };
  
  // Get relation style based on relation type
  const getRelationStyle = (relation) => {
    const relationTypes = {
      'depends': { color: 'bg-blue-100 text-blue-800' },
      'supports': { color: 'bg-green-100 text-green-800' },
      'contradicts': { color: 'bg-red-100 text-red-800' },
      'related': { color: 'bg-purple-100 text-purple-800' },
      'extremely-high': { color: 'bg-green-200 text-green-900' },
      'very-high': { color: 'bg-green-100 text-green-800' },
      'high': { color: 'bg-green-50 text-green-700' },
      'slightly-high': { color: 'bg-green-50 text-green-600' },
      'neutral': { color: 'bg-gray-100 text-gray-800' },
      'slightly-low': { color: 'bg-red-50 text-red-600' },
      'low': { color: 'bg-red-50 text-red-700' },
      'very-low': { color: 'bg-red-100 text-red-800' },
      'extremely-low': { color: 'bg-red-200 text-red-900' }
    };
    
    return relationTypes[relation] || { color: 'bg-gray-100 text-gray-800' };
  };
  
  if (outgoingRelations.length === 0 && incomingRelations.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Relations</h3>
      
      <div className="flex flex-row gap-4">
        {/* Outgoing Relations */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Outgoing Relations</h4>
          {outgoingRelations.length > 0 ? (
            <div className="space-y-1">
              {outgoingRelations.map((relation, index) => {
                const targetItem = window.StruMLApp.Utils.findItemByTitle(allItems, relation.target);
                const style = getRelationStyle(relation.relation);
                
                return (
                  <div 
                    key={index}
                    className="flex items-center"
                  >
                    <div className={`px-2 py-1 rounded-md text-xs ${style.color} mr-2`}>
                      {relation.relation}
                    </div>
                    <div 
                      className={`flex-1 px-2 py-1 border border-gray-200 rounded-md ${targetItem ? 'cursor-pointer hover:bg-gray-50' : 'text-gray-400'}`}
                      onClick={() => targetItem && handleNavigateToItem(targetItem.id)}
                    >
                      {relation.target}
                      {!targetItem && <span className="text-xs text-red-500 ml-2">(not found)</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No outgoing relations</div>
          )}
        </div>
        
        {/* Incoming Relations */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Incoming Relations</h4>
          {incomingRelations.length > 0 ? (
            <div className="space-y-1">
              {incomingRelations.map((relation, index) => {
                const style = getRelationStyle(relation.relation);
                
                return (
                  <div 
                    key={index}
                    className="flex items-center"
                  >
                    <div 
                      className="flex-1 px-2 py-1 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                      onClick={() => handleNavigateToItem(relation.sourceItem.id)}
                    >
                      {relation.sourceItem.title}
                    </div>
                    <div className={`px-2 py-1 rounded-md text-xs ${style.color} ml-2`}>
                      {relation.relation}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No incoming relations</div>
          )}
        </div>
      </div>
    </div>
  );
};
