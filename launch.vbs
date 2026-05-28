Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\weather-app"
WshShell.Run "python.exe app.py", 0, False
