import React, { useState, useEffect, useRef } from 'react';
import { ChevronUpDownIcon } from './icons';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  direction?: 'up' | 'down';
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  direction = 'down',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleToggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      setSearchTerm('');
    }
    setIsOpen(!isOpen);
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!isOpen) {
      setIsOpen(true);
      setSearchTerm('');
    }
  };

  const dropdownClasses =
    direction === 'up'
      ? 'absolute z-50 w-full bottom-full mb-1 bg-surface border border-brand-border rounded-md shadow-lg max-h-60 overflow-auto'
      : 'absolute z-50 w-full top-full mt-1 bg-surface border border-brand-border rounded-md shadow-lg max-h-60 overflow-auto';

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`flex items-center justify-between w-full p-2 border border-brand-border rounded-md bg-surface text-ink focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-shadow ${disabled ? 'bg-surface-alt cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={handleToggleDropdown}
      >
        <input
          type="text"
          value={isOpen ? searchTerm : selectedOption?.label || ''}
          onChange={handleInputChange}
          onClick={handleInputClick}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent outline-none border-none placeholder:text-ink-faint"
          aria-label="Searchable select input"
        />
        <ChevronUpDownIcon className="h-5 w-5 text-ink-faint" />
      </div>

      {isOpen && !disabled && (
        <ul className={dropdownClasses}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option.value}
                className="px-4 py-2 cursor-pointer hover:bg-accent-soft text-ink"
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-ink-soft">Không tìm thấy kết quả.</li>
          )}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
