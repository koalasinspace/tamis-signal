import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { GoogleAuth } from "google-auth-library";

setGlobalOptions({ region: "us-central1" });

type OracleGenerateInput = { 
  prompt?: string;
  requestType?: "dailyTruth" | "guidance"; // Optional: helps determine token limit
};

export const oracleGenerate = onCall(
  {
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req) => {
    // #region agent log
    console.log("[oracleGenerate] Function entry point reached");
    // #endregion
    
    try {
      // #region agent log
      console.log("[oracleGenerate] Function called", { 
        hasAuth: !!req.auth?.uid, 
        promptLength: (req.data as OracleGenerateInput)?.prompt?.length ?? 0,
        dataKeys: req.data ? Object.keys(req.data) : []
      });
      // #endregion
      
      if (!req.auth?.uid) {
        throw new HttpsError("unauthenticated", "Must be signed in.");
      }

      const prompt = (req.data as OracleGenerateInput)?.prompt;
      if (!prompt || typeof prompt !== "string" || prompt.trim().length < 2) {
        throw new HttpsError("invalid-argument", "Missing prompt.");
      }
      
      // Validate prompt length (Vertex AI has limits, prevent extremely long prompts)
      const trimmedPrompt = prompt.trim();
      if (trimmedPrompt.length > 100000) {
        throw new HttpsError("invalid-argument", "Prompt too long (max 100,000 characters).");
      }
      
      const requestType = (req.data as OracleGenerateInput)?.requestType;

      const projectId = process.env.GCLOUD_PROJECT;
      // #region agent log
      console.log("[oracleGenerate] Environment check", { 
        hasProjectId: !!projectId, 
        projectId: projectId ? projectId.substring(0, 10) + "..." : "undefined" 
      });
      // #endregion
      
      if (!projectId) {
        throw new HttpsError("failed-precondition", "Missing GCLOUD_PROJECT.");
      }

      const location = process.env.VERTEX_LOCATION ?? "us-central1";
      const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

      const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

      // #region agent log
      console.log("[oracleGenerate] Getting auth client", { url: url.substring(0, 80) + "..." });
      // #endregion
      
      let accessToken: string | null | undefined;
      try {
        const auth = new GoogleAuth({
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
      } catch (authError: any) {
        // #region agent log
        console.error("[oracleGenerate] Auth error", {
          errorMessage: authError?.message,
          errorCode: authError?.code,
          stack: authError?.stack?.substring(0, 300)
        });
        // #endregion
        throw new HttpsError("internal", `Failed to obtain access token: ${authError?.message ?? String(authError)}`);
      }
      
      if (!accessToken) {
        throw new HttpsError("internal", "Failed to obtain access token.");
      }

      // Determine token limit based on request type
      // Both Daily Truth and Guidance use 1024 tokens for longer, more detailed responses
      const maxOutputTokens = 1024;
      
      const body = {
        contents: [{ role: "user", parts: [{ text: trimmedPrompt }] }],
        generationConfig: {
          temperature: 0.9,
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
      
      let resp: Response;
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      } catch (fetchError: any) {
        // #region agent log
        console.error("[oracleGenerate] Fetch error", {
          errorMessage: fetchError?.message,
          errorCode: fetchError?.code,
          name: fetchError?.name
        });
        // #endregion
        throw new HttpsError("internal", `Failed to call Vertex AI: ${fetchError?.message ?? String(fetchError)}`);
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
        throw new HttpsError(
          "internal",
          `Vertex AI error ${resp.status}: ${text.slice(0, 500)}`
        );
      }

      const json = (await resp.json()) as any;
      // #region agent log
      console.log("[oracleGenerate] FULL API RESPONSE:", JSON.stringify(json, null, 2));
      console.log("[oracleGenerate] Parsing response", { 
        hasCandidates: !!json?.candidates, 
        candidatesLength: json?.candidates?.length ?? 0,
        finishReason: json?.candidates?.[0]?.finishReason,
        safetyRatings: json?.candidates?.[0]?.safetyRatings,
        usageMetadata: json?.usageMetadata
      });
      // #endregion
      
      const out =
        json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim?.() ??
        "The void is silent today.";

      // #region agent log
      console.log("[oracleGenerate] Success", { 
        outputLength: out.length,
        outputPreview: out.substring(0, 100) + "...",
        outputEnd: "..." + out.substring(out.length - 50)
      });
      // #endregion
      
      return { text: out };
    } catch (error: any) {
      // #region agent log
      console.error("[oracleGenerate] Error caught", { 
        errorMessage: error?.message, 
        errorCode: error?.code,
        stack: error?.stack?.substring(0, 200) 
      });
      // #endregion
      
      // Re-throw HttpsError as-is, wrap others
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `Unexpected error: ${error?.message ?? String(error)}`);
    }
  }
);

