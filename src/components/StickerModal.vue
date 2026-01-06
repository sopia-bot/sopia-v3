<template>
    <v-dialog v-model="dialog" max-width="800px" persistent>
        <!-- 사용자 검색 다이얼로그 -->
        <v-dialog v-model="userSearchDialog" max-width="500" persistent>
            <v-card>
                <v-card-title class="headline purple white--text">
                    <v-icon left color="white">mdi-account-search</v-icon>
                    시그니처 스푼 추가
                    <v-spacer></v-spacer>
                    <v-btn icon dark @click="closeUserSearchDialog">
                        <v-icon>mdi-close</v-icon>
                    </v-btn>
                </v-card-title>

                <v-card-text class="pa-4">
                    <v-text-field
                        v-model="searchText"
                        @keydown="searchKeyDown"
                        placeholder="닉네임 또는 태그로 검색..."
                        prepend-inner-icon="mdi-magnify"
                        outlined
                        clearable
                        hide-details="auto"
                        class="mb-4"
                        :loading="loadingSignatureStickers"
                    />

                    <v-list v-if="searchResults.length > 0" class="user-search-list">
                        <v-list-item
                            v-for="user in searchResults"
                            :key="user.id"
                            @click="addSignatureUser(user)"
                            :disabled="isUserAlreadyAdded(user.id) || loadingSignatureStickers"
                            class="user-item"
                        >
                            <v-list-item-avatar class="mr-4">
                                <v-img :src="user.profile_url" class="rounded-circle" />
                            </v-list-item-avatar>
                            <v-list-item-content>
                                <v-list-item-title class="font-weight-medium">
                                    {{ user.nickname }}
                                </v-list-item-title>
                                <v-list-item-subtitle class="text-caption">
                                    @{{ user.tag }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                            <v-list-item-action v-if="isUserAlreadyAdded(user.id)">
                                <v-chip small color="grey" text-color="white">추가됨</v-chip>
                            </v-list-item-action>
                            <v-list-item-action v-else>
                                <v-icon color="primary">mdi-chevron-right</v-icon>
                            </v-list-item-action>
                        </v-list-item>
                    </v-list>

                    <div v-else-if="searchText && searchText.length > 0" class="text-center py-8">
                        <v-icon size="48" color="grey lighten-1">mdi-account-search</v-icon>
                        <p class="text-body-2 grey--text mt-2">검색 결과가 없습니다</p>
                    </div>

                    <div v-else class="text-center py-8">
                        <v-icon size="48" color="grey lighten-1">mdi-account-plus</v-icon>
                        <p class="text-body-2 grey--text mt-2">사용자를 검색하세요</p>
                    </div>
                </v-card-text>

                <v-card-actions class="pa-4">
                    <v-spacer></v-spacer>
                    <v-btn text @click="closeUserSearchDialog">닫기</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-card>
            <v-card-title class="headline">
                <v-icon left>mdi-sticker-emoji</v-icon>
                스티커 선택
                <v-spacer></v-spacer>
                <v-btn icon @click="close">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-card-title>

            <v-card-text class="pa-0">
                <div class="sticker-modal-content">
                    <!-- 좌측 카테고리 탭 -->
                    <div class="category-tabs">
                        <v-list dense>
                            <v-list-item
                                v-for="(category, index) in allCategories"
                                :key="'cat-' + index + '-' + category.id"
                                @click="selectedCategoryIndex = index"
                                :class="{ 'v-list-item--active': selectedCategoryIndex === index }"
                                class="category-item"
                            >
                                <v-list-item-content>
                                    <v-list-item-title>{{ getCategoryDisplayTitle(category) }}</v-list-item-title>
                                </v-list-item-content>
                                <v-list-item-action v-if="category.signatureUserId" class="my-0">
                                    <v-btn icon x-small @click.stop="removeSignatureUser(category.signatureUserId)">
                                        <v-icon small color="grey">mdi-close</v-icon>
                                    </v-btn>
                                </v-list-item-action>
                            </v-list-item>
                        </v-list>
                    </div>
                    
                    <!-- 우측 스티커 그리드 -->
                    <div class="sticker-grid-container">
                        <div v-if="selectedCategory" class="sticker-grid">
                            <div
                                v-for="sticker in selectedCategory.stickers"
                                :key="sticker.name"
                                @click="selectSticker(sticker)"
                                :class="{ 'selected': (selectedSticker && selectedSticker.name === sticker.name) }"
                                class="sticker-card"
                            >
                                <div class="sticker-image-container">
                                    <img
                                        :src="sticker.image_thumbnail_web || sticker.image_thumbnail"
                                        :alt="sticker.title"
                                        class="sticker-image"
                                        @error="onImageError"
                                    >
                                </div>
                                <div class="sticker-info">
                                    <div class="sticker-price">{{ sticker.price }}스푼</div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="no-stickers">
                            <v-icon large color="grey">mdi-sticker-emoji</v-icon>
                            <div class="mt-2">스티커가 없습니다</div>
                        </div>
                    </div>
                </div>
            </v-card-text>
            
            <v-card-actions>
                <v-btn
                    text
                    color="purple"
                    @click="openUserSearchDialog"
                >
                    <v-icon left>mdi-account-plus</v-icon>
                    시그니처 스푼 추가
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn text @click="close">취소</v-btn>
                <v-btn
                    color="primary"
                    @click="confirm"
                    :disabled="!selectedSticker"
                >
                    확인
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Sticker, StickerCategory, User } from '@sopia-bot/core';

