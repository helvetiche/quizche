/**
 * Implementation Verification Test
 * 
 * This script verifies that all security enhancements have been properly implemented:
 * 1. Environment variable validation
 * 2. DOMPurify integration
 * 3. Centralized error handling
 * 4. Security headers middleware
 */

import * as fs from "fs";
import * as path from "path";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
}

const results: TestResult[] = [];

// Helper function to find all route files
function findRouteFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

// Test 1: Check if lib/env.ts exists and has proper structure
function testEnvironmentValidation(): TestResult {
  const envPath = path.join(process.cwd(), "lib", "env.ts");
  const exists = fs.existsSync(envPath);

  if (!exists) {
    return {
      name: "Environment Validation File",
      passed: false,
      message: "lib/env.ts does not exist",
    };
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const hasEnvalid = content.includes("envalid");
  const hasCleanEnv = content.includes("cleanEnv");
  const hasExports = content.includes("export const env");

  return {
    name: "Environment Validation File",
    passed: hasEnvalid && hasCleanEnv && hasExports,
    message: hasEnvalid && hasCleanEnv && hasExports
      ? "Environment validation properly configured"
      : "Missing required envalid setup",
    details: [
      `Has envalid import: ${hasEnvalid}`,
      `Has cleanEnv: ${hasCleanEnv}`,
      `Has env export: ${hasExports}`,
    ],
  };
}

// Test 2: Check if DOMPurify is integrated
function testDOMPurifyIntegration(): TestResult {
  const validationPath = path.join(process.cwd(), "lib", "validation.ts");
  const exists = fs.existsSync(validationPath);

  if (!exists) {
    return {
      name: "DOMPurify Integration",
      passed: false,
      message: "lib/validation.ts does not exist",
    };
  }

  const content = fs.readFileSync(validationPath, "utf-8");
  const hasDOMPurifyImport = content.includes("isomorphic-dompurify") || content.includes("DOMPurify");
  const hasSanitizeHTML = content.includes("sanitizeHTML");

  return {
    name: "DOMPurify Integration",
    passed: hasDOMPurifyImport && hasSanitizeHTML,
    message: hasDOMPurifyImport && hasSanitizeHTML
      ? "DOMPurify properly integrated"
      : "DOMPurify integration incomplete",
    details: [
      `Has DOMPurify import: ${hasDOMPurifyImport}`,
      `Has sanitizeHTML function: ${hasSanitizeHTML}`,
    ],
  };
}

// Test 3: Check if error handler exists
function testErrorHandler(): TestResult {
  const errorHandlerPath = path.join(process.cwd(), "lib", "error-handler.ts");
  const exists = fs.existsSync(errorHandlerPath);

  if (!exists) {
    return {
      name: "Error Handler File",
      passed: false,
      message: "lib/error-handler.ts does not exist",
    };
  }

  const content = fs.readFileSync(errorHandlerPath, "utf-8");
  const hasHandleApiError = content.includes("handleApiError");
  const hasErrorCategories = content.includes("ErrorCategory");
  const hasApiError = content.includes("ApiError");

  return {
    name: "Error Handler File",
    passed: hasHandleApiError && hasErrorCategories,
    message: hasHandleApiError && hasErrorCategories
      ? "Error handler properly configured"
      : "Error handler incomplete",
    details: [
      `Has handleApiError function: ${hasHandleApiError}`,
      `Has ErrorCategory enum: ${hasErrorCategories}`,
      `Has ApiError class: ${hasApiError}`,
    ],
  };
}

// Test 4: Check if proxy exists (migrated from middleware)
function testMiddleware(): TestResult {
  const proxyPath = path.join(process.cwd(), "proxy.ts");
  const middlewarePath = path.join(process.cwd(), "middleware.ts");
  const proxyExists = fs.existsSync(proxyPath);
  const middlewareExists = fs.existsSync(middlewarePath);

  if (middlewareExists && !proxyExists) {
    return {
      name: "Security Headers Proxy",
      passed: false,
      message: "middleware.ts exists but proxy.ts does not - migration incomplete",
    };
  }

  if (!proxyExists) {
    return {
      name: "Security Headers Proxy",
      passed: false,
      message: "proxy.ts does not exist",
    };
  }

  const content = fs.readFileSync(proxyPath, "utf-8");
  const hasProxyFunction = content.includes("export function proxy");
  const hasSecurityHeaders = content.includes("getSecurityHeaders");
  const hasConfig = content.includes("export const config");
  const excludesContentType = content.includes("delete headers[\"Content-Type\"]") || 
                              !content.includes("Content-Type") || 
                              content.includes("getPublicSecurityHeaders");

  return {
    name: "Security Headers Proxy",
    passed: hasProxyFunction && hasSecurityHeaders && hasConfig,
    message: hasProxyFunction && hasSecurityHeaders && hasConfig
      ? "Proxy properly configured (migrated from middleware)"
      : "Proxy incomplete",
    details: [
      `Has proxy function: ${hasProxyFunction}`,
      `Uses security headers: ${hasSecurityHeaders}`,
      `Has config export: ${hasConfig}`,
      `Properly excludes Content-Type for HTML: ${excludesContentType}`,
    ],
  };
}

// Test 5: Check if all API routes import handleApiError
function testErrorHandlerImports(): TestResult {
  const apiDir = path.join(process.cwd(), "app", "api");
  const routeFiles = findRouteFiles(apiDir);
  const issues: string[] = [];
  let routesWithHandler = 0;
  let routesWithoutHandler = 0;
  let routesUsingHandler = 0;

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const hasImport = content.includes('from "@/lib/error-handler"') || content.includes('from "../lib/error-handler"');
    const usesHandler = content.includes("handleApiError(");

    if (usesHandler && !hasImport) {
      issues.push(`Missing import: ${path.relative(process.cwd(), file)}`);
      routesWithoutHandler++;
    } else if (hasImport) {
      routesWithHandler++;
    }

    if (usesHandler) {
      routesUsingHandler++;
    }
  }

  return {
    name: "Error Handler Imports in API Routes",
    passed: issues.length === 0,
    message: issues.length === 0
      ? `All ${routesUsingHandler} routes using handleApiError have proper imports`
      : `${issues.length} route(s) missing handleApiError import`,
    details: [
      `Routes with handler import: ${routesWithHandler}`,
      `Routes using handler: ${routesUsingHandler}`,
      `Routes missing import: ${routesWithoutHandler}`,
      ...(issues.length > 0 ? issues.slice(0, 10) : []),
    ],
  };
}

