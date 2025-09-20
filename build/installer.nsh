!macro preInit
	; This macro is called BEFORE uninstall during updates
	; Perfect place to backup user data before anything gets deleted
	SetShellVarContext current
	
	; Check if existing app data exists and backup
	IfFileExists "$APPDATA\sopia-v3" 0 skip_backup_preinit
	
	; Create backup folder
	CreateDirectory "$APPDATA\sopia-v3-update-backup"
	
	; Backup existing data
	CopyFiles /SILENT "$APPDATA\sopia-v3\*.*" "$APPDATA\sopia-v3-update-backup\"
	
	; Create backup completion flag
	FileOpen $0 "$APPDATA\sopia-v3-update-backup\backup-completed" w
	FileWrite $0 "1"
	FileClose $0
	
	DetailPrint "User data backed up before update."
	
	skip_backup_preinit:
!macroend

!macro customInstall
	; Set current user context for AppData
	SetShellVarContext current

	DetailPrint "Installing SOPIA..."
!macroend

!macro customUnInstall
	; Set current user context for AppData
	SetShellVarContext current

	DetailPrint "Uninstalling SOPIA - removing user data..."
	
	; Remove electron default userData folders
	
!macroend
