export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assignment_submissions: {
        Row: {
          assignment_id: string
          file_url: string | null
          grade: number | null
          id: string
          notes: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          file_url?: string | null
          grade?: number | null
          id?: string
          notes?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          file_url?: string | null
          grade?: number | null
          id?: string
          notes?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          session_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          session_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          session_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          id: string
          issued_at: string | null
          quizzes_passed: number | null
          sessions_completed: number | null
          student_id: string
          student_name: string
          subject_id: string
          subject_name: string
        }
        Insert: {
          certificate_number: string
          id?: string
          issued_at?: string | null
          quizzes_passed?: number | null
          sessions_completed?: number | null
          student_id: string
          student_name: string
          subject_id: string
          subject_name: string
        }
        Update: {
          certificate_number?: string
          id?: string
          issued_at?: string | null
          quizzes_passed?: number | null
          sessions_completed?: number | null
          student_id?: string
          student_name?: string
          subject_id?: string
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          session_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          session_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_id: string | null
          education_place: string | null
          full_name: string | null
          id: string
          is_profile_public: boolean | null
          points: number | null
          university_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_id?: string | null
          education_place?: string | null
          full_name?: string | null
          id?: string
          is_profile_public?: boolean | null
          points?: number | null
          university_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_id?: string | null
          education_place?: string | null
          full_name?: string | null
          id?: string
          is_profile_public?: boolean | null
          points?: number | null
          university_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option_id: string | null
        }
        Insert: {
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option_id?: string | null
        }
        Update: {
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string | null
          student_id: string
          total_points: number | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
          student_id: string
          total_points?: number | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          student_id?: string
          total_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean | null
          option_order: number | null
          option_text: string
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          option_order?: number | null
          option_text: string
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          option_order?: number | null
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          points: number | null
          question_order: number | null
          question_text: string
          quiz_id: string
        }
        Insert: {
          id?: string
          points?: number | null
          question_order?: number | null
          question_text: string
          quiz_id: string
        }
        Update: {
          id?: string
          points?: number | null
          question_order?: number | null
          question_text?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          passing_score: number | null
          subject_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          subject_id: string
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          passing_score?: number | null
          subject_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number | null
          session_id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          session_id: string
          student_id: string
          teacher_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          session_id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reminders: {
        Row: {
          created_at: string | null
          id: string
          reminder_type: string
          scheduled_for: string
          sent: boolean | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reminder_type: string
          scheduled_for: string
          sent?: boolean | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reminder_type?: string
          scheduled_for?: string
          sent?: boolean | null
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          id: string
          marked_at: string | null
          marked_by: string
          notes: string | null
          session_id: string
          status: string | null
          student_id: string
        }
        Insert: {
          id?: string
          marked_at?: string | null
          marked_by: string
          notes?: string | null
          session_id: string
          status?: string | null
          student_id: string
        }
        Update: {
          id?: string
          marked_at?: string | null
          marked_by?: string
          notes?: string | null
          session_id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_enrollments: {
        Row: {
          enrolled_at: string | null
          id: string
          session_id: string
          student_id: string
        }
        Insert: {
          enrolled_at?: string | null
          id?: string
          session_id: string
          student_id: string
        }
        Update: {
          enrolled_at?: string | null
          id?: string
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_enrollments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_free: boolean | null
          max_students: number | null
          price: number | null
          scheduled_at: string
          subject_id: string
          teacher_id: string
          title: string
          zoom_link: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          max_students?: number | null
          price?: number | null
          scheduled_at: string
          subject_id: string
          teacher_id: string
          title: string
          zoom_link?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free?: boolean | null
          max_students?: number | null
          price?: number | null
          scheduled_at?: string
          subject_id?: string
          teacher_id?: string
          title?: string
          zoom_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_posts: {
        Row: {
          content: string
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          post_type: string | null
          session_date: string | null
          session_link: string | null
          subject_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          post_type?: string | null
          session_date?: string | null
          session_link?: string | null
          subject_id: string
          teacher_id: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          post_type?: string | null
          session_date?: string | null
          session_link?: string | null
          subject_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_posts_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_prices: {
        Row: {
          created_at: string | null
          duration_type: string | null
          duration_value: number | null
          id: string
          is_free: boolean | null
          money_price: number | null
          points_price: number | null
          subject_id: string
        }
        Insert: {
          created_at?: string | null
          duration_type?: string | null
          duration_value?: number | null
          id?: string
          is_free?: boolean | null
          money_price?: number | null
          points_price?: number | null
          subject_id: string
        }
        Update: {
          created_at?: string | null
          duration_type?: string | null
          duration_value?: number | null
          id?: string
          is_free?: boolean | null
          money_price?: number | null
          points_price?: number | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_prices_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: true
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_subscriptions: {
        Row: {
          amount_paid: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          payment_type: string
          student_id: string
          subject_id: string
          subscribed_at: string | null
        }
        Insert: {
          amount_paid?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_type?: string
          student_id: string
          subject_id: string
          subscribed_at?: string | null
        }
        Update: {
          amount_paid?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          payment_type?: string
          student_id?: string
          subject_id?: string
          subscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_subscriptions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          objectives: string | null
          proposed_by: string | null
          status: string | null
          syllabus: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          objectives?: string | null
          proposed_by?: string | null
          status?: string | null
          syllabus?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          objectives?: string | null
          proposed_by?: string | null
          status?: string | null
          syllabus?: string | null
        }
        Relationships: []
      }
      teacher_applications: {
        Row: {
          created_at: string | null
          id: string
          proof_url: string
          status: string | null
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          proof_url: string
          status?: string | null
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          proof_url?: string
          status?: string | null
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_applications_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_earnings: {
        Row: {
          amount: number
          commission_rate: number | null
          created_at: string | null
          id: string
          net_amount: number
          session_id: string
          teacher_id: string
        }
        Insert: {
          amount: number
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          net_amount: number
          session_id: string
          teacher_id: string
        }
        Update: {
          amount?: number
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          net_amount?: number
          session_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_earnings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          student_id: string
          subject: string
          teacher_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          student_id: string
          subject: string
          teacher_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          student_id?: string
          subject?: string
          teacher_id?: string
          type?: string | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed: boolean | null
          created_at: string | null
          due_date: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      universities: {
        Row: {
          created_at: string | null
          email_domain: string
          id: string
          is_active: boolean | null
          name: string
          require_email_verification: boolean | null
        }
        Insert: {
          created_at?: string | null
          email_domain: string
          id?: string
          is_active?: boolean | null
          name: string
          require_email_verification?: boolean | null
        }
        Update: {
          created_at?: string | null
          email_domain?: string
          id?: string
          is_active?: boolean | null
          name?: string
          require_email_verification?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          id: string
          payment_details: string | null
          payment_method: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string | null
          status: string | null
          teacher_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          id?: string
          payment_details?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string | null
          teacher_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          id?: string
          payment_details?: string | null
          payment_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string | null
          status?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student"],
    },
  },
} as const
