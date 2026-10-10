# Tạo repository GitHub (Private), đẩy mã nguồn, build bản cài Windows trên GitHub và tải về file .exe.
# Chạy trong thư mục dự án:  powershell -ExecutionPolicy Bypass -File tools\publish-github.ps1
# Tuỳ chọn: -Repo ten-repo   -Public (repository công khai, cho phép tự cập nhật trong ứng dụng)
param([string]$Repo = "bg-sales-management", [switch]$Public)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "Thiếu '$cmd'. $hint" }
}
Need git  "Cài Git: https://git-scm.com/download/win"
Need gh   "Cài GitHub CLI: https://cli.github.com/"
Need node "Cài Node.js LTS: https://nodejs.org/"

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) { gh auth login }
$owner = (gh api user --jq .login).Trim()
Write-Host "Tài khoản GitHub: $owner"

# Điền owner/repo vào cấu hình cập nhật
$t = Get-Content package.json -Raw -Encoding UTF8
$t = $t -replace 'DOI-THANH-TEN-GITHUB', $owner -replace 'DOI-THANH-TEN-REPO', $Repo
[IO.File]::WriteAllText((Join-Path $PWD "package.json"), $t, (New-Object Text.UTF8Encoding $false))
npm install --package-lock-only   # tạo package-lock.json để khóa phiên bản thư viện

if (-not (Test-Path .git)) { git init -b main }
if (-not (git config user.email)) { git config user.email "$owner@users.noreply.github.com"; git config user.name $owner }
git add -A
git commit -m "BG Sales Management" 2>$null

$vis = if ($Public) { "--public" } else { "--private" }
gh repo create "$owner/$Repo" $vis --source . --remote origin --push

$ver = (Get-Content package.json -Raw -Encoding UTF8 | ConvertFrom-Json).version
git tag "v$ver"
git push origin "v$ver"

Write-Host "Đang build trên GitHub Actions (khoảng 3-6 phút)..."
Start-Sleep 20
$run = gh run list --workflow build-windows.yml --limit 1 --json databaseId --jq ".[0].databaseId"
gh run watch $run --exit-status
gh run download $run -n BG-Sales-Management-Setup -D bản-cài
Write-Host "Xong. File cài đặt nằm trong thư mục 'bản-cài'."
