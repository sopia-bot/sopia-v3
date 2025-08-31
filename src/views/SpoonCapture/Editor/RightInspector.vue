<template>
	<div class="right-inspector">
		<v-card class="inspector-card" elevation="2" style="border-radius: 0 !important;">
			<v-card-title class="pa-2">
				<v-icon left>mdi-tune</v-icon>
				<span class="text-h6">속성</span>
			</v-card-title>
			
			<v-divider></v-divider>
			
			<v-card-text class="pa-2">
				<div v-if="!selectedItem" class="no-selection">
					<v-icon large color="grey lighten-1">mdi-cursor-default-click</v-icon>
					<div class="text-caption mt-2 text-center">
						객체를 선택하여<br>속성을 편집하세요
					</div>
				</div>

				<!-- 도형 속성 -->
				<div v-else-if="isShape" class="shape-properties">
					<div class="property-section mb-4">
						<div class="property-title text-subtitle-1 mb-2">기본 속성</div>
						
						<div class="alpha-control-group">
							<label class="text-subtitle-2">투명도</label>
							<v-slider
								:value="selectedItem.opacity"
								min="0"
								max="1"
								step="0.1"
								thumb-label
								hide-details
								@input="updateProperty('opacity', $event)"
							></v-slider>
						</div>
					</div>

					<!-- 레이어 순서 조정 -->
					<!-- <div class="property-section mb-4">
						<div class="property-title mb-2">레이어 순서</div>
						
						<div class="layer-controls">
							<v-btn
								small
								outlined
								class="mb-1 mr-1"
								@click="moveToBack"
								:disabled="!selectedItem"
							>
								<v-icon small left>mdi-arrange-send-to-back</v-icon>
								맨 뒤로
							</v-btn>
							
							<v-btn
								small
								outlined
								class="mb-1 mr-1"
								@click="moveBackward"
								:disabled="!selectedItem"
							>
								<v-icon small left>mdi-arrange-send-backward</v-icon>
								뒤로
							</v-btn>
							
							<v-btn
								small
								outlined
								class="mb-1 mr-1"
								@click="moveForward"
								:disabled="!selectedItem"
							>
								<v-icon small left>mdi-arrange-bring-forward</v-icon>
								앞으로
							</v-btn>
							
							<v-btn
								small
								outlined
								class="mb-1"
								@click="moveToFront"
								:disabled="!selectedItem"
							>
								<v-icon small left>mdi-arrange-bring-to-front</v-icon>
								맨 앞으로
							</v-btn>
						</div>
					</div> -->

					<div class="property-section mb-4">
						<div class="property-title text-subtitle-1 mb-2">색상</div>
						
						<div class="color-input-group mb-2">
							<div class="color-rgba-container">
								<div class="d-flex align-center">
									<label class="color-label">배경색</label>
									<input
										type="color"
										:value="getHexFromRgba(itemFill)"
										@input="handleRgbaColorInput('fill', $event)"
										class="color-picker ms-2"
									>
								</div>
								<div class="alpha-control-group">
									<div class="d-flex align-center">
										<label>불투명도</label>
										<v-text-field
											v-model="fillAlphaPercent"
											type="number"
											min="0"
											max="100"
											suffix="%"
											dense
											outlined
											hide-details
											@input="updateFillAlphaPercentSafe"
											class="alpha-input ms-2"
										></v-text-field>
									</div>
									<v-slider
										v-model="fillAlphaPercent"
										min="0"
										max="100"
										step="1"
										thumb-label
										hide-details
										@input="updateFillAlphaPercent"
										class="alpha-slider"
									></v-slider>
								</div>
							</div>
						</div>
					</div>

					<div class="property-section mb-4">
						<div class="property-title text-subtitle-1 mb-2">테두리</div>
						
						<div class="color-input-group mb-2">
							<div class="color-rgba-container">
								<div class="d-flex align-center">
									<label class="color-label font-weight-bold">테두리 색상</label>
									<input
										type="color"
										:value="getHexFromRgba(selectedItem.stroke || '#000000')"
										@input="handleRgbaColorInput('stroke', $event)"
										class="color-picker ms-2"
									>
								</div>
								<div class="alpha-control-group">
									<div class="d-flex align-center">
										<label>불투명도</label>
										<v-text-field
											v-model="strokeAlphaPercent"
											type="number"
											min="0"
											max="100"
											suffix="%"
											dense
											outlined
											hide-details
											@input="updateStrokeAlphaPercent"
											class="alpha-input ms-2"
										></v-text-field>
									</div>
									<v-slider
										v-model="strokeAlphaPercent"
										min="0"
										max="100"
										step="1"
										thumb-label
										hide-details
										@input="updateStrokeAlphaPercent"
										class="alpha-slider"
									></v-slider>
								</div>
							</div>
						</div>

						<div class="mt-4">
							<label class="text-subtitle-2 font-weight-bold">테두리 두께</label>
							<v-slider
								:value="selectedItem.strokeWidth || 0"
								min="0"
								max="20"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('strokeWidth', $event)"
							></v-slider>
						</div>
						
						<div class="mt-4">
							<label class="text-subtitle-2 font-weight-bold">선 스타일</label>
							<v-select
								:value="dashStyle"
								:items="dashOptions"
								dense
								outlined
								hide-details
								@input="updateDashStyle($event)"
							></v-select>
						</div>
					</div>

					<div class="property-section">
						<div class="property-title text-subtitle-1 mb-2">그림자</div>
						
						<div class="color-input-group d-flex align-center mb-2">
							<label class="color-label text-caption">그림자 색상</label>
							<input
								type="color"
								:value="selectedItem.shadowColor || '#000000'"
								@input="handleColorInput('shadowColor', $event)"
								class="color-picker ms-2"
							>
						</div>

						<div class="alpha-control-group">
							<label>불투명도</label>
							<v-slider
								:value="selectedItem.shadowOpacity || 1"
								min="0"
								max="1"
								step="0.1"
								thumb-label
								hide-details
								@input="updateProperty('shadowOpacity', $event)"
							></v-slider>

							<div class="d-flex align-center mt-2">
								<label>그림자 흐림</label>
							</div>
							<v-slider
								:value="selectedItem.shadowBlur || 0"
								min="0"
								max="50"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('shadowBlur', $event)"
							></v-slider>

							<div class="d-flex align-center mt-2">
								<label>그림자 X 오프셋</label>
							</div>
							<v-slider
								:value="selectedItem.shadowOffsetX || 0"
								min="-50"
								max="50"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('shadowOffsetX', $event)"
							></v-slider>
							
							<div class="d-flex align-center mt-2">
								<label>그림자 Y 오프셋</label>
							</div>
							<v-slider
								:value="selectedItem.shadowOffsetY || 0"
								min="-50"
								max="50"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('shadowOffsetY', $event)"
							></v-slider>
						</div>
					</div>
				</div>

				<!-- 텍스트 속성 -->
				<div v-else-if="isText" class="text-properties">
					<div class="property-section mb-4">
						<div class="property-title text-subtitle-1 mb-2">기본 속성</div>
						
						<div class="mb-3">
							<label class="text-subtitle-2">텍스트</label>
							<v-textarea
								:value="itemText"
								dense
								outlined
								rows="3"
								hide-details
								@input="updateTextProperty('text', $event)"
								@keydown.space.stop
							></v-textarea>
						</div>
						
						<div class="alpha-control-group">
							<label class="text-subtitle-2">투명도</label>
							<v-slider
								:value="selectedItem.opacity"
								min="0"
								max="1"
								step="0.1"
								thumb-label
								hide-details
								@input="updateProperty('opacity', $event)"
							></v-slider>
						</div>
					</div>

					<div class="property-section mb-4">
						<div class="property-title text-subtitle-1 mb-2">폰트</div>
						
						<div class="color-input-group d-flex align-center mb-2">
							<label class="color-label">텍스트 색상</label>
							<input
								type="color"
								:value="itemFill"
								@input="handleColorInput('fill', $event)"
								class="color-picker ms-2"
							>
						</div>
						
						<div class="mt-3">
							<label class="text-subtitle-2 font-weight-bold">폰트 패밀리</label>
							<v-select
								:value="itemFontFamily"
								:items="fontFamilies"
								dense
								outlined
								hide-details
								@input="updateProperty('fontFamily', $event)"
							>
								<template v-slot:item="{ item }">
									<div :style="{ fontFamily: item.family }" class="font-preview-item">
										{{ item.text }}
									</div>
								</template>
								<template v-slot:selection="{ item }">
									<div :style="{ fontFamily: item.family }">
										{{ item.text }}
									</div>
								</template>
							</v-select>
						</div>
						
						<div class="mt-3">
							<label class="text-subtitle-2 font-weight-bold">폰트 스타일</label>
							<v-select
								:value="itemFontStyle"
								:items="fontStyles"
								dense
								outlined
								hide-details
								@input="updateProperty('fontStyle', $event)"
							></v-select>
						</div>
						
						<div class="mt-3">
							<label class="text-subtitle-2 font-weight-bold">폰트 크기</label>
							<v-slider
								:value="itemFontSize"
								min="8"
								max="72"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('fontSize', $event)"
							></v-slider>
						</div>
					</div>

					<div class="property-section mb-4">
						<div class="property-title text-subtitle-1 mb-2">테두리</div>
						
						<div class="color-input-group mb-2">
							<div class="color-rgba-container">
								<div class="d-flex align-center">
									<label class="color-label font-weight-bold">테두리 색상</label>
									<input
										type="color"
										:value="getHexFromRgba(selectedItem.stroke || '#000000')"
										@input="handleRgbaColorInput('stroke', $event)"
										class="color-picker ms-2"
									>
								</div>
								<div class="alpha-control-group">
									<div class="d-flex align-center">
										<label>불투명도</label>
										<v-text-field
											v-model="strokeAlphaPercent"
											type="number"
											min="0"
											max="100"
											suffix="%"
											dense
											outlined
											hide-details
											@input="updateStrokeAlphaPercentSafe"
											class="alpha-input ms-2"
										></v-text-field>
									</div>
									<v-slider
										v-model="strokeAlphaPercent"
										min="0"
										max="100"
										step="1"
										thumb-label
										hide-details
										@input="updateStrokeAlphaPercent"
										class="alpha-slider"
									></v-slider>
								</div>
							</div>
						</div>
						
						<div class="mt-4">
							<label class="text-subtitle-2 font-weight-bold">테두리 두께</label>
							<v-slider
								:value="selectedItem.strokeWidth"
								min="0"
								max="10"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('strokeWidth', $event)"
							></v-slider>
						</div>
					</div>

					<div class="property-section">
						<div class="property-title text-subtitle-1 mb-2">그림자</div>
						
						<div class="color-input-group d-flex align-center mb-2">
							<label class="color-label">그림자 색상</label>
							<input
								type="color"
								:value="selectedItem.shadowColor || '#000000'"
								@input="handleColorInput('shadowColor', $event)"
								class="color-picker ms-2"
							>
						</div>
						
						<div class="mt-3">
							<label>그림자 투명도</label>
							<v-slider
								:value="selectedItem.shadowOpacity || 1"
								min="0"
								max="1"
								step="0.1"
								thumb-label
								hide-details
								@input="updateProperty('shadowOpacity', $event)"
							></v-slider>
						</div>
						
						<div class="mt-3">
							<label>그림자 흐림</label>
							<v-slider
								:value="selectedItem.shadowBlur || 0"
								min="0"
								max="50"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('shadowBlur', $event)"
							></v-slider>
						</div>
						
						<div class="mt-3">
							<label>그림자 X 오프셋</label>
							<v-slider
								:value="selectedItem.shadowOffsetX || 0"
								min="-50"
								max="50"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('shadowOffsetX', $event)"
							></v-slider>
						</div>
						
						<div class="mt-3">
							<label>그림자 Y 오프셋</label>
							<v-slider
								:value="selectedItem.shadowOffsetY || 0"
								min="-50"
								max="50"
								step="1"
								thumb-label
								hide-details
								@input="updateProperty('shadowOffsetY', $event)"
							></v-slider>
						</div>
					</div>
				</div>

				<!-- 이미지 속성 -->
				<div v-else-if="isImage" class="image-properties">
					<div class="property-section mb-4">
						<div class="property-title text-subtitle-1 mb-2">기본 속성</div>
						
						<div class="alpha-control-group">
							<label class="text-subtitle-2">투명도</label>
							<v-slider
								:value="selectedItem.opacity"
								min="0"
								max="1"
								step="0.1"
								thumb-label
								hide-details
								@input="updateProperty('opacity', $event)"
							></v-slider>
						</div>
					</div>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { EditorItem, ShapeItem, TextItem, ImageItem } from './types';

