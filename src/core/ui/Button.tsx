import { h } from 'preact';

interface ButtonProps {
  children: preact.ComponentChildren;
  onClick?: () => void;
  type?: 'button' | 'submit';
  class?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Button({ children, onClick, type = 'button', class: cls = '', disabled, 'aria-label': ariaLabel }: ButtonProps) {
  return (
    <button type={type} class={`btn ${cls}`.trim()} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
