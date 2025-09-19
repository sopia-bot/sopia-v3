!macro customUnInstall
	; 현재 사용자 기준(AppData 해석)
	SetShellVarContext current

	; electron 기본 userData 후보들
	RMDir /r "$APPDATA\${PRODUCT_NAME}"
	RMDir /r "$APPDATA\${APP_PACKAGE_NAME}"

	; 사용자가 커스텀으로 썼을 법한 폴더(예: 'sopia-v3')
	RMDir /r "$APPDATA\sopia-v3"
	RMDir /r "$LOCALAPPDATA\sopia-v3"

	; 남은 빈 디렉토리 정리(실패 무시)
	RMDir "$APPDATA\${PRODUCT_NAME}"
	RMDir "$APPDATA\${APP_PACKAGE_NAME}"

	; ✅ 주입 테스트용 팝업 (확인되면 제거해도 됨)
	MessageBox MB_OK "소피아가 삭제되었습니다."
!macroend
