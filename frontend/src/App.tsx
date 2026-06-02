import { useState } from "react";
import AuthPortal from "./components/AuthPortal";
import SideBar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import { Trophy, Menu } from "lucide-react";

export interface CoachProfile {
  username: string;
  coach_name: string;
  location: string;
  age_group: string;
}

function App() {
  const [user, setUser] = useState<CoachProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogOut = () => {
    setUser(null);
    setIsGuest(false);
  };

  if (!user && !isGuest) {
    return (
      <AuthPortal
        onLoginSuccess={(profile: CoachProfile) => setUser(profile)}
        onContinueAsGuest={() => setIsGuest(true)}
      />  
    );
  }

  return (
    <div className="app-container">
      {/* Top Banner Header */}
      <header className="app-header">
        <div className="header-title">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-sidebar-toggle"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
              <Menu size={20} />
          </button>
          <Trophy className="icon-gold" />
          <h1>Softball Coach AI</h1>
        </div>
        <div className="header-user">
          <span>{user ? `Coach ${user.coach_name}` : "Guest Dugout"}</span>
          <button onClick={handleLogOut} className="btn-secondary">Log Out</button>
        </div>
      </header>

      {/* Main workspace split into sidebar and chat */}
      <div className={`workspace ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        <SideBar 
          currentDivision={user?.age_group || "8U Division"}
          isGuest={isGuest}
        />
        <main className="whiteboard-area">
          <ChatArea userProfile={user} />
        </main>
      </div>

    </div>
  );
}

export default App;