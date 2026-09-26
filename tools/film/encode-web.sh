#!/usr/bin/env bash
# Web versions of a film from render.mjs's lossless master, for the site's
# hero player (docs/assets/site.js picks one per browser and screen):
#   AV1  1440p and 1080p  - Chrome, Edge, Firefox, Apple devices with AV1
#   HEVC 1440p            - other Apple devices (Safari plays hvc1)
#   H.264 1080p and 720p  - everything else
# plus the poster (first frame, 1920 px JPEG).
#   FFMPEG=/path/to/ffmpeg bash encode-web.sh out/hero14-1440-master.mkv out/hero14-1440-poster.png out/web
set -euo pipefail
MASTER="$1"; POSTER="$2"; OUT="$3"
FF="${FFMPEG:-ffmpeg}"
mkdir -p "$OUT"
# RGB master -> BT.709 limited-range 4:2:0, tagged as such.
yuv() { echo "scale=$1:$2:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p"; }
# Three threads leave one core of a four-core machine free for other work.
TAGS=(-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -r 30 -g 60 -an -movflags +faststart -threads 3)
q() { "$FF" -hide_banner -loglevel error -y -i "$MASTER" "$@"; }

# Constrained quality: a quality target, capped so the hero stays light
# (AV1: -crf with -b:v as the cap; x264/x265: -crf with a VBV cap).
q -vf "$(yuv 2560 1440)" -c:v libaom-av1 -crf 30 -b:v 4M -cpu-used 5 -row-mt 1 -tiles 2x2 "${TAGS[@]}" "$OUT/hero-1440-av1.mp4"
q -vf "$(yuv 1920 1080)" -c:v libaom-av1 -crf 32 -b:v 2500k -cpu-used 5 -row-mt 1 -tiles 2x2 "${TAGS[@]}" "$OUT/hero-1080-av1.mp4"
q -vf "$(yuv 2560 1440)" -c:v libx265 -crf 24 -preset medium -tag:v hvc1 -x265-params "log-level=error:vbv-maxrate=5500:vbv-bufsize=11000" "${TAGS[@]}" "$OUT/hero-1440-hevc.mp4"
q -vf "$(yuv 1920 1080)" -c:v libx264 -crf 21 -maxrate 4500k -bufsize 9000k -preset slow -profile:v high "${TAGS[@]}" "$OUT/hero-1080.mp4"
q -vf "$(yuv 1280 720)" -c:v libx264 -crf 22 -maxrate 2200k -bufsize 4400k -preset slow -profile:v high "${TAGS[@]}" "$OUT/hero-720.mp4"
"$FF" -hide_banner -loglevel error -y -i "$POSTER" -vf "scale=1920:-2:flags=lanczos" -q:v 2 "$OUT/hero-poster.jpg"
ls -l "$OUT"
