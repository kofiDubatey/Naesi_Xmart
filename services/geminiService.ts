import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, StudyGuide } from "../types";

/**
 * Strictly uses process.env.API_KEY as per system requirements.
 */
const createAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const wrapAiCall = async <T>(fn: () => Promise<T>, fallback: T, name: string): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    console.error(`[AI Service] ${name} Failure:`, error);
    if (typeof fallback === 'string') {
      return `NEURAL_SYNC_ERROR: ${error.message || 'Connection Interrupted'}` as unknown as T;
    }
    return fallback;
  }
};

export const getAiClient = createAiClient;

export const generateProfessionalPharmacyQuiz = async (
  courseName: string, 
  materials: string[], 
  count: number = 5, 
  difficulty: string = 'standard'
): Promise<QuizQuestion[]> => {
  return wrapAiCall(async () => {
    const ai = createAiClient();
    const context = materials.filter(m => m && m.trim().length > 0).join("\n\n---\n\n");
    
    if (!context || context.length < 50) {
      throw new Error("INSUFFICIENT_CONTEXT: Grounding materials are required.");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `As a Senior Pharmacy Professor, synthesize a professional pharmaceutical assessment for: "${courseName}".
      All questions MUST be derived from the CURRICULUM_CONTEXT.
      
      CURRICULUM_CONTEXT:
      ${context.substring(0, 15000)}

      Generate ${count} questions. Mix Clinical Case Studies, Dosage Calculations, and Pharmacology MCQs.
      Difficulty: ${difficulty}.`,
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

export const analyzeClinicalPath = async (quizTitle: string, questions: QuizQuestion[], userAnswers: number[]): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = createAiClient();
    const performanceContext = questions.map((q, i) => ({
      question: q.question,
      userAnswer: q.options[userAnswers[i]] || "No Answer",
      correctAnswer: q.options[q.correctAnswer],
      explanation: q.explanation,
      isCorrect: userAnswers[i] === q.correctAnswer
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `As a Senior Clinical Preceptor, analyze this student's performance on "${quizTitle}".
      Provide a detailed clinical remediation report. Identify strengths, weaknesses in their reasoning, and specific pharmaceutical concepts to revisit.
      
      PERFORMANCE_DATA:
      ${JSON.stringify(performanceContext)}
      
      Structure with Markdown headers (###) and bullet points.`,
    });

    return response.text || "Analysis stream silent.";
  }, "NEURAL_SYNC_ERROR: Analysis synthesis failed.", "Clinical Path Analysis");
};

export const getFeedback = async (score: number, total: number, title: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide motivating and professional feedback for a pharmacy student who scored ${score}/${total} on "${title}". High-tech clinical tone.`,
    });
    return response.text || "Feedback synchronized.";
  }, "NEURAL_SYNC_ERROR: Feedback loop offline.", "Assessment Feedback");
};

export const generateSummary = async (content: string, title: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following pharmaceutical material: "${title}". 
      Focus on key therapeutic classes and clinical pearls.
      
      CONTENT:
      ${content.substring(0, 8000)}`,
    });
    return response.text || "Summary synthesized.";
  }, "NEURAL_SYNC_ERROR: Summary synthesis interrupted.", "Material Summary");
};

export const generateAvatar = async (prompt: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `A futuristic professional medical profile avatar: ${prompt}` }] }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    throw new Error("No image data found");
  }, "https://api.dicebear.com/7.x/bottts/svg?seed=fallback", "Avatar Generation");
};

export const generateStudyGuide = async (content: string, title: string): Promise<StudyGuide> => {
  return wrapAiCall(async () => {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Synthesize a study protocol (guide) based on: "${title}". 
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
                  explanation: { type: Type.STRING }
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
  }, {} as StudyGuide, "Study Guide Generation");
};

export const generateQuizFromGuide = async (guide: StudyGuide, count: number): Promise<QuizQuestion[]> => {
  return wrapAiCall(async () => {
    const ai = createAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on this study protocol: ${JSON.stringify(guide)}, generate ${count} additional practice questions.`,
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
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }, [], "Quiz from Guide Generation");
};