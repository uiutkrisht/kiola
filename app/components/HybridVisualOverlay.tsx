import React, { useRef, useEffect, useState } from 'react';
import { VisualDiff } from '../types';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  imageSrc: string;
  diffs: VisualDiff[];
  originalWidth: number;
  originalHeight: number;
  onDiffClick?: (diff: VisualDiff) => void;
  onDiffHover?: (diff: VisualDiff | null) => void;
}

const HybridVisualOverlay: React.FC<Props> = ({
  imageSrc,
  diffs,
  originalWidth,
  originalHeight,
  onDiffClick,
  onDiffHover,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDiff, setHoveredDiff] = useState<string | null>(null);
  const [renderDimensions, setRenderDimensions] = useState({ width: 0, height: 0 });

  // Calculate and set render dimensions based on container width and image aspect ratio
  useEffect(() => {
    console.log('📏 Dimension calculation useEffect triggered:', {
      hasContainer: !!containerRef.current,
      originalWidth,
      originalHeight
    });

    const container = containerRef.current;
    if (container && originalWidth > 0) {
      const updateDimensions = () => {
        const containerWidth = container.clientWidth;
        console.log('📐 Container width measured:', containerWidth);

        if (containerWidth > 0) {
          const scale = containerWidth / originalWidth;
          const containerHeight = originalHeight * scale;
          
          console.log('🧮 Dimension calculation:', {
            containerWidth,
            originalWidth,
            originalHeight,
            scale,
            calculatedHeight: containerHeight
          });

          setRenderDimensions({ width: containerWidth, height: containerHeight });
          console.log('✅ Render dimensions set:', { width: containerWidth, height: containerHeight });
        } else {
          console.log('⚠️ Container width is 0, skipping dimension update');
        }
      };

      updateDimensions();
      
      const resizeObserver = new ResizeObserver(() => {
        console.log('🔄 ResizeObserver triggered');
        updateDimensions();
      });
      resizeObserver.observe(container);
      
      return () => {
        console.log('🧹 Cleaning up ResizeObserver');
        resizeObserver.disconnect();
      };
    } else {
      console.log('❌ Cannot calculate dimensions:', {
        hasContainer: !!container,
        originalWidth,
        originalHeight
      });
      // Return a no-op cleanup function for this code path
      return () => {};
    }
  }, [originalWidth, originalHeight]);

  // Calculate scaled coordinates for overlays
  const getScaledCoordinates = (box: Box): { x: number, y: number, width: number, height: number } => {
    if (originalWidth === 0 || originalHeight === 0 || !box) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    const scaleX = renderDimensions.width / originalWidth;
    const scaleY = renderDimensions.height / originalHeight;
    
    return {
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
    };
  };

  // Draw canvas with image and diff boxes
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    console.log('🎨 HybridVisualOverlay useEffect triggered:', {
      hasCanvas: !!canvas,
      hasCtx: !!ctx,
      imageSrc: imageSrc ? `${imageSrc.substring(0, 50)}...` : 'NO IMAGE',
      imageSrcLength: imageSrc?.length || 0,
      renderDimensions,
      originalWidth,
      originalHeight,
      diffsCount: diffs.length
    });

    if (!canvas || !ctx || !imageSrc || renderDimensions.width === 0) {
      console.log('❌ Early return from useEffect:', {
        hasCanvas: !!canvas,
        hasCtx: !!ctx,
        hasImageSrc: !!imageSrc,
        renderWidth: renderDimensions.width
      });
      return;
    }

    console.log('🚀 Creating new Image object...');
    const img = new Image();
    
    img.onload = () => {
      console.log('✅ Image loaded successfully!', {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        renderDimensions
      });

      // Set canvas resolution
      canvas.width = renderDimensions.width;
      canvas.height = renderDimensions.height;
      
      // Also set CSS dimensions to match
      canvas.style.width = `${renderDimensions.width}px`;
      canvas.style.height = `${renderDimensions.height}px`;
      
      console.log('📐 Canvas dimensions set:', {
        width: canvas.width,
        height: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height
      });
      
      const scaleX = renderDimensions.width / originalWidth;
      const scaleY = renderDimensions.height / originalHeight;

      console.log('📏 Scale factors:', { scaleX, scaleY });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      console.log('🧹 Canvas cleared');
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      console.log('🖼️ Image drawn to canvas');

      console.log(`🎯 Drawing ${diffs.length} diff boxes...`);
      diffs.forEach((diff, i) => {
        const box = diff.domBox || diff.figmaBox;
        const x = box.x * scaleX;
        const y = box.y * scaleY;
        const w = box.width * scaleX;
        const h = box.height * scaleY;

        if (i === 0) {
          console.log('📦 First diff box:', {
            originalBox: box,
            scaledBox: { x, y, w, h },
            diffId: diff.id
          });
        }

        const isHovered = hoveredDiff === diff.id;
        let strokeColor = 'red';
        let fillColor = 'rgba(255, 0, 0, 0.2)';
        
        switch (diff.severity) {
          case 'high':
            strokeColor = isHovered ? '#dc2626' : '#ef4444';
            fillColor = isHovered ? 'rgba(220, 38, 38, 0.3)' : 'rgba(239, 68, 68, 0.2)';
            break;
          case 'medium':
            strokeColor = isHovered ? '#d97706' : '#f59e0b';
            fillColor = isHovered ? 'rgba(217, 119, 6, 0.3)' : 'rgba(245, 158, 11, 0.2)';
            break;
          case 'low':
            strokeColor = isHovered ? '#2563eb' : '#3b82f6';
            fillColor = isHovered ? 'rgba(37, 99, 235, 0.3)' : 'rgba(59, 130, 246, 0.2)';
            break;
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.strokeRect(x, y, w, h);

        const label = `${diff.type}: ${diff.figmaValue} → ${diff.liveValue}`;
        const truncatedLabel = label.length > 50 ? label.substring(0, 47) + '...' : label;
        
        ctx.fillStyle = strokeColor;
        ctx.font = isHovered ? 'bold 12px sans-serif' : '11px sans-serif';
        ctx.fillText(truncatedLabel, x, y > 10 ? y - 6 : y + h + 12);

        ctx.beginPath();
        ctx.arc(x + w - 8, y + 8, 4, 0, 2 * Math.PI);
        ctx.fillStyle = strokeColor;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      console.log('🎨 Canvas drawing complete!');
      
      // Force a repaint by slightly modifying the canvas
      canvas.style.transform = 'translateZ(0)';
      
      // Test if we can get image data (confirms drawing worked)
      try {
        ctx.getImageData(0, 0, 1, 1);
        console.log('✅ Canvas content verified - pixel data accessible');
      } catch (e) {
        console.error('❌ Canvas content verification failed:', e);
      }
    };
    
    img.onerror = (e) => {
      console.error('❌ Image failed to load:', {
        error: e,
        imageSrcStart: imageSrc.substring(0, 100),
        imageSrcLength: imageSrc.length,
        isDataUrl: imageSrc.startsWith('data:'),
        mimeType: imageSrc.match(/data:([^;]+)/)?.[1] || 'unknown'
      });
    };

    console.log('🔄 Setting image src...');
    img.src = imageSrc;

  }, [diffs, imageSrc, originalWidth, originalHeight, hoveredDiff, renderDimensions]);

  // Handle mouse events on overlays
  const handleMouseEnter = (diff: VisualDiff) => {
    setHoveredDiff(diff.id);
    onDiffHover?.(diff);
  };

  const handleMouseLeave = () => {
    setHoveredDiff(null);
    onDiffHover?.(null);
  };

  const handleClick = (diff: VisualDiff) => {
    onDiffClick?.(diff);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Canvas for drawing */}
      <canvas 
        ref={canvasRef} 
        className="w-full block"
        style={{ 
          height: renderDimensions.height > 0 ? `${renderDimensions.height}px` : '600px',
          width: '100%',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e5e7eb'
        }}
      />
      
      {/* Debug info overlay when calculating dimensions */}
      {renderDimensions.width === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
          <div className="text-center text-gray-600 p-4 bg-white rounded shadow">
            <div className="text-lg">📏 Calculating dimensions...</div>
            <div className="text-sm mt-2">
              Container: {containerRef.current?.clientWidth || 0}px<br/>
              Original: {originalWidth} × {originalHeight}px
            </div>
          </div>
        </div>
      )}
      
      {/* Interactive overlays */}
      {renderDimensions.width > 0 && diffs.map((diff) => {
        const box = diff.domBox || diff.figmaBox;
        const scaledCoords = getScaledCoordinates(box);
        const isHovered = hoveredDiff === diff.id;

        return (
          <div
            key={diff.id}
            className="absolute cursor-pointer group"
            style={{
              left: `${scaledCoords.x}px`,
              top: `${scaledCoords.y}px`,
              width: `${scaledCoords.width}px`,
              height: `${scaledCoords.height}px`,
            }}
            onMouseEnter={() => handleMouseEnter(diff)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(diff)}
          >
            {/* Tooltip */}
            {isHovered && (
              <div className="absolute z-50 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg pointer-events-none transform -translate-y-full -translate-x-1/2 left-1/2 mb-2 min-w-max max-w-xs">
                <div className="font-semibold mb-1">
                  {diff.type.charAt(0).toUpperCase() + diff.type.slice(1)} Issue
                </div>
                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-gray-300">Expected:</span> {diff.figmaValue}
                  </div>
                  <div>
                    <span className="text-gray-300">Actual:</span> {diff.liveValue}
                  </div>
                  <div>
                    <span className="text-gray-300">Severity:</span> 
                    <span className={`ml-1 px-1 rounded text-xs ${
                      diff.severity === 'high' ? 'bg-red-500' :
                      diff.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}>
                      {diff.severity}
                    </span>
                  </div>
                  {diff.description && (
                    <div className="mt-2 text-gray-200 border-t border-gray-700 pt-1">
                      {diff.description}
                    </div>
                  )}
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HybridVisualOverlay; 