interface SignatureUser {
    id: number;
    nickname: string;
    profile_url: string;
}

interface SignatureStickerCategory extends StickerCategory {
    signatureUserId?: number;
    signatureUserNickname?: string;
}

@Component
export default class StickerModal extends Vue {
    dialog = false;
    categories: SignatureStickerCategory[] = [];
    selectedCategoryIndex = 0;
    selectedSticker: Sticker | null = null;
    resolvePromise: ((value: Sticker | null) => void) | null = null;

    // 시그니처 사용자 관리
    signatureUsers: SignatureUser[] = [];
    signatureCategories: SignatureStickerCategory[] = [];

    // 사용자 검색 다이얼로그
    userSearchDialog = false;
    searchText = '';
    searchResults: User[] = [];
    searchIncrement = 0;
    loadingSignatureStickers = false;

    // localStorage 키
    readonly SIGNATURE_USERS_KEY = 'sopia-signature-sticker-users';

    get allCategories(): SignatureStickerCategory[] {
        return [...this.categories, ...this.signatureCategories];
    }

    get selectedCategory(): SignatureStickerCategory | null {
        return this.allCategories[this.selectedCategoryIndex] || null;
    }

    getCategoryDisplayTitle(category: SignatureStickerCategory): string {
        if (category.signatureUserNickname) {
            return `${category.title} (${category.signatureUserNickname})`;
        }
        return category.title;
    }

    isUserAlreadyAdded(userId: number): boolean {
        return this.signatureUsers.some(u => u.id === userId);
    }

    open(): Promise<Sticker | null> {
        return new Promise(async (resolve) => {
            this.resolvePromise = resolve;
            this.loadStickers();
            await this.loadAllSignatureStickers();
            this.dialog = true;
            this.selectedCategoryIndex = 0;
            this.selectedSticker = null;
        });
    }

