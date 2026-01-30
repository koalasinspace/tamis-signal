"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.oracleGenerate = exports.ensureUserRole = exports.getUserRole = exports.setUserRole = exports.beforecreated = void 0;
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const identity_1 = require("firebase-functions/v2/identity");
const admin = __importStar(require("firebase-admin"));
const google_auth_library_1 = require("google-auth-library");
// Initialize Firebase Admin SDK
admin.initializeApp();
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
// Privileged email addresses - used for initial role assignment
const PRIVILEGED_EMAILS = {
    "tyler@dierks.email": "admin",
    "tami@hawleymail.com": "owner",
};
/**
 * Blocking function: Runs before user creation completes and can set custom claims.
 * This is a v2 function that runs on Cloud Run (different service account).
 * Sets role based on email for privileged users, defaults to 'user'.
 */
exports.beforecreated = (0, identity_1.beforeUserCreated)(async (event) => {
    const email = event.data?.email?.toLowerCase().trim();
    const role = (email && PRIVILEGED_EMAILS[email]) || "user";
    console.log(`[beforeUserCreated] Setting role '${role}' for new user (${email || "no email"})`);
    // Return custom claims to be set on the user
    return {
        customClaims: { role },
    };
});
/**
 * Callable function: Allows admins/owners to change user roles.
 * Validates caller has admin/owner privileges via custom claims.
 */
