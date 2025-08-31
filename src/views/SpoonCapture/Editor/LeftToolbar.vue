<template>
	<div class="left-toolbar">
		<v-card class="toolbar-card" elevation="2" style="border-radius: 0 !important;">
			<v-card-title class="pa-2">
				<v-icon left>mdi-tools</v-icon>
				<span class="text-subtitle-2">도구</span>
			</v-card-title>
			
			<v-divider></v-divider>
			
			<v-card-text class="pa-2">
				<!-- 도형 도구 -->
				<div class="tool-section mb-3">
					<div class="tool-section-title mb-2">도형</div>
					
					<v-row no-gutters>
						<v-col cols="6" v-for="shape in shapes" :key="shape.type" class="pa-1">
							<v-tooltip right>
								<template v-slot:activator="{ on, attrs }">
									<v-btn
										block
										small
										outlined
										:color="selectedTool === shape.type ? 'primary' : ''"
										v-bind="attrs"
										v-on="on"
										@click="handleShapeClick(shape.type)"
									>
										<v-icon>{{ shape.icon }}</v-icon>
									</v-btn>
								</template>
								<span>{{ shape.name }}</span>
							</v-tooltip>
						</v-col>
					</v-row>
				</div>

				<!-- 텍스트 도구 -->
				<div class="tool-section mb-3">
					<div class="tool-section-title mb-2">텍스트</div>
					
					<v-tooltip right>
						<template v-slot:activator="{ on, attrs }">
							<v-btn
								block
								small
								outlined
								:color="selectedTool === 'text' ? 'primary' : ''"
								v-bind="attrs"
								v-on="on"
								@click="handleTextClick"
							>
								<v-icon left>mdi-format-text</v-icon>
								텍스트
							</v-btn>
						</template>
						<span>텍스트 추가</span>
					</v-tooltip>
				</div>

				<!-- 캔버스 설정 -->
				<div class="tool-section mb-3">
					<div class="tool-section-title mb-2">캔버스</div>
					
					<v-tooltip right>
						<template v-slot:activator="{ on, attrs }">
							<v-btn
								block
								small
								outlined
								v-bind="attrs"
								v-on="on"
								@click="handleBackgroundClick"
								class="mb-2"
							>
								<v-icon left>mdi-image-area</v-icon>
								배경 이미지
							</v-btn>
						</template>
						<span>배경 이미지 설정</span>
					</v-tooltip>
					
					<v-text-field
						:value="canvasWidth"
						label="너비"
						type="number"
						dense
						outlined
						hide-details
						class="mb-2"
						@input="updateCanvasWidth"
					></v-text-field>
					
					<v-text-field
						:value="canvasHeight"
						label="높이"
						type="number"
						dense
						outlined
						hide-details
						class="mb-2"
						@input="updateCanvasHeight"
					></v-text-field>
					
					<v-row no-gutters>
						<v-col cols="6" class="pr-1">
							<v-btn
								block
								small
								outlined
								@click="setPresetSize('1024x1024')"
							>
								1 : 1
							</v-btn>
						</v-col>
						<v-col cols="6" class="pl-1">
							<v-btn
								block
								small
								outlined
								@click="setPresetSize('1500x600')"
							>
								5 : 2 (배너)
							</v-btn>
						</v-col>
					</v-row>
				</div>

				<!-- 이미지 도구 -->
				<div class="tool-section">
					<div class="tool-section-title mb-2">이미지</div>
					
					<v-tooltip right>
						<template v-slot:activator="{ on, attrs }">
							<v-btn
								block
								small
								outlined
								:color="selectedTool === 'image' ? 'primary' : ''"
								v-bind="attrs"
								v-on="on"
								@click="handleImageClick"
							>
								<v-icon left>mdi-image-plus</v-icon>
								업로드
							</v-btn>
						</template>
						<span>이미지 업로드</span>
					</v-tooltip>
					
					<v-tooltip right>
						<template v-slot:activator="{ on, attrs }">
							<v-btn
								block
								small
								outlined
								class="mt-2"
								v-bind="attrs"
								v-on="on"
								@click="handleStickerClick"
							>
								<v-icon left>mdi-sticker-emoji</v-icon>
								스티커
							</v-btn>
						</template>
						<span>스티커 추가</span>
					</v-tooltip>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

interface ShapeTool {
	type: string;
	name: string;
	icon: string;
}

@Component({
	components: {},
})
export default class LeftToolbar extends Mixins(GlobalMixins) {
	@Prop({ type: String, default: '' })
	private selectedTool!: string;

