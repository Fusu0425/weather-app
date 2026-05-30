$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\Desktop\厦门天气.lnk")
$Shortcut.TargetPath = "$env:USERPROFILE\weather-app\index.html"
$Shortcut.WorkingDirectory = "$env:USERPROFILE\weather-app"
$Shortcut.IconLocation = "$env:USERPROFILE\weather-app\static\app.ico"
$Shortcut.Description = "厦门天气预报"
$Shortcut.Save()
Write-Host "Shortcut created successfully"
