@echo off
cd /d C:\Users\User\my-sns-app\voice-pipeline
powershell -ExecutionPolicy Bypass -File "C:\Users\User\my-sns-app\voice-pipeline\scripts\send-voice-file.ps1" "%~1"
pause
