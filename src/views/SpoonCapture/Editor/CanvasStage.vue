<template>
	<div 
		class="canvas-stage" 
		tabindex="0"
		@keydown="handleKeyDown"
		@keyup="handleKeyUp"
		@wheel="handleWheel"
		:data-zoom="`${Math.round(zoomScale * 100)}%`"
	>
		<v-stage
			ref="stage"
			:config="stageConfig"
			@mousedown="handleStageMouseDown"
			@mousemove="handleStageMouseMove"
			@mouseup="handleStageMouseUp"
			@touchstart="handleStageMouseDown"
		>
			<!-- 배경 레이어 -->
			<v-layer ref="bgLayer">
				<!-- 캔버스 경계 표시 -->
				<v-rect
					:config="canvasBorderConfig"
				/>
				
				<!-- 배경 이미지 -->
				<v-image
					v-if="backgroundImageElement"
					:config="{
						x: 0,
						y: 0,
						width: canvasWidth,
						height: canvasHeight,
						image: backgroundImageElement,
						listening: false
					}"
				/>
			</v-layer>
			
			<!-- 콘텐츠 레이어 -->
			<v-layer ref="contentLayer">
				<!-- 모든 아이템을 단일 v-for로 렌더링 -->
				<component
					v-for="item in items"
					:key="item.id"
					:is="getKonvaComponent(item.type)"
					:ref="`item_${item.id}`"
					:config="getItemConfig(item)"
					@click="handleItemClick"
					@tap="handleItemClick"
					@dragend="handleDragEnd"
					@transformend="handleTransformEnd"
					@dblclick="item.type === 'text' ? handleTextDblClick : undefined"
					@dbltap="item.type === 'text' ? handleTextDblClick : undefined"
					draggable
				/>
			</v-layer>
			
			<!-- UI 레이어 -->
			<v-layer ref="uiLayer">
				<!-- 다중 선택 영역 표시 -->
				<v-rect
					v-if="isSelecting"
					:config="selectionRectConfig"
				/>
				
				<!-- 다중선택된 객체들의 테두리 표시 (다중선택일 때만) -->
				<v-rect
					v-for="itemId in selectedItems"
					:key="`selection-${itemId}`"
					:config="getSelectionBorderConfig(itemId)"
					v-show="multipleSelected && selectedItems.length > 1"
				/>
				
				<!-- Transformer -->
				<v-transformer 
					ref="transformer" 
					:config="transformerConfig"
				/>
			</v-layer>
		</v-stage>
		
		<!-- 우클릭 메뉴 -->
		<v-menu
			v-model="contextMenuVisible"
			:position-x="contextMenuX"
			:position-y="contextMenuY"
			absolute
			offset-y
		>
			<v-list dense>
				<v-list-item @click="bringToFront">
					<v-list-item-icon>
						<v-icon>mdi-bring-to-front</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>맨 앞으로</v-list-item-title>
					</v-list-item-content>
				</v-list-item>
				
				<v-list-item @click="bringForward">
					<v-list-item-icon>
						<v-icon>mdi-arrange-bring-forward</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>앞으로</v-list-item-title>
					</v-list-item-content>
				</v-list-item>
				
				<v-list-item @click="sendBackward">
					<v-list-item-icon>
						<v-icon>mdi-arrange-send-backward</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>뒤로</v-list-item-title>
					</v-list-item-content>
				</v-list-item>
				
				<v-list-item @click="sendToBack">
					<v-list-item-icon>
						<v-icon>mdi-send-to-back</v-icon>
					</v-list-item-icon>
					<v-list-item-content>
						<v-list-item-title>맨 뒤로</v-list-item-title>
					</v-list-item-content>
				</v-list-item>
			</v-list>
		</v-menu>
	</div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
import { EditorItem, ShapeItem, TextItem, ImageItem } from './types';

type CanvasItem = EditorItem;

@Component({
	components: {},
})
export default class CanvasStage extends Vue {
	@Prop({ required: true }) items!: CanvasItem[];
	@Prop({ default: null }) selectedItemIdProp!: string | null;
	@Prop({ default: 1 }) scale!: number;
	@Prop({ default: 800 }) canvasWidth!: number;
	@Prop({ default: 600 }) canvasHeight!: number;

	// 배경 이미지
	backgroundImage: string = '';
	backgroundImageElement: HTMLImageElement | null = null;

	// stageWidth와 stageHeight는 CSS로 처리
	// stageWidth = 800;
	// stageHeight = 600;
	imageCache: { [key: string]: HTMLImageElement } = {};
	zoomScale = 1;
	stageX = 0;
	stageY = 0;
	
	// 팬 기능을 위한 상태
	private isSpacePressed = false;
	private isPanning = false;
	private lastPointerPosition = { x: 0, y: 0 };
	
