Get-ChildItem "$env:APPDATA\Toon Boom Animation\Toon Boom Harmony Advanced\2500-scripts\src" -Recurse -Filter "*.js" | ForEach-Object {
  $relative = $_.FullName -replace [regex]::Escape("$env:APPDATA\Toon Boom Animation\Toon Boom Harmony Advanced\2500-scripts\src\"), ""
  $tsSource = Join-Path "src" ($relative -replace '\.js$', '.ts')
  if (-not (Test-Path $tsSource)) {
    Write-Host "Removing orphaned: $_"
    Remove-Item $_.FullName
  }
}