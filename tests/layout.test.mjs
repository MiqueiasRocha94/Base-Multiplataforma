import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/system/resolve-system-config.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});
const { resolveSystemConfig } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const config = { headerVisible: true, footerVisible: true, leftSidebarVisible: true, rightSidebarVisible: true };

for (const view of ["mobile", "tablet", "desktop"]) {
  test(`minimal sem margens e chrome extra em ${view}`, () => {
    const result = resolveSystemConfig({ config, view, routeLayout: "minimal" });
    assert.equal(result.mainContentBare, true);
    assert.equal(result.layout.header, false);
    assert.equal(result.layout.footer, false);
    assert.equal(result.layout.leftSidebar, false);
    assert.equal(result.layout.rightSidebar, view !== "mobile");
    assert.equal(result.layout.main, true);
  });
  test(`layout normal preserva chrome em ${view}`, () => {
    const result = resolveSystemConfig({ config, view, routeLayout: "default" });
    assert.equal(result.mainContentBare, false);
    assert.equal(result.layout.header, true);
    assert.equal(result.layout.footer, true);
    assert.equal(result.layout.leftSidebar, view !== "mobile");
  });
}