	// 다중 선택을 위한 상태
	private isSelecting = false;
	private selectionStart = { x: 0, y: 0 };
	private selectionRect = { x: 0, y: 0, width: 0, height: 0 };
	private selectedItems: string[] = [];
	private multipleSelected = false;
	
	// 내부 선택 상태
	private internalSelectedItemId: string | null = null;
	
	// computed 속성으로 selectedItemId 관리
	get selectedItemId(): string | null {
		return this.internalSelectedItemId;
	}
	
	set selectedItemId(value: string | null) {
		this.internalSelectedItemId = value;
	}
	
	// prop 변경 감지
	@Watch('selectedItemIdProp')
	onSelectedItemIdPropChanged(newVal: string | null) {
		this.internalSelectedItemId = newVal;
	}
	
	// 우클릭 메뉴 상태
	contextMenuVisible = false;
	contextMenuX = 0;
	contextMenuY = 0;
	contextMenuItemId: string | null = null;

	// 동적 크기 계산을 위한 데이터 속성
	stageWidth = 800;
	stageHeight = 600;

	get stageConfig() {
		return {
			width: this.stageWidth,
			height: this.stageHeight,
			scaleX: this.zoomScale,
			scaleY: this.zoomScale,
			x: this.stageX,
			y: this.stageY,
		};
	}

	get canvasBorderConfig() {
		return {
			x: 0,
			y: 0,
			width: this.canvasWidth,
			height: this.canvasHeight,
			fill: 'white',
			stroke: '#ddd',
			strokeDashArray: [5, 5],
			strokeWidth: 1,
			listening: false
		};
	}

	get transformerConfig() {
		return {
			rotateAnchorOffset: 60,
			enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center'],
			anchorSize: 8,
			anchorStroke: '#4285f4',
			anchorFill: '#ffffff',
			anchorStrokeWidth: 2,
			borderStroke: '#4285f4',
			borderStrokeWidth: 1,
			rotateAnchorFill: '#4285f4',
			rotateAnchorStroke: '#ffffff',
			rotateAnchorStrokeWidth: 2,
		};
	}

	get selectionRectConfig() {
		return {
			x: this.selectionRect.x,
			y: this.selectionRect.y,
			width: this.selectionRect.width,
			height: this.selectionRect.height,
			fill: 'rgba(66, 133, 244, 0.1)',
			stroke: '#4285f4',
			strokeWidth: 1,
			strokeDashArray: [5, 5],
			listening: false
		};
	}

	// 동적 컴포넌트 매핑
	getKonvaComponent(type: string): string {
		const componentMap: { [key: string]: string } = {
			rect: 'v-rect',
			circle: 'v-circle',
			triangle: 'v-regular-polygon',
			arrow: 'v-arrow',
			star: 'v-star',
			text: 'v-text',
			image: 'v-image',
		};
		return componentMap[type] || 'v-rect';
	}

	// 통합된 config 변환 메서드
	getItemConfig(item: CanvasItem): any {
		switch (item.type) {
			case 'rect':
				return this.convertToKonvaConfig(item as ShapeItem);
			case 'circle':
				return {
					...this.convertToKonvaConfig(item as ShapeItem),
					radius: 50,
				};
			case 'triangle':
				return {
					...this.convertToKonvaConfig(item as ShapeItem),
					sides: 3,
					radius: 50,
				};
			case 'arrow':
				return {
					...this.convertToKonvaConfig(item as ShapeItem),
					points: [0, 0, 100, 0],
					pointerLength: 10,
					pointerWidth: 10,
				};
			case 'star':
				return {
					...this.convertToKonvaConfig(item as ShapeItem),
					numPoints: 5,
					innerRadius: 30,
					outerRadius: 50,
				};
			case 'text':
				return this.convertToKonvaTextConfig(item as TextItem);
			case 'image':
				return this.convertToKonvaImageConfig(item as ImageItem);
			default:
				return this.convertToKonvaConfig(item as ShapeItem);
		}
	}

	convertToKonvaConfig(item: ShapeItem) {
		const baseConfig = {
			id: item.id,
			rotation: item.rotation,
			scaleX: item.scaleX,
			scaleY: item.scaleY,
			opacity: item.opacity,
			draggable: item.draggable,
			fill: item.fill,
			stroke: item.stroke,
			strokeWidth: item.strokeWidth,
			dash: item.dash,
			shadowColor: item.shadowColor,
			shadowBlur: item.shadowBlur,
			shadowOffsetX: item.shadowOffsetX,
			shadowOffsetY: item.shadowOffsetY,
			shadowOpacity: item.shadowOpacity,
		};

		// 도형 타입별로 좌표 시스템 조정 (width/height 하드코딩 버그 수정)
		if (item.type === 'rect') {
			return {
				...baseConfig,
				x: item.x,
				y: item.y,
				width: item.width || 100,
				height: item.height || 100,
			};
		} else if (item.type === 'circle' || item.type === 'triangle' || item.type === 'star') {
			// 중심점 기준 도형들
			return {
				...baseConfig,
				x: item.x,
				y: item.y,
			};
		} else {
			// 기본값 (arrow 등)
			return {
				...baseConfig,
				x: item.x,
				y: item.y,
			};
		}
	}