@Component({
	components: {},
})
export default class RightInspector extends Mixins(GlobalMixins) {
	@Prop({ required: true }) selectedItem!: EditorItem;

	// RGBA 색상 관리를 위한 데이터
	fillAlpha = 1;
	strokeAlpha = 1;
	fillAlphaPercent = 100;
	strokeAlphaPercent = 100;

	@Watch('selectedItem', { immediate: true })
	onSelectedItemChanged(newItem: EditorItem | null): void {
		if (newItem) {
			// fill 색상에서 alpha 값 추출
			const fillColor = (newItem as any).fill;
			if (fillColor && fillColor.startsWith('rgba')) {
				const alphaMatch = fillColor.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
				if (alphaMatch) {
					this.fillAlpha = parseFloat(alphaMatch[1]);
					this.fillAlphaPercent = Math.round(this.fillAlpha * 100);
				}
			} else {
				this.fillAlpha = 1;
				this.fillAlphaPercent = 100;
			}

			// stroke 색상에서 alpha 값 추출
			const strokeColor = (newItem as any).stroke;
			if (strokeColor && strokeColor.startsWith('rgba')) {
				const alphaMatch = strokeColor.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/);
				if (alphaMatch) {
					this.strokeAlpha = parseFloat(alphaMatch[1]);
					this.strokeAlphaPercent = Math.round(this.strokeAlpha * 100);
				}
			} else {
				this.strokeAlpha = 1;
				this.strokeAlphaPercent = 100;
			}
		}
	}

	private dashOptions = [
		{ text: '실선', value: 'solid' },
		{ text: '점선', value: 'dashed' },
		{ text: '긴 점선', value: 'long-dashed' },
	];

	private fontFamilies = [
		// 기본 시스템 폰트
		{ text: 'Arial', value: 'Arial', family: 'Arial' },
		{ text: 'Helvetica', value: 'Helvetica', family: 'Helvetica' },
		{ text: 'Times New Roman', value: 'Times New Roman', family: 'Times New Roman' },
		{ text: 'Courier New', value: 'Courier New', family: 'Courier New' },
		{ text: 'Verdana', value: 'Verdana', family: 'Verdana' },
		{ text: 'Georgia', value: 'Georgia', family: 'Georgia' },
		{ text: 'Comic Sans MS', value: 'Comic Sans MS', family: 'Comic Sans MS' },
		{ text: 'Impact', value: 'Impact', family: 'Impact' },
		{ text: 'Trebuchet MS', value: 'Trebuchet MS', family: 'Trebuchet MS' },
		{ text: 'Arial Black', value: 'Arial Black', family: 'Arial Black' },
		
		// 한글 무료 폰트 (Google Fonts 및 웹 폰트)
		{ text: '노토 산스', value: 'Noto Sans KR', family: 'Noto Sans KR' },
		{ text: '노토 세리프', value: 'Noto Serif KR', family: 'Noto Serif KR' },
		{ text: '나눔고딕', value: 'Nanum Gothic', family: 'Nanum Gothic' },
		{ text: '나눔명조', value: 'Nanum Myeongjo', family: 'Nanum Myeongjo' },
		{ text: '나눔펜체', value: 'Nanum Pen Script', family: 'Nanum Pen Script' },
		{ text: '나눔붓체', value: 'Nanum Brush Script', family: 'Nanum Brush Script' },
		{ text: '나눔스퀘어', value: 'Nanum Square', family: 'Nanum Square' },
		{ text: '도현체', value: 'Do Hyeon', family: 'Do Hyeon' },
		{ text: '주아체', value: 'Jua', family: 'Jua' },
		{ text: '해바라기', value: 'Sunflower', family: 'Sunflower' },
		{ text: '귀여운폰트', value: 'Cute Font', family: 'Cute Font' },
		{ text: '스타일리시', value: 'Stylish', family: 'Stylish' },
		{ text: '개구체', value: 'Gaegu', family: 'Gaegu' },
		{ text: '감자꽃', value: 'Gamja Flower', family: 'Gamja Flower' },
		
		// 영어 무료 폰트 (Google Fonts)
		{ text: 'Roboto', value: 'Roboto', family: 'Roboto' },
		{ text: 'Open Sans', value: 'Open Sans', family: 'Open Sans' },
		{ text: 'Lato', value: 'Lato', family: 'Lato' },
		{ text: 'Montserrat', value: 'Montserrat', family: 'Montserrat' },
		{ text: 'Source Sans Pro', value: 'Source Sans Pro', family: 'Source Sans Pro' },
		{ text: 'Raleway', value: 'Raleway', family: 'Raleway' },
		{ text: 'Ubuntu', value: 'Ubuntu', family: 'Ubuntu' },
		{ text: 'Nunito', value: 'Nunito', family: 'Nunito' },
		{ text: 'Poppins', value: 'Poppins', family: 'Poppins' },
		{ text: 'Playfair Display', value: 'Playfair Display', family: 'Playfair Display' },
		{ text: 'Merriweather', value: 'Merriweather', family: 'Merriweather' },
		{ text: 'Oswald', value: 'Oswald', family: 'Oswald' },
		{ text: 'Lora', value: 'Lora', family: 'Lora' },
		{ text: 'PT Sans', value: 'PT Sans', family: 'PT Sans' }
	];

	private fontStyles = [
		{ text: '보통', value: 'normal' },
		{ text: '굵게', value: 'bold' },
	];

	get isShape(): boolean {
		return this.selectedItem?.type === 'rect' ||
			this.selectedItem?.type === 'circle' ||
			this.selectedItem?.type === 'triangle' ||
			this.selectedItem?.type === 'arrow' ||
			this.selectedItem?.type === 'star';
	}

	get isText(): boolean {
		return this.selectedItem?.type === 'text';
	}

	get isImage(): boolean {
		return this.selectedItem?.type === 'image';
	}

	// 타입 안전한 속성 접근을 위한 computed 속성들
	get itemFill(): string {
		const item = this.selectedItem as any;
		return item?.fill || '#000000';
	}

	get itemText(): string {
		const item = this.selectedItem as any;
		return item?.text || '';
	}

	get itemFontFamily(): string {
		const item = this.selectedItem as any;
		return item?.fontFamily || 'Arial';
	}

	get itemFontStyle(): string {
		const item = this.selectedItem as any;
		return item?.fontStyle || 'normal';
	}

	get itemFontSize(): number {
		const item = this.selectedItem as any;
		return item?.fontSize || 24;
	}

	get dashStyle(): string {
		if (!this.selectedItem?.dash || this.selectedItem.dash.length === 0) {
			return 'solid';
		}
		
		const dash = this.selectedItem.dash;
		if (dash[0] === 5 && dash[1] === 5) {
			return 'dashed';
		} else if (dash[0] === 10 && dash[1] === 5) {
			return 'long-dashed';
		}
		
		return 'solid';
	}

	// 텍스트 속성 안전 업데이트 (빈 값 방지)
	updateTextProperty(key: string, value: any): void {
		if (!this.selectedItem) return;

		// 텍스트는 빈 문자열도 허용
		if (key === 'text' && value !== null && value !== undefined) {
			this.updateProperty(key, value);
		}
	}

	// Alpha 퍼센트 안전 업데이트 (잘못된 값 방지)
	updateStrokeAlphaPercentSafe(value: any): void {
		const numValue = parseInt(value);
		if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
			this.strokeAlphaPercent = numValue;
			this.updateStrokeAlphaPercent(numValue);
		}
	}

	// Fill Alpha 퍼센트 안전 업데이트
	updateFillAlphaPercentSafe(value: any): void {
		const numValue = parseInt(value);
		if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
			this.fillAlphaPercent = numValue;
			this.updateFillAlphaPercent(numValue);
		}
	}

	updateProperty(key: string, value: any): void {
		// 타입별로 허용되는 속성 검사
		if (!this.selectedItem) return;

		// 빈 값이나 null/undefined 체크 (텍스트 제외)
		if (key !== 'text' && (value === null || value === undefined || value === '')) {
			return; // emit 하지 않음
		}

		// 부모 컴포넌트에서 기대하는 이벤트 이름으로 변경
		this.$emit('item-updated', this.selectedItem.id, { [key]: value });
	}

	handleColorInput(property: string, event: Event): void {
		const target = event.target as HTMLInputElement;
		if (target && target.value) {
			this.updateProperty(property, target.value);
		}
	}

	// RGBA 색상 처리 메서드들
	getHexFromRgba(rgba: string): string {
		if (!rgba) return '#000000';
		if (rgba.startsWith('#')) return rgba;
		
		// rgba(r, g, b, a) 형식에서 hex 추출
		const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
		if (match) {
			const r = parseInt(match[1]).toString(16).padStart(2, '0');
			const g = parseInt(match[2]).toString(16).padStart(2, '0');
			const b = parseInt(match[3]).toString(16).padStart(2, '0');
			return `#${r}${g}${b}`;
		}
		return rgba;
	}

	handleRgbaColorInput(property: string, event: Event): void {
		const target = event.target as HTMLInputElement;
		if (target && target.value) {
			const hex = target.value;
			const alpha = property === 'fill' ? this.fillAlpha : this.strokeAlpha;
			const rgba = this.hexToRgba(hex, alpha);
			this.updateProperty(property, rgba);
		}
	}

	hexToRgba(hex: string, alpha: number): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	updateFillAlpha(alpha: number): void {
		if (!this.selectedItem) return;
		
		const currentColor = (this.selectedItem as any).fill || '#000000';
		const hex = this.getHexFromRgba(currentColor);
		const rgba = this.hexToRgba(hex, alpha);
		this.updateProperty('fill', rgba);
	}

	updateStrokeAlpha(alpha: number): void {
		if (!this.selectedItem) return;
		
		const currentColor = (this.selectedItem as any).stroke || '#000000';
		const hex = this.getHexFromRgba(currentColor);
		const rgba = this.hexToRgba(hex, alpha);
		this.updateProperty('stroke', rgba);
	}

	updateFillAlphaPercent(percent: number): void {
		this.fillAlphaPercent = percent;
		this.fillAlpha = percent / 100;
		this.updateFillAlpha(this.fillAlpha);
	}

	updateStrokeAlphaPercent(percent: number): void {
		this.strokeAlphaPercent = percent;
		this.strokeAlpha = percent / 100;
		this.updateStrokeAlpha(this.strokeAlpha);
	}

	// 레이어 순서 조정 메서드들
	moveToBack(): void {
		if (!this.selectedItem) return;
		this.$emit('layer-order-changed', this.selectedItem.id, 'to-back');
	}

	moveBackward(): void {
		if (!this.selectedItem) return;
		this.$emit('layer-order-changed', this.selectedItem.id, 'backward');
	}

	moveForward(): void {
		if (!this.selectedItem) return;
		this.$emit('layer-order-changed', this.selectedItem.id, 'forward');
	}

	moveToFront(): void {
		if (!this.selectedItem) return;
		this.$emit('layer-order-changed', this.selectedItem.id, 'to-front');
	}

	getAllowedProperties(itemType: string): string[] {
		const commonProps = ['name', 'x', 'y', 'width', 'height', 'rotation', 'opacity', 'visible'];
		
		switch (itemType) {
			case 'shape':
				return [...commonProps, 'fill', 'stroke', 'strokeWidth', 'dash', 'shadow'];
			case 'text':
				return [...commonProps, 'text', 'fill', 'fontFamily', 'fontSize', 'fontStyle', 'stroke', 'strokeWidth'];
			case 'image':
				return [...commonProps, 'src'];
			default:
				return commonProps;
		}
	}

	updateDashStyle(style: string): void {
		if (!this.selectedItem) return;
		
		const dashMap: { [key: string]: number[] } = {
			solid: [],
			dashed: [5, 5],
			'long-dashed': [10, 5]
		};
		this.$emit('item-updated', this.selectedItem.id, { dash: dashMap[style] });
	}

	updateShadow(key: string, value: any): void {
		if (!this.selectedItem) return;
		
		const currentShadow = (this.selectedItem as any).shadow || {};
		const shadow = { ...currentShadow };
		shadow[key] = value;
		this.$emit('item-updated', this.selectedItem.id, { shadow });
	}
}
</script>

