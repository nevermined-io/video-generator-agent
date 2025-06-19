/**
 * @file tools.ts
 * @description Contains handlers for media generation tasks (text2image, image2image, and text2video)
 *              along with their dummy implementations.
 */
import { text2image, image2image } from "./imageGeneration";
import { text2video } from "./videoGeneration";
import { AgentExecutionStatus } from "@nevermined-io/payments";
import { IS_DUMMY } from "./config/env";
import { logger } from "./logger/logger";
import { text2imageDummy, image2imageDummy } from "./imageGeneration";
import { text2videoDummy } from "./videoGeneration";

/* Handlers for Production and Dummy Modes */

/**
 * Handles text-to-image generation.
 * If in dummy mode, calls text2imageDummy; otherwise, calls the real text2image function.
 * On error, updates the step status to failed.
 *
 * @param step - The current step object.
 * @param payments - The Payments instance for step updates.
 * @returns {Promise<string>} - The generated image URL.
 */
export async function handleText2image(
  _inputs: any,
  step: any,
  payments: any
): Promise<string> {
  try {
    let url: string;
    if (IS_DUMMY) {
      url = await text2imageDummy(step.input_query, step.input_artifacts[0].id);
    } else {
      url = await text2image(step.input_query);
    }
    logger.info(`Generated image URL: ${url}`);
    return url;
  } catch (error: any) {
    await payments.query.updateStep(step.did, {
      ...step,
      step_status: AgentExecutionStatus.Failed,
      output: `Image generation failed: ${error.message || error}`,
    });
    throw error;
  }
}

/**
 * Handles image-to-image generation.
 * If in dummy mode, calls image2imageDummy; otherwise, calls the real image2image function.
 * On error, updates the step status to failed.
 *
 * @param inputs - The input parameters (expects inputs.image_url).
 * @param step - The current step object.
 * @param payments - The Payments instance for step updates.
 * @returns {Promise<string>} - The transformed image URL.
 */
export async function handleImage2image(
  inputs: any,
  step: any,
  payments: any
): Promise<string> {
  try {
    let url: string;
    if (IS_DUMMY) {
      url = await image2imageDummy(inputs.image_url, step.input_query);
    } else {
      url = await image2image(inputs.image_url, step.input_query);
    }
    logger.info(`Generated image URL: ${url}`);
    return url;
  } catch (error: any) {
    await payments.query.updateStep(step.did, {
      ...step,
      step_status: AgentExecutionStatus.Failed,
      output: `Image2Image generation failed: ${error.message || error}`,
    });
    throw error;
  }
}

/**
 * Handles text-to-video generation.
 * If in dummy mode, calls text2videoDummy (using the first image from the array);
 * otherwise, calls the real text2video function.
 * On error, updates the step status to failed.
 *
 * @param inputs - The input parameters (expects inputs.images and step.input_query).
 * @param step - The current step object.
 * @param payments - The Payments instance for step updates.
 * @returns {Promise<string>} - The generated video URL.
 */
export async function handleText2video(
  inputs: any,
  step: any,
  payments: any
): Promise<string> {
  try {
    let url: string;
    if (IS_DUMMY) {
      url = await text2videoDummy(
        inputs.images,
        step.input_query,
        step.input_artifacts[0].id
      );
    } else {
      url = await text2video(inputs.images, step.input_query, inputs.duration);
      //url = await text2videoDummy(inputs.images, step.input_query);
    }
    logger.info(`Generated video URL: ${url}`);
    return url;
  } catch (error: any) {
    await payments.query.updateStep(step.did, {
      ...step,
      step_status: AgentExecutionStatus.Failed,
      output: `Video generation failed: ${error.message || error}`,
    });
    throw error;
  }
}
