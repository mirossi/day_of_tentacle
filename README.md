# Night of the Snapdragon

A point-and-click adventure game inspired by the graphic style and humor of
classic 90s LucasArts adventures like *Day of the Tentacle* — with voice
speech, sound effects and music. All original content: graphics are drawn
procedurally on a canvas, music and sound effects are synthesized with the
Web Audio API, and dialogue is spoken with the Web Speech API.

## Play

Serve the folder with any static server and open it in a browser:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly also works in most browsers.)

## How to play

- Classic SCUMM-style 9-verb interface: **Give, Open, Close, Pick up,
  Look at, Talk to, Use, Push, Pull**. Click a verb, then click something
  in the scene.
- Click anywhere on the floor to walk.
- **Use** or **Give** an inventory item: click the verb, click the item,
  then click the target in the scene.
- Toggle music and voice speech with the buttons in the bottom-right panel.

## The story

Professor Von Blob's prize snapdragon "Snappy" drank his Grow-O-Tonic and
is now nine feet tall, talkative, and planning to mulch the entire town.
You are Ned, the professor's almost-graduated assistant. Find a way into
the garden and cut Snappy down to size.

## Tech

- **Graphics**: hand-coded canvas 2D drawing — wobbly outlines, extreme
  perspective, saturated colors in the style of 90s cartoon adventures.
- **Music**: a Web Audio step sequencer with a different chiptune theme per
  room (plus a victory fanfare).
- **Sound effects**: synthesized oscillator/noise effects (zaps, crashes,
  cuckoos, hiccups...).
- **Speech**: every dialogue line is voiced via `speechSynthesis`, with a
  different pitch/rate per character, plus classic colored subtitle text
  above the speaker's head. Falls back to timed subtitles when speech
  synthesis is unavailable.
- No dependencies, no build step — plain HTML/CSS/JS.
