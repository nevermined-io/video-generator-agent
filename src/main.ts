import {
  AgentExecutionStatus,
  Payments,
  TaskLogMessage,
  EnvironmentName,
} from "@nevermined-io/payments";
import {
  NVM_API_KEY,
  NVM_ENVIRONMENT,
  AGENT_DID,
  IS_DUMMY,
} from "./config/env";
import pino from "pino";
import { text2image, image2image } from "./imageGeneration";
import { text2video } from "./videoGeneration";

// Dummy functions that return a predefined URL.
//@ts-ignore
async function text2imageDummy(prompt: string): Promise<string> {
  return "https://cdnc.ttapi.io/2025-02-02/50b8d4da-59d1-42ea-85eb-1c874ca96cc8.png";
}

async function image2imageDummy(
  //@ts-ignore
  imageUrl: string,
  //@ts-ignore
  prompt: string
): Promise<string> {
  return "https://v3.fal.media/files/kangaroo/YyGP6e4eq7dayC6TzdWfA.png";
}

async function text2videoDummy(
  //@ts-ignore
  imageUrl: string,
  //@ts-ignore
  videoPrompt: string
): Promise<string> {
  // Wait for a random amount of seconds between 1 and 10
  const waitTime = Math.floor(Math.random() * 10) + 1;
  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

  return "https://dnznrvs05pmza.cloudfront.net/cb6e9071-a958-4cfe-8583-fe6723b21844.mp4?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiYjRmYmMwNWJjMGEzYzBjYyIsImJ1Y2tldCI6InJ1bndheS10YXNrLWFydGlmYWN0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTczODYyNzIwMH0.aFOCMtXoajwW_5UMzUYEKk20OkGsK0H5OYugph1mxC0";
}

// Initialize logger
const logger = pino({
  transport: { target: "pino-pretty" },
  level: "info",
});

// Initialize Payments instance
let payments: Payments;

/**
 * Processes incoming steps and generates media using the appropriate generation function
 * based on step.input_params[0].
 *
 * Depending on step.input_params[0] (which includes an "inference_type" field),
 * one of the following functions is called:
 * - "text2image": Calls text2image (or text2imageDummy in dummy mode) using step.input_query.
 * - "image2image": Calls image2image (or image2imageDummy in dummy mode) using inputs.image_url and step.input_query.
 * - "text2video": For video generation, in non-dummy mode an intermediate image is generated via image2image,
 *   then text2video is called with that image and inputs.video_prompt.
 *   In dummy mode, text2videoDummy is called directly.
 *
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

    // Parse input_params to extract inference_type and additional inputs
    const [{ inference_type: inferenceType, ...inputs }] = JSON.parse(
      step.input_params
    );

    if (!inferenceType) {
      await logMessage({
        task_id: step.task_id,
        level: "error",
        message: `Missing input_params: ${step.input_params[0]}`,
        task_status: AgentExecutionStatus.Failed,
      });
      return;
    }

    // Check for required additional parameters for text2video
    if (inferenceType === "text2video" && !inputs.image_url) {
      await logMessage({
        task_id: step.task_id,
        level: "error",
        message: `Missing additional params for text2video: imageUrl`,
        task_status: AgentExecutionStatus.Failed,
      });
      return;
    }

    try {
      let outputUrl: string;

      if (inferenceType === "text2image") {
        // Generate an image from text
        if (IS_DUMMY) {
          outputUrl = await text2imageDummy(step.input_query);
          logger.info(`(DUMMY) Generated Image URL: ${outputUrl}`);
        } else {
          outputUrl = await text2image(step.input_query);
          logger.info(`Generated Image URL: ${outputUrl}`);
        }
      } else if (inferenceType === "image2image") {
        // Transform an input image based on the prompt
        if (IS_DUMMY) {
          outputUrl = await image2imageDummy(
            inputs.image_url,
            step.input_query
          );
          logger.info(`(DUMMY) Generated Image2Image URL: ${outputUrl}`);
        } else {
          outputUrl = await image2image(inputs.image_url, step.input_query);
          logger.info(`Generated Image2Image URL: ${outputUrl}`);
        }
      } else if (inferenceType === "text2video") {
        if (IS_DUMMY) {
          // In dummy mode, call the dummy text2video function directly
          outputUrl = await text2videoDummy(
            inputs.image_url,
            inputs.video_prompt
          );
          logger.info(`(DUMMY) Generated Video URL: ${outputUrl}`);
        } else {
          // For video generation: generate an intermediate image then create the video
          const imageUrl = await image2image(
            inputs.image_url,
            step.input_query
          );
          logger.info(`Generated intermediate Image URL: ${imageUrl}`);
          outputUrl = await text2video(imageUrl, inputs.video_prompt);
          logger.info(`Generated Video URL: ${outputUrl}`);
        }
      } else {
        throw new Error(`Unknown input_params: ${step.input_params[0]}`);
      }

      // Update the step with the generated output and mark it as completed
      const updateResult = await payments.query.updateStep(step.did, {
        ...step,
        step_status: AgentExecutionStatus.Completed,
        is_last: true,
        output: "Generation completed successfully.",
        output_artifacts: [outputUrl],
      });

      if (updateResult.status === 201) {
        await logMessage({
          task_id: step.task_id,
          level: "info",
          message: "Generation completed successfully.",
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
      logger.error(`Error during generation: ${e}`);
      await logMessage({
        task_id: step.task_id,
        level: "error",
        message: `Error during generation: ${e}`,
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
