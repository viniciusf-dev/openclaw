import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { buildLearningMachineGuidance } from "./prompt.js";

type LearningMachineConfig = {
  apiUrl?: string;
  defaultChannel?: string;
};

const VALID_CHANNELS = new Set(["discord", "slack", "telegram", "whatsapp", "teams"]);
const DEFAULT_CHANNEL = "discord";

function resolveApiUrl(pluginCfg: LearningMachineConfig): string | undefined {
  
  return (
    pluginCfg.apiUrl?.trim() ||
    process.env.LEARNING_MACHINE_API_URL?.trim() ||
    undefined
  );
}

function resolveChannel(
  pluginCfg: LearningMachineConfig,
  runtimeChannel?: string,
): string {
  
  if (runtimeChannel && VALID_CHANNELS.has(runtimeChannel)) {
    return runtimeChannel;
  }
  const cfgChannel = pluginCfg.defaultChannel?.trim().toLowerCase();
  if (cfgChannel && VALID_CHANNELS.has(cfgChannel)) {
    return cfgChannel;
  }
  return DEFAULT_CHANNEL;
}

const plugin = {
  id: "learning-machine",
  name: "Learning Machine",
  description:
    "Cross-channel memory bridge — persists user knowledge across WhatsApp, Slack, Telegram, Discord, and Teams.",
  register(api: OpenClawPluginApi) {
    const pluginCfg = (api.pluginConfig ?? {}) as LearningMachineConfig;
    const apiUrl = resolveApiUrl(pluginCfg);

    if (!apiUrl) {
      api.logger?.warn?.(
        "learning-machine: no API URL configured (set plugins.entries.learning-machine.apiUrl or LEARNING_MACHINE_API_URL env). Plugin inactive.",
      );
      return;
    }

    api.on(
      "before_prompt_build",
      (_event, ctx) => {
        const channel = resolveChannel(pluginCfg, ctx.channelId);
        return {
          prependSystemContext: buildLearningMachineGuidance({
            apiUrl,
            defaultChannel: channel,
          }),
        };
      },
      { priority: 100 }, 
    );
  },
};

export default plugin;
