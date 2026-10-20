#!/usr/bin/env node
// Evaluate one parity case from stdin (JSON) and print the JS result.
// Used by tests/test_parity_stats.py so Python and JS stay aligned.
import { readFileSync } from "node:fs";
import {
  correlationStats,
  yearOverYearCorrelation,
  leaveOneOutCorrelation,
} from "../frontend/src/stats.js";
import { buildScatter } from "../frontend/src/render.js";

const input = JSON.parse(readFileSync(0, "utf8"));
const { kind, case: c } = input;

try {
  if (kind === "correlation") {
    if (c.error) {
      try {
        correlationStats(c.x, c.y);
        console.log(JSON.stringify({ ok: true, unexpected: true }));
      } catch (e) {
        console.log(JSON.stringify({ ok: false, error: e.message }));
      }
    } else {
      console.log(JSON.stringify({ ok: true, result: correlationStats(c.x, c.y) }));
    }
  } else if (kind === "year_over_year") {
    console.log(JSON.stringify({
      ok: true,
      result: yearOverYearCorrelation(c.years, c.x, c.y),
    }));
  } else if (kind === "leave_one_out") {
    console.log(JSON.stringify({
      ok: true,
      result: leaveOneOutCorrelation(c.x, c.y),
    }));
  } else if (kind === "render") {
    const stats = correlationStats(c.x, c.y);
    const spec = buildScatter(c.x, c.y, stats, {
      width: c.width, height: c.height, xLabel: "x", yLabel: "y",
    });
    console.log(JSON.stringify({
      ok: true,
      result: {
        width: spec.width,
        height: spec.height,
        x_axis: { min: spec.data.x_axis.min, max: spec.data.x_axis.max },
        y_axis: { min: spec.data.y_axis.min, max: spec.data.y_axis.max },
        fit: spec.data.fit && {
          x_min: spec.data.fit.x_min,
          x_max: spec.data.fit.x_max,
          slope: spec.data.fit.slope,
          intercept: spec.data.fit.intercept,
        },
        n_circles: spec.commands.filter((cmd) => cmd.op === "circle").length,
        n_points: spec.data.series[0].points.length,
      },
    }));
  } else {
    console.log(JSON.stringify({ ok: false, error: `unknown kind ${kind}` }));
    process.exitCode = 1;
  }
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e.message }));
}
