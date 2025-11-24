import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export interface TimelineItemProps {
    date: string;
    title: string;
    status: 'completed' | 'current' | 'upcoming';
    description?: string;
}

export function Timeline({ items }: { items: TimelineItemProps[] }) {
    return (
        <div className="space-y-0">
            {items.map((item, i) => (
                <div key={i} className="relative flex gap-4 pb-8 last:pb-0">
                    {/* Vertical Line */}
                    {i !== items.length - 1 && (
                        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />
                    )}

                    {/* Icon */}
                    <div className="relative z-10 flex-shrink-0">
                        {item.status === 'completed' && (
                            <CheckCircle2 className="w-6 h-6 text-green-500 bg-white dark:bg-gray-950" />
                        )}
                        {item.status === 'current' && (
                            <Clock className="w-6 h-6 text-blue-500 bg-white dark:bg-gray-950" />
                        )}
                        {item.status === 'upcoming' && (
                            <Circle className="w-6 h-6 text-gray-300 dark:text-gray-700 bg-white dark:bg-gray-950" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-0.5">
                        <div className="flex justify-between items-start">
                            <h4 className={`font-medium ${item.status === 'upcoming' ? 'text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                {item.title}
                            </h4>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                {item.date}
                            </span>
                        </div>
                        {item.description && (
                            <p className="text-sm text-gray-500 mt-1">
                                {item.description}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
