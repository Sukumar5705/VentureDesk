import React from 'react';

// Shared base style for all form controls
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid var(--vd-border-muted)',
  borderRadius: 'var(--radius-input)',
  fontSize: 13.5,
  fontFamily: 'var(--font-sans)',
  fontWeight: 400,
  color: 'var(--vd-text)',
  background: 'var(--vd-card-strong)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 140ms ease, box-shadow 140ms ease',
  lineHeight: 1.5,
};

// ── Input ─────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, ...rest }: InputProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label
        htmlFor={fieldId}
        style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--vd-text)', display: 'block', letterSpacing: '-0.01em' }}
      >
        {label}
        {rest.required && <span style={{ color: 'var(--vd-red)', marginLeft: 2 }} aria-hidden="true">*</span>}
      </label>
      <input
        id={fieldId}
        {...rest}
        style={{
          ...inputBase,
          ...(error ? { borderColor: 'var(--vd-red)' } : {}),
          ...rest.style,
        }}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        onFocus={e => {
          e.target.style.borderColor = error ? 'var(--vd-red)' : 'var(--vd-text)';
          e.target.style.boxShadow = error
            ? '0 0 0 3px rgba(208,77,68,0.12)'
            : '0 0 0 3px rgba(15,20,23,0.07)';
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--vd-red)' : 'var(--vd-border-muted)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {hint && !error && (
        <span id={`${fieldId}-hint`} style={{ fontSize: 11.5, color: 'var(--vd-text-secondary)' }}>{hint}</span>
      )}
      {error && (
        <span
          id={`${fieldId}-error`}
          role="alert"
          style={{ fontSize: 11.5, color: 'var(--vd-red)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

// ── Select ────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function Select({ label, error, id, children, ...rest }: SelectProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label
        htmlFor={fieldId}
        style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--vd-text)', display: 'block', letterSpacing: '-0.01em' }}
      >
        {label}
        {rest.required && <span style={{ color: 'var(--vd-red)', marginLeft: 2 }} aria-hidden="true">*</span>}
      </label>
      <select
        id={fieldId}
        {...rest}
        style={{
          ...inputBase,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7177' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: 36,
          cursor: 'pointer',
          ...(error ? { borderColor: 'var(--vd-red)' } : {}),
          ...rest.style,
        } as React.CSSProperties}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      >
        {children}
      </select>
      {error && (
        <span id={`${fieldId}-error`} role="alert" style={{ fontSize: 11.5, color: 'var(--vd-red)', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({ label, error, id, ...rest }: TextareaProps) {
  const fieldId = id ?? `field-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label
        htmlFor={fieldId}
        style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--vd-text)', display: 'block', letterSpacing: '-0.01em' }}
      >
        {label}
        {rest.required && <span style={{ color: 'var(--vd-red)', marginLeft: 2 }} aria-hidden="true">*</span>}
      </label>
      <textarea
        id={fieldId}
        {...rest}
        style={{
          ...inputBase,
          resize: 'vertical',
          minHeight: 84,
          lineHeight: 1.55,
          ...(error ? { borderColor: 'var(--vd-red)' } : {}),
          ...rest.style,
        }}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        onFocus={e => {
          e.target.style.borderColor = error ? 'var(--vd-red)' : 'var(--vd-text)';
          e.target.style.boxShadow = error
            ? '0 0 0 3px rgba(208,77,68,0.12)'
            : '0 0 0 3px rgba(15,20,23,0.07)';
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--vd-red)' : 'var(--vd-border-muted)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {error && (
        <span id={`${fieldId}-error`} role="alert" style={{ fontSize: 11.5, color: 'var(--vd-red)', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
}
