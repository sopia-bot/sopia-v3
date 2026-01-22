!macro preInit
	; This macro is called BEFORE uninstall during updates
	; Perfect place to backup user data before anything gets deleted
	SetShellVarContext current

	; Check if existing app data exists and backup
	IfFileExists "$APPDATA\sopia-v3" 0 skip_backup_preinit

	; Create backup folder
	CreateDirectory "$APPDATA\sopia-v3-update-backup"

	; Backup existing data (excluding historydb, backup, logs folders)
	CopyFiles /SILENT "$APPDATA\sopia-v3\*.*" "$APPDATA\sopia-v3-update-backup\"

	; Copy subdirectories excluding historydb, backup, logs
	FindFirst $1 $2 "$APPDATA\sopia-v3\*"
	loop_dirs:
		StrCmp $2 "" done_dirs
		StrCmp $2 "." next_dir
		StrCmp $2 ".." next_dir
		StrCmp $2 "historydb" next_dir
		StrCmp $2 "backup" next_dir
		StrCmp $2 "logs" next_dir

		; Check if it's a directory
		IfFileExists "$APPDATA\sopia-v3\$2\*.*" 0 next_dir

		; Copy directory
		CreateDirectory "$APPDATA\sopia-v3-update-backup\$2"
		CopyFiles /SILENT "$APPDATA\sopia-v3\$2\*.*" "$APPDATA\sopia-v3-update-backup\$2\"

		next_dir:
		FindNext $1 $2
		Goto loop_dirs
	done_dirs:
	FindClose $1

	; Create backup completion flag
	FileOpen $0 "$APPDATA\sopia-v3-update-backup\backup-completed" w
	FileWrite $0 "1"
	FileClose $0

	DetailPrint "User data backed up before update (excluding historydb, backup, logs)."

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
