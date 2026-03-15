import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildLearningMachineGuidance } from "./prompt.js";

describe("buildLearningMachineGuidance", () => {
  it("includes the API URL in curl commands", () => {
    const guidance = buildLearningMachineGuidance({
      apiUrl: "http://agno-api:8000",
      defaultChannel: "discord",
    });

    expect(guidance).toContain("http://agno-api:8000/recall");
    expect(guidance).toContain("http://agno-api:8000/process");
  });

  it("includes the channel in curl commands", () => {
    const guidance = buildLearningMachineGuidance({
      apiUrl: "http://localhost:8000",
      defaultChannel: "telegram",
    });

    expect(guidance).toContain('"channel": "telegram"');
  });

  it("contains mandatory instruction language", () => {
    const guidance = buildLearningMachineGuidance({
      apiUrl: "http://localhost:8000",
      defaultChannel: "discord",
    });

    expect(guidance).toContain("MANDATORY");
    expect(guidance).toContain("Always call both endpoints");
    expect(guidance).toContain("BEFORE you respond");
    expect(guidance).toContain("AFTER you respond");
  });
});

describe("learning-machine plugin registration", () => {
  it("registers before_prompt_build hook when API URL is configured", async () => {
    const on = vi.fn();
    const api = {
      pluginConfig: { apiUrl: "http://agno-api:8000" },
      logger: { warn: vi.fn() },
      on,
    };

    const mod = await import("./index.js");
    mod.default.register(api as never);

    expect(on).toHaveBeenCalledTimes(1);
    expect(on.mock.calls[0]?.[0]).toBe("before_prompt_build");
    expect(on.mock.calls[0]?.[2]).toEqual({ priority: 100 });
  });

  it("does not register hook when no API URL is available", async () => {
    const origEnv = process.env.LEARNING_MACHINE_API_URL;
    delete process.env.LEARNING_MACHINE_API_URL;

    const on = vi.fn();
    const warn = vi.fn();
    const api = {
      pluginConfig: {},
      logger: { warn },
      on,
    };

    const mod = await import("./index.js");
    mod.default.register(api as never);

    expect(on).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no API URL configured"),
    );

    if (origEnv !== undefined) {
      process.env.LEARNING_MACHINE_API_URL = origEnv;
    }
  });

  it("falls back to LEARNING_MACHINE_API_URL env var", async () => {
    const origEnv = process.env.LEARNING_MACHINE_API_URL;
    process.env.LEARNING_MACHINE_API_URL = "http://env-api:9000";

    const on = vi.fn();
    const api = {
      pluginConfig: {},
      logger: { warn: vi.fn() },
      on,
    };

    const mod = await import("./index.js");
    mod.default.register(api as never);

    expect(on).toHaveBeenCalledTimes(1);

    // Call the hook handler and verify it uses the env URL
    const handler = on.mock.calls[0]?.[1];
    const result = handler({}, { channelId: "slack" });
    expect(result.prependSystemContext).toContain("http://env-api:9000/recall");

    if (origEnv !== undefined) {
      process.env.LEARNING_MACHINE_API_URL = origEnv;
    } else {
      delete process.env.LEARNING_MACHINE_API_URL;
    }
  });

  it("uses runtime channelId when it is a valid channel", async () => {
    const on = vi.fn();
    const api = {
      pluginConfig: { apiUrl: "http://api:8000" },
      logger: { warn: vi.fn() },
      on,
    };

    const mod = await import("./index.js");
    mod.default.register(api as never);

    const handler = on.mock.calls[0]?.[1];
    const result = handler({}, { channelId: "telegram" });
    expect(result.prependSystemContext).toContain('"channel": "telegram"');
  });

  it("falls back to defaultChannel config when runtime channel is invalid", async () => {
    const on = vi.fn();
    const api = {
      pluginConfig: { apiUrl: "http://api:8000", defaultChannel: "whatsapp" },
      logger: { warn: vi.fn() },
      on,
    };

    const mod = await import("./index.js");
    mod.default.register(api as never);

    const handler = on.mock.calls[0]?.[1];
    const result = handler({}, { channelId: "web" }); // "web" is not a valid channel
    expect(result.prependSystemContext).toContain('"channel": "whatsapp"');
  });

  it("defaults to discord when no valid channel is available", async () => {
    const on = vi.fn();
    const api = {
      pluginConfig: { apiUrl: "http://api:8000" },
      logger: { warn: vi.fn() },
      on,
    };

    const mod = await import("./index.js");
    mod.default.register(api as never);

    const handler = on.mock.calls[0]?.[1];
    const result = handler({}, {});
    expect(result.prependSystemContext).toContain('"channel": "discord"');
  });
});
