import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';
type Size = 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  // Full width. The mobile thumb zone wants this; desktop rarely does.
  block?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium select-none transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out-quart focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 aria-busy:cursor-progress';

const variants: Record<Variant, string> = {
  primary: 'bg-focus text-ground hover:bg-focus-deep',
  ghost:
    'border border-hairline bg-transparent text-ink hover:border-ink-2 hover:bg-ground-2',
};

const sizes: Record<Size, string> = {
  md: 'min-h-11 px-4 text-[0.9375rem]',
  lg: 'min-h-14 px-6 text-base',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  block = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
    {...props}
  />
);
