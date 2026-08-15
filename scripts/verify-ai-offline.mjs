#!/usr/bin/env node
/**
 * AgriScan-AI :: offline AI-layer verification
 *
 *   node scripts/verify-ai-offline.mjs
 *
 * Needs no API key and makes no network calls, so it is safe in CI and as a
 * pre-commit check. It compiles services/ai/** to CommonJS and exercises the
 * REAL shipped modules - provider selection, model chains, image parsing,
 * error classification, response extraction, and result normalization - rather
 * than a re-implementation of them.
 *
 * The live counterpart is scripts/verify-openai.mjs, which needs a key.
 */

import { join } from 'node:path';
import { compileAiLayer, ROOT } from './lib/compile-ai.mjs';

const pass = (m) => console.log(`  \x1b[32mPASS\x1b[0m  ${m}`);
const fail = (m) => console.log(`  \x1b[31mFAIL\x1b[0m  ${m}`);
const info = (m) => console.log(`        ${m}`);
const step = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

let failures = 0;
function check(ok, msg, detail) {
  if (ok) pass(msg);
  else { failures++; fail(msg); if (detail !== undefined) info(detail); }
}
const eq = (actual, expected, msg) =>
  check(
    JSON.stringify(actual) === JSON.stringify(expected),
    msg,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );

function throws(fn, predicate, msg) {
  try {
    fn();
    check(false, msg, 'no error was thrown');
  } catch (e) {
    check(predicate(e), msg, `unexpected error: ${e?.message}`);
  }
}

// ── compile the real modules ─────────────────────────────────────────────────
step('Compiling services/ai → CommonJS');
let load, cleanup, require;
try {
  ({ load, cleanup, require } = compileAiLayer());
  pass('tsc emitted without errors');
} catch (e) {
  fail('tsc failed');
  info(String(e.tscOutput ?? e.message).slice(0, 2000));
  process.exitCode = 1;
  process.exit(1);
}

const contract = load('services/ai/contract.js');
const aiErrors = load('services/ai/errors.js');
const image = load('services/ai/image.js');
const models = load('services/ai/models.js');
const openaiProvider = load('services/ai/openai-provider.js');
const serviceErrors = load('services/errors.js');
const index = load('services/ai/index.js');

const { ServiceError } = serviceErrors;
const { APIError } = require(join(ROOT, 'node_modules/openai/core/error.js'));

// Restore env between cases so one test cannot leak into the next.
const ENV_KEYS = [
  'AI_PROVIDER', 'OPENAI_API_KEY', 'OPENAI_KEY', 'GEMINI_API_KEY',
  'OPENAI_MODEL', 'GEMINI_MODEL', 'OPENAI_MAX_RETRIES',
];
const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
const withEnv = (overrides, fn) => {
  const restore = () => {
    for (const k of ENV_KEYS) delete process.env[k];
    for (const [k, v] of Object.entries(savedEnv)) if (v !== undefined) process.env[k] = v;
  };

  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, overrides);

  let result;
  try {
    result = fn();
  } catch (e) {
    restore();
    throw e;
  }

  // An async fn must keep the overrides in place until it settles - restoring
  // in a synchronous `finally` would undo them at the callback's first await.
  if (result && typeof result.then === 'function') {
    return result.then(
      (value) => { restore(); return value; },
      (error) => { restore(); throw error; }
    );
  }

  restore();
  return result;
};

const REAL_KEY = 'sk-proj-' + 'a'.repeat(140);

// ── 1. strict-mode schema legality ───────────────────────────────────────────
step('[1] Structured-output schema is strict-mode legal');
const schema = contract.ANALYSIS_JSON_SCHEMA;
check(schema.additionalProperties === false, 'root sets additionalProperties: false');
check(schema.type === 'object', 'root is an object (anyOf at root is rejected by strict mode)');
eq(
  [...schema.required].sort(),
  Object.keys(schema.properties).sort(),
  'every property appears in `required`'
);
check(
  !JSON.stringify(schema).match(/"(allOf|not|if|then|else)"/),
  'schema uses no composition keywords unsupported by strict mode'
);

