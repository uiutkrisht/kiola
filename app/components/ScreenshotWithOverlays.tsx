import React, { useRef, useEffect } from 'react';
import BoundingBoxOverlay from './BoundingBoxOverlay';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  issueId: string;
  severity: 'high' | 'medium' | 'low';
  label?: string;
  type?: string;
  description?: string;
}

interface ScreenshotWithOverlaysProps {
  imageSrc: string;
  boxes: Box[];
  selectedIssueId: string | null;
  zoom: number;
  showOverlays: boolean;
  onBoxClick: (issueId: string) => void;
  containerId: string;
}

const ScreenshotWithOverlays: React.FC<ScreenshotWithOverlaysProps> = ({
  imageSrc, boxes, selectedIssueId, zoom, showOverlays, onBoxClick, containerId
}: ScreenshotWithOverlaysProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to selected box
  useEffect(() => {
    if (!selectedIssueId || !showOverlays) return;
    const box = boxes.find((b: Box) => b.issueId === selectedIssueId);
    if (box && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-issue-id='${selectedIssueId}']`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedIssueId, showOverlays, boxes]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      className="relative overflow-auto bg-white border rounded shadow"
      style={{ width: 800, height: 600, background: '#f9fafb' }}
    >
      <img src={imageSrc} alt="Screenshot" style={{ width: '100%', height: 'auto', display: 'block' }} />
      {showOverlays && boxes.map((box: Box) =>
        <div
          key={box.issueId}
          data-issue-id={box.issueId}
          onClick={e => { e.stopPropagation(); onBoxClick(box.issueId); }}
          style={{ position: 'absolute', left: box.x * zoom, top: box.y * zoom, width: box.width * zoom, height: box.height * zoom, cursor: 'pointer', zIndex: 40, pointerEvents: 'auto' }}
        >
          <BoundingBoxOverlay
            box={box}
            isSelected={selectedIssueId === box.issueId}
            severity={box.severity}
            zoom={zoom}
            label={box.label}
            type={box.type}
            description={box.description}
          />
        </div>
      )}
    </div>
  );
};

export default ScreenshotWithOverlays; 