$ErrorActionPreference = 'Stop'

$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$serverRoot = Join-Path $projectRoot 'server'
$tempBase = [IO.Path]::GetFullPath($env:TEMP)
$stageRoot = [IO.Path]::GetFullPath((Join-Path $tempBase 'HouseAppStagingDeploy'))
$archive = Join-Path $tempBase 'HouseApp-staging-release.zip'
$remoteRoot = 'houseapp-whc:~/house-dev.pjparisien.ca'
$privateUploads = Join-Path $serverRoot 'storage\app\private'

if (-not $stageRoot.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Unsafe staging path.'
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory)] [string] $Command,
        [Parameter(ValueFromRemainingArguments)] [string[]] $Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE."
    }
}

$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
    [Environment]::GetEnvironmentVariable('Path', 'User')

Push-Location $projectRoot
try {
    Write-Host 'Testing frontend...'
    Invoke-Checked npm.cmd run test

    Write-Host 'Checking frontend...'
    Invoke-Checked npm.cmd run lint

    Write-Host 'Checking backend...'
    Push-Location $serverRoot
    try {
        Invoke-Checked .\vendor\bin\pint --test
        Invoke-Checked php artisan test
    }
    finally {
        Pop-Location
    }

    Write-Host 'Building frontend...'
    Invoke-Checked npm.cmd run build

    if (Test-Path -LiteralPath $stageRoot) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null

    & robocopy $serverRoot $stageRoot /E /XD vendor node_modules .git tests $privateUploads /XF .env database.sqlite .phpunit.result.cache | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed with exit code $LASTEXITCODE."
    }

    if (Test-Path -LiteralPath $archive) {
        Remove-Item -LiteralPath $archive -Force
    }
    Invoke-Checked -Command tar.exe -Arguments @('-a', '-c', '-f', $archive, '-C', $stageRoot, '.')

    Write-Host 'Uploading staging release...'
    Invoke-Checked -Command scp -Arguments @('-o', 'BatchMode=yes', $archive, "$remoteRoot/.houseapp-release.zip")
    Invoke-Checked -Command scp -Arguments @('-o', 'BatchMode=yes', (Join-Path $PSScriptRoot 'remote-deploy-staging.sh'), "$remoteRoot/.deploy-staging.sh")

    Write-Host 'Activating staging release...'
    Invoke-Checked -Command ssh -Arguments @('-o', 'BatchMode=yes', 'houseapp-whc', 'bash ~/house-dev.pjparisien.ca/.deploy-staging.sh')
}
finally {
    Pop-Location
    if (Test-Path -LiteralPath $stageRoot) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
    if (Test-Path -LiteralPath $archive) {
        Remove-Item -LiteralPath $archive -Force
    }
}