// ── 2. normalization clamps hostile payloads ─────────────────────────────────
step('[2] normalizeAnalysis clamps and defaults');
const hostile = contract.normalizeAnalysis(
  {
    diagnosis: '', confidence: 140, severity: 'Catastrophic', symptoms: '',
    visibleOrgans: 'leaf', likelyCause: null, affectedAreaPercent: -20,
    treatmentPriority: 'Immediately', organicTreatments: null, chemicalTreatments: [1, 2],
  },
  'OpenAI'
);
eq(hostile.confidence, 99, 'confidence 140 clamps to 99');
eq(hostile.affectedAreaPercent, 0, 'affectedAreaPercent -20 clamps to 0');
eq(hostile.severity, 'Low', 'unknown severity falls back to Low');
eq(hostile.treatmentPriority, 'Monitor', 'unknown treatmentPriority falls back to Monitor');
eq(hostile.visibleOrgans, [], 'non-array visibleOrgans becomes []');
eq(hostile.organicSteps, [], 'null organicTreatments becomes []');
eq(hostile.chemicalSteps, ['1', '2'], 'non-string treatment entries are stringified');
eq(hostile.diagnosis, 'Unable to assess image', 'empty diagnosis gets the safe default');
check(hostile.symptoms.includes('OpenAI'), 'fallback symptom text names the active provider');

const clean = contract.normalizeAnalysis(
  { diagnosis: 'Early Blight', confidence: 72.6, severity: 'Medium', symptoms: 'Lesions.',
    visibleOrgans: ['leaf'], likelyCause: 'Disease', affectedAreaPercent: 18.2,
    scoutingNotes: 'Check row.', recommendedAction: 'Remove foliage.',
    treatmentPriority: 'Treat Soon', organicTreatments: ['a'], chemicalTreatments: ['b'] },
  'OpenAI'
);
eq(clean.confidence, 73, 'fractional confidence rounds to an integer');
eq(clean.severity, 'Medium', 'valid severity passes through');
eq(clean.organicSteps, ['a'], 'organicTreatments maps onto organicSteps');
eq(clean.chemicalSteps, ['b'], 'chemicalTreatments maps onto chemicalSteps');

// ── 3. image parsing ─────────────────────────────────────────────────────────
step('[3] Image parsing feeds both providers');
const jpegUrl = 'data:image/jpeg;base64,QUJD';
const parsedJpeg = image.parseImageInput(jpegUrl);
eq(parsedJpeg.dataUrl, jpegUrl, 'data URL passes through whole (OpenAI input_image)');
eq(parsedJpeg.base64, 'QUJD', 'base64 payload is split out (Gemini inlineData)');
eq(parsedJpeg.mimeType, 'image/jpeg', 'mime type is extracted');

const bare = image.parseImageInput('QUJD');
eq(bare.dataUrl, 'data:image/jpeg;base64,QUJD', 'bare base64 is wrapped into a data URL');
eq(bare.base64, 'QUJD', 'bare base64 is preserved');

eq(image.parseImageInput('data:image/PNG;base64,QUJD').mimeType, 'image/png', 'mime type is lowercased');
throws(() => image.parseImageInput('data:image/tiff;base64,QUJD'), (e) => e instanceof ServiceError && e.status === 400, 'unsupported format rejected with 400');
throws(() => image.parseImageInput('data:image/jpeg;base64,'), (e) => e instanceof ServiceError && e.status === 400, 'empty data URL rejected with 400');
throws(() => image.parseImageInput(''), (e) => e instanceof ServiceError && e.status === 400, 'empty input rejected with 400');

