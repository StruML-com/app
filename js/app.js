/**
 * StruML Main Application
 */

// Access the exported components
const { AppProvider, useAppContext } = window.StruMLApp.State;

// Main App component
const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

// App content component
const AppContent = () => {
  const { state } = useAppContext();
  const { sidebarVisible } = state;
  
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && <Sidebar />}
        <MainContent />
      </div>
    </div>
  );
};

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
