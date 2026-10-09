import { useEffect, useRef, useState, type ReactNode } from 'react';

export type SheetState = 'peek' | 'half' | 'full';

interface BottomSheetProps {
	state: SheetState;
	onStateChange: (state: SheetState) => void;
	/** Space kept free above the sheet when fully open (search bar). */
	topOffset: number;
	peekHeight: number;
	onHeightChange?: (visible: number) => void;
	header?: ReactNode;
	children: ReactNode;
}

export default function BottomSheet({
	state,
	onStateChange,
	topOffset,
	peekHeight,
	onHeightChange,
	header,
	children,
}: BottomSheetProps) {
	const [viewport, setViewport] = useState(() => window.innerHeight);
	const [drag, setDrag] = useState<number | null>(null);
	const start = useRef<{ y: number; visible: number; moved: boolean } | null>(null);

	useEffect(() => {
		const onResize = () => setViewport(window.innerHeight);
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	const fullHeight = viewport - topOffset;
	const heights: Record<SheetState, number> = {
		peek: peekHeight,
		half: Math.round(viewport * 0.5),
		full: fullHeight,
	};
	const visible = drag ?? heights[state];

	useEffect(() => {
		onHeightChange?.(heights[state]);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state, viewport, peekHeight, topOffset]);

	const onPointerDown = (e: React.PointerEvent) => {
		start.current = { y: e.clientY, visible: heights[state], moved: false };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e: React.PointerEvent) => {
		if (!start.current) return;
		const dy = start.current.y - e.clientY;
		if (Math.abs(dy) > 4) start.current.moved = true;
		if (start.current.moved)
			setDrag(Math.max(peekHeight * 0.6, Math.min(fullHeight, start.current.visible + dy)));
	};
	const onPointerUp = () => {
		const s = start.current;
		start.current = null;
		if (!s) return;
		if (!s.moved) {
			// A tap cycles between the states.
			onStateChange(state === 'peek' ? 'half' : state === 'half' ? 'full' : 'peek');
			setDrag(null);
			return;
		}
		const v = drag ?? s.visible;
		const nearest = (Object.keys(heights) as SheetState[]).reduce((a, b) =>
			Math.abs(heights[a] - v) < Math.abs(heights[b] - v) ? a : b,
		);
		setDrag(null);
		onStateChange(nearest);
	};

	return (
		<section
			className="glass fixed inset-x-0 bottom-0 z-[700] flex flex-col rounded-t-2xl border-b-0"
			style={{
				height: fullHeight,
				transform: `translateY(${fullHeight - visible}px)`,
				transition: drag === null ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
			}}
		>
			<div
				className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				<div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
				{header}
			</div>
			<div
				className={`flex min-h-0 flex-1 flex-col transition-opacity ${state === 'peek' && drag === null ? 'pointer-events-none opacity-0' : ''}`}
				style={{ paddingBottom: Math.max(0, fullHeight - visible) }}
			>
				{children}
			</div>
		</section>
	);
}