// ── 4. error taxonomy ────────────────────────────────────────────────────────
step('[4] Failure taxonomy drives batch abort decisions');
check(aiErrors.isFatalAiErrorCode('quota_exhausted'), 'quota_exhausted is fatal to a batch');
check(aiErrors.isFatalAiErrorCode('provider_not_configured'), 'provider_not_configured is fatal to a batch');
check(aiErrors.isFatalAiErrorCode('rate_limited'), 'rate_limited is fatal to a batch');
check(!aiErrors.isFatalAiErrorCode('analysis_refused'), 'analysis_refused is per-image, not fatal');
check(!aiErrors.isFatalAiErrorCode('invalid_response'), 'invalid_response is per-image, not fatal');
check(!aiErrors.isFatalAiErrorCode(undefined), 'a missing code is not treated as fatal');

eq(aiErrors.readRetryAfterSeconds({ headers: { 'retry-after': '42' } }), 42, 'Retry-After header (plain record) is read');
eq(aiErrors.readRetryAfterSeconds({ headers: new Headers({ 'retry-after': '9' }) }), 9, 'Retry-After header (Headers object) is read');
eq(aiErrors.readRetryAfterSeconds({}, 'please retry after 5s'), 5, 'retry hint is parsed from error text');
eq(aiErrors.readRetryAfterSeconds({}), aiErrors.DEFAULT_RETRY_AFTER_SECONDS, 'falls back to the default backoff');

// ── 5. OpenAI error classification ───────────────────────────────────────────
step('[5] OpenAI 429 is disambiguated (the distinction Gemini did not have)');
const apiError = (status, body, headers) =>
  APIError.generate(status, body, undefined, new Headers(headers ?? {}));

const quota = openaiProvider.classifyOpenAiError(
  apiError(429, { error: { message: 'You exceeded your current quota', type: 'insufficient_quota', code: 'insufficient_quota' } })
);
eq(quota.code, 'quota_exhausted', 'insufficient_quota → quota_exhausted');
check(quota.stopChain, 'quota_exhausted stops the model chain');

const rateLimited = openaiProvider.classifyOpenAiError(
  apiError(429, { error: { message: 'Rate limit reached', type: 'requests', code: 'rate_limit_exceeded' } }, { 'retry-after': '12' })
);
eq(rateLimited.code, 'rate_limited', 'rate_limit_exceeded → rate_limited (NOT quota_exhausted)');
eq(rateLimited.retryAfter, 12, 'rate limit surfaces the Retry-After value');

const unauthorized = openaiProvider.classifyOpenAiError(apiError(401, { error: { message: 'Incorrect API key provided' } }));
eq(unauthorized.code, 'provider_not_configured', '401 → provider_not_configured');
eq(unauthorized.status, 503, '401 is reported to callers as 503, not 500');
check(unauthorized.stopChain, 'a bad key stops the model chain immediately');

const missingModel = openaiProvider.classifyOpenAiError(apiError(404, { error: { message: 'model not found', code: 'model_not_found' } }));
eq(missingModel.code, 'model_unavailable', '404 → model_unavailable');
check(!missingModel.stopChain, 'a missing model falls through to the next model in the chain');

const network = openaiProvider.classifyOpenAiError(new Error('socket hang up'));
eq(network.code, 'model_unavailable', 'a non-API error still classifies');
check(!network.stopChain, 'a transport error lets the chain continue');

// ── 6. response extraction ───────────────────────────────────────────────────
step('[6] Response extraction detects refusals before parsing');
eq(
  openaiProvider.extractPayload({ output: [{ content: [{ type: 'refusal', refusal: 'I cannot help.' }] }] }),
  { kind: 'refusal', text: 'I cannot help.' },
  'a refusal part is detected instead of crashing JSON.parse'
);
eq(
  openaiProvider.extractPayload({ output_text: '{"a":1}' }),
  { kind: 'text', text: '{"a":1}' },
  'output_text is used for the normal path'
);
eq(
  openaiProvider.extractPayload({ output_text: '   ', status: 'incomplete' }),
  { kind: 'empty', text: '' },
  'whitespace-only output is treated as empty'
);
eq(openaiProvider.extractPayload({}), { kind: 'empty', text: '' }, 'a missing payload is empty, not a crash');
check(
  openaiProvider.extractPayload({
    output: [{ content: [{ type: 'refusal', refusal: 'no' }] }],
    output_text: '{"a":1}',
  }).kind === 'refusal',
  'a refusal wins over any output_text present alongside it'
);

