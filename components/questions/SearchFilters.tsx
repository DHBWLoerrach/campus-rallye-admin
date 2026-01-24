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

interface SearchFiltersProps {
  onFilterChange: (filters: {
    question?: string;
    answer?: string;
    type?: string;
    assigned?: boolean;
  }) => void;
  showAssignedToggle?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  showAssignedToggle = true,
}) => {
  const [filters, setFilters] = useState({
    question: '',
    answer: '',
    type: '',
    assigned: undefined,
  });

  const handleChange = (field: string, value: string | boolean | undefined) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <>
      <div className="flex flex-wrap gap-4 flex-1">
        <Input
          placeholder="Suche (Frage)"
          className="max-w-[200px]"
          onChange={(e) => handleChange('question', e.target.value)}
        />
        <Input
          placeholder="Suche (Antwort)"
          className="max-w-[200px]"
          onChange={(e) => handleChange('answer', e.target.value)}
        />
        <Select onValueChange={(value) => handleChange('type', value)}>
          <SelectTrigger className="w-[200px]">
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
        {showAssignedToggle && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={filters.assigned === true}
              onCheckedChange={(checked) =>
                handleChange('assigned', checked ? true : (undefined as any))
              }
            />
            <label htmlFor="active" className="text-sm">
              Nur ausgewählte Fragen
            </label>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchFilters;
