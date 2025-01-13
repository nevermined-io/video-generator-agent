import {
  AgentExecutionStatus,
  Payments,
  TaskLogMessage,
  EnvironmentName,
} from "@nevermined-io/payments";
import { NVM_API_KEY, NVM_ENVIRONMENT, AGENT_DID } from "./config/env";
import pino from "pino";
import { text2video } from "./videoGeneration";
// Initialize logger
const logger = pino({
  transport: { target: "pino-pretty" },
  level: "info",
});

// Initialize Payments instance
let payments: Payments;

/**
 * Processes incoming steps and generates a video using Eden's API.
 * @param data - The data received from the subscription.
 */
async function run(data: any) {
  try {
    // Parse the incoming data
    const eventData = JSON.parse(data);
    logger.info(`Received event: ${JSON.stringify(eventData)}`);

    // Retrieve the step information using the step_id from eventData
    const step = await payments.query.getStep(eventData.step_id);
    logger.info(
      `Processing Step ${step.task_id} - ${step.step_id} [${step.step_status}]`
    );

    // Check if the step status is pending; if not, skip processing
    if (step.step_status !== AgentExecutionStatus.Pending) {
      logger.warn(`Step ${step.step_id} is not pending. Skipping...`);
      return;
    }

    // Log the initiation of the video generation task
    await logMessage({
      task_id: step.task_id,
      level: "info",
      message: `Starting video generation...`,
    });

    try {
      // Generate the video using the text2video function
      //const videoUrl = await text2video(step.input_query);
      const videoUrl = await text2video(step.input_query);

      // Log the video URL
      logger.info(`Generated Video URL: ${videoUrl}`);

      // Update the step with the video URL and mark it as completed
      const updateResult = await payments.query.updateStep(step.did, {
        ...step,
        step_status: AgentExecutionStatus.Completed,
        is_last: true,
        output: "Video generation completed successfully.",
        output_artifacts: [videoUrl],
      });

      if (updateResult.status === 201) {
        await logMessage({
          task_id: step.task_id,
          level: "info",
          message: "Video generation completed successfully.",
          task_status: AgentExecutionStatus.Completed,
        });
      } else {
        await logMessage({
          task_id: step.task_id,
          level: "error",
          message: `Error updating step ${step.step_id} - ${JSON.stringify(
            updateResult.data
          )}`,
          task_status: AgentExecutionStatus.Failed,
        });
      }
    } catch (e) {
      logger.error(`Error during video generation: ${e}`);
      await logMessage({
        task_id: step.task_id,
        level: "error",
        message: `Error during video generation: ${e}`,
        task_status: AgentExecutionStatus.Failed,
      });
    }
  } catch (error) {
    logger.error(`Error processing steps: ${error}`);
  }
}

/**
 * Logs messages and sends them to the Nevermined Payments API.
 * @param logMessage - The log message to be sent.
 */
async function logMessage(logMessage: TaskLogMessage) {
  if (logMessage.level === "error") logger.error(logMessage.message);
  else if (logMessage.level === "warning") logger.warn(logMessage.message);
  else if (logMessage.level === "debug") logger.debug(logMessage.message);
  else logger.info(logMessage.message);

  await payments.query.logTask(logMessage);
}

/**
 * Initializes the Payments instance.
 * @param nvmApiKey - Nevermined API Key.
 * @param environment - Nevermined environment (e.g., 'staging').
 * @returns A Payments instance.
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
 * The main function that initializes the agent and subscribes to the AI protocol.
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

logger.info("Starting Video Generation Agent...");
main();