	convertToKonvaTextConfig(item: TextItem) {
		return {
			id: item.id,
			x: item.x,
			y: item.y,
			rotation: item.rotation,
			scaleX: item.scaleX,
			scaleY: item.scaleY,
			opacity: item.opacity,
			draggable: item.draggable,
			text: item.text || ' ', // 빈 텍스트일 때 공백 문자로 대체하여 객체가 사라지지 않도록 함
			fill: item.fill,
			stroke: item.stroke,
			strokeWidth: item.strokeWidth,
			strokeEnabled: !!(item.stroke && item.strokeWidth && item.strokeWidth > 0), // stroke가 있고 두께가 0보다 클 때만 활성화
			fontFamily: item.fontFamily,
			fontStyle: item.fontStyle,
			fontSize: item.fontSize,
			shadowColor: item.shadowColor,
			shadowBlur: item.shadowBlur,
			shadowOffsetX: item.shadowOffsetX,
			shadowOffsetY: item.shadowOffsetY,
			shadowOpacity: item.shadowOpacity,
		};
	}

	convertToKonvaImageConfig(item: ImageItem) {
		const image = this.imageCache[item.src];
		return {
			id: item.id,
			x: item.x,
			y: item.y,
			rotation: item.rotation,
			scaleX: item.scaleX,
			scaleY: item.scaleY,
			opacity: item.opacity,
			draggable: item.draggable,
			image: image,
			width: item.width,
			height: item.height,
			shadowColor: item.shadowColor,
			shadowBlur: item.shadowBlur,
			shadowOffsetX: item.shadowOffsetX,
			shadowOffsetY: item.shadowOffsetY,
			shadowOpacity: item.shadowOpacity,
		};
	}

	@Watch('items', { deep: true })
	onItemsChanged() {
		this.loadImages();
		this.$nextTick(() => {
			this.updateTransformer();
			this.updateSelectionBorders();
			this.updateItemRefs();
		});
	}

	@Watch('canvasWidth')
	@Watch('canvasHeight')
	onCanvasSizeChanged() {
		this.updateStageSize();
		this.centerCanvasAndFitToScreen();
	}

	@Watch('selectedItemId')
	onSelectedItemChanged() {
		this.updateTransformer();
		this.updateSelectionBorders();
	}

	@Watch('zoomScale')
	onZoomChanged() {
		this.updateTransformer();
		this.updateSelectionBorders();
	}

	@Watch('stageX')
	@Watch('stageY')
	onStagePositionChanged() {
		this.updateTransformer();
		this.updateSelectionBorders();
	}

	mounted() {
		this.internalSelectedItemId = this.selectedItemIdProp;
		
		// 키보드 이벤트 리스너 추가
		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
		
		// DOM 마운트 후 실제 크기 업데이트
		this.$nextTick(() => {
			this.updateStageSize();
			this.updateItemRefs();
			this.centerCanvasAndFitToScreen();
		});
		
		// 리사이즈 이벤트 리스너 추가
		window.addEventListener('resize', this.updateStageSize);
	}

	beforeDestroy() {
		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
		window.removeEventListener('resize', this.updateStageSize);
	}

	// Konva 객체 참조를 BaseItem에 저장하는 메서드
	updateItemRefs(): void {
		this.items.forEach(item => {
			const refName = `item_${item.id}`;
			const ref = this.$refs[refName] as any;
			if (ref && ref[0] && ref[0].getNode) {
				// Vue-Konva 컴포넌트에서 실제 Konva 객체 가져오기
				const konvaNode = ref[0].getNode();
				// 부모 컴포넌트에 Konva 노드 참조 전달
				this.$emit('konva-node-updated', item.id, konvaNode);
			}
		});
	}


	updateStageSize() {
		const container = this.$el as HTMLElement;
		
		if (container) {
			// DOM이 완전히 렌더링될 때까지 대기
			this.$nextTick(() => {
				// 여러 번 시도하여 안정적인 크기 확보
				const getContainerSize = () => {
					const clientWidth = container.clientWidth;
					const clientHeight = container.clientHeight;
					const offsetWidth = container.offsetWidth;
					const offsetHeight = container.offsetHeight;
					
					// clientWidth가 0이면 offsetWidth 사용, 둘 다 0이면 기본값 사용
					const width = clientWidth > 0 ? clientWidth : (offsetWidth > 0 ? offsetWidth : 800);
					const height = clientHeight > 0 ? clientHeight : (offsetHeight > 0 ? offsetHeight : 600);
					
					return { width, height };
				};
				
				const { width, height } = getContainerSize();
				
				// 크기가 여전히 0이면 잠시 후 다시 시도
				if (width === 0 || height === 0) {
					setTimeout(() => {
						const { width: retryWidth, height: retryHeight } = getContainerSize();
						this.stageWidth = retryWidth;
						this.stageHeight = retryHeight;
					}, 100);
				} else {
					this.stageWidth = width;
					this.stageHeight = height;
				}
			});
		}
	}

