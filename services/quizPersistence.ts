import { supabase } from '../supabaseClient';
import { Quiz } from '../types';

type QuizInsertPayload = Omit<Quiz, 'id' | 'created_at'> & { user_id: string };

const MISSING_COLUMN = /Could not find the '([^']+)' column/i;

export const insertQuiz = async (payload: QuizInsertPayload) => {
  let currentPayload: Record<string, unknown> = { ...payload };

  while (true) {
    const { data, error } = await supabase.from('quizzes').insert(currentPayload).select().single();

    if (!error) {
      return data;
    }

    const message = error.message || '';
    const missingColumn = message.match(MISSING_COLUMN)?.[1];

    if (!missingColumn || !(missingColumn in currentPayload)) {
      throw error;
    }

    delete currentPayload[missingColumn];
  }
};
