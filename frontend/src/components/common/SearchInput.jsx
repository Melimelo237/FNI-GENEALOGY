// ===================================
// src/components/common/SearchInput.jsx
import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { debounce } from '../../utils/helpers';

const SearchInput = ({ 
  placeholder = "Rechercher...", 
  onSearch, 
  delay = 300,
  showClearButton = true,
  className = ""
}) => {
  const [value, setValue] = useState('');

  // Fonction de recherche avec debounce
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      onSearch(searchValue);
    }, delay),
    [onSearch, delay]
  );

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="input-field pl-10 pr-10"
      />
      
      {showClearButton && value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;