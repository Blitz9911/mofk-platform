import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, before } from "node:test";
import { createRequire } from "node:module";
import Module from "node:module";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outdir = path.join(tmpdir(), "mofk-ai-service-test");
let service;

const validResult = {
  answer: "قد تكون المشكلة من حساس الأكسجين أو تهريب هواء بسيط. افحص الكود والأعراض قبل القيادة لمسافة طويلة.",
  severity: "medium",
  canContinueDriving: true,
  possibleCauses: ["حساس أكسجين", "تهريب هواء", "بواجي مستهلكة"],
  recommendations: ["اقرأ كود DTC", "افحص لمبة المكينة", "راجع فني إذا تكرر العطل"],
  requiredData: ["كود العطل", "نوع السيارة", "هل لمبة المكينة تومض"],
  disclaimer: "هذه توصية أولية ولا تغني عن فحص فني مختص عند وجود أعراض خطرة.",
};

before(async () => {
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await writeFile(path.join(outdir, "package.json"), JSON.stringify({ type: "commonjs" }));

  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(path.join(root, "src/services/mofk-ai.ts"), "utf8"),
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: "mofk-ai.ts",
  }).outputText;
  await writeFile(path.join(outdir, "mofk-ai.js"), output);

  process.env.NODE_PATH = path.join(root, "node_modules");
  Module._initPaths();

  const require = createRequire(path.join(outdir, "test.cjs"));
  service = require(path.join(outdir, "mofk-ai.js"));
});

test("returns validated structured AI result from a mocked OpenAI response", async () => {
  const calls = [];
  const client = {
    responses: {
      async create(body) {
        calls.push(body);
        return { output_text: JSON.stringify(validResult) };
      },
    },
  };

  const result = await service.generateMofkAiAnswer("وش سبب لمبة المكينة؟", {
    client,
    model: "test-model",
    timeoutMs: 1000,
  });

  assert.deepEqual(result, validResult);
  assert.equal(calls[0].model, "test-model");
  assert.equal(calls[0].store, false);
  assert.equal(calls[0].text.format.strict, true);
  assert.equal(calls[0].text.format.type, "json_schema");
});

test("rejects invalid provider JSON with invalid_response", async () => {
  const client = {
    responses: {
      async create() {
        return { output_text: JSON.stringify({ ...validResult, severity: "danger" }) };
      },
    },
  };

  await assert.rejects(
    () => service.generateMofkAiAnswer("عندي حرارة", { client, timeoutMs: 1000 }),
    (error) => error?.code === "invalid_response",
  );
});

test("requires OPENAI_API_KEY when no client is injected", async () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  await assert.rejects(
    () => service.generateMofkAiAnswer("وش سبب المشكلة؟"),
    (error) => error?.code === "missing_config",
  );

  if (originalApiKey) {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
});
