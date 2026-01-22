<template>
	<v-dialog v-model="dialog" max-width="900px" persistent>
		<v-card class="received-spoon-modal">
			<v-card-title class="d-flex align-center">
				<v-icon left>mdi-gift</v-icon>
				<span>받은 스푼</span>
				<v-spacer></v-spacer>
				<v-btn icon @click="closeModal">
					<v-icon>mdi-close</v-icon>
				</v-btn>
			</v-card-title>

			<v-divider></v-divider>

			<v-card-text class="pa-0">
				<div class="modal-content">
					<!-- 왼쪽: 선물 목록 -->
					<div class="gift-list-section">
						<div class="section-header">
							<span class="section-title">선물 목록</span>
							<v-btn
								icon
								small
								@click="refreshList"
								:loading="isLoading"
								class="refresh-btn"
							>
								<v-icon small>mdi-refresh</v-icon>
							</v-btn>
						</div>

						<!-- 검색 필터 -->
						<div class="search-filters">
							<!-- 날짜 검색 -->
							<div class="filter-row">
								<v-menu
									v-model="startDateMenu"
									:close-on-content-click="false"
									transition="scale-transition"
									offset-y
									min-width="auto"
								>
									<template v-slot:activator="{ on, attrs }">
										<v-text-field
											v-model="startDate"
											label="시작일"
											prepend-inner-icon="mdi-calendar"
											readonly
											dense
											outlined
											hide-details
											clearable
											class="date-input"
											v-bind="attrs"
											v-on="on"
											@click:clear="onClearStartDate"
										></v-text-field>
									</template>
									<v-date-picker
										v-model="startDate"
										@input="onStartDateSelected"
										locale="ko"
										:day-format="(date) => new Date(date).getDate()"
									></v-date-picker>
								</v-menu>

								<span class="date-separator">~</span>

								<v-menu
									v-model="endDateMenu"
									:close-on-content-click="false"
									transition="scale-transition"
									offset-y
									min-width="auto"
								>
									<template v-slot:activator="{ on, attrs }">
										<v-text-field
											v-model="endDate"
											label="종료일"
											prepend-inner-icon="mdi-calendar"
											readonly
											dense
											outlined
											hide-details
											clearable
											class="date-input"
											v-bind="attrs"
											v-on="on"
											@click:clear="onClearEndDate"
										></v-text-field>
									</template>
									<v-date-picker
										v-model="endDate"
										@input="onEndDateSelected"
										locale="ko"
										:day-format="(date) => new Date(date).getDate()"
									></v-date-picker>
								</v-menu>
							</div>

							<!-- 방송 제목 검색 -->
							<div class="filter-row">
								<v-text-field
									v-model="searchTitle"
									label="방송 제목 검색"
									prepend-inner-icon="mdi-magnify"
									dense
									outlined
									hide-details
									clearable
									class="title-input"
									@keyup.enter="applyFilter"
								></v-text-field>
								<v-btn
									small
									color="primary"
									@click="applyFilter"
									:loading="isLoading"
									class="search-btn"
								>
									검색
								</v-btn>
							</div>
						</div>

						<vue-scroll
							ref="giftScroll"
							:ops="scrollOptions"
							@handle-scroll="handleScroll"
							class="gift-scroll-container"
						>
							<div class="gift-list">
								<!-- 로딩 상태 -->
								<div v-if="isLoading && giftEvents.length === 0" class="loading-state">
									<v-progress-circular indeterminate color="primary" size="40"></v-progress-circular>
									<div class="mt-2">방송 기록을 불러오는 중...</div>
								</div>

								<!-- 선물 목록이 없을 때 -->
								<div v-else-if="!isLoading && giftEvents.length === 0" class="empty-state">
									<v-icon large color="grey">mdi-gift-off</v-icon>
									<div class="mt-2">받은 선물이 없습니다</div>
								</div>

								<!-- 선물 목록 -->
								<div
									v-for="(gift, index) in giftEvents"
									:key="`${gift.liveId}-${gift.idx}`"
									class="gift-item"
									:class="{ 'selected': selectedGift && selectedGift.idx === gift.idx && selectedGift.liveId === gift.liveId }"
									@click="selectGift(gift)"
								>
									<div class="gift-item-content">
										<img
											v-if="getStickerImage(gift.data.data.sticker)"
											:src="getStickerImage(gift.data.data.sticker)"
											class="gift-sticker-thumb"
											:alt="gift.data.data.sticker"
										>
										<v-icon v-else color="amber">mdi-gift</v-icon>

										<div class="gift-details">
											<div class="gift-sender-name">
												<v-avatar size="18" class="mr-1">
													<v-img :src="gift.data.data.author.profile_url">
														<template v-slot:placeholder>
															<v-icon x-small>mdi-account</v-icon>
														</template>
													</v-img>
												</v-avatar>
												{{ gift.data.data.author.nickname }}
											</div>
											<div class="gift-amount-info">
												{{ formatNumber(gift.data.data.amount) }}스푼 X{{ gift.data.data.combo }}
											</div>
											<div class="gift-live-title">
												{{ gift.liveTitle }}
											</div>
											<div class="gift-date">
												{{ formatDate(gift.savedDate) }}
											</div>
										</div>
									</div>
								</div>

								<!-- 더 로딩 중 -->
								<div v-if="isLoadingMore" class="loading-more">
									<v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
									<span class="ml-2">더 불러오는 중...</span>
								</div>

								<!-- 모든 데이터 로드 완료 -->
								<div v-else-if="!hasMore && giftEvents.length > 0" class="no-more">
									<v-icon small color="grey">mdi-check-circle</v-icon>
									<span class="ml-1">모든 선물을 불러왔습니다</span>
								</div>
							</div>
						</vue-scroll>
					</div>

					<!-- 오른쪽: 미리보기 -->
					<div class="preview-section">
						<div class="section-header">
							<span class="section-title">미리보기</span>
						</div>

						<div v-if="!selectedGift" class="preview-placeholder">
							<v-icon large color="grey">mdi-eye-outline</v-icon>
							<div class="mt-2">선물을 선택하세요</div>
						</div>

						<div v-else class="preview-content">
							<!-- 타입 선택 -->
							<div class="type-selector mb-4">
								<v-btn-toggle v-model="selectedType" mandatory dense>
									<v-btn value="legacy" small>
										구버전 스푼
									</v-btn>
									<v-btn value="spoon" small>
										스푼라디오
									</v-btn>
									<v-btn value="sopia" small>
										소피아
									</v-btn>
								</v-btn-toggle>
							</div>

							<!-- 미리보기 영역 -->
							<div class="preview-box" ref="previewBox">
								<!-- 구버전 스푼라디오 타입 -->
								<div v-if="selectedType === 'legacy'" class="gift-content legacy-style" ref="captureTarget">
									<div class="gift-image-container" v-if="getStickerImage(selectedGift.data.data.sticker)">
										<img :src="getStickerImage(selectedGift.data.data.sticker)" class="gift-image" :alt="selectedGift.data.data.sticker">
									</div>
									<v-icon v-else small color="#FFD700" class="gift-icon">mdi-gift</v-icon>
									<span class="gift-sender">{{ selectedGift.data.data.author.nickname }}</span>
									<span class="gift-amount">{{ selectedGift.data.data.amount }}스푼</span>
									<span v-if="selectedGift.data.data.combo > 1" class="gift-combo">X {{ selectedGift.data.data.combo }}</span>
								</div>

								<!-- 스푼라디오 타입 -->
								<div v-else-if="selectedType === 'spoon'" class="gift-content spoon-style" ref="captureTarget">
									<div class="spoon-profile-stack">
										<v-avatar size="32" class="spoon-profile-back">
											<v-img :src="selectedGift.djProfileUrl || ''">
												<template v-slot:placeholder>
													<v-icon small color="white">mdi-account</v-icon>
												</template>
											</v-img>
										</v-avatar>
										<v-avatar size="32" class="spoon-profile-front">
											<v-img :src="selectedGift.data.data.author.profile_url">
												<template v-slot:placeholder>
													<v-icon small color="white">mdi-account</v-icon>
												</template>
											</v-img>
										</v-avatar>
									</div>
									<span class="gift-sender">{{ selectedGift.data.data.author.nickname }}</span>
									<div
										v-if="getStickerImage(selectedGift.data.data.sticker)"
										class="spoon-sticker-image"
										:style="{ backgroundImage: `url(${getStickerImage(selectedGift.data.data.sticker)})` }"
									></div>
									<v-icon v-else small color="#FFD700" class="gift-icon">mdi-gift</v-icon>
									<span class="gift-amount">{{ formatNumber(selectedGift.data.data.amount) }}스푼</span>
									<span class="gift-combo">X</span>
									<span class="gift-combo">{{ selectedGift.data.data.combo }}</span>
								</div>

								<!-- 소피아 타입 -->
								<div v-else class="gift-content sopia-style" ref="captureTarget">
									<v-avatar size="24" class="gift-avatar">
										<v-img :src="selectedGift.data.data.author.profile_url">
											<template v-slot:placeholder>
												<v-icon small color="white">mdi-account</v-icon>
											</template>
										</v-img>
									</v-avatar>
									<div class="gift-text">
										<span class="gift-sender">{{ selectedGift.data.data.author.nickname }}</span>
										<div class="gift-image-container" v-if="getStickerImage(selectedGift.data.data.sticker)">
											<img :src="getStickerImage(selectedGift.data.data.sticker)" class="gift-image" :alt="selectedGift.data.data.sticker">
										</div>
										<v-icon v-else small color="#FFD700" class="gift-icon">mdi-gift</v-icon>
										<span class="gift-amount">{{ selectedGift.data.data.amount }}스푼</span>
										<span class="gift-combo">X {{ selectedGift.data.data.combo }}</span>
									</div>
								</div>
							</div>

							<!-- 선물 정보 -->
							<div class="gift-info-panel mt-4">
								<div class="info-row">
									<span class="info-label">보낸 사람:</span>
									<span class="info-value">{{ selectedGift.data.data.author.nickname }}</span>
								</div>
								<div class="info-row">
									<span class="info-label">스푼:</span>
									<span class="info-value">{{ formatNumber(selectedGift.data.data.amount) }} X {{ selectedGift.data.data.combo }}</span>
								</div>
								<div class="info-row">
									<span class="info-label">방송:</span>
									<span class="info-value">{{ selectedGift.liveTitle }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</v-card-text>

			<v-divider></v-divider>

			<v-card-actions class="pa-4">
				<v-spacer></v-spacer>
				<v-btn text @click="closeModal">취소</v-btn>
				<v-btn
					color="primary"
					@click="confirmSelection"
					:disabled="!selectedGift"
					:loading="isCapturing"
				>
					<v-icon left small>mdi-camera</v-icon>
					캡처하여 추가
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch, Mixins } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import html2canvas from 'html2canvas';
const fs = window.require('fs');
const path = window.require('path');
const Database = window.require('better-sqlite3');

