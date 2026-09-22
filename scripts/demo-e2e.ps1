$ErrorActionPreference = 'Stop'
$base = $env:BACKEND_URL; if (-not $base) { $base = 'http://localhost:8080' }
$farmer = Invoke-RestMethod "$base/api/v1/farmers" -Method Post -ContentType 'application/json' -Body '{"name":"Demo Farmer","mobileNumber":"9999999999","village":"Demo Village","cropType":"Wheat","preferredLanguage":"hi"}'
Write-Host "Created farmer $($farmer.id). Create a centre as an officer, then POST /api/v1/bookings using this farmer ID."
Write-Host "Use /api/v1/queue/centres/{centreId}/actions to serve the token and /api/v1/payments to record payment."
