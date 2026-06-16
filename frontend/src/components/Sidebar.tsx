import { useState, useEffect } from 'react';
import { ClipboardList, Trophy } from 'lucide-react';

interface SidebarProps {
    currentDivision: string;
    isGuest: boolean;
    selectedTeamId: number | null;
    onCreateLineup: () => void;
}

export default function Sidebar({ currentDivision, isGuest, selectedTeamId, onCreateLineup }: SidebarProps) {
    const [selectedAge, setSelectedAge] = useState(currentDivision);
    
    // Sync dropdown state whenever active team division changes
    useEffect(() => {
        setSelectedAge(currentDivision);
    }, [currentDivision]);

    const handleGeneratePlaybook = () => {
        const macroPrompt = `Build a comprehensive practice plan template for a ${selectedAge} fastpitch softball team that lasts 90 minutes.`;
        const event = new CustomEvent("generate-playbook", { detail: { prompt: macroPrompt, division: selectedAge }});
        window.dispatchEvent(event);
    };

    return (
        <aside className="app-sidebar">
            <div className="sidebar-group">
                <label className="sidebar-label">
                    <Trophy className="icon-sidebar" />
                    Select Youth Division
                </label>
                <select
                    value={selectedAge}
                    onChange={(e) => setSelectedAge(e.target.value)}
                    className="sidebar-select">
                        <option value="8U Division">8U Division</option>
                        <option value="10U Division">10U Division</option>
                        <option value="12U Division">12U Division</option>
                        <option value="14U Division">14U Division</option>
                </select>
            </div>

            <button onClick={handleGeneratePlaybook} className="btn-generate-playbook">
                <ClipboardList className="icon-btn" />
                Generate Playbook 
            </button>

            <button 
                onClick={onCreateLineup} 
                disabled={!selectedTeamId}
                className="btn-generate-playbook"
                style={{ 
                    marginTop: '10px', 
                    background: 'linear-gradient(135deg, var(--accent) 0%, #0d9488 100%)',
                    opacity: selectedTeamId ? 1 : 0.4, 
                    cursor: selectedTeamId ? 'pointer' : 'not-allowed' 
                }}
            >
                <Trophy className="icon-btn" />
                Create Lineup
            </button>

            {isGuest && (
                <div className="guest-badge-warning" style={{ marginTop: '20px' }}>
                    <span>⚠️ Running in Guest Mode. Experience is standard. Log in to personalize location, name, and age group.</span>
                </div>
            )}
        </aside>
    );
}