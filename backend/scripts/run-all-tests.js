const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const BACKEND_DIR = path.join(__dirname, "..");

console.log("==========================================================================");
console.log("🌱 KhetAI — Complete Test Harness (Keyword + Data-Driven + AI Synthetic)");
console.log("==========================================================================");

try {
  console.log("\n[1/3] Generating AI Synthetic Test Data...");
  execSync("node scripts/generate-synthetic-data.js", { cwd: BACKEND_DIR, stdio: "inherit" });

  console.log("\n[2/3] Running Vitest Test Suites (Keyword + Data-Driven + Integrated)...");
  execSync("npx vitest run tests/keywordDriven.test.mjs tests/dataDriven.test.mjs tests/integratedWorkflow.test.mjs", {
    cwd: BACKEND_DIR,
    stdio: "inherit"
  });

  console.log("\n[3/3] Verifying Generated Reports...");
  const reportHtml = path.join(BACKEND_DIR, "reports", "test-execution-report.html");
  const reportMd = path.join(BACKEND_DIR, "reports", "TEST_EXECUTION_REPORT.md");

  if (fs.existsSync(reportHtml) && fs.existsSync(reportMd)) {
    console.log("✅ Reports generated successfully:");
    console.log(`   - HTML Report:     ${reportHtml}`);
    console.log(`   - Markdown Report: ${reportMd}`);
  }

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
} catch (error) {
  console.error("\n❌ Test execution encountered an error:", error.message);
  process.exit(1);
}
