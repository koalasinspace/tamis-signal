import { addDoc, collection, serverTimestamp, Timestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile } from "./types";

export interface GenerativeLogEntry {
  id?: string;
  timestamp: Timestamp;
  uid: string;
  requestType: "dailyTruth" | "guidance";
  status: "success" | "error" | "validation_failed";
  prompt: string;
  promptLength: number;
  response?: string;
  responseLength?: number;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  metadata: {
    userSoulprint: {
      name?: string;
      zodiacSign?: string;
      tarotArchetype?: string;
      favoriteColor?: string;
      birthPlace?: string;
      destinyNumber?: number;
      planetaryRuler?: string;
      chineseZodiac?: string;
      chineseElement?: string;
      lifePathNumber?: number;
      moonPhase?: string;
      celticTree?: string;
    };
    validationPassed: boolean;
    missingFields?: string[];
    journalEntriesCount?: number;
    query?: string; // For guidance requests
  };
  duration?: number; // ms
  model?: string;
  maxOutputTokens?: number;
}

/**
 * Logs a generative request before API call
 */
export async function logGenerativeRequest(
  uid: string,
  requestType: "dailyTruth" | "guidance",
  prompt: string,
  user: UserProfile,
  metadata: {
    validationPassed: boolean;
    missingFields?: string[];
    journalEntriesCount?: number;
    query?: string;
  }
): Promise<string | null> {
  try {
    const logEntry: Omit<GenerativeLogEntry, "id" | "timestamp"> = {
      uid,
      requestType,
      status: "success", // Will be updated on success/error
      prompt,
      promptLength: prompt.length,
      metadata: {
        userSoulprint: {
          name: user.name,
          zodiacSign: user.zodiacSign,
          tarotArchetype: user.tarotArchetype,
          favoriteColor: user.favoriteColor,
          birthPlace: user.birthPlace,
          destinyNumber: user.destinyNumber,
          planetaryRuler: user.planetaryRuler,
          chineseZodiac: user.chineseZodiac,
          chineseElement: user.chineseElement,
          lifePathNumber: user.lifePathNumber,
          moonPhase: user.moonPhase,
          celticTree: user.celticTree,
        },
        validationPassed: metadata.validationPassed,
        missingFields: metadata.missingFields,
        journalEntriesCount: metadata.journalEntriesCount,
        query: metadata.query,
      },
    };

    // #region agent log
    console.log("[generativeLogger] Attempting to write log", { uid, requestType, promptLength: prompt.length });
    // #endregion

    const docRef = await addDoc(
      collection(db, "artifacts", "tamis-signal-v2", "public", "data", "generativeLogs"),
      {
        ...logEntry,
        timestamp: serverTimestamp(),
      }
    );

    // #region agent log
    console.log("[generativeLogger] Log written successfully", { docId: docRef.id });
    // #endregion

    return docRef.id;
  } catch (error: any) {
    // #region agent log
    console.error("[generativeLogger] FAILED to write log", { errorMessage: error?.message, errorCode: error?.code, error });
    // #endregion
    return null;
  }
}

/**
 * Logs a successful generative response
 */
export async function logGenerativeSuccess(
  logId: string | null,
  response: string,
  duration: number,
  model?: string,
  maxOutputTokens?: number
): Promise<void> {
  if (!logId) return;

  try {
    const logRef = doc(
      db,
      "artifacts",
      "tamis-signal-v2",
      "public",
      "data",
      "generativeLogs",
      logId
    );

    await updateDoc(logRef, {
      status: "success",
      response,
      responseLength: response.length,
      duration,
      model,
      maxOutputTokens,
    });
  } catch (error) {
    console.error("[generativeLogger] Failed to log success", error);
  }
}

/**
 * Logs a generative error
 */
export async function logGenerativeError(
  logId: string | null,
  errorData: {
    message: string;
    code?: string;
    details?: any;
  },
  duration?: number
): Promise<void> {
  if (!logId) return;

  try {
    const logRef = doc(
      db,
      "artifacts",
      "tamis-signal-v2",
      "public",
      "data",
      "generativeLogs",
      logId
    );

    await updateDoc(logRef, {
      status: "error",
      error: errorData,
      duration,
    });
  } catch (err) {
    console.error("[generativeLogger] Failed to log error", err);
  }
}

/**
 * Logs a validation failure (doesn't create initial log, creates complete entry)
 */
export async function logGenerativeValidationFailure(
  uid: string,
  requestType: "dailyTruth" | "guidance",
  user: UserProfile,
  missingFields: string[],
  query?: string
): Promise<void> {
  try {
    const logEntry: Omit<GenerativeLogEntry, "id" | "timestamp"> = {
      uid,
      requestType,
      status: "validation_failed",
      prompt: "",
      promptLength: 0,
      metadata: {
        userSoulprint: {
          name: user.name,
          zodiacSign: user.zodiacSign,
          tarotArchetype: user.tarotArchetype,
          favoriteColor: user.favoriteColor,
          birthPlace: user.birthPlace,
          destinyNumber: user.destinyNumber,
          planetaryRuler: user.planetaryRuler,
          chineseZodiac: user.chineseZodiac,
          chineseElement: user.chineseElement,
          lifePathNumber: user.lifePathNumber,
          moonPhase: user.moonPhase,
          celticTree: user.celticTree,
        },
        validationPassed: false,
        missingFields,
        journalEntriesCount: user.journalEntries?.length,
        query,
      },
    };

    await addDoc(
      collection(db, "artifacts", "tamis-signal-v2", "public", "data", "generativeLogs"),
      {
        ...logEntry,
        timestamp: serverTimestamp(),
      }
    );
  } catch (error) {
    console.error("[generativeLogger] Failed to log validation failure", error);
  }
}
