<template>
	<div class="image-editor">
		<Topbar
			@new-canvas="handleNewCanvas"
			@upload-image="handleUploadImage"
			@export-png="handleExportPng"
			@undo="handleUndo"
			@redo="handleRedo"
			@delete-selected="handleDeleteSelected"
			:can-undo="canUndo"
			:can-redo="canRedo"
		/>
		
		<div class="editor-body">
			<LeftToolbar
				@add-shape="handleAddShape"
				@add-text="handleAddText"
				@upload-image="handleUploadImage"
				@add-sticker="handleAddSticker"
				@canvas-size-changed="handleCanvasSizeChanged"
				@set-background-image="handleSetBackgroundImage"
				:selected-tool="selectedTool"
				:canvas-width="canvasWidth"
				:canvas-height="canvasHeight"
			/>
			
			<CanvasStage
				ref="canvasStage"
				:items="items"
				:selected-item-id-prop="selectedItemId"
				:scale="scale"
				:canvas-width="canvasWidth"
				:canvas-height="canvasHeight"
				@item-selected="handleItemSelected"
				@multiple-items-selected="handleMultipleItemsSelected"
				@item-updated="handleItemUpdated"
				@item-transformed="handleItemTransformed"
				@item-deleted="handleItemDeleted"
				@item-duplicated="handleItemDuplicated"
				@item-pasted="handleItemPasted"
				@item-layer-changed="handleItemLayerChanged"
				@konva-node-updated="handleKonvaNodeUpdated"
			/>
			
			<RightInspector
				v-if="selectedItem"
				:selected-item="selectedItem"
				@item-updated="handleItemUpdated"
				@layer-order-changed="handleLayerOrderChanged"
			/>
		</div>
		
		<BottomStatus
			:scale="scale"
			:selected-item="selectedItem"
			@scale-changed="handleScaleChanged"
		/>
		
		<!-- 스티커 이미지 선택 모달 -->
		<StickerImageModal
			v-model="showStickerModal"
			:sticker="selectedSticker"
			@select="handleStickerImageSelected"
		/>
	</div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import Topbar from './Topbar.vue';
import LeftToolbar from './LeftToolbar.vue';
import CanvasStage from './CanvasStage.vue';
import RightInspector from './RightInspector.vue';
import BottomStatus from './BottomStatus.vue';
import StickerImageModal from './StickerImageModal.vue';
import { EditorItem, ShapeItem, TextItem, ImageItem, HistoryCommand, EditorState } from './types';

@Component({
	components: {
		Topbar,
		LeftToolbar,
		CanvasStage,
		RightInspector,
		BottomStatus,
		StickerImageModal,
	},
})
export default class Editor extends Mixins(GlobalMixins) {
	@Prop({ type: String, default: '' })
	private liveId!: string;

	// 에디터 상태
	items: EditorItem[] = [];
	selectedItemId: string | null = null;
	selectedTool = '';
	scale = 1;
	canvasWidth = 1024;
	canvasHeight = 1024;
	
	// 히스토리 관리
	private history: HistoryCommand[] = [];
	private historyIndex = -1;
	
	// Konva 객체 참조 맵 (id -> Konva Node)
	private konvaNodeMap: Map<string, any> = new Map();
	
	// 스티커 모달 상태
	showStickerModal = false;
	selectedSticker: any = null;

	get selectedItem(): EditorItem | null {
		return this.items.find(item => item.id === this.selectedItemId) || null;
	}

	get canUndo(): boolean {
		return this.historyIndex >= 0;
	}

	get canRedo(): boolean {
		return this.historyIndex < this.history.length - 1;
	}

	// 새 캔버스
	handleNewCanvas(): void {
		this.items = [];
		this.selectedItemId = null;
		this.history = [];
		this.historyIndex = -1;
	}

