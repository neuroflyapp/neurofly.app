# Hero film

`render.mjs` renders the homepage film frame by frame with NeuroFly's own
`BrainView` (from the app repository) and encodes it with ffmpeg. The spikes are
recorded from a seeded NeuroFly simulation run (`ClosedLoop`, bare arena,
hour 12, seed 11) including one looming stimulus; the camera sway is periodic,
so the clip loops without a seam.

    node render.mjs --ss=2 --seconds=14 --loom=5.5 --sway=0.32 --name=hero14 --crf=19

Web versions (two-pass H.264, faststart) from the master:

    ffmpeg -i hero14-1080.mp4 -c:v libx264 -b:v 2800k -maxrate 4200k -bufsize 5600k -pass 1 ... -f mp4 NUL
    ffmpeg -i hero14-1080.mp4 -c:v libx264 -b:v 2800k ... -pass 2 -movflags +faststart hero-1080.mp4
    (720p: scale=1280:720, 1400k)

Set `NEUROFLY_APP` to the app repository's `windows` folder; `FFMPEG` and
`CHROME` override the ffmpeg and Chrome executables.

Rendered masters, web encodes, posters and look-development stills are kept
outside git.

`experimental/` holds the walking close-up stage (the app's TerrariumView fed
with snapshots of a seeded run). It works but is not used on the site.
