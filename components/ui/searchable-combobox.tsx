"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

interface SearchableComboboxProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}

export function SearchableCombobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!value) return options;
    const filter = value.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(filter));
  }, [options, value]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-xs font-semibold mb-1 text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-3 pr-9 py-2 text-sm rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((item) => {
                const isSelected = value.toLowerCase() === item.toLowerCase();
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs sm:text-sm hover:bg-muted flex items-center justify-between transition-colors ${
                      isSelected ? "bg-muted font-semibold text-primary" : "text-foreground"
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-xs text-muted-foreground text-center">
              Opción personalizada: <span className="font-semibold text-foreground">"{value}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
