import { describe, expect, it } from "vitest";
import { appPath, withBase } from "./path";

describe("withBase", () => {
  it("leaves paths alone when the app is served at the origin", () => {
    expect(withBase("/", "/")).toBe("/");
    expect(withBase("/glossary", "/")).toBe("/glossary");
  });

  it("prefixes the GitHub Pages project path", () => {
    expect(withBase("/", "/learn-go/")).toBe("/learn-go/");
    expect(withBase("/lessons", "/learn-go/")).toBe("/learn-go/lessons");
  });
});

describe("appPath", () => {
  it("reads the route after the Pages prefix", () => {
    expect(appPath("/learn-go/", "/learn-go/")).toBe("/");
    expect(appPath("/learn-go", "/learn-go/")).toBe("/");
    expect(appPath("/learn-go/lessons", "/learn-go/")).toBe("/lessons");
    expect(appPath("/learn-go/glossary/", "/learn-go/")).toBe("/glossary");
    expect(appPath("/learn-go/index.html", "/learn-go/")).toBe("/index.html");
  });

  it("keeps local paths when there is no prefix", () => {
    expect(appPath("/", "/")).toBe("/");
    expect(appPath("/lessons", "/")).toBe("/lessons");
  });
});
