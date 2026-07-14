import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { questionTypes } from '@/helpers/questionTypes';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RallyeOption } from '@/lib/types';
import type { QuestionCatalogFilters } from '@/lib/question-filters';

interface SearchFiltersProps {
  onFilterChange: (filters: QuestionCatalogFilters) => void;
  categories: string[];
  rallyes?: RallyeOption[];
  compact?: boolean;
}

type FilterState = {
  search: string;
  type: string;
  category: string;
  rallyeId: string;
};

const initialFilters: FilterState = {
  search: '',
  type: 'all',
  category: 'all',
  rallyeId: 'all',
};

const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFilterChange,
  categories,
  rallyes,
  compact = false,
}) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const handleChange = <K extends keyof FilterState>(
    field: K,
    value: FilterState[K]
  ) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilter = (field: keyof FilterState) => {
    if (field === 'type' || field === 'category' || field === 'rallyeId') {
      handleChange(field, 'all');
    } else {
      handleChange(field, '');
    }
  };

  const typeLabel = questionTypes.find(
    (type) => type.id === filters.type
  )?.action;
  const rallyeLabel = rallyes?.find(
    (rallye) => String(rallye.id) === filters.rallyeId
  )?.name;
  const normalizedSearch = filters.search.trim();
  const activeFilters = [
    normalizedSearch
      ? { field: 'search' as const, label: `Suche: ${normalizedSearch}` }
      : null,
    typeLabel ? { field: 'type' as const, label: typeLabel } : null,
    filters.category !== 'all'
      ? { field: 'category' as const, label: `Kategorie: ${filters.category}` }
      : null,
    rallyeLabel
      ? { field: 'rallyeId' as const, label: `Rallye: ${rallyeLabel}` }
      : null,
  ].filter((filter) => filter !== null);

  const gridClassName = compact
    ? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
    : rallyes !== undefined
      ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(0,13rem))]'
      : 'grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_repeat(2,minmax(0,13rem))]';

  return (
    <div className="flex flex-col gap-3">
      <div className={gridClassName}>
        <div className={`relative ${compact ? 'sm:col-span-2' : ''}`}>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Frage oder Lösungsoption suchen"
            placeholder="Frage oder Lösungsoption suchen …"
            value={filters.search}
            onChange={(event) => handleChange('search', event.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.type}
          onValueChange={(value) => handleChange('type', value ?? 'all')}
          items={[
            { value: 'all', label: 'Alle Fragetypen' },
            ...questionTypes.map((type) => ({
              value: type.id,
              label: type.action,
            })),
          ]}
        >
          <SelectTrigger aria-label="Fragetyp">
            <SelectValue placeholder="Alle Fragetypen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Fragetypen</SelectItem>
            {questionTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category}
          onValueChange={(value) => handleChange('category', value ?? 'all')}
          items={[
            { value: 'all', label: 'Alle Kategorien' },
            ...categories.map((category) => ({
              value: category,
              label: category,
            })),
          ]}
        >
          <SelectTrigger aria-label="Kategorie">
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rallyes && (
          <Select
            value={filters.rallyeId}
            onValueChange={(value) => handleChange('rallyeId', value ?? 'all')}
            items={[
              { value: 'all', label: 'Alle Rallyes' },
              ...rallyes.map((rallye) => ({
                value: rallye.id.toString(),
                label: rallye.name,
              })),
            ]}
          >
            <SelectTrigger className="w-full" aria-label="Rallye">
              <SelectValue placeholder="Alle Rallyes" />
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
      {activeFilters.length > 0 && (
        <div
          role="region"
          aria-label="Aktive Filter"
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-xs font-medium text-muted-foreground">
            Aktiv:
          </span>
          {activeFilters.map((filter) => (
            <Button
              key={filter.field}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => clearFilter(filter.field)}
              aria-label={`Filter „${filter.label}“ entfernen`}
              className="h-7 max-w-full px-2.5 text-xs"
            >
              <span className="max-w-64 truncate">{filter.label}</span>
              <X aria-hidden="true" className="size-3" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
