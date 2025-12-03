<!--
 * ToolButton.vue
 * Created on Fri Aug 28 2020
 *
 * Copyright (c) Tree Some. Licensed under the MIT License.
-->
<template>
	<v-tooltip bottom open-delay="500">
		<template v-slot:activator="{ on, attrs }">
			<v-btn
				icon
				x-small
				class="toolbar-btn"
				v-bind="attrs"
				v-on="on"
				@click="btn.func"
				>
				<v-icon size="16">{{ btn.icon }}</v-icon>
			</v-btn>
		</template>
		<span>{{ btn.name }}</span>
	</v-tooltip>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

export interface ToolButtonInterface {
	icon: string;
	name: string;
	func: (...args: any) => void;
	isContext?: (node?: any) => void;
}

@Component
export default class ToolButton extends Mixins(GlobalMixins) {
	@Prop(Object) public btn!: ToolButtonInterface;
}
</script>
<style scoped>
.toolbar-btn {
	width: 22px !important;
	height: 22px !important;
	margin: 0 1px;
	border-radius: 4px;
	color: #616161;
	transition: background-color 0.1s, color 0.1s;
}
.toolbar-btn:hover {
	background-color: rgba(97, 97, 97, 0.1);
	color: #424242;
}
.toolbar-btn .v-icon {
	color: inherit;
}
</style>
