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
  | 'currency'
  | 'repeater'
  | 'section';

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
  /** Conditional visibility based on another field's value */
  visibleWhen?: { field: string; value: unknown };
  /** Sub-fields for repeater type */
  repeatFields?: FieldSchema[];
}

export interface FormBuilderProps {
  schema: FieldSchema[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (name: string, value: unknown) => void;
  className?: string;
  disabled?: boolean;
  /** Visual variant: 'flat' (default) or 'glass' for glass-morphism field containers */
  variant?: 'flat' | 'glass';
}

// ── Component ───────────────────────────────────────────────────────────────────

export const FormBuilder: React.FC<FormBuilderProps> = ({
  schema,
  values,
  errors = {},
  onChange,
  className,
  disabled = false,
  variant = 'flat',
}) => {
  /** Render a single input for repeater sub-fields with local value/onChange */
  const renderSubField = (
    sub: FieldSchema,
    subValue: unknown,
    subId: string,
    subErr: string | undefined,
    onSubChange: (v: unknown) => void,
  ): React.ReactNode => {
    switch (sub.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
      case 'number':
      case 'date':
      case 'currency':
        return (
          <Input
            id={subId}
            type={sub.type === 'currency' ? 'number' : sub.type === 'phone' ? 'tel' : sub.type}
            value={(subValue as string) ?? ''}
            onChange={(e) => onSubChange(e.target.value)}
            placeholder={sub.placeholder}
            error={subErr}
            disabled={disabled}
            required={sub.required}
            step={sub.type === 'currency' ? '0.01' : undefined}
          />
        );
      case 'textarea':
        return (
          <Textarea
            id={subId}
            value={(subValue as string) ?? ''}
            onChange={(e) => onSubChange(e.target.value)}
            placeholder={sub.placeholder}
            error={subErr}
            disabled={disabled}
            required={sub.required}
          />
        );
      case 'select':
        return (
          <Select
            value={(subValue as string) ?? ''}
            onValueChange={onSubChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={sub.placeholder ?? 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {(sub.options ?? []).map((opt) => (
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
            id={subId}
            checked={!!subValue}
            onCheckedChange={onSubChange}
            label={sub.label}
            disabled={disabled}
          />
        );
      default:
        return null;
    }
  };

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

      case 'section':
        return (
          <div className="border-b border-neutral-200 pb-1 dark:border-neutral-700">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {field.label}
            </h3>
          </div>
        );

      case 'repeater': {
        const entries = (Array.isArray(value) ? value : []) as Record<string, unknown>[];
        const updateEntry = (idx: number, subName: string, subValue: unknown) => {
          const next = entries.map((e, i) =>
            i === idx ? { ...e, [subName]: subValue } : e,
          );
          onChange(field.name, next);
        };
        return (
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <div key={idx} className="relative rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
                <button
                  type="button"
                  disabled={disabled}
                  className="absolute right-2 top-2 text-sm text-neutral-400 hover:text-danger-500"
                  onClick={() => {
                    const next = entries.filter((_, i) => i !== idx);
                    onChange(field.name, next);
                  }}
                >
                  ×
                </button>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(field.repeatFields ?? []).map((sub) => {
                    const subErr = errors[`${field.name}.${idx}.${sub.name}`];
                    const subId = `${field.name}.${idx}.${sub.name}`;
                    return (
                      <div key={sub.name} className={cn(sub.colSpan === 2 && 'sm:col-span-2')}>
                        {sub.type !== 'checkbox' && (
                          <label
                            htmlFor={subId}
                            className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                          >
                            {sub.label}
                            {sub.required && <span className="ml-0.5 text-danger-500">*</span>}
                          </label>
                        )}
                        {renderSubField(sub, entry[sub.name], subId, subErr, (v) => updateEntry(idx, sub.name, v))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={disabled}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
              onClick={() => {
                const blank: Record<string, unknown> = {};
                (field.repeatFields ?? []).forEach((sf) => {
                  blank[sf.name] = sf.defaultValue ?? '';
                });
                onChange(field.name, [...entries, blank]);
              }}
            >
              + Add
            </button>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', className)}>
      {schema.map((field) => {
        // Conditional visibility
        if (field.visibleWhen && values[field.visibleWhen.field] !== field.visibleWhen.value) {
          return null;
        }

        const colSpan = field.colSpan ?? 1;
        const isCheckbox = field.type === 'checkbox';
        const isSection = field.type === 'section';

        return (
          <div
            key={field.name}
            className={cn(
              colSpan === 2 && 'sm:col-span-2',
              isSection && 'sm:col-span-2',
              variant === 'glass' && !isSection && 'glass-1 rounded-lg p-3',
            )}
          >
            {!isCheckbox && !isSection && (
              <label
                htmlFor={field.name}
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
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
