<template>
	<v-dialog v-model="dialog" max-width="800px" persistent>
		<v-card>
			<v-card-title class="d-flex align-center">
				<v-icon left>mdi-sticker-emoji</v-icon>
				<span>스티커 이미지 선택</span>
				<v-spacer></v-spacer>
				<v-btn icon @click="closeModal">
					<v-icon>mdi-close</v-icon>
				</v-btn>
			</v-card-title>
			
			<v-divider></v-divider>
			
			<v-card-text class="pa-4">
				<div class="sticker-content">
					<!-- 스티커 정보 -->
					<div class="sticker-info mb-4">
						<h3>{{ (sticker && sticker.name) ? sticker.name : '스티커' }}</h3>
						<p class="text-caption">원하는 이미지를 선택하세요</p>
					</div>
					
					<v-row>
						<!-- 왼쪽: 이미지 선택 -->
						<v-col cols="6">
							<div class="image-selection">
								<h4 class="mb-3">이미지 선택</h4>
								
								<!-- 썸네일 이미지 -->
								<div class="image-option mb-3" v-if="sticker && sticker.image_thumbnail">
									<v-card 
										class="image-card" 
										:class="{ 'selected': selectedImage === (sticker && sticker.image_thumbnail) }"
										@click="selectImage(sticker && sticker.image_thumbnail)"
									>
										<v-img 
											:src="sticker && sticker.image_thumbnail" 
											height="120"
											contain
										></v-img>
										<v-card-subtitle class="text-center">썸네일</v-card-subtitle>
									</v-card>
								</div>
								
								<!-- 추가 이미지들 -->
								<div class="image-grid">
									<div 
										v-for="(imageUrl, index) in (sticker && sticker.image_urls) ? sticker.image_urls : []" 
										:key="index"
										class="image-option"
									>
										<v-card 
											class="image-card" 
											:class="{ 'selected': selectedImage === imageUrl }"
											@click="selectImage(imageUrl)"
										>
											<v-img 
												:src="imageUrl" 
												height="100"
												contain
											></v-img>
											<v-card-subtitle class="text-center">이미지 {{ index + 1 }}</v-card-subtitle>
										</v-card>
									</div>
								</div>
							</div>
						</v-col>
						
						<!-- 오른쪽: 로티 플레이어 (있는 경우) -->
						<v-col cols="6" v-if="sticker && sticker.lottie_url && lottieAnimationData">
							<div class="lottie-section">
								<h4 class="mb-3">애니메이션 미리보기</h4>
								
								<div class="lottie-player-container">
									<LottieAnimation
										ref="lottiePlayer"
										:animationData="lottieAnimationData"
										:width="200"
										:height="200"
										:loop="false"
										:autoPlay="false"
										@enterFrame="onEnterFrame"
									/>
									
									<div class="lottie-controls mt-3">
										<v-btn 
											small 
											@click="toggleLottiePlayback" 
											:disabled="!lottieInstance"
											class="mr-2"
										>
											<v-icon small left>{{ lottieIsPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
											{{ lottieIsPlaying ? '일시정지' : '재생' }}
										</v-btn>
										
										<v-btn 
											small 
											@click="captureCurrentFrame" 
											:disabled="!lottieInstance"
											color="primary"
										>
											<v-icon small left>mdi-camera</v-icon>
											현재 화면 캡처
										</v-btn>
									</div>
									
									<v-slider
										v-if="lottieInstance"
										v-model="currentFrame"
										:max="totalFrames"
										@input="seekToFrame"
										class="mt-3"
										hide-details
									></v-slider>
								</div>
							</div>
						</v-col>
					</v-row>
				</div>
			</v-card-text>
			
			<v-divider></v-divider>
			
			<v-card-actions class="pa-4">
				<v-spacer></v-spacer>
				<v-btn text @click="closeModal">취소</v-btn>
				<v-btn 
					color="primary" 
					@click="confirmSelection"
					:disabled="!selectedImage"
				>
					선택
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
import LottieAnimation from 'lottie-web-vue';

@Component({
	components: {
		LottieAnimation,
	},
})
export default class StickerImageModal extends Vue {
	@Prop({ default: false }) value!: boolean;
	@Prop({ default: null }) sticker!: any;

	dialog = false;
	selectedImage: string | null = null;
	lottieInstance: any = null;
	currentFrame = 0;
	totalFrames = 0;
	lottieAnimationData: any = null;
	lottieIsPlaying = false;
	
	// 로티 캐시 (Player.vue와 동일한 방식)
	private static lottieCache: Map<string, any> = new Map();

	@Watch('value')
	onValueChanged(newVal: boolean) {
		this.dialog = newVal;
		if (newVal && this.sticker) {
			this.initializeModal();
		}
	}

	@Watch('dialog')
	onDialogChanged(newVal: boolean) {
		if (!newVal) {
			this.cleanup();
			this.$emit('input', false);
		}
	}

	async initializeModal(): Promise<void> {
		this.selectedImage = null;
		this.currentFrame = 0;
		this.totalFrames = 0;
		this.lottieAnimationData = null;
		
		// 로티 애니메이션 데이터 로드 (Player.vue 방식과 동일)
		if (this.sticker && this.sticker.lottie_url) {
			await this.loadLottieAnimation();
		}
		
		// 로티 인스턴스 초기화
		this.$nextTick(() => {
			if (this.$refs.lottiePlayer) {
				this.lottieInstance = (this.$refs.lottiePlayer as any).anim;
				if (this.lottieInstance) {
					this.totalFrames = this.lottieInstance.totalFrames || 0;
					this.currentFrame = 0;
				}
			}
		});
	}

	mounted(): void {
		// lottie 인스턴스는 컴포넌트가 마운트된 후에 접근 가능
		this.$nextTick(() => {
			if (this.$refs.lottiePlayer) {
				this.lottieInstance = (this.$refs.lottiePlayer as any).anim;
				if (this.lottieInstance) {
					this.totalFrames = this.lottieInstance.totalFrames || 0;
					this.currentFrame = 0;
				}
			}
		});
	}

	// 로티 애니메이션 데이터 로드 (Player.vue와 동일한 캐싱 방식)
	async loadLottieAnimation(): Promise<void> {
		if (!this.sticker || !this.sticker.lottie_url) return;
		
		const cacheKey = this.sticker.name || this.sticker.lottie_url;
		
		try {
			// 캐시에서 먼저 확인
			if (StickerImageModal.lottieCache.has(cacheKey)) {
				this.lottieAnimationData = StickerImageModal.lottieCache.get(cacheKey);
				console.log('로티 애니메이션 캐시에서 로드:', cacheKey);
			} else {
				// 캐시에 없으면 새로 로드하고 캐시에 저장
				console.log('로티 애니메이션 새로 로드:', this.sticker.lottie_url);
				const axios = require('axios');
				const response = await axios.get(this.sticker.lottie_url);
				const processedData = this.processLottieData(response.data);
				StickerImageModal.lottieCache.set(cacheKey, processedData);
				this.lottieAnimationData = processedData;
			}
		} catch (error) {
			console.error('로티 애니메이션 로드 실패:', error);
		}
	}

	onEnterFrame(): void {
		// enterFrame 이벤트 핸들러
		if (this.lottieInstance) {
			this.currentFrame = Math.round(this.lottieInstance.currentFrame);
		}
	}

	selectImage(imageUrl: string): void {
		this.selectedImage = imageUrl;
	}

	toggleLottiePlayback(): void {
		if (this.lottieInstance) {
			if (this.lottieIsPlaying) {
				this.lottieInstance.pause();
				this.lottieIsPlaying = false;
			} else {
				this.lottieInstance.play();
				this.lottieIsPlaying = true;
			}
		}
	}

	seekToFrame(frame: number): void {
		if (this.lottieInstance) {
			this.lottieInstance.goToAndStop(frame, true);
		}
	}

	async captureCurrentFrame(): Promise<void> {
		if (!this.lottieInstance) return;

		try {
			const lottiePlayer = this.$refs.lottiePlayer as any;
			const container = lottiePlayer && lottiePlayer.$el ? lottiePlayer.$el : lottiePlayer;
			const svg = container && container.querySelector ? container.querySelector('svg') : null;
			
			if (svg) {
				// SVG를 Canvas로 변환
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				if (!ctx) return;
				
				const svgRect = svg.getBoundingClientRect();
				
				canvas.width = svgRect.width * 2; // 고해상도
				canvas.height = svgRect.height * 2;
				ctx.scale(2, 2);
				
				// SVG를 이미지로 변환
				const svgData = new XMLSerializer().serializeToString(svg);
				const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
				const svgUrl = URL.createObjectURL(svgBlob);
				
				const img = new Image();
				img.onload = () => {
					ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height);
					const dataUrl = canvas.toDataURL('image/png');
					
					// 캡처된 이미지를 선택된 이미지로 설정하고 즉시 선택 완료
					this.selectedImage = dataUrl;
					this.confirmSelection();
					
					URL.revokeObjectURL(svgUrl);
				};
				img.src = svgUrl;
			}
		} catch (error) {
			console.error('프레임 캡처 실패:', error);
		}
	}

	confirmSelection(): void {
		if (this.selectedImage) {
			this.$emit('select', {
				sticker: this.sticker,
				imageUrl: this.selectedImage
			});
			this.closeModal();
		}
	}

	closeModal(): void {
		this.dialog = false;
	}

	cleanup(): void {
		if (this.lottieInstance) {
			this.lottieInstance.destroy();
			this.lottieInstance = null;
		}
		this.selectedImage = null;
		this.currentFrame = 0;
		this.totalFrames = 0;
		this.lottieAnimationData = null;
	}

	processLottieData(lottieData: any): any {
		// 로티 데이터가 없거나 assets가 없으면 원본 반환
		if (!lottieData || !lottieData.assets) {
			return lottieData;
		}

		// assets 배열을 복사하여 수정
		const processedData = JSON.parse(JSON.stringify(lottieData));
		
		processedData.assets.forEach((asset: any) => {
			// 이미지 에셋이고 base64 데이터가 포함된 경우
			if (asset.p && asset.p.startsWith('data:image/')) {
				// base64 이미지를 blob URL로 변환
				try {
					const base64Data = asset.p.split(',')[1];
					const mimeType = asset.p.match(/data:([^;]+)/)?.[1] || 'image/png';
					
					// base64를 blob으로 변환
					const byteCharacters = atob(base64Data);
					const byteNumbers = new Array(byteCharacters.length);
					for (let i = 0; i < byteCharacters.length; i++) {
						byteNumbers[i] = byteCharacters.charCodeAt(i);
					}
					const byteArray = new Uint8Array(byteNumbers);
					const blob = new Blob([byteArray], { type: mimeType });
					
					// blob URL 생성
					const blobUrl = URL.createObjectURL(blob);
					
					// 에셋 경로를 blob URL로 교체
					asset.p = blobUrl;
					asset.u = ''; // basePath 제거
				} catch (error) {
					console.warn('base64 이미지 처리 실패:', error);
				}
			}
		});

		return processedData;
	}

	beforeDestroy(): void {
		this.cleanup();
	}
}
</script>

<style lang="scss" scoped>
.sticker-content {
	min-height: 400px;
}

.sticker-info {
	text-align: center;
	
	h3 {
		color: #333;
		margin-bottom: 8px;
	}
}

.image-selection {
	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 12px;
	}
	
	.image-option {
		.image-card {
			cursor: pointer;
			transition: all 0.3s ease;
			border: 2px solid transparent;
			
			&:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			}
			
			&.selected {
				border-color: #1976d2;
				box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
			}
		}
	}
}

.lottie-section {
	.lottie-player-container {
		background: #f5f5f5;
		border-radius: 8px;
		padding: 16px;
		
		.lottie-container {
			width: 100%;
			height: 200px;
			background: white;
			border-radius: 4px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		
		.lottie-controls {
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}
}

:deep(.v-card-subtitle) {
	font-size: 12px;
	padding: 8px 4px 12px 4px;
}
</style>
