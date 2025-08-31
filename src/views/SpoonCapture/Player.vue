<template>
    <v-main class="player-layout">

        <!-- 메인 컨테이너 -->
        <div class="main-container">
            <!-- 왼쪽: 채팅 플레이어 -->
            <div class="chat-player-section">
                <!-- 채팅창 -->
                <div class="spoon-chat-container" 
                     ref="chatContainerElement"
                     :style="{ 
                         '--live-bg-image': backgroundImage ? `url(${backgroundImage})` : `url(${liveInfo.imgUrl})`,
                         '--bg-size': backgroundSize,
                         '--bg-position': backgroundPosition,
                         '--chat-bg-color': this.hexToRgb(chatStyle.backgroundColor),
                         '--chat-bg-opacity': chatStyle.backgroundOpacity,
                         '--chat-text-color': chatStyle.textColor,
                         '--chat-nickname-color': chatStyle.nicknameColor,
                         '--chat-text-size': chatStyle.fontSize + 'px',
                         '--chat-border': `${chatStyle.borderWidth}px ${chatStyle.borderStyle} ${chatStyle.borderColor}`,
                         '--bg-opacity': backgroundOpacity,
                         '--bg-transform': `scale(${backgroundTransform.scale}) translate(${backgroundTransform.translateX}px, ${backgroundTransform.translateY}px)`,
                         '--chat-padding': chatStyle.padding + 'px',
                         '--chat-max-width': chatStyle.maxWidth > 0 ? chatStyle.maxWidth + 'px' : 'none',
                         '--gift-bg-color': giftStyle.backgroundColor,
                         '--gift-nickname-color': giftStyle.nicknameColor,
                         '--gift-amount-color': giftStyle.amountColor,
                         'width': chatContainerWidth + 'px'
                     }">
                    <div class="spoon-chat-messages" ref="chatContainer">
                        <div v-if="currentEvents.length === 0" class="empty-chat">
                            <v-icon large color="rgba(255,255,255,0.3)">mdi-chat-outline</v-icon>
                            <div class="mt-2">채팅이 없습니다</div>
                        </div>
                        
                        <div v-else class="chat-list">
                            <div 
                                v-for="event in currentEvents" 
                                :key="event.idx" 
                                class="spoon-chat-item"
                                :class="{ 'chat-hidden': hiddenChats.includes(event.idx) }"
                                :data-event-idx="event.idx"
                                @mouseenter="hoveredChat = event.idx"
                                @mouseleave="hoveredChat = null"
                            >
                                <!-- 채팅 메시지 -->
                                <div v-if="event.live_event === 'live_message'" class="chat-message">
                                    <div class="message-header">
                                        <v-avatar size="32" class="user-avatar">
                                            <v-img :src="event.data.data.user.profile_url">
                                                <template v-slot:placeholder>
                                                    <v-icon small color="white">mdi-account</v-icon>
                                                </template>
                                            </v-img>
                                        </v-avatar>
                                        <div class="user-info">
                                            <span class="username">{{ event.data.data.user.nickname }}</span>
                                            <div class="user-badges">
                                                <span v-if="event.data.data.user.is_vip" class="badge vip-badge">VIP</span>
                                                <span v-if="event.data.data.user.is_dj" class="badge dj-badge">DJ</span>
                                                <span v-if="event.data.data.user.subscribed_to_dj" class="badge sub-badge">구독</span>
                                                <span v-if="isManager(event.data.data.user.id)" class="badge manager-badge">매니저</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="message-bubble">
                                        {{ event.data.update_component.message.value }}
                                        <!-- 채팅 메시지 컨트롤 버튼 -->
                                        <div v-if="hoveredChat === event.idx" class="chat-controls message-controls">
                                            <v-btn 
                                                icon 
                                                small
                                                @click="captureMessage(event.idx)"
                                                class="visibility-btn"
                                                title="메시지 캡쳐"
                                            >
                                                <v-icon small>mdi-camera</v-icon>
                                            </v-btn>
                                            <v-btn 
                                                icon 
                                                small
                                                @click="toggleChatVisibility(event.idx)"
                                                class="visibility-btn"
                                            >
                                                <v-icon small>{{ hiddenChats.includes(event.idx) ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                                            </v-btn>
                                        </div>
                                    </div>
                                </div>

                                <!-- 선물 -->
                                <div v-else-if="event.live_event === 'live_present' || event.live_event === 'live_present_like'" class="gift-message">
                                    <div class="gift-content">
                                        <v-avatar size="24" class="gift-avatar">
                                            <v-img :src="event.data.data.author.profile_url">
                                                <template v-slot:placeholder>
                                                    <v-icon small color="white">mdi-account</v-icon>
                                                </template>
                                            </v-img>
                                        </v-avatar>
                                        <div class="gift-text">
                                            <span class="gift-sender">{{ event.data.data.author.nickname }}</span>
                                            <div class="gift-image-container" v-if="getStickerImage(event.data.data.sticker)">
                                                <img :src="getStickerImage(event.data.data.sticker) || ''" class="gift-image" :alt="getStickerName(event.data.data.sticker)">
                                            </div>
                                            <v-icon v-else small color="#FFD700" class="gift-icon">mdi-gift</v-icon>
                                            <span class="gift-amount">{{ event.data.data.amount }}스푼</span>
                                            <span class="gift-combo">X {{ event.data.data.combo }}</span>
                                        </div>
                                    </div>
                                    <!-- 로티 애니메이션 재생 버튼 -->
                                    <v-btn 
                                        v-if="getStickerLottieUrl(event.data.data.sticker)"
                                        @click="playGiftAnimation(event.data.data.sticker)"
                                        icon
                                        small
                                        class="lottie-play-btn"
                                        color="white"
                                    >
                                        <v-icon small>mdi-play</v-icon>
                                    </v-btn>
                                    <!-- 선물 메시지 컨트롤 버튼 -->
                                    <div v-if="hoveredChat === event.idx" class="chat-controls gift-controls">
                                        <v-btn 
                                            icon 
                                            small
                                            @click="toggleChatVisibility(event.idx)"
                                            class="visibility-btn"
                                        >
                                            <v-icon small>{{ hiddenChats.includes(event.idx) ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                                        </v-btn>
                                    </div>
                                </div>

                                <!-- 좋아요 -->
                                <div v-else-if="event.live_event === 'live_like'" class="like-message">
                                    <div class="like-content">
                                        <v-avatar size="20" class="like-avatar">
                                            <v-img :src="event.data.data.author.profile_url">
                                                <template v-slot:placeholder>
                                                    <v-icon x-small color="white">mdi-account</v-icon>
                                                </template>
                                            </v-img>
                                        </v-avatar>
                                        <v-icon small color="#FF69B4" class="like-icon">mdi-heart</v-icon>
                                        <span class="like-text">{{ event.data.data.author.nickname }}님이 좋아요를 눌렀습니다</span>
                                    </div>
                                    <!-- 좋아요 메시지 컨트롤 버튼 -->
                                    <div v-if="hoveredChat === event.idx" class="chat-controls like-controls">
                                        <v-btn 
                                            icon 
                                            small
                                            @click="captureMessage(event.idx)"
                                            class="visibility-btn"
                                            title="메시지 캡쳐"
                                        >
                                            <v-icon small>mdi-camera</v-icon>
                                        </v-btn>
                                        <v-btn 
                                            icon 
                                            small
                                            @click="toggleChatVisibility(event.idx)"
                                            class="visibility-btn"
                                        >
                                            <v-icon small>{{ hiddenChats.includes(event.idx) ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                                        </v-btn>
                                    </div>
                                </div>

                                <!-- 입장 -->
                                <div v-else-if="event.live_event === 'live_join'" class="join-message">
                                    <div class="join-content">
                                        <v-avatar size="20" class="join-avatar">
                                            <v-img :src="event.data.data.author.profile_url">
                                                <template v-slot:placeholder>
                                                    <v-icon x-small color="white">mdi-account</v-icon>
                                                </template>
                                            </v-img>
                                        </v-avatar>
                                        <v-icon small color="#4CAF50" class="join-icon">mdi-login</v-icon>
                                        <span class="join-text">{{ event.data.data.author.nickname }}님이 입장했습니다</span>
                                    </div>
                                    <!-- 입장 메시지 컨트롤 버튼 -->
                                    <div v-if="hoveredChat === event.idx" class="chat-controls join-controls">
                                        <v-btn 
                                            icon 
                                            small
                                            @click="captureMessage(event.idx)"
                                            class="visibility-btn"
                                            title="메시지 캡쳐"
                                        >
                                            <v-icon small>mdi-camera</v-icon>
                                        </v-btn>
                                        <v-btn 
                                            icon 
                                            small
                                            @click="toggleChatVisibility(event.idx)"
                                            class="visibility-btn"
                                        >
                                            <v-icon small>{{ hiddenChats.includes(event.idx) ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
                                        </v-btn>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 로티 애니메이션 오버레이 -->
                    <div v-if="lottieData" class="lottie-overlay">
                        <Lottie
                            ref="lottieOverlay"
                            :autoPlay="true"
                            :animationData="lottieData"
                            @complete="lottieComplete"
                            @enterFrame="onLottieEnterFrame"
                            class="lottie-animation"
                        />
                    </div>
                </div>

                <!-- 플레이어 컨트롤 -->
                <div class="player-control-container mt-3">
                    <div class="player-control-card">
                        <!-- 시간 정보 -->
                        <div class="time-info">
                            <span class="current-time">{{ formatTime(currentTime) }}</span>
                            <span class="time-separator">/</span>
                            <span class="total-time">{{ formatTime(totalTime) }}</span>
                        </div>
                        
                        <!-- 프로그레스 바 -->
                        <div class="progress-container" @click="onProgressClick" ref="progressContainer">
                            <div class="progress-track">
                                <div 
                                    class="progress-fill" 
                                    :style="{ width: `${totalTime > 0 ? (currentTime / totalTime) * 100 : 0}%` }"
                                ></div>
                                <div 
                                    class="progress-thumb" 
                                    :style="{ left: `${totalTime > 0 ? (currentTime / totalTime) * 100 : 0}%` }"
                                ></div>
                            </div>
                        </div>
                        
                        <!-- Lottie 애니메이션 컨트롤 (스티커 재생 중일 때만 표시) -->
                        <div v-if="lottieData" class="lottie-controls">
                            <div class="lottie-control-header">
                                <v-icon small color="#FF6B35">mdi-star-four-points</v-icon>
                                <span class="lottie-control-title">스티커 애니메이션</span>
                            </div>
                            
                            <div class="lottie-control-content">
                                <div class="lottie-control-buttons">
                                    <v-btn 
                                        @click="toggleLottiePlayback()" 
                                        icon 
                                        x-small
                                        class="lottie-control-btn"
                                        :class="{ 'playing': lottieIsPlaying }"
                                    >
                                        <v-icon small :color="lottieIsPlaying ? '#FF6B35' : '#666666'">
                                            {{ lottieIsPlaying ? 'mdi-pause' : 'mdi-play' }}
                                        </v-icon>
                                    </v-btn>
                                </div>
                                
                                <div class="lottie-progress">
                                    <v-slider
                                        v-model="lottieProgress"
                                        @input="seekLottie"
                                        min="0"
                                        max="100"
                                        step="1"
                                        hide-details
                                        dense
                                        class="lottie-progress-slider"
                                        color="#FF6B35"
                                        track-color="rgba(0,0,0,0.1)"
                                    ></v-slider>
                                </div>
                                
                                <div class="lottie-close-btn">
                                    <v-btn 
                                        @click="closeLottiePlayer()" 
                                        icon 
                                        x-small
                                        class="lottie-control-btn close-btn"
                                    >
                                        <v-icon small color="#666666">mdi-close</v-icon>
                                    </v-btn>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 플레이어 컨트롤 -->
                        <div class="player-controls">
                            <div class="control-buttons">
                                <v-btn 
                                    @click="seekTo(Math.max(0, currentTime - 10))" 
                                    icon 
                                    small
                                    class="control-btn"
                                >
                                    <v-icon color="#333333">mdi-rewind-10</v-icon>
                                </v-btn>
                                
                                <v-btn 
                                    @click="isPlaying ? stopPlayback() : startPlayback()" 
                                    icon 
                                    class="play-btn"
                                >
                                    <v-icon color="#333333">{{ isPlaying ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                                </v-btn>
                                
                                <v-btn 
                                    @click="seekTo(Math.min(totalTime, currentTime + 10))" 
                                    icon 
                                    small
                                    class="control-btn"
                                >
                                    <v-icon color="#333333">mdi-fast-forward-10</v-icon>
                                </v-btn>
                            </div>
                        </div>
                        
                        <!-- 캡쳐 컨트롤 -->
                        <div class="capture-controls">
                            <v-btn 
                                @click="captureChatContainer()" 
                                small
                                class="capture-btn"
                                title="채팅창을 이미지로 캡쳐"
                                :loading="isCaptureLoading"
                                :disabled="isCaptureLoading || isBackgroundLoading"
                            >
                                <v-icon small left>mdi-camera</v-icon>
                                채팅 캡쳐
                            </v-btn>
                            
                            <v-btn 
                                @click="setChatContainerAsBackground()" 
                                small
                                class="capture-btn"
                                title="채팅창을 배경으로 설정"
                                :loading="isBackgroundLoading"
                                :disabled="isCaptureLoading || isBackgroundLoading"
                            >
                                <v-icon small left>mdi-image</v-icon>
                                배경 설정
                            </v-btn>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 스티커 히스토리 섹션 -->
            <div class="sticker-history-section">
                <v-card class="sticker-history-card">
                    <v-card-title class="card-title d-flex justify-space-between align-center">
                        <div class="d-flex align-center">
                            <v-icon left>mdi-gift</v-icon>
                            스티커 히스토리
                        </div>
                        <v-menu offset-y>
                            <template v-slot:activator="{ on, attrs }">
                                <v-btn
                                    icon
                                    small
                                    v-bind="attrs"
                                    v-on="on"
                                    class="sort-btn"
                                >
                                    <v-icon small color="#333333">mdi-sort</v-icon>
                                </v-btn>
                            </template>
                            <v-list dense>
                                <v-list-item
                                    v-for="option in stickerSortOptions"
                                    :key="option.value"
                                    @click="stickerSortType = option.value"
                                    :class="{ 'v-list-item--active': stickerSortType === option.value }"
                                >
                                    <v-list-item-title>{{ option.text }}</v-list-item-title>
                                    <v-list-item-action v-if="stickerSortType === option.value">
                                        <v-icon small color="primary">mdi-check</v-icon>
                                    </v-list-item-action>
                                </v-list-item>
                            </v-list>
                        </v-menu>
                    </v-card-title>
                    <v-card-text class="sticker-history-content">
                        <div class="sticker-history-list" ref="stickerHistoryContainer">
                            <div 
                                v-for="(event, index) in presentEvents" 
                                :key="event.idx"
                                class="sticker-history-item"
                                @click="seekTo(event.relativeTime)"
                                :class="{ 'current': event.relativeTime === currentTime }"
                            >
                                <div class="sticker-info">
                                    <img 
                                        v-if="getStickerImage(event.data.data.sticker)"
                                        :src="getStickerImage(event.data.data.sticker) || ''" 
                                        class="sticker-thumbnail"
                                        :alt="getStickerName(event.data.data.sticker)"
                                    >
                                    <div class="sticker-details">
                                        <div class="sticker-title">
                                            <v-avatar size="20" class="mr-2">
                                                <v-img :src="event.data.data.author.profile_url">
                                                    <template v-slot:placeholder>
                                                        <v-icon x-small color="white">mdi-account</v-icon>
                                                    </template>
                                                </v-img>
                                            </v-avatar>
                                            {{ event.data.data.author.nickname }}
                                        </div>
                                        <div class="sticker-meta">
                                            {{ event.data.data.amount }}스푼 X{{ event.data.data.combo }}
                                        </div>
                                    </div>
                                </div>
                                <div class="sticker-time">
                                    {{ formatTime(event.relativeTime) }}
                                </div>
                            </div>
                        </div>
                        <div v-if="presentEvents.length === 0" class="no-stickers">
                            선물 이벤트가 없습니다
                        </div>
                    </v-card-text>
                </v-card>
            </div>

            <!-- 오른쪽: 컨트롤 패널 -->
            <div class="control-panel-section">
                <div class="control-panel">
                    
                    <!-- 기본 설정 -->
                    <v-card class="mb-4 control-card">
                        <v-card-title class="card-title">기본 설정</v-card-title>
                        <v-card-text>
                            <v-text-field
                                v-model.number="maxChatCount"
                                label="최대 채팅 수"
                                type="number"
                                min="10"
                                max="500"
                                dense
                                outlined
                                hide-details
                                class="mb-3"
                            ></v-text-field>
                            
                            <v-switch
                                v-model="autoScroll"
                                label="자동 스크롤"
                                dense
                                class="mt-0"
                            ></v-switch>
                            
                            <v-text-field
                                v-model.number="customPlayerWidth"
                                label="플레이어 너비 (px)"
                                type="number"
                                min="300"
                                max="1920"
                                dense
                                outlined
                                hide-details
                                class="mb-3"
                                :disabled="useAspectRatio"
                            ></v-text-field>
                            
                            <v-switch
                                v-model="useAspectRatio"
                                label="스푼 애니메이션에 창 맞추기"
                                dense
                                class="my-2"
                                hide-details
                            ></v-switch>
                            
                            <v-btn
                                @click="addGiftEvent"
                                color="primary"
                                small
                                outlined
                                class="mt-3"
                                block
                            >
                                스푼 선물 추가하기
                            </v-btn>
                        </v-card-text>
                    </v-card>

                    <!-- 배경 이미지 설정 -->
                    <v-card class="mb-4 control-card">
                        <v-card-title class="card-title">배경 이미지</v-card-title>
                        <v-card-text>
                            <input
                                type="file"
                                ref="backgroundInput"
                                accept="image/*"
                                @change="onBackgroundImageChange"
                                style="display: none"
                            >
                            <v-btn 
                                @click="openFileDialog" 
                                outlined 
                                small 
                                class="mb-3"
                                block
                            >
                                <v-icon left>mdi-image</v-icon>
                                배경 이미지 선택
                            </v-btn>
                            
                            <v-select
                                v-model="backgroundSize"
                                :items="backgroundSizeOptions"
                                label="크기"
                                dense
                                outlined
                                hide-details
                                class="mb-3"
                            ></v-select>
                            
                            <v-select
                                v-model="backgroundPosition"
                                :items="backgroundPositionOptions"
                                label="위치"
                                dense
                                outlined
                                hide-details
                                class="mb-3"
                            ></v-select>
                            
                            <label class="style-label">배경 투명도</label>
                            <v-slider
                                v-model="backgroundOpacity"
                                min="0"
                                max="1"
                                step="0.01"
                                thumb-label
                                hide-details
                                class="mb-3"
                            ></v-slider>
                            
                            <div class="background-controls mb-3">
								<div class="d-flex justify-space-between align-center mb-3">
									<label class="style-label">배경 이미지 조절</label>
									<v-btn 
										@click="resetBackgroundTransform" 
										small 
										outlined 
										class="mt-0"
									>
										초기화
									</v-btn>
								</div>

                                <v-row class="mb-1">
                                    <v-col cols="12" class="py-0">
                                        <v-slider
                                            v-model="backgroundTransform.scale"
                                            label="크기"
                                            min="0.1"
                                            max="3"
                                            step="0.1"
                                            thumb-label
											hide-details
                                        ></v-slider>
                                    </v-col>
                                    <v-col cols="12" class="py-0">
                                        <v-slider
                                            v-model="backgroundTransform.translateX"
                                            label="가로 위치"
                                            min="-200"
                                            max="200"
                                            step="10"
                                            thumb-label
											hide-details
                                        ></v-slider>
                                    </v-col>
                                    <v-col cols="12" class="py-0">
                                        <v-slider
                                            v-model="backgroundTransform.translateY"
                                            label="세로 위치"
                                            min="-200"
                                            max="200"
                                            step="10"
                                            thumb-label
											hide-details
                                        ></v-slider>
                                    </v-col>
                                </v-row>
                            </div>
                        </v-card-text>
                    </v-card>

                    <!-- 채팅창 스타일 -->
                    <v-card class="control-card mb-4">
                        <v-card-title class="card-title">채팅창 스타일</v-card-title>
                        <v-card-text>
                            <div class="mb-3">
                                <label class="style-label">배경색</label>
                                <input
                                    type="color"
                                    v-model="chatStyle.backgroundColor"
                                    class="color-picker"
                                >
                            </div>
                            
                            <div class="mb-3">
                                <label class="style-label">닉네임 색상</label>
                                <input
                                    type="color"
                                    v-model="chatStyle.nicknameColor"
                                    class="color-picker"
                                >
                            </div>
                            
                            <div class="mb-3">
                                <label class="style-label">채팅 텍스트 색상</label>
                                <input
                                    type="color"
                                    v-model="chatStyle.textColor"
                                    class="color-picker"
                                >
                            </div>
                            
                            <label class="style-label">채팅 배경 투명도</label>
                            <v-slider
                                v-model="chatStyle.backgroundOpacity"
                                min="0"
                                max="1"
                                step="0.01"
                                thumb-label
                                hide-details
                                class="mb-3"
                            ></v-slider>

                            <label class="style-label">텍스트 크기</label>
                            <v-slider
                                v-model="chatStyle.fontSize"
                                min="10"
                                max="20"
                                step="1"
                                thumb-label
                                hide-details
                                class="mb-3"
                            ></v-slider>
                            
                            <v-row class="mb-3" align="center">
                                <v-col cols="6">
                                    <div class="mb-0">
                                        <label class="style-label">테두리 두께</label>
                                        <v-text-field
                                            v-model.number="chatStyle.borderWidth"
                                            type="number"
                                            min="0"
                                            max="10"
                                            dense
                                            hide-details
                                            outlined
                                        ></v-text-field>
                                    </div>
                                </v-col>
                                <v-col cols="6">
                                    <div class="mb-0">
                                        <label class="style-label">테두리 색상</label>
                                        <input
                                            type="color"
                                            v-model="chatStyle.borderColor"
                                            class="color-picker"
                                        >
                                    </div>
                                </v-col>
                                <v-col cols="12">
                                    <v-select
                                        v-model="chatStyle.borderStyle"
                                        :items="borderStyleOptions"
                                        label="테두리 스타일"
                                        dense
                                        outlined
                                        hide-details
                                    ></v-select>
                                </v-col>
                            </v-row>
                            
                            <v-slider
                                v-model="chatStyle.padding"
                                label="여백"
                                min="5"
                                max="20"
                                step="1"
                                thumb-label
                                hide-details
                                class="mb-3"
                            ></v-slider>
                            
                            <v-text-field
                                v-model.number="chatStyle.maxWidth"
                                label="채팅창 넓이 (px)"
                                type="number"
                                min="0"
                                max="800"
                                dense
                                outlined
                                hide-details
                                hint="0을 입력하면 넓이 제한 없음"
                                persistent-hint
                            ></v-text-field>
                        </v-card-text>
                    </v-card>
                    
                    <!-- 선물 메시지 스타일 -->
                    <v-card class="control-card mb-4">
                        <v-card-title class="card-title">선물 메시지 스타일</v-card-title>
                        <v-card-text>
                            <div class="mb-3">
                                <label class="style-label">배경색</label>
                                <input
                                    type="color"
                                    v-model="giftStyle.backgroundColor"
                                    class="color-picker"
                                >
                            </div>
                            
                            <div class="mb-3">
                                <label class="style-label">닉네임 색상</label>
                                <input
                                    type="color"
                                    v-model="giftStyle.nicknameColor"
                                    class="color-picker"
                                >
                            </div>
                            
                            <div class="mb-3">
                                <label class="style-label">스푼/콤보 텍스트 색상</label>
                                <input
                                    type="color"
                                    v-model="giftStyle.amountColor"
                                    class="color-picker"
                                >
                            </div>
                        </v-card-text>
                    </v-card>
                </div>
            </div>
        </div>

    </v-main>
</template>

<script lang="ts">
import { Component, Mixins, Ref, Watch } from 'vue-property-decorator';
import GlobalMixins from '@/plugins/mixins';
import Lottie from 'lottie-web-vue';
import html2canvas from 'html2canvas';
const fs = window.require('fs');
const Database = window.require('better-sqlite3');
const axios = window.require('axios');

interface LiveEvent {
    idx: number;
    live_id: number;
    live_event: string;
    live_title: string;
    author_id: number;
    author_tag: string;
    author_nickname: string;
    data: any;
    saved_date: string;
    relativeTime: number;
}

interface LiveInfo {
    title: string;
    imgUrl: string;
    authorProfileUrl: string;
    authorNickname: string;
    authorTag: string;
    managerIds: number[];
    welcomeMessage: string;
}

@Component({
    components: {
        Lottie,
    },
})
export default class SpoonCapturePlayer extends Mixins(GlobalMixins) {
    private liveId: string = '';
    private allEvents: LiveEvent[] = [];
    private currentEvents: LiveEvent[] = [];
    private liveInfo: LiveInfo = {
        title: '',
        imgUrl: '',
        authorProfileUrl: '',
        authorNickname: '',
        authorTag: '',
        managerIds: [],
        welcomeMessage: ''
    };
    
    private isPlaying = false;
    private currentTime = 0;
    private totalTime = 0;
    private containerHeight = 930; // 기본값
    private startTime = 0;
    private playTimer: NodeJS.Timeout | null = null;
    
    private maxChatCount = 100;
    private autoScroll = true;
    private customPlayerWidth = 520;
    private useAspectRatio = false;
    private stickerSortType = 'oldest'; // 'oldest', 'newest', 'price'
    
    private lottieData: any = null;
    private lottieOptions: any = {};
    private lottieInstance: any = null;
    
    // 캡처 로딩 상태
    private isCaptureLoading = false;
    private isBackgroundLoading = false;
    private lottieStartTime: number = 0;
    private lottieAnimationDuration: number = 3000; // 3초
    private lottieCache: Map<string, any> = new Map(); // sticker.name을 키로 하는 캐시
    private lottieIsPlaying: boolean = false;
    private lottieProgress: number = 0;

    // 새로운 기능들을 위한 속성들
    private hiddenChats: number[] = [];
    private hoveredChat: number | null = null;
    private backgroundImage: string = '';
    private backgroundSize: string = 'cover';
    private backgroundPosition: string = 'center';
    private backgroundSizeOptions = [
        { text: '덮기', value: 'cover' },
        { text: '포함', value: 'contain' },
        { text: '늘이기', value: '100% 100%' },
        { text: '원본 크기', value: 'auto' }
    ];
    private backgroundPositionOptions = [
        { text: '중앙', value: 'center' },
        { text: '상단', value: 'top' },
        { text: '하단', value: 'bottom' },
        { text: '왼쪽', value: 'left' },
        { text: '오른쪽', value: 'right' },
        { text: '좌상단', value: 'top left' },
        { text: '우상단', value: 'top right' },
        { text: '좌하단', value: 'bottom left' },
        { text: '우하단', value: 'bottom right' }
    ];
    private chatStyle = {
        backgroundColor: '#666666',
        backgroundOpacity: 0.2,
        textColor: '#ffffff',
        nicknameColor: '#ffffff',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#cccccc',
        borderStyle: 'solid',
        padding: 9,
        maxWidth: 0
    };
    
    // maxChatCount 변경 시 실시간 적용을 위한 watcher
    @Watch('maxChatCount')
    onMaxChatCountChanged() {
        this.updateCurrentEvents();
    }
    
    // hex 색상을 RGB로 변환하는 함수
    hexToRgb(hex: string): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `${r}, ${g}, ${b}`;
        }
        return '255, 255, 255'; // 기본값
    }
    
    private giftStyle = {
        backgroundColor: 'rgba(212, 212, 212, 0.2)',
        nicknameColor: '#ffffff',
        amountColor: '#FF6B6B'
    };
    
    private backgroundTransform = {
        scale: 1,
        translateX: 0,
        translateY: 0
    };
    
    private backgroundOpacity = 0.6;
    
    private borderStyleOptions = [
        { text: '실선', value: 'solid' },
        { text: '점선', value: 'dotted' },
        { text: '파선', value: 'dashed' },
        { text: '없음', value: 'none' }
    ];

    private stickerSortOptions = [
        { text: '오래된 순', value: 'oldest' },
        { text: '최신순', value: 'newest' },
        { text: '가격 높은 순', value: 'price' }
    ];

    // Computed property for present events
    get presentEvents(): LiveEvent[] {
        const filtered = this.allEvents
            .filter(event => event.live_event === 'live_present' || event.live_event === 'live_present_like');
        
        switch (this.stickerSortType) {
            case 'newest':
                return filtered.sort((a, b) => b.relativeTime - a.relativeTime);
            case 'oldest':
                return filtered.sort((a, b) => a.relativeTime - b.relativeTime);
            case 'price':
                return filtered.sort((a, b) => {
                    const amountA = a.data?.data?.amount || 0;
                    const amountB = b.data?.data?.amount || 0;
                    return amountB - amountA; // 높은 가격 순
                });
            default:
                return filtered.sort((a, b) => a.relativeTime - b.relativeTime);
        }
    }

    // 채팅 컨테이너 width 계산 (520:930 비율 또는 사용자 설정값)
    get chatContainerWidth(): number {
        if (this.useAspectRatio) {
            const aspectRatio = 520 / 930; // 520:930 비율
            return Math.round(this.containerHeight * aspectRatio);
        } else {
            return this.customPlayerWidth;
        }
    }

    async mounted() {
        this.liveId = this.$route.params.liveId as string;
        console.log('Loading live data for ID:', this.liveId);
        await this.loadLiveData();
        
        // 컨테이너 높이 측정
        this.$nextTick(() => {
            this.updateContainerHeight();
        });
        
        // 윈도우 리사이즈 시 높이 재측정
        window.addEventListener('resize', this.updateContainerHeight);
    }

    beforeDestroy() {
        if (this.playTimer) {
            clearInterval(this.playTimer);
        }
        window.removeEventListener('resize', this.updateContainerHeight);
    }

    updateContainerHeight() {
        const container = this.$refs.chatContainerElement as HTMLElement;
        if (container) {
            this.containerHeight = container.clientHeight || 930;
            console.log('Container height updated:', this.containerHeight, 'Width calculated:', this.chatContainerWidth);
        }
    }

    async loadLiveData() {
        try {
            const dbPath = this.$path('userData', 'historydb', `${this.liveId}.db`);
            const allowEventList = [
                'live_update',
                'live_message',
                'live_join',
                'live_present',
                'live_present_like',
                'live_like',
            ];
            
            if (!fs.existsSync(dbPath)) {
                this.$noti({
                    type: 'error',
                    content: '방송 데이터 파일을 찾을 수 없습니다.'
                });
                return;
            }

            const db = new Database(dbPath, { readonly: true });
            
            // 모든 이벤트 가져오기
            const stmt = db.prepare(`
                SELECT idx, live_id, live_event, live_title, author_id, author_tag, author_nickname, data_json, saved_date
                FROM live_history_tbl 
                ORDER BY idx ASC
            `);
            
            const rows = stmt.all();
            db.close();
            
            if (rows.length === 0) {
                this.$noti({
                    type: 'info',
                    content: '방송 데이터가 없습니다.'
                });
                return;
            }

            // 시작 시간 설정
            this.startTime = new Date(rows[0].saved_date).getTime();
            
            // 이벤트 데이터 처리
            this.allEvents = [];
            for (const row of rows) {
                try {
                    if (!allowEventList.includes(row.live_event)) {
                        continue;
                    }
                    const data = JSON.parse(row.data_json);
                    const timestamp = new Date(row.saved_date).getTime();
                    const relativeTime = Math.floor((timestamp - this.startTime) / 1000);
                    
                    const event: LiveEvent = {
                        idx: row.idx,
                        live_id: row.live_id,
                        live_event: row.live_event,
                        live_title: row.live_title,
                        author_id: row.author_id,
                        author_tag: row.author_tag,
                        author_nickname: row.author_nickname,
                        data: data,
                        saved_date: row.saved_date,
                        relativeTime: relativeTime
                    };
                    
                    this.allEvents.push(event);
                    
                    // live_update 이벤트로 방송 정보 업데이트 (최신 정보로 계속 업데이트)
                    if (row.live_event === 'live_update' && data.data && data.data.live) {
                        const live = data.data.live;
                        this.liveInfo = {
                            title: live.title || this.liveInfo.title,
                            imgUrl: live.img_url || this.liveInfo.imgUrl,
                            authorProfileUrl: live.author?.profile_url || this.liveInfo.authorProfileUrl,
                            authorNickname: live.author?.nickname || this.liveInfo.authorNickname,
                            authorTag: live.author?.tag || this.liveInfo.authorTag,
                            managerIds: live.manager_ids || this.liveInfo.managerIds,
                            welcomeMessage: live.welcome_message || this.liveInfo.welcomeMessage
                        };
                    }
                } catch (error) {
                    console.error('Error parsing event data:', error);
                }
            }
            
            // 총 시간 설정
            if (this.allEvents.length > 0) {
                this.totalTime = Math.max(...this.allEvents.map(event => event.relativeTime)) + 10;
            }
            
            this.updateCurrentEvents();
            
        } catch (error) {
            console.error('Error loading live data:', error);
            this.$noti({
                type: 'error',
                content: '방송 데이터를 불러오는데 실패했습니다.'
            });
        }
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        
        if (this.isPlaying) {
            this.startPlayback();
        } else {
            this.stopPlayback();
        }
        
        // Lottie 애니메이션 상태 동기화
        this.syncLottieWithPlayer();
    }

    startPlayback() {
        if (this.playTimer) {
            clearInterval(this.playTimer);
        }
        
        this.isPlaying = true;
        this.playTimer = setInterval(() => {
            this.currentTime += 1;
            this.updateCurrentEvents();
            
            if (this.currentTime >= this.totalTime) {
                this.stopPlayback();
            }
        }, 1000);
    }

    stopPlayback() {
        this.isPlaying = false;
        if (this.playTimer) {
            clearInterval(this.playTimer);
            this.playTimer = null;
        }
    }

    seekTo(time: number) {
        this.currentTime = Math.max(0, Math.min(this.totalTime, time));
        this.updateCurrentEvents();

        // Lottie 애니메이션 동기화
        this.syncLottieWithPlayer();

        // 재생 중이면 타이머 재시작
        if (this.isPlaying) {
            this.stopPlayback();
            this.startPlayback();
        }
    }

    updateCurrentEvents() {
        // 현재 시간 이전의 이벤트들을 가져오기
        const showEventList = [
            'live_message',
            'live_join',
            'live_present',
            'live_present_like',
            'live_like',
        ];
        const eventsUpToNow = this.allEvents.filter(event => 
            showEventList.includes(event.live_event) && 
            event.relativeTime <= this.currentTime
        );
        
        // 최신 메시지를 기준으로 최대 채팅수만큼만 표시
        this.currentEvents = eventsUpToNow.slice(-this.maxChatCount);
        
        console.log(`현재 시간: ${this.currentTime}, 전체 이벤트: ${eventsUpToNow.length}, 표시 중: ${this.currentEvents.length}/${this.maxChatCount}`);
        
        // 현재 시간에 해당하는 선물 이벤트의 스티커 애니메이션 처리
        const currentPresentEvents = this.allEvents.filter(event => 
            (event.live_event === 'live_present' || event.live_event === 'live_present_like') &&
            event.relativeTime === this.currentTime &&
            event.data && event.data.sticker && event.data.sticker.id
        );
        
        // 현재 시간에 새로운 선물 이벤트가 있으면 애니메이션 재생
        if (currentPresentEvents.length > 0 && this.isPlaying) {
            const latestPresentEvent = currentPresentEvents[currentPresentEvents.length - 1];
            this.handleStickerAnimation(latestPresentEvent.data.sticker.id);
        }
        
        // 자동 스크롤
        if (this.autoScroll) {
            this.$nextTick(() => {
                const container = this.$refs.chatContainer as HTMLElement;
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
        }
        
        // 현재 시간까지의 live_update 이벤트 중 가장 최신 정보로 방송 정보 업데이트
        const liveUpdateEvents = this.allEvents.filter(event => 
            event.live_event === 'live_update' && event.relativeTime <= this.currentTime
        );
        if (liveUpdateEvents.length > 0) {
            const latestLiveUpdate = liveUpdateEvents[liveUpdateEvents.length - 1];
            if (latestLiveUpdate.data.data && latestLiveUpdate.data.data.live) {
                const live = latestLiveUpdate.data.data.live;
                this.liveInfo = {
                    title: live.title || this.liveInfo.title,
                    imgUrl: live.img_url || this.liveInfo.imgUrl,
                    authorProfileUrl: live.author?.profile_url || this.liveInfo.authorProfileUrl,
                    authorNickname: live.author?.nickname || this.liveInfo.authorNickname,
                    authorTag: live.author?.tag || this.liveInfo.authorTag,
                    managerIds: live.manager_ids || this.liveInfo.managerIds,
                    welcomeMessage: live.welcome_message || this.liveInfo.welcomeMessage
                };
            }
        }
        
        // 선물 이벤트에서 로티 애니메이션 처리
        const latestEvent = eventsUpToNow[eventsUpToNow.length - 1];
        if (latestEvent && (latestEvent.live_event === 'live_present' || latestEvent.live_event === 'live_present_like')) {
            this.handleStickerAnimation(latestEvent.data.data.sticker);
        }
    }

    async handleStickerAnimation(stickerName: string) {
        try {
            const sticker = this.$sopia.sticker.findSticker(stickerName, 0, true);
            if (sticker && sticker.lottie_url) {
                // 캐시에서 먼저 확인
                console.log('handleStickerAnimation', stickerName, this.lottieCache.has(stickerName));
                if (this.lottieCache.has(stickerName)) {
                    this.lottiePlay(this.lottieCache.get(stickerName));
                } else {
                    // 캐시에 없으면 새로 로드하고 캐시에 저장
                    const response = await axios.get(sticker.lottie_url);
                    this.lottieCache.set(stickerName, response.data);
                    this.lottiePlay(response.data);
                }
            }
        } catch (error) {
            console.error('Error loading sticker animation:', error);
        }
    }

    lottiePlay(animationData: any) {
        this.lottieData = animationData;
        this.lottieStartTime = this.currentTime;
        this.lottieIsPlaying = true; // 초기 상태를 재생 중으로 설정
        this.lottieProgress = 0;
        // 자동재생 활성화 - 컨트롤 패널과 함께 시작
    }

    syncLottieWithPlayer() {
        if (!this.lottieInstance || !this.lottieData) return;
        
        const currentTime = this.currentTime;
        const animationAge = currentTime - this.lottieStartTime;
        
        // 애니메이션이 10초 이상 오래되었으면 숨기기
        if (animationAge > 10) {
            this.lottieData = null;
            this.lottieInstance = null;
            return;
        }
        
        // 애니메이션이 지속 시간을 초과했으면 숨기기
        if (animationAge * 1000 > this.lottieAnimationDuration) {
            this.lottieData = null;
            this.lottieInstance = null;
            this.lottieIsPlaying = false;
            this.lottieProgress = 0;
            // 애니메이션 완료 후 3초 뒤에 자동으로 숨김
            setTimeout(() => {
                this.lottieData = null;
                this.lottieProgress = 0;
            }, 3000);
        } else {
            // 플레이어가 재생 중이면 애니메이션도 재생
            const elapsedMs = animationAge * 1000;
            if (elapsedMs >= 0 && elapsedMs < this.lottieAnimationDuration) {
                const progress = elapsedMs / this.lottieAnimationDuration;
                const frame = Math.floor(this.lottieInstance.totalFrames * progress);
                this.lottieInstance.goToAndPlay(frame, true);
            }
        }
        
        // 플레이어가 일시정지 상태면 애니메이션도 일시정지
        if (!this.isPlaying) {
            this.lottieInstance.pause();
        }
    }

    onLottieEnterFrame() {
        // Vue 이벤트를 통한 프레임 업데이트 처리
        const lottieInstance = (this.$refs.lottieOverlay as any)?.anim;
        if (lottieInstance && this.lottieIsPlaying) {
            const currentFrame = lottieInstance.currentFrame;
            const totalFrames = lottieInstance.totalFrames;
            
            if (totalFrames > 0) {
                this.lottieProgress = Math.round((currentFrame / totalFrames) * 100);
            }
        }
    }

    lottieComplete() {
        this.lottieIsPlaying = false;
        this.lottieProgress = 100;
        this.lottieData = null;
    }

    toggleLottiePlayback() {
        const lottieInstance = (this.$refs.lottieOverlay as any)?.anim;
        if (!lottieInstance) return;
        
        if (this.lottieIsPlaying) {
            lottieInstance.pause();
            this.lottieIsPlaying = false;
        } else {
            lottieInstance.play();
            this.lottieIsPlaying = true;
        }
    }

    seekLottie(progress: number) {
        const lottieInstance = (this.$refs.lottieOverlay as any)?.anim;
        if (!lottieInstance) return;
        
        const totalFrames = lottieInstance.totalFrames;
        const targetFrame = Math.floor((progress / 100) * totalFrames);
        
        if (this.lottieIsPlaying) {
            lottieInstance.goToAndPlay(targetFrame, true);
        } else {
            lottieInstance.goToAndStop(targetFrame, true);
        }
        
        this.lottieProgress = progress;
    }

    closeLottiePlayer() {
        this.lottieData = null;
        this.lottieInstance = null;
        this.lottieIsPlaying = false;
        this.lottieProgress = 0;
    }

    async addGiftEvent() {
        try {
            // 스티커 모달 열기
            const selectedSticker = await this.$openStickerModal();
            
            if (selectedSticker) {
                // 더미 선물 이벤트 생성
                const dummyGiftEvent: LiveEvent = {
                    idx: Date.now(),
                    live_id: parseInt(this.liveId) || 0,
                    live_event: 'live_present',
                    live_title: this.liveInfo.title,
                    author_id: 999999,
                    author_tag: 'testuser',
                    author_nickname: '테스트 유저',
                    saved_date: new Date().toISOString(),
                    relativeTime: this.currentTime,
                    data: {
                        live_event: 'live_present',
                        data: {
                            sticker: selectedSticker.name,
                            author: {
                                nickname: '테스트 유저',
                                profile_url: 'https://via.placeholder.com/40x40'
                            },
                            live: {
                                author: {
                                    nickname: this.liveInfo.authorNickname,
                                    profile_url: this.liveInfo.authorProfileUrl,
                                    tag: this.liveInfo.authorTag
                                },
                                title: this.liveInfo.title,
                                img_url: this.liveInfo.imgUrl,
                                manager_ids: this.liveInfo.managerIds,
                                welcome_message: this.liveInfo.welcomeMessage
                            },
                            amount: selectedSticker.price, // 스티커 가격
                            combo: 1 // 콤보는 1
                        }
                    }
                };

                // allEvents와 currentEvents에 추가
                this.allEvents.push(dummyGiftEvent);
                this.allEvents.sort((a, b) => a.relativeTime - b.relativeTime);
                
                // 현재 시간 기준으로 currentEvents 업데이트
                this.updateCurrentEvents();
                
                console.log('더미 선물 이벤트 추가됨:', dummyGiftEvent);
            }
        } catch (error) {
            console.error('선물 이벤트 추가 중 오류:', error);
        }
    }

    getEventClass(event: LiveEvent): string {
        switch (event.live_event) {
            case 'live_message':
                return 'message-event';
            case 'live_present':
            case 'live_present_like':
                return 'present-event';
            case 'live_like':
                return 'like-event';
            case 'live_join':
                return 'join-event';
            default:
                return '';
        }
    }

    isManager(userId: number): boolean {
        return this.liveInfo.managerIds.includes(userId);
    }

    getStickerName(stickerName: string): string {
        const sticker = this.$sopia.sticker.findSticker(stickerName, 0, true);
        return sticker ? sticker.name : stickerName;
    }

    getStickerLottieUrl(stickerName: string): string | null {
        const sticker = this.$sopia.sticker.findSticker(stickerName, 0, true);
        return sticker && sticker.lottie_url ? sticker.lottie_url : null;
    }

    async playGiftAnimation(stickerName: string) {
        console.log('여기는 NULL 이어야 한다고!!!', this.lottieData);
        await this.handleStickerAnimation(stickerName);
        console.log('playGiftAnimation', stickerName, this.lottieData);
     
        (this.$refs.lottieOverlay as any)?.play();
    }

    // 캡쳐 관련 메서드들
    async captureMessage(eventIdx: number) {
        try {
            // 메시지 엘리먼트 찾기 - 실제 메시지 내용만 캡쳐
            const messageElement = document.querySelector(`[data-event-idx="${eventIdx}"] .chat-message`) as HTMLElement;
            if (!messageElement) {
                console.error('메시지 엘리먼트를 찾을 수 없습니다.');
                return;
            }

            console.log('캡쳐할 메시지 엘리먼트:', messageElement);

            // Canvas API를 사용한 기본 캡쳐
            const canvas = await this.captureElementToCanvas(messageElement);
            const dataUrl = canvas.toDataURL('image/png');
            
            // Editor.vue에 이미지 추가
            await this.addImageToEditor(dataUrl, `message-${eventIdx}`);
            
            console.log('메시지 캡쳐 완료:', eventIdx);
        } catch (error) {
            console.error('메시지 캡쳐 실패:', error);
        }
    }

    async captureChatContainer() {
        if (this.isCaptureLoading || this.isBackgroundLoading) return;
        
        this.isCaptureLoading = true;
        try {
            const chatContainer = document.querySelector('.spoon-chat-container') as HTMLElement;
            if (!chatContainer) {
                console.error('채팅 컨테이너를 찾을 수 없습니다.');
                return;
            }

            const canvas = await this.captureElementToCanvas(chatContainer);
            const dataUrl = canvas.toDataURL('image/png');
            
            // Editor.vue에 이미지 추가
            await this.addImageToEditor(dataUrl, 'chat-container');
            
            console.log('채팅 컨테이너 캡쳐 완료');
        } catch (error) {
            console.error('채팅 컨테이너 캡쳐 실패:', error);
        } finally {
            this.isCaptureLoading = false;
        }
    }

    async setChatContainerAsBackground() {
        if (this.isCaptureLoading || this.isBackgroundLoading) return;
        
        this.isBackgroundLoading = true;
        try {
            const chatContainer = document.querySelector('.spoon-chat-container') as HTMLElement;
            if (!chatContainer) {
                console.error('채팅 컨테이너를 찾을 수 없습니다.');
                return;
            }

            const canvas = await this.captureElementToCanvas(chatContainer);
            const dataUrl = canvas.toDataURL('image/png');
            
            // Editor.vue의 배경으로 설정
            await this.setEditorBackground(dataUrl);
            
            console.log('채팅 컨테이너를 배경으로 설정 완료');
        } catch (error) {
            console.error('배경 설정 실패:', error);
        } finally {
            this.isBackgroundLoading = false;
        }
    }

    private async captureElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
        try {
            const rect = element.getBoundingClientRect();
            // html2canvas를 사용해서 실제 DOM 요소 캡쳐
            const canvas = await html2canvas(element, {
                backgroundColor: null, // 투명 배경 허용
                scale: 2, // 고해상도를 위한 스케일링
                useCORS: true, // CORS 이미지 허용
                allowTaint: false, // 보안을 위해 taint 방지
                width: rect.width,
                height: rect.height,
                logging: false, // 콘솔 로그 비활성화
                imageTimeout: 15000, // 이미지 로딩 타임아웃 (15초)
                removeContainer: true, // 임시 컨테이너 제거
                onclone: (document, element) => {
                    const hiddenElements = element.querySelectorAll('.chat-hidden, .chat-controls');
                    hiddenElements.forEach((el) => (el as HTMLElement).style.visibility = 'hidden');
                }
            });
            
            return canvas;
        } catch (error) {
            console.error('html2canvas 캡쳐 실패:', error);
            
            // 폴백: 기본 캔버스 생성
            const rect = element.getBoundingClientRect();
            const fallbackCanvas = document.createElement('canvas');
            const ctx = fallbackCanvas.getContext('2d')!;
            
            fallbackCanvas.width = rect.width * 2; // 고해상도
            fallbackCanvas.height = rect.height * 2;
            ctx.scale(2, 2);
            
            // 기본 배경과 텍스트
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, rect.width, rect.height);
            ctx.fillStyle = '#333333';
            ctx.font = '14px Arial';
            ctx.fillText('캡쳐 실패 - 폴백 모드', 10, 30);
            
            return fallbackCanvas;
        }
    }

    private async addImageToEditor(dataUrl: string, name: string) {
        try {
            // 이미지 실제 크기 분석
            const { width, height } = await this.getImageDimensions(dataUrl);
            
            // 메모리에서 바로 Editor.vue로 이미지 데이터 전달
            const imageData = {
                id: `capture_${Date.now()}`,
                name: name,
                src: dataUrl,
                type: 'image',
                x: 100,
                y: 100,
                width: width,
                height: height,
                opacity: 1
            };

            // 부모 컴포넌트에 이벤트 발생 (Editor.vue와 통신)
            this.$emit('add-image-to-editor', imageData);
            
            // 전역 이벤트 버스 사용 (대안)
            // this.$root.$emit('editor:add-image', imageData);
            
            // MasterView에게 에디터로 전환하라고 알림
            this.$emit('switch-to-editor');
            // this.$root.$emit('master:switch-to-editor');
            
            console.log('Editor에 이미지 추가 완료:', name, `${width}x${height}`);
        } catch (error) {
            console.error('Editor에 이미지 추가 실패:', error);
        }
    }

    private async getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };
            img.onerror = () => {
                console.warn('이미지 크기 분석 실패, 기본값 사용');
                resolve({
                    width: 300,
                    height: 200
                });
            };
            img.src = dataUrl;
        });
    }

    private async setEditorBackground(dataUrl: string) {
        try {
            // 메모리에서 바로 Editor.vue의 배경으로 설정
            const backgroundData = {
                type: 'background',
                src: dataUrl,
                timestamp: Date.now()
            };
            // MasterView에게 에디터로 전환하라고 알림
            this.$emit('switch-to-editor');

            // 부모 컴포넌트에 이벤트 발생
            this.$emit('set-editor-background', backgroundData);
            
            // 전역 이벤트 버스 사용 (대안)
            // this.$root.$emit('editor:set-background', backgroundData);
            
            // this.$root.$emit('master:switch-to-editor');
            
            console.log('Editor 배경 설정 완료');
        } catch (error) {
            console.error('Editor 배경 설정 실패:', error);
        }
    }

    getStickerImage(stickerId: string): string | null {
        try {
            const sticker = this.$sopia.sticker.findSticker(stickerId, 0, true);
            return sticker && sticker.image_thumbnail_web ? sticker.image_thumbnail_web : null;
        } catch {
            return null;
        }
    }

    // 채팅 컨트롤 관련 메서드들
    showChatControls(chatIdx: number) {
        this.hoveredChat = chatIdx;
    }

    hideChatControls(chatIdx: number) {
        this.hoveredChat = null;
    }

    toggleChatVisibility(chatIdx: number) {
        const index = this.hiddenChats.indexOf(chatIdx);
        if (index > -1) {
            this.hiddenChats.splice(index, 1);
        } else {
            this.hiddenChats.push(chatIdx);
        }
    }

    // 배경 이미지 변경 처리
    openFileDialog() {
        const input = this.$refs.backgroundInput as HTMLInputElement;
        if (input) {
            input.click();
        }
    }

    onBackgroundImageChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.backgroundImage = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    resetBackgroundTransform() {
        this.backgroundTransform = {
            scale: 1,
            translateX: 0,
            translateY: 0
        };
    }

    onProgressClick(event: MouseEvent) {
        if (this.totalTime <= 0) return;
        
        const progressContainer = event.currentTarget as HTMLElement;
        const rect = progressContainer.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = Math.floor(percentage * this.totalTime);
        
        this.currentTime = newTime;
        this.updateCurrentEvents();

        console.log('isPlaying', this.isPlaying);
        
        // 재생 중이면 타이머 재시작
        if (this.isPlaying) {
            this.stopPlayback();
            this.startPlayback();
        }
    }

    goBackToList() {
        this.$assign('/spoon-capture/');
    }

    formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
}
</script>

<style scoped>
/* 전체 레이아웃 */
.player-layout {
    min-height: calc(100vh - 48px);
    max-height: calc(100vh - 48px);
    overflow: hidden;
	padding: 0 !important;
}

.main-container {
    display: flex;
    height: calc(100vh - 112px);
    gap: 20px;
    padding: 20px;
}

/* 왼쪽 채팅 플레이어 섹션 */
.chat-player-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

/* 스티커 히스토리 섹션 */
.sticker-history-section {
    width: 280px;
    flex-shrink: 0;
    margin: 0 15px;
}

.sticker-history-card {
    height: 100%;
    background: rgba(0, 0, 0, 0.05) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.sticker-history-content {
    padding: 0 !important;
    height: calc(100vh - 200px);
    overflow: hidden;
}

.sticker-history-list {
    height: 100%;
    overflow-y: auto;
    padding: 8px;
}

.sticker-history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid #cacaca;
}

.sticker-history-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
}

.sticker-history-item.current {
    background: rgba(102, 126, 234, 0.3);
    border-color: rgba(102, 126, 234, 0.5);
    box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
}

.sticker-info {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
}

.sticker-thumbnail {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    margin-right: 8px;
    flex-shrink: 0;
    object-fit: cover;
}

.sticker-details {
    flex: 1;
    min-width: 0;
}

.sticker-title {
    font-size: 12px;
    font-weight: 500;
    color: #333333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
}

.sticker-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 10px;
}

.sticker-meta .author {
    color: #666666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 80px;
}

.sticker-meta .amount {
    color: #FF6B6B;
    font-weight: 600;
    white-space: nowrap;
}

.sticker-time {
    font-size: 10px;
    color: #666666;
    font-weight: 500;
    margin-left: 8px;
    flex-shrink: 0;
}

.no-stickers {
    text-align: center;
    color: #666666;
    font-size: 14px;
    padding: 40px 20px;
}

/* 오른쪽 컨트롤 패널 섹션 */
.control-panel-section {
    width: 350px;
    flex-shrink: 0;
}

.control-panel {
    height: 100%;
    overflow-y: auto;
    padding: 0 10px;
}

.panel-title {
    color: #333333;
    text-align: center;
    margin-bottom: 20px;
    font-size: 1.4rem;
    font-weight: 600;
    text-shadow: none;
}

.control-card {
    background: rgba(0, 0, 0, 0.05) !important;
    backdrop-filter: blur(20px);
    border: 2px solid rgba(0, 0, 0, 0.1) !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

.card-title {
    color: #333333 !important;
    font-size: 1.1rem !important;
    font-weight: 700 !important;
    padding-bottom: 8px !important;
    text-shadow: none;
}

/* 스타일 편집 컨트롤 */
.style-label {
    display: block;
    color: #333333;
    font-size: 14px;
    font-weight: 600;
    text-shadow: none;
}

.color-picker {
    width: 100%;
    height: 40px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    cursor: pointer;
    background: transparent;
}

.background-controls {
    background: rgba(0, 0, 0, 0.03);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 플레이어 컨트롤 */
.player-control-container {
    display: flex;
    justify-content: center;
    margin-top: 15px;
}

.player-control-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    padding: 16px 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    min-width: 300px;
}

/* 채팅창 컨테이너 */
.spoon-chat-container {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.spoon-chat-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: var(--live-bg-image);
    background-size: var(--bg-size, cover);
    background-position: var(--bg-position, center);
    background-repeat: no-repeat;
    transform: var(--bg-transform, scale(1) translate(0px, 0px));
    transform-origin: center;
    z-index: 0;
}

.spoon-chat-container::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, var(--bg-opacity, 0.7));
    z-index: 1;
}

.spoon-chat-messages {
    position: relative;
    height: 100%;
    overflow-y: auto;
    padding: var(--chat-padding, 12px);
    z-index: 2;
}

.empty-chat {
    text-align: center;
    padding: 40px 20px;
    color: rgba(255, 255, 255, 0.5);
}

.chat-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* 채팅 아이템 및 컨트롤 */
.spoon-chat-item {
    position: relative;
    animation: fadeInUp 0.3s ease-out;
    transition: all 0.3s ease;
}

.spoon-chat-item.chat-hidden {
    opacity: 0;
}

.spoon-chat-item.chat-hidden:hover {
    opacity: 0.3;
}

/* 채팅 컨트롤 버튼 스타일 */
.chat-controls {
    position: absolute;
    z-index: 10;
}

.message-controls {
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
}

.gift-controls {
    top: 10px;
    right: 10px;
}

.like-controls {
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
}

.join-controls {
    top: 50%;
    right: 10px;
    transform: translateY(-50%);
}

.visibility-btn {
    background: rgba(0, 0, 0, 0.7) !important;
    border: 2px solid rgba(255, 255, 255, 0.8) !important;
    border-radius: 20px;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5) !important;
    backdrop-filter: blur(4px) !important;
}

