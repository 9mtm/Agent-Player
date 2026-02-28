'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Info } from 'lucide-react';

interface Field {
  type: 'input' | 'textarea' | 'select' | 'checkbox' | 'password';
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  inputType?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: any;
}

interface FormSchema {
  type: 'form';
  title?: string;
  description?: string;
  fields: Field[];
  submitButton?: { label?: string; variant?: string };
}

interface Props {
  schema: FormSchema;
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onSave: () => void;
  loading: boolean;
}

export function FormSchemaRenderer({
  schema,
  values,
  onChange,
  onSave,
  loading
}: Props) {
  const handleFieldChange = (name: string, value: any) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="space-y-6">
      {schema.title && (
        <div>
          <h3 className="text-lg font-semibold">{schema.title}</h3>
          {schema.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {schema.description}
            </p>
          )}
        </div>
      )}

      {schema.fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>

          {field.helpText && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              {field.helpText}
            </p>
          )}

          {(field.type === 'input' || field.type === 'password') && (
            <Input
              id={field.name}
              type={field.type === 'password' ? 'password' : (field.inputType || 'text')}
              value={values[field.name] || field.defaultValue || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
            />
          )}

          {field.type === 'textarea' && (
            <Textarea
              id={field.name}
              value={values[field.name] || field.defaultValue || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
            />
          )}

          {field.type === 'select' && (
            <select
              id={field.name}
              value={values[field.name] || field.defaultValue || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required={field.required}
            >
              <option value="">Select...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {field.type === 'checkbox' && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={field.name}
                checked={values[field.name] ?? field.defaultValue ?? false}
                onCheckedChange={(checked) => handleFieldChange(field.name, checked)}
              />
              <label
                htmlFor={field.name}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {field.placeholder || 'Enable'}
              </label>
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onSave} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {schema.submitButton?.label || 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
