$audioPath = Read-Host "音声ファイルのフルパスを入力してください"

if (-not (Test-Path $audioPath)) {
    Write-Host ""
    Write-Host "ファイルが見つかりませんでした。" -ForegroundColor Red
    Write-Host "パスを確認してください: $audioPath" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "ファイル確認OK" -ForegroundColor Green
Write-Host "送信を開始します..." -ForegroundColor Cyan
Write-Host ""

curl.exe -X POST "https://isamu13b.app.n8n.cloud/webhook/voice-ingest" -F "file=@$audioPath"

Write-Host ""
Write-Host '上に {"message":"Workflow was started"} が出ていれば正常開始です。' -ForegroundColor Green
Write-Host "最後に Obsidian の vault/Inbox を確認してください。" -ForegroundColor Cyan