interface GiftEvent {
	idx: number;
	liveId: number;
	liveTitle: string;
	liveEvent: string;
	data: any;
	savedDate: string;
	djProfileUrl: string;
}

@Component({
	components: {},
})
export default class ReceivedSpoonModal extends Mixins(GlobalMixins) {
	@Prop({ default: false }) value!: boolean;

	dialog = false;
	giftEvents: GiftEvent[] = [];
	selectedGift: GiftEvent | null = null;
	selectedType = 'spoon';

	// 검색 필터
	startDate = '';
	endDate = '';
	startDateMenu = false;
	endDateMenu = false;
	searchTitle = '';

	// 로딩 상태
	isLoading = false;
	isLoadingMore = false;
	isCapturing = false;

	// 페이지네이션
	allDbFiles: string[] = [];
	currentFileIndex = 0;
	pageSize = 5; // 한 번에 처리할 DB 파일 수
	hasMore = true;

	// 스크롤 옵션
	scrollOptions = {
		vuescroll: {},
		scrollPanel: {},
		rail: {
			background: '#000',
			opacity: 0,
			size: '8px',
		},
		bar: {
			showDelay: 500,
			onlyShowBarOnScroll: true,
			background: '#7a7a7a',
			keepShow: false,
			opacity: 0.5,
			size: '6px',
		},
	};

