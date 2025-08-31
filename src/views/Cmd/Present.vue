<template>
  <v-container class="pa-0">
    <!-- S: Present List Dialog -->
    <v-dialog
        v-model="present"
        max-width="700"
        width="90%"
        scrollable>
      <v-card class="rounded-lg">
        <v-card-title class="indigo white--text">
          <v-icon color="white" class="mr-2">mdi-gift</v-icon>
          {{ $t('cmd.sticker.list') }}
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row>
            <v-col
                cols="6" md="4"
                v-for="(sticker, idx) in validStickers"
                :key="sticker.name"
                @click="addPresentEvent(idx); present = false;">
              <v-hover>
                <template v-slot:default="{ hover }">
                  <v-card
                      class="rounded-lg transition-swing"
                      style="cursor: pointer;"
                      :elevation="hover ? 8 : 2"
                      :class="{ 'scale-105': hover }">
                    <v-img
                        :src="sticker.image_thumbnail"
                        class="white--text align-center rounded-lg"
                        :gradient="hover ? 'to bottom, rgba(0,0,0,.7), rgba(0,0,0,.7)' : ''"
                        width="100%"
                        aspect-ratio="1">
                      <v-row v-if="hover" align="center" class="fill-height">
                        <v-col cols="12" class="text-center">
                          <h4 class="font-weight-medium">{{ sticker.title }}</h4>
                          <v-chip color="amber" dark small class="mt-2">
                            <v-img width="16px" :src="imgs.coin" class="mr-1"/>
                            {{ sticker.price }}
                          </v-chip>
                        </v-col>
                      </v-row>
                    </v-img>
                  </v-card>
                </template>
              </v-hover>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="present = false">닫기</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- E: Present List Dialog -->
    
    <v-card class="elevation-2 rounded-lg" outlined>
      <v-card-title class="pb-2">
        <v-icon color="purple" class="mr-2">mdi-gift</v-icon>
        <span class="text-h6 font-weight-medium">선물 메시지 설정</span>
      </v-card-title>
      <v-card-text class="pt-2">
        <v-btn 
          block 
          rounded 
          color="indigo" 
          dark 
          class="mb-4 elevation-2"
          @click="addPresentNew"
        >
          <v-icon left>mdi-plus</v-icon>
          새 선물 추가
        </v-btn>
        
        <v-card 
          v-for="(presentItem, idx) in livePresent" 
          :key="'present_' + presentItem.sticker"
          class="mb-3 elevation-1 rounded-lg"
          outlined
        >
          <v-card-text class="pb-2">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="4" class="pr-md-3 mb-2 mb-md-0">
                <v-card 
                  class="d-flex align-center pa-2 rounded" 
                  color="grey lighten-4"
                  flat
                >
                  <v-avatar size="40" class="mr-2" v-if="presentItem.src">
                    <v-img :src="presentItem.src" :alt="presentItem.title"/>
                  </v-avatar>
                  <v-icon v-else size="40" color="grey" class="mr-2">mdi-gift</v-icon>
                  <div>
                    <div class="font-weight-medium text-truncate">
                      {{ substr(presentItem.title) }}
                    </div>
                    <div class="text-caption grey--text">
                      {{ presentItem.sticker }}
                    </div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="10" md="7" class="pr-2">
                <v-textarea
                  v-model="presentItem.message"
                  label="선물 받았을 때 메시지"
                  placeholder="선물을 받았을 때 표시될 메시지를 입력하세요..."
                  rows="2"
                  color="purple darken-2"
                  filled
                  dense
                  auto-grow
                  hide-details
                  class="rounded"
                />
              </v-col>
              <v-col cols="2" md="1" class="text-center">
                <v-btn 
                  icon 
                  color="red darken-2" 
                  @click="delPresentEvent(idx)"
                  class="elevation-1"
                  :disabled="idx === 0"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
        
        <v-divider class="my-4" v-if="livePresent.length > 0"></v-divider>
        
        <div class="text-caption grey--text text--darken-1" v-if="livePresent.length > 0">
          <v-icon small class="mr-1">mdi-information</v-icon>
          팁: 기본 선물은 삭제할 수 없으며, 선물별로 다른 감사 메시지를 설정할 수 있습니다.
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import CfgLite from '@/plugins/cfg-lite-ipc';
import {Sticker, StickerCategory} from '@sopia-bot/core';
import giftCoin from '@/assets/gift_coin.png';

export interface PresentStruct {
	sticker: string;
	src: string;
	title: string;
	message: string;
}

@Component({
  components: {
  },
})
export default class CmdMessage extends Mixins(GlobalMixins) {
	public present: boolean = false;
	public livePresent: PresentStruct[] = [];
	public validStickers: Sticker[] = [];

	public cfgPath: string = this.$path('userData', 'cmd.cfg');
	public cfg: CfgLite = new CfgLite(this.cfgPath);

	public imgs: Record<string, unknown> = {
		coin: giftCoin,
	};

	public async mounted() {
		this.livePresent = this.cfg.get('live_present') || [{
			sticker: 'default',
			src: '',
			title: '기본',
			message: '',
		}];

		const defaultSticker = this.livePresent.find(({sticker}) => sticker === 'default');
		if ( !defaultSticker ) {
			this.livePresent.unshift({
				sticker: 'default',
				src: '',
				title: '기본',
				message: '',
			});
		}

		if ( !this.$sopia.sticker.stickers ) {
			await this.asleep(2000);
		}
		this.$sopia.sticker.stickers.categories.forEach((category: StickerCategory) => {
			if ( !category.is_used ) {
				return;
			}

			category.stickers.forEach((sticker: Sticker) => {
				if ( sticker.is_used ) {
					this.validStickers.push(sticker);
				}
			});
		});

		this.$evt.$on('cmd:save', () => {
			this.cfg.set('live_present', this.livePresent);
			this.cfg.save();
		});
	}

  public async addPresentNew() {
    const sticker = await this.$openStickerModal();
    if ( !sticker ) {
      return;
    }

    this.livePresent.splice(1, 0, {
      sticker: sticker.name,
      src: sticker.image_thumbnail,
      title: sticker.title,
      message: '',
    });
  }

	public addPresentEvent(idx: number) {
		const sticker = this.validStickers[idx];
		const valid = this.livePresent.find((p: PresentStruct) => p.sticker === sticker.name);

		if ( valid ) {
			this.$swal({
				icon: 'error',
				html: this.$t('cmd.sticker.exists'),
				toast: true,
				position: 'top-end',
				timer: 3000,
				showConfirmButton: false,
				showCloseButton: false,
			});
			return;
		}
		this.livePresent.splice(1, 0, {
			sticker: sticker.name,
			title: sticker.title,
			src: sticker.image_thumbnail,
			message: '',
		});
	}

	public delPresentEvent(idx: number) {
		if ( idx === 0 ) {
			this.$swal({
				html: this.$t('cmd.rm-deferr'),
				toast: true,
				icon: 'error',
				position: 'top-end',
				showCloseButton: false,
				showConfirmButton: false,
			});
			return;
		}
		this.livePresent.splice(idx, 1);
	}

	public substr(str: string) {
		if ( str ) {
			if ( str.length > 5 ) {
				return str.substr(0, 5) + '...';
			}
		}
		return str;
	}

	public beforeUnmount() {
		this.$evt.$off('cmd:save');
	}

}
</script>

<style scoped>

</style>