// Test 6: Check if catch blocks use handleApiError instead of manual error handling
function testCatchBlockUsage(): TestResult {
  const apiDir = path.join(process.cwd(), "app", "api");
  const routeFiles = findRouteFiles(apiDir);
  const issues: string[] = [];
  let catchBlocksWithHandler = 0;
  let catchBlocksWithoutHandler = 0;

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    
    // Find catch blocks more accurately
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("} catch")) {
        // Found a catch block, check the next few lines
        const catchBlockLines = lines.slice(i, Math.min(i + 15, lines.length)).join("\n");
        
        if (catchBlockLines.includes("handleApiError")) {
          catchBlocksWithHandler++;
        } else if (
          catchBlockLines.includes("NextResponse.json") &&
          catchBlockLines.includes("error") &&
          !catchBlockLines.includes("handleApiError") &&
          !catchBlockLines.includes("// Don't fail") &&
          !catchBlockLines.includes("// Ignore")
        ) {
          // Manual error handling without handleApiError (excluding cleanup blocks)
          catchBlocksWithoutHandler++;
          issues.push(`${path.relative(process.cwd(), file)}:${i + 1} - Manual error handling`);
        }
      }
    }
  }

  return {
    name: "Catch Block Error Handling",
    passed: catchBlocksWithoutHandler === 0,
    message: catchBlocksWithoutHandler === 0
      ? `All ${catchBlocksWithHandler} catch blocks use handleApiError`
      : `${catchBlocksWithoutHandler} catch block(s) still use manual error handling`,
    details: [
      `Catch blocks with handleApiError: ${catchBlocksWithHandler}`,
      `Catch blocks without handler: ${catchBlocksWithoutHandler}`,
      ...(issues.length > 0 ? issues.slice(0, 10) : []),
    ],
  };
}

