"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oracleGenerate = void 0;
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const google_auth_library_1 = require("google-auth-library");
(0, v2_1.setGlobalOptions)({ region: "us-central1" });
exports.oracleGenerate = (0, https_1.onCall)({
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (req) => {
    if (!req.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    }
    const prompt = req.data?.prompt;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 2) {
        throw new https_1.HttpsError("invalid-argument", "Missing prompt.");
    }
    const projectId = process.env.GCLOUD_PROJECT;
    if (!projectId) {
        throw new https_1.HttpsError("failed-precondition", "Missing GCLOUD_PROJECT.");
    }
    const location = process.env.VERTEX_LOCATION ?? "us-central1";
    const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash-002";
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
    const auth = new google_auth_library_1.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse?.token;
    if (!accessToken) {
        throw new https_1.HttpsError("internal", "Failed to obtain access token.");
    }
    const body = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 160,
        },
    };
    const resp = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new https_1.HttpsError("internal", `Vertex AI error ${resp.status}: ${text.slice(0, 500)}`);
    }
    const json = (await resp.json());
    const out = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ??
        "The void is silent today.";
    return { text: out };
});
