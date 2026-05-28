import { useState } from 'react';
import { ClipboardList, Trophy } from 'lucide-react';

interface SidebarProps {
    currentDivision: string;
    isGuest: boolean;
}

export default function Sidebar({ currentDivision, isGuest }: SidebarProps) {
    const [selectedAge, setSelectedAge] = useState(currentDivision);
    
    const handleGeneratePlaybook = () => {
        // Generate custom instruction payload and pass it to an active event state trigger
        const macroPrompt = `Build a comprehensive practice plan template for a ${selectedAge} fastpitch softball team that lasts 90 minutes.`;

        // Broadcast prompt event to window listener (or simple global callback state)
        const event = new CustomEvent("generate-playbook", { detail: { prompt: macroPrompt, division: selectedAge }});
        window.dispatchEvent(event);
    };

    return (
        <aside className="app-sidebar">
            <div className="sidebar_group">
                <label className="sidebar_label">
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

            {isGuest && (
                <div className="guest-badge-warning">
                    <span>⚠️ Running in Guest Mode. Experience is standard. Log in to personalize location, name, and age group.</span>
                </div>
            )}
        </aside>
    );
}