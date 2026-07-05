import { Type } from "@google/genai";
import { generateContentWithRetry } from "../lib/ai";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface ModerationSettings {
  sensitivity: 'low' | 'medium' | 'high';
  customRules: string[];
}

export const defaultSettings: ModerationSettings = {
  sensitivity: 'medium',
  customRules: [
    "No hate speech or harassment",
    "No explicit or adult content",
    "No spam or self-promotion"
  ]
};

export const getModerationSettings = async (): Promise<ModerationSettings> => {
  // Try local first for speed
  const stored = localStorage.getItem('moderation_settings');
  
  if (db) {
    try {
      const docRef = doc(db, 'platform', 'moderation');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as ModerationSettings;
        localStorage.setItem('moderation_settings', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Moderation settings fetch failed, using local fallback:", e);
    }
  }

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return defaultSettings;
    }
  }
  return defaultSettings;
};

export const saveModerationSettings = async (settings: ModerationSettings) => {
  localStorage.setItem('moderation_settings', JSON.stringify(settings));
  if (db) {
    try {
      const docRef = doc(db, 'platform', 'moderation');
      await setDoc(docRef, settings, { merge: true });
    } catch (e) {
      console.error("Failed to sync moderation settings to cloud:", e);
    }
  }
};

export interface ModerationResult {
  isApproved: boolean;
  reason?: string;
  flaggedCategories?: string[];
}

export const moderateContent = async (content: string, type: 'post' | 'comment' | 'profile'): Promise<ModerationResult> => {
  if (!content || content.trim() === '') {
    return { isApproved: true };
  }

  const settings = await getModerationSettings();
  
  const prompt = `
You are an AI content moderator for a community platform.
Evaluate the following ${type} content based on these rules:
Sensitivity Level: ${settings.sensitivity} (low = lenient, medium = balanced, high = strict)
Custom Rules:
${settings.customRules.map(r => "- " + r).join('\n')}

Content to evaluate:
"""
${content}
"""

Determine if the content should be approved or rejected.
If rejected, provide a brief reason and list the flagged categories.
`;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isApproved: {
              type: Type.BOOLEAN,
              description: "Whether the content is approved for posting."
            },
            reason: {
              type: Type.STRING,
              description: "Reason for rejection if not approved."
            },
            flaggedCategories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of categories the content violates."
            }
          },
          required: ["isApproved"]
        }
      }
    });

    const resultText = response.text;
    if (resultText) {
      return JSON.parse(resultText) as ModerationResult;
    }
    return { isApproved: true };
  } catch (error) {
    console.error("Moderation error:", error);
    return { isApproved: true, reason: "Moderation service unavailable" };
  }
};
