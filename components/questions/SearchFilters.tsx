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
    assigned?: boolean;
  }) => void;
  categories?: string[];
  showAssignedToggle?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  categories: categoriesProp,
  showAssignedToggle = true,
}) => {
  const [filters, setFilters] = useState({
    question: '',
    answer: '',
    type: '',
    category: '',
    assigned: undefined,
  });
  const [categories, setCategories] = useState<string[]>(categoriesProp || []);
  const resolvedCategories =
    categoriesProp && categoriesProp.length > 0 ? categoriesProp : categories;

  const handleChange = (field: string, value: string | boolean | undefined) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  useEffect(() => {
    // Use provided categories if available; otherwise fetch
    if (categoriesProp && categoriesProp.length > 0) {
      return;
    }
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
  }, [categoriesProp]);
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
            {resolvedCategories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
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
                handleChange('assigned', checked === true ? true : undefined)
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