<style lang="scss" scoped>
.right-inspector {
	width: 300px;
	height: calc(100% - 38px);
	background: var(--v-background-base);
	border-left: 1px solid var(--v-divider-base);
	padding-top: 47px !important;
	border-radius: 0 !important;
}

.inspector-card {
	height: 100%;
	padding-top: 10px;
	overflow-y: auto;
	overflow-x: hidden;
}

.no-selection {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 200px;
	color: var(--v-text-base);
}

.property-title {
	font-size: 14px;
	font-weight: 600;
	color: #374151 !important;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.property-section {
	border-bottom: 1px solid #e5e7eb;
	padding-bottom: 16px;
	
	&:last-child {
		border-bottom: none;
		padding-bottom: 0;
	}
}

.color-input-group {
	display: flex;
	min-width: 80px;
	font-weight: 500;
	color: #374151 !important;
}

.v-text-field >>> .v-input__control {
	border-radius: 12px;
	background: white;
}

.v-text-field >>> .v-text-field__details {
	display: none;
}

.v-text-field >>> input {
	background: white;
	border-radius: 12px;
	border: 2px solid #e2e8f0;
	padding: 14px 16px;
	font-size: 14px;
	font-weight: 500;
	color: #475569;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-text-field >>> input:focus {
	border-color: #3b82f6;
	box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
	outline: none;
	transform: translateY(-1px);
}

