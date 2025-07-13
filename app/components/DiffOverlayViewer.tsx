import React from 'react';
import { BoundingBox, VisualDiff } from '../types';

interface DiffOverlayViewerProps {
  imageUrl: string;
  diffs: VisualDiff[];
  imageMetadata: {
    width: number;
    height: number;
  };
  containerWidth?: number;
}

const DiffOverlayViewer: React.FC<DiffOverlayViewerProps> = ({
  imageUrl,
  diffs,
  imageMetadata,
  containerWidth = 800
}) => {
  const imageRef = React.useRef<HTMLImageElement>(null);
  const [scale, setScale] = React.useState(1);

  // Calculate scale factor when image loads or container size changes
  React.useEffect(() => {
    if (imageRef.current) {
      const newScale = containerWidth / imageMetadata.width;
      setScale(newScale);
    }
  }, [containerWidth, imageMetadata.width]);

  // Function to scale bounding box coordinates
  const scaleBox = (box: BoundingBox): { top: number; left: number; width: number; height: number } => {
    return {
      top: box.y * scale,
      left: box.x * scale,
      width: box.width * scale,
      height: box.height * scale
    };
  };

  // Function to truncate text for display
  const truncateText = (text: string, maxLength: number = 30) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="relative" style={{ width: containerWidth, height: (imageMetadata.height * scale) }}>
      {/* Base image */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Design comparison"
        className="w-full h-full object-contain"
        style={{ maxWidth: '100%' }}
      />

      {/* Overlay boxes */}
      {diffs.map((diff) => {
        const box = scaleBox(diff.type === 'missing' ? diff.figmaBox : diff.domBox);
        
        return (
          <div
            key={diff.id}
            className="absolute border-2 border-red-500 bg-red-100 bg-opacity-20 transition-all duration-200 hover:bg-opacity-30"
            style={{
              top: `${box.top}px`,
              left: `${box.left}px`,
              width: `${box.width}px`,
              height: `${box.height}px`
            }}
          >
            {/* Label */}
            <div className="absolute -top-6 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {diff.type === 'text' ? (
                <>
                  Text: {truncateText(diff.figmaValue)} → {truncateText(diff.liveValue)}
                </>
              ) : diff.type === 'missing' ? (
                <>Missing: {truncateText(diff.figmaValue)}</>
              ) : (
                <>{diff.type}: {truncateText(diff.figmaValue)} → {truncateText(diff.liveValue)}</>
              )}
            </div>

            {/* Severity indicator */}
            <div className={`absolute -right-2 -top-2 w-4 h-4 rounded-full border-2 border-white ${
              diff.severity === 'high' ? 'bg-red-500' :
              diff.severity === 'medium' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`} />
          </div>
        );
      })}
    </div>
  );
};

export default DiffOverlayViewer; 