	@Watch('value')
	onValueChanged(newVal: boolean) {
		this.dialog = newVal;
		if (newVal) {
			this.initializeModal();
		}
	}

	@Watch('dialog')
	onDialogChanged(newVal: boolean) {
		if (!newVal) {
			this.$emit('input', false);
		}
	}

	async initializeModal(): Promise<void> {
		this.giftEvents = [];
		this.selectedGift = null;
		this.selectedType = 'spoon';
		this.currentFileIndex = 0;
		this.hasMore = true;
		this.allDbFiles = [];
		// 검색 필터 초기화하지 않음 (유지)

		await this.loadDbFileList();
		await this.loadMoreGifts();
	}

	async applyFilter(): Promise<void> {
		this.giftEvents = [];
		this.selectedGift = null;
		this.currentFileIndex = 0;
		this.hasMore = true;

		await this.loadDbFileList();
		await this.loadMoreGifts();
	}

	onStartDateSelected(): void {
		this.startDateMenu = false;
		this.applyFilter();
	}

	onEndDateSelected(): void {
		this.endDateMenu = false;
		this.applyFilter();
	}

	onClearStartDate(): void {
		this.startDate = '';
		this.applyFilter();
	}

	onClearEndDate(): void {
		this.endDate = '';
		this.applyFilter();
	}