// ── 7. model chains ──────────────────────────────────────────────────────────
step('[7] Model chains are per-plan and env-overridable');
withEnv({}, () => {
  const free = models.resolveModelChain('openai', 'Free');
  const pro = models.resolveModelChain('openai', 'Pro');
  const ent = models.resolveModelChain('openai', 'Enterprise');
  check(free.length > 0 && pro.length > 0 && ent.length > 0, 'every plan resolves a non-empty chain');
  check(
    JSON.stringify(free) !== JSON.stringify(pro) || JSON.stringify(pro) !== JSON.stringify(ent),
    'plan tiers are genuinely differentiated (they were identical before this migration)'
  );
  check(!JSON.stringify([free, pro, ent]).includes('gemini'), 'the OpenAI chains contain no Gemini model ids');
});
withEnv({ OPENAI_MODEL: 'gpt-5.6-terra' }, () => {
  const chain = models.resolveModelChain('openai', 'Free');
  eq(chain[0], 'gpt-5.6-terra', 'OPENAI_MODEL is tried first');
  eq(chain.length, new Set(chain).size, 'an override already in the chain is not duplicated');
});
withEnv({ GEMINI_MODEL: 'gemini-2.5-pro' }, () => {
  eq(models.resolveModelChain('gemini', 'Free')[0], 'gemini-2.5-pro', 'GEMINI_MODEL overrides the Gemini chain');
});

// ── 8. env-driven provider switching ─────────────────────────────────────────
step('[8] Provider is switchable purely from the environment');
withEnv({ AI_PROVIDER: 'gemini', OPENAI_API_KEY: REAL_KEY, GEMINI_API_KEY: 'g'.repeat(40) }, () =>
  eq(index.resolveAiProvider(), 'gemini', 'AI_PROVIDER=gemini wins even when an OpenAI key is present'));
withEnv({ AI_PROVIDER: 'openai', GEMINI_API_KEY: 'g'.repeat(40) }, () =>
  eq(index.resolveAiProvider(), 'openai', 'AI_PROVIDER=openai wins even with no OpenAI key set'));
withEnv({ AI_PROVIDER: '  GEMINI  ', GEMINI_API_KEY: 'g'.repeat(40) }, () =>
  eq(index.resolveAiProvider(), 'gemini', 'AI_PROVIDER is trimmed and case-insensitive'));
withEnv({ OPENAI_API_KEY: REAL_KEY, GEMINI_API_KEY: 'g'.repeat(40) }, () =>
  eq(index.resolveAiProvider(), 'openai', 'unset AI_PROVIDER auto-detects OpenAI when its key is present'));
withEnv({ GEMINI_API_KEY: 'g'.repeat(40) }, () =>
  eq(index.resolveAiProvider(), 'gemini', 'unset AI_PROVIDER falls back to Gemini when only its key is present'));
withEnv({}, () =>
  eq(index.resolveAiProvider(), 'openai', 'with no keys at all the default is OpenAI'));

console.log('        (the next line intentionally logs an error - a bad AI_PROVIDER must degrade, not throw)');
withEnv({ AI_PROVIDER: 'anthropic', OPENAI_API_KEY: REAL_KEY }, () =>
  eq(index.resolveAiProvider(), 'openai', 'an unrecognized AI_PROVIDER degrades to auto-detection instead of 500ing every scan'));

withEnv({ OPENAI_KEY: REAL_KEY }, () =>
  check(index.isAiConfigured('openai'), 'OPENAI_KEY is accepted as an alias for OPENAI_API_KEY'));
withEnv({ OPENAI_API_KEY: 'MY_OPENAI_API_KEY' }, () =>
  check(!index.isAiConfigured('openai'), 'the .env.example placeholder is not mistaken for a real key'));
