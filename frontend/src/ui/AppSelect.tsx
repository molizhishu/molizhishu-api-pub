import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type AppSelectOption = {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
};

type AppSelectProps = {
  value: string;
  options: AppSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function AppSelect({ value, options, onChange, placeholder = '请选择', disabled = false, ariaLabel, className = '' }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((item) => item.value === value);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className={`appSelect ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="appSelectTrigger"
        onClick={() => !disabled && setOpen((value) => !value)}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span className={selected ? 'appSelectValue' : 'placeholder'}>
          {selected?.icon && <img src={selected.icon} alt="" />}
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="appSelectContent">
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <button
                type="button"
                className={`appSelectItem ${checked ? 'selected' : ''}`}
                key={option.value || '__empty'}
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="appSelectCheck">{checked && <Check size={16} />}</span>
                <span className="appSelectOptionLabel">
                  {option.icon && <img src={option.icon} alt="" />}
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
