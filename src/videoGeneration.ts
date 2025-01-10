import { EdenClient } from "@edenlabs/eden-sdk";
import { EDEN_API_KEY } from "./config/env";

/**
 * VideoGeneration handles video generation tasks using Eden's SDK.
 *
 * This module provides functionality to list generators, create video generation tasks,
 * track their progress, and retrieve the generated video.
 */

if (!EDEN_API_KEY) {
  throw new Error("EDEN_API_KEY environment variable is not set");
}

const eden = new EdenClient({ apiKey: EDEN_API_KEY });

/**
 * Lists all available video generation tools provided by Eden.
 *
 * @returns {Promise<any>} A promise resolving with a list of available generators.
 */
export const listGenerators = async (): Promise<any> => {
  try {
    return await eden.generators.list();
  } catch (error) {
    console.error("Error listing generators:", error);
    throw error;
  }
};

/**
 * Generates a video from a text prompt.
 *
 * @param text {string} - The text prompt to guide the video generation.
 * @returns {Promise<string>} - A promise resolving with the URL of the generated video.
 */
export const text2video = async (text: string): Promise<string> => {
  try {
    const task = await createTask(text);

    // Poll the task until it is completed
    const completedTask = await waitForTaskCompletion(task._id);

    // Extract and return the URL of the generated video
    return completedTask.result[0].output[0].url;
  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
};

/**
 * Creates a video generation task.
 *
 * @param text {string} - The text prompt to guide the video generation.
 * @returns {Promise<any>} - A promise resolving with the created task.
 */
export const createTask = async (text: string): Promise<any> => {
  const input = {
    tool: "txt2vid",
    args: {
      prompt: text,
      height: 1080,
      width: 1920,
      n_frames: 24,
      closed_loop: false,
      motion_strength: 1.1,
    },
  };

  try {
    const result = await eden.tasks.createV2(input);
    if (result?.error) {
      throw new Error(`Error creating task: ${result?.message}`);
    }
    return result.task;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

/**
 * Fetches the status of a task using its ID.
 *
 * @param taskId {string} - The ID of the task.
 * @returns {Promise<any>} - A promise resolving with the task details.
 */
export const getTask = async (taskId: string): Promise<any> => {
  try {
    const res = await eden.tasks.getV2({ taskId });
    return res.task;
  } catch (error) {
    console.error("Error fetching task:", error);
    throw error;
  }
};

/**
 * Waits for a task to complete by polling its status periodically.
 *
 * @param taskId {string} - The ID of the task.
 * @returns {Promise<any>} - A promise resolving with the completed task details.
 */
const waitForTaskCompletion = async (taskId: string): Promise<any> => {
  let task;
  do {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds
    task = await getTask(taskId);
  } while (task.status !== "completed");

  return task;
};