withEnv({ OPENAI_API_KEY: 'sk-short' }, () =>
  check(!index.isAiConfigured('openai'), 'an implausibly short key is rejected'));
withEnv({ GEMINI_API_KEY: 'MY_GEMINI_API_KEY' }, () =>
  check(!index.isAiConfigured('gemini'), 'the Gemini placeholder is not mistaken for a real key'));

// ── 9. end-to-end through the real provider, with fetch stubbed ──────────────
step('[9] analyzeWithOpenAi end-to-end (network stubbed)');
const GOOD_PAYLOAD = {
  diagnosis: 'Early Blight', confidence: 71, severity: 'Medium', symptoms: 'Concentric lesions.',
  visibleOrgans: ['leaf'], likelyCause: 'Disease', affectedAreaPercent: 20,
  scoutingNotes: 'Check the lower canopy.', recommendedAction: 'Remove affected foliage.',
  treatmentPriority: 'Treat Soon', organicTreatments: ['Remove leaves.'], chemicalTreatments: ['Chlorothalonil.'],
};

const realFetch = globalThis.fetch;
const calls = [];
function stubFetch(handler) {
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), body: opts.body ? JSON.parse(opts.body) : null });
    return handler(calls.length);
  };
}
const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function runAnalyze(models_, handler) {
  calls.length = 0;
  stubFetch(handler);
  try {
    return { ok: true, value: await openaiProvider.analyzeWithOpenAi(jpegUrl, { plantName: 'Roma' }, models_) };
  } catch (e) {
    return { ok: false, error: e };
  } finally {
    globalThis.fetch = realFetch;
  }
}

// Distinct models attempted, as opposed to raw HTTP calls - the SDK may retry
// a single model more than once, which is not the chain advancing.
const modelsAttempted = () => new Set(calls.map((c) => c.body?.model)).size;