.v-text-field >>> input:hover {
	border-color: #cbd5e1;
}

.color-rgba-container {
	width: 100%;
}

/* 컬러 피커 스타일 */
.color-picker {
	width: 40px;
	height: 32px;
	border: 2px solid #e2e8f0;
	border-radius: 6px;
	cursor: pointer;
	background: transparent;
	transition: all 0.2s ease;
}

.color-picker:hover {
	border-color: #cbd5e1;
	transform: scale(1.05);
}

.color-picker:active {
	transform: scale(0.98);
}

/* 투명도 슬라이더 */
.alpha-slider {
	margin-top: 12px;
}

.alpha-control-group {
	width: 100%;
	gap: 12px;
	background: #f8fafc;
	padding: 12px;
	border-radius: 8px;
	border: 1px solid #e2e8f0;
	margin-top: 8px;
}

.alpha-control-group .alpha-slider {
	flex: 1;
	margin-top: 0;
}

.alpha-control-group .alpha-input {
	max-width: 100px;
	margin-bottom: 0 !important;
	flex-shrink: 0;
	font-size: 13px;
	font-weight: 500;
	text-align: center;
	color: #374151;
	transition: border-color 0.2s ease;
}

:deep(.alpha-input.v-text-field .v-input__control .v-input__slot) {
	min-height: 30px !important;
}

