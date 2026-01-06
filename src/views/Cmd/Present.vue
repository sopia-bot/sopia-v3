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
    
    <!-- S: Audio Setting Dialog -->
    <v-dialog
        v-model="audioDialog"
        max-width="500"
        width="90%">
      <v-card class="rounded-lg">
        <v-card-title class="purple white--text">
          <v-icon color="white" class="mr-2">mdi-music</v-icon>
          음악 설정
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-medium mb-2">선택된 음악 파일</div>
            <v-card 
              outlined 
              class="pa-3" 
              :color="currentAudioSetting.audio ? 'blue-grey lighten-5' : 'grey lighten-4'">
              <div v-if="currentAudioSetting.audio" class="d-flex align-center">
                <v-icon color="blue-grey darken-2" class="mr-2">mdi-file-music</v-icon>
                <div class="flex-grow-1" style="min-width: 0;">
                  <div class="text-body-2 font-weight-medium text-truncate">
                    {{ getFileName(currentAudioSetting.audio) }}
                  </div>
                  <div class="text-caption grey--text text-truncate" :title="currentAudioSetting.audio">
                    {{ currentAudioSetting.audio }}
                  </div>
                </div>
              </div>
              <div v-else class="text-center grey--text">
                선택된 파일이 없습니다
              </div>
            </v-card>
          </div>
          
          <v-btn 
            block 
            color="indigo" 
            dark 
            class="mb-3"
            @click="selectAudioFile">
            <v-icon left>mdi-folder-open</v-icon>
            음악 파일 선택
          </v-btn>
          
          <v-divider class="my-4"></v-divider>
          
          <div class="mb-4">
            <div class="d-flex justify-space-between align-center mb-2">
              <div class="text-subtitle-2 font-weight-medium">음량</div>
              <v-chip small color="purple" dark>
                {{ currentAudioSetting.audioVolume || 50 }}%
              </v-chip>
            </div>
            <v-slider
              v-model="currentAudioSetting.audioVolume"
              :min="0"
              :max="100"
              :step="1"
              color="purple"
              track-color="grey lighten-2"
              thumb-label="always"
              hide-details
              class="mt-2"
              @input="updatePreviewVolume">
              <template v-slot:prepend>
                <v-icon @click="currentAudioSetting.audioVolume = Math.max(0, (currentAudioSetting.audioVolume || 50) - 10)">
                  mdi-volume-low
                </v-icon>
              </template>
              <template v-slot:append>
                <v-icon @click="currentAudioSetting.audioVolume = Math.min(100, (currentAudioSetting.audioVolume || 50) + 10)">
                  mdi-volume-high
                </v-icon>
              </template>
            </v-slider>
          </div>
          
          <div class="d-flex gap-2" v-if="currentAudioSetting.audio">
            <v-btn 
              :color="isPreviewPlaying ? 'orange darken-2' : 'green'" 
              dark 
              class="flex-grow-1"
              @click="togglePreviewAudio">
              <v-icon left>{{ isPreviewPlaying ? 'mdi-stop' : 'mdi-play' }}</v-icon>
              {{ isPreviewPlaying ? '정지' : '미리듣기' }}
            </v-btn>
            <v-btn 
              color="red darken-2" 
              dark 
              class="flex-grow-1"
              @click="removeAudio">
              <v-icon left>mdi-delete</v-icon>
              삭제
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="cancelAudioSetting">취소</v-btn>
          <v-btn color="purple" dark @click="saveAudioSetting">저장</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- E: Audio Setting Dialog -->

    <!-- S: Amount Threshold Dialog -->
    <v-dialog
        v-model="amountDialog"
        max-width="400"
        width="90%">
      <v-card class="rounded-lg">
        <v-card-title class="orange white--text">
          <v-icon color="white" class="mr-2">mdi-counter</v-icon>
          개수 조건 설정
        </v-card-title>
        <v-card-text class="pa-4">
          <div class="mb-4">
            <div class="text-subtitle-2 font-weight-medium mb-2">최소 개수 (combo × amount)</div>
            <v-text-field
              v-model.number="newAmountThreshold"
              type="number"
              min="1"
              outlined
              dense
              :error-messages="amountErrorMessage"
              hint="예: 10 = 10개 이상일 때 반응"
              persistent-hint
              suffix="개 이상"
            />
          </div>
          <v-alert type="info" dense text class="mb-0">
            <div class="text-caption">
              선물의 콤보 × 수량이 설정한 개수 이상일 때 이 설정이 적용됩니다.
              <br/>특정 스티커 설정이 있으면 스티커 설정이 우선합니다.
            </div>
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="amountDialog = false">취소</v-btn>
          <v-btn color="orange" dark @click="addAmountEntry" :disabled="!isValidAmountThreshold">추가</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <!-- E: Amount Threshold Dialog -->

    <v-card class="elevation-2 rounded-lg" outlined>
      <v-card-title class="pb-2">
        <v-icon color="purple" class="mr-2">mdi-gift</v-icon>
        <span class="text-h6 font-weight-medium">선물 메시지 설정</span>
      </v-card-title>
      <v-card-text class="pt-2">
        <v-row class="mb-4">
          <v-col cols="6">
            <v-btn
              block
              rounded
              color="indigo"
              dark
              class="elevation-2"
              @click="addPresentNew"
            >
              <v-icon left>mdi-plus</v-icon>
              새 선물 추가
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              block
              rounded
              color="orange"
              dark
              class="elevation-2"
              @click="openAmountDialog"
            >
              <v-icon left>mdi-counter</v-icon>
              개수 조건 추가
            </v-btn>
          </v-col>
        </v-row>
        
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
                  :color="presentItem.type === 'amount' ? 'orange lighten-5' : 'grey lighten-4'"
                  flat
                >
                  <template v-if="presentItem.type === 'amount'">
                    <v-avatar size="40" class="mr-2" color="orange">
                      <v-icon color="white">mdi-counter</v-icon>
                    </v-avatar>
                  </template>
                  <template v-else-if="presentItem.src">
                    <v-avatar size="40" class="mr-2">
                      <v-img :src="presentItem.src" :alt="presentItem.title"/>
                    </v-avatar>
                  </template>
                  <v-icon v-else size="40" color="grey" class="mr-2">mdi-gift</v-icon>
                  <div>
                    <div class="font-weight-medium text-truncate">
                      {{ presentItem.type === 'amount' ? presentItem.minAmount + '개 이상' : substr(presentItem.title) }}
                    </div>
                    <div class="text-caption grey--text">
                      {{ presentItem.type === 'amount' ? '개수 조건' : presentItem.sticker }}
                    </div>
                  </div>
                </v-card>
              </v-col>
              <v-col cols="8" md="6" class="pr-2">
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
              <v-col cols="4" md="2" class="d-flex align-center justify-center gap-1">
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <v-btn 
                      icon 
                      :color="presentItem.audio ? 'green' : 'grey'"
                      @click="openAudioDialog(idx)"
                      class="elevation-1 mr-3"
                      v-bind="attrs"
                      v-on="on"
                    >
                      <v-icon>{{ presentItem.audio ? 'mdi-music-box' : 'mdi-music-box-outline' }}</v-icon>
                    </v-btn>
                  </template>
                  <span>{{ presentItem.audio ? '음악 설정됨' : '음악 추가' }}</span>
                </v-tooltip>
                
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
	audio?: string;
	audioVolume?: number;
	type?: 'sticker' | 'amount';
	minAmount?: number;
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

	// Audio dialog
	public audioDialog: boolean = false;
	public currentAudioIndex: number = -1;
	public currentAudioSetting: { audio?: string; audioVolume?: number } = {
		audio: undefined,
		audioVolume: 50,
	};
	public previewAudioPlayer: HTMLAudioElement | null = null;
	public isPreviewPlaying: boolean = false;

	// Amount threshold dialog
	public amountDialog: boolean = false;
	public newAmountThreshold: number = 10;

	get amountErrorMessage(): string {
		if (this.newAmountThreshold < 1) {
			return '1 이상의 값을 입력하세요.';
		}
		const exists = this.livePresent.some(
			(p: PresentStruct) => p.type === 'amount' && p.minAmount === this.newAmountThreshold
		);
		if (exists) {
			return '이미 존재하는 개수 조건입니다.';
		}
		return '';
	}

	get isValidAmountThreshold(): boolean {
		return this.newAmountThreshold >= 1 && !this.amountErrorMessage;
	}

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

	// Amount threshold methods
	public openAmountDialog() {
		this.newAmountThreshold = 10;
		this.amountDialog = true;
	}

	public addAmountEntry() {
		if (!this.isValidAmountThreshold) return;

		const entry: PresentStruct = {
			sticker: `amount_${this.newAmountThreshold}`,
			src: '',
			title: `${this.newAmountThreshold}개 이상`,
			message: '',
			type: 'amount',
			minAmount: this.newAmountThreshold,
		};

		// Insert at index 1 (after default)
		this.livePresent.splice(1, 0, entry);
		this.amountDialog = false;
	}

	// Audio methods
	public openAudioDialog(idx: number) {
		this.currentAudioIndex = idx;
		const presentItem = this.livePresent[idx];
		// Assign properties individually to maintain reactivity
		this.currentAudioSetting.audio = presentItem.audio;
		this.currentAudioSetting.audioVolume = presentItem.audioVolume !== undefined ? presentItem.audioVolume : 50;
		this.audioDialog = true;
	}

	public async selectAudioFile() {
		const { ipcRenderer } = window.require('electron');
		const result = await ipcRenderer.invoke('open-dialog', {
			title: '음악 파일 선택',
			properties: ['openFile'],
			filters: [
				{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'webm'] },
				{ name: 'All Files', extensions: ['*'] }
			]
		});

		if (!result.canceled && result.filePaths.length > 0) {
			this.currentAudioSetting.audio = result.filePaths[0];
		}
	}

	public getFileName(filePath: string): string {
		if (!filePath) return '';
		const path = window.require('path');
		return path.basename(filePath);
	}

	public async previewAudio() {
		if (!this.currentAudioSetting.audio) return;

		// Stop previous preview if playing
		if (this.previewAudioPlayer) {
			this.previewAudioPlayer.pause();
			this.previewAudioPlayer = null;
			this.isPreviewPlaying = false;
		}

		try {
			this.previewAudioPlayer = new Audio(this.currentAudioSetting.audio);
			this.previewAudioPlayer.volume = (this.currentAudioSetting.audioVolume || 50) / 100;
			
			// Clean up after playback
			this.previewAudioPlayer.addEventListener('ended', () => {
				if (this.previewAudioPlayer) {
					this.previewAudioPlayer = null;
				}
				this.isPreviewPlaying = false;
			});

			await this.previewAudioPlayer.play();
			this.isPreviewPlaying = true;

			this.$swal({
				icon: 'success',
				html: '미리듣기 재생 중...',
				toast: true,
				position: 'top-end',
				timer: 2000,
				showConfirmButton: false,
			});
		} catch (error) {
			this.isPreviewPlaying = false;
			this.$swal({
				icon: 'error',
				html: '오디오 파일을 재생할 수 없습니다.',
				toast: true,
				position: 'top-end',
				timer: 3000,
				showConfirmButton: false,
			});
		}
	}

	public togglePreviewAudio() {
		if (this.isPreviewPlaying) {
			this.stopPreviewAudio();
		} else {
			this.previewAudio();
		}
	}

	public updatePreviewVolume() {
		// Update volume in real-time while preview is playing
		if (this.previewAudioPlayer && this.isPreviewPlaying) {
			this.previewAudioPlayer.volume = (this.currentAudioSetting.audioVolume || 50) / 100;
		}
	}

	public removeAudio() {
		this.stopPreviewAudio();
		this.currentAudioSetting.audio = undefined;
		this.currentAudioSetting.audioVolume = 50;
	}

	public saveAudioSetting() {
		if (this.currentAudioIndex >= 0) {
			const presentItem = this.livePresent[this.currentAudioIndex];
			presentItem.audio = this.currentAudioSetting.audio;
      console.log('this.currentAudioSetting.audioVolume', this.currentAudioSetting.audioVolume);
			presentItem.audioVolume = this.currentAudioSetting.audioVolume || 50;
		}
		this.audioDialog = false;
		this.stopPreviewAudio();
	}

	public cancelAudioSetting() {
		this.audioDialog = false;
		this.stopPreviewAudio();
	}

	public stopPreviewAudio() {
		if (this.previewAudioPlayer) {
			this.previewAudioPlayer.pause();
			this.previewAudioPlayer = null;
		}
		this.isPreviewPlaying = false;
	}

	public beforeUnmount() {
		this.$evt.$off('cmd:save');
		this.stopPreviewAudio();
	}

}
</script>

<style scoped>

</style>
