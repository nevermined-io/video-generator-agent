[![banner](https://raw.githubusercontent.com/nevermined-io/assets/main/images/logo/banner_logo.png)](https://nevermined.io)

Video Generator Agent using Nevermined's Payments API (Node.js)
===============================================================

> A **Node.js-based agent** that generates high-quality images and short video clips based on various prompts and modes (text2image, image2image, text2video). Integrated with the **Nevermined Payments API** for seamless task management, event handling, and billing. Supports both **“dummy mode”** for testing and **real-world** generation via APIs like **Fal.ai** (image generation) and **PiAPI** (video generation).

* * *

**Related Projects**
--------------------

This **Video Generator Agent** is part of a larger ecosystem of AI-driven media creation. For a complete view of how multiple agents work together, see:

1.  [Music Video Orchestrator Agent](https://github.com/nevermined-io/music-video-orchestrator)
    
    *   Coordinates end-to-end workflows: collects user prompts, splits them into tasks, pays agents in multiple tokens, merges final output.
2.  [Song Generator Agent](https://github.com/nevermined-io/song-generation-agent)
    
    *   Produces lyrics, titles, and final audio tracks using LangChain + OpenAI and a chosen music generation API.
3.  [Movie Script Generator Agent](https://github.com/nevermined-io/movie-script-generator-agent)
    
    *   Generates cinematic scripts, extracts scene info, identifies settings and characters, producing prompts for video generation.

**Workflow Example**:

```
[ User Prompt ] --> [Music Orchestrator] --> [Song Generation] --> [Script Generation] --> [Image/Video Generation] --> [Final Compilation]
```

* * *

**Table of Contents**
---------------------

1.  [Features](#features)
2.  [Prerequisites](#prerequisites)
3.  [Installation](#installation)
4.  [Environment Variables](#environment-variables)
5.  [Project Structure](#project-structure)
6.  [Architecture & Workflow](#architecture--workflow)
7.  [Usage](#usage)
8.  [Detailed Guide: Creating & Managing Tasks](#detailed-guide-creating--managing-tasks)
9.  [Configuration Files](#configuration-files)
10.  [License](#license)

* * *

**Features**
------------

*   **Nevermined Integration**:  
    Subscribes to `step-updated` events for the agent’s DID, handles steps automatically, and updates statuses (Pending → Completed → Failed).
    
*   **Multiple Generation Modes**:
    
    *   **text2image**: Generate images from a pure text prompt.
    *   **image2image**: Transform or enhance an existing image based on a text prompt.
    *   **text2video**: Generate short video clips (5 or 10 seconds) from text prompts, with optional reference images.
*   **Configurable**:
    
    *   **Dummy Mode**: Mocks generation with random wait times and error probabilities.
    *   **Production Mode**: Uses **Fal.ai** or **PiAPI** to genuinely create images/videos.
*   **Step-Based Billing**:  
    Each generation mode deducts a certain “cost” from the plan (e.g., 1 credit for images, 5 for videos).
    
*   **Structured Logging**:  
    Uses `pino` for local logs and updates steps in **Nevermined** with errors or success messages.
    

* * *

**Prerequisites**
-----------------

*   **Node.js** (>= 18.0.0 recommended)
*   **NPM** (or Yarn) for package management
*   **Nevermined** credentials (API key, environment, `AGENT_DID`)
*   For real image/video generation:
    *   **Fal.ai** credentials (`FAL_KEY`)
    *   **PiAPI** credentials (`PIAPI_KEY`)

* * *

**Installation**
----------------

1.  **Clone** the repository:
    
    ```bash
    git clone https://github.com/nevermined-io/video-generator-agent.git
    cd video-generator-agent
    ```
    
2.  **Install** dependencies:
    
    ```bash
    npm install
    ```
    
3.  **Optional**: Build for production:
    
    ```bash
    npm run build
    ```
    

* * *

**Environment Variables**
-------------------------

Rename `.env.example` to `.env` and configure it:

```env
NVM_API_KEY=your_nevermined_api_key
NVM_ENVIRONMENT=testing
AGENT_DID=did:nv:your_agent_did

PIAPI_KEY=your_piapi_key
FAL_KEY=your_fal_key

IS_DUMMY=false
```

*   `NVM_API_KEY` / `NVM_ENVIRONMENT`: Connect to Nevermined.
*   `AGENT_DID`: This agent’s DID.
*   `PIAPI_KEY`: PiAPI token for text2video (if not in dummy mode).
*   `FAL_KEY`: Fal.ai token for text2image and image2image (if not in dummy mode).
*   `IS_DUMMY`: Set to `true` for dummy mode (returns static URLs after random delay).

* * *

**Project Structure**
---------------------

```plaintext
video-generator-agent/
├── main.ts               # Main entry: subscribes to steps & routes generation tasks
├── tools.ts              # Handlers for each generation mode (text2image, image2image, text2video)
├── videoGeneration.ts    # PiAPI-based text2video logic (Kling.ai wrapper API)
├── imageGeneration.ts    # Fal.ai-based text2image & image2image logic (Flux wrapper API)
├── logger/
│   └── logger.ts         # Logging via pino
├── config/
│   └── env.ts            # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components:

1.  **`main.ts`**:
    
    *   Initializes the **Nevermined** `Payments` instance.
    *   Subscribes to `step-updated` events targeting `AGENT_DID`.
    *   Based on `inference_type` in `step.input_params`, calls the right handler (`text2image`, `image2image`, or `text2video`).
2.  **`tools.ts`**:
    
    *   Defines handler functions (`handleText2image`, `handleImage2image`, `handleText2video`) that either call real generation functions or dummy logic depending on `IS_DUMMY`.
3.  **`videoGeneration.ts`**:
    
    *   Implements real text2video generation using **PiAPI**: creating a task, polling status, retrieving the final video URL.
4.  **`imageGeneration.ts`**:
    
    *   Implements real text2image / image2image calls using **Fal.ai**.
5.  **`logger/logger.ts`**:
    
    *   `pino` logger with a “pretty” transport for human-readable logs.

* * *

**Architecture & Workflow**
---------------------------

1.  **Task Reception**:
    
    *   Another agent (e.g., an orchestrator) triggers a step for `AGENT_DID`. The step typically includes an `inference_type` in `input_params`:
        
        ```json
        [
          {
            "inference_type": "text2image",
            "some_other_param": "value"
          }
        ]
        ```
        
2.  **Main Handler** (`run(data: any)`)
    
    *   In `main.ts`, `run` is called whenever a step is updated to `Pending`.
    *   We parse the step, read the `inference_type`, and delegate to a matching function in `tools.ts`.
3.  **Generation**
    
    *   If in **dummy mode**, we simulate generation with random waits and 10% chance of failure, for testing and debugging.
    *   If in **production mode**, we call the appropriate method:
        *   `text2image(...)` or `image2image(...)` from **Fal.ai**
        *   `text2video(...)` from **PiAPI**
4.  **Step Update**
    
    *   If generation succeeds, we mark the step as `Completed`, store the generated **URL** in `output_artifacts`, and optionally set a `cost` (e.g., 1 for images, 5 for videos).
    *   If it fails, we mark the step as `Failed` with the error message.

* * *

**Usage**
---------

```bash
npm start
```

*   The agent logs into **Nevermined** using `NVM_API_KEY` / `NVM_ENVIRONMENT`.
*   Subscribes to `step-updated` events for `AGENT_DID`.
*   Waits for tasks. Whenever a step with `Pending` status appears (with `inference_type` in `input_params`), it processes it and updates the step accordingly.

* * *

**Detailed Guide: Creating & Managing Tasks**
---------------------------------------------

### 1\. Subscribing to Task Requests

In `main.ts`, we see:

```ts
await payments.query.subscribe(run, {
  joinAccountRoom: false,
  joinAgentRooms: [AGENT_DID],
  subscribeEventTypes: ["step-updated"],
  getPendingEventsOnSubscribe: false,
});
```

This ensures the agent **reacts** whenever a step for `AGENT_DID` is updated (usually set to `Pending` by the orchestrator).

### 2\. Handling Task Lifecycle

When `run(data)` is called:

```ts
const step = await payments.query.getStep(eventData.step_id);
if (step.step_status !== AgentExecutionStatus.Pending) return;
const [{ inference_type, ...inputs }] = JSON.parse(step.input_params);
```

1.  **Check** the step is `Pending`.
2.  **Extract** the `inference_type`.
3.  **Route** to `handleText2image`, `handleImage2image`, or `handleText2video` in `tools.ts`.

### 3\. Generating Images or Videos

In **dummy mode**, we call `text2imageDummy`; otherwise, we call `text2image` from `imageGeneration.ts`. For videos, we similarly choose `text2videoDummy` or `text2video` from `videoGeneration.ts`.

```ts
// tools.ts
export async function handleText2image(_inputs: any, step: any, payments: any) {
  try {
    if (IS_DUMMY) {
      return await text2imageDummy(step.input_query);
    } else {
      return await text2image(step.input_query);
    }
  } catch (error) {
    await payments.query.updateStep(..., { step_status: Failed });
    throw error;
  }
}
```

### 4\. Validating Steps & Sending Logs

If successful, we mark the step as `Completed`:

```ts
await payments.query.updateStep(step.did, {
  ...step,
  step_status: AgentExecutionStatus.Completed,
  output: "Generation completed successfully.",
  output_artifacts: [outputUrl],
});
```

If it fails, we mark the step as `Failed`, including an error message in `output`.

* * *

**Configuration Files**
-----------------------

### `config/env.ts`

Loads environment variables like `NVM_API_KEY`, `PIAPI_KEY`, `FAL_KEY`, `IS_DUMMY`, etc.

```ts
import dotenv from "dotenv";
dotenv.config();

export const NVM_API_KEY = process.env.NVM_API_KEY!;
export const NVM_ENVIRONMENT = process.env.NVM_ENVIRONMENT || "testing";
export const AGENT_DID = process.env.AGENT_DID!;
export const FAL_KEY = process.env.FAL_KEY!;
export const PIAPI_KEY = process.env.PIAPI_KEY!;
export const IS_DUMMY = process.env.IS_DUMMY === "true";
```

### `logger/logger.ts`

A simple **pino** setup, possibly with `pino-pretty`.

```ts
import pino from "pino";
import pretty from "pino-pretty";

export const logger = pino(pretty({ sync: true }));
```

* * *

**License**
-----------

```
Apache License 2.0

(C) 2025 Nevermined AG

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at:

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions
and limitations under the License.
```