	async loadDbFileList(): Promise<void> {
		try {
			const historyPath = this.$path('userData', 'historydb');

			if (!fs.existsSync(historyPath)) {
				this.allDbFiles = [];
				this.hasMore = false;
				return;
			}

			const files = fs.readdirSync(historyPath);
			this.allDbFiles = files
				.filter((file: string) => file.endsWith('.db'))
				.sort((a: string, b: string) => {
					const aNum = parseInt(a.replace('.db', ''));
					const bNum = parseInt(b.replace('.db', ''));
					return bNum - aNum; // 최신순
				});

			this.hasMore = this.allDbFiles.length > 0;
		} catch (error) {
			console.error('DB 파일 목록 로드 실패:', error);
			this.allDbFiles = [];
			this.hasMore = false;
		}
	}

	async loadMoreGifts(): Promise<void> {
		if (this.isLoadingMore || !this.hasMore) return;

		const isFiltering = !!(this.startDate || this.endDate || this.searchTitle?.trim());
		const minResults = isFiltering ? 10 : 0; // 필터링 시 최소 10개 결과 확보

		if (this.giftEvents.length === 0) {
			this.isLoading = true;
		} else {
			this.isLoadingMore = true;
		}

		try {
			const historyPath = this.$path('userData', 'historydb');

			// 필터링 시 결과가 충분할 때까지 반복
			do {
				const endIndex = Math.min(this.currentFileIndex + this.pageSize, this.allDbFiles.length);
				const filesToProcess = this.allDbFiles.slice(this.currentFileIndex, endIndex);

				for (const dbFile of filesToProcess) {
					try {
						const liveId = parseInt(dbFile.replace('.db', ''));
						const dbPath = path.join(historyPath, dbFile);

						const db = new Database(dbPath, { readonly: true });

						// DJ 정보 가져오기 (live_update에서)
						let djProfileUrl = '';
						let liveTitle = '';
						const liveUpdateStmt = db.prepare(`
							SELECT data_json FROM live_history_tbl
							WHERE live_event = 'live_update'
							ORDER BY idx ASC
							LIMIT 1
						`);
						const liveUpdateRow = liveUpdateStmt.get();
						if (liveUpdateRow && liveUpdateRow.data_json) {
							try {
								const liveData = JSON.parse(liveUpdateRow.data_json);
								if (liveData.data && liveData.data.live) {
									djProfileUrl = liveData.data.live.author?.profile_url || '';
									liveTitle = liveData.data.live.title || '';
								}
							} catch (e) {
								console.error('live_update 파싱 오류:', e);
							}
						}

						// 선물 이벤트 가져오기
						const giftStmt = db.prepare(`
							SELECT idx, live_id, live_event, live_title, data_json, saved_date
							FROM live_history_tbl
							WHERE live_event IN ('live_present', 'live_present_like')
							ORDER BY idx DESC
						`);

						const rows = giftStmt.all();
						db.close();

						for (const row of rows) {
							try {
								const data = JSON.parse(row.data_json);
								const giftLiveTitle = liveTitle || row.live_title || '제목 없음';
								const giftSavedDate = row.saved_date;

								// 날짜 필터 적용 (UTC → KST 변환 후 비교)
								if (this.startDate || this.endDate) {
									// giftSavedDate는 UTC로 저장됨 (예: "2025-11-30 23:00:00.123")
									// KST로 변환 (+9시간)
									let savedDateStr = '';
									if (giftSavedDate) {
										const utcDate = new Date(giftSavedDate.replace(' ', 'T') + 'Z'); // UTC로 파싱
										const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // +9시간
										savedDateStr = kstDate.toISOString().substring(0, 10); // "YYYY-MM-DD"
									}

									if (this.startDate && savedDateStr < this.startDate) continue;
									if (this.endDate && savedDateStr > this.endDate) continue;
								}

								// 방송 제목 필터 적용
								if (this.searchTitle && this.searchTitle.trim()) {
									const searchLower = this.searchTitle.trim().toLowerCase();
									if (!giftLiveTitle.toLowerCase().includes(searchLower)) continue;
								}

								this.giftEvents.push({
									idx: row.idx,
									liveId: liveId,
									liveTitle: giftLiveTitle,
									liveEvent: row.live_event,
									data: data,
									savedDate: giftSavedDate,
									djProfileUrl: djProfileUrl,
								});
							} catch (e) {
								console.error('선물 데이터 파싱 오류:', e);
							}
						}
					} catch (error) {
						console.error(`DB 파일 처리 오류 (${dbFile}):`, error);
					}
				}

				this.currentFileIndex = endIndex;
				this.hasMore = this.currentFileIndex < this.allDbFiles.length;

			} while (
				isFiltering &&
				this.hasMore &&
				this.giftEvents.length < minResults
			);

		} catch (error) {
			console.error('선물 목록 로드 실패:', error);
		} finally {
			this.isLoading = false;
			this.isLoadingMore = false;
		}
	}

