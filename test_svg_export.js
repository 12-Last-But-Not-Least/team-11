// Run: node test_svg_export.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'svg_export.js'), 'utf8'), context);
const { toSvg } = context.window.SvgChart;
const svg = toSvg({
  width: 800,
  height: 500,
  meta: { title: 'Test & <SVG>' },
  commands: [
    { op: 'rect', x: 0, y: 0, w: 800, h: 500, fill: '#fff' },
    { op: 'line', x1: 0, y1: 0, x2: 20, y2: 20, stroke: '#123', width: 2 },
    { op: 'polyline', points: [[10, 10], [100, 80]], stroke: '#234', width: 2, dash: [6, 4] },
    { op: 'circle', x: 35, y: 60, r: 4.5, fill: '#345' },
    { op: 'text', x: 24, y: 50, text: 'r = 0.2 & p < 0.05', font: '12px monospace',
      fill: '#456', align: 'center', rotate: -90, layer: 'static' }
  ]
});
assert.match(svg, /<svg /);
assert.match(svg, /<title>Test &amp; &lt;SVG&gt;<\/title>/);
assert.match(svg, /stroke-dasharray="6 4"/);
assert.match(svg, /text-anchor="middle"/);
assert.match(svg, /rotate\(-90 24 50\)/);
assert.match(svg, /r = 0\.2 &amp; p &lt; 0\.05/);
assert.equal((svg.match(/<circle /g) || []).length, 1);
assert.throws(() => toSvg({ commands: [] }), /valid render spec/);
assert.throws(() => toSvg({ width: 800, height: 500,
  commands: [{ op: 'unknown' }] }), /Unsupported/);
console.log('SVG exporter tests passed');