	loadImages() {
		const imageItems = this.items.filter(item => item.type === 'image') as ImageItem[];
		
		imageItems.forEach(item => {
			if (!this.imageCache[item.src]) {
				const img = new Image();
				img.crossOrigin = 'anonymous';
				img.onload = () => {
					this.$set(this.imageCache, item.src, img);
					this.$forceUpdate();
				};
				img.src = item.src;
			}
		});
	}

	handleStageMouseDown(e: any): void {
		const stage = e.target.getStage();
		const pos = stage.getPointerPosition();
		
		// 스테이지 변환을 고려한 실제 좌표 계산
		const realPos = {
			x: (pos.x - this.stageX) / this.zoomScale,
			y: (pos.y - this.stageY) / this.zoomScale
		};
		
		this.lastPointerPosition = pos;

		if (this.isSpacePressed) {
			this.isPanning = true;
			// 드래그 시작 시 커서를 grabbing으로 변경
			document.body.style.cursor = 'grabbing';
			return;
		}

		// 빈 공간 클릭 시 (스테이지 자체를 클릭한 경우)
		if (e.target === e.target.getStage()) {
			// 기존 선택 해제
			this.selectedItemId = null;
			this.selectedItems = [];
			this.multipleSelected = false;
			
			// 다중 선택 시작
			this.isSelecting = true;
			this.selectionStart = { x: realPos.x, y: realPos.y };
			this.selectionRect = { x: realPos.x, y: realPos.y, width: 0, height: 0 };
			
			// Transformer 숨기기
			this.$nextTick(() => {
				this.updateTransformer();
			});
			
			this.$emit('item-selected', null);
		}
	}

	handleStageMouseMove(e: any) {
		const stage = this.$refs.stage as any;
		if (!stage) return;
		
		const pos = stage.getNode().getPointerPosition();
		if (!pos) return;
		
		if (this.isPanning && this.isSpacePressed) {
			const dx = pos.x - this.lastPointerPosition.x;
			const dy = pos.y - this.lastPointerPosition.y;
			
			this.stageX += dx;
			this.stageY += dy;
			
			this.lastPointerPosition = pos;
			
			// 팬 모드에서 이동 시 선택 영역 업데이트
			this.$nextTick(() => {
				this.updateSelectionBorders();
			});
		} else if (this.isSelecting) {
			// 스테이지 변환을 고려한 실제 좌표 계산
			const realPos = {
				x: (pos.x - this.stageX) / this.zoomScale,
				y: (pos.y - this.stageY) / this.zoomScale
			};
			
			// 선택 영역의 시작점과 현재점을 이용해 정확한 사각형 계산
			const startX = this.selectionStart.x;
			const startY = this.selectionStart.y;
			const endX = realPos.x;
			const endY = realPos.y;
			
			// 최소/최대 좌표로 정확한 사각형 영역 계산
			const x = Math.min(startX, endX);
			const y = Math.min(startY, endY);
			const width = Math.abs(endX - startX);
			const height = Math.abs(endY - startY);
			
			this.selectionRect = { x, y, width, height };
		}
	}

	handleStageMouseUp(e: any) {
		// 팬 모드에서 드래그가 끝났을 때 커서를 grab으로 되돌림
		if (this.isPanning && this.isSpacePressed) {
			document.body.style.cursor = 'grab';
		}
		this.isPanning = false;
		
		if (this.isSelecting) {
			// 선택 영역 내의 객체들 찾기
			const selectedIds = this.getItemsInSelection();
			
			if (selectedIds.length > 1) {
				// 다중 선택된 경우
				this.selectedItems = selectedIds;
				this.multipleSelected = true;
				this.selectedItemId = null; // 단일 선택 해제
				this.$emit('multiple-items-selected', selectedIds);
			} else if (selectedIds.length === 1) {
				// 단일 선택
				this.selectedItemId = selectedIds[0];
				this.selectedItems = [selectedIds[0]];
				this.multipleSelected = false;
				this.$emit('item-selected', selectedIds[0]);
			} else {
				// 선택 해제
				this.selectedItemId = null;
				this.selectedItems = [];
				this.multipleSelected = false;
				this.$emit('item-selected', null);
			}
			
			this.isSelecting = false;
			this.selectionRect = { x: 0, y: 0, width: 0, height: 0 };
			
			// 선택 상태 변경 후 업데이트
			this.$nextTick(() => {
				this.updateTransformer();
				this.updateSelectionBorders();
			});
		}
	}

