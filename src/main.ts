/**
 * @file main.ts
 * @description Main entry point for the agent. It subscribes to events and delegates media
 *              generation tasks to the appropriate handlers in tools.ts.
 */

import {
  AgentExecutionStatus,
  Payments,
  EnvironmentName,
} from "@nevermined-io/payments";
import { NVM_API_KEY, NVM_ENVIRONMENT, AGENT_DID } from "./config/env";
import pino from "pino";
import pretty from "pino-pretty";
import { handleText2image, handleImage2image, handleText2video } from "./tools";

const logger = pino(pretty({ sync: true }));
let payments: Payments;

/**
 * Processes incoming steps and delegates media generation based on the inference type.
 *
 * @param data - The data received from the subscription.
 */
async function run(data: any) {
  try {
    const eventData = JSON.parse(data);
    const step = await payments.query.getStep(eventData.step_id);

    if (step.step_status !== AgentExecutionStatus.Pending) {
      logger.warn(`Step ${step.step_id} is not pending. Skipping...`);
      return;
    }

    if (!step.input_artifacts.length) {
      step.input_artifacts = [{ inference_type: "text2video" }];
    }

    const [{ inference_type: inferenceType, ...inputs }] = step.input_artifacts;

    if (!inferenceType) {
      await payments.query.updateStep(step.did, {
        ...step,
        step_status: AgentExecutionStatus.Failed,
        output: `Missing inference type in input_artifacts: ${step.input_artifacts[0]}`,
      });
      return;
    }

    const handlers: { [key: string]: Function } = {
      text2image: handleText2image,
      image2image: handleImage2image,
      text2video: handleText2video,
    };

    const handler = handlers[inferenceType];
    if (!handler) {
      throw new Error(
        `Unknown inference type in input_artifacts: ${step.input_artifacts[0]}`
      );
    }

    const outputUrl = await handler(inputs, step, payments);

    let cost = 0;
    switch (inferenceType) {
      case "text2image":
      case "image2image":
        cost = 1;
        break;
      case "text2video":
        cost = 5;
        break;
    }

    await payments.query.updateStep(step.did, {
      ...step,
      step_status: AgentExecutionStatus.Completed,
      is_last: true,
      cost,
      output: "Generation completed successfully.",
      output_artifacts: [outputUrl],
    });
  } catch (error) {
    logger.error(`Error processing steps: ${error}`);
  }
}

/**
 * Initializes the Payments instance.
 *
 * @param nvmApiKey - Nevermined API Key.
 * @param environment - Nevermined environment (e.g., 'staging').
 * @returns {Payments} - A Payments instance.
 */
function initializePayments(nvmApiKey: string, environment: string): Payments {
  logger.info("Initializing Nevermined Payments Library...");
  const paymentsInstance = Payments.getInstance({
    nvmApiKey,
    environment: environment as EnvironmentName,
  });
  if (!paymentsInstance.isLoggedIn) {
    throw new Error("Failed to login to Nevermined Payments Library");
  }
  return paymentsInstance;
}

/**
 * The main function that initializes the agent and subscribes to events.
 */
async function main() {
  try {
    payments = initializePayments(NVM_API_KEY, NVM_ENVIRONMENT);
    logger.info(`Connected to Nevermined Network: ${NVM_ENVIRONMENT}`);

    const opts = {
      joinAccountRoom: false,
      joinAgentRooms: [AGENT_DID],
      subscribeEventTypes: ["step-updated"],
      getPendingEventsOnSubscribe: false,
    };

    await payments.query.subscribe(run, opts);
    logger.info("Waiting for events!");
  } catch (error) {
    logger.error(`Error in main function: ${error}`);
    payments.query.disconnect();
    process.exit(1);
  }
}

logger.info("Starting Agent...");
main();
