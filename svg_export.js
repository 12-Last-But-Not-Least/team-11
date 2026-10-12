/*
 * SVG export for the existing Warm_up_project Canvas render specification.
 * Uses the same spec.commands returned by GET /plot/scatter or /plot/line.
 * No backend changes or charting libraries required.
 *
 * Usage:
 *   const spec = await (await fetch('http://127.0.0.1:8000/plot/scatter')).json();
 *   const xml = SvgChart.toSvg(spec);
 *   SvgChart.download(spec, 'scatter.svg');
 *
 * Export includes the original chart and its statistics. Client-side zoom/pan
 * state from interactive.js is NOT included.
 */
(function (global) {
  'use strict';

  function escapeXml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch];
    });
  }

  function num(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error('Invalid SVG coordinate: ' + value);
    return String(n);
  }

  function attr(name, value) {
    return ' ' + name + '="' + escapeXml(value) + '"';
  }

  function optionalAttr(name, value) {
    return value == null ? '' : attr(name, value);
  }

  function strokeAttrs(c) {
    let result = optionalAttr('stroke', c.stroke);
    result += optionalAttr('stroke-width', c.width);
    if (Array.isArray(c.dash) && c.dash.length) {
      result += attr('stroke-dasharray', c.dash.map(num).join(' '));
    }
    return result;
  }

  function commandToSvg(c) {
    const layer = optionalAttr('data-layer', c.layer);
    switch (c.op) {
      case 'rect':
        return '<rect' + attr('x', num(c.x)) + attr('y', num(c.y)) +
          attr('width', num(c.w)) + attr('height', num(c.h)) +
          attr('fill', c.fill || 'none') + strokeAttrs(c) + layer + '/>';
      case 'line':
        return '<line' + attr('x1', num(c.x1)) + attr('y1', num(c.y1)) +
          attr('x2', num(c.x2)) + attr('y2', num(c.y2)) +
          attr('fill', 'none') + strokeAttrs(c) + layer + '/>';
      case 'polyline':
        return '<polyline' + attr('points', (c.points || []).map(function (p) {
          return num(p[0]) + ',' + num(p[1]);
        }).join(' ')) + attr('fill', 'none') + strokeAttrs(c) + layer + '/>';
      case 'circle':
        return '<circle' + attr('cx', num(c.x)) + attr('cy', num(c.y)) +
          attr('r', num(c.r)) + attr('fill', c.fill || 'none') +
          strokeAttrs(c) + layer + '/>';
      case 'text': {
        const anchor = { left: 'start', center: 'middle', right: 'end' }[c.align] || 'start';
        const rotate = c.rotate ? attr('transform', 'rotate(' + num(c.rotate) +
          ' ' + num(c.x) + ' ' + num(c.y) + ')') : '';
        const font = c.font ? attr('style', 'font: ' + c.font + ';') : '';
        return '<text' + attr('x', num(c.x)) + attr('y', num(c.y)) +
          attr('text-anchor', anchor) + attr('fill', c.fill || '#111827') +
          font + rotate + layer + '>' + escapeXml(c.text) + '</text>';
      }
      default:
        throw new Error('Unsupported rendering command: ' + c.op);
    }
  }

  function toSvg(spec) {
    if (!spec || !Array.isArray(spec.commands) || !Number.isFinite(spec.width) ||
        !Number.isFinite(spec.height) || spec.width <= 0 || spec.height <= 0) {
      throw new Error('Expected a valid render spec from /plot/scatter or /plot/line');
    }
    const title = spec.meta && spec.meta.title || 'Correlation graph';
    const desc = 'Plot exported from the CSE 210 graphing tool; includes correlation statistics.';
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<svg xmlns="http://www.w3.org/2000/svg"' +
      attr('width', num(spec.width)) + attr('height', num(spec.height)) +
      attr('viewBox', '0 0 ' + num(spec.width) + ' ' + num(spec.height)) +
      attr('role', 'img') + attr('aria-label', title) + '>\n' +
      '  <title>' + escapeXml(title) + '</title>\n' +
      '  <desc>' + escapeXml(desc) + '</desc>\n' +
      spec.commands.map(function (c) { return '  ' + commandToSvg(c); }).join('\n') +
      '\n</svg>\n';
  }

  function download(spec, fileName) {
    const svg = toSvg(spec);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'correlation-graph.svg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Delayed cleanup gives the browser time to start the download.
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  global.SvgChart = { toSvg: toSvg, download: download };
})(window);
