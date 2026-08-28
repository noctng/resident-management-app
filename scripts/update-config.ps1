<#
.SYNOPSIS
    Script quan ly va cap nhat cau hinh IP Database, Port Backend 1-Click
.DESCRIPTION
    Tu dong cap nhat file .env, dong bo sang Nginx va khoi dong lai Backend
.EXAMPLE
    .\update-config.ps1 -DbHost "172.16.100.51" -BackendPort 3002
    .\update-config.ps1
#>

param (
    [string]$DbHost,
    [int]$DbPort,
    [string]$DbUser,
    [string]$DbPassword,
    [string]$DbName,
    [int]$BackendPort,
    [switch]$RestartBackend = $true,
    [switch]$ReloadNginx = $true
)

$ErrorActionPreference = "Stop"

# Tu dong xac dinh thu muc goc du an
$ProjectRoot = if ($PSScriptRoot) {
    if (Test-Path "$PSScriptRoot\..\backend\.env") {
        (Resolve-Path "$PSScriptRoot\..").Path
    } elseif (Test-Path "$PSScriptRoot\backend\.env") {
        $PSScriptRoot
    } else {
        "D:\resident-management-app"
    }
} else {
    "D:\resident-management-app"
}

$BackendEnvPath = "$ProjectRoot\backend\.env"
$NginxConfPath = "D:\nginx\nginx-1.28.0\conf\nginx.conf"
$NginxExe = "D:\nginx\nginx-1.28.0\nginx.exe"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TOOL QUAN LY CAU HINH HE THONG QUAN LY CU DAN (1-CLICK) " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Ham doc file .env thanh Dictionary
function Get-EnvMap($path) {
    $map = @{}
    if (Test-Path $path) {
        Get-Content $path | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $idx = $line.IndexOf("=")
                $k = $line.Substring(0, $idx).Trim()
                $v = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
                $map[$k] = $v
            }
        }
    }
    return $map
}

if (-not (Test-Path $BackendEnvPath)) {
    Write-Error "Khong tim thay file $BackendEnvPath"
    exit 1
}

$envMap = Get-EnvMap $BackendEnvPath

$currentPort = if ($envMap["PORT"]) { $envMap["PORT"] } else { "3002" }
$currentDbHost = if ($envMap["POSTGRES_HOST"]) { $envMap["POSTGRES_HOST"] } else { "172.16.100.51" }
$currentDbPort = if ($envMap["POSTGRES_PORT"]) { $envMap["POSTGRES_PORT"] } else { "54328" }
$currentDbUser = if ($envMap["POSTGRES_USER"]) { $envMap["POSTGRES_USER"] } else { "postgres" }
$currentDbPass = if ($envMap["POSTGRES_PASSWORD"]) { $envMap["POSTGRES_PASSWORD"] } else { "TNGbmt@123" }
$currentDbName = if ($envMap["POSTGRES_DB"]) { $envMap["POSTGRES_DB"] } else { "data_qlcd" }

Write-Host ""
Write-Host "[*] Thong tin cau hinh hien tai:" -ForegroundColor Green
Write-Host "  - Backend Port   : $currentPort"
Write-Host "  - Database Host  : $currentDbHost"
Write-Host "  - Database Port  : $currentDbPort"
Write-Host "  - Database Name  : $currentDbName"
Write-Host "  - Database User  : $currentDbUser"

# Che do tuong tac neu khong truyen tham so
$isInteractive = (-not $DbHost -and -not $DbPort -and -not $BackendPort)

if ($isInteractive) {
    Write-Host ""
    Write-Host "[?] Nhap thong tin moi (Nhan ENTER de giu nguyen gia tri hien tai):" -ForegroundColor Yellow
    
    $inDbHost = Read-Host "  > Dia chi IP Database moi [$currentDbHost]"
    if ($inDbHost) { $DbHost = $inDbHost } else { $DbHost = $currentDbHost }

    $inDbPort = Read-Host "  > Port Database moi [$currentDbPort]"
    if ($inDbPort) { $DbPort = [int]$inDbPort } else { $DbPort = [int]$currentDbPort }

    $inBackendPort = Read-Host "  > Port Backend moi [$currentPort]"
    if ($inBackendPort) { $BackendPort = [int]$inBackendPort } else { $BackendPort = [int]$currentPort }

    $DbUser = $currentDbUser
    $DbPassword = $currentDbPass
    $DbName = $currentDbName
} else {
    if (-not $DbHost) { $DbHost = $currentDbHost }
    if (-not $DbPort) { $DbPort = [int]$currentDbPort }
    if (-not $DbUser) { $DbUser = $currentDbUser }
    if (-not $DbPassword) { $DbPassword = $currentDbPass }
    if (-not $DbName) { $DbName = $currentDbName }
    if (-not $BackendPort) { $BackendPort = [int]$currentPort }
}

