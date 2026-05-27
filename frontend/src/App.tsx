import { useState } from 'react';
import AuthPortal from './components/AuthPortal';
import SideBar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { Trophy } from 'lucide-react';

export interface CoachProfile {
  username: string;
  coach_name: string;
  location: string;
  age_group: string;
}

function App() {
  const [user, setUser] = useState<CoachProfile | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const handleLogOut = () => {
    setUser(null);
    setIsGuest(false);
  };

  // If the user hasn't logged in or chosen guest, show the Portal
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
          <Trophy className='icon-gold' />
            <h1>Softball Coach AI</h1>
        </div>
        <div className='header-user'>
          <span>{user ? `Coach ${user.coach_name}` : 'Guest Dugout'}</span>
          <button onClick={handleLogOut} className='btn-secondary'>Log Out</button>
        </div>
      </header>

      {/* Main workspace split into sidebar and chat */}
      <div className='workspace'>
        <SideBar
          currentDivision={user?.age_group || '8U Division'}
          isGuest={isGuest}
        />
        <main className='whiteboard-area'>
          <ChatArea userProfile={user} />
        </main>
      </div>
    </div>
  );
}

export default App;