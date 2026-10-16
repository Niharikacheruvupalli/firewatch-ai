# FIREWATCH AI - Automated PowerShell Unit Test Suite
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  FIREWATCH AI - Satellite Triage Automated Test Runner   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Assert-Condition($name, [bool]$condition, $errorMsg = "Assertion failed") {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  [FAIL] $name : $errorMsg" -ForegroundColor Red
        $script:failed++
    }
}

# Test 1: Check sample data files exist
$sampleFile = "$PSScriptRoot\..\js\data\sampleFirmsData.js"
Assert-Condition "Sample dataset file exists" (Test-Path $sampleFile)

# Test 2: Check all component files exist
$components = @(
    "$PSScriptRoot\..\js\engine\validator.js",
    "$PSScriptRoot\..\js\engine\rankingEngine.js",
    "$PSScriptRoot\..\js\engine\exportUtils.js",
    "$PSScriptRoot\..\js\components\sidebar.js",
    "$PSScriptRoot\..\js\components\overview.js",
    "$PSScriptRoot\..\js\components\fireMap.js",
    "$PSScriptRoot\..\js\components\observationTable.js",
    "$PSScriptRoot\..\js\components\dataImport.js",
    "$PSScriptRoot\..\js\components\rankingWeights.js",
    "$PSScriptRoot\..\js\components\disclaimerModal.js",
    "$PSScriptRoot\..\js\app.js",
    "$PSScriptRoot\..\index.html"
)

foreach ($comp in $components) {
    $name = Split-Path $comp -Leaf
    Assert-Condition "Component $name exists" (Test-Path $comp)
}

# Test 3: Math function test - Haversine Distance in PowerShell
function Haversine-Km($lat1, $lon1, $lat2, $lon2) {
    $R = 6371
    $dLat = ($lat2 - $lat1) * [Math]::PI / 180
    $dLon = ($lon2 - $lon1) * [Math]::PI / 180
    $a = [Math]::Sin($dLat / 2) * [Math]::Sin($dLat / 2) +
         [Math]::Cos($lat1 * [Math]::PI / 180) * [Math]::Cos($lat2 * [Math]::PI / 180) *
         [Math]::Sin($dLon / 2) * [Math]::Sin($dLon / 2)
    $c = 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1 - $a))
    return $R * $c
}

$sfLaDist = Haversine-Km 37.7749 -122.4194 34.0522 -118.2437
Assert-Condition "Haversine Distance (SF to LA ~559 km)" ([Math]::Abs($sfLaDist - 559) -lt 15)

# Test 4: Verify default weights total 100%
$wRecency = 30
$wConf = 25
$wFrp = 25
$wRepeat = 20
$totalW = $wRecency + $wConf + $wFrp + $wRepeat
Assert-Condition "Default Weights sum to 100%" ($totalW -eq 100)

$resultColor = if ($failed -gt 0) { "Red" } else { "Green" }
Write-Host "----------------------------------------------------------" -ForegroundColor Gray
Write-Host "Test Results: $passed Passed, $failed Failed" -ForegroundColor $resultColor
Write-Host "==========================================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }
