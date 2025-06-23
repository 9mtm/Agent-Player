import { useState, useRef, useCallback } from "react";
import type { BoardNodeData } from "../BoardNode";

interface Pan {
  x: number;
  y: number;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.2;

const useBoardPanZoom = ({
  boardRef,
  nodes,
  NODE_WIDTH,
  NODE_HEIGHT,
}: {
  boardRef: React.RefObject<HTMLDivElement>;
  nodes: BoardNodeData[];
  NODE_WIDTH: number;
  NODE_HEIGHT: number;
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [hasUserZoomed, setHasUserZoomed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);

  // Clamp pan so that nodes bounding box stays visible
  const clampPan = useCallback(
    (pan: Pan, zoom: number) => {
      if (!boardRef.current || nodes.length === 0) return pan;
      const rect = boardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      nodes.forEach((n) => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_WIDTH);
        maxY = Math.max(maxY, n.y + NODE_HEIGHT);
      });
      const nodesW = maxX - minX;
      const nodesH = maxY - minY;
      const pad = 40;
      const minPanX = width - (minX + nodesW + pad) * zoom;
      const maxPanX = -minX * zoom + pad;
      const minPanY = height - (minY + nodesH + pad) * zoom;
      const maxPanY = -minY * zoom + pad;
      return {
        x: Math.max(minPanX, Math.min(maxPanX, pan.x)),
        y: Math.max(minPanY, Math.min(maxPanY, pan.y)),
      };
    },
    [boardRef, nodes, NODE_WIDTH, NODE_HEIGHT]
  );

  // Fit to screen
  const fitToScreen = useCallback(
    (forceZoom = false) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (nodes.length === 0) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
      }
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      nodes.forEach((n) => {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_WIDTH);
        maxY = Math.max(maxY, n.y + NODE_HEIGHT);
      });
      if (minX === Infinity) return;
      const nodesW = maxX - minX;
      const nodesH = maxY - minY;
      const fillRatioW = nodesW / width;
      const fillRatioH = nodesH / height;
      if (forceZoom && (fillRatioW > 0.7 || fillRatioH > 0.7)) {
        const padding = 80;
        const fitW = width - padding * 2;
        const fitH = height - padding * 2;
        let fitZoom = Math.min(fitW / nodesW, fitH / nodesH, MAX_ZOOM);
        if (!isFinite(fitZoom) || fitZoom > MAX_ZOOM) fitZoom = MAX_ZOOM;
        if (fitZoom < MIN_ZOOM) fitZoom = MIN_ZOOM;
        setZoom(fitZoom);
        const centerX = minX + nodesW / 2;
        const centerY = minY + nodesH / 2;
        setPan({
          x: (width / 2 - centerX * fitZoom) / fitZoom,
          y: (height / 2 - centerY * fitZoom) / fitZoom,
        });
        return;
      }
      setZoom(1);
      const centerX = minX + nodesW / 2;
      const centerY = minY + nodesH / 2;
      setPan({
        x: width / 2 - centerX,
        y: height / 2 - centerY,
      });
    },
    [boardRef, nodes, NODE_WIDTH, NODE_HEIGHT]
  );

  // Mouse wheel for zoom/pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => {
        let next = z - e.deltaY * 0.0015;
        if (next < MIN_ZOOM) next = MIN_ZOOM;
        if (next > MAX_ZOOM) next = MAX_ZOOM;
        setHasUserZoomed(true);
        return Math.round(next * 100) / 100;
      });
    } else if (e.shiftKey || e.button === 1) {
      setPan((p) => clampPan({ ...p, x: p.x - e.deltaY / zoom }, zoom));
    } else {
      setPan((p) => clampPan({ ...p, y: p.y - e.deltaY / zoom }, zoom));
    }
  };

  // Pan with space+drag or middle mouse drag
  const handleBoardMouseDown = (e: React.MouseEvent) => {
    if (
      e.button === 1 ||
      e.buttons === 4 ||
      e.nativeEvent.which === 2 ||
      e.nativeEvent.button === 1 ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.shiftKey
    ) {
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };
  const handleBoardMouseMovePan = (e: React.MouseEvent) => {
    if (isPanning && panStart.current) {
      const dx = (e.clientX - panStart.current.x) / zoom;
      const dy = (e.clientY - panStart.current.y) / zoom;
      setPan(
        clampPan(
          { x: panStart.current!.panX + dx, y: panStart.current!.panY + dy },
          zoom
        )
      );
    }
  };
  const handleBoardMouseUpPan = () => {
    setIsPanning(false);
    panStart.current = null;
  };

  return {
    pan,
    setPan,
    zoom,
    setZoom,
    fitToScreen,
    clampPan,
    handleWheel,
    handleBoardMouseDown,
    handleBoardMouseMovePan,
    handleBoardMouseUpPan,
    hasUserZoomed,
    setHasUserZoomed,
  };
};

export default useBoardPanZoom;