	handleScroll(vertical: any, horizontal: any, nativeEvent: any) {
		if (!vertical) return;

		const { process } = vertical;
		// 스크롤이 90% 이상 내려갔을 때 더 로드
		if (process >= 0.9 && !this.isLoadingMore && this.hasMore) {
			this.loadMoreGifts();
		}
	}

	async refreshList(): Promise<void> {
		await this.initializeModal();
	}

	selectGift(gift: GiftEvent): void {
		this.selectedGift = gift;
	}

	getStickerImage(stickerName: string): string | null {
		try {
			const sticker = this.$sopia.sticker.findSticker(stickerName, 0, true);
			return sticker && sticker.image_thumbnail_web ? sticker.image_thumbnail_web : null;
		} catch {
			return null;
		}
	}

	formatNumber(num: number): string {
		return num.toLocaleString('ko-KR');
	}

	formatDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
		} catch {
			return dateString;
		}
	}

	async confirmSelection(): Promise<void> {
		if (!this.selectedGift) return;

		this.isCapturing = true;

		try {
			// 미리보기 영역 캡처
			const captureTarget = this.$refs.captureTarget as HTMLElement;
			if (!captureTarget) {
				throw new Error('캡처 대상을 찾을 수 없습니다.');
			}

			const canvas = await html2canvas(captureTarget, {
				backgroundColor: null,
				scale: 2,
				useCORS: true,
				allowTaint: true,
				logging: false,
			});

			const dataUrl = canvas.toDataURL('image/png');

			// 이미지 크기 분석
			const { width, height } = await this.getImageDimensions(dataUrl);

			// 부모 컴포넌트에 이벤트 발생
			this.$emit('select', {
				src: dataUrl,
				width: width,
				height: height,
				name: `gift_${this.selectedGift.data.data.author.nickname}_${Date.now()}`
			});

			this.closeModal();
		} catch (error) {
			console.error('캡처 실패:', error);
			this.$noti({
				type: 'error',
				content: '캡처에 실패했습니다.'
			});
		} finally {
			this.isCapturing = false;
		}
	}

	private async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => {
				resolve({
					width: img.naturalWidth,
					height: img.naturalHeight
				});
			};
			img.onerror = () => {
				resolve({ width: 300, height: 100 });
			};
			img.src = dataUrl;
		});
	}

	closeModal(): void {
		this.dialog = false;
	}
}
</script>