    close() {
        this.dialog = false;
        if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
        }
    }

    confirm() {
        this.dialog = false;
        if (this.resolvePromise) {
            this.resolvePromise(this.selectedSticker);
            this.resolvePromise = null;
        }
    }

    selectSticker(sticker: Sticker) {
        this.selectedSticker = sticker;
    }

    loadStickers() {
        try {
            const stickers = (this as any).$sopia?.sticker?.stickers;
            if (stickers && stickers.categories) {
                const now = new Date();
                this.categories = stickers.categories
                    .filter((cat: StickerCategory) => cat.is_used)
                    .map((cat: StickerCategory) => ({
                        ...cat,
                        stickers: (cat.stickers || []).filter((sticker: any) => {
                            if (!sticker.start_date || !sticker.end_date) return true;
                            const start = new Date(sticker.start_date);
                            // UTC 시간을 한국 시간으로 변환
                            start.setHours(start.getHours() + 9);
                            const end = new Date(sticker.end_date);
                            end.setHours(end.getHours() + 9);
                            return now >= start && now <= end;
                        }),
                    }))
                    .filter((cat: StickerCategory) => cat.stickers && cat.stickers.length > 0);
            }
        } catch (error) {
            console.error('Failed to load stickers:', error);
            this.categories = [];
        }
    }

    onImageError(event: Event) {
        const img = event.target as HTMLImageElement;
        img.style.display = 'none';
    }

    // localStorage 관리
    loadSavedSignatureUsers(): void {
        try {
            const saved = localStorage.getItem(this.SIGNATURE_USERS_KEY);
            this.signatureUsers = saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load signature users:', error);
            this.signatureUsers = [];
        }
    }

    saveSignatureUsers(): void {
        try {
            localStorage.setItem(
                this.SIGNATURE_USERS_KEY,
                JSON.stringify(this.signatureUsers)
            );
        } catch (error) {
            console.warn('Failed to save signature users:', error);
        }
    }

    // 사용자 검색 다이얼로그
    openUserSearchDialog(): void {
        this.userSearchDialog = true;
        this.searchText = '';
        this.searchResults = [];
    }

    closeUserSearchDialog(): void {
        this.userSearchDialog = false;
        this.searchText = '';
        this.searchResults = [];
    }

    async searchKeyDown(): Promise<void> {
        if (this.searchText.trim().length > 0) {
            this.searchIncrement += 1;
            setTimeout(async () => {
                this.searchIncrement -= 1;
                if (this.searchIncrement <= 0) {
                    await this.searchUsers();
                    this.searchIncrement = 0;
                }
            }, 300);
        } else {
            this.searchResults = [];
        }
    }

    async searchUsers(): Promise<void> {
        try {
            const req = await (this as any).$sopia.api.search.user({
                params: { keyword: this.searchText }
            });
            this.searchResults = req.res.results.slice(0, 7);
        } catch (error) {
            console.error('User search failed:', error);
            this.searchResults = [];
        }
    }

    // 시그니처 스티커 fetch 및 필터링
    async fetchSignatureStickers(userId: number): Promise<StickerCategory[] | null> {
        const url = `https://static.spooncast.net/kr/stickers/signature/${userId}/index.json`;

        try {
            const response = await fetch(url);

            if (response.status === 403) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.categories || [];
        } catch (error) {
            console.error(`Failed to fetch signature stickers for user ${userId}:`, error);
            return null;
        }
    }

    filterSignatureStickers(
        categories: StickerCategory[],
        userId: number,
        nickname: string
    ): SignatureStickerCategory[] {
        const now = new Date();

        // 모든 카테고리의 스티커를 하나로 합침
        const allStickers: any[] = [];
        categories
            .filter(cat => cat.is_used)
            .forEach(cat => {
                (cat.stickers || []).forEach((sticker: any) => {
                    if (!sticker.is_used) return;
                    if (!sticker.start_date || !sticker.end_date) {
                        allStickers.push(sticker);
                        return;
                    }

                    const start = new Date(sticker.start_date);
                    start.setHours(start.getHours() + 9);
                    const end = new Date(sticker.end_date);
                    end.setHours(end.getHours() + 9);

                    if (now >= start && now <= end) {
                        allStickers.push(sticker);
                    }
                });
            });

        if (allStickers.length === 0) {
            return [];
        }

        // 하나의 카테고리로 통합
        return [{
            id: userId,
            name: `signature_${userId}`,
            title: '시그니처',
            is_used: true,
            stickers: allStickers,
            signatureUserId: userId,
            signatureUserNickname: nickname,
        }];
    }

    // 시그니처 사용자 추가/제거
    async addSignatureUser(user: User): Promise<void> {
        if (this.isUserAlreadyAdded(user.id)) {
            return;
        }

        this.loadingSignatureStickers = true;

        try {
            const categories = await this.fetchSignatureStickers(user.id);

            if (!categories || categories.length === 0) {
                (this as any).$swal({
                    icon: 'warning',
                    title: '시그니처 스티커 없음',
                    html: `${user.nickname}님은 시그니처 스티커가 없습니다.`,
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                });
                return;
            }

            const filteredCategories = this.filterSignatureStickers(
                categories,
                user.id,
                user.nickname
            );

            if (filteredCategories.length === 0) {
                (this as any).$swal({
                    icon: 'warning',
                    title: '사용 가능한 스티커 없음',
                    html: `${user.nickname}님의 시그니처 스티커 중 사용 가능한 스티커가 없습니다.`,
                    toast: true,
                    position: 'top-end',
                    timer: 3000,
                    showConfirmButton: false,
                });
                return;
            }

            const signatureUser: SignatureUser = {
                id: user.id,
                nickname: user.nickname,
                profile_url: user.profile_url,
            };

            this.signatureUsers.push(signatureUser);
            this.saveSignatureUsers();
            this.signatureCategories.push(...filteredCategories);

            (this as any).$swal({
                icon: 'success',
                html: `${user.nickname}님의 시그니처 스티커를 추가했습니다.`,
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false,
            });

            this.closeUserSearchDialog();

        } catch (error) {
            console.error('Failed to add signature user:', error);
            (this as any).$swal({
                icon: 'error',
                title: '오류',
                html: '시그니처 스티커를 불러오는데 실패했습니다.',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false,
            });
        } finally {
            this.loadingSignatureStickers = false;
        }
    }

    removeSignatureUser(userId: number): void {
        const userIndex = this.signatureUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) return;

        const removedUser = this.signatureUsers[userIndex];
        this.signatureUsers.splice(userIndex, 1);
        this.saveSignatureUsers();

        this.signatureCategories = this.signatureCategories.filter(
            cat => cat.signatureUserId !== userId
        );

        if (this.selectedCategoryIndex >= this.allCategories.length) {
            this.selectedCategoryIndex = Math.max(0, this.allCategories.length - 1);
        }

        (this as any).$swal({
            icon: 'info',
            html: `${removedUser.nickname}님의 시그니처 스티커를 제거했습니다.`,
            toast: true,
            position: 'top-end',
            timer: 2000,
            showConfirmButton: false,
        });
    }

    // 모든 저장된 시그니처 스티커 로드
    async loadAllSignatureStickers(): Promise<void> {
        this.loadSavedSignatureUsers();
        this.signatureCategories.splice(0, this.signatureCategories.length);

        const loadedCategories: SignatureStickerCategory[] = [];
        for (const user of this.signatureUsers) {
            try {
                const categories = await this.fetchSignatureStickers(user.id);
                if (categories && categories.length > 0) {
                    const filtered = this.filterSignatureStickers(
                        categories,
                        user.id,
                        user.nickname
                    );
                    loadedCategories.push(...filtered);
                }
            } catch (error) {
                console.warn(`Failed to load signature stickers for ${user.nickname}:`, error);
            }
        }
        this.signatureCategories = loadedCategories;
    }
}
</script>

