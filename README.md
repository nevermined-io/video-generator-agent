Aquí tienes el `README.md` actualizado para reflejar la existencia y el propósito de los archivos `config/env.ts` y `logger/logger.ts`:

* * *

[![banner](https://raw.githubusercontent.com/nevermined-io/assets/main/images/logo/banner_logo.png)](https://nevermined.io)

Video Generator Agent using Nevermined's Payments API (Node.js)
===============================================================

> A **Node.js-based agent** that generates high-quality videos using **Eden AI's SDK** and custom prompts. Seamlessly integrated with **Nevermined's Payments API**, this agent efficiently handles task requests and billing for video generation.

* * *

Related Projects
----------------

This project is part of a larger workflow that explores the interconnection between agents and how they communicate and work together. Please refer to these projects to gain a comprehensive view of the workflow:

1.  [Movie Orchestrator Agent](https://github.com/nevermined-io/movie-orchestrator-agent):
    
    *   Coordinates the entire workflow, ensuring smooth task execution across agents.
    
2.  [Movie Script Generator Agent](https://github.com/nevermined-io/movie-script-generator-agent):
    
    *   Generates movie scripts and characters descriptions based on input ideas.

3.  [Video Generator Agent](https://github.com/nevermined-io/video-generator-agent):
    
    *   Generates realistic character videos based on their descriptions.

#### Workflow Diagram:

![[Init Step] --> [generateScript] --> [generateImagesForCharacters] --> [generateVideosForScenes]](https://github.com/nevermined-io/movie-orchestrator-agent/blob/main/flow_img.png?raw=true)

* * *

Table of Contents
-----------------

1.  [Introduction](#introduction)
2.  [Getting Started](#getting-started)
    *   [Installation](#installation)
    *   [Running the Agent](#running-the-agent)
3.  [Project Structure](#project-structure)
4.  [Integration with Nevermined Payments API](#integration-with-nevermined-payments-api)
5.  [Integration with Eden AI SDK](#integration-with-eden-ai-sdk)
6.  [How to Create Your Own Agent](#how-to-create-your-own-agent)
    *   [1. Subscribing to Task Requests](#1-subscribing-to-task-requests)
    *   [2. Handling Task Lifecycle](#2-handling-task-lifecycle)
    *   [3. Generating Videos with Eden AI](#3-generating-videos-with-eden-ai)
    *   [4. Validating Steps and Sending Logs](#4-validating-steps-and-sending-logs)
7.  [Configuration Files](#configuration-files)
    *   [`config/env.ts`](#configenvts)
    *   [`logger/logger.ts`](#loggerloggerts)
8.  [License](#license)

* * *

Introduction
------------

The **Video Generator Agent** is a specialized application designed to create high-quality videos based on detailed textual prompts. Leveraging **Eden AI's SDK**, it translates textual input into video sequences, such as cinematic scenes or animations.

Operating within the **Nevermined ecosystem**, this agent utilizes the **Payments API** for:

*   **Task management**: Processes task requests and returns results.
*   **Billing integration**: Ensures tasks align with the allocated budget.
*   **Event-driven architecture**: Automatically processes events without requiring a dedicated server.

This agent integrates directly with Eden AI, which provides state-of-the-art tools for AI-generated video content. Videos are generated based on prompts provided by the orchestrator or other agents.

* * *

Getting Started
---------------

### Installation

1.  **Clone the repository**:
    
    ```bash
    git clone https://github.com/nevermined-io/video-generator-agent.git
    cd video-generator-agent
    ```
    
2.  **Install dependencies**:
    
    ```bash
    npm install
    ```
    
3.  **Configure environment variables**:
    
    *   Copy the `.env.example` file to `.env`:
        
        ```bash
        cp .env.example .env
        ```
        
    *   Populate the `.env` file with the following details:
        
        ```bash
        NVM_API_KEY=YOUR_NVM_API_KEY
        NVM_ENVIRONMENT=testing  # or staging/production
        AGENT_DID=YOUR_AGENT_DID
        EDEN_API_KEY=YOUR_EDEN_API_KEY
        ```
        

* * *

### Running the Agent

Run the agent with the following command:

```bash
npm start
```

The agent will subscribe to the Nevermined task system and begin processing video generation requests.

* * *

Project Structure
-----------------

```plaintext
video-generator-agent/
├── src/
│   ├── main.ts              # Main entry point for the agent
│   ├── videoGeneration.ts   # Video generation logic using Eden AI's SDK
│   ├── config/
│   │   └── env.ts           # Configuration for environment variables
│   ├── logger/
│       └── logger.ts        # Logging configuration using pino
├── .env.example             # Example environment variables file
├── package.json             # Node.js dependencies and scripts
├── tsconfig.json            # TypeScript configuration
```

### Key Components:

1.  **`main.ts`**: Handles task requests, video generation, and task updates.
2.  **`videoGeneration.ts`**: Contains the logic for generating videos using Eden AI's SDK.
3.  **`config/env.ts`**: Manages environment variables and application configuration.
4.  **`logger/logger.ts`**: Provides structured logging using the `pino` library.

* * *

Integration with Nevermined Payments API
----------------------------------------

The **Nevermined Payments API** provides tools for task management, billing, and event subscription.

1.  **Initialize the Payments Instance**:
    
    ```typescript
    import { Payments, EnvironmentName } from "@nevermined-io/payments";
    
    const payments = Payments.getInstance({
      nvmApiKey: NVM_API_KEY,
      environment: NVM_ENVIRONMENT as EnvironmentName,
    });
    ```
    
2.  **Subscribe to Task Updates**:
    
    ```typescript
    await payments.query.subscribe(run, {
      joinAccountRoom: false,
      joinAgentRooms: [AGENT_DID],
      subscribeEventTypes: ["step-updated"],
      getPendingEventsOnSubscribe: false,
    });
    ```
    
3.  **Task Lifecycle**:
    
    *   Fetch step details:
        
        ```typescript
        const step = await payments.query.getStep(stepId);
        ```
        
    *   Update step status:
        
        ```typescript
        await payments.query.updateStep(step.did, {
          ...step,
          step_status: "Completed",
          output_artifacts: [videoUrl],
        });
        ```
        

* * *

Integration with Eden AI SDK
----------------------------

Eden AI provides tools for AI-generated video creation through its SDK.

1.  **Install the SDK**:
    
    ```bash
    npm install @edenlabs/eden-sdk
    ```
    
2.  **Initialize the Eden Client**:
    
    ```typescript
    import { EdenClient } from "@edenlabs/eden-sdk";
    
    const eden = new EdenClient({ apiKey: EDEN_API_KEY });
    ```
    
3.  **Generate Videos**:
    
    ```typescript
    const task = await eden.tasks.createV2({
      tool: "txt2vid",
      args: {
        prompt: "A cinematic shot of a futuristic city at sunset",
        height: 1080,
        width: 1920,
        n_frames: 24,
        closed_loop: false,
        motion_strength: 1.1,
      },
    });
    ```
    

* * *

Configuration Files
-------------------

### `config/env.ts`

Manages environment variables for the agent. This file loads values from `.env` using `dotenv` and exports them for use across the project.

```typescript
import dotenv from "dotenv";

dotenv.config();

export const NVM_API_KEY = process.env.NVM_API_KEY!;
export const NVM_ENVIRONMENT = process.env.NVM_ENVIRONMENT || "testing";
export const AGENT_DID = process.env.AGENT_DID!;
export const EDEN_API_KEY = process.env.EDEN_API_KEY!;
```

### `logger/logger.ts`

Provides structured logging using the `pino` library. Logs are formatted in a human-readable way and default to the `info` log level.

```typescript
import pino from "pino";

export const logger = pino({
  transport: { target: "pino-pretty" },
  level: "info",
});
```

* * *

License
-------

```text
Copyright 2025 Nevermined AG

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

Este `README.md` ahora incluye detalles claros sobre los archivos `config/env.ts` y `logger/logger.ts`, explicando cómo funcionan y su propósito en el proyecto.