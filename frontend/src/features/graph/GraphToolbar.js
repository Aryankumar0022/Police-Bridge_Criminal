import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Focus, LayoutGrid, Tag, Filter } from 'lucide-react';

const btnStyle = (active) => ({
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: active ? 'var(--color-accent-dim)' : 'transparent',
  border: active ? '1px solid var(--color-accent)' : '1px solid transparent',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
  transition: 'all var(--transition-fast)',
});

export default function GraphToolbar({ 
  onZoomIn, onZoomOut, onFit, onReset, 
  onToggleFocus, focusActive, 
  onToggleLabels, labelsActive,
  onToggleImportant, importantActive,
  onRerunLayout,
  layoutName, onLayoutChange
}) {
  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 2,
      background: 'var(--color-overlay)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)', padding: 3,
    }}>
      <button style={btnStyle(false)} onClick={onZoomIn} title="Zoom In">
        <ZoomIn size={15} />
      </button>
      <button style={btnStyle(false)} onClick={onZoomOut} title="Zoom Out">
        <ZoomOut size={15} />
      </button>
      <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 4px' }} />
      <button style={btnStyle(false)} onClick={onFit} title="Fit Graph">
        <Maximize2 size={15} />
      </button>
      <button style={btnStyle(false)} onClick={onReset} title="Reset View">
        <RotateCcw size={15} />
      </button>
      <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 4px' }} />
      <button style={btnStyle(labelsActive)} onClick={onToggleLabels} title="Toggle Relationship Labels">
        <Tag size={15} />
      </button>
      <button style={btnStyle(importantActive)} onClick={onToggleImportant} title="Important Connections Mode">
        <Filter size={15} />
      </button>
      <button style={btnStyle(focusActive)} onClick={onToggleFocus} title="Investigation Focus">
        <Focus size={15} />
      </button>
      <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 4px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '2px 0' }}>
        <select 
          value={layoutName} 
          onChange={(e) => onLayoutChange(e.target.value)}
          style={{ 
            width: 28, height: 28, background: 'var(--color-overlay)', 
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 10,
            appearance: 'none', textAlign: 'center', padding: '0 2px'
          }}
          title="Change Graph Layout"
        >
          <option value="cose-bilkent" title="Force Directed">🕸️</option>
          <option value="concentric" title="Concentric">⭕</option>
          <option value="breadthfirst" title="Hierarchical">🌲</option>
          <option value="grid" title="Grid">▦</option>
          <option value="circle" title="Circle">◯</option>
        </select>
        <button style={btnStyle(false)} onClick={onRerunLayout} title="Rerun Layout">
          <LayoutGrid size={15} />
        </button>
      </div>
    </div>
  );
}
