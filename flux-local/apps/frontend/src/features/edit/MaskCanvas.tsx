import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Layer, Line, Image as KonvaImage, Rect, Stage } from "react-konva";
import type Konva from "konva";

export interface MaskCanvasHandle {
  /** Export the painted region as a black/white PNG mask, or null if empty. */
  exportMask: () => Promise<Blob | null>;
  clear: () => void;
}

interface Stroke {
  points: number[];
  width: number;
}

interface Props {
  src: string;
  brush: number;
  maxWidth?: number;
}

/**
 * Lets the user paint a mask over the source image (white = region to edit).
 * Used for inpaint / object add-remove. Keyboard-accessible clear is provided
 * by the parent; the canvas itself is pointer-driven.
 */
export const MaskCanvas = forwardRef<MaskCanvasHandle, Props>(
  ({ src, brush, maxWidth = 512 }, ref) => {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    const [size, setSize] = useState({ w: maxWidth, h: maxWidth });
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const drawing = useRef(false);
    const maskStageRef = useRef<Konva.Stage | null>(null);

    useEffect(() => {
      const image = new window.Image();
      image.crossOrigin = "anonymous";
      image.src = src;
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        setSize({ w: image.width * scale, h: image.height * scale });
        setImg(image);
      };
    }, [src, maxWidth]);

    useImperativeHandle(ref, () => ({
      clear: () => setStrokes([]),
      exportMask: async () => {
        if (strokes.length === 0 || !maskStageRef.current) return null;
        // The hidden mask stage renders white strokes on black at native size.
        const dataUrl = maskStageRef.current.toDataURL({ pixelRatio: 1 });
        const res = await fetch(dataUrl);
        return res.blob();
      },
    }));

    const start = (e: Konva.KonvaEventObject<PointerEvent>) => {
      drawing.current = true;
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) setStrokes((s) => [...s, { points: [pos.x, pos.y], width: brush }]);
    };
    const move = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (!drawing.current) return;
      const pos = e.target.getStage()?.getPointerPosition();
      if (!pos) return;
      setStrokes((s) => {
        const last = s[s.length - 1];
        const rest = s.slice(0, -1);
        return [...rest, { ...last, points: [...last.points, pos.x, pos.y] }];
      });
    };
    const end = () => {
      drawing.current = false;
    };

    if (!img) {
      return (
        <div
          className="flex items-center justify-center rounded-md border border-edge bg-ink text-xs text-slate-500"
          style={{ height: 240 }}
        >
          Loading image…
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {/* Visible canvas: image + semi-transparent paint preview. */}
        <Stage
          width={size.w}
          height={size.h}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="touch-none rounded-md border border-edge"
        >
          <Layer>
            <KonvaImage image={img} width={size.w} height={size.h} />
          </Layer>
          <Layer>
            {strokes.map((s, i) => (
              <Line
                key={i}
                points={s.points}
                stroke="rgba(109,139,255,0.6)"
                strokeWidth={s.width}
                lineCap="round"
                lineJoin="round"
                tension={0.4}
              />
            ))}
          </Layer>
        </Stage>

        {/* Hidden mask render: white strokes on black, used for export only. */}
        <div style={{ position: "absolute", left: -99999, top: 0 }} aria-hidden>
          <Stage ref={maskStageRef} width={size.w} height={size.h}>
            <Layer>
              <Rect x={0} y={0} width={size.w} height={size.h} fill="black" />
              {strokes.map((s, i) => (
                <Line
                  key={i}
                  points={s.points}
                  stroke="white"
                  strokeWidth={s.width}
                  lineCap="round"
                  lineJoin="round"
                  tension={0.4}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      </div>
    );
  },
);

MaskCanvas.displayName = "MaskCanvas";
