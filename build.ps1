# Empacota o ClickOS em um único executável (dist/ClickOS.exe)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

python -m PyInstaller --noconfirm --onefile --windowed --name ClickOS `
  --icon "src/clickos/assets/icon.ico" `
  --paths src `
  --add-data "src/clickos/web;clickos/web" `
  --add-data "src/clickos/templates;clickos/templates" `
  --add-data "src/clickos/assets;clickos/assets" `
  --collect-all webview `
  run.py

Write-Host "`nPronto: dist\ClickOS.exe"
