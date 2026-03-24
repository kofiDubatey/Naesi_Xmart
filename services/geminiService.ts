import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, StudyGuide } from "../types";

/**
 * AI Client Factory.
 * Resolves Gemini API key from Vite/runtime env in a deterministic order.
 */
const resolveGeminiApiKey = (): string => {
  // @ts-ignore
  const viteEnv = import.meta?.env as Record<string, string | undefined> | undefined;
  const apiKey = (
    viteEnv?.VITE_GEMINI_API_KEY ||
    viteEnv?.VITE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.includes('PLACEHOLDER')) {
    throw new Error('GEMINI_API_KEY_MISSING: Set VITE_GEMINI_API_KEY in .env.local and restart the dev server.');
  }

  return apiKey;
};

const createAiClient = () => {
  const apiKey = resolveGeminiApiKey();
  return new GoogleGenAI({ apiKey });
};

const PRO_MODEL = 'gemini-2.5-pro';
const FLASH_MODEL = 'gemini-2.5-flash';

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const splitIntoSentences = (text: string): string[] => {
  return text
    .replace(/\r/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(normalizeText)
    .filter(sentence => sentence.length > 35);
};

const extractKeywords = (text: string): string[] => {
  const stopWords = new Set([
    'about', 'after', 'before', 'being', 'could', 'should', 'would', 'their', 'there', 'these',
    'those', 'which', 'while', 'where', 'when', 'with', 'without', 'into', 'from', 'under',
    'pharmacy', 'student', 'clinical', 'course', 'module', 'assessment', 'question', 'patient'
  ]);

  const matches = text.toLowerCase().match(/\b[a-z][a-z-]{5,}\b/g) || [];
  const seen = new Set<string>();
  return matches.filter(word => {
    if (stopWords.has(word) || seen.has(word)) return false;
    seen.add(word);
    return true;
  });
};

const inferCategory = (text: string): QuizQuestion['category'] => {
  const lower = text.toLowerCase();
  if (/(dose|dosage|mg|ml|tablet|infusion|calculate)/.test(lower)) return 'dosage';
  if (/(interact|contraind|adverse|toxicity|warning)/.test(lower)) return 'interaction';
  if (/(receptor|mechanism|enzyme|pathway|agonist|antagonist)/.test(lower)) return 'mechanism';
  return 'clinical';
};

const buildFallbackQuestions = (courseName: string, materials: string[], count: number): QuizQuestion[] => {
  const context = normalizeText(materials.join(' '));
  const sentences = splitIntoSentences(context);
  const keywords = extractKeywords(context);

  if (sentences.length >= 4) {
    return Array.from({ length: count }, (_, index) => {
      const correctSentence = sentences[index % sentences.length];
      const distractors = sentences
        .filter((sentence, sentenceIndex) => sentenceIndex !== index && sentence !== correctSentence)
        .slice(0, 3);

      while (distractors.length < 3) {
        distractors.push(`A generalized statement about ${courseName} that is not grounded in the uploaded study material.`);
      }

      const keyword = keywords[index % Math.max(keywords.length, 1)] || courseName;
      const options = [correctSentence, ...distractors].slice(0, 4);

      return {
        question: `According to the study material, which statement is most accurate regarding ${keyword}?`,
        options,
        correctAnswer: 0,
        explanation: `This option is taken directly from the uploaded course material for ${courseName}.`,
        category: inferCategory(correctSentence)
      };
    });
  }
  throw new Error(`INSUFFICIENT_CONTEXT: ${courseName} does not have enough grounded material in its vault to generate a reliable assessment.`);
};

const buildCompatibilityFallbackQuestions = (courseName: string, materialHints: string[], count: number): QuizQuestion[] => {
  const hints = materialHints
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, 6);

  const hintText = hints.length > 0 ? hints.join(', ') : `${courseName} module materials`;
  const prompts = [
    `Which statement is most consistent with the available ${courseName} module references?`,
    `Which option best reflects the likely focus of the uploaded ${courseName} materials?`,
    `Which response is the safest pharmacy-oriented judgment based on the current ${courseName} module context?`,
    `Which option best aligns with the study direction suggested by the uploaded ${courseName} files?`,
    `Which answer best matches a reasonable evidence-based interpretation of the ${courseName} module materials?`
  ];

  return Array.from({ length: count }, (_, index) => ({
    question: prompts[index % prompts.length],
    options: [
      `Prioritize patient safety, indication review, dose verification, contraindication checks, and careful pharmacologic reasoning in ${courseName}.`,
      `Choose therapy without checking mechanism, interactions, or monitoring requirements.`,
      `Rely on assumption rather than reviewing the uploaded module references.`,
      `Ignore patient-specific factors if a treatment appears commonly used.`
    ],
    correctAnswer: 0,
    explanation: `This fallback item was generated from low-context module references (${hintText}) and preserves safe pharmacy reasoning until richer grounded text is available.`,
    category: 'clinical'
  }));
};

