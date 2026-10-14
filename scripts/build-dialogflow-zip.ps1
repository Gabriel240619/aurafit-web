param(
  [string]$SourceDirectory = 'dialogflow-agent',
  [string]$OutputFile = 'dialogflow\AuraFit-actualizado.zip'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

$source = (Resolve-Path -LiteralPath $SourceDirectory).Path
$output = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputFile))
$outputDirectory = Split-Path -Parent $output

if (-not (Test-Path -LiteralPath $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$stream = [System.IO.File]::Open($output, [System.IO.FileMode]::Create)
try {
  $archive = [System.IO.Compression.ZipArchive]::new(
    $stream,
    [System.IO.Compression.ZipArchiveMode]::Create,
    $false
  )
  try {
    foreach ($file in Get-ChildItem -LiteralPath $source -File -Recurse | Sort-Object FullName) {
      $relativePath = $file.FullName.Substring($source.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar).Replace('\', '/')
      $entry = $archive.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
      $entryStream = $entry.Open()
      $fileStream = [System.IO.File]::OpenRead($file.FullName)
      try {
        $fileStream.CopyTo($entryStream)
      } finally {
        $fileStream.Dispose()
        $entryStream.Dispose()
      }
    }
  } finally {
    $archive.Dispose()
  }
} finally {
  $stream.Dispose()
}

Write-Output "ZIP de Dialogflow generado: $output"
