#!/bin/bash

# 두 앱을 빌드하고 하나의 DMG로 패키징하는 스크립트

set -e

echo "🚀 Starting dual app build process..."

# 기존 빌드 결과물 정리
echo "🧹 Cleaning previous builds..."
rm -rf dist_electron

# 1. SOPIAv3 빌드
echo "📦 Building SOPIAv3..."
BUILD_TYPE=SOPIAv3 npm run electron:build

# SOPIAv3.app을 임시 위치로 이동
echo "📁 Moving SOPIAv3.app to temporary location..."
mkdir -p temp_apps
xattr -cr dist_electron/mac-arm64/SOPIAv3.app
cp -r dist_electron/mac-arm64/SOPIAv3.app temp_apps/

# 2. SopiaBundleManager 빌드
echo "📦 Building SopiaBundleManager..."
BUILD_TYPE=SopiaBundleManager npm run electron:build

# SopiaBundleManager.app을 임시 위치로 이동
echo "📁 Moving SopiaBundleManager.app to temporary location..."
xattr -cr dist_electron/mac-arm64/SopiaBundleManager.app
cp -r dist_electron/mac-arm64/SopiaBundleManager.app temp_apps/

# 3. DMG 생성을 위한 스테이징 폴더 준비
echo "🎯 Preparing DMG staging folder..."
DMG_STAGE="dmg_stage"
rm -rf "$DMG_STAGE"
mkdir -p "$DMG_STAGE"

# 두 앱을 스테이징 폴더로 복사
cp -r temp_apps/SOPIAv3.app "$DMG_STAGE/"
cp -r temp_apps/SopiaBundleManager.app "$DMG_STAGE/"

# Applications 링크 생성
ln -sf /Applications "$DMG_STAGE/Applications"

# 4. DMG 생성
echo "💿 Creating DMG..."
VERSION=$(node -p "require('./package.json').version")
DMG_NAME="SOPIAv3-${VERSION}-with-manager.dmg"

hdiutil create -volname "SOPIAv3" -srcfolder "$DMG_STAGE" -ov -format UDZO "$DMG_NAME"

# 정리
echo "🧹 Cleaning up temporary files..."
rm -rf temp_apps
rm -rf "$DMG_STAGE"

echo "✅ Build complete! DMG created: $DMG_NAME"
echo "📍 Location: $(pwd)/$DMG_NAME"
