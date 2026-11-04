import { cn } from '@/presentation/lib';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'danger';

const styles: Record<Variant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-700',
  outline: 'border border-slate-300 bg-white hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-500',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
