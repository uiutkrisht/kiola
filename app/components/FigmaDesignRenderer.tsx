import React from 'react';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: BoundingBox;
  style?: any;
  characters?: string;
  children?: FigmaNode[];
}

interface Highlight {
  id: string;
  box: BoundingBox;
  color?: string;
  isSelected?: boolean;
}

interface FigmaDesignRendererProps {
  nodes: FigmaNode[];
  highlights?: Highlight[];
  selectedId?: string;
}

const renderFigmaNode = (node: FigmaNode) => {
  if (!node.absoluteBoundingBox) return null;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: node.absoluteBoundingBox.x,
    top: node.absoluteBoundingBox.y,
    width: node.absoluteBoundingBox.width,
    height: node.absoluteBoundingBox.height,
    fontSize: node.style?.fontSize,
    fontWeight: node.style?.fontWeight,
    fontFamily: node.style?.fontFamily,
    color: node.style?.color,
    background: node.style?.background,
    border: node.style?.border,
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
  return (
    <div key={node.id} style={style} data-node-id={node.id}>
      {node.characters || null}
      {node.children && node.children.map(renderFigmaNode)}
    </div>
  );
};

const FigmaDesignRenderer: React.FC<FigmaDesignRendererProps> = ({ nodes, highlights = [] }) => {
  return (
    <div className="relative" style={{ width: 800, height: 600, background: '#f9fafb' }}>
      {/* Render Figma nodes */}
      {nodes.map(renderFigmaNode)}
      {/* Render overlays */}
      {highlights.map(h => (
        <div
          key={h.id}
          style={{
            position: 'absolute',
            left: h.box.x,
            top: h.box.y,
            width: h.box.width,
            height: h.box.height,
            border: `2px solid ${h.color || (h.isSelected ? '#f00' : '#00f')}`,
            background: h.isSelected ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,255,0.08)',
            pointerEvents: 'none',
            zIndex: 1000,
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
};

export default FigmaDesignRenderer; 