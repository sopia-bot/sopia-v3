export interface BaseItem {
	id: string;
	type: 'rect' | 'circle' | 'triangle' | 'arrow' | 'star' | 'text' | 'image';
	x: number;
	y: number;
	width?: number;
	height?: number;
	rotation?: number;
	scaleX?: number;
	scaleY?: number;
	opacity?: number;
	draggable?: boolean;
	// 공통 스타일
	stroke?: string;
	strokeWidth?: number;
	dash?: number[];
	shadowColor?: string;
	shadowBlur?: number;
	shadowOffsetX?: number;
	shadowOffsetY?: number;
	shadowOpacity?: number;
}

export interface ShapeItem extends BaseItem {
	fill?: string;
}

export interface TextItem extends BaseItem {
	text: string;
	fill?: string;
	fontFamily?: string;
	fontStyle?: 'normal' | 'bold';
	fontSize?: number;
}

export interface ImageItem extends BaseItem {
	src: string;
	naturalWidth?: number;
	naturalHeight?: number;
}

export type EditorItem = ShapeItem | TextItem | ImageItem;

export interface HistoryCommand {
	type: 'add' | 'update' | 'remove' | 'transform' | 'layer' | 'duplicate' | 'paste' | 'layer-order';
	itemId: string;
	oldData?: Partial<EditorItem> | any;
	newData?: Partial<EditorItem> | any;
}

export interface EditorState {
	items: EditorItem[];
	selectedItemId: string | null;
	scale: number;
	history: HistoryCommand[];
	historyIndex: number;
}
