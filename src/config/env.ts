import dotenv from "dotenv";

dotenv.config();

export const NVM_API_KEY = process.env.NVM_API_KEY!;
export const NVM_ENVIRONMENT = process.env.NVM_ENVIRONMENT || "testing";
export const AGENT_DID = process.env.AGENT_DID!;
export const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY!;
export const TT_API_KEY = process.env.TT_API_KEY!;
export const FAL_KEY = process.env.FAL_KEY!;
export const PIAPI_KEY = process.env.PIAPI_KEY!;

export const IS_DUMMY = process.env.IS_DUMMY === "true";
