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

        return [...result].sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      if (typeof valA === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc'
          ? valA - valB
          : valB - valA;
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