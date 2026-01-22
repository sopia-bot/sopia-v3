<template>
	<v-dialog
		v-model="dialogOpen"
		persistent
		max-width="520px"
		content-class="service-shutdown-dialog"
	>
		<v-card class="shutdown-card" dark>
			<!-- Falling leaves animation -->
			<div class="falling-leaves">
				<div v-for="i in 12" :key="i" class="leaf" :style="getLeafStyle(i)">
					<svg viewBox="0 0 24 24" width="16" height="16">
						<path fill="currentColor" d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
					</svg>
				</div>
			</div>

			<v-card-text class="card-content">
				<!-- Sunset/twilight gradient background -->
				<div class="twilight-bg"></div>

				<!-- Main content -->
				<div class="content-wrapper">
					<!-- Icon with gentle pulse -->
					<div class="icon-container">
						<div class="icon-glow"></div>
						<v-icon class="sunset-icon" size="72">mdi-weather-sunset</v-icon>
					</div>

					<!-- Title with elegant typography -->
					<h1 class="shutdown-title">
						<span class="title-line">서비스 종료</span>
						<span class="title-sub">안내</span>
					</h1>

					<!-- Decorative divider -->
					<div class="divider">
						<span class="divider-line"></span>
						<v-icon size="16" class="divider-icon">mdi-heart-outline</v-icon>
						<span class="divider-line"></span>
					</div>

					<!-- Message content -->
					<div class="message-content">
						<p class="date-highlight">
							<span class="date-text">2026년 2월 1일</span>
						</p>
						<p class="main-message">
							SOPIA 서비스가 종료됩니다.
						</p>
						<p class="sub-message">
							그동안 SOPIA를 사랑해주신<br>
							모든 분들께 진심으로 감사드립니다.
						</p>
					</div>

					<!-- Additional info -->
					<div class="additional-info">
						<p class="info-highlight">
							방송 매니저 이용은 못 하지만,<br>
							지금까지 했었던 추억들은 계속해서 볼 수 있습니다.
						</p>
						<p class="info-sub">
							<v-icon size="14" class="info-icon">mdi-star-four-points</v-icon>
							룰렛 킵, 애청지수 등은 언제든지 확인하러 와주세요.
							<v-icon size="14" class="info-icon">mdi-star-four-points</v-icon>
						</p>
					</div>

					<!-- Farewell quote -->
					<div class="farewell-quote">
						<span class="farewell-text">For Your Voice</span>
					</div>
				</div>
			</v-card-text>

			<v-card-actions class="card-actions">
				<div class="actions-wrapper">
					<!-- Don't show for a day checkbox -->
					<v-checkbox
						v-model="dontShowToday"
						hide-details
						dense
						dark
						class="dont-show-checkbox"
					>
						<template v-slot:label>
							<span class="checkbox-label">하루동안 보지 않기</span>
						</template>
					</v-checkbox>

					<!-- Close button -->
					<v-btn
						class="close-btn"
						text
						@click="closeDialog"
					>
						<span class="btn-text">확인</span>
					</v-btn>
				</div>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';

const STORAGE_KEY = 'serviceShutdownDialogHideUntil';
const SHUTDOWN_DATE = new Date('2026-02-01T00:00:00+09:00'); // KST

@Component
export default class ServiceShutdownDialog extends Mixins(GlobalMixins) {
	@Prop({ type: Boolean, default: false }) public open!: boolean;

	public dialogOpen = false;
	public dontShowToday = false;

	@Watch('open', { immediate: true })
	public onOpenChange(val: boolean) {
		if (val) {
			this.checkAndShowDialog();
		}
	}

	public created() {
		// 앱 시작 시 자동으로 표시 여부 확인
		this.checkAndShowDialog();
	}

	public checkAndShowDialog() {
		// 서비스 종료일이 지났으면 표시하지 않음
		if (new Date() >= SHUTDOWN_DATE) {
			return;
		}

		// 하루동안 보지 않기 체크 확인
		const hideUntil = this.$cfg.get(STORAGE_KEY);
		if (hideUntil) {
			const hideUntilDate = new Date(Number(hideUntil));
			if (new Date() < hideUntilDate) {
				return;
			}
		}

		this.dialogOpen = true;
	}

