<template>
	<div class="bottom-status">
		<v-card class="status-card" elevation="2" flat>
			<v-card-text class="pa-2 d-flex align-center">
				<!-- 확대/축소 컨트롤 -->
				<div class="zoom-controls d-flex align-center">
					<v-btn icon small @click="zoomOut" :disabled="scale <= 0.1">
						<v-icon>mdi-minus</v-icon>
					</v-btn>
					
					<v-slider
						:value="scale"
						min="0.1"
						max="3"
						step="0.1"
						class="zoom-slider mx-2"
						hide-details
						@input="$emit('scale-changed', $event)"
					></v-slider>
					
					<v-btn icon small @click="zoomIn" :disabled="scale >= 3">
						<v-icon>mdi-plus</v-icon>
					</v-btn>
					
					<div class="zoom-percentage ml-2">
						{{ Math.round(scale * 100) }}%
					</div>
					
					<v-btn text small @click="resetZoom" class="ml-2">
						<v-icon left small>mdi-fit-to-page</v-icon>
						100%
					</v-btn>
				</div>

				<v-spacer></v-spacer>

				<!-- 선택된 아이템 정보 -->
				<div class="selection-info d-flex align-center">
					<div v-if="selectedItem" class="selected-item-info">
						<v-chip small color="primary" outlined>
							<v-icon left small>{{ getItemIcon(selectedItem.type) }}</v-icon>
							{{ `${getItemTypeName(selectedItem.type)} ${selectedItem.id.split('_')[1]}` }}
						</v-chip>
						
						<span class="ml-2 text-caption">
							{{ Math.round(selectedItem.x) }}, {{ Math.round(selectedItem.y) }}
						</span>
						
						<span class="ml-2 text-caption" v-if="selectedItem.rotation">
							{{ Math.round(selectedItem.rotation) }}°
						</span>
					</div>
					
					<div v-else class="text-caption text--secondary">
						객체를 선택하세요
					</div>
				</div>
			</v-card-text>
		</v-card>
	</div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import { EditorItem } from './types';

@Component({
	components: {},
})
export default class BottomStatus extends Mixins(GlobalMixins) {
	@Prop({ type: Number, default: 1 })
	private scale!: number;

	@Prop({ type: Object, default: null })
	private selectedItem!: EditorItem | null;

	zoomIn(): void {
		const newScale = Math.min(3, this.scale + 0.1);
		this.$emit('scale-changed', newScale);
	}

	zoomOut(): void {
		const newScale = Math.max(0.1, this.scale - 0.1);
		this.$emit('scale-changed', newScale);
	}

	resetZoom(): void {
		this.$emit('scale-changed', 1);
	}

	getItemIcon(type: string): string {
		const iconMap: { [key: string]: string } = {
			rect: 'mdi-rectangle-outline',
			circle: 'mdi-circle-outline',
			triangle: 'mdi-triangle-outline',
			arrow: 'mdi-arrow-right',
			star: 'mdi-star-outline',
			text: 'mdi-format-text',
			image: 'mdi-image',
		};
		return iconMap[type] || 'mdi-help';
	}

	getItemTypeName(type: string): string {
		const nameMap: { [key: string]: string } = {
			rect: '사각형',
			circle: '원',
			triangle: '삼각형',
			arrow: '화살표',
			star: '별',
			text: '텍스트',
			image: '이미지',
		};
		return nameMap[type] || type;
	}
}
</script>

<style lang="scss" scoped>
.bottom-status {
	height: 60px;
	background: var(--v-background-base);
	border-top: 1px solid var(--v-divider-base);
}

.status-card {
	height: 100%;
	border-radius: 0;
}

.zoom-controls {
	min-width: 300px;
}

.zoom-slider {
	width: 150px;
}

.zoom-percentage {
	font-size: 14px;
	font-weight: 600;
	color: var(--v-text-base);
	min-width: 40px;
	text-align: center;
}

.selection-info {
	min-width: 200px;
	justify-content: flex-end;
}

.selected-item-info {
	display: flex;
	align-items: center;
}
</style>