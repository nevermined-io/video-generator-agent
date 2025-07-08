/**
 * @file imageGeneration.ts
 * @description Provides functions to generate images using the Fal.ai API (Text2Image and Image2Image).
 */

import { fal } from "@fal-ai/client";
//@ts-ignore
import { FAL_KEY } from "./config/env";
import { logger } from "./logger/logger";
import { withHeliconeLogging, calculateImageUsage } from "./utils/heliconeWrapper";

/**
 * Helper function to calculate image size in pixels from width and height
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Size in pixels (width * height)
 */
function calculatePixels(width: number, height: number): number {
  return width * height;
}

/**
 * Helper function to get pixels from image object
 * @param image - Image object with width and height properties
 * @returns Size in pixels
 */
function getImagePixels(image: { width?: number; height?: number }): number {
  const width = image.width || 1024; // Default to 1024 if undefined
  const height = image.height || 576; // Default to 576 if undefined
  return calculatePixels(width, height);
}

/**
 * Core text-to-image generation logic without Helicone logging
 */
async function executeText2Image(prompt: string): Promise<string> {
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
    const imageUrl = result.data.images[0].url;
    const image = result.data.images[0];
    const pixels = getImagePixels(image);

    console.log("images", result.data.images);
    console.log("pixels:", pixels);
    
    return imageUrl;
  } else {
    throw new Error("No image URL returned from Fal.ai API.");
  }
}

/**
 * Core image-to-image generation logic without Helicone logging
 */
async function executeImage2Image(inputImageUrl: string, prompt: string): Promise<string> {
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
    const imageUrl = result.data.images[0].url;
    const image = result.data.images[0];
    const pixels = getImagePixels(image);
    
    console.log("images", result.data.images);
    console.log("pixels:", pixels);

    return imageUrl;
  } else {
    throw new Error("No image URL returned from Fal.ai API.");
  }
}

/**
 * Generates an image from a text prompt using the Fal.ai API.
 *
 * @param prompt {string} - The text prompt for image generation.
 * @returns {Promise<string>} - A promise that resolves to the URL of the generated image.
 * @throws {Error} - If the image generation fails or no image is returned.
 */
export async function text2image(prompt: string): Promise<string> {
  return withHeliconeLogging(
    'ImageGeneratorAgent',
    {
      model: "fal-ai/flux-schnell/text-to-image",
      inputData: {
        prompt: prompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }
    },
    () => executeText2Image(prompt),
    (result) => result, // Identity function - return the URL as-is
    (_result) => {
      // Calculate pixels from the result - we need to get the actual image data
      // For now, use default dimensions since we need the API response to get actual pixels
      const pixels = calculatePixels(1024, 576);
      return calculateImageUsage(pixels);
    },
    'img'
  );
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
  return withHeliconeLogging(
    'ImageGeneratorAgent',
    {
      model: "fal-ai/flux-dev/image-to-image",
      inputData: {
        image_url: inputImageUrl,
        prompt: prompt,
        strength: 0.95,
        num_inference_steps: 40,
        guidance_scale: 5,
        num_images: 1,
        enable_safety_checker: true,
      }
    },
    () => executeImage2Image(inputImageUrl, prompt),
    (result) => result, // Identity function - return the URL as-is
    (_result) => {
      // Calculate pixels from the result - using default dimensions for now
      const pixels = calculatePixels(1024, 576);
      return calculateImageUsage(pixels);
    },
    'img2img'
  );
}

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

  return withHeliconeLogging(
    'ImageGeneratorAgent',
    {
      model: "fal-ai/flux-schnell/text-to-image",
      inputData: {
        prompt: _prompt,
        image_size: "landscape_16_9",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true
      }
    },
    async () => {
      const waitTime = Math.floor(Math.random() * 10) + 1;
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      
      if (Math.random() < 0.0) {
        throw new Error("Dummy image generation failed due to random error.");
      }
      
      const url = DUMMY_IMAGE_URLS[id] ?? "https://v3.fal.media/files/koala/9cnEfODPJLdoKLiM2_pND.png";
      
      // Calculate pixels for default dimensions (1024x576)
      const pixels = calculatePixels(1024, 576);
      console.log("pixels:", pixels);
      
      return url;
    },
    (result) => result, // Identity function - return the URL as-is
    (_result) => {
      const pixels = calculatePixels(1024, 576);
      return calculateImageUsage(pixels);
    },
    'dummy-img'
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
  return withHeliconeLogging(
    'ImageGeneratorAgent',
    {
      model: "fal-ai/flux-dev/image-to-image",
      inputData: {
        image_url: _imageUrl,
        prompt: _prompt,
        strength: 0.95,
        num_inference_steps: 40,
        guidance_scale: 5,
        num_images: 1,
        enable_safety_checker: true
      }
    },
    async () => {
      const waitTime = Math.floor(Math.random() * 10) + 1;
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      
      if (Math.random() < 0.0) {
        throw new Error("Dummy image 2 image generation failed due to random error.");
      }
      
      const url = "https://v3.fal.media/files/kangaroo/YyGP6e4eq7dayC6TzdWfA.png";
      
      // Calculate pixels for default dimensions (1024x576)
      const pixels = calculatePixels(1024, 576);
      console.log("pixels:", pixels);
      
      return url;
    },
    (result) => result, // Identity function - return the URL as-is
    (_result) => {
      const pixels = calculatePixels(1024, 576);
      return calculateImageUsage(pixels);
    },
    'dummy-img2img'
  );
}
