import * as crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { AGENT_DID } from "../config/env";

// Generate deterministic agent ID: if no argument, return AGENT_DID as is; if argument, hash it as before
export const generateDeterministicAgentId = (className?: string): string => {
  if (!className) return AGENT_DID;
  const hash = crypto.createHash('sha256').update(className).digest('hex').substring(0, 32);
  // Format as UUID: 8-4-4-4-12
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
};

// Generate random session ID
export const generateSessionId = (): string => {
  return uuidv4();
};

// Log session information
export const logSessionInfo = (agentId: string, sessionId: string, agentName: string = 'Agent'): void => {
  const timestamp = new Date().toISOString();
  const logsDir = path.join(__dirname, '..', 'logs');

  // Ensure logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Create session-specific log file with timestamp format (YYYYMMDD_HHMMSS)
  const now = new Date();
  const timestampStr = now.toISOString()
    .replace(/[-:]/g, '')  // Remove dashes and colons
    .replace(/T/, '_')     // Replace T with underscore
    .substring(0, 15);     // Take YYYYMMDD_HHMMSS format

  const sessionLogFile = path.join(logsDir, `session_${timestampStr}.txt`);

  // Check if session file already exists to avoid duplicating session ID
  let sessionExists = false;
  if (fs.existsSync(sessionLogFile)) {
    sessionExists = true;
  }

  // If session file doesn't exist, create it with session ID header
  if (!sessionExists) {
    const sessionHeader = `Session ID: ${sessionId}\n`;
    fs.writeFileSync(sessionLogFile, sessionHeader);
  }

  // Append agent information in the expected format
  const agentEntry = `${agentName}: ${agentId}\n`;
  fs.appendFileSync(sessionLogFile, agentEntry);

  console.log(`Session logged: Timestamp: ${timestamp}, Agent Name: ${agentName}, Agent ID: ${agentId}, Session ID: ${sessionId}`);
}; 