	@Prop({ type: Number, default: 800 })
	private canvasWidth!: number;

	@Prop({ type: Number, default: 600 })
	private canvasHeight!: number;

	private shapes: ShapeTool[] = [
		{ type: 'rect', name: '사각형', icon: 'mdi-rectangle-outline' },
		{ type: 'circle', name: '원', icon: 'mdi-circle-outline' },
		{ type: 'triangle', name: '삼각형', icon: 'mdi-triangle-outline' },
		{ type: 'arrow', name: '화살표', icon: 'mdi-arrow-right' },
		{ type: 'star', name: '별', icon: 'mdi-star-outline' },
	];

	handleShapeClick(shapeType: string): void {
		this.$emit('add-shape', shapeType);
	}

	handleTextClick(): void {
		this.$emit('add-text');
	}

	handleImageClick(): void {
		this.$emit('upload-image');
	}

	updateCanvasWidth(value: string): void {
		const width = parseInt(value) || 0;
		this.$emit('canvas-size-changed', {
			width: width,
			height: this.canvasHeight
		});
	}

	updateCanvasHeight(value: string): void {
		const height = parseInt(value) || 0;
		this.$emit('canvas-size-changed', {
			width: this.canvasWidth,
			height: height
		});
	}

	updateCanvasSize(): void {
		this.$emit('canvas-size-changed', {
			width: this.canvasWidth,
			height: this.canvasHeight
		});
	}

	setPresetSize(preset: string): void {
		const [width, height] = preset.split('x').map(Number);
		this.$emit('canvas-size-changed', {
			width,
			height
		});
	}

	handleBackgroundClick(): void {
		this.$emit('set-background-image');
	}

	async handleStickerClick(): Promise<void> {
		try {
			const sticker = await this.$openStickerModal();
			if (sticker) {
				this.$emit('add-sticker', sticker);
			}
		} catch (error) {
			console.error('스티커 선택 실패:', error);
		}
	}
}
</script>

<style lang="scss" scoped>
.left-toolbar {
	width: 200px;
	height: 100%;
	background: #ffffff;
	border-right: 1px solid #e2e8f0;
}

.toolbar-card {
	height: 100%;
	background: #ffffff !important;
}

/* 카드 제목 스타일 */
:deep(.v-card-title) {
	background: #f8fafc !important;
	color: #374151 !important;
	font-weight: 600 !important;
	border-bottom: 1px solid #e5e7eb !important;
}

:deep(.v-card-title .v-icon) {
	color: #6b7280 !important;
}

.tool-section-title {
	font-size: 14px;
	font-weight: 800;
	color: #424a58 !important;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.tool-section {
	border-bottom: 1px solid #e5e7eb;
	padding-bottom: 12px;
	
	&:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
}

/* 버튼 스타일 개선 */
:deep(.v-btn) {
	background: #ffffff !important;
	border: 2px solid #e5e7eb !important;
	border-radius: 8px !important;
	min-height: 40px !important;
	transition: all 0.2s ease !important;
}

:deep(.v-btn:hover) {
	border-color: #d1d5db !important;
	background: #f9fafb !important;
	transform: translateY(-1px) !important;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

:deep(.v-btn.primary) {
	background: #3b82f6 !important;
	border-color: #3b82f6 !important;
	color: white !important;
}

:deep(.v-btn.primary:hover) {
	background: #2563eb !important;
	border-color: #2563eb !important;
}

:deep(.v-btn .v-icon) {
	color: #6b7280 !important;
	font-size: 20px !important;
}

:deep(.v-btn.primary .v-icon) {
	color: white !important;
}

/* 셀렉트 박스 스타일 */
:deep(.v-select .v-input__control) {
	background: white !important;
	border: 2px solid #e5e7eb !important;
	border-radius: 6px !important;
}

:deep(.v-select .v-select__selection) {
	color: #374151 !important;
	font-weight: 500 !important;
}

:deep(.v-select .v-input__append-inner .v-icon) {
	color: #6b7280 !important;
}

/* 구분선 스타일 */
:deep(.v-divider) {
	background: #e5e7eb !important;
	opacity: 1 !important;
}

/* 툴팁 스타일 */
:deep(.v-tooltip__content) {
	background: #1f2937 !important;
	color: white !important;
	font-size: 12px !important;
	font-weight: 500 !important;
	padding: 6px 10px !important;
	border-radius: 6px !important;
}
</style>