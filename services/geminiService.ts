import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, StudyGuide } from "../types";

/**
 * Centralized AI Client Factory.
 * Strictly uses process.env.API_KEY as per system requirements.
 */
export const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      return `NEURAL_SYNC_ERROR: ${error.message || 'Connection Interrupted'}` as unknown as T;
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
      throw new Error("INSUFFICIENT_CONTEXT: Grounding materials are required.");
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
// Fix: Completed truncated implementation and fixed type inconsistency
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

    const prompt = `As a Senior Clinical Preceptor, analyze this student's performance on "${quizTitle}".
    Provide a detailed clinical remediation report. Identify strengths, weaknesses in their reasoning, and specific pharmaceutical concepts to revisit.
    
    PERFORMANCE_DATA:
    ${JSON.stringify(performanceContext)}
    
    Structure with Markdown headers (###) and bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Analysis stream silent.";
  }, "NEURAL_SYNC_ERROR: Analysis synthesis failed.", "Clinical Path Analysis");
};

/**
 * Assessment Feedback Generation
 */
// Fix: Implemented missing getFeedback export
export const getFeedback = async (score: number, total: number, title: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const percentage = Math.round((score / total) * 100);
    const prompt = `Provide a short, motivating, and professional feedback message for a pharmacy student who scored ${score}/${total} (${percentage}%) on an assessment titled "${title}". Use a high-tech/cyberpunk clinical tone.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Feedback synchronized.";
  }, "NEURAL_SYNC_ERROR: Feedback loop offline.", "Assessment Feedback");
};

/**
 * Material Summary Synthesis
 */
// Fix: Implemented missing generateSummary export
export const generateSummary = async (content: string, title: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const prompt = `Summarize the following pharmaceutical material titled "${title}". 
    Focus on key therapeutic classes, mechanisms, and clinical pearls. 
    Keep it concise and structured.
    
    CONTENT:
    ${content.substring(0, 10000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Summary synthesized.";
  }, "NEURAL_SYNC_ERROR: Summary synthesis interrupted.", "Material Summary");
};

/**
 * AI Avatar Manifestation
 */
// Fix: Implemented missing generateAvatar export using gemini-2.5-flash-image
export const generateAvatar = async (prompt: string): Promise<string> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A futuristic, professional medical profile avatar: ${prompt}` }]
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in response");
  }, "https://api.dicebear.com/7.x/bottts/svg?seed=fallback", "Avatar Generation");
};

/**
 * Comprehensive Study Guide Synthesis
 */
// Fix: Implemented missing generateStudyGuide export
export const generateStudyGuide = async (content: string, title: string): Promise<StudyGuide> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const prompt = `Synthesize a comprehensive study protocol (guide) based on the following material: "${title}".
    
    MATERIAL_CONTENT:
    ${content.substring(0, 15000)}
    
    Return a JSON object with: learning_path, concept_breakdown, practice_questions, and clinical_scenarios.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
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

/**
 * Quiz Synthesis from Study Protocol
 */
// Fix: Implemented missing generateQuizFromGuide export
export const generateQuizFromGuide = async (guide: StudyGuide, count: number): Promise<QuizQuestion[]> => {
  return wrapAiCall(async () => {
    const ai = getAiClient();
    const prompt = `Based on the following study protocol, generate ${count} additional pharmaceutical assessment questions.
    
    PROTOCOL_CONTEXT:
    ${JSON.stringify(guide)}
    
    Return a JSON array of QuizQuestion objects.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
