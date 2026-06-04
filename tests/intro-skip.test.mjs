import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1];
const STORAGE_KEY = 'evanrose:intro-seen-until';
const NOW = 1_800_000_000_000;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach(name => this.values.add(name));
  }

  remove(...names) {
    names.forEach(name => this.values.delete(name));
  }

  toggle(name, force) {
    const shouldAdd = force === undefined ? !this.values.has(name) : Boolean(force);
    if (shouldAdd) {
      this.values.add(name);
    } else {
      this.values.delete(name);
    }
    return shouldAdd;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(name) {
    this.name = name;
    this.children = [];
    this.dataset = {};
    this.eventListeners = {};
    this.style = {};
    this.classList = new FakeClassList();
    this._innerHTML = '';
    this._textContent = '';
    this._value = '';
    this.textContentHistory = [];
    this.valueHistory = [];
    this.value = '';
    this.readOnly = false;
    this.scrollTop = 0;
    this.scrollHeight = 0;
    this.rect = { top: 100, left: 120, width: 700, height: 500, right: 820 };
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value);
    this._innerHTML = escapeHtml(value);
    this.textContentHistory.push(this._textContent);
  }

  get textContent() {
    return this._textContent;
  }

  set value(value) {
    this._value = String(value);
    this.valueHistory.push(this._value);
  }

  get value() {
    return this._value;
  }

  set className(value) {
    this._className = String(value);
  }

  get className() {
    return this._className || '';
  }

  appendChild(child) {
    this.children.push(child);
    this.scrollHeight = this.children.length;
    return child;
  }

  addEventListener(type, listener) {
    this.eventListeners[type] = listener;
  }

  contains(target) {
    return target === this || this.children.includes(target);
  }

  closest() {
    return null;
  }

  focus() {
    this.focused = true;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  setPointerCapture() {}
}

function createHarness(storageEntries = {}) {
  const elements = {
    terminal: new FakeElement('terminal'),
    home: new FakeElement('home'),
    out: new FakeElement('output'),
    input: new FakeElement('input'),
    body: new FakeElement('terminal-body'),
    introWriterText: new FakeElement('intro-writer-text'),
    resizeHandleBottomLeft: new FakeElement('resize-handle-bl'),
    resizeHandleBottom: new FakeElement('resize-handle-b'),
    documentBody: new FakeElement('document-body'),
    documentElement: new FakeElement('document-element')
  };
  const storage = new Map(Object.entries(storageEntries));
  const scheduledTimeouts = [];
  const scheduledAnimationFrames = [];

  const document = {
    body: elements.documentBody,
    documentElement: elements.documentElement,
    querySelector(selector) {
      if (selector === '.terminal') return elements.terminal;
      if (selector === '.home') return elements.home;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.resize-handle') {
        return [elements.resizeHandleBottomLeft, elements.resizeHandleBottom];
      }
      return [];
    },
    getElementById(id) {
      return {
        output: elements.out,
        input: elements.input,
        body: elements.body,
        'intro-writer-text': elements.introWriterText
      }[id];
    },
    createElement(name) {
      return new FakeElement(name);
    },
    addEventListener() {}
  };

  const sandbox = {
    document,
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    },
    Date: class extends Date {
      static now() {
        return NOW;
      }
    },
    performance: { now: () => 0 },
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ fontSize: '16px' }),
    setTimeout(callback, ms) {
      scheduledTimeouts.push({ callback, ms });
      return scheduledTimeouts.length;
    },
    clearTimeout() {},
    requestAnimationFrame(callback) {
      scheduledAnimationFrames.push(callback);
      return scheduledAnimationFrames.length;
    },
    cancelAnimationFrame() {},
    addEventListener() {},
    innerWidth: 1200,
    innerHeight: 900,
    console,
    Math,
    Promise
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  return { elements, scheduledAnimationFrames, scheduledTimeouts, sandbox, storage };
}

function runHomepageScript(storageEntries) {
  const harness = createHarness(storageEntries);
  vm.runInNewContext(script, harness.sandbox);
  return harness;
}

async function drainScheduledTimeouts(harness, limit = 1000) {
  for (let i = 0; i < limit; i += 1) {
    for (let j = 0; j < 10; j += 1) await Promise.resolve();

    if (harness.scheduledTimeouts.length === 0) {
      for (let j = 0; j < 10; j += 1) await Promise.resolve();
      if (harness.scheduledTimeouts.length === 0) return;
    }

    const { callback } = harness.scheduledTimeouts.shift();
    callback();
  }

  assert.fail(`startup animation still had ${harness.scheduledTimeouts.length} pending timeouts`);
}

function allDescendants(element) {
  return element.children.flatMap(child => [child, ...allDescendants(child)]);
}

async function runScheduledAnimationFrames(harness, now = 5000) {
  const callbacks = harness.scheduledAnimationFrames.splice(0);
  assert.ok(callbacks.length > 0, 'expected an animation frame to be scheduled');
  callbacks.forEach(callback => callback(now));
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

test('skips the startup terminal animation while the five-minute intro marker is valid', () => {
  const { elements, scheduledTimeouts } = runHomepageScript({
    [STORAGE_KEY]: String(NOW + 60_000)
  });

  assert.equal(scheduledTimeouts.length, 0);
  assert.equal(elements.documentBody.classList.contains('is-revealed'), true);
  assert.equal(elements.home.classList.contains('is-visible'), true);
  assert.equal(elements.terminal.classList.contains('is-docked'), true);
  assert.equal(elements.input.readOnly, false);
  assert.match(
    elements.out.children.map(child => child.innerHTML).join('\n'),
    /i'm evan rose/
  );
});

test('sets a five-minute intro marker before scheduling the first startup animation', () => {
  const { scheduledTimeouts, storage } = runHomepageScript();

  assert.equal(storage.get(STORAGE_KEY), String(NOW + 5 * 60 * 1000));
  assert.equal(scheduledTimeouts.length, 1);
});

test('hides the bottom prompt while waiting to type the startup command', () => {
  const { elements, scheduledTimeouts } = runHomepageScript();

  assert.equal(scheduledTimeouts.length, 1);
  assert.equal(elements.documentBody.classList.contains('is-typing-intro'), true);
  assert.equal(elements.input.readOnly, true);
});

test('types the startup greeting and about command inside the terminal output', async () => {
  const harness = runHomepageScript();

  await drainScheduledTimeouts(harness);

  const outputElements = allDescendants(harness.elements.out);
  const commandWriter = outputElements.find(element =>
    element.textContentHistory.includes('oh hey') &&
    element.textContentHistory.includes('about') &&
    element.textContentHistory.includes('')
  );

  assert.ok(commandWriter);
  assert.deepEqual(
    harness.elements.input.valueHistory.filter(value => value === 'oh hey' || value === 'about'),
    []
  );
  assert.equal(
    harness.elements.introWriterText.textContentHistory.some(value => value.includes("i'm evan rose")),
    false
  );
});

test('keeps the bottom prompt hidden until the terminal finishes expanding', async () => {
  const harness = runHomepageScript();

  await drainScheduledTimeouts(harness);

  assert.equal(harness.elements.documentBody.classList.contains('is-typing-intro'), true);
  assert.equal(harness.elements.input.readOnly, true);

  await runScheduledAnimationFrames(harness);

  assert.equal(harness.elements.documentBody.classList.contains('is-typing-intro'), false);
  assert.equal(harness.elements.input.readOnly, false);
});
