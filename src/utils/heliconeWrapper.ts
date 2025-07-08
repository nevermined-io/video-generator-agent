/**
 * @file heliconeWrapper.ts
 * @description Provides reusable utilities for wrapping API calls with Helicone logging
 */

import { HeliconeManualLogger } from "@helicone/helpers";
import { HELICONE_API_KEY } from "../config/env";
import { generateDeterministicAgentId, generateSessionId, logSessionInfo } from "./utils";

/**
 * Configuration for creating a Helicone payload
 */
export interface HeliconePayloadConfig {
  model: string;
  inputData: Record<string, any>;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
  stream?: boolean;
}

/**
 * Configuration for creating a Helicone response
 */
export interface HeliconeResponseConfig {
  idPrefix: string;
  model: string;
  resultData: any;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
      cached_tokens: number;
      audio_tokens: number;
    };
    completion_tokens_details?: {
      reasoning_tokens: number;
      audio_tokens: number;
      accepted_prediction_tokens: number;
      rejected_prediction_tokens: number;
    };
  };
  systemFingerprint?: string;
}

/**
 * Creates a standardized Helicone payload for API logging
 */
export function createHeliconePayload(config: HeliconePayloadConfig) {
  return {
    model: config.model,
    temperature: config.temperature ?? 1,
    top_p: config.top_p ?? 1,
    frequency_penalty: config.frequency_penalty ?? 0,
    presence_penalty: config.presence_penalty ?? 0,
    n: config.n ?? 1,
    stream: config.stream ?? false,
    messages: [
      {
        role: "user",
        content: JSON.stringify(config.inputData)
      }
    ]
  };
}

/**
 * Creates a standardized Helicone response for API logging
 */
export function createHeliconeResponse(config: HeliconeResponseConfig) {
  const timestamp = Date.now();
  
  return {
    id: `${config.idPrefix}-${timestamp}`,
    object: "chat.completion",
    created: Math.floor(timestamp / 1000),
    model: config.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify(config.resultData),
          refusal: null,
          annotations: []
        },
        logprobs: null,
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: config.usage.prompt_tokens,
      completion_tokens: config.usage.completion_tokens,
      total_tokens: config.usage.total_tokens,
      prompt_tokens_details: config.usage.prompt_tokens_details ?? {
        cached_tokens: 0,
        audio_tokens: 0
      },
      completion_tokens_details: config.usage.completion_tokens_details ?? {
        reasoning_tokens: 0,
        audio_tokens: 0,
        accepted_prediction_tokens: 0,
        rejected_prediction_tokens: 0
      }
    },
    service_tier: "default",
    system_fingerprint: config.systemFingerprint ?? `fp_${timestamp}`
  };
}

/**
 * Wraps an async operation with Helicone logging
 * 
 * @param agentName - Name of the agent for logging purposes
 * @param payloadConfig - Configuration for the Helicone payload
 * @param operation - The async operation to execute (returns internal result with extra data)
 * @param resultExtractor - Function to extract the user-facing result from internal result
 * @param usageCalculator - Function to calculate usage metrics from the internal result
 * @param responseIdPrefix - Prefix for the response ID
 * @param customAgentId - Optional custom agent ID
 * @param customSessionId - Optional custom session ID
 * @returns Promise that resolves to the extracted user result
 */
export async function withHeliconeLogging<TInternal = any, TExtracted = any>(
  agentName: string,
  payloadConfig: HeliconePayloadConfig,
  operation: () => Promise<TInternal>,
  resultExtractor: (internalResult: TInternal) => TExtracted,
  usageCalculator: (internalResult: TInternal) => HeliconeResponseConfig['usage'],
  responseIdPrefix: string,
  customAgentId?: string,
  customSessionId?: string
): Promise<TExtracted> {
  const agentId = customAgentId ?? generateDeterministicAgentId();
  const sessionId = customSessionId ?? generateSessionId();
  
  if (!customAgentId || !customSessionId) {
    logSessionInfo(agentId, sessionId, agentName);
  }
  
  const heliconeLogger = new HeliconeManualLogger({
    apiKey: HELICONE_API_KEY,
    headers: {
      "Helicone-Property-AgentId": agentId,
      "Helicone-Property-SessionId": sessionId,
    },
  });

  const heliconePayload = createHeliconePayload(payloadConfig);

  return await heliconeLogger.logRequest(
    heliconePayload,
    async (resultRecorder) => {
      try {
        const internalResult = await operation();
        
        const usage = usageCalculator(internalResult);
        
        const extractedResult = resultExtractor(internalResult);
        
        const heliconeResponse = createHeliconeResponse({
          idPrefix: responseIdPrefix,
          model: payloadConfig.model,
          resultData: extractedResult,
          usage,
          systemFingerprint: (extractedResult as any)?.jobId ? `fp_${(extractedResult as any).jobId}` : undefined
        });

        resultRecorder.appendResults(heliconeResponse);
        
        return extractedResult;
      } catch (error) {
        throw error;
      }
    }
  );
}

