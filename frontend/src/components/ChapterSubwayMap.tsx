import type { NarrativeThread } from '../types';
import './ChapterSubwayMap.css';

interface Props {
  data: NarrativeThread[];
  onNodeClick: (chapterTitle: string) => void;
}

export default function ChapterSubwayMap({ data, onNodeClick }: Props) {
  if (!data || data.length === 0) {
    return <div className="text-center py-12 text-muted">No thread data available.</div>;
  }

  // Get unique chapter titles in order
  const allChapterTitles = Array.from(
    new Set(data.flatMap(t => t.nodes.map(n => n.chapterTitle)))
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const threadHeight = 60;
  const chapterWidth = 180;
  const padding = 50;
  const svgWidth = allChapterTitles.length * chapterWidth + padding * 2;
  const svgHeight = data.length * threadHeight + padding * 2;

  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#3b82f6', // Blue
  ];

  return (
    <div className="subway-map-container">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="subway-map-svg"
      >
        {/* Connection Lines */}
        {data.map((thread, threadIndex) => {
          const color = colors[threadIndex % colors.length];
          const points: string[] = [];

          allChapterTitles.forEach((title, chapterIndex) => {
            const node = thread.nodes.find(n => n.chapterTitle === title);
            if (node) {
              const x = chapterIndex * chapterWidth + padding;
              const y = threadIndex * threadHeight + padding;
              points.push(`${x},${y}`);
            }
          });

          if (points.length < 2) return null;

          return (
            <polyline
              key={`line-${threadIndex}`}
              points={points.join(' ')}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="subway-line shadow-lg"
              opacity="0.6"
            />
          );
        })}

        {/* Vertical Chapter Indicators */}
        {allChapterTitles.map((title, chapterIndex) => {
           const x = chapterIndex * chapterWidth + padding;
           return (
             <g key={`chapter-${chapterIndex}`}>
               <line 
                 x1={x} y1={padding/2} 
                 x2={x} y2={svgHeight - padding/2} 
                 stroke="var(--color-border)" 
                 strokeDasharray="4 4" 
               />
               <text 
                 x={x} y={svgHeight - 10} 
                 textAnchor="middle" 
                 className="chapter-label"
               >
                 {title}
               </text>
             </g>
           );
        })}

        {/* Nodes (Stations) */}
        {data.map((thread, threadIndex) => {
          const color = colors[threadIndex % colors.length];
          const y = threadIndex * threadHeight + padding;

          return thread.nodes.map((node, nodeIndex) => {
            const chapterIndex = allChapterTitles.indexOf(node.chapterTitle);
            if (chapterIndex === -1) return null;
            const x = chapterIndex * chapterWidth + padding;

            return (
              <g 
                key={`node-${threadIndex}-${nodeIndex}`} 
                className="subway-node-group"
                onClick={() => onNodeClick(node.chapterTitle)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={6 + (node.intensity / 2)}
                  fill="var(--color-bg-base)"
                  stroke={color}
                  strokeWidth="3"
                  className="subway-node shadow-sm"
                />
                <title>{`${thread.threadName}\n${node.summary}\nIntensity: ${node.intensity}`}</title>
                <text x={x + 12} y={y + 4} className="node-summary">{thread.threadName}</text>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}
