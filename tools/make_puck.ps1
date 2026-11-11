# Делает готовую круглую картинку шайбы images/puck.png из логотипа images/logo.png:
# логотип вырезается кругом (углы прозрачные), сверху дорисовываются обод и тень снизу (без блика).
# Браузеру не нужно ничего обрезать — поэтому шайба круглая в любом браузере, включая iPhone.
#
# Запуск (из папки проекта):  powershell -ExecutionPolicy Bypass -File tools\make_puck.ps1

param([int]$Size = 800)

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$logo = [System.Drawing.Image]::FromFile((Join-Path $root 'images\logo.png'))

$bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'
$g.CompositingQuality = 'HighQuality'
$g.Clear([System.Drawing.Color]::Transparent)

$k = $Size / 460.0                       # масштаб относительно размера шайбы на сайте (460 px)
$circle = New-Object System.Drawing.Drawing2D.GraphicsPath
$circle.AddEllipse(0, 0, $Size, $Size)

# 1. Чёрная резина + логотип (чуть крупнее, как на сайте), только внутри круга
$g.SetClip($circle)
$g.Clear([System.Drawing.Color]::Black)
$scale = 1.08
$d = [int]($Size * $scale)
$off = [int](($Size - $d) / 2)
$g.DrawImage($logo, $off, $off, $d, $d)

# 2. Тень снизу (объём)
$shadeRect = New-Object System.Drawing.RectangleF 0, ($Size * 0.55), $Size, ($Size * 0.45)
$shade = New-Object System.Drawing.Drawing2D.LinearGradientBrush $shadeRect,
  ([System.Drawing.Color]::FromArgb(0, 0, 0, 0)), ([System.Drawing.Color]::FromArgb(150, 0, 0, 0)), 90
$g.FillRectangle($shade, $shadeRect)

# (Блика сверху нет — владелец попросил убрать: выглядел ненатурально и мешал надписи.)
$g.ResetClip()

# 4. Обод: широкое тёмное кольцо и тонкая светлая кромка внутри
$rimW = 10 * $k
$penDark = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 5, 5, 6)), $rimW
$g.DrawEllipse($penDark, ($rimW / 2), ($rimW / 2), ($Size - $rimW), ($Size - $rimW))
$edgeW = 2 * $k
$penEdge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 255, 255, 255)), $edgeW
$e = $rimW + $edgeW / 2
$g.DrawEllipse($penEdge, $e, $e, ($Size - 2 * $e), ($Size - 2 * $e))

$out = Join-Path $root 'images\puck.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $logo.Dispose()
"Готово: $out  ($([math]::Round((Get-Item $out).Length / 1KB)) КБ)"
