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

  // Identify all unique locations and assign them global slots (to keep lines relatively stable)
  const allLocations = Array.from(
    new Set(data.flatMap(t => t.nodes.map(n => n.location || 'Unknown')))
  ).sort();

  const locationYMap = new Map<string, number>();
  allLocations.forEach((loc, i) => locationYMap.set(loc, i));

  const threadHeight = 80;
  const chapterWidth = 220;
  const paddingX = 100;
  const paddingY = 80;
  
  const svgWidth = allChapterTitles.length * chapterWidth + paddingX * 2;
  const svgHeight = allLocations.length * threadHeight + paddingY * 2;

  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
  ];

  return (
    <div className="subway-map-container">
      <div className="subway-scroll-wrapper">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="subway-map-svg"
        >
          {/* Chapter Grid Lines & Labels */}
          {allChapterTitles.map((title, chapterIndex) => {
             const x = chapterIndex * chapterWidth + paddingX;
             return (
               <g key={`chapter-${chapterIndex}`}>
                 <line 
                   x1={x} y1={paddingY/2} 
                   x2={x} y2={svgHeight - paddingY} 
                   stroke="var(--color-border)" 
                   strokeDasharray="4 4" 
                   opacity="0.3"
                 />
                 <g transform={`translate(${x}, ${svgHeight - paddingY + 20}) rotate(35)`}>
                   <text 
                     x={0} y={0} 
                     textAnchor="start" 
                     className="chapter-label"
                   >
                     {title}
                   </text>
                 </g>
               </g>
             );
          })}

          {/* Location Horizontal "Tracks" */}
          {allLocations.map((loc, i) => (
            <g key={`loc-track-${i}`}>
              <line 
                x1={paddingX/2} 
                y1={i * threadHeight + paddingY} 
                x2={svgWidth - paddingX/2} 
                y2={i * threadHeight + paddingY} 
                stroke="var(--color-border)" 
                strokeWidth="1"
                opacity="0.1"
              />
              <text 
                x={paddingX - 20} 
                y={i * threadHeight + paddingY - 10} 
                className="location-label"
                textAnchor="end"
              >
                {loc}
              </text>
            </g>
          ))}

          {/* Subway Lines (Bezier Curves) */}
          {data.map((thread, threadIndex) => {
            const color = colors[threadIndex % colors.length];
            const sortedNodes = [...thread.nodes].sort((a, b) => 
               allChapterTitles.indexOf(a.chapterTitle) - allChapterTitles.indexOf(b.chapterTitle)
            );

            if (sortedNodes.length < 2) return null;

            let pathData = "";
            sortedNodes.forEach((node, i) => {
              const chapterIndex = allChapterTitles.indexOf(node.chapterTitle);
              const x = chapterIndex * chapterWidth + paddingX;
              const y = (locationYMap.get(node.location || 'Unknown') ?? 0) * threadHeight + paddingY;

              if (i === 0) {
                pathData = `M ${x} ${y}`;
              } else {
                const prevNode = sortedNodes[i-1];
                const prevChapterIndex = allChapterTitles.indexOf(prevNode.chapterTitle);
                const prevX = prevChapterIndex * chapterWidth + paddingX;
                const prevY = (locationYMap.get(prevNode.location || 'Unknown') ?? 0) * threadHeight + paddingY;
                
                // Add a small offset if multiple lines are in the same location to prevent perfect overlap
                // but keep them grouped.
                const offset = (threadIndex - (data.length / 2)) * 4;
                
                const cpX1 = prevX + (x - prevX) / 2;
                const cpY1 = prevY + offset;
                const cpX2 = prevX + (x - prevX) / 2;
                const cpY2 = y + offset;
                
                pathData += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x} ${y + offset}`;
              }
            });

            return (
              <path
                key={`path-${threadIndex}`}
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="subway-line"
                opacity="0.8"
              />
            );
          })}

          {/* Nodes (Stations) */}
          {data.map((thread, threadIndex) => {
            const color = colors[threadIndex % colors.length];
            const offset = (threadIndex - (data.length / 2)) * 4;

            return thread.nodes.map((node, nodeIndex) => {
              const chapterIndex = allChapterTitles.indexOf(node.chapterTitle);
              if (chapterIndex === -1) return null;
              const x = chapterIndex * chapterWidth + paddingX;
              const y = (locationYMap.get(node.location || 'Unknown') ?? 0) * threadHeight + paddingY + offset;

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
                    className="subway-node"
                  />
                  <title>{`${thread.threadName}\nLocation: ${node.location}\nSummary: ${node.summary}`}</title>
                </g>
              );
            });
          })}
        </svg>
      </div>
    </div>
  );
}
