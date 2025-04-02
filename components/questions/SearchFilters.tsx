import React, { useEffect, useState } from 'react';
import { getCategories } from '@/actions/question';
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
    category?: string;
    enabled?: boolean;
  }) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState({
    question: '',
    answer: '',
    type: '',
    category: '',
    enabled: undefined,
  });
  const [categories, setCategories] = useState<string[]>([]);

  const handleChange = (field: string, value: string | boolean) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let data: Array<string> = [];
        data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // todo return error message
      }
    };

    fetchCategories();
  }, []);
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
        <Select onValueChange={(value) => handleChange('category', value)}>
          <SelectTrigger className="w-[200px]">
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
        <div className="flex items-center space-x-2">
          <Checkbox
            id="active"
            checked={filters.enabled === true}
            onCheckedChange={(checked) =>
              handleChange('enabled', checked ? true : false)
            }
          />
          <label htmlFor="active" className="text-sm">
            Nur aktive Fragen
          </label>
        </div>
      </div>
    </>
  );
};

export default SearchFilters;