.visibility-btn:hover {
    background: rgba(0, 0, 0, 0.9) !important;
    border: 2px solid rgba(255, 255, 255, 1) !important;
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7) !important;
}

.visibility-btn .v-icon {
    color: rgba(255, 255, 255, 0.9) !important;
}

.visibility-btn:hover .v-icon {
    color: rgba(255, 255, 255, 1) !important;
}

/* 채팅 메시지 스타일 */
.chat-message {
    margin-bottom: 12px;
}

.message-header {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
}

.user-avatar {
    margin-right: 8px;
}

.user-info {
    display: flex;
    gap: 2px;
}

.username {
    color: var(--chat-nickname-color, #ffffff);
    font-weight: 600;
    font-size: var(--chat-text-size, 13px);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.user-badges {
    display: flex;
    height: fit-content;
    align-self: center;
    gap: 4px;
}

.badge {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.vip-badge {
    background: linear-gradient(45deg, #1C1E35, #1C1E35);
    color: #000;
}

.dj-badge {
    background: linear-gradient(45deg, #FF4100, #FF4100);
    color: #fff;
}

.sub-badge {
    background: linear-gradient(45deg, #FF69B4, #FF1493);
    color: #fff;
}

.manager-badge {
    background: linear-gradient(45deg, #81D4A8, #81D4A8);
    color: #fff;
}

.message-bubble {
    position: relative;
    background: rgba(var(--chat-bg-color, 255, 255, 255), var(--chat-bg-opacity, 0.15));
    color: var(--chat-text-color, #ffffff);
    padding: var(--chat-padding, 10px 14px);
    border-radius: 18px;
    font-size: var(--chat-text-size, 13px);
    line-height: 1.4;
    word-wrap: break-word;
    white-space: pre-wrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    border: var(--chat-border, 1px solid rgba(255, 255, 255, 0.2));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    max-width: var(--chat-max-width, none);
}

/* 선물 메시지 스타일 */
.gift-message {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
}

.gift-content {
    display: flex;
    align-items: center;
    background: var(--gift-bg-color);
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid rgba(212, 212, 212, 0.3);
    backdrop-filter: blur(5px);
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
    color: var(--chat-text-color, #000000);
    font-size: 16px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.gift-image-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    margin: 0 4px;
}

.gift-image {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    object-fit: cover;
}

.lottie-play-btn {
    background: rgba(180, 17, 17, 0.7) !important;
    border-radius: 50%;
    width: 32px !important;
    height: 32px !important;
    margin-left: 8px;
    border: 1px solid rgba(255, 255, 255, 0.5);
    opacity: 0.8;
    transition: opacity 0.2s ease;
}

.lottie-play-btn:hover {
    opacity: 1;
    background: rgba(161, 24, 24, 0.9) !important;
    border-color: rgba(255, 255, 255, 0.9);
}

.gift-sender {
    font-weight: 600;
    color: var(--gift-nickname-color);
    margin-right: 4px;
}

.gift-name {
    font-weight: 600;
    color: #ffffff;
}

.gift-amount {
    font-weight: 700;
    color: var(--gift-amount-color);
}

.gift-combo {
    font-weight: 700;
    color: var(--gift-amount-color);
}

.gift-icon {
    margin: 0 2px;
}

/* 좋아요 메시지 스타일 */
.like-message {
    margin-bottom: 6px;
}

.like-content {
    display: flex;
    align-items: center;
    background: rgba(255, 105, 180, 0.15);
    padding: 6px 10px;
    border-radius: 16px;
    border: 1px solid rgba(255, 105, 180, 0.2);
}

.like-avatar {
    border: 1px solid #FF69B4;
    margin-right: 6px;
}

.like-text {
    color: var(--chat-text-color, #ffffff);
    font-size: var(--chat-text-size, 12px);
    margin-left: 4px;
}

.like-icon {
    margin-right: 4px;
}

/* 입장 메시지 스타일 */
.join-message {
    margin-bottom: 6px;
}

.join-content {
    display: flex;
    align-items: center;
    background: rgba(76, 175, 80, 0.15);
    padding: 6px 10px;
    border-radius: 16px;
    border: 1px solid rgba(76, 175, 80, 0.2);
}

.join-avatar {
    border: 1px solid #4CAF50;
    margin-right: 6px;
}

.join-text {
    color: var(--chat-text-color, #ffffff);
    font-size: var(--chat-text-size, 12px);
    margin-left: 4px;
}

.join-icon {
    margin-right: 4px;
}

/* 로티 애니메이션 */
.lottie-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
}

.lottie-animation {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
}

/* 스크롤바 스타일링 */
.spoon-chat-messages::-webkit-scrollbar {
    width: 6px;
}

.spoon-chat-messages::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.spoon-chat-messages::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
}

.spoon-chat-messages::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
}

/* 애니메이션 */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 플레이어 컨트롤 */
.player-control-container {
    background: rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(20px);
	width: 520px;
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.player-control-card {
    background: transparent;
}

.time-info {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #333333;
}

.current-time, .total-time {
    color: #333333;
    font-size: 14px;
    font-weight: 600;
}

.time-separator {
    color: rgba(0, 0, 0, 0.6);
    font-size: 14px;
}

.progress-container {
    cursor: pointer;
    padding: 8px 0;
}

.progress-track {
    width: 100%;
    height: 6px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
    position: relative;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 3px;
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(102, 126, 234, 0.5);
}

.progress-thumb {
    position: absolute;
    top: 50%;
    width: 16px;
    height: 16px;
    background: #ffffff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: left 0.3s ease;
}

.progress-thumb::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
}

.control-buttons {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
}

.control-btn {
    background: rgba(0, 0, 0, 0.1) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.2) !important;
    transition: all 0.3s ease !important;
}

.control-btn:hover {
    background: rgba(0, 0, 0, 0.2) !important;
    transform: scale(1.1);
}

.play-btn {
    background: linear-gradient(45deg, #667eea, #764ba2) !important;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4) !important;
    transition: all 0.3s ease !important;
}

.play-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6) !important;
}

.play-btn.playing {
    background: linear-gradient(45deg, #ff6b6b, #ff8e8e) !important;
    box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4) !important;
}

.play-btn.playing:hover {
    box-shadow: 0 6px 25px rgba(255, 107, 107, 0.6) !important;
}

/* 스크롤바 스타일링 */
.control-panel::-webkit-scrollbar {
    width: 6px;
}

.control-panel::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
}

.control-panel::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
}

.control-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
}

/* Lottie 애니메이션 컨트롤 스타일 */
.lottie-controls {
    background: rgba(255, 107, 53, 0.05);
    border: 1px solid rgba(255, 107, 53, 0.2);
    border-radius: 8px;
    padding: 8px;
    margin-bottom: 8px;
}

.lottie-control-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
}

.lottie-control-title {
    font-size: 11px;
    font-weight: 600;
    color: #FF6B35;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.lottie-control-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.lottie-control-buttons {
    display: flex;
    align-items: center;
    gap: 4px;
}

.lottie-control-btn {
    min-width: 28px !important;
    width: 28px !important;
    height: 28px !important;
    background: rgba(255, 107, 53, 0.1) !important;
    border: 1px solid rgba(255, 107, 53, 0.3) !important;
    border-radius: 6px !important;
}

.lottie-control-btn:hover {
    background: rgba(255, 107, 53, 0.2) !important;
    transform: scale(1.05);
}

.lottie-control-btn.playing {
    background: rgba(255, 107, 53, 0.3) !important;
    border-color: rgba(255, 107, 53, 0.5) !important;
    box-shadow: 0 0 8px rgba(255, 107, 53, 0.3) !important;
}

.lottie-progress {
    flex: 1;
    margin-left: 8px;
}

.lottie-progress-slider {
    margin: 0 !important;
}

.lottie-progress-slider .v-slider__track-container {
    height: 4px !important;
}

.lottie-progress-slider .v-slider__thumb {
    width: 12px !important;
    height: 12px !important;
    background: #FF6B35 !important;
    border: 2px solid #ffffff !important;
}

.lottie-progress-slider .v-slider__track-fill {
    background: #FF6B35 !important;
}

.lottie-close-btn {
    margin-left: 8px;
}

.lottie-control-btn.close-btn {
    background: rgba(255, 0, 0, 0.1) !important;
    border: 1px solid rgba(255, 0, 0, 0.3) !important;
}

.lottie-control-btn.close-btn:hover {
    background: rgba(255, 0, 0, 0.2) !important;
}

/* 캡쳐 컨트롤 스타일 */
.capture-controls {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.capture-btn {
    background: rgba(0, 0, 0, 0.05) !important;
    border: 1px solid rgba(0, 0, 0, 0.1) !important;
    color: #333333 !important;
    font-size: 12px !important;
    padding: 0 12px !important;
    height: 32px !important;
}

.capture-btn:hover {
    background: rgba(0, 0, 0, 0.1) !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

/* 채팅 컨트롤 버튼 간격 조정 */
.chat-controls {
    display: flex;
    gap: 4px;
}

.visibility-btn + .visibility-btn {
    margin-left: 0 !important;
}
</style>