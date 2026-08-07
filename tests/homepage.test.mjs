import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('loads the homepage directly without the terminal intro', () => {
  assert.doesNotMatch(html, /<aside[^>]+class="terminal"/i);
  assert.doesNotMatch(html, /terminal-ripple-canvas|INTRO_TIMING|playStartupIntro/);
  assert.match(html, /<h1 id="name">Evan Rose<\/h1>/);
  assert.doesNotMatch(html, /Personal index|identity-mark/);
});

test('renders the background, texture, and name shader layers', () => {
  assert.match(html, /id="liquid-canvas"/);
  assert.match(html, /id="dither-canvas"/);
  assert.match(html, /id="name-canvas"/);
  assert.match(html, /id="liquid-fragment"/);
  assert.match(html, /id="dither-fragment"/);
  assert.match(html, /id="name-fragment"/);
  assert.match(html, /getContext\('webgl2'/);
});

test('assembles the accessible name and gives the pointer a lasting block wake', () => {
  assert.match(html, /uniform float u_progress/);
  assert.match(html, /uniform vec2 u_trail\[TRAIL\]/);
  assert.match(html, /const trailSize = 24/);
  assert.match(html, /age \/ 1\.1/);
  assert.match(html, /classList\.add\('name-shader-ready'\)/);
  assert.match(html, /\.identity\.name-shader-ready h1\s*\{[^}]*color:\s*transparent/s);
});

test('keeps text legible beneath the moving dither texture', () => {
  assert.match(html, /\.dither-canvas\s*\{[^}]*opacity:\s*0\.36/s);
  assert.match(html, /\.content\s*\{[^}]*text-shadow:/s);
});

test('keeps the recommendation and contact destinations available', () => {
  assert.match(html, /id="recommendations-heading">Recommendations<\/h2>/);
  assert.match(html, /Emergent Complexity/);
  assert.match(html, /youtube\.com\/watch\?v=0HqUYpGQIfs/);
  assert.match(html, /href="mailto:evanrose@ucla\.edu"/);
  assert.match(html, /href="https:\/\/x\.com\/evanr0se"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/evanucla\/"/);
});

test('provides an accessible motion control without a theme switch', () => {
  assert.match(html, /id="motion-toggle"[^>]+aria-label="Pause shader motion"/);
  assert.doesNotMatch(html, /id="texture-toggle"|u_palette|setPalette/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /reduceMotion\.matches/);
});