// OPENAI_MAX_RETRIES=0 makes calls.length === models attempted, so chain
// behaviour can be asserted exactly. Retry behaviour is covered separately below.
await withEnv({ OPENAI_API_KEY: REAL_KEY, OPENAI_MAX_RETRIES: '0' }, async () => {
  const happy = await runAnalyze(['gpt-5.6-luna'], () =>
    jsonResponse(200, { status: 'completed', output_text: JSON.stringify(GOOD_PAYLOAD) }));
  check(happy.ok, 'a well-formed response yields a result', happy.error?.message);
  if (happy.ok) {
    eq(happy.value.diagnosis, 'Early Blight', 'diagnosis survives the round trip');
    eq(happy.value.organicSteps, ['Remove leaves.'], 'treatment steps are remapped for the treatments table');
  }
  const sent = calls[0]?.body;
  eq(sent?.text?.format?.strict, true, 'the request asks for strict structured output');
  eq(sent?.input?.[0]?.content?.[1]?.image_url, jpegUrl, 'the whole data URL is sent as input_image');
  check(sent?.input?.[0]?.content?.[1]?.detail !== undefined, 'detail is always set (the SDK types it as required)');

  // 404 falls through; the second model answers.
  const fellThrough = await runAnalyze(['gpt-5.6-sol', 'gpt-5.6-luna'], (n) =>
    n === 1
      ? jsonResponse(404, { error: { message: 'model not found', code: 'model_not_found' } })
      : jsonResponse(200, { status: 'completed', output_text: JSON.stringify(GOOD_PAYLOAD) }));
  check(fellThrough.ok, 'a missing first model falls through to the next in the chain');
  eq(modelsAttempted(), 2, 'exactly two models were attempted');

  // 401 must NOT walk the rest of the chain.
  const badKey = await runAnalyze(['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna'], () =>
    jsonResponse(401, { error: { message: 'Incorrect API key provided' } }));
  check(!badKey.ok && badKey.error.status === 503, 'a bad key surfaces as 503');
  eq(badKey.error.code, 'provider_not_configured', 'a bad key is classified as provider_not_configured');
  eq(modelsAttempted(), 1, 'a bad key stops after one model instead of burning the whole chain');

  const quotaOut = await runAnalyze(['gpt-5.6-luna', 'gpt-4o-mini'], () =>
    jsonResponse(429, { error: { message: 'You exceeded your current quota', type: 'insufficient_quota', code: 'insufficient_quota' } }));
  check(!quotaOut.ok && quotaOut.error.status === 429, 'exhausted quota surfaces as 429');
  eq(quotaOut.error.code, 'quota_exhausted', 'exhausted quota is classified as quota_exhausted');
  eq(modelsAttempted(), 1, 'exhausted quota stops the chain instead of trying the next model');

  const refused = await runAnalyze(['gpt-5.6-luna'], () =>
    jsonResponse(200, { status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No.' }] }] }));
  check(!refused.ok && refused.error.code === 'analysis_refused', 'a refusal becomes analysis_refused, not a parser crash');
  check(!aiErrors.isFatalAiErrorCode(refused.error.code), 'a refused image does not abort a whole batch');

  const truncated = await runAnalyze(['gpt-5.6-luna'], () =>
    jsonResponse(200, { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: '' }));
  check(!truncated.ok && truncated.error.code === 'response_incomplete', 'a truncated response is reported as response_incomplete');
  check(truncated.error.message.includes('OPENAI_MAX_OUTPUT_TOKENS'), 'the truncation error names the setting that fixes it');

  const garbage = await runAnalyze(['gpt-5.6-luna'], () =>
    jsonResponse(200, { status: 'completed', output_text: 'not json at all' }));
  check(!garbage.ok && garbage.error.code === 'invalid_response', 'unparseable output is reported as invalid_response');
});

// OPENAI_MAX_RETRIES governs SDK-level retries of a *single* model. It is kept
// low by default so retries do not eat the route's maxDuration budget.
await withEnv({ OPENAI_API_KEY: REAL_KEY, OPENAI_MAX_RETRIES: '1' }, async () => {
  const retried = await runAnalyze(['gpt-5.6-luna'], () =>
    jsonResponse(429, { error: { message: 'Rate limit reached', code: 'rate_limit_exceeded' } }));
  check(!retried.ok && retried.error.code === 'rate_limited', 'a transient rate limit is classified as rate_limited');
  eq(calls.length, 2, 'OPENAI_MAX_RETRIES=1 retries the same model exactly once');
  eq(modelsAttempted(), 1, 'the retry stays on the same model rather than advancing the chain');
});

await withEnv({}, async () => {
  const unconfigured = await runAnalyze(['gpt-5.6-luna'], () => jsonResponse(200, {}));
  check(
    !unconfigured.ok && unconfigured.error.status === 503 && unconfigured.error.code === 'provider_not_configured',
    'a missing key fails fast with 503 before any network call'
  );
  eq(calls.length, 0, 'no request is made when no key is configured');
});

// ── 10. batch loop: ordering, concurrency, and abort semantics ───────────────
step('[10] Batch analysis loop');
const batch = load('services/batch-analysis.js');

const imageFor = (n) => `data:image/jpeg;base64,${Buffer.from(`image-${n}`).toString('base64')}`;
/** Recovers which image a stubbed request was for, so responses can differ per image. */
const imageIndexOf = (body) => {
  const url = body?.input?.[0]?.content?.[1]?.image_url ?? '';
  return Number(Buffer.from(url.split(',')[1] ?? '', 'base64').toString().replace('image-', ''));
};
const payloadFor = (n) => ({ ...GOOD_PAYLOAD, diagnosis: n % 2 === 0 ? 'Healthy' : `Blight ${n}` });

async function runBatch(count, handler, env = {}) {
  calls.length = 0;
  stubFetch(handler);
  try {
    return {
      ok: true,
      value: await withEnv(
        { OPENAI_API_KEY: REAL_KEY, OPENAI_MAX_RETRIES: '0', ...env },
        () => batch.runBatchAnalysis(Array.from({ length: count }, (_, i) => imageFor(i)), {}, 'test', 'Free')
      ),
    };
  } catch (e) {
    return { ok: false, error: e };
  } finally {
    globalThis.fetch = realFetch;
  }
}

// AI_BATCH_CONCURRENCY is read inside runBatchAnalysis, outside withEnv's key
// list, so set it directly around each case.
process.env.AI_BATCH_CONCURRENCY = '3';

const sixOk = await runBatch(6, (n) => {
  const body = calls[n - 1].body;
  return jsonResponse(200, { status: 'completed', output_text: JSON.stringify(payloadFor(imageIndexOf(body))) });
});
check(sixOk.ok, 'a six-image batch completes', sixOk.error?.message);
if (sixOk.ok) {
  eq(sixOk.value.totalSamples, 6, 'every image produces a result');
  eq(
    sixOk.value.results.map((r) => r.diagnosis),
    ['Healthy', 'Blight 1', 'Healthy', 'Blight 3', 'Healthy', 'Blight 5'],
    'results stay in input order despite concurrent execution'
  );
  eq(sixOk.value.healthyCount, 3, 'healthy samples are counted');
  eq(sixOk.value.infectionPercentage, 50, 'infection percentage is computed from the results');
}

// One bad image must degrade to a placeholder, not sink the batch.
const oneBad = await runBatch(4, () => {
  const body = calls[calls.length - 1].body;
  return imageIndexOf(body) === 2
    ? jsonResponse(200, { status: 'completed', output_text: 'not json' })
    : jsonResponse(200, { status: 'completed', output_text: JSON.stringify(payloadFor(0)) });
});
check(oneBad.ok, 'one unparseable image does not fail the whole batch');
if (oneBad.ok) {
  eq(oneBad.value.totalSamples, 4, 'the failed image still occupies a result slot');
  eq(oneBad.value.results[2].diagnosis, 'Unable to assess image', 'the failed image degrades to a placeholder');
  eq(oneBad.value.results[0].diagnosis, 'Healthy', 'the surrounding images are unaffected');
}

// A fatal provider failure must abort rather than bill the user for placeholders.
const quotaBatch = await runBatch(8, () =>
  jsonResponse(429, { error: { message: 'quota', type: 'insufficient_quota', code: 'insufficient_quota' } }));
check(!quotaBatch.ok, 'exhausted quota aborts the batch instead of returning placeholders');
eq(quotaBatch.error?.code, 'quota_exhausted', 'the batch surfaces the fatal provider code to the route');
check(
  calls.length < 8,
  'the batch stops early rather than calling the provider for every remaining image',
  `${calls.length} of 8 images were still attempted`
);

const badKeyBatch = await runBatch(5, () => jsonResponse(401, { error: { message: 'Incorrect API key provided' } }));
check(!badKeyBatch.ok && badKeyBatch.error.status === 503, 'a misconfigured key aborts the batch with 503');

process.env.AI_BATCH_CONCURRENCY = '1';
const sequential = await runBatch(3, () => {
  const body = calls[calls.length - 1].body;
  return jsonResponse(200, { status: 'completed', output_text: JSON.stringify(payloadFor(imageIndexOf(body))) });
});
check(sequential.ok, 'AI_BATCH_CONCURRENCY=1 still works (restores the pre-migration sequential behaviour)');
eq(sequential.value?.totalSamples, 3, 'sequential mode analyzes every image');
delete process.env.AI_BATCH_CONCURRENCY;

// ── result ───────────────────────────────────────────────────────────────────
cleanup();
console.log('');
if (failures === 0) {
  console.log('\x1b[32mAll offline checks passed.\x1b[0m Run scripts/verify-openai.mjs with a valid key for the live leg.');
  process.exitCode = 0;
} else {
  console.log(`\x1b[31m${failures} offline check(s) failed.\x1b[0m`);
  process.exitCode = 1;
}
