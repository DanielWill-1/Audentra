const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { chromium } = require('playwright');

const baseUrl = (process.env.P10_PERF_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const routes = ['/', '/features', '/documentation'];
const coldRuns = 5;
const warmRounds = 3;

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

function summary(samples) {
  const load = samples.map((sample) => sample.load_ms);
  const dcl = samples.map((sample) => sample.dom_content_loaded_ms);
  const ttfb = samples.map((sample) => sample.ttfb_ms);
  return {
    samples: samples.length,
    load_ms: {
      median: Number(percentile(load, 0.5).toFixed(1)),
      p95: Number(percentile(load, 0.95).toFixed(1)),
    },
    dom_content_loaded_ms: {
      median: Number(percentile(dcl, 0.5).toFixed(1)),
      p95: Number(percentile(dcl, 0.95).toFixed(1)),
    },
    ttfb_ms: {
      median: Number(percentile(ttfb, 0.5).toFixed(1)),
      p95: Number(percentile(ttfb, 0.95).toFixed(1)),
    },
  };
}

async function navigate(page, route, failedRequests) {
  const response = await page.goto(baseUrl + route, {
    waitUntil: 'load',
    timeout: 30000,
  });
  if (!response || response.status() !== 200) {
    throw new Error('Route ' + route + ' returned ' + (response ? response.status() : 'no response') + '.');
  }
  const timing = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0];
    const resources = performance
      .getEntriesByType('resource')
      .filter((resource) => resource.duration > 100)
      .map((resource) => {
        const url = new URL(resource.name);
        return {
          host: url.hostname,
          path: url.pathname,
          duration_ms: Number(resource.duration.toFixed(1)),
          transfer_bytes: resource.transferSize || 0,
        };
      })
      .sort((left, right) => right.duration_ms - left.duration_ms)
      .slice(0, 8);
    return {
      ttfb_ms: entry.responseStart - entry.requestStart,
      dom_content_loaded_ms: entry.domContentLoadedEventEnd,
      load_ms: entry.loadEventEnd,
      resources,
    };
  });
  return {
    route,
    load_ms: Number(timing.load_ms.toFixed(1)),
    dom_content_loaded_ms: Number(timing.dom_content_loaded_ms.toFixed(1)),
    ttfb_ms: Number(timing.ttfb_ms.toFixed(1)),
    slow_resources: timing.resources,
    failed_requests: { ...failedRequests },
  };
}

function watchFailures(page, counts) {
  page.on('requestfailed', (request) => {
    let host = 'unknown';
    try {
      host = new URL(request.url()).hostname;
    } catch {
      // Do not include raw request URLs in the report.
    }
    const key = host + ':' + request.resourceType();
    counts[key] = (counts[key] || 0) + 1;
  });
}

async function main() {
  const launchStart = performance.now();
  const browser = await chromium.launch({ headless: true });
  const browserLaunchMs = Number((performance.now() - launchStart).toFixed(1));
  const coldSamples = [];
  const warmSamples = [];

  try {
    for (let index = 0; index < coldRuns; index += 1) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const failedRequests = {};
      watchFailures(page, failedRequests);
      coldSamples.push(await navigate(page, '/', failedRequests));
      await context.close();
    }

    const warmContext = await browser.newContext();
    const warmPage = await warmContext.newPage();
    const warmFailures = {};
    watchFailures(warmPage, warmFailures);
    await navigate(warmPage, '/', warmFailures);
    for (let round = 0; round < warmRounds; round += 1) {
      for (const route of routes) {
        warmSamples.push(await navigate(warmPage, route, warmFailures));
      }
    }
    await warmContext.close();

    const result = {
      measured_at: new Date().toISOString(),
      base_url: baseUrl,
      browser: {
        name: 'Chromium',
        version: browser.version(),
        playwright: require('playwright/package.json').version,
        launch_ms: browserLaunchMs,
      },
      machine: {
        platform: os.platform(),
        release: os.release(),
        architecture: os.arch(),
        cpu_model: os.cpus()[0]?.model || 'unknown',
        cpu_cores: os.cpus().length,
        memory_gib: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
      },
      setup: {
        services: 'Supabase and Django started before timing',
        cold: 'fresh browser context for each initial / navigation; empty HTTP cache',
        warm: 'same browser context and page; full-page navigation after one warmup / request',
        routes,
      },
      cold_initial_page: {
        summary: summary(coldSamples),
        samples: coldSamples,
      },
      warm_route_navigation: {
        summary: summary(warmSamples),
        samples: warmSamples,
      },
    };
    const outputIndex = process.argv.indexOf('--output');
    if (outputIndex !== -1 && process.argv[outputIndex + 1]) {
      const outputPath = path.resolve(process.argv[outputIndex + 1]);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
      result.output_file = outputPath;
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(error.message + '\n');
  process.exitCode = 1;
});
