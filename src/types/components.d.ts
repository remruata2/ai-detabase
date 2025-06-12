import { ButtonHTMLAttributes, HTMLAttributes } from 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Add any custom HTML attributes here
    'data-testid'?: string;
  }

  interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    // Add any custom button attributes here
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    asChild?: boolean;
  }
}

// Add any other component type declarations here