	public closeDialog() {
		if (this.dontShowToday) {
			// 24시간 후까지 숨김
			const hideUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
			this.$cfg.set(STORAGE_KEY, hideUntil.getTime().toString());
			this.$cfg.save();
		}

		this.dialogOpen = false;
		this.$emit('update:open', false);
		this.$emit('close');
	}

	public getLeafStyle(index: number) {
		const delay = (index * 0.8) + Math.random() * 2;
		const duration = 8 + Math.random() * 4;
		const left = (index * 8) + Math.random() * 5;
		const size = 12 + Math.random() * 8;

		return {
			left: `${left}%`,
			animationDelay: `${delay}s`,
			animationDuration: `${duration}s`,
			fontSize: `${size}px`,
			opacity: 0.3 + Math.random() * 0.3,
		};
	}
}
</script>

<style lang="scss" scoped>
@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

// Color palette - warm autumn sunset tones
$twilight-start: #2d1b4e;
$twilight-mid: #4a2c5a;
$twilight-end: #1a1a2e;
$sunset-orange: #e07b4c;
$sunset-pink: #c97b84;
$sunset-gold: #d4a574;
$warm-white: #f5ebe0;
$muted-text: #b8a9c9;

.service-shutdown-dialog {
	border-radius: 20px !important;
	overflow: visible !important;
}

.shutdown-card {
	background: linear-gradient(
		180deg,
		$twilight-start 0%,
		$twilight-mid 50%,
		$twilight-end 100%
	) !important;
	border-radius: 20px !important;
	overflow: hidden;
	position: relative;
	border: 1px solid rgba(255, 255, 255, 0.08);
	box-shadow:
		0 25px 50px -12px rgba(0, 0, 0, 0.5),
		0 0 100px rgba($sunset-orange, 0.15);
}

// Falling leaves animation
.falling-leaves {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 100%;
	overflow: hidden;
	pointer-events: none;
	z-index: 1;
}

.leaf {
	position: absolute;
	top: -20px;
	color: $sunset-gold;
	animation: falling linear infinite;

	svg {
		animation: swaying 2s ease-in-out infinite;
	}
}

@keyframes falling {
	0% {
		transform: translateY(-20px) rotate(0deg);
	}
	100% {
		transform: translateY(500px) rotate(360deg);
	}
}

@keyframes swaying {
	0%, 100% {
		transform: translateX(0) rotate(0deg);
	}
	50% {
		transform: translateX(15px) rotate(15deg);
	}
}

.card-content {
	position: relative;
	padding: 40px 32px 24px !important;
	z-index: 2;
}

.twilight-bg {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 200px;
	background: radial-gradient(
		ellipse at 50% 0%,
		rgba($sunset-orange, 0.25) 0%,
		rgba($sunset-pink, 0.1) 40%,
		transparent 70%
	);
	pointer-events: none;
}

.content-wrapper {
	position: relative;
	text-align: center;
}

// Icon styling
.icon-container {
	position: relative;
	display: inline-block;
	margin-bottom: 20px;
}

.icon-glow {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	width: 100px;
	height: 100px;
	background: radial-gradient(
		circle,
		rgba($sunset-orange, 0.4) 0%,
		rgba($sunset-orange, 0) 70%
	);
	animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% {
		transform: translate(-50%, -50%) scale(1);
		opacity: 0.6;
	}
	50% {
		transform: translate(-50%, -50%) scale(1.2);
		opacity: 0.3;
	}
}

.sunset-icon {
	color: $sunset-orange !important;
	filter: drop-shadow(0 0 20px rgba($sunset-orange, 0.5));
	animation: iconFloat 4s ease-in-out infinite;
}

@keyframes iconFloat {
	0%, 100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-5px);
	}
}

// Title styling
.shutdown-title {
	font-family: 'GangwonEdu_OTFBoldA', serif;
	margin-bottom: 16px;
	line-height: 1.3;
}