exports.setUserRole = (0, https_1.onCall)({ timeoutSeconds: 30, memory: "128MiB" }, async (req) => {
    // Verify caller is authenticated
    if (!req.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    }
    // Verify caller has admin or owner role (server-side check)
    const callerRole = req.auth.token?.role;
    if (callerRole !== "admin" && callerRole !== "owner") {
        throw new https_1.HttpsError("permission-denied", "Only admins can modify roles.");
    }
    const { targetUid, role } = req.data;
    if (!targetUid || typeof targetUid !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Missing targetUid.");
    }
    const validRoles = ["user", "admin", "owner", "dev"];
    if (!role || !validRoles.includes(role)) {
        throw new https_1.HttpsError("invalid-argument", `Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }
    // Prevent non-owners from creating owners
    if (role === "owner" && callerRole !== "owner") {
        throw new https_1.HttpsError("permission-denied", "Only owners can create other owners.");
    }
    try {
        await admin.auth().setCustomUserClaims(targetUid, { role });
        console.log(`[setUserRole] ${req.auth.uid} set role '${role}' for user ${targetUid}`);
        return { success: true, message: `Role set to '${role}'` };
    }
    catch (error) {
        console.error(`[setUserRole] Failed:`, error);
        throw new https_1.HttpsError("internal", `Failed to set role: ${error?.message || String(error)}`);
    }
});
/**
 * Callable function: Gets current user's role from custom claims.
 * Useful for forcing a token refresh and getting the latest role.
 */
exports.getUserRole = (0, https_1.onCall)({ timeoutSeconds: 10, memory: "128MiB" }, async (req) => {
    if (!req.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    }
    try {
        const user = await admin.auth().getUser(req.auth.uid);
        const role = user.customClaims?.role || "user";
        return { role };
    }
    catch (error) {
        console.error(`[getUserRole] Failed:`, error);
        throw new https_1.HttpsError("internal", `Failed to get role: ${error?.message || String(error)}`);
    }
});
/**
 * Callable function: Ensures the current user has custom claims set.
 * If no role claim exists, sets based on privileged email list or defaults to 'user'.
 * Used for migrating existing users who were created before role system was added.
 */
exports.ensureUserRole = (0, https_1.onCall)({ timeoutSeconds: 30, memory: "128MiB" }, async (req) => {
    if (!req.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    }
    try {
        const user = await admin.auth().getUser(req.auth.uid);
        // If role already set, just return it
        if (user.customClaims?.role) {
            return { role: user.customClaims.role, wasSet: false };
        }
        // Determine role based on email
        const email = user.email?.toLowerCase().trim();
        const role = (email && PRIVILEGED_EMAILS[email]) || "user";
        // Set the custom claims
        await admin.auth().setCustomUserClaims(req.auth.uid, { role });
        console.log(`[ensureUserRole] Set role '${role}' for existing user ${req.auth.uid} (${email})`);
        return { role, wasSet: true };
    }
    catch (error) {
        console.error(`[ensureUserRole] Failed:`, error);
        throw new https_1.HttpsError("internal", `Failed to ensure role: ${error?.message || String(error)}`);
    }
});
exports.oracleGenerate = (0, https_1.onCall)({
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (req) => {
    // #region agent log
    console.log("[oracleGenerate] Function entry point reached");
    // #endregion
    try {
        // #region agent log
        console.log("[oracleGenerate] Function called", {
            hasAuth: !!req.auth?.uid,
            promptLength: req.data?.prompt?.length ?? 0,
            dataKeys: req.data ? Object.keys(req.data) : []
        });
        // #endregion
        if (!req.auth?.uid) {
            throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
        }
        const prompt = req.data?.prompt;
        if (!prompt || typeof prompt !== "string" || prompt.trim().length < 2) {
            throw new https_1.HttpsError("invalid-argument", "Missing prompt.");
        }
        // Validate prompt length (Vertex AI has limits, prevent extremely long prompts)
        const trimmedPrompt = prompt.trim();
        if (trimmedPrompt.length > 100000) {
            throw new https_1.HttpsError("invalid-argument", "Prompt too long (max 100,000 characters).");
        }
        const requestType = req.data?.requestType;
        const projectId = process.env.GCLOUD_PROJECT;
        // #region agent log
        console.log("[oracleGenerate] Environment check", {
            hasProjectId: !!projectId,
            projectId: projectId ? projectId.substring(0, 10) + "..." : "undefined"
        });
        // #endregion
        if (!projectId) {
            throw new https_1.HttpsError("failed-precondition", "Missing GCLOUD_PROJECT.");
        }
        const location = process.env.VERTEX_LOCATION ?? "us-central1";
        const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
        // #region agent log
        console.log("[oracleGenerate] Getting auth client", { url: url.substring(0, 80) + "..." });
        // #endregion
        let accessToken;
        try {
            const auth = new google_auth_library_1.GoogleAuth({
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
            });
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            accessToken = tokenResponse?.token;
            // #region agent log
            console.log("[oracleGenerate] Access token", {
                hasToken: !!accessToken,
                tokenLength: accessToken?.length ?? 0
            });
            // #endregion
        }
        catch (authError) {
            // #region agent log
            console.error("[oracleGenerate] Auth error", {
                errorMessage: authError?.message,
                errorCode: authError?.code,
                stack: authError?.stack?.substring(0, 300)
            });
            // #endregion
            throw new https_1.HttpsError("internal", `Failed to obtain access token: ${authError?.message ?? String(authError)}`);
        }
        if (!accessToken) {
            throw new https_1.HttpsError("internal", "Failed to obtain access token.");
        }
        // Determine token limit based on request type
        // gemini-2.5-flash uses "thinking" tokens (~1000) that count against maxOutputTokens
        // So we need 4096+ to get decent output length (thinking + actual response)
        const maxOutputTokens = 4096;
        const body = {
            contents: [{ role: "user", parts: [{ text: trimmedPrompt }] }],
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens,
            },
        };
        // #region agent log
        console.log("[oracleGenerate] Calling Vertex AI", {
            url: url.substring(0, 80) + "...",
            promptLength: trimmedPrompt.length,
            requestType: requestType ?? "unknown",
            maxOutputTokens
        });
        // #endregion
        let resp;
        try {
            resp = await fetch(url, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
        }
        catch (fetchError) {
            // #region agent log
            console.error("[oracleGenerate] Fetch error", {
                errorMessage: fetchError?.message,
                errorCode: fetchError?.code,
                name: fetchError?.name
            });
            // #endregion
            throw new https_1.HttpsError("internal", `Failed to call Vertex AI: ${fetchError?.message ?? String(fetchError)}`);
        }
        // #region agent log
        console.log("[oracleGenerate] Vertex AI response", {
            status: resp.status,
            ok: resp.ok
        });
        // #endregion
        if (!resp.ok) {
            const text = await resp.text().catch(() => "");
            // #region agent log
            console.error("[oracleGenerate] Vertex AI error", {
                status: resp.status,
                errorText: text.slice(0, 200)
            });
            // #endregion
            throw new https_1.HttpsError("internal", `Vertex AI error ${resp.status}: ${text.slice(0, 500)}`);
        }
        const json = (await resp.json());
        const out = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ??
            "The void is silent today.";
        return { text: out };
    }
    catch (error) {
        // #region agent log
        console.error("[oracleGenerate] Error caught", {
            errorMessage: error?.message,
            errorCode: error?.code,
            stack: error?.stack?.substring(0, 200)
        });
        // #endregion
        // Re-throw HttpsError as-is, wrap others
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError("internal", `Unexpected error: ${error?.message ?? String(error)}`);
    }
});