	// 도형 추가
	handleAddShape(shapeType: string): void {
		const id = `${shapeType}_${Date.now()}`;
		
		// 도형 타입별 기본 크기 설정
		let defaultWidth = 100;
		let defaultHeight = 100;
		
		switch (shapeType) {
			case 'rect':
				defaultWidth = 120;
				defaultHeight = 80;
				break;
			case 'circle':
				defaultWidth = 100;
				defaultHeight = 100; // 원은 width와 height가 같음 (반지름 기준)
				break;
			case 'triangle':
				defaultWidth = 100;
				defaultHeight = 100;
				break;
			case 'star':
				defaultWidth = 100;
				defaultHeight = 100;
				break;
			case 'arrow':
				defaultWidth = 120;
				defaultHeight = 60;
				break;
		}
		
		const newShape: ShapeItem = {
			id,
			type: shapeType as any,
			x: 100,
			y: 100,
			width: defaultWidth,
			height: defaultHeight,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			opacity: 1,
			draggable: true,
			fill: '#3f51b5',
			stroke: '#000000',
			strokeWidth: 0,
		};

		this.items.push(newShape);
		this.selectedItemId = id;
		this.addToHistory('add', id, undefined, newShape);
	}

	// 텍스트 추가
	handleAddText(): void {
		const id = `text_${Date.now()}`;
		const newText: TextItem = {
			id,
			type: 'text',
			x: 100,
			y: 100,
			width: 120, // 텍스트 기본 너비
			height: 30, // 텍스트 기본 높이
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			opacity: 1,
			draggable: true,
			text: 'Sample Text',
			fill: '#000000',
			fontFamily: 'Arial',
			fontStyle: 'normal',
			fontSize: 24,
		};

		this.items.push(newText);
		this.selectedItemId = id;
		this.addToHistory('add', id, undefined, newText);
	}

