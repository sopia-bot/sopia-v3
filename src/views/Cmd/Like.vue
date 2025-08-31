<template>
  <v-container class="pa-0">
    <v-card class="elevation-2 rounded-lg" outlined>
      <v-card-title class="pb-2">
        <v-icon color="pink" class="mr-2">mdi-heart</v-icon>
        <span class="text-h6 font-weight-medium">좋아요 메시지 설정</span>
      </v-card-title>
      <v-card-text class="pt-2">
        <v-textarea
            color="pink"
            v-model="liveLike"
            label="좋아요 시 표시할 메시지"
            placeholder="시청자가 좋아요를 눌렀을 때 표시될 메시지를 입력하세요..."
            counter
            filled
            rows="4"
            auto-grow
            class="rounded-lg"
            hint="예약어: [[name]], [[tag]]"
            persistent-hint
        >
          <template v-slot:prepend-inner>
            <v-icon color="pink lighten-1">mdi-thumb-up</v-icon>
          </template>
        </v-textarea>
        
        <v-divider class="my-4"></v-divider>
        
        <div class="text-caption grey--text text--darken-1">
          <v-icon small class="mr-1">mdi-information</v-icon>
          팁: 좋아요에 대한 감사 메시지로 시청자와의 소통을 늘려보세요.
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import CfgLite from '@/plugins/cfg-lite-ipc';

@Component({
  components: {
  },
})
export default class CmdLike extends Mixins(GlobalMixins) {
	public liveLike: string = '';

	public cfgPath: string = this.$path('userData', 'cmd.cfg');
	public cfg: CfgLite = new CfgLite(this.cfgPath);

	public async mounted() {
		this.liveLike = this.cfg.get('live_like') || '';
		this.$evt.$on('cmd:save', () => {
			this.cfg.set('live_like', this.liveLike);
			this.cfg.save();
		});
	}

	public beforeUnmount() {
		this.$evt.$off('cmd:save');
	}

}
</script>

<style scoped>

</style>
