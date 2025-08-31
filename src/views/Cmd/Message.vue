<template>
  <v-container class="pa-0">
    <v-card class="elevation-2 rounded-lg" outlined>
      <v-card-title class="pb-2">
        <v-icon color="blue" class="mr-2">mdi-message-reply</v-icon>
        <span class="text-h6 font-weight-medium">메시지 명령어 설정</span>
      </v-card-title>
      <v-card-text class="pt-2">
        <v-btn 
          block 
          rounded 
          color="indigo" 
          dark 
          class="mb-4 elevation-2"
          @click="addMessageEvent"
        >
          <v-icon left>mdi-plus</v-icon>
          새 명령어 추가
        </v-btn>
        
        <v-card 
          v-for="(item, index) of liveMessage" 
          :key="index"
          class="mb-3 elevation-0 rounded-lg grey lighten-4"
          outlined
        >
          <v-card-text class="pb-2">
            <v-row align="center" no-gutters>
              <v-col cols="4" class="pr-md-2 mb-2 mb-md-0">
                <v-text-field
                  :placeholder="$t('cmd.command')"
                  color="indigo darken-3"
                  v-model="item.command"
                  label="명령어"
                  filled
                  dense
                  hide-details
                  class="rounded"
                >
                  <template v-slot:prepend-inner>
                    <span class="text-caption grey--text">!</span>
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="3" offset="4" class="pr-2">
                <v-select
                  :items="permitList"
                  color="indigo darken-3"
                  v-model="item.permit"
                  item-text="text"
                  item-value="value"
                  label="권한"
                  filled
                  dense
                  hide-details
                  class="rounded"
                >
                  <template v-slot:selection="{ item }">
                    {{ $t('cmd.permit.' + item.value) }}
                  </template>
                </v-select>
              </v-col>
              <v-col cols="1" class="text-center">
                <v-btn 
                  icon 
                  color="red darken-2" 
                  @click="delMessageEvent(index)"
                  class="elevation-1 ms-auto"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
              <v-col cols="12" class="pr-md-2 mb-2 mt-3">
                <v-textarea
                  :placeholder="$t('cmd.reply')"
                  color="indigo darken-3"
                  rows="2"
                  v-model="item.message"
                  label="응답 메시지"
                  filled
                  dense
                  hide-details
                  auto-grow
                  class="rounded"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        
        <v-divider class="my-4" v-if="liveMessage.length > 0"></v-divider>
        
        <div class="text-caption grey--text text--darken-1" v-if="liveMessage.length > 0">
          <v-icon small class="mr-1">mdi-information</v-icon>
          팁: 명령어는 '!'로 시작하며, 시청자들이 쉽게 기억할 수 있는 단어를 사용하세요.
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import CfgLite from '@/plugins/cfg-lite-ipc';

export interface MessageStruct {
	command: string;
	message: string;
	permit: string;
}

interface PermitItem {
	text: string;
	value: string;
}

@Component({
  components: {
  },
})
export default class CmdMessage extends Mixins(GlobalMixins) {
	public liveMessage: MessageStruct[] = [];

	public cfgPath: string = this.$path('userData', 'cmd.cfg');
	public cfg: CfgLite = new CfgLite(this.cfgPath);

	public readonly permitList: PermitItem[] = [
		{
			text: this.$t('cmd.permit.all'),
			value: 'all',
		},
		{
			text: this.$t('cmd.permit.manager'),
			value: 'manager',
		},
	];

	public mounted() {
		this.liveMessage = this.cfg.get('live_message') || [];
		this.$evt.$on('cmd:save', () => {
			this.cfg.set('live_message', this.liveMessage);
			this.cfg.save();
		});
	}

	public addMessageEvent() {
		this.liveMessage.unshift({
			command: '',
			message: '',
			permit: 'all',
		});
	}

	public delMessageEvent(idx: number) {
		this.liveMessage.splice(idx, 1);
	}

	public beforeUnmount() {
		this.$evt.$off('cmd:save');
	}
}
</script>

<style scoped>

</style>
