<template>
    <v-dialog v-model="dialog" max-width="800px" persistent>
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
                                v-for="(category, index) in categories"
                                :key="category.id"
                                @click="selectedCategoryIndex = index"
                                :class="{ 'v-list-item--active': selectedCategoryIndex === index }"
                                class="category-item"
                            >
                                <v-list-item-content>
                                    <v-list-item-title>{{ category.title }}</v-list-item-title>
                                </v-list-item-content>
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
import { Sticker, StickerCategory } from '@sopia-bot/core';

@Component
export default class StickerModal extends Vue {
    dialog = false;
    categories: StickerCategory[] = [];
    selectedCategoryIndex = 0;
    selectedSticker: Sticker | null = null;
    resolvePromise: ((value: Sticker | null) => void) | null = null;

    get selectedCategory(): StickerCategory | null {
        return this.categories[this.selectedCategoryIndex] || null;
    }

    open(): Promise<Sticker | null> {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;
            this.loadStickers();
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
</style>
