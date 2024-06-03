<template>
	<v-dialog
		v-model="dialog">
		<!-- S:Picture -->
		<template v-slot:activator="{ on }">			
            <v-hover>
                <template v-slot="{ hover }">
                    <v-img
                        v-on="on"
                        :src="src"
                        contain
                        max-height="300px"
                        width="100%">
                        <v-fade-transition>
                            <div v-if="hover" class="d-flex justify-center align-center" style="cursor: pointer; height: 100%; background-color: rgba(0, 0, 0, 0.5);">
                                <span class="text-h4 white--text">{{ $t('click-picture') }}</span>
                            </div>
                        </v-fade-transition>
                    </v-img>
                </template>
            </v-hover>
		</template>
		<!-- E:Picture -->

		<!-- S:Card Dialog -->
		<v-card>
			<v-img :src="src" width="100%"></v-img>
		</v-card>
		<!-- E:Card Dialog -->
	</v-dialog>
</template>
<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

@Component
export default class Picture extends Mixins(GlobalMixins) {
    @Prop(Number) maxWidth!: number;
    @Prop(String) src!: string;
    @Prop(String) caption!: string;
    @Prop(String) rowClass!: string;
	public dialog = false;

    public mounted() {
    }
}
</script>