const wrapAiCall = async <T>(fn: (ai: GoogleGenAI) => Promise<T>, fallback: T, name: string): Promise<T> => {
  try {
    const ai = createAiClient();
    return await fn(ai);
  } catch (error: any) {
    console.error(`[AI Service] ${name} Failure:`, error);
    if (typeof fallback === 'string') {
      return `NEURAL_SYNC_ERROR: ${error.message || 'Connection Interrupted'}. Check terminal logs.` as unknown as T;
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
  const normalizedMaterials = materials.map(normalizeText).filter(Boolean);
  const groundedMaterials = normalizedMaterials.filter(m => m.length > 40);
  if (normalizedMaterials.length === 0) {
    throw new Error(`INSUFFICIENT_CONTEXT: Upload or save module materials for ${courseName} before generating an assessment.`);
  }

  let fallbackQuiz: QuizQuestion[];
  try {
    fallbackQuiz = groundedMaterials.length > 0
      ? buildFallbackQuestions(courseName, groundedMaterials, count)
      : buildCompatibilityFallbackQuestions(courseName, normalizedMaterials, count);
  } catch {
    fallbackQuiz = buildCompatibilityFallbackQuestions(courseName, normalizedMaterials, count);
  }

  if (groundedMaterials.length === 0) {
    return fallbackQuiz;
  }

  const aiQuiz = await wrapAiCall(async (ai) => {
    const context = groundedMaterials.join("\n\n---\n\n");

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
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

    const parsed = JSON.parse(response.text || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("QUIZ_GENERATION_EMPTY: The AI service returned no assessment items.");
    }
    return parsed;
  }, [], "Professional Pharmacy Quiz Generation");

  return aiQuiz.length > 0 ? aiQuiz : fallbackQuiz;
};

export const analyzeClinicalPath = async (quizTitle: string, questions: QuizQuestion[], userAnswers: number[]): Promise<string> => {
  return wrapAiCall(async (ai) => {
    const performanceContext = questions.map((q, i) => ({
      question: q.question,
      userAnswer: q.options[userAnswers[i]] || "No Answer",
      correctAnswer: q.options[q.correctAnswer],
      explanation: q.explanation,
      isCorrect: userAnswers[i] === q.correctAnswer
    }));

    const response = await ai.models.generateContent({
      model: PRO_MODEL,
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
  return wrapAiCall(async (ai) => {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: `Provide motivating and professional feedback for a pharmacy student who scored ${score}/${total} on "${title}". High-tech clinical tone.`,
    });
    return response.text || "Feedback synchronized.";
  }, "NEURAL_SYNC_ERROR: Feedback loop offline.", "Assessment Feedback");
};

export const generateSummary = async (content: string, title: string): Promise<string> => {
  return wrapAiCall(async (ai) => {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: `Summarize the following pharmaceutical material: "${title}". 
      Focus on key therapeutic classes and clinical pearls.
      
      CONTENT:
      ${content.substring(0, 8000)}`,
    });
    return response.text || "Summary synthesized.";
  }, "NEURAL_SYNC_ERROR: Summary synthesis interrupted.", "Material Summary");
};

export const generateAvatar = async (prompt: string): Promise<string> => {
  return wrapAiCall(async (ai) => {
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
  return wrapAiCall(async (ai) => {
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
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
    const parsed = JSON.parse(response.text || "{}");
    if (!parsed?.practice_questions?.length) {
      throw new Error("GUIDE_GENERATION_EMPTY: The AI service returned an incomplete study guide.");
    }
    return parsed;
  }, {} as StudyGuide, "Study Guide Generation");
};

export const generateQuizFromGuide = async (guide: StudyGuide, count: number): Promise<QuizQuestion[]> => {
  return wrapAiCall(async (ai) => {
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
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
    const parsed = JSON.parse(response.text || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("QUIZ_FROM_GUIDE_EMPTY: The AI service returned no practice questions.");
    }
    return parsed;
  }, [], "Quiz from Guide Generation");
};
