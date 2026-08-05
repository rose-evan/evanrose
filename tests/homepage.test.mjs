import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('loads the homepage content directly without the terminal intro', () => {
  assert.doesNotMatch(html, /<aside[^>]+class="terminal"/i);
  assert.doesNotMatch(html, /terminal-ripple-canvas|INTRO_TIMING|playStartupIntro/);
  assert.match(html, /<h1 id="name">Evan Rose<\/h1>/);
  assert.match(html, /class="gradient-field"/);
});

test('keeps the homepage focused on the recommendation', () => {
  assert.doesNotMatch(html, /I build software, think about general purpose robotics/);
  assert.doesNotMatch(html, /Personal website|projects\/#personal-site/);
  assert.match(html, /Emergent Complexity/);
  assert.match(html, /youtube\.com\/watch\?v=0HqUYpGQIfs/);
});

test('keeps the contact destinations available', () => {
  assert.match(html, /href="mailto:evanrose@ucla\.edu"/);
  assert.match(html, /href="https:\/\/x\.com\/evanr0se"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/evanucla\/"/);
});

test('provides accessible controls for the interactive visual treatment', () => {
  assert.match(html, /id="motion-toggle"[^>]+aria-label="Pause background motion"/);
  assert.match(html, /id="theme-toggle"[^>]+aria-label="Switch to night theme"/);
  assert.match(html, /prefers-reduced-motion: reduce/);
  assert.match(html, /addEventListener\('pointermove'/);
});
