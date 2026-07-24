import { cn } from '@/lib/utils';

export function MailflowLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('text-primary', className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M8 11.5h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 8 20.5v-9Z"
        fill="white"
        fillOpacity="0.18"
      />
      <path
        d="m8.6 12.4 7.4 5 7.4-5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="10" r="3.2" fill="white" />
      <path
        d="M21.8 10l.9.9 1.7-1.8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
