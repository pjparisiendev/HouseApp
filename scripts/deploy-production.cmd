@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy-production.ps1" -ConfirmProduction
