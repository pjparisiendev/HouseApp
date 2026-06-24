$envPath = "E:\HomeDev\HouseApp\server\.env"

if (-not (Test-Path $envPath)) {
    Write-Error ".env file not found at $envPath"
    exit 1
}

$key = Read-Host "AIzaSyB-qI__RLsFKhFgLdvs3_cglrM6KxQYJfA"

$content = Get-Content $envPath -Raw

if ($content -match "(?m)^GOOGLE_MAPS_BROWSER_KEY=") {
    $content = $content -replace "(?m)^GOOGLE_MAPS_BROWSER_KEY=.*$", "GOOGLE_MAPS_BROWSER_KEY=$key"
} else {
    $content = $content.TrimEnd() + "`r`nGOOGLE_MAPS_BROWSER_KEY=$key`r`n"
}

Set-Content -Path $envPath -Value $content -Encoding UTF8

cd "E:\HomeDev\HouseApp\server"
php artisan optimize:clear

Write-Host "Google Maps key configured. Restart Laravel and Vite."