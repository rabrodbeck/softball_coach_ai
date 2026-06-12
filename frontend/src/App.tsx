import { useState, useEffect } from 'react';
import AuthPortal from './components/AuthPortal';
import SideBar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import TeamManager from './components/TeamManager/index';
import { Trophy, Menu, Users } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { apiFetch } from './utils/api';

export interface CoachProfile {
  id: number;
  username: string;
  coach_name: string;
  location: string;
  age_group: string;
}

interface SelectedTeam {
  id: number;
  team_name: string;
  age_group: string;
}

function App() {
  const [user, setUser] = useState<CoachProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTeamManager, setShowTeamManager] = useState(false);
  
  // Selected Team tracked in browser session state
  const [selectedTeam, setSelectedTeam] = useState<SelectedTeam | null>(null);

  // Load selected team from localStorage on boot
  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(`selected_team_${user.id}`);
      if (cached) {
        try {
          setSelectedTeam(JSON.parse(cached));
        } catch (e) {
          console.error("Error parsing selected team cache:", e);
        }
      }
    }
  }, [user]);

  // Handle Firebase session persistence auto-login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        try {
          const res = await apiFetch(`/api/auth/google-login`, {
            method: "POST",
            body: JSON.stringify({
              email: firebaseUser.email,
              display_name: firebaseUser.displayName || ""
            })
          });
          const data = await res.json();
          if (data.registered) {
            setUser(data.user);
          }
        } catch (err) {
          console.error("Auto-login validation failed:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase sign out failed:", e);
    }
    setUser(null);
    setIsGuest(false);
    setSelectedTeam(null);
  };

  const handleSelectTeam = (team: { id: number; team_name: string; age_group: string }) => {
    const selected = { id: team.id, team_name: team.team_name, age_group: team.age_group };
    setSelectedTeam(selected);
    if (user) {
      localStorage.setItem(`selected_team_${user.id}`, JSON.stringify(selected));
    }
  };

  if (!user && !isGuest) {
    return (
      <AuthPortal
        onLoginSuccess={(profile: CoachProfile) => setUser(profile)}
        onContinueAsGuest={() => setIsGuest(true)}
      />
    );
  }

  // Determine current division to view
  const currentAgeGroup = selectedTeam ? selectedTeam.age_group : (user?.age_group || '8U Division');

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
              {selectedTeam ? `${selectedTeam.team_name} (${selectedTeam.age_group.split(' ')[0]})` : "Manage Teams"}
            </button>
          )}
          <span>{user ? `Coach ${user.coach_name}` : 'Guest Dugout'}</span>
          <button onClick={handleLogOut} className='btn-secondary'>Log Out</button>
        </div>
      </header>

      {/* Main workspace split into sidebar and chat */}
      <div className={`workspace ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <SideBar
          currentDivision={currentAgeGroup}
          isGuest={isGuest}
        />
        <main className='whiteboard-area'>
          <ChatArea 
            userProfile={user ? { ...user, age_group: currentAgeGroup } : null} 
            selectedTeamId={selectedTeam ? selectedTeam.id : null}
          />
        </main>
      </div>

      {/* Render the Team Manager modal when toggled */}
      {showTeamManager && user && (
        <TeamManager 
          coachId={user.id} 
          onClose={() => setShowTeamManager(false)}
          selectedTeamId={selectedTeam ? selectedTeam.id : null}
          onSelectTeam={handleSelectTeam}
        />
      )}
    </div>
  );
}

export default App;