	handleItemClick(e: any): void {
		if (this.isSpacePressed) return;
		
		const itemId = e.target.id();
		const isCtrlPressed = e.evt && (e.evt.ctrlKey || e.evt.metaKey);
		
		if (isCtrlPressed) {
			// Ctrl+클릭: 다중선택 토글
			if (this.selectedItems.includes(itemId)) {
				// 이미 선택된 경우 선택 해제
				this.selectedItems = this.selectedItems.filter(id => id !== itemId);
			} else {
				// 선택되지 않은 경우 추가
				this.selectedItems.push(itemId);
			}
			
			this.multipleSelected = this.selectedItems.length > 1;
			
			if (this.selectedItems.length === 1) {
				this.selectedItemId = this.selectedItems[0];
				this.$emit('item-selected', this.selectedItemId);
			} else if (this.selectedItems.length > 1) {
				this.selectedItemId = null;
				this.$emit('multiple-items-selected', this.selectedItems);
			} else {
				this.selectedItemId = null;
				this.$emit('item-selected', null);
			}
		} else {
			// 일반 클릭: 단일 선택
			this.selectedItemId = itemId;
			this.selectedItems = [itemId];
			this.multipleSelected = false;
			this.$emit('item-selected', itemId);
		}
		
		// Transformer 업데이트를 nextTick에서 실행
		this.$nextTick(() => {
			this.updateTransformer();
		});
	}

	handleDragEnd(e: any) {
		const id = e.target.id();
		const node = e.target;
		
		// 다중선택된 상태이고 드래그된 객체가 선택된 객체 중 하나라면
		if (this.multipleSelected && this.selectedItems.includes(id)) {
			// 드래그된 객체의 이동 거리 계산
			const deltaX = node.x() - (this.items.find(item => item.id === id)?.x || 0);
			const deltaY = node.y() - (this.items.find(item => item.id === id)?.y || 0);
			
			// 선택된 모든 객체들을 같은 거리만큼 이동
			this.selectedItems.forEach(itemId => {
				if (itemId !== id) { // 드래그된 객체는 이미 이동됨
					const item = this.items.find(item => item.id === itemId);
					if (item) {
						this.$emit('item-transformed', itemId, {
							x: item.x + deltaX,
							y: item.y + deltaY,
						});
					}
				}
			});
		}
		
		this.$emit('item-transformed', id, {
			x: node.x(),
			y: node.y(),
		});
	}

	handleTransformEnd(e: any) {
		const id = e.target.id();
		const node = e.target;
		
		this.$emit('item-transformed', id, {
			x: node.x(),
			y: node.y(),
			rotation: node.rotation(),
			scaleX: node.scaleX(),
			scaleY: node.scaleY(),
		});
	}

	handleTextDblClick(e: any) {
		// 텍스트 인라인 편집 (간단 구현)
		const id = e.target.id();
		const textItem = this.items.find(item => item.id === id) as TextItem;
		
		// if (textItem) {
		// 	const newText = prompt('텍스트를 입력하세요:', textItem.text);
		// 	if (newText !== null) {
		// 		this.$emit('item-updated', id, { text: newText });
		// 	}
		// }
	}

	updateTransformer() {
		const transformer = this.$refs.transformer as any;
		const contentLayer = this.$refs.contentLayer as any;
		
		if (!transformer || !contentLayer) return;

		try {
			// Vue 컴포넌트에서 실제 Konva 객체 가져오기
			const konvaLayer = contentLayer.getNode();
			const konvaTransformer = transformer.getNode();

			if (this.selectedItemId && !this.multipleSelected) {
				// 단일 선택된 객체에 Transformer 적용
				const selectedNode = konvaLayer.findOne(`#${this.selectedItemId}`);
				if (selectedNode) {
					konvaTransformer.nodes([selectedNode]);
					konvaTransformer.show();
				} else {
					konvaTransformer.nodes([]);
					konvaTransformer.hide();
				}
			} else {
				// 다중 선택이거나 선택이 없는 경우 Transformer 숨김
				konvaTransformer.nodes([]);
				konvaTransformer.hide();
			}
			
			// 레이어 다시 그리기
			konvaLayer.batchDraw();
		} catch (error) {
			console.warn('Transformer 업데이트 중 오류:', error);
		}
	}

	updateSelectionBorders() {
		// 선택 영역 테두리 업데이트를 위한 강제 리렌더링
		if (this.selectedItems.length > 0) {
			this.$forceUpdate();
		}
	}

