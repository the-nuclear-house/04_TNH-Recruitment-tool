import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  onSearch?: (query: string) => void; // For async search
  minChars?: number; // Minimum characters before showing results
  maxResults?: number; // Maximum results to show
}

export function SearchableSelect({
  label,
  placeholder = 'Type to search...',
  options,
  value,
  onChange,
  error,
  disabled = false,
  loading = false,
  onSearch,
  minChars = 1,
  maxResults = 10,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find selected option for display
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search
  const filteredOptions = searchQuery.length >= minChars
    ? options
        .filter(opt => 
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.sublabel?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, maxResults)
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setHighlightedIndex(0);
    setIsOpen(true);
    
    // Call async search if provided
    if (onSearch) {
      onSearch(query);
    }
  };

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-brand-slate-700 mb-1.5">
          {label}
        </label>
      )}
      
      <div className="relative">
        {/* Input / Display */}
        <div
          className={`
            w-full px-4 py-2.5 pr-10 rounded-lg border bg-white
            flex items-center gap-2 cursor-text
            transition-all duration-200
            ${disabled ? 'bg-brand-grey-100 cursor-not-allowed' : ''}
            ${error ? 'border-red-500' : isOpen ? 'border-brand-cyan ring-2 ring-brand-cyan/30' : 'border-brand-grey-200'}
          `}
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
        >
          <Search className="h-4 w-4 text-brand-grey-400 flex-shrink-0" />
          
          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={selectedOption ? selectedOption.label : placeholder}
              className="flex-1 outline-none bg-transparent text-brand-slate-900 placeholder:text-brand-grey-400"
              autoFocus
              disabled={disabled}
            />
          ) : (
            <span className={`flex-1 ${selectedOption ? 'text-brand-slate-900' : 'text-brand-grey-400'}`}>
              {selectedOption ? (
                <span className="flex items-center gap-2">
                  <span>{selectedOption.label}</span>
                  {selectedOption.sublabel && (
                    <span className="text-sm text-brand-grey-400">({selectedOption.sublabel})</span>
                  )}
                </span>
              ) : placeholder}
            </span>
          )}

          {/* Clear button or dropdown icon */}
          {value && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-brand-grey-100 rounded"
            >
              <X className="h-4 w-4 text-brand-grey-400" />
            </button>
          ) : (
            <ChevronDown className={`h-4 w-4 text-brand-grey-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-lg border border-brand-grey-200 shadow-lg max-h-60 overflow-auto">
            {loading ? (
              <div className="px-4 py-3 text-sm text-brand-grey-400 text-center">
                Searching...
              </div>
            ) : searchQuery.length < minChars ? (
              <div className="px-4 py-3 text-sm text-brand-grey-400 text-center">
                Type at least {minChars} character{minChars > 1 ? 's' : ''} to search
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-brand-grey-400 text-center">
                No results found
              </div>
            ) : (
              <ul className="py-1">
                {filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      px-4 py-2.5 cursor-pointer flex items-center justify-between
                      ${index === highlightedIndex ? 'bg-brand-cyan/10' : 'hover:bg-brand-grey-50'}
                      ${option.value === value ? 'bg-brand-cyan/5' : ''}
                    `}
                  >
                    <div>
                      <div className="text-sm font-medium text-brand-slate-900">
                        {option.label}
                      </div>
                      {option.sublabel && (
                        <div className="text-xs text-brand-grey-400">
                          {option.sublabel}
                        </div>
                      )}
                    </div>
                    {option.value === value && (
                      <div className="w-2 h-2 rounded-full bg-brand-cyan" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
