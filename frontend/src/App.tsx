import { useState } from 'react';
import AuthPortal from './components/AuthPortal';
import SideBar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import TeamManager from './components/TeamManager'; // Added TeamManager import
import { Trophy, Menu, Users } from 'lucide-react'; // Added Users icon

export interface CoachProfile {
  id: number; // Ensure id is defined in the profile
  username: string;
  coach_name: string;
  location: string;
  age_group: string;
}

function App() {
  const [user, setUser] = useState<CoachProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTeamManager, setShowTeamManager] = useState(false);
  
  // Dynamic Team Info loaded from the TeamManager
  const [activeTeamName, setActiveTeamName] = useState('');
  const [activeAgeGroup, setActiveAgeGroup] = useState('');

  const handleLogOut = () => {
    setUser(null);
    setIsGuest(false);
    setActiveTeamName('');
    setActiveAgeGroup('');
  };

  const handleActiveTeamChanged = (teamName: string, ageGroup: string) => {
    setActiveTeamName(teamName);
    setActiveAgeGroup(ageGroup);
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
    <div className='app-container'>
      {/* Top Banner Header */}
      <header className='app-header'>
        <div className='header-title'>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className='btn-sidebar-toggle'
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <Menu size={20} />
          </button>
          <Trophy className='icon-gold' />
          <h1>Softball Coach AI</h1>
        </div>
        <div className='header-user'>
          {user && (
            <button 
              onClick={() => setShowTeamManager(true)} 
              className="btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
            >
              <Users size={16} />
              {activeTeamName ? `${activeTeamName} (${activeAgeGroup.split(' ')[0]})` : "Manage Teams"}
            </button>
          )}
          <span>{user ? `Coach ${user.coach_name}` : 'Guest Dugout'}</span>
          <button onClick={handleLogOut} className='btn-secondary'>Log Out</button>
        </div>
      </header>

      {/* Main workspace split into sidebar and chat */}
      <div className={`workspace ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <SideBar
          currentDivision={activeAgeGroup || user?.age_group || '8U Division'}
          isGuest={isGuest}
        />
        <main className='whiteboard-area'>
          <ChatArea userProfile={user ? { ...user, age_group: activeAgeGroup || user.age_group } : null} />
        </main>
      </div>

      {/* Render the Team Manager modal when toggled */}
      {showTeamManager && user && (
        <TeamManager 
          coachId={user.id} 
          onClose={() => setShowTeamManager(false)}
          onActiveTeamChanged={handleActiveTeamChanged}
        />
      )}
    </div>
  );
}

export default App;