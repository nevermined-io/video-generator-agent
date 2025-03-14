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

/* Dummy Functions */

/**
 * Dummy implementation for text-to-image generation.
 * @param prompt - The text prompt for image generation.
 * @returns {Promise<string>} - A dummy image URL.
 */
export async function text2imageDummy(_prompt: string): Promise<string> {
  const waitTime = Math.floor(Math.random() * 10) + 1;
  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

  // Introduce a 20% chance of throwing an error
  if (Math.random() < 0.1) {
    throw new Error("Dummy image generation failed due to random error.");
  }

  return "https://cdnc.ttapi.io/2025-02-02/50b8d4da-59d1-42ea-85eb-1c874ca96cc8.png";
}

/**
 * Dummy implementation for image-to-image generation.
 * @param imageUrl - The source image URL.
 * @param prompt - The text prompt for image transformation.
 * @returns {Promise<string>} - A dummy transformed image URL.
 */
export async function image2imageDummy(
  _imageUrl: string,
  _prompt: string
): Promise<string> {
  const waitTime = Math.floor(Math.random() * 10) + 1;
  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

  // Introduce a 20% chance of throwing an error
  if (Math.random() < 0.1) {
    throw new Error(
      "Dummy image 2 image generation failed due to random error."
    );
  }

  return "https://v3.fal.media/files/kangaroo/YyGP6e4eq7dayC6TzdWfA.png";
}

/**
 * Dummy implementation for text-to-video generation.
 * Uses the first image from the array.
 * @param imageUrl - The reference image URL.
 * @param videoPrompt - The text prompt for video generation.
 * @returns {Promise<string>} - A dummy video URL.
 */
export async function text2videoDummy(
  _imageUrl: string,
  _videoPrompt: string
): Promise<string> {
  const waitTime = Math.floor(Math.random() * 10) + 1;
  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

  // Introduce a 20% chance of throwing an error
  if (Math.random() < 0.1) {
    throw new Error("Dummy video generation failed due to random error.");
  }

  return "https://storage.theapi.app/videos/273847678503198.mp4";
}

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
      url = await text2imageDummy(step.input_query);
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
      url = await text2videoDummy(inputs.images[0], step.input_query);
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