	// 키보드 이벤트 처리
	handleKeyDown(e: KeyboardEvent) {
		// 스페이스바 팬 모드
		if (e.key === ' ' || e.code === 'Space') {
			e.preventDefault();
			this.isSpacePressed = true;
			// 커서 스타일을 grab으로 변경
			document.body.style.cursor = 'grab';
			return;
		}

		if (!this.selectedItemId) return;

		// Delete 키로 객체 삭제
		if (e.key === 'Delete') {
			e.preventDefault();
			this.deleteSelectedItem();
		}

		// Ctrl+D로 객체 복사
		if (e.ctrlKey && e.key === 'd') {
			e.preventDefault();
			this.duplicateSelectedItem();
		}

		// Ctrl+C로 객체 복사 (클립보드)
		if (e.ctrlKey && e.key === 'c') {
			e.preventDefault();
			this.copySelectedItem();
		}

		// Ctrl+V로 객체 붙여넣기
		if (e.ctrlKey && e.key === 'v') {
			e.preventDefault();
			this.pasteItem();
		}

		// 화살표 키로 객체 이동
		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
			e.preventDefault();
			this.moveSelectedItem(e.key, e.shiftKey ? 10 : 1);
		}

		// Page Up/Down으로 레이어 순서 변경
		if (e.key === 'PageUp') {
			e.preventDefault();
			this.bringForward();
		}
		if (e.key === 'PageDown') {
			e.preventDefault();
			this.sendBackward();
		}
	}

	handleKeyUp(e: KeyboardEvent) {
		// 스페이스바 해제
		if (e.key === ' ' || e.code === 'Space') {
			e.preventDefault();
			this.isSpacePressed = false;
			this.isPanning = false;
			// 커서 스타일을 기본값으로 복원
			document.body.style.cursor = 'default';
		}
	}

	// 마우스 휠로 줌 처리
	handleWheel(e: WheelEvent) {
		// Ctrl 키가 눌린 상태에서만 줌 동작
		if (!e.ctrlKey) return;
		
		e.preventDefault();
		
		const scaleBy = 1.1;
		const stage = this.$refs.stage as any;
		if (!stage) return;
		
		const oldScale = this.zoomScale;
		const pointer = stage.getNode().getPointerPosition();
		
		const mousePointTo = {
			x: (pointer.x - this.stageX) / oldScale,
			y: (pointer.y - this.stageY) / oldScale,
		};
		
		const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
		
		// 줌 범위 제한
		this.zoomScale = Math.max(0.1, Math.min(5, newScale));
		
		const newPos = {
			x: pointer.x - mousePointTo.x * this.zoomScale,
			y: pointer.y - mousePointTo.y * this.zoomScale,
		};
		
		this.stageX = newPos.x;
		this.stageY = newPos.y;
		
		// 줌 변경 시 선택 영역 업데이트
		this.$nextTick(() => {
			this.updateSelectionBorders();
		});
	}

	// 객체 조작 메서드들
	private copiedItem: CanvasItem | null = null;

	deleteSelectedItem() {
		if (this.selectedItemId) {
			this.$emit('item-deleted', this.selectedItemId);
		}
	}

	duplicateSelectedItem() {
		if (this.selectedItemId) {
			const selectedItem = this.items.find(item => item.id === this.selectedItemId);
			if (selectedItem) {
				const duplicatedItem = {
					...selectedItem,
					id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					x: selectedItem.x + 20,
					y: selectedItem.y + 20,
				};
				this.$emit('item-duplicated', duplicatedItem);
			}
		}
	}

	copySelectedItem() {
		if (this.selectedItemId) {
			const selectedItem = this.items.find(item => item.id === this.selectedItemId);
			if (selectedItem) {
				this.copiedItem = { ...selectedItem };
			}
		}
	}

	pasteItem() {
		if (this.copiedItem) {
			const pastedItem = {
				...this.copiedItem,
				id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
				x: this.copiedItem.x + 20,
				y: this.copiedItem.y + 20,
			};
			this.$emit('item-pasted', pastedItem);
		}
	}

	moveSelectedItem(direction: string, distance: number) {
		if (!this.selectedItemId) return;
		
		const selectedItem = this.items.find(item => item.id === this.selectedItemId);
		if (!selectedItem) return;
		
		let deltaX = 0;
		let deltaY = 0;
		
		switch (direction) {
			case 'ArrowUp':
				deltaY = -distance;
				break;
			case 'ArrowDown':
				deltaY = distance;
				break;
			case 'ArrowLeft':
				deltaX = -distance;
				break;
			case 'ArrowRight':
				deltaX = distance;
				break;
		}
		
		this.$emit('item-transformed', this.selectedItemId, {
			x: selectedItem.x + deltaX,
			y: selectedItem.y + deltaY,
		});
	}


	exportToPNG() {
		try {
			const stage = this.$refs.stage as any;
			if (!stage) {
				console.error('스테이지를 찾을 수 없습니다.');
				return;
			}

			// Transformer 숨기기
			const transformer = this.$refs.transformer as any;
			if (transformer) {
				transformer.getNode().hide();
			}

			// 임시 Layer 생성하여 경계선 없이 콘텐츠만 추출
			const konvaStage = stage.getNode();
			const tempLayer = new (window as any).Konva.Layer();
			
			// 배경 이미지 추가 (있는 경우)
			if (this.backgroundImageElement) {
				const bgImage = new (window as any).Konva.Image({
					x: 0,
					y: 0,
					width: this.canvasWidth,
					height: this.canvasHeight,
					image: this.backgroundImageElement,
					listening: false
				});
				tempLayer.add(bgImage);
			}
			
			// 기존 Layer의 모든 객체를 복사 (경계선 제외)
			const originalLayer = this.$refs.layer as any;
			const konvaLayer = originalLayer.getNode();
			
			konvaLayer.children.forEach((child: any) => {
				// 캔버스 경계 사각형은 제외 (첫 번째 rect가 경계선)
				if (child.className === 'Rect' && child.x() === 0 && child.y() === 0 && 
					child.width() === this.canvasWidth && child.height() === this.canvasHeight && 
					child.fill() === undefined && child.stroke()) {
					return; // 경계선 스킵
				}
				
				// 다른 모든 객체는 복사
				const clonedChild = child.clone();
				tempLayer.add(clonedChild);
			});
			
			// 임시 DOM 컨테이너 생성
			const tempContainer = document.createElement('div');
			tempContainer.style.position = 'absolute';
			tempContainer.style.top = '-9999px';
			tempContainer.style.left = '-9999px';
			document.body.appendChild(tempContainer);
		
			// 임시 Stage에 임시 Layer 추가
			const tempStage = new (window as any).Konva.Stage({
				container: tempContainer,
				width: this.canvasWidth,
				height: this.canvasHeight
			});
			tempStage.add(tempLayer);
			
			// 임시 Stage에서 추출
			const dataURL = tempStage.toDataURL({
				pixelRatio: 2,
				mimeType: 'image/png',
				quality: 1
			});
			
			// 임시 객체들 정리
			tempStage.destroy();
			document.body.removeChild(tempContainer);

			// 다운로드 링크 생성
			const link = document.createElement('a');
			link.download = `canvas-export-${new Date().getTime()}.png`;
			link.href = dataURL;
			
			// 다운로드 실행
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			// Transformer 다시 보이기
			if (transformer) {
				transformer.getNode().show();
			}
			
			console.log('PNG 내보내기 완료');
		} catch (error) {
			console.error('PNG 내보내기 실패:', error);
		}
	}

	// 배경 이미지 설정
	setBackgroundImage(src: string): Promise<void> {
		return new Promise((resolve) => {
			this.backgroundImage = src;
			const img = new Image();
			img.onload = async () => {
				this.backgroundImageElement = img;
				resolve();
			};
			img.src = src;
		});
	}

	// 배경 이미지 엘리먼트 반환
	getBackgroundImageElement(): HTMLImageElement | null {
		return this.backgroundImageElement;
	}

	// 선택 영역 내의 객체들 찾기
	getItemsInSelection(): string[] {
		const selectedIds: string[] = [];
		
		this.items.forEach(item => {
			// 모든 아이템에 width, height가 있으므로 이를 활용하여 경계 박스 계산
			let itemBounds;
			
			const width = item.width || 100;
			const height = item.height || 100;
			const scaleX = item.scaleX || 1;
			const scaleY = item.scaleY || 1;

			if (item.type === 'circle' || item.type === 'triangle' || item.type === 'star') {
				// 중심점 기준 도형들
				itemBounds = {
					x: item.x - (width * scaleX) / 2,
					y: item.y - (height * scaleY) / 2,
					width: width * scaleX,
					height: height * scaleY,
				};
			} else {
				// 좌상단 기준 도형들 (rect, arrow, text, image)
				itemBounds = {
					x: item.x,
					y: item.y,
					width: width * scaleX,
					height: height * scaleY,
				};
			}
			
			// 선택 영역과 아이템이 겹치는지 확인 (완전히 포함되거나 일부라도 겹치면 선택)
			if (this.isRectIntersecting(this.selectionRect, itemBounds)) {
				selectedIds.push(item.id);
			}
		});
		
		return selectedIds;
	}

	getSelectionBorderConfig(itemId: string) {
		const item = this.items.find(i => i.id === itemId);
		if (!item) return {};
		
		// Konva 노드에서 실제 경계 박스를 가져와서 Transformer와 동일한 크기로 설정
		const contentLayer = this.$refs.contentLayer as any;
		if (contentLayer) {
			const konvaLayer = contentLayer.getNode();
			const node = konvaLayer.findOne(`#${itemId}`);
			
			if (node) {
				// getClientRect()는 스테이지 변환이 적용된 절대 좌표를 반환
				// 하지만 테두리는 레이어 내 상대 좌표계에서 렌더링되므로 변환 필요
				const clientRect = node.getClientRect();
				const stage = konvaLayer.getStage();
				
				// 스테이지 변환을 역으로 적용하여 레이어 좌표계로 변환
				const stageTransform = stage.getTransform().copy().invert();
				const topLeft = stageTransform.point({ x: clientRect.x, y: clientRect.y });
				const bottomRight = stageTransform.point({ 
					x: clientRect.x + clientRect.width, 
					y: clientRect.y + clientRect.height 
				});
				
				return {
					x: topLeft.x,
					y: topLeft.y,
					width: bottomRight.x - topLeft.x,
					height: bottomRight.y - topLeft.y,
					stroke: '#2196F3',
					strokeWidth: 3,
					dash: [5, 5],
					fill: 'transparent',
					listening: false,
				};
			}
		}
		
		// 폴백: Konva 노드를 찾을 수 없는 경우 기존 로직 사용
		let borderConfig;
		
		const width = item.width || 100;
		const height = item.height || 100;
		const scaleX = item.scaleX || 1;
		const scaleY = item.scaleY || 1;

		if (item.type === 'circle' || item.type === 'triangle' || item.type === 'star') {
			// 중심점 기준 도형들: 중심에서 width/height의 절반만큼 이동
			borderConfig = {
				x: item.x - (width * scaleX) / 2,
				y: item.y - (height * scaleY) / 2,
				width: width * scaleX,
				height: height * scaleY,
			};
		} else {
			// 좌상단 기준 도형들 (rect, arrow, text, image)
			borderConfig = {
				x: item.x,
				y: item.y,
				width: width * scaleX,
				height: height * scaleY,
			};
		}
		
		return {
			...borderConfig,
			stroke: '#2196F3',
			strokeWidth: 2,
			dash: [5, 5],
			fill: 'transparent',
			listening: false,
		};
	}

	isRectIntersecting(rect1: any, rect2: any): boolean {
		return !(rect1.x > rect2.x + rect2.width ||
			rect1.x + rect1.width < rect2.x ||
			rect1.y > rect2.y + rect2.height ||
			rect1.y + rect1.height < rect2.y);
	}

	// 캔버스 중앙 정렬 및 전체 보기
	centerCanvasAndFitToScreen(): void {
		this.$nextTick(() => {
			const container = this.$el as HTMLElement;
			if (!container) return;
			
			const containerWidth = container.clientWidth;
			const containerHeight = container.clientHeight;
			
			// 캔버스가 컸테이너에 맞도록 스케일 계산
			const scaleX = (containerWidth * 0.8) / this.canvasWidth;
			const scaleY = (containerHeight * 0.8) / this.canvasHeight;
			const scale = Math.min(scaleX, scaleY, 1); // 최대 1배
			
			// 스케일 적용
			this.zoomScale = scale;
			
			// 중앙 정렬
			const scaledCanvasWidth = this.canvasWidth * scale;
			const scaledCanvasHeight = this.canvasHeight * scale;
			
			this.stageX = (containerWidth - scaledCanvasWidth) / 2;
			this.stageY = (containerHeight - scaledCanvasHeight) / 2;
		});
	}

	// 우클릭 메뉴 표시
	showContextMenu(event: MouseEvent, itemId: string): void {
		this.contextMenuItemId = itemId;
		this.contextMenuX = event.clientX;
		this.contextMenuY = event.clientY;
		this.contextMenuVisible = true;
	}

	// 레이어 순서 변경 메서드들
	bringToFront(): void {
		if (this.contextMenuItemId || this.selectedItemId) {
			const itemId = this.contextMenuItemId || this.selectedItemId;
			this.$emit('item-layer-changed', itemId, 'front');
			this.contextMenuVisible = false;
		}
	}

	bringForward(): void {
		if (this.contextMenuItemId || this.selectedItemId) {
			const itemId = this.contextMenuItemId || this.selectedItemId;
			this.$emit('item-layer-changed', itemId, 'forward');
			this.contextMenuVisible = false;
		}
	}

	sendBackward(): void {
		if (this.contextMenuItemId || this.selectedItemId) {
			const itemId = this.contextMenuItemId || this.selectedItemId;
			this.$emit('item-layer-changed', itemId, 'backward');
			this.contextMenuVisible = false;
		}
	}

	sendToBack(): void {
		if (this.contextMenuItemId || this.selectedItemId) {
			const itemId = this.contextMenuItemId || this.selectedItemId;
			this.$emit('item-layer-changed', itemId, 'back');
			this.contextMenuVisible = false;
		}
	}

}
</script>

<style lang="scss" scoped>
	.canvas-stage {
	flex: 1;
	min-width: 0; // flex 아이템이 축소될 수 있도록 허용
	height: calc(100vh - 48px);
	background: #f5f5f5;
	border: 1px solid var(--v-divider-base);
	overflow: hidden;
	position: relative;
	outline: none; // 포커스 아웃라인 제거
	
	// 캔버스 줌 상태 표시
	&::after {
		content: attr(data-zoom);
		position: absolute;
		top: 10px;
		right: 10px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		pointer-events: none;
		z-index: 1000;
	}
}
</style>