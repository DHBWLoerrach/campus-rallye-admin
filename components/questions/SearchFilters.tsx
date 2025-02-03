import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { questionTypes } from './helpers';
import React, { useEffect, useState } from "react"
import { getCategories } from "@/actions/question";

interface SearchFiltersProps {
  onFilterChange: (filters: { question?: string, answer?: string, type?: string, category?: string }) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = React.useState({ question: '', answer: '', type: '', category: '' });
  const [categories, setCategories] = useState<string[]>([]);

  const handleChange = (field: string, value: string) => {
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
      }
    };

    fetchCategories();
  }, []);
  return (
    <>
      <div className="flex flex-wrap gap-4 flex-1">
        <Input placeholder="Suche (Frage)" className="max-w-[200px]" onChange={(e) => handleChange('question', e.target.value)} />
        <Input placeholder="Suche (Antwort)" className="max-w-[200px]" onChange={(e) => handleChange('answer', e.target.value)} />
        <Select onValueChange={(value) => handleChange('type', value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Alle</SelectItem>
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
            <SelectItem value={null}>Alle</SelectItem>
            {categories.map((category) => (
              <SelectItem value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2">
          <Checkbox id="active" />
          <label htmlFor="active" className="text-sm">
            Nur aktive Fragen
          </label>
        </div>
      </div>

    </>
  )
}

export default SearchFilters;