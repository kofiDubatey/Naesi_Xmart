
export type UserRole = 'student' | 'admin' | 'super-admin';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  title: string;
  bio: string;
  role: UserRole;
  points: number;
  is_suspended?: boolean;
  notification_settings?: NotificationSettings;
  quiz_settings?: QuizSettings;
  created_at?: string;
}

export interface QuizSettings {
  defaultQuestionCount: number;
  preferredDifficulty: 'standard' | 'challenging' | 'elite';
}

export interface NotificationSettings {
  deadlines: boolean;
  reminders: boolean;
  achievements: boolean;
  system: boolean;
  dailyDigest: boolean;
  digestTime: string;
  quietMode: boolean;
}

export interface Course {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  term: string;
  semester: number;
  academic_year: string;
  code: string;
  progress: number;
  image: string;
}

export interface Material {
  id: string;
  user_id?: string;
  course_id: string;
  title: string;
  type: 'pdf' | 'doc' | 'note';
  content: string; // Base64 or Text for AI analysis
  file_url?: string;
  summary?: string;
  date: string;
  bookmarked: boolean;
  reminder_time?: string;
  tags?: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category?: 'clinical' | 'dosage' | 'mechanism' | 'interaction';
}

export interface Quiz {
  id: string;
  user_id?: string;
  title: string;
  course_id: string;
  material_id?: string;
  questions: QuizQuestion[];
  deadline: string;
  completed: boolean;
  score?: number;
  notification_sent?: boolean;
  user_answers?: number[];
  current_index?: number;
  created_at?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'deadline' | 'reminder' | 'system' | 'achievement' | 'error';
  timestamp: Date;
}

export interface Message {
  id: string;
  group_id: string;
  sender_name: string;
  sender_id: string;
  text: string;
  timestamp: string;
  is_admin?: boolean;
}

export interface StudyGroup {
  id: string;
  name: string;
  members: number;
  admin_id: string;
  activeChallenge?: boolean;
}

export interface TemporalEvent {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time: string;
  description?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface SavedDiscussion {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  history: ChatMessage[];
  created_at?: string;
}

export interface StudyGuide {
  id: string;
  user_id: string;
  material_id: string;
  title: string;
  learning_path: string[];
  concept_breakdown: { term: string; explanation: string; significance: string }[];
  practice_questions: QuizQuestion[];
  clinical_scenarios: { scenario: string; resolution: string }[];
  created_at?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tags?: string[];
}
