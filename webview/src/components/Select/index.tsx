import React, { ChangeEvent } from 'react';
import './style.css';

interface SelectOption {
  value: string;
  label: string;
  selected?: boolean;
}

interface SelectProps {
  id?: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}

const Select: React.FC<SelectProps> = ({ id, options, defaultValue, onChange, placeholder }) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <select id={id} className="select" onChange={handleChange} defaultValue={defaultValue}>
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
