// Read-only review probe: execute the shipped browser module with a minimal fake DOM.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function fixture() {
  const controls = new Map();
  function control(selector) {
    if (!controls.has(selector)) controls.set(selector, {
      disabled: selector === '[data-record-stop]', value: '', hidden: true,
      handlers: {}, addEventListener(type, callback) { this.handlers[type] = callback; },
      pause() {}, load() {}, removeAttribute() {}, focus() {},
    });
    return controls.get(selector);
  }
  const form = { querySelector: control };
  const root = { dataset: { maxAudioBytes: '100', apiMarker: 'fixture' } };
  const pending = [];
  const stops = [];
  const recorders = [];
  const streams = [];
  const events = {};
  class Recorder {
    static isTypeSupported() { return true; }
    constructor(stream, settings) {
      this.stream = stream; this.mimeType = settings.mimeType;
      this.state = 'inactive'; this.handlers = {}; recorders.push(this);
    }
    addEventListener(type, callback) { this.handlers[type] = callback; }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      stops.push(() => {
        this.handlers.dataavailable?.({ data: new Blob(['fake']) });
        this.handlers.stop?.();
      });
    }
  }
  const context = {
    document: { querySelector: (selector) => selector === '[data-voice-root]' ? root : form },
    navigator: { mediaDevices: { getUserMedia: () => new Promise((resolve) => pending.push(resolve)) } },
    MediaRecorder: Recorder, Blob, Error,
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} },
    addEventListener: (type, callback) => { events[type] = callback; },
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,
    '../../../../../migration/django/static/js/p7_media.js'), 'utf8'), context);
  function resolve(index) {
    const stream = { stopped: false, getTracks() { return [{ stop: () => { stream.stopped = true; } }]; } };
    streams[index] = stream; pending[index](stream);
  }
  return { controls, control, recorders, streams, stops, resolve, events };
}

(async () => {
  const findings = [];
  {
    const f = fixture();
    const first = f.control('[data-record-start]').handlers.click();
    f.resolve(0); await first;
    f.control('[data-record-reset]').handlers.click();
    const second = f.control('[data-record-start]').handlers.click();
    f.resolve(1); await second;
    f.stops.shift()(); // Old recorder's delayed stop arrives after the new start.
    assert.equal(f.streams[1].stopped, true);
    assert.equal(f.recorders[1].state, 'recording');
    findings.push({ id: 'P8-R1a', observed: 'Old stop callback stops the new recording stream while its recorder remains recording.' });
  }
  {
    const f = fixture();
    const first = f.control('[data-record-start]').handlers.click();
    assert.equal(f.control('[data-record-start]').disabled, false);
    const second = f.control('[data-record-start]').handlers.click();
    f.resolve(1); await second;
    f.resolve(0); await first; // Stale permission result overwrites the global stream.
    f.events.pagehide();
    assert.equal(f.streams[0].stopped, true);
    assert.equal(f.streams[1].stopped, false);
    findings.push({ id: 'P8-R1b', observed: 'Out-of-order permission results leave the current microphone stream unstopped on pagehide.' });
  }
  {
    const f = fixture();
    const start = f.control('[data-record-start]').handlers.click();
    f.resolve(0); await start;
    assert.equal(f.recorders[0].handlers.error, undefined);
    findings.push({ id: 'P8-R2', observed: 'No MediaRecorder error event handler is registered; recorder error cleanup is untested and unhandled.' });
  }
  process.stdout.write(JSON.stringify({
    captured_at: new Date().toISOString(),
    method: 'Node VM; shipped p7_media.js; fake DOM/MediaRecorder; no browser, microphone, network or provider call',
    purpose: 'Assertions confirm review defects in current code, not successful acceptance tests.',
    findings,
  }, null, 2) + '\n');
})().catch((error) => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