<style lang="scss" scoped>
.received-spoon-modal {
	max-height: 80vh;
	display: flex;
	flex-direction: column;
}

.modal-content {
	display: flex;
	height: 500px;
}

.gift-list-section {
	width: 400px;
	border-right: 1px solid #e0e0e0;
	display: flex;
	flex-direction: column;
}

.preview-section {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: #f5f5f5;
	border-bottom: 1px solid #e0e0e0;
	min-height: 53px;
	box-sizing: border-box;
}

.section-title {
	font-weight: 600;
	font-size: 14px;
	color: #333;
}

.refresh-btn {
	background: transparent !important;
}

.search-filters {
	padding: 12px;
	background: #fafafa;
	border-bottom: 1px solid #e0e0e0;
}

.filter-row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;

	&:last-child {
		margin-bottom: 0;
	}
}

.date-input {
	flex: 1;
	max-width: 140px;

	:deep(.v-input__slot) {
		min-height: 36px !important;
	}

	:deep(.v-label) {
		font-size: 12px;
	}

	:deep(input) {
		font-size: 12px;
	}
}

.date-separator {
	color: #666;
	font-size: 14px;
}

.title-input {
	flex: 1;

	:deep(.v-input__slot) {
		min-height: 36px !important;
	}

	:deep(.v-label) {
		font-size: 12px;
	}

	:deep(input) {
		font-size: 12px;
	}
}

.search-btn {
	height: 36px !important;
	min-width: 60px !important;
}

.gift-scroll-container {
	flex: 1;
	height: calc(100% - 48px - 120px); // section-header + search-filters
}

.gift-list {
	padding: 8px;
}

.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	color: #666;
}

.gift-item {
	padding: 12px;
	margin-bottom: 8px;
	background: #fff;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.gift-item:hover {
	background: #f5f5f5;
	border-color: #ccc;
}

.gift-item.selected {
	background: #e3f2fd;
	border-color: #1976d2;
	box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.gift-item-content {
	display: flex;
	align-items: center;
	gap: 12px;
}

.gift-sticker-thumb {
	width: 40px;
	height: 40px;
	border-radius: 6px;
	object-fit: cover;
	flex-shrink: 0;
}

.gift-details {
	flex: 1;
	min-width: 0;
}

.gift-sender-name {
	display: flex;
	align-items: center;
	font-weight: 600;
	font-size: 13px;
	color: #333;
	margin-bottom: 2px;
}

.gift-amount-info {
	font-size: 12px;
	color: #FF6B6B;
	font-weight: 600;
	margin-bottom: 2px;
}

.gift-live-title {
	font-size: 11px;
	color: #666;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.gift-date {
	font-size: 10px;
	color: #999;
}

.loading-more,
.no-more {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	color: #666;
	font-size: 12px;
}

.preview-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: #999;
}