:deep(.alpha-input.v-text-field .v-input__control .v-input__slot input) {
	max-height: 26px !important;
}

.alpha-control-group .alpha-input:focus {
	border-color: #3b82f6;
	outline: none;
	box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.alpha-control-group .alpha-input:hover {
	border-color: #9ca3af;
}

/* 슬라이더 스타일 개선 */
.v-slider >>> .v-slider__track-background {
	background: #e5e7eb;
	height: 4px;
	border-radius: 2px;
}

.v-slider >>> .v-slider__track-fill {
	background: #3b82f6;
	height: 4px;
	border-radius: 2px;
}

.v-slider >>> .v-slider__thumb {
	background: white;
	border: 2px solid #3b82f6;
	width: 16px;
	height: 16px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	transition: all 0.2s ease;
}

.v-slider >>> .v-slider__thumb:hover {
	transform: scale(1.1) translateY(-7px);
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* 폰트 미리보기 아이템 */
.font-preview-item {
	padding: 8px 12px;
	font-size: 14px;
	border-radius: 6px;
	transition: all 0.2s ease;
	border: 1px solid transparent;
	background: white;
	margin: 1px 0;
}

.font-preview-item:hover {
	background: #f3f4f6;
	border-color: #d1d5db;
}

/* 버튼 스타일 개선 */
.v-btn {
	border-radius: 12px;
	text-transform: none;
	font-weight: 600;
	letter-spacing: 0.5px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	position: relative;
	overflow: hidden;
}

.v-btn::before {
	content: '';
	position: absolute;
	top: 0;
	left: -100%;
	width: 100%;
	height: 100%;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
	transition: left 0.5s ease;
}

.v-btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.v-btn:hover::before {
	left: 100%;
}

.v-btn.primary {
	background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

/* 카드 내부 패딩 조정 */
.v-card__text {
	padding: 24px;
}

/* 구분선 스타일 */
.v-divider {
	margin: 24px 0;
	opacity: 0.2;
	background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
}

/* 스크롤바 커스터마이징 */
::-webkit-scrollbar {
	width: 8px;
}

::-webkit-scrollbar-track {
	background: #f1f5f9;
	border-radius: 4px;
}

::-webkit-scrollbar-thumb {
	background: linear-gradient(180deg, #cbd5e1, #94a3b8);
	border-radius: 4px;
	border: 1px solid #e2e8f0;
}

::-webkit-scrollbar-thumb:hover {
	background: linear-gradient(180deg, #94a3b8, #64748b);
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

.v-card {
	animation: slideInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>