	// 이미지 업로드
	handleUploadImage(): void {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = (e: Event) => {
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (event) => {
					const src = event.target?.result as string;
					const img = new Image();
					img.onload = () => {
						const id = `image_${Date.now()}`;
						// 이미지 크기를 적절히 조정 (너무 크면 캔버스에 맞게 축소)
						const maxSize = 300;
						let displayWidth = img.width;
						let displayHeight = img.height;
						
						if (img.width > maxSize || img.height > maxSize) {
							const ratio = Math.min(maxSize / img.width, maxSize / img.height);
							displayWidth = img.width * ratio;
							displayHeight = img.height * ratio;
						}
						
						const newImage: ImageItem = {
							id,
							type: 'image',
							x: 100,
							y: 100,
							width: displayWidth,
							height: displayHeight,
							rotation: 0,
							scaleX: 1,
							scaleY: 1,
							opacity: 1,
							draggable: true,
							src,
							naturalWidth: img.width,
							naturalHeight: img.height,
						};

						this.items.push(newImage);
						this.selectedItemId = id;
						this.addToHistory('add', id, undefined, newImage);
					};
					img.src = src;
				};
				reader.readAsDataURL(file);
			}
		};
		input.click();
	}

	// PNG 내보내기
	handleExportPng(): void {
		const canvasStage = this.$refs.canvasStage as any;
		if (canvasStage && canvasStage.exportToPNG) {
			canvasStage.exportToPNG();
		}
	}

	// 아이템 선택
	handleItemSelected(itemId: string | null): void {
		this.selectedItemId = itemId;
	}

	handleMultipleItemsSelected(itemIds: string[]): void {
		// 다중 선택 시 인스펙터 숨김
		this.selectedItemId = null;
		console.log('다중 선택된 객체들:', itemIds);
	}

	// 아이템 업데이트
	handleItemUpdated(itemId: string, updates: Partial<EditorItem>): void {
		const itemIndex = this.items.findIndex(item => item.id === itemId);
		if (itemIndex !== -1) {
			const oldData = { ...this.items[itemIndex] };
			const updatedItem = { ...this.items[itemIndex], ...updates };
			
			// Vue 반응성을 위해 $set 사용
			this.$set(this.items, itemIndex, updatedItem);
			
			// CanvasStage 강제 업데이트
			this.$nextTick(() => {
				const canvasStage = this.$refs.canvasStage as any;
				if (canvasStage) {
					canvasStage.$forceUpdate();
				}
			});
			
			this.addToHistory('update', itemId, oldData, updates);
		}
	}

	// 아이템 삭제 (캔버스에서 호출)
	handleItemDeleted(itemId: string): void {
		const itemIndex = this.items.findIndex(item => item.id === itemId);
		if (itemIndex !== -1) {
			const oldData = this.items[itemIndex];
			this.items.splice(itemIndex, 1);
			this.addToHistory('remove', itemId, oldData, undefined);
			this.selectedItemId = null;
		}
	}

	// 아이템 복사
	handleItemDuplicated(duplicatedItem: EditorItem): void {
		this.items.push(duplicatedItem);
		this.addToHistory('add', duplicatedItem.id, undefined, duplicatedItem);
		this.selectedItemId = duplicatedItem.id;
	}

	// 아이템 붙여넣기
	handleItemPasted(pastedItem: EditorItem): void {
		this.items.push(pastedItem);
		this.addToHistory('add', pastedItem.id, undefined, pastedItem);
		this.selectedItemId = pastedItem.id;
	}

	// 아이템 레이어 순서 변경
	handleItemLayerChanged(itemId: string, direction: 'forward' | 'backward' | 'front' | 'back'): void {
		const itemIndex = this.items.findIndex(item => item.id === itemId);
		if (itemIndex === -1) return;

		const item = this.items[itemIndex];
		const oldIndex = itemIndex;
		let newIndex = itemIndex;

		switch (direction) {
			case 'forward':
				newIndex = Math.min(itemIndex + 1, this.items.length - 1);
				break;
			case 'backward':
				newIndex = Math.max(itemIndex - 1, 0);
				break;
			case 'front':
				newIndex = this.items.length - 1;
				break;
			case 'back':
				newIndex = 0;
				break;
		}

		if (oldIndex !== newIndex) {
			// 배열에서 아이템 제거 후 새 위치에 삽입
			this.items.splice(oldIndex, 1);
			this.items.splice(newIndex, 0, item);
			
			// Konva 노드의 zIndex 업데이트
			const konvaNode = this.konvaNodeMap.get(item.id);
			if (konvaNode) {
				konvaNode.zIndex(newIndex);
			}
			
			// Vue 반응성을 위한 강제 업데이트
			this.$forceUpdate();
			
			// CanvasStage 강제 업데이트
			this.$nextTick(() => {
				const canvasStage = this.$refs.canvasStage as any;
				if (canvasStage) {
					canvasStage.$forceUpdate();
				}
			});
			
			// 히스토리에 레이어 변경 기록
			this.addToHistory('layer', itemId, { oldIndex }, { newIndex });
		}
	}

	// 스케일 변경
	handleScaleChanged(newScale: number): void {
		this.scale = newScale;
	}

	// 캔버스 크기 변경
	handleCanvasSizeChanged(size: { width: number; height: number }): void {
		this.canvasWidth = size.width;
		this.canvasHeight = size.height;
	}

	// 배경 이미지 설정
	handleSetBackgroundImage(): void {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = (e: Event) => {
			const target = e.target as HTMLInputElement;
			const file = target.files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (event) => {
					const src = event.target?.result as string;
					const img = new Image();
					img.onload = () => {
						// 캔버스 크기를 배경 이미지 크기에 맞추기
						this.canvasWidth = img.width;
						this.canvasHeight = img.height;
						
						// 배경 이미지를 캔버스에 전달
						const canvasStage = this.$refs.canvasStage as any;
						if (canvasStage && canvasStage.setBackgroundImage) {
							canvasStage.setBackgroundImage(src);
							// 배경 이미지 설정 후 중앙 정렬
							canvasStage.centerCanvasAndFitToScreen();
						}
					};
					img.src = src;
				};
				reader.readAsDataURL(file);
			}
		};
		input.click();
	}

	// 히스토리 관리
	addToHistory(type: string, itemId: string, oldData?: any, newData?: any): void {
		const command: HistoryCommand = {
			type: type as any,
			itemId,
			oldData,
			newData,
		};

		// 현재 위치 이후의 히스토리 제거
		this.history = this.history.slice(0, this.historyIndex + 1);
		this.history.push(command);
		this.historyIndex = this.history.length - 1;

		// 히스토리 크기 제한 (50개)
		if (this.history.length > 50) {
			this.history.shift();
			this.historyIndex--;
		}
	}

	// Undo
	handleUndo(): void {
		if (this.canUndo) {
			const command = this.history[this.historyIndex];
			this.executeCommand(command, true);
			this.historyIndex--;
		}
	}

	// Redo
	handleRedo(): void {
		if (this.canRedo) {
			this.historyIndex++;
			const command = this.history[this.historyIndex];
			this.executeCommand(command, false);
		}
	}

	// 레이어 순서 조정 핸들러
	handleLayerOrderChanged(itemId: string, direction: string): void {
		const itemIndex = this.items.findIndex(item => item.id === itemId);
		if (itemIndex === -1) return;

		const item = this.items[itemIndex];
		const oldIndex = itemIndex;
		let newIndex = itemIndex;

		switch (direction) {
			case 'to-back':
				newIndex = 0;
				break;
			case 'backward':
				newIndex = Math.max(0, itemIndex - 1);
				break;
			case 'forward':
				newIndex = Math.min(this.items.length - 1, itemIndex + 1);
				break;
			case 'to-front':
				newIndex = this.items.length - 1;
				break;
		}

		if (newIndex !== oldIndex) {
			// 배열에서 아이템 제거 후 새 위치에 삽입
			this.items.splice(itemIndex, 1);
			this.items.splice(newIndex, 0, item);

			// 실제 Konva 캔버스에 zIndex 적용
			this.updateCanvasZIndices();

			// 히스토리에 추가
			this.addToHistory('layer-order', itemId, { oldIndex }, { newIndex });
		}
	}

	// 커맨드 실행
	executeCommand(command: HistoryCommand, isUndo: boolean): void {
		const { type, itemId, oldData, newData } = command;

		switch (type) {
			case 'add':
				if (isUndo) {
					// 추가 취소 = 삭제
					const index = this.items.findIndex(item => item.id === itemId);
					if (index !== -1) {
						this.items.splice(index, 1);
					}
					this.selectedItemId = null;
				} else {
					// 추가 재실행
					if (newData) {
						this.items.push(newData as EditorItem);
						this.selectedItemId = itemId;
					}
				}
				break;

			case 'remove':
				if (isUndo) {
					// 삭제 취소 = 추가
					if (oldData) {
						this.items.push(oldData as EditorItem);
						this.selectedItemId = itemId;
					}
				} else {
					// 삭제 재실행
					const index = this.items.findIndex(item => item.id === itemId);
					if (index !== -1) {
						this.items.splice(index, 1);
					}
					this.selectedItemId = null;
				}
				break;

			case 'layer-order':
				if (isUndo && oldData) {
					// 레이어 순서 되돌리기
					const itemIndex = this.items.findIndex(item => item.id === itemId);
					if (itemIndex !== -1) {
						const item = this.items[itemIndex];
						this.items.splice(itemIndex, 1);
						this.items.splice(oldData.oldIndex, 0, item);
					}
				} else if (!isUndo && newData) {
					// 레이어 순서 재적용
					const itemIndex = this.items.findIndex(item => item.id === itemId);
					if (itemIndex !== -1) {
						const item = this.items[itemIndex];
						this.items.splice(itemIndex, 1);
						this.items.splice(newData.newIndex, 0, item);
					}
				}
				break;

			case 'update':
			case 'transform':
				const itemIndex = this.items.findIndex(item => item.id === itemId);
				if (itemIndex !== -1) {
					const dataToApply = isUndo ? oldData : newData;
					if (dataToApply) {
						this.items[itemIndex] = { ...this.items[itemIndex], ...dataToApply };
					}
				}
				break;
		}
	}

	// 실제 Konva 캔버스에 zIndex 적용
	updateCanvasZIndices(): void {
		this.items.forEach((item, index) => {
			const konvaNode = this.konvaNodeMap.get(item.id);
			if (konvaNode) {
				konvaNode.zIndex(index);
			}
		});
		
		// 캔버스 레이어 다시 그리기
		const canvasStage = this.$refs.canvasStage as any;
		if (canvasStage && canvasStage.$refs && canvasStage.$refs.stage) {
			const konvaStage = canvasStage.$refs.stage.getStage();
			const layer = konvaStage.getLayers()[0];
			if (layer) {
				layer.batchDraw();
			}
		}
	}

	// 아이템 변형 (드래그, 리사이즈, 회전)
	handleItemTransformed(itemId: string, updates: Partial<EditorItem>): void {
		const itemIndex = this.items.findIndex(item => item.id === itemId);
		if (itemIndex !== -1) {
			const oldData = { ...this.items[itemIndex] };
			
			// 아이템 업데이트 - Vue 반응성을 위해 Vue.set 사용
			const updatedItem = { ...this.items[itemIndex], ...updates };
			this.$set(this.items, itemIndex, updatedItem);
			
			// 히스토리에 추가
			this.addToHistory('transform', itemId, oldData, updates);
		}
	}

	// 선택된 아이템 삭제
	handleDeleteSelected(): void {
		if (this.selectedItemId) {
			this.handleItemDeleted(this.selectedItemId);
		}
	}

	// Konva 노드 참조 업데이트
	handleKonvaNodeUpdated(itemId: string, konvaNode: any): void {
		if (konvaNode) {
			this.konvaNodeMap.set(itemId, konvaNode);
		} else {
			this.konvaNodeMap.delete(itemId);
		}
	}

	// 외부에서 이미지 추가 (MasterView에서 호출)
	addImageItem(imageData: any): void {
		try {
			const newItem: EditorItem = {
				id: imageData.id || `image_${Date.now()}`,
				type: 'image',
				x: imageData.x || 100,
				y: imageData.y || 100,
				width: imageData.width || 300,
				height: imageData.height || 200,
				rotation: 0,
				opacity: imageData.opacity || 1,
				draggable: true,
				scaleX: 1,
				scaleY: 1,
				src: imageData.src
			};

			this.items.push(newItem);
			this.selectedItemId = newItem.id;
			
			// 히스토리에 추가
			this.addToHistory('add', newItem.id, null, newItem);
			
			console.log('에디터에 이미지 아이템 추가됨:', imageData.name || 'Captured Image');
		} catch (error) {
			console.error('이미지 아이템 추가 실패:', error);
		}
	}

	// 스티커 추가 핸들러
	handleAddSticker(sticker: any): void {
		// 스티커 선택 모달을 열어 이미지를 선택하도록 함
		this.selectedSticker = sticker;
		this.showStickerModal = true;
	}

	// 스티커 이미지 선택 완료 핸들러
	async handleStickerImageSelected(data: { sticker: any; imageUrl: string }): Promise<void> {
		try {
			// 이미지 실제 크기 가져오기
			const { width, height } = await this.getImageDimensions(data.imageUrl);
			
			// 선택된 스티커 이미지를 에디터에 추가
			const imageData = {
				id: `sticker_${Date.now()}`,
				src: data.imageUrl,
				name: (data.sticker && data.sticker.name) ? data.sticker.name : '스티커',
				x: 100,
				y: 100,
				width: width,
				height: height
			};

			this.addImageItem(imageData);
			console.log('스티커 이미지 추가됨:', (data.sticker && data.sticker.name) ? data.sticker.name : '스티커');
		} catch (error) {
			console.error('스티커 이미지 추가 실패:', error);
		}
	}

	// 외부에서 배경 이미지 설정 (MasterView에서 호출)
	async setBackgroundImage(src: string): Promise<void> {
		try {
			// 배경 이미지 크기 분석
			const { width, height } = await this.getImageDimensions(src);
			
			// 캔버스 크기를 배경 이미지 크기에 맞게 조정
			this.canvasWidth = width;
			this.canvasHeight = height;
			
			// Vue의 반응성을 강제로 트리거
			this.$forceUpdate();
			
			// 다음 틱에서 CanvasStage 업데이트
			await this.$nextTick();
			
			const canvasStage = this.$refs.canvasStage as any;
			if (canvasStage && canvasStage.setBackgroundImage) {
				await canvasStage.setBackgroundImage(src);
				
				// CanvasStage의 크기 업데이트를 강제로 트리거
				await this.$nextTick();
				canvasStage.updateStageSize();
				
				// 배경 이미지에 맞춰 캔버스 중앙 정렬 및 화면에 맞춤
				setTimeout(() => {
					canvasStage.centerCanvasAndFitToScreen();
				}, 200);
				
				console.log('에디터 배경 이미지 설정됨:', `${this.canvasWidth}x${this.canvasHeight}`);
			} else {
				console.warn('CanvasStage 레퍼런스를 찾을 수 없습니다.');
			}
		} catch (error) {
			console.error('배경 이미지 설정 실패:', error);
		}
	}

	// 이미지 크기 분석 헬퍼 메서드
	private async getImageDimensions(src: string): Promise<{ width: number; height: number }> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				resolve({
					width: img.naturalWidth,
					height: img.naturalHeight
				});
			};
			img.onerror = () => {
				console.warn('배경 이미지 크기 분석 실패, 기본값 사용');
				resolve({
					width: this.canvasWidth || 1920,
					height: this.canvasHeight || 1080
				});
			};
			img.src = src;
		});
	}

	// 키보드 이벤트
	mounted(): void {
		document.addEventListener('keydown', this.handleKeyDown);
	}

	beforeDestroy(): void {
		document.removeEventListener('keydown', this.handleKeyDown);
	}

	handleKeyDown(e: KeyboardEvent): void {
		// Delete 키로 삭제
		if (e.key === 'Delete' && this.selectedItemId) {
			this.handleDeleteSelected();
		}
		// Ctrl/Cmd + Z로 Undo
		else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			this.handleUndo();
		}
		// Ctrl/Cmd + Y 또는 Ctrl/Cmd + Shift + Z로 Redo
		else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
			e.preventDefault();
			this.handleRedo();
		}
		// Esc로 선택 해제
		else if (e.key === 'Escape') {
			this.selectedItemId = null;
		}
	}
}
</script>

