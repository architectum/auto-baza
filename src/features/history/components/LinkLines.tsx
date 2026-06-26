import { Trash2 } from '@shared/icons/Icons';

interface Link {
  problemId: string;
  solutionId: string;
}

interface LinkLinesProps {
  links: Link[];
  itemCoords: Record<string, { x: number; y: number; height: number; markerX: number }>;
  linkLanes: Record<string, number>;
  selectedEntryId: string | null;
  linkingModeActive: boolean;
  onDeleteLinkClick: (link: Link) => void;
}

export function LinkLines({
  links,
  itemCoords,
  linkLanes,
  selectedEntryId,
  linkingModeActive,
  onDeleteLinkClick,
}: LinkLinesProps) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
      {links.map(link => {
        const pCoords = itemCoords[link.problemId];
        const sCoords = itemCoords[link.solutionId];
        if (!pCoords || !sCoords) return null;

        const lane = linkLanes[`${link.problemId}-${link.solutionId}`] || 0;
        const x = Math.max(8, 24 - lane * 8);
        const y1 = pCoords.y + pCoords.height / 2;
        const y2 = sCoords.y + sCoords.height / 2;

        const isSelected = selectedEntryId === link.problemId || selectedEntryId === link.solutionId;

        return (
          <g key={`${link.problemId}-${link.solutionId}`}
            style={{ pointerEvents: isSelected ? 'auto' : 'none', opacity: (linkingModeActive || (!isSelected && selectedEntryId)) ? 0.2 : 1 }}
          >
            <path
              d={`M ${pCoords.markerX - 22} ${y1} L ${x} ${y1} L ${x} ${y2} L ${sCoords.markerX - 22} ${y2}`}
              fill="none"
              stroke="var(--t-border-accent)"
              strokeWidth={isSelected ? 3 : 2}
              strokeLinecap="round"
              className="history-link-path"
              style={{ strokeDasharray: isSelected ? 'none' : '6 4' }}
            />
            {isSelected && (
              <foreignObject x={x - 15} y={(y1 + y2) / 2 - 15} width={30} height={30}>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteLinkClick(link); }}
                  className="w-full h-full rounded-full flex items-center justify-center text-white active:scale-95 border-2"
                  style={{ background: 'var(--t-status-problem)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
}
