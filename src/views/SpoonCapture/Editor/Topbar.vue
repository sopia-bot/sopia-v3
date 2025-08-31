<template>
	<v-app-bar app dense color="primary" dark style="left: 202px !important; border-radius: 0 !important;">
		<v-tooltip bottom>
			<template v-slot:activator="{ on, attrs }">
				<v-btn icon v-bind="attrs" v-on="on" @click="$emit('new-canvas')">
					<v-icon>mdi-file-plus</v-icon>
				</v-btn>
			</template>
			<span>새 캔버스</span>
		</v-tooltip>

		<v-divider vertical class="mx-2"></v-divider>

		<v-tooltip bottom>
			<template v-slot:activator="{ on, attrs }">
				<v-btn icon v-bind="attrs" v-on="on" @click="$emit('export-png')">
					<v-icon>mdi-download</v-icon>
				</v-btn>
			</template>
			<span>PNG로 내보내기</span>
		</v-tooltip>

		<v-divider vertical class="mx-2"></v-divider>

		<v-tooltip bottom>
			<template v-slot:activator="{ on, attrs }">
				<v-btn icon v-bind="attrs" v-on="on" @click="$emit('undo')" :disabled="!canUndo">
					<v-icon>mdi-undo</v-icon>
				</v-btn>
			</template>
			<span>실행 취소 (Ctrl+Z)</span>
		</v-tooltip>

		<v-tooltip bottom>
			<template v-slot:activator="{ on, attrs }">
				<v-btn icon v-bind="attrs" v-on="on" @click="$emit('redo')" :disabled="!canRedo">
					<v-icon>mdi-redo</v-icon>
				</v-btn>
			</template>
			<span>다시 실행 (Ctrl+Y)</span>
		</v-tooltip>

		<v-divider vertical class="mx-2"></v-divider>

		<v-tooltip bottom>
			<template v-slot:activator="{ on, attrs }">
				<v-btn icon v-bind="attrs" v-on="on" @click="$emit('delete-selected')" color="error">
					<v-icon>mdi-delete</v-icon>
				</v-btn>
			</template>
			<span>선택 항목 삭제 (Delete)</span>
		</v-tooltip>

		<v-spacer></v-spacer>

	</v-app-bar>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

@Component({
	components: {},
})
export default class Topbar extends Mixins(GlobalMixins) {
	@Prop({ type: Boolean, default: false })
	private canUndo!: boolean;

	@Prop({ type: Boolean, default: false })
	private canRedo!: boolean;
}
</script>

<style lang="scss" scoped>
:deep(.v-app-bar) {
	background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
	color: #374151 !important;
	border-bottom: 1px solid #e5e7eb !important;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

:deep(.v-btn) {
	background: #ffffff !important;
	border: 1px solid #e5e7eb !important;
	border-radius: 8px !important;
	margin: 0 2px !important;
	transition: all 0.2s ease !important;
}

:deep(.v-btn:hover) {
	background: #f3f4f6 !important;
	border-color: #d1d5db !important;
	transform: translateY(-1px) !important;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

:deep(.v-btn:disabled) {
	background: #f9fafb !important;
	border-color: #f3f4f6 !important;
	opacity: 0.5 !important;
}

:deep(.v-btn .v-icon) {
	color: #6b7280 !important;
	font-size: 20px !important;
}

:deep(.v-btn:hover .v-icon) {
	color: #374151 !important;
}

:deep(.v-btn:disabled .v-icon) {
	color: #d1d5db !important;
}

:deep(.v-btn.error) {
	background: #fee2e2 !important;
	border-color: #fecaca !important;
}

:deep(.v-btn.error:hover) {
	background: #fecaca !important;
	border-color: #f87171 !important;
}

:deep(.v-btn.error .v-icon) {
	color: #dc2626 !important;
}

:deep(.v-toolbar__title) {
	color: #374151 !important;
	font-weight: 600 !important;
	font-size: 18px !important;
}

:deep(.v-divider) {
	background: #e5e7eb !important;
	opacity: 1 !important;
}

:deep(.v-tooltip__content) {
	background: #1f2937 !important;
	color: white !important;
	font-size: 12px !important;
	font-weight: 500 !important;
	padding: 6px 10px !important;
	border-radius: 6px !important;
}
</style>