<style lang="scss" scoped>
.image-editor {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
	font-family: 'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
	color: #334155;
}

.editor-body {
	display: flex;
	flex: 1;
	overflow: hidden;
	gap: 1px;
	background: #cbd5e1;
	padding: 1px;
	border-radius: 0 0 16px 16px;
	box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 전역 컴포넌트 스타일 개선 */
:deep(.v-card) {
	background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
	border-radius: 12px !important;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08) !important;
	border: 1px solid rgba(226, 232, 240, 0.8) !important;
	backdrop-filter: blur(10px) !important;
}

:deep(.v-toolbar) {
	background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%) !important;
	border-radius: 16px 16px 0 0 !important;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
	border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
}

:deep(.v-btn) {
	border-radius: 10px !important;
	text-transform: none !important;
	font-weight: 500 !important;
	letter-spacing: 0.3px !important;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

:deep(.v-btn:hover) {
	transform: translateY(-1px) !important;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

:deep(.v-btn.primary) {
	background: linear-gradient(135deg, #3b82f6, #1d4ed8) !important;
	color: white !important;
}

:deep(.v-btn.secondary) {
	background: linear-gradient(135deg, #64748b, #475569) !important;
	color: white !important;
}

/* 텍스트 및 아이콘 가시성 개선 */
:deep(.v-icon) {
	color: #475569 !important;
	transition: color 0.2s ease !important;
}

:deep(.v-btn:hover .v-icon) {
	color: #1e293b !important;
}

:deep(.v-list-item__title) {
	color: #334155 !important;
	font-weight: 500 !important;
}

:deep(.v-subheader) {
	color: #64748b !important;
	font-weight: 600 !important;
	font-size: 12px !important;
	letter-spacing: 0.8px !important;
	text-transform: uppercase !important;
}

/* 입력 필드 스타일 */
:deep(.v-text-field) {
	margin-bottom: 8px !important;
}

:deep(.v-text-field .v-input__control) {
	border-radius: 10px !important;
	background: white !important;
}

:deep(.v-text-field input) {
	background: white !important;
	border: none !important;
	border-radius: 10px !important;
	padding: 12px 4px !important;
	font-size: 14px !important;
	font-weight: 500 !important;
	color: #475569 !important;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:deep(.v-text-field input:focus) {
	border-color: none !important;
	box-shadow: none !important;
	outline: none !important;
}

:deep(.v-text-field input:hover) {
	border-color: #cbd5e1 !important;
}

/* 슬라이더 스타일 */
:deep(.v-slider .v-slider__track-background) {
	background: #e2e8f0 !important;
	height: 6px !important;
	border-radius: 3px !important;
}

:deep(.v-slider .v-slider__track-fill) {
	background: linear-gradient(90deg, #3b82f6, #8b5cf6) !important;
	height: 6px !important;
	border-radius: 3px !important;
	box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3) !important;
}

:deep(.v-slider .v-slider__thumb) {
	background: white !important;
	border: 3px solid #3b82f6 !important;
	width: 20px !important;
	height: 20px !important;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

:deep(.v-slider .v-slider__thumb::before) {
	left: -11px !important;
	top: -11px !important;
}

:deep(.v-slider .v-slider__thumb:hover) {
	transform: scale(1.2) translateY(-7px) !important;
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
}

/* 메뉴 및 드롭다운 스타일 */
:deep(.v-menu__content) {
	background: white !important;
	border-radius: 12px !important;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
	border: 1px solid rgba(226, 232, 240, 0.8) !important;
	backdrop-filter: blur(20px) !important;
}

:deep(.v-list) {
	background: transparent !important;
	padding: 8px !important;
}

:deep(.v-list-item) {
	border-radius: 8px !important;
	margin: 2px 0 !important;
	transition: all 0.2s ease !important;
}

:deep(.v-list-item:hover) {
	background: #f1f5f9 !important;
	transform: translateX(2px) !important;
}

:deep(.v-list-item--active) {
	background: linear-gradient(135deg, #eff6ff, #dbeafe) !important;
	color: #1d4ed8 !important;
}

/* 툴팁 스타일 */
:deep(.v-tooltip__content) {
	background: #1e293b !important;
	color: white !important;
	border-radius: 8px !important;
	font-size: 12px !important;
	font-weight: 500 !important;
	padding: 8px 12px !important;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

/* 구분선 스타일 */
:deep(.v-divider) {
	background: linear-gradient(90deg, transparent, #cbd5e1, transparent) !important;
	opacity: 0.6 !important;
	margin: 16px 0 !important;
}

/* 스크롤바 스타일 */
:deep(::-webkit-scrollbar) {
	width: 8px !important;
	height: 8px !important;
}

:deep(::-webkit-scrollbar-track) {
	background: #f1f5f9 !important;
	border-radius: 4px !important;
}

:deep(::-webkit-scrollbar-thumb) {
	background: linear-gradient(180deg, #cbd5e1, #94a3b8) !important;
	border-radius: 4px !important;
	border: 1px solid #e2e8f0 !important;
}

:deep(::-webkit-scrollbar-thumb:hover) {
	background: linear-gradient(180deg, #94a3b8, #64748b) !important;
}

/* 애니메이션 효과 */
@keyframes slideInUp {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

:deep(.v-card) {
	animation: slideInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
	.editor-body {
		flex-direction: column !important;
		gap: 1px !important;
	}
	
	:deep(.v-btn) {
		min-width: auto !important;
		padding: 8px 12px !important;
	}
	
	:deep(.v-toolbar) {
		border-radius: 0 !important;
	}
}

</style>