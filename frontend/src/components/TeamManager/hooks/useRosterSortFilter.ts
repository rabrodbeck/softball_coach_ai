import { useState, useMemo } from 'react';
import type { Player } from '../types';

export function useRosterSortFilter(players: Player[]) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<keyof Player>('player_name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: keyof Player) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedPlayers = useMemo(() => {
        let result = players;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(p => p.player_name.toLowerCase().includes(q) || p.player_number.toString().includes(q));
        }

        return [...result].sort((a: Player, b: Player) => {
            const rawValA = a[sortField];
            const rawValB = b[sortField];
            const valA = (rawValA === undefined || rawValA === null) ? '' : rawValA;
            const valB = (rawValB === undefined || rawValB === null) ? '' : rawValB;
            if (typeof valA === 'string' || typeof valB === 'string') {
                return sortDirection === 'asc'
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            } else {
                return sortDirection === 'asc'
                    ? Number(valA) - Number(valB)
                    : Number(valB) - Number(valA);
            }
        });
    }, [players, searchQuery, sortField, sortDirection]);
  return {
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    handleSort,
    sortedPlayers,
  };
}