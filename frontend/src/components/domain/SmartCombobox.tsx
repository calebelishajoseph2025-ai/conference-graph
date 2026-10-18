import { useState } from 'react';
import { useGraphSearch, type SearchType } from '@/api/hooks/queries';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { ComboBox, type ComboOption } from '@/components/ui/Combobox';

export function SmartCombobox({
  kind,
  value,
  onSelect,
  onClear,
  placeholder,
  disabled,
  inputId,
}: {
  kind: SearchType;
  value: ComboOption | null;
  onSelect: (option: ComboOption) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 250);
  const search = useGraphSearch(debounced, kind);
  const options: ComboOption[] =
    debounced.length === 0
      ? []
      : (search.data ?? []).map((item) => ({ id: item.rawId, label: item.title, hint: item.subtitle ?? undefined }));

  return (
    <ComboBox
      value={value}
      options={options}
      loading={search.isFetching}
      query={query}
      onQueryChange={setQuery}
      onSelect={(option) => {
        onSelect(option);
        setQuery('');
      }}
      onClear={onClear}
      placeholder={placeholder}
      disabled={disabled}
      errorText={search.isError ? 'Search is unavailable right now.' : undefined}
      emptyText={search.isError ? 'Search failed.' : 'No matches.'}
      inputId={inputId}
    />
  );
}
