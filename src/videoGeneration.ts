/**
 * @file videoGeneration.ts
 * @description Provides functions to generate videos using the PiAPI (Text2Video).
 */

import axios from "axios";
import { PIAPI_KEY } from "./config/env";
import pino from "pino";
import pretty from "pino-pretty";

// Initialize logger
const logger = pino(pretty({ sync: true }));

/**
 * Creates a video generation task on PiAPI.
 *
 * @param prompt - The text prompt for video generation.
 * @param imageUrls - List of image URLs to be used as reference.
 * @returns {Promise<any>} - Information about the created task, including task_id, status, etc.
 */
async function createVideoTask(
  prompt: string,
  imageUrls: string[],
  duration: number = 5
): Promise<any> {
  if ([5, 10].includes(duration) === false) {
    duration = 10;
  }
  const payload = {
    model: "kling",
    task_type: "video_generation",
    input: {
      prompt: prompt,
      negative_prompt: "",
      duration,
      elements: imageUrls.map((url) => ({ image_url: url })),
      mode: "std",
      aspect_ratio: "16:9",
      version: "1.6",
    },
    config: {
      service_mode: "public",
      webhook_config: {
        endpoint: "",
        secret: "",
      },
    },
  };

  try {
    const response = await axios.post(
      "https://api.piapi.ai/api/v1/task",
      payload,
      {
        headers: {
          "x-api-key": PIAPI_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating PiAPI task:", error);
    throw error;
  }
}

/**
 * Polls PiAPI until the task is completed.
 *
 * Possible statuses:
 * - "completed": The task is finished and the video URL is available.
 * - "failed" or "cancelled": Aborts the operation.
 * - Other statuses: Continues polling.
 *
 * @param taskId - The task ID in PiAPI.
 * @returns {Promise<any>} - The final task details, including the generated video.
 */
async function waitForTaskCompletion(taskId: string): Promise<any> {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const task = await getTask(taskId);

    if (task.data.status === "completed") {
      return task.data;
    } else if (
      task.data.status === "failed" ||
      task.data.status === "cancelled"
    ) {
      throw new Error(
        `Task ${task.data.status}: Task ${taskId} has failed or was cancelled.`
      );
    } else {
      logger.info(`${taskId}: Task status "${task.data.status}". Waiting...`);
    }
  }
}

/**
 * Fetches the status of a PiAPI task.
 *
 * @param taskId - The task ID.
 * @returns {Promise<any>} - The task details.
 */
async function getTask(taskId: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.piapi.ai/api/v1/task/${taskId}`,
      {
        headers: {
          "x-api-key": PIAPI_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching PiAPI task:", error);
    throw error;
  }
}

/**
 * Main function to generate a video from a text prompt and a list of images using PiAPI.
 *
 * @param imageUrls - List of reference image URLs.
 * @param prompt - The text description for video generation.
 * @returns {Promise<string>} - The URL of the generated video.
 */
export async function text2video(
  imageUrls: string[],
  prompt: string,
  duration: number = 5
): Promise<string> {
  try {
    // 1) Create a task by sending the prompt and the image URLs.
    const result = await createVideoTask(prompt, imageUrls, duration);

    // If PiAPI works asynchronously and returns a task_id, poll for completion:
    if (result?.data?.task_id) {
      // 2) Wait for the task to complete.
      const finalTask = await waitForTaskCompletion(result.data.task_id);
      // Extract and return the video URL (assuming it is located in finalTask.output.works[0].video)
      if (
        finalTask.output &&
        finalTask.output.works &&
        finalTask.output.works.length > 0
      ) {
        const video = finalTask.output.works[0].video;
        return video.resource_without_watermark || video.resource;
      } else {
        throw new Error("Video URL not found in the final response.");
      }
    } else {
      throw new Error("task_id not received from PiAPI.");
    }
  } catch (error) {
    logger.error(`Error in text2video: ${JSON.stringify(error)}`);
    throw error;
  }
}