.title-line {
	display: block;
	font-size: 32px;
	font-weight: 400;
	color: $warm-white;
	letter-spacing: 4px;
	text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.title-sub {
	display: block;
	font-size: 24px;
	font-weight: 300;
	color: $sunset-gold;
	letter-spacing: 8px;
	margin-top: 4px;
}

// Divider
.divider {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12px;
	margin: 20px 0;
}

.divider-line {
	width: 60px;
	height: 1px;
	background: linear-gradient(
		90deg,
		transparent,
		rgba($sunset-gold, 0.5),
		transparent
	);
}

.divider-icon {
	color: $sunset-pink !important;
	opacity: 0.7;
}

// Message content
.message-content {
	margin-bottom: 24px;
}

.date-highlight {
	margin-bottom: 12px;
}

.date-text {
	display: inline-block;
	font-family: 'SUIT Variable', sans-serif;
	font-size: 20px;
	font-weight: 700;
	color: $sunset-orange;
	padding: 8px 24px;
	background: rgba($sunset-orange, 0.15);
	border: 1px solid rgba($sunset-orange, 0.3);
	border-radius: 30px;
	letter-spacing: 2px;
}

.main-message {
	font-family: 'SUIT Variable', sans-serif;
	font-size: 18px;
	font-weight: 600;
	color: $warm-white;
	margin-bottom: 16px;
	letter-spacing: 1px;
}

.sub-message {
	font-family: 'SUIT Variable', sans-serif;
	font-size: 14px;
	color: $muted-text;
	line-height: 1.8;
	letter-spacing: 0.5px;
}

// Additional info section
.additional-info {
	margin-bottom: 20px;
	padding: 16px 20px;
	background: rgba($sunset-gold, 0.08);
	border: 1px solid rgba($sunset-gold, 0.2);
	border-radius: 12px;
}

.info-highlight {
	font-family: 'SUIT Variable', sans-serif;
	font-size: 14px;
	font-weight: 500;
	color: $warm-white;
	line-height: 1.7;
	margin-bottom: 12px;
}

.info-sub {
	font-family: 'SUIT Variable', sans-serif;
	font-size: 13px;
	color: $sunset-gold;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	margin: 0;
}

.info-icon {
	color: $sunset-gold !important;
	opacity: 0.7;
}

// Farewell quote
.farewell-quote {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px 16px;
	background: rgba(255, 255, 255, 0.03);
	border-radius: 12px;
	border: 1px solid rgba(255, 255, 255, 0.05);
}

.farewell-text {
	font-family: 'Great Vibes', 'Dancing Script', cursive;
	font-size: 22px;
	color: $sunset-gold;
	letter-spacing: 1px;
	text-shadow: 0 2px 10px rgba($sunset-gold, 0.3);
}

// Card actions
.card-actions {
	padding: 0 32px 28px !important;
	position: relative;
	z-index: 2;
}

.actions-wrapper {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.dont-show-checkbox {
	margin: 0 !important;
	padding: 0 !important;

	::v-deep .v-input--selection-controls__input {
		margin-right: 6px;

		.v-icon {
			color: $muted-text !important;
			font-size: 20px;
		}
	}

	::v-deep .v-input--selection-controls__ripple {
		display: none;
	}
}

.checkbox-label {
	font-family: 'SUIT Variable', sans-serif;
	font-size: 13px;
	color: $muted-text;
	letter-spacing: 0.5px;
}

.close-btn {
	background: linear-gradient(
		135deg,
		rgba($sunset-orange, 0.2) 0%,
		rgba($sunset-pink, 0.2) 100%
	) !important;
	border: 1px solid rgba($sunset-orange, 0.3) !important;
	border-radius: 25px !important;
	padding: 8px 32px !important;
	transition: all 0.3s ease;

	&:hover {
		background: linear-gradient(
			135deg,
			rgba($sunset-orange, 0.35) 0%,
			rgba($sunset-pink, 0.35) 100%
		) !important;
		border-color: rgba($sunset-orange, 0.5) !important;
		transform: translateY(-1px);
	}

	.btn-text {
		font-family: 'SUIT Variable', sans-serif;
		font-size: 14px;
		font-weight: 600;
		color: $warm-white;
		letter-spacing: 2px;
	}
}
</style>