/**
 * Helper function to calculate usage for image operations based on pixels
 */
export function calculateImageUsage(pixels: number): HeliconeResponseConfig['usage'] {
  return {
    prompt_tokens: 0,
    completion_tokens: pixels,
    total_tokens: pixels,
    prompt_tokens_details: {
      cached_tokens: 0,
      audio_tokens: 0
    },
    completion_tokens_details: {
      reasoning_tokens: 0,
      audio_tokens: 0,
      accepted_prediction_tokens: 0,
      rejected_prediction_tokens: 0
    }
  };
}

/**
 * Helper function to calculate usage for video operations (typically 1 token)
 */
export function calculateVideoUsage(): HeliconeResponseConfig['usage'] {
  return {
    prompt_tokens: 0,
    completion_tokens: 1,
    total_tokens: 1,
    prompt_tokens_details: {
      cached_tokens: 0,
      audio_tokens: 0
    },
    completion_tokens_details: {
      reasoning_tokens: 0,
      audio_tokens: 0,
      accepted_prediction_tokens: 0,
      rejected_prediction_tokens: 0
    }
  };
}

/**
 * Helper function to calculate usage for song operations based on tokens/quota
 */
export function calculateSongUsage(tokens: number): HeliconeResponseConfig['usage'] {
  return {
    prompt_tokens: 0,
    completion_tokens: tokens,
    total_tokens: tokens,
    prompt_tokens_details: {
      cached_tokens: 0,
      audio_tokens: 0,
    },
    completion_tokens_details: {
      reasoning_tokens: 0,
      audio_tokens: 0,
      accepted_prediction_tokens: 0,
      rejected_prediction_tokens: 0
    }
  };
}

/**
 * Helper function to calculate usage for dummy song operations
 */
export function calculateDummySongUsage(): HeliconeResponseConfig['usage'] {
  return calculateSongUsage(6); // Default dummy token count
}

/**
 * Creates a ChatOpenAI configuration with Helicone logging enabled
 * 
 * Usage: const llm = new ChatOpenAI(withHeliconeLangchain("gpt-4o-mini", apiKey));
 * 
 * @param model - The OpenAI model to use (e.g., "gpt-4o-mini", "gpt-4")
 * @param apiKey - The OpenAI API key
 * @param customAgentId - Optional custom agent ID
 * @param customSessionId - Optional custom session ID
 * @returns Configuration object for ChatOpenAI constructor with Helicone enabled
 */
export function withHeliconeLangchain(
  model: string,
  apiKey: string,
  customAgentId?: string,
  customSessionId?: string
) {
  const agentId = customAgentId ?? generateDeterministicAgentId();
  const sessionId = customSessionId ?? generateSessionId();
  
  if (!customAgentId || !customSessionId) {
    logSessionInfo(agentId, sessionId, 'LangChainChatOpenAI');
  }

  return {
    model,
    apiKey,
    configuration: {
      baseURL: "https://oai.helicone.ai/v1",
      defaultHeaders: {
        "Helicone-Auth": `Bearer ${HELICONE_API_KEY}`,
        "Helicone-Property-AgentId": agentId,
        "Helicone-Property-SessionId": sessionId,
      }
    }
  };
}

/**
 * Creates an OpenAI client configuration with Helicone logging enabled
 * 
 * Usage: const openai = new OpenAI(withHeliconeOpenAI(apiKey));
 * 
 * @param apiKey - The OpenAI API key
 * @param customAgentId - Optional custom agent ID
 * @param customSessionId - Optional custom session ID
 * @returns Configuration object for OpenAI constructor with Helicone enabled
 */
export function withHeliconeOpenAI(
  apiKey: string,
  customAgentId?: string,
  customSessionId?: string
) {
  const agentId = customAgentId ?? generateDeterministicAgentId();
  const sessionId = customSessionId ?? generateSessionId();
  
  if (!customAgentId || !customSessionId) {
    logSessionInfo(agentId, sessionId, 'OpenAI');
  }

  return {
    apiKey,
    baseURL: "https://oai.helicone.ai/v1",
    defaultHeaders: {
      "Helicone-Auth": `Bearer ${HELICONE_API_KEY}`,
      "Helicone-Property-AgentId": agentId,
      "Helicone-Property-SessionId": sessionId,
    }
  };
}