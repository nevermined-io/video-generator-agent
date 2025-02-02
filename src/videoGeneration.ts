/**
 * @file videoGeneration.ts
 * @description Provides functions to generate videos using the RunwayML API (Text2Video).
 */

import axios from "axios";
import { RUNWAY_API_KEY } from "./config/env";

/**
 * Creates a video generation request on RunwayML.
 *
 * @param prompt {string} - The text prompt for video generation.
 * @param imageUrl {string} - The URL of the image to be used as a reference.
 * @returns {Promise<any>} - Information about the created job, including jobId, status, etc.
 */
async function createVideoTask(prompt: string, imageUrl: string): Promise<any> {
  const payload = {
    model: "gen3a_turbo",
    promptImage: imageUrl,
    promptText: prompt,
    duration: 5,
  };

  try {
    const response = await axios.post(
      "https://api.dev.runwayml.com/v1/image_to_video",
      payload,
      {
        headers: {
          Authorization: `Bearer ${RUNWAY_API_KEY}`,
          "Content-Type": "application/json",
          "X-Runway-Version": "2024-11-06",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error creating Runway task:", error);
    throw error;
  }
}

/**
 * Polls RunwayML for task completion, taking into account various status codes.
 *
 * Possible statuses:
 * - "SUCCEEDED": Returns the final job details (video URL is available).
 * - "FAILED" or "CANCELLED": Aborts the operation.
 * - "RUNNING", "PENDING", "THROTTLED": Continue polling.
 *
 * @param jobId {string} - The ID of the RunwayML job.
 * @returns {Promise<any>} - The completed job details, including the final video URL.
 */
async function waitForTaskCompletion(jobId: string): Promise<any> {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const job = await getTask(jobId);

    if (job.status === "SUCCEEDED") {
      return job;
    } else if (job.status === "FAILED" || job.status === "CANCELLED") {
      throw new Error(
        `Task ${job.status}: Job ${jobId} has failed or was cancelled.`
      );
    } else if (
      job.status === "RUNNING" ||
      job.status === "PENDING" ||
      job.status === "THROTTLED"
    ) {
      // Continue polling without interfering in the progress.
      console.log(`Job is ${job.status}. Waiting...`);
    } else {
      console.warn(`Unexpected job status: ${job.status}. Continuing to poll.`);
    }
  }
}

/**
 * Fetches the status of a RunwayML job.
 *
 * @param jobId {string} - The ID of the job.
 * @returns {Promise<any>} - The job detail object from RunwayML.
 */
async function getTask(jobId: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://api.dev.runwayml.com/v1/tasks/${jobId}`,
      {
        headers: {
          Authorization: `Bearer ${RUNWAY_API_KEY}`,
          "X-Runway-Version": "2024-11-06",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Runway task:", error);
    throw error;
  }
}

/**
 * Main function to generate a video from a text prompt and an image using RunwayML.
 *
 * @param imageUrl {string} - The URL of the reference image.
 * @param prompt {string} - The text description for video generation.
 * @returns {Promise<string>} - The URL of the generated video.
 */
export async function text2video(
  imageUrl: string,
  prompt: string
): Promise<string> {
  try {
    // 1) Create a job by sending the prompt and image URL.
    const result = await createVideoTask(prompt, imageUrl);

    // If RunwayML works asynchronously and returns a job id, poll for completion:
    if (result?.id) {
      // 2) Wait for the job to complete, considering all possible statuses.
      const finalJob = await waitForTaskCompletion(result.id);
      // Extract and return the final video URL (assuming it's in finalJob.videoUrl).
      return finalJob.output[0];
    } else {
      // If the response returns the video immediately (synchronous),
      // simply return the video URL.
      return result.output[0] || "No video URL returned";
    }
  } catch (error) {
    console.error("Error in text2video:", error);
    throw error;
  }
}
