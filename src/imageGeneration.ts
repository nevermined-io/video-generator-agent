/**
 * @file imageGeneration.ts
 * @description Provides functions to generate images using the Fal.ai API (Text2Image and Image2Image).
 */

import { fal } from "@fal-ai/client";
//@ts-ignore
import { FAL_KEY } from "./config/env";
import { logger } from "./logger/logger";

/**
 * Generates an image from a text prompt using the Fal.ai API.
 *
 * @param prompt {string} - The text prompt for image generation.
 * @returns {Promise<string>} - A promise that resolves to the URL of the generated image.
 * @throws {Error} - If the image generation fails or no image is returned.
 */
export async function text2image(prompt: string): Promise<string> {
  try {
    logger.info(`Generating image with text2image: ${prompt}`);
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: prompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    if (
      result &&
      result.data &&
      result.data.images &&
      result.data.images.length > 0
    ) {
      return result.data.images[0].url;
    } else {
      throw new Error("No image URL returned from Fal.ai API.");
    }
  } catch (error) {
    console.error("Error generating image with text2image:", error);
    throw error;
  }
}

/**
 * Generates an image-to-image transformation using the Fal.ai API.
 *
 * This function takes an input image URL and a prompt, then submits a request
 * to transform the image based on the prompt. It logs progress updates and returns
 * the URL of the generated image when complete.
 *
 * @param inputImageUrl {string} - The URL of the input image.
 * @param prompt {string} - The text prompt describing the desired transformation.
 * @returns {Promise<string>} - A promise that resolves to the URL of the generated image.
 * @throws {Error} - If the image generation fails or no image is returned.
 */
export async function image2image(
  inputImageUrl: string,
  prompt: string
): Promise<string> {
  try {
    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: inputImageUrl,
        prompt: prompt,
        strength: 0.95,
        num_inference_steps: 40,
        guidance_scale: 5,
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    if (
      result &&
      result.data &&
      result.data.images &&
      result.data.images.length > 0
    ) {
      return result.data.images[0].url;
    } else {
      throw new Error("No image URL returned from Fal.ai API.");
    }
  } catch (error) {
    console.error("Error generating image with image2image:", error);
    throw error;
  }
}
