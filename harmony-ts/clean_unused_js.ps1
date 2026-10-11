$tsRoot = "D:\YT projects\Coding\ToonBoom\harmony-ts\src"
$jsRoot = "$env:APPDATA\Toon Boom Animation\Toon Boom Harmony Advanced\2500-scripts"

$deleted = 0

Get-ChildItem -LiteralPath $jsRoot -Recurse -File -Filter "*.js" | ForEach-Object {
  $relative = $_.FullName.Substring($jsRoot.Length).TrimStart('\')

  $tsSource = Join-Path $tsRoot ([IO.Path]::ChangeExtension($relative, ".ts"))

  if (-not (Test-Path -LiteralPath $tsSource -PathType Leaf)) {
    Write-Host "Deleting: $($_.FullName)"

    Remove-Item -LiteralPath $_.FullName

    $deleted++
  }
}

Write-Host "Cleanup complete. Deleted $deleted orphaned JS files."