// Run: node test_interactive.js
// Wheel behavior of interactive.js: a plain scroll must scroll the page, and
// only Ctrl/⌘ + wheel (or a trackpad pinch, which browsers send as Ctrl + wheel)
// zooms the chart.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const SRC = fs.readFileSync(path.join(__dirname, 'interactive.js'), 'utf8');

// Shaped like a GET /plot/scatter response (800x500, both axes 0-1).
// Plot area x 70-590, y 50-440, so pixel (330, 245) is data (0.5, 0.5).
const SPEC = {
  width: 800,
  height: 500,
  commands: [
    { op: 'rect', x: 0, y: 0, w: 800, h: 500, fill: '#ffffff', layer: 'static' },
    { op: 'text', x: 330, y: 28, text: 'Fall deaths (normalized) vs. iPhone sales (normalized)',
      font: 'bold 16px sans-serif', fill: '#111827', align: 'center', layer: 'static' },
    { op: 'circle', x: 330, y: 245, r: 4.5, fill: '#2563eb', layer: 'plot' },
  ],
  stats: { n: 12, r: 0.9626, r_squared: 0.9265, t: 11.23, df: 10, p_value: 5.44e-7,
           slope: 1.0425, intercept: 0.0523 },
  data: {
    plot_area: { left: 70, right: 590, top: 50, bottom: 440 },
    x_axis: { min: 0, max: 1, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1], decimals: 1, from_data: false },
    y_axis: { min: 0, max: 1, ticks: [0, 0.2, 0.4, 0.6, 0.8, 1], decimals: 1, from_data: false },
    series: [{ name: 'data', kind: 'points', color: '#2563eb', radius: 4.5,
               points: [{ x: 0.5, y: 0.5, label: '2012\nx: 0.5\ny: 0.5' }] }],
    fit: { slope: 1.0425, intercept: 0.0523, x_min: 0, x_max: 1, color: '#6b7280' },
  },
  meta: { title: 'Fall deaths (normalized) vs. iPhone sales (normalized)',
          x_label: 'iPhone sales (normalized)', y_label: 'Fall deaths (normalized)' },
};

// A chart on a fake canvas. Frames and timers only run when the test says so.
function setup() {
  const listeners = {}, frames = [], timers = new Map(), texts = [];
  let nextTimer = 1;
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'fillText') return (s) => texts.push(String(s));
      if (k === 'measureText') return (s) => ({ width: 7 * String(s).length });
      return k in t ? t[k] : () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  const canvas = {
    width: 0, height: 0,
    getContext: () => ctx,
    addEventListener: (type, fn) => { listeners[type] = fn; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: SPEC.width, height: SPEC.height }),
  };
  const context = {
    window: { addEventListener() {} },
    requestAnimationFrame: (fn) => frames.push(fn),
    setTimeout: (fn) => { timers.set(nextTimer, fn); return nextTimer++; },
    clearTimeout: (id) => timers.delete(id),
  };
  vm.runInNewContext(SRC, context);
  const chart = new context.window.InteractiveChart(canvas, JSON.parse(JSON.stringify(SPEC)));
  return {
    chart,
    wheel(opts) {
      const e = { clientX: 330, clientY: 245, deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false,
                  metaKey: false, shiftKey: false, altKey: false, defaultPrevented: false,
                  ...opts, preventDefault() { this.defaultPrevented = true; } };
      listeners.wheel(e);
      return e;
    },
    // Text drawn by the next animation frame.
    nextFrameText() {
      texts.length = 0;
      frames.splice(0).forEach((f) => f());
      return texts.join('\n');
    },
    runTimers() {
      const due = [...timers.values()];
      timers.clear();
      due.forEach((f) => f());
    },
  };
}

function assertView(view, want) {
  for (const k of ['x0', 'x1', 'y0', 'y1']) {
    assert.ok(Math.abs(view[k] - want[k]) < 1e-9, `view.${k} is ${view[k]}, expected ${want[k]}`);
  }
}