// Test 7: Check for user scope issues in catch blocks
function testUserScopeIssues(): TestResult {
  const apiDir = path.join(process.cwd(), "app", "api");
  const routeFiles = findRouteFiles(apiDir);
  const issues: string[] = [];

  for (const file of routeFiles) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");

    // Look for catch blocks that reference user?.uid but user might not be in scope
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("} catch")) {
        // Found a catch block, check the next 20 lines
        const catchBlockLines = lines.slice(i, Math.min(i + 20, lines.length)).join("\n");
        
        if (
          catchBlockLines.includes("user?.uid") &&
          !catchBlockLines.includes("const user = await verifyAuth") &&
          !catchBlockLines.includes("let user") &&
          !catchBlockLines.includes("let userId") &&
          !catchBlockLines.includes("userId: user?.uid") // This is OK if user is in outer scope
        ) {
          // Check if user is declared in outer scope (before try block)
          const beforeCatch = lines.slice(0, i).join("\n");
          const tryBlockStart = beforeCatch.lastIndexOf("try {");
          const beforeTry = beforeCatch.substring(Math.max(0, tryBlockStart - 50), tryBlockStart);
          
          if (!beforeTry.includes("const user") && !beforeTry.includes("let user")) {
            // Potential scope issue - user not declared before try or in catch
            issues.push(`${path.relative(process.cwd(), file)}:${i + 1} - Potential user scope issue`);
          }
        }
      }
    }
  }

  return {
    name: "User Variable Scope in Catch Blocks",
    passed: issues.length === 0,
    message: issues.length === 0
      ? "No user scope issues detected"
      : `${issues.length} potential user scope issue(s) found`,
    details: issues.length > 0 ? issues.slice(0, 10) : [],
  };
}

// Test 8: Check if environment variables are used from lib/env.ts
function testEnvironmentVariableUsage(): TestResult {
  const libFiles = [
    "lib/firebase-admin.ts",
    "lib/gemini.ts",
    "lib/redis.ts",
    "lib/security-headers.ts",
  ];
  const issues: string[] = [];
  let filesUsingEnv = 0;

  for (const filePath of libFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, "utf-8");
    const usesProcessEnv = content.includes("process.env.") && !content.includes("// Legacy") && !content.includes("// Build-time");
    const usesEnvImport = content.includes('from "./env"') || content.includes('from "@/lib/env"');

    if (usesProcessEnv && !usesEnvImport) {
      issues.push(`${filePath} - Still uses process.env directly`);
    } else if (usesEnvImport) {
      filesUsingEnv++;
    }
  }

  return {
    name: "Environment Variable Usage",
    passed: issues.length === 0,
    message: issues.length === 0
      ? `All ${filesUsingEnv} files use validated environment variables`
      : `${issues.length} file(s) still use process.env directly`,
    details: issues.length > 0 ? issues : [],
  };
}

// Test 9: Check package.json for required dependencies
function testDependencies(): TestResult {
  const packageJsonPath = path.join(process.cwd(), "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return {
      name: "Required Dependencies",
      passed: false,
      message: "package.json not found",
    };
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const required = ["envalid", "isomorphic-dompurify"];
  const missing: string[] = [];

  for (const dep of required) {
    if (!dependencies[dep]) {
      missing.push(dep);
    }
  }

  return {
    name: "Required Dependencies",
    passed: missing.length === 0,
    message: missing.length === 0
      ? "All required dependencies are installed"
      : `Missing dependencies: ${missing.join(", ")}`,
    details: [
      `envalid: ${dependencies["envalid"] ? "✓" : "✗"}`,
      `isomorphic-dompurify: ${dependencies["isomorphic-dompurify"] ? "✓" : "✗"}`,
    ],
  };
}

// Run all tests
function runTests(): void {
  console.log("🔍 Running Implementation Verification Tests...\n");

  results.push(testEnvironmentValidation());
  results.push(testDOMPurifyIntegration());
  results.push(testErrorHandler());
  results.push(testMiddleware());
  results.push(testErrorHandlerImports());
  results.push(testCatchBlockUsage());
  results.push(testUserScopeIssues());
  results.push(testEnvironmentVariableUsage());
  results.push(testDependencies());

  // Print results
  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}`);

    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        console.log(`   - ${detail}`);
      }
    }

    console.log();

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log("=".repeat(60));
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Implementation looks good.");
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Please review the issues above.`);
    process.exit(1);
  }
}

// Run tests
runTests();
