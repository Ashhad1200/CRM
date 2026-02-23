import * as React from 'react';
import { cn } from '../utils/cn.js';
import { Input } from '../primitives/input.js';
import { Textarea } from '../primitives/textarea.js';
import { Checkbox } from '../primitives/checkbox.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../primitives/select.js';

// ── Schema Types ────────────────────────────────────────────────────────────────

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'url'
  | 'phone'
  | 'currency';

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
  helperText?: string;
  /** Column span: 1 (half) or 2 (full width) in a 2-column grid */
  colSpan?: 1 | 2;
}

export interface FormBuilderProps {
  schema: FieldSchema[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
  className?: string;
  disabled?: boolean;
}

// ── Component ───────────────────────────────────────────────────────────────────

export const FormBuilder: React.FC<FormBuilderProps> = ({
  schema,
  values,
  errors = {},
  onChange,
  className,
  disabled = false,
}) => {
  const renderField = (field: FieldSchema): React.ReactNode => {
    const value = values[field.name];
    const error = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
      case 'number':
      case 'date':
      case 'currency':
        return (
          <Input
            id={field.name}
            type={field.type === 'currency' ? 'number' : field.type === 'phone' ? 'tel' : field.type}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            error={error}
            disabled={disabled}
            required={field.required}
            step={field.type === 'currency' ? '0.01' : undefined}
          />
        );

      case 'textarea':
        return (
          <Textarea
            id={field.name}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            error={error}
            disabled={disabled}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select
            value={(value as string) ?? ''}
            onValueChange={(v) => onChange(field.name, v)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder ?? 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <Checkbox
            id={field.name}
            checked={!!value}
            onCheckedChange={(checked) => onChange(field.name, checked)}
            label={field.label}
            disabled={disabled}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      {schema.map((field) => {
        const colSpan = field.colSpan ?? 1;
        const isCheckbox = field.type === 'checkbox';

        return (
          <div
            key={field.name}
            className={cn(colSpan === 2 && 'sm:col-span-2')}
          >
            {!isCheckbox && (
              <label
                htmlFor={field.name}
                className="mb-1.5 block text-sm font-medium text-neutral-700"
              >
                {field.label}
                {field.required && <span className="ml-0.5 text-danger-500">*</span>}
              </label>
            )}
            {renderField(field)}
            {field.helperText && !errors[field.name] && (
              <p className="mt-1 text-xs text-neutral-500">{field.helperText}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

FormBuilder.displayName = 'FormBuilder';
