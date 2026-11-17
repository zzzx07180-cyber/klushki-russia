param([string]$Root = "C:\Users\K4K-PC\Desktop\klushki", [int]$Port = 8080)
$types = @{ ".html"="text/html; charset=utf-8"; ".css"="text/css; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".json"="application/json; charset=utf-8"; ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml"; ".webp"="image/webp"; ".mp4"="video/mp4"; ".woff2"="font/woff2"; ".yml"="text/yaml; charset=utf-8" }
# Build data/products.js from data/products/*.json (the admin edits those files)
& py (Join-Path $Root "tools\build_products.py")
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Host "Serving $Root on http://localhost:$Port/"
while ($l.IsListening) {
  $c = $l.GetContext()
  $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath).TrimStart('/')
  if ($p -eq "") { $p = "index.html" }
  $f = Join-Path $Root $p
  # Folder (admin/) -> its index.html; "admin" without a slash -> redirect, like GitHub Pages does
  if ((Test-Path $f -PathType Container) -and ($p -ne "")) {
    if ($p.EndsWith("/")) { $f = Join-Path $f "index.html" }
    else { $c.Response.Redirect("/$p/"); Write-Host "301 /$p"; $c.Response.Close(); continue }
  }
  if ((Test-Path $f -PathType Leaf) -and ([IO.Path]::GetFullPath($f).StartsWith($Root))) {
    $b = [IO.File]::ReadAllBytes($f)
    $ext = [IO.Path]::GetExtension($f).ToLower()
    $c.Response.ContentType = $(if ($types[$ext]) { $types[$ext] } else { "application/octet-stream" })
    $c.Response.OutputStream.Write($b, 0, $b.Length)
  } else { $c.Response.StatusCode = 404 }
  Write-Host "$($c.Response.StatusCode) /$p"
  $c.Response.Close()
}
