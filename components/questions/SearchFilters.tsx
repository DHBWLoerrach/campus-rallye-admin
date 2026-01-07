import React, { useState } from 'react';
import { questionTypes } from '../../helpers/questionTypes';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { RallyeOption } from '@/lib/types';

interface SearchFiltersProps {
  onFilterChange: (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    rallyeId?: string;
    assigned?: boolean;
  }) => void;
  categories: string[];
  rallyes?: RallyeOption[];
  showAssignedToggle?: boolean;
  compact?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  categories,
  rallyes,
  showAssignedToggle = true,
  compact = false,
}) => {
  const [filters, setFilters] = useState({
    question: '',
    answer: '',
    type: '',
    category: '',
    rallyeId: '',
    assigned: undefined,
  });

  const handleChange = (field: string, value: string | boolean | undefined) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const gridClassName = compact
    ? 'grid gap-2 grid-cols-1 sm:grid-cols-2'
    : rallyes?.length
    ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px_200px_220px]'
    : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_200px_200px]';

  return (
    <div className="flex flex-col gap-3">
      <div className={gridClassName}>
        <Input
          placeholder="Suche (Frage)"
          onChange={(e) => handleChange('question', e.target.value)}
        />
        <Input
          placeholder="Suche (Antwort)"
          onChange={(e) => handleChange('answer', e.target.value)}
        />
        <Select onValueChange={(value) => handleChange('type', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {questionTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={(value) => handleChange('category', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rallyes && (
          <Select onValueChange={(value) => handleChange('rallyeId', value)}>
            <SelectTrigger className="w-full" aria-label="Rallye">
              <SelectValue placeholder="Rallye" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Rallyes</SelectItem>
              {rallyes.map((rallye) => (
                <SelectItem key={rallye.id} value={rallye.id.toString()}>
                  {rallye.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {showAssignedToggle && (
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Checkbox
            id="assigned-toggle"
            checked={filters.assigned === true}
            onCheckedChange={(checked) =>
              handleChange('assigned', checked === true ? true : undefined)
            }
          />
          <label htmlFor="assigned-toggle">Nur ausgewählte Fragen</label>
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