# 2. Cap nhat file backend/.env
Write-Host ""
Write-Host "[+] Dang cap nhat cau hinh $BackendEnvPath..." -ForegroundColor Cyan

$encodedPass = [System.Uri]::EscapeDataString($DbPassword)
$databaseUrl = "postgresql://" + $DbUser + ":" + $encodedPass + "@" + $DbHost + ":" + $DbPort + "/" + $DbName

$envLines = Get-Content $BackendEnvPath
$newLines = @()
foreach ($line in $envLines) {
    $trimmed = $line.Trim()
    if ($trimmed.StartsWith("PORT=")) {
        $newLines += "PORT=" + $BackendPort
    } elseif ($trimmed.StartsWith("POSTGRES_HOST=")) {
        $newLines += "POSTGRES_HOST=" + $DbHost
    } elseif ($trimmed.StartsWith("POSTGRES_PORT=")) {
        $newLines += "POSTGRES_PORT=" + $DbPort
    } elseif ($trimmed.StartsWith("POSTGRES_USER=")) {
        $newLines += "POSTGRES_USER=" + $DbUser
    } elseif ($trimmed.StartsWith("POSTGRES_PASSWORD=")) {
        $newLines += "POSTGRES_PASSWORD=" + $DbPassword
    } elseif ($trimmed.StartsWith("POSTGRES_DB=")) {
        $newLines += "POSTGRES_DB=" + $DbName
    } elseif ($trimmed.StartsWith("DATABASE_URL=")) {
        $newLines += 'DATABASE_URL="' + $databaseUrl + '"'
    } else {
        $newLines += $line
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($BackendEnvPath, $newLines, $utf8NoBom)
Write-Host "[OK] Da luu cau hinh backend/.env thanh cong!" -ForegroundColor Green

# 3. Dong bo sang thu muc D:\nginx\backend
if (Test-Path "D:\nginx\backend") {
    Write-Host "[+] Dang dong bo file sang D:\nginx\backend..." -ForegroundColor Cyan
    Copy-Item -Path $BackendEnvPath -Destination "D:\nginx\backend\.env" -Force
    Copy-Item -Path "$ProjectRoot\backend\server.js" -Destination "D:\nginx\backend\server.js" -Force
    Copy-Item -Path "$ProjectRoot\backend\src\*" -Destination "D:\nginx\backend\src" -Recurse -Force
    Write-Host "[OK] Da dong bo sang D:\nginx\backend!" -ForegroundColor Green
}

# 4. Kiem tra va cap nhat Nginx proxy port neu doi BackendPort
if (Test-Path $NginxConfPath) {
    $nginxContent = Get-Content $NginxConfPath -Raw
    $newNginx = [regex]::Replace($nginxContent, 'proxy_pass http://localhost:\d+;', "proxy_pass http://localhost:" + $BackendPort + ";")
    [System.IO.File]::WriteAllText($NginxConfPath, $newNginx, $utf8NoBom)
    
    if ($ReloadNginx -and (Test-Path $NginxExe)) {
        Write-Host "[+] Dang kiem tra va reload Nginx..." -ForegroundColor Cyan
        & $NginxExe -t -p "D:\nginx\nginx-1.28.0" | Out-Null
        & $NginxExe -s reload -p "D:\nginx\nginx-1.28.0" | Out-Null
        Write-Host "[OK] Nginx da duoc reload!" -ForegroundColor Green
    }
}

# 5. Khoi dong lai Backend Process
if ($RestartBackend) {
    Write-Host "[+] Dang khoi dong lai Backend (Port $BackendPort)..." -ForegroundColor Cyan
    
    try {
        $conns = Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
    
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "$ProjectRoot\backend" -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Write-Host "[OK] Backend da duoc khoi dong lai thanh cong tren cong $BackendPort!" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  HOAN TAT CAP NHAT CAU HINH TOAN BO HE THONG!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Luu y: Nginx da duoc cau hinh nhan tat ca ten mien (server_name _)."
Write-Host "Ban chi can tro DNS bat ky ten mien nao ve IP server la chay ngay."
Write-Host ""
