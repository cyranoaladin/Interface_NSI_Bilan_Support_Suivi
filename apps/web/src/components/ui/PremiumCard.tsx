import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'neon';
}

export function PremiumCard({ className, variant = 'default', children, ...props }: PremiumCardProps) {
    const variants = {
        default: 'bg-white/5 border border-white/10 shadow-xl backdrop-blur-sm',
        glass: 'bg-white/10 border border-white/20 shadow-2xl backdrop-blur-md',
        neon: 'bg-black/40 border border-electric/50 shadow-[0_0_15px_rgba(56,189,248,0.3)] backdrop-blur-md',
    };

    return (
        <div
            className={cn(
                'rounded-2xl transition-all duration-300 hover:scale-[1.01]',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