<style lang="scss" scoped>
.sticker-modal-content {
    display: flex;
    height: 500px;
}

.category-tabs {
    width: 200px;
    border-right: 1px solid var(--v-divider-base);
    overflow-y: auto;
}

.category-item {
    border-radius: 0;
    
    &.v-list-item--active {
        // background: var(--v-primary-base);
        // color: white;
    }
}

.sticker-grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.sticker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
}

.sticker-card {
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 8px;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--v-surface-base);
    
    &:hover {
        border-color: var(--v-primary-lighten1);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    &.selected {
        border-color: var(--v-primary-base);
        background: var(--v-primary-lighten4);
    }
}

.sticker-image-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80px;
    margin-bottom: 8px;
}

.sticker-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
}

.sticker-info {
    text-align: center;
}

.sticker-title {
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 4px;
    color: var(--v-text-base);
}

.sticker-price {
    font-size: 11px;
    color: var(--v-primary-base);
    font-weight: 600;
}

.no-stickers {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--v-text-lighten1);
}

.user-search-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--v-divider-base);
    border-radius: 8px;
}

.user-item {
    border-radius: 8px;
    margin-bottom: 4px;
    transition: background-color 0.2s ease;

    &:hover:not(.v-list-item--disabled) {
        background-color: rgba(103, 58, 183, 0.04);
    }
}

.category-item {
    .v-list-item-action {
        min-width: auto;
        margin-left: 4px;
    }
}
</style>
