<#!
  RevTrafficXchange — create Stripe products/prices for the Worker catalog (test mode).

  Before running (one-time): log in with Stripe CLI
    cd <folder-with-stripe.exe>
    .\stripe.exe login

  Then run (double-click in Explorer or from PowerShell):
    powershell -ExecutionPolicy Bypass -File .\scripts\setup-stripe-products.ps1

  Optional: -StripeExe "C:\path\to\stripe.exe" if stripe is not on PATH.

  Output: ..\wrangler.stripe-ids.snippet.toml  (paste [vars] lines into backend\wrangler.toml)
#>
param(
  [string]$StripeExe = ""
)

$ErrorActionPreference = "Stop"

function Resolve-StripeExe {
  param([string]$Explicit)
  if ($Explicit -and (Test-Path $Explicit)) { return (Resolve-Path $Explicit).Path }
  $cmd = Get-Command stripe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $guess = Join-Path $env:USERPROFILE "Downloads\stripe_*_windows_x86_64\stripe.exe"
  $found = Get-Item $guess -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($found) { return $found.FullName }
  throw "Could not find stripe.exe. Install Stripe CLI or pass -StripeExe 'C:\...\stripe.exe'"
}

function Invoke-StripeJson {
  param([string]$Exe, [string[]]$Args)
  # Stripe prints progress ("Checking for new versions...") to stderr; keep stdout JSON-only.
  $raw = & $Exe @Args 2>$null | Out-String
  if ($LASTEXITCODE -ne 0) {
    $all = & $Exe @Args 2>&1 | Out-String
    throw "Stripe CLI failed ($LASTEXITCODE): $all"
  }
  return $raw | ConvertFrom-Json
}

$stripe = Resolve-StripeExe -Explicit $StripeExe
Write-Host "Using Stripe CLI: $stripe"
& $stripe version | Out-Host
if ($LASTEXITCODE -ne 0) { throw "stripe version failed" }

$defs = @(
  @{ Key = "STRIPE_PRICE_MEMBERSHIP_PRO_MONTHLY"; Name = "RTX Membership Pro (monthly)"; Sku = "membership_pro_monthly"; Recurring = $true; UnitAmountCents = 999 },
  @{ Key = "STRIPE_PRICE_REVCOINS_50"; Name = "RTX RevCoins 50 pack"; Sku = "revcoins_50"; Recurring = $false; UnitAmountCents = 500 },
  @{ Key = "STRIPE_PRICE_REVCOINS_120"; Name = "RTX RevCoins 120 pack"; Sku = "revcoins_120"; Recurring = $false; UnitAmountCents = 1000 },
  @{ Key = "STRIPE_PRICE_REVCOINS_260"; Name = "RTX RevCoins 260 pack"; Sku = "revcoins_260"; Recurring = $false; UnitAmountCents = 2000 },
  @{ Key = "STRIPE_PRICE_REVCOINS_700"; Name = "RTX RevCoins 700 pack"; Sku = "revcoins_700"; Recurring = $false; UnitAmountCents = 5000 },
  @{ Key = "STRIPE_PRICE_CREDITS_1000_PACK"; Name = "RTX Credits 1000 pack"; Sku = "credits_1000_pack"; Recurring = $false; UnitAmountCents = 10000 }
)

$lines = @(
  "# Paste these lines under [vars] in backend/wrangler.toml (or merge with existing STRIPE_PRICE_*).",
  "# Created $(Get-Date -Format o) in Stripe TEST mode.",
  ""
)

foreach ($d in $defs) {
  Write-Host "`nCreating product: $($d.Name) ..."
  $prod = Invoke-StripeJson -Exe $stripe -Args @(
    "products", "create",
    "--name", $d.Name,
    "--description", "RevTrafficXchange catalog item",
    "-d", "metadata[rtx_sku]=$($d.Sku)"
  )
  $pid = $prod.id
  Write-Host "  product: $pid"

  if ($d.Recurring) {
    $price = Invoke-StripeJson -Exe $stripe -Args @(
      "prices", "create",
      "--product", $pid,
      "--currency", "usd",
      "--unit-amount", [string]$d.UnitAmountCents,
      "-d", "recurring[interval]=month"
    )
  }
  else {
    $price = Invoke-StripeJson -Exe $stripe -Args @(
      "prices", "create",
      "--product", $pid,
      "--currency", "usd",
      "--unit-amount", [string]$d.UnitAmountCents
    )
  }
  Write-Host "  price: $($price.id) ($([math]::Round($d.UnitAmountCents/100,2)) USD$(if ($d.Recurring) { ' / month' }))"
  $lines += "$($d.Key) = `"$($price.id)`""
}

$outPath = Join-Path $PSScriptRoot "..\wrangler.stripe-ids.snippet.toml"
$lines | Set-Content -Path $outPath -Encoding utf8

Write-Host "`nDone. Wrote: $outPath"
Write-Host "Open that file, copy the STRIPE_PRICE_* lines into backend\wrangler.toml, then run: npx wrangler deploy"
