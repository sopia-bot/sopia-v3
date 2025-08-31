<template>
  <v-container class="pa-0">
    <v-card class="elevation-2 rounded-lg" outlined>
      <v-card-title class="pb-2">
        <v-icon color="indigo" class="mr-2">mdi-account-plus</v-icon>
        <span class="text-h6 font-weight-medium">입장 메시지 설정</span>
      </v-card-title>
      <v-card-text class="pt-2">
        <v-textarea
            color="indigo"
            v-model="liveJoin"
            label="입장 시 표시할 메시지"
            placeholder="사용자가 방에 입장했을 때 표시될 메시지를 입력하세요..."
            counter
            filled
            rows="4"
            auto-grow
            class="rounded-lg"
            hint="예약어: [[name]], [[tag]]"
            persistent-hint
        >
          <template v-slot:prepend-inner>
            <v-icon color="indigo lighten-1">mdi-message-text</v-icon>
          </template>
        </v-textarea>
        
        <v-divider class="my-4"></v-divider>
        
        <div class="text-caption grey--text text--darken-1">
          <v-icon small class="mr-1">mdi-information</v-icon>
          팁: 개인화된 환영 메시지로 시청자들에게 친근한 인상을 남겨보세요.
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
export default class CmdJoin extends Mixins(GlobalMixins) {
	public liveJoin: string = '';

	public cfgPath: string = this.$path('userData', 'cmd.cfg');
	public cfg: CfgLite = new CfgLite(this.cfgPath);

	public async mounted() {
		this.liveJoin = this.cfg.get('live_join') || '';
		this.$evt.$on('cmd:save', () => {
			this.cfg.set('live_join', this.liveJoin);
			this.cfg.save();
		});
	}

	public async beforeUnmount() {
		this.$evt.$off('cmd:save');
	}

}
</script>

<style scoped>

</style>
