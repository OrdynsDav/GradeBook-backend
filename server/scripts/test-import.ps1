# Тест импорта расписания без деплоя.
# Запуск: 1) в одном терминале: cd server && npm run dev
#         2) в другом: cd server && .\scripts\test-import.ps1

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$baseUrl = "http://localhost:3000/api/v1"
$login = "admin"           # логин админа (в seed: admin)
$password = "Password123!" # пароль (в seed такой же; минимум 6 символов)
$excelPath = "C:\Users\Professional\Downloads\Raspisanie_na_nedelyu_s_24_po_27_fevralya_2026_goda.xlsx"

if (-not (Test-Path $excelPath)) {
  Write-Host "Файл не найден: $excelPath" -ForegroundColor Red
  Write-Host "Измените `$excelPath в скрипте (строка 10)." -ForegroundColor Yellow
  exit 1
}

Write-Host "1. Логин..." -ForegroundColor Cyan
$loginBody = @{ login = $login; password = $password } | ConvertTo-Json
try {
  $loginResp = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json; charset=utf-8"
} catch {
  Write-Host "   Ошибка входа. Проверьте логин/пароль и что сервер запущен (npm run dev)." -ForegroundColor Red
  exit 1
}
$token = $loginResp.accessToken
Write-Host "   Токен получен." -ForegroundColor Green

Write-Host "2. Импорт (через base64)..." -ForegroundColor Cyan
$fileBytes = [System.IO.File]::ReadAllBytes($excelPath)
$base64 = [Convert]::ToBase64String($fileBytes)
$body = @{ fileBase64 = $base64 } | ConvertTo-Json
$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}
try {
  $importResp = Invoke-RestMethod -Uri "$baseUrl/schedule/import" -Method Post -Headers $headers -Body $body
  Write-Host "   Создано: $($importResp.created), пропущено: $($importResp.skipped)" -ForegroundColor Green
  if ($importResp.errors -and $importResp.errors.Count -gt 0) {
    Write-Host "   Ошибки (первые 5):" -ForegroundColor Yellow
    $importResp.errors | Select-Object -First 5 | ForEach-Object { Write-Host "     $_" }
  }
} catch {
  Write-Host "   Ошибка: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Red }
}
