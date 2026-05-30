Set WshShell = CreateObject("WScript.Shell")
WshShell.Run Chr(34) & WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\weather-app\index.html" & Chr(34), 1, False
