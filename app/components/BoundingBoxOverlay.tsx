import React, { useState } from 'react';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Severity = 'high' | 'medium' | 'low';

const getColorClass = (severity: Severity, isSelected: boolean): string => {
  if (severity === 'high') return isSelected ? 'border-red-600 bg-red-400/30' : 'border-red-500 bg-red-400/20';
  if (severity === 'medium') return isSelected ? 'border-yellow-600 bg-yellow-400/30' : 'border-yellow-500 bg-yellow-400/20';
  return isSelected ? 'border-blue-600 bg-blue-400/30' : 'border-blue-500 bg-blue-400/20';
};

const getSeverityLabel = (severity: Severity): string => {
  if (severity === 'high') return 'High';
  if (severity === 'medium') return 'Medium';
  return 'Low';
};

interface BoundingBoxOverlayProps {
  box: Box;
  isSelected: boolean;
  severity: Severity;
  zoom: number;
  label?: string;
  type?: string;
  description?: string;
}

export const BoundingBoxOverlay: React.FC<BoundingBoxOverlayProps> = ({
  box, isSelected, severity, zoom, label, type, description
}: BoundingBoxOverlayProps) => {
  const [hovered, setHovered] = useState<boolean>(false);
  if (!box) return null;
  return (
    <div
      className={`absolute pointer-events-auto rounded transition-all duration-200 border-2 ${getColorClass(severity, isSelected)} ${isSelected ? 'border-4 animate-pulse z-30' : 'z-20'}`}
      style={{
        left: box.x * zoom,
        top: box.y * zoom,
        width: box.width * zoom,
        height: box.height * zoom,
      }}
      onMouseEnter={(): void => setHovered(true)}
      onMouseLeave={(): void => setHovered(false)}
    >
      {label && (
        <div className="absolute -top-6 left-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          {label}
        </div>
      )}
      {/* Tooltip */}
      {hovered && (
        <div className="absolute left-1/2 -top-10 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-pre pointer-events-none min-w-max max-w-xs">
          <div className="font-bold mb-1">{type || label} <span className={`ml-2 px-2 py-0.5 rounded text-xs ${severity === 'high' ? 'bg-red-600' : severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}>{getSeverityLabel(severity)}</span></div>
          {description && <div className="mb-1">{description}</div>}
          <div className="text-gray-300">{label}</div>
        </div>
      )}
    </div>
  );
};
export default BoundingBoxOverlay; 