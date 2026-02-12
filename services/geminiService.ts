import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, StudyGuide } from "../types";

/**
 * Robust API Key Discovery
 * Scans multiple potential locations where the key might be injected.
 */
const getApiKey = (): string => {
  try {
    // 1. Check process.env (Standard/Platform Injected)
    if (process.env.API_KEY) return process.env.API_KEY;
    
    // 2. Check window.process.env (Polyfilled)
    if ((window as any).process?.env?.API_KEY) return (window as any).process.env.API_KEY;
    
    // 3. Check import.meta.env (Vite/ESM Standard)
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.API_KEY) return metaEnv.API_KEY;
    if (metaEnv?.VITE_API_KEY) return metaEnv.VITE_API_KEY;

    // 4. Check for global platform injection
    if ((window as any).API_KEY) return (window as any).API_KEY;
    
  } catch (e) {}
  return '';
};

/**
 * Centralized AI Client Factory
 */
export const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: The project is missing the Gemini API environment variable. Please configure it in your platform settings.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Utility to wrap AI calls for consistent error handling and logging.
 */
const wrapAiCall = async <T>(fn: () => Promise<T>, fallback: T, name: string): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    console.error(`[AI Service] ${name} Failure:`, error);
    if (typeof fallback === 'string') {
      const msg = error.message || 'Unknown connection failure';
      if (msg.includes('API Key must be set')) {
        return `NEURAL_SYNC_ERROR: API_KEY is missing from environment. Verify your platform configuration.` as unknown as T;
      }
      return `NEURAL_SYNC_ERROR: ${msg}` as unknown as T;
    }
    return fallback;
  }
};

/**
 * Generates a professional pharmacy assessment grounded in specific curriculum materials.
 */
export const generateProfessionalPharmacyQuiz = async (
  courseName: string, 
  materials: string[], 
  count: number = 5, 
  difficulty: string = 'standard'
): Promise<QuizQuestion[]> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const context = materials.filter(m => m && m.trim().length > 0).join("\n\n---\n\n");
    
    if (!context || context.length < 50) {
      throw new Error("INSUFFICIENT_CONTEXT: Grounding materials are required for professional generation.");
    }

    const prompt = `As a Senior Pharmacy Professor, synthesize a professional pharmaceutical assessment for: "${courseName}".
    All questions MUST be derived from the CURRICULUM_CONTEXT.
    
    CURRICULUM_CONTEXT:
    ${context.substring(0, 15000)}

    Generate ${count} questions. 
    Mix Clinical Case Studies, Dosage Calculations, and Pharmacology MCQs.
    Difficulty: ${difficulty}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['clinical', 'dosage', 'mechanism', 'interaction'] }
            },
            required: ["question", "options", "correctAnswer", "explanation", "category"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  }, [], "Professional Pharmacy Quiz Generation");
};

/**
 * Deep Clinical Path Analysis
 */
export const analyzeClinicalPath = async (quizTitle: string, questions: QuizQuestion[], userAnswers: number[]): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const performanceContext = questions.map((q, i) => ({
      question: q.question,
      userAnswer: q.options[userAnswers[i]] || "No Answer",
      correctAnswer: q.options[q.correctAnswer],
      explanation: q.explanation,
      isCorrect: userAnswers[i] === q.correctAnswer
    }));

    const prompt = `As a Senior Pharmaceutical Consultant, perform a 'Clinical Path Analysis' for the student's performance on the assessment: "${quizTitle}".
    
    PERFORMANCE_LOG:
    ${JSON.stringify(performanceContext)}

    Structure the analysis as follows:
    1. Proficiency Summary
    2. Critical Learning Gaps
    3. Remediation Strategy
    4. Pro Tip
    
    Format in professional Markdown with clear headings.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text || "Analysis failed to manifest.";
  }, "Performance analytics sync failed.", "Clinical Path Analysis");
};

export const generateSummary = async (content: string, title: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a high-yield clinical summary for: ${title}. Base it strictly on this content: ${content.substring(0, 8000)}.`,
    });
    return response.text || "Synthesis failed.";
  }, "Synthesis failed.", "Summary Synthesis");
};

export const generateStudyGuide = async (content: string, title: string): Promise<any> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this pharmaceutical material: "${title}". Generate a comprehensive study guide.
      
      Content: ${content.substring(0, 15000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            learning_path: { type: Type.ARRAY, items: { type: Type.STRING } },
            concept_breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  significance: { type: Type.STRING }
                },
                required: ["term", "explanation", "significance"]
              }
            },
            practice_questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            },
            clinical_scenarios: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  scenario: { type: Type.STRING },
                  resolution: { type: Type.STRING }
                },
                required: ["scenario", "resolution"]
              }
            }
          },
          required: ["learning_path", "concept_breakdown", "practice_questions", "clinical_scenarios"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }, { learning_path: [], concept_breakdown: [], practice_questions: [], clinical_scenarios: [] }, "Study Guide Generation");
};

export const generateQuizFromGuide = async (guide: StudyGuide, count: number): Promise<QuizQuestion[]> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on this study guide: ${guide.title}, generate ${count} additional high-yield practice questions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
              category: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }, [], "Quiz from Guide Generation");
};

export const getFeedback = async (score: number, total: number, topics: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User scored ${score}/${total} on ${topics}. Provide a technical clinical feedback summary.`,
    });
    return response.text || "Sync complete.";
  }, "Performance data logged.", "Feedback Generation");
};

export const generateAvatar = async (prompt: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A futuristic professional pharmaceutical avatar: ${prompt}` }] },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return "https://api.dicebear.com/7.x/bottts/svg?seed=fallback";
  }, "https://api.dicebear.com/7.x/bottts/svg?seed=fallback", "Avatar Generation");
};