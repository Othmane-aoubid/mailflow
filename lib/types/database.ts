export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EmailStatus = 'draft' | 'sent' | 'failed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          portfolio_url: string;
          linkedin_url: string;
          email_address: string;
          accent_color: string;
          text_color: string;
          font_family: string;
          signature_html: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          portfolio_url?: string;
          linkedin_url?: string;
          email_address?: string;
          accent_color?: string;
          text_color?: string;
          font_family?: string;
          signature_html?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          system_prompt: string;
          tone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          description?: string;
          system_prompt: string;
          tone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['templates']['Insert']>;
      };
      email_history: {
        Row: {
          id: string;
          user_id: string;
          recipient_email: string;
          recipient_name: string;
          subject: string;
          body_html: string;
          job_description: string;
          template_id: string | null;
          status: EmailStatus;
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          recipient_email?: string;
          recipient_name?: string;
          subject: string;
          body_html: string;
          job_description?: string;
          template_id?: string | null;
          status?: EmailStatus;
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['email_history']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { email_status: EmailStatus };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Template = Database['public']['Tables']['templates']['Row'];
export type EmailHistory = Database['public']['Tables']['email_history']['Row'];
