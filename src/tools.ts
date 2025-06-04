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

const DUMMY_IMAGE_URLS = {
  "character-0":
    "https://v3.fal.media/files/kangaroo/OyJfXujVSXxPby1bjYe--.png",
  "character-1": "https://v3.fal.media/files/rabbit/iGjlnk6hZqq5LPtOOSdiu.png",
  "character-2": "https://v3.fal.media/files/lion/sGrK0XLGX-V2-LOCMN6aW.png",
  "character-3": "https://v3.fal.media/files/panda/VytitIH7qWYfrXzLvITxi.png",
  "character-4": "https://v3.fal.media/files/panda/XJb6IFiXFUxxWvn6tyDBl.png",
  "setting-0": "https://v3.fal.media/files/zebra/7sNOX9UH0mLjndayQsIYw.png",
  "setting-1": "https://v3.fal.media/files/lion/Y5MynHlT3LFGUf-BrD6Dd.png",
  "setting-2": "https://v3.fal.media/files/rabbit/EmyU04RwnZGlODQt9z9WZ.png",
  "setting-3": "https://v3.fal.media/files/lion/MGo2-UMageJnhAs50-3Pa.png",
  "setting-4": "https://v3.fal.media/files/rabbit/gbGJR2YeyWHslDoMaOZmN.png",
  "setting-5": "https://v3.fal.media/files/zebra/VoFFGllug4MWVJ7g--6L-.png",
};

const DUMMY_VIDEO_URLS = [
  "https://storage.theapi.app/videos/280932703321329.mp4",
  "https://storage.theapi.app/videos/280932707525755.mp4",
  "https://storage.theapi.app/videos/280932715532587.mp4",
  "https://storage.theapi.app/videos/280932707525334.mp4",
  "https://storage.theapi.app/videos/280932702520982.mp4",
  "https://storage.theapi.app/videos/280932713322678.mp4",
  "https://storage.theapi.app/videos/280932715531291.mp4",
  "https://storage.theapi.app/videos/280932716533171.mp4",
  "https://storage.theapi.app/videos/280932703538981.mp4",
];

/**
 * Dummy implementation for text-to-image generation.
 * @param prompt - The text prompt for image generation.
 * @param id - The ID of the image.
 * @returns {Promise<string>} - A dummy image URL.
 */
export async function text2imageDummy(
  _prompt: string,
  id: string
): Promise<string> {
  const waitTime = Math.floor(Math.random() * 10) + 1;
  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

  // Introduce a 20% chance of throwing an error
  if (Math.random() < 0.1) {
    throw new Error("Dummy image generation failed due to random error.");
  }

  return (
    DUMMY_IMAGE_URLS[id] ??
    "https://cdnc.ttapi.io/2025-02-02/50b8d4da-59d1-42ea-85eb-1c874ca96cc8.png"
  );
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
 * @param id - The ID of the video.
 * @returns {Promise<string>} - A dummy video URL.
 */
export async function text2videoDummy(
  _imageUrl: string,
  _videoPrompt: string,
  id: string
): Promise<string> {
  const waitTime = Math.floor(Math.random() * 10) + 1;
  await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

  // Introduce a 20% chance of throwing an error
  if (Math.random() < 0.2) {
    throw new Error("Dummy video generation failed due to random error.");
  }

  return (
    DUMMY_VIDEO_URLS[Number(id)] ??
    DUMMY_VIDEO_URLS[Math.floor(Math.random() * DUMMY_VIDEO_URLS.length)] ??
    "https://download.samplelib.com/mp4/sample-10s.mp4"
  );
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
        inputs.images[0],
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
