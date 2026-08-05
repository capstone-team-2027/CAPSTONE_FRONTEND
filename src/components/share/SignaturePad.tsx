import { useRef, useState, useImperativeHandle, forwardRef } from "react";

export interface SignaturePadHandle {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
}

interface Props {
  height?: number;
}

const getPointerPos = (
  canvas: HTMLCanvasElement,
  e: React.MouseEvent | React.TouchEvent,
) => {
  const rect = canvas.getBoundingClientRect();
  const point = "touches" in e ? e.touches[0] : e;
  return {
    x: ((point.clientX - rect.left) / rect.width) * canvas.width,
    y: ((point.clientY - rect.top) / rect.height) * canvas.height,
  };
};

const SignaturePad = forwardRef<SignaturePadHandle, Props>(({ height = 180 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    },
    isEmpty: () => !hasDrawn,
    toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
  }));

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    lastPointRef.current = getPointerPos(canvas, e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !lastPointRef.current) return;
    const point = getPointerPos(canvas, e);
    ctx.strokeStyle = "#00285E";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setHasDrawn(true);
  };

  const endDraw = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white touch-none cursor-crosshair"
      style={{ height }}
      onMouseDown={startDraw}
      onMouseMove={draw}
      onMouseUp={endDraw}
      onMouseLeave={endDraw}
      onTouchStart={startDraw}
      onTouchMove={draw}
      onTouchEnd={endDraw}
    />
  );
});

SignaturePad.displayName = "SignaturePad";

export default SignaturePad;