// The view after these wheel events (Ctrl held unless an event says otherwise)
// at the centre of the plot. Zoom-speed tests compare views instead of
// hard-coding amounts, so tuning ZOOM_SPEED doesn't break them.
function viewAfter(...events) {
  const t = setup();
  for (const e of events) t.wheel({ ctrlKey: true, ...e });
  return { ...t.chart.view };
}

const HOME = { x0: 0, x1: 1, y0: 0, y1: 1 };
const ONE_NOTCH = { deltaY: -100 };  // one mouse-wheel notch towards zooming in

const tests = {
  'plain wheel over the plot scrolls the page and leaves the chart alone'() {
    const t = setup();
    const e = t.wheel({ deltaY: 100 });
    assert.equal(e.defaultPrevented, false, 'page scroll was cancelled');
    assertView(t.chart.view, HOME);
  },
  'Ctrl + wheel zooms in a moderate step around the cursor, not the whole page'() {
    const t = setup();
    const e = t.wheel({ ...ONE_NOTCH, ctrlKey: true });
    assert.equal(e.defaultPrevented, true);
    const v = t.chart.view, width = v.x1 - v.x0;
    assert.ok(width >= 0.7 && width <= 0.95, `one notch left ${width} of the range (want 0.7-0.95)`);
    assert.ok(Math.abs(v.x0 + v.x1 - 1) < 1e-9 && Math.abs(v.y0 + v.y1 - 1) < 1e-9,
              'zoom did not stay centred on the cursor');
  },
  '⌘ + wheel zooms the same as Ctrl + wheel (Mac)'() {
    const t = setup();
    const e = t.wheel({ ...ONE_NOTCH, metaKey: true });
    assert.equal(e.defaultPrevented, true);
    assert.notEqual(t.chart.view.x1 - t.chart.view.x0, 1, 'did not zoom');
    assertView(t.chart.view, viewAfter(ONE_NOTCH));
  },
  'Ctrl + Shift + wheel reported as horizontal (macOS) zooms x in, not out'() {
    const v = viewAfter({ deltaY: 0, deltaX: -100, shiftKey: true });
    const ref = viewAfter(ONE_NOTCH);
    assertView(v, { x0: ref.x0, x1: ref.x1, y0: 0, y1: 1 });
  },
  'Ctrl + wheel with no movement leaves the chart alone'() {
    assertView(viewAfter({ deltaY: 0, deltaX: 0 }), HOME);
  },
  'ten small scroll events zoom exactly as much as one big one (trackpads)'() {
    const many = viewAfter(...Array(10).fill({ deltaY: -10 }));
    assertView(many, viewAfter(ONE_NOTCH));
  },
  'a notch reported as 3 lines zooms like a 100 px notch (Firefox)'() {
    assertView(viewAfter({ deltaY: -3, deltaMode: 1 }), viewAfter(ONE_NOTCH));
  },
  'a scroll reported in pages zooms at most one notch'() {
    assertView(viewAfter({ deltaY: -1, deltaMode: 2 }), viewAfter(ONE_NOTCH));
  },
  'a hard flick zooms no more than one notch per event'() {
    assertView(viewAfter({ deltaY: -2000 }), viewAfter(ONE_NOTCH));
  },
  'plain wheel shows a zoom hint that goes away again'() {
    const t = setup();
    t.wheel({ deltaY: 100 });
    assert.match(t.nextFrameText(), /zoom/i, 'no hint after a plain scroll');
    t.runTimers();
    assert.doesNotMatch(t.nextFrameText(), /zoom/i, 'hint never went away');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    fn();
    console.log(`ok    ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}\n      ${err.message.split('\n')[0]}`);
  }
}
if (failed) {
  console.log(`\n${failed} of ${Object.keys(tests).length} interactive.js tests failed`);
  process.exit(1);
}
console.log('interactive.js tests passed');
