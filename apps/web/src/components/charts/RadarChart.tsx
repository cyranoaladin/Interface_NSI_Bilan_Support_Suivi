import React from 'react';

interface RadarChartProps {
    data: Record<string, number>;
    size?: number;
    color?: string;
}

export function RadarChart({ data, size = 300, color = '#4f46e5' }: RadarChartProps) {
    const keys = Object.keys(data);
    const numPoints = keys.length;
    const radius = size / 2;
    const center = size / 2;
    const angleStep = (Math.PI * 2) / numPoints;

    // Helper to calculate coordinates
    const getCoordinates = (value: number, index: number) => {
        const angle = index * angleStep - Math.PI / 2; // Start at top
        const x = center + Math.cos(angle) * (radius * value);
        const y = center + Math.sin(angle) * (radius * value);
        return { x, y };
    };

    // Calculate points for the data polygon
    const points = keys.map((key, i) => {
        const value = data[key]; // Assuming value is 0-1
        const { x, y } = getCoordinates(value, i);
        return `${x},${y}`;
    }).join(' ');

    // Calculate points for the background grid (concentric polygons)
    const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
    const gridPolygons = gridLevels.map(level => {
        return keys.map((_, i) => {
            const { x, y } = getCoordinates(level, i);
            return `${x},${y}`;
        }).join(' ');
    });

    // Calculate label positions
    const labelPoints = keys.map((key, i) => {
        const { x, y } = getCoordinates(1.15, i); // Slightly outside
        return { x, y, label: key };
    });

    return (
        <div className="relative flex justify-center items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Grid */}
                {gridPolygons.map((poly, i) => (
                    <polygon
                        key={i}
                        points={poly}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="1"
                    />
                ))}

                {/* Axis Lines */}
                {keys.map((_, i) => {
                    const { x, y } = getCoordinates(1, i);
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={x}
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="1"
                        />
                    );
                })}

                {/* Data Polygon */}
                <polygon
                    points={points}
                    fill={color}
                    fillOpacity="0.2"
                    stroke={color}
                    strokeWidth="2"
                />

                {/* Data Points */}
                {keys.map((key, i) => {
                    const value = data[key];
                    const { x, y } = getCoordinates(value, i);
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4"
                            fill={color}
                        />
                    );
                })}

                {/* Labels */}
                {labelPoints.map((p, i) => (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="12"
                        fill="#6b7280"
                        className="font-medium"
                    >
                        {p.label}
                    </text>
                ))}
            </svg>
        </div>
    );
}
