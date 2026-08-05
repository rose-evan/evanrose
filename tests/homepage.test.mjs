import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('loads the homepage directly without the terminal intro', () => {
  assert.doesNotMatch(html, /<aside[^>]+class="terminal"/i);
  assert.doesNotMatch(html, /terminal-ripple-canvas|INTRO_TIMING|playStartupIntro/);
  assert.match(html, /<h1 id="name">Evan Rose<\/h1>/);
});

test('renders the two shader layers', () => {
  assert.match(html, /id="liquid-canvas"/);
  assert.match(html, /id="dither-canvas"/);
  assert.match(html, /id="liquid-fragment"/);
  assert.match(html, /id="dither-fragment"/);
  assert.match(html, /getContext\('webgl2'/);
});

test('keeps the recommendation and contact destinations available', () => {
  assert.match(html, /Emergent Complexity/);
  assert.match(html, /youtube\.com\/watch\?v=0HqUYpGQIfs/);
  assert.match(html, /href="mailto:evanrose@ucla\.edu"/);
  assert.match(html, /href="https:\/\/x\.com\/evanr0se"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/evanucla\/"/);
});

test('provides accessible shader controls and reduced-motion behavior', () => {
  assert.match(html, /id="motion-toggle"[^>]+aria-label="Pause shader motion"/);
  assert.match(html, /id="texture-toggle"[^>]+aria-label="Use sage shader texture"/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /reduceMotion\.matches/);
});
