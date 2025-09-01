<template>
	<div style="height: 64px" class="sopia-sidemenu-item" :class="active ? 'active' : ''" @click="handleClick">
		<v-row class="ma-2" style="height: 100%; position: relative;" align="center">
			<v-col cols="12" class="pa-0" align="center">
				<v-icon>{{ active ? activeIcon : icon }}</v-icon>
				<p v-show="!active" class="ma-0 text-caption text--secondary font-weight-bold" style="font-size: 0.6rem !important;">{{ label }}</p>
				<v-chip v-if="isNew && !active" class="ma-0" color="green" text-color="white" x-small style="margin-top: -20px !important; font-size: 0.55rem !important;">NEW!</v-chip>
			</v-col>
			<div v-show="active" class="selected-sidebar"></div>
		</v-row>
	</div>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

@Component
export default class SideMenuItem extends Mixins(GlobalMixins) {
	@Prop(Boolean) public active!: boolean;
	@Prop(String) public label!: string;
	@Prop(String) public icon!: string;
	@Prop(String) public activeIcon!: string;
	@Prop(String) public href!: string;
	@Prop(Boolean) public openNew!: boolean;
	@Prop(Boolean) public isNew!: boolean;
	@Prop(Boolean) public noRouter!: boolean;

	public handleClick() {
		if (this.noRouter) {
			console.log('click', this.noRouter);
			this.$emit('click');
			return;
		}
		this.$assign(this.href, this.openNew);
	}
}
</script>
<style scoped>
.sopia-sidemenu-item {
	display: block;
	cursor: pointer;
}
.sopia-sidemenu-item .selected-sidebar {
	position: absolute;
	left: 0;
	background-color: black;
	height: 30px;
	width: 5px;
	border-radius: 5px;
}
.sopia-sidemenu-item .row {
	border-radius: 5px;
}
.sopia-sidemenu-item.active .row {
	background-color: white;
}
.sopia-sidemenu-item .row:hover {
	background-color: #eaeaea;
}
.sopia-sidemenu-item .col,
.sopia-sidemenu-item .col i {
	color: #afafaf;
}
.sopia-sidemenu-item.active .col,
.sopia-sidemenu-item.active .col i,
.sopia-sidemenu-item:hover .col,
.sopia-sidemenu-item:hover .col i {
	color: #000;
}
</style>