.preview-content {
	padding: 16px;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.type-selector {
	:deep(.v-btn-toggle) {
		border-radius: 8px;
		overflow: hidden;
	}

	:deep(.v-btn) {
		text-transform: none !important;
		font-size: 12px !important;
	}
}

.preview-box {
	background: #f0f0f0;
	padding: 20px;
	border-radius: 8px;
	min-width: 300px;
	display: flex;
	justify-content: center;
}

/* 선물 스타일 - Player.vue에서 가져옴 */
.gift-content {
	display: flex;
	align-items: center;
	background: rgba(212, 212, 212, 0.2);
	padding: 8px 16px;
	border-radius: 10px;
	border: 1px solid rgba(212, 212, 212, 0.3);
	max-width: fit-content;
}

.gift-avatar {
	margin-right: 8px;
}

.gift-text {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	color: #000000;
	font-size: 16px;
}

.gift-image-container {
	position: relative;
	display: inline-flex;
	align-items: center;
	margin: 0 4px;
}

.gift-image {
	height: 32px;
	border-radius: 4px;
	object-fit: cover;
}

.gift-sender {
	font-weight: 600;
	color: #ffffff;
	margin-right: 4px;
}

.gift-amount {
	font-weight: 700;
	color: #FF6B6B;
}

.gift-combo {
	font-weight: 700;
	color: #FF6B6B;
}

.gift-icon {
	margin: 0 2px;
}

/* 구버전 스푼라디오 타입 */
.gift-content.legacy-style {
	background: rgba(255, 255, 255, 1) !important;
	color: #000000 !important;
	padding: 2px 8px;
	border-radius: 5px;
	border: none;
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 6px;
	max-width: fit-content;
	box-shadow: none;
}

.gift-content.legacy-style .gift-sender {
	color: #000000 !important;
	font-weight: 700;
	margin-right: 4px;
}

.gift-content.legacy-style .gift-amount {
	color: #FF6B6B !important;
	font-weight: 700;
	margin-right: 4px;
	font-size: 12px;
}

.gift-content.legacy-style .gift-combo {
	color: #FF6B6B !important;
	font-weight: 700;
	font-size: 12px;
}

.gift-content.legacy-style .gift-image {
	height: 40px;
	border-radius: 4px;
	object-fit: cover;
	margin-right: 6px;
}

/* 스푼라디오 타입 */
.gift-content.spoon-style {
	background: rgba(255, 255, 255, 1) !important;
	color: #000000 !important;
	padding: 6px 12px;
	border-radius: 6px;
	border: none;
	display: flex;
	align-items: center;
	max-width: fit-content;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.spoon-profile-stack {
	position: relative;
	width: 52px;
	height: 32px;
	flex-shrink: 0;
}

.spoon-profile-back {
	position: absolute;
	left: 23px;
	top: 0;
}

.spoon-profile-front {
	position: absolute;
	left: 0;
	top: 0;
}

.gift-content.spoon-style .gift-sender {
	color: #000000 !important;
	font-weight: 700;
	font-size: 14px;
	margin-left: 10px;
	margin-right: 3px;
}

.spoon-sticker-image {
	width: 20px;
	height: 30px;
	background-size: cover;
	background-position: center;
	background-repeat: no-repeat;
	flex-shrink: 0;
	margin-left: 2px;
	margin-right: 2px;
}

.gift-content.spoon-style .gift-amount {
	color: #FF6B6B !important;
	font-weight: 900;
	font-size: 14px;
	margin-left: 2px;
	margin-right: 2px;
}

.gift-content.spoon-style .gift-combo {
	color: #FF6B6B !important;
	font-weight: 900;
	font-size: 14px;
	margin-right: 2px;
}

/* 소피아 타입 */
.gift-content.sopia-style {
	display: flex;
	align-items: center;
	background: rgba(212, 212, 212, 0.8);
	padding: 8px 16px;
	border-radius: 10px;
	border: 1px solid rgba(212, 212, 212, 0.3);
	max-width: fit-content;
}

.gift-content.sopia-style .gift-sender {
	color: #333333 !important;
	font-weight: 600;
}

.gift-content.sopia-style .gift-text {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	color: #000000;
	font-size: 16px;
}

/* 선물 정보 패널 */
.gift-info-panel {
	background: #f5f5f5;
	border-radius: 8px;
	padding: 12px 16px;
	width: 100%;
}

.info-row {
	display: flex;
	margin-bottom: 6px;
	font-size: 13px;

	&:last-child {
		margin-bottom: 0;
	}
}

.info-label {
	color: #666;
	width: 80px;
	flex-shrink: 0;
}

.info-value {
	color: #333;
	font-weight: 500;
}
</style>
