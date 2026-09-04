/**
 * Generated from the live database schema. Do not hand-edit.
 * Regenerate after any migration (Supabase MCP `generate_typescript_types`,
 * or `npx supabase gen types typescript --project-id yhirpgneziptdgrdfjzb`).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          pinned: boolean;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          pinned?: boolean;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          pinned?: boolean;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: number;
          meta: Json;
          target_id: string | null;
          target_table: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          meta?: Json;
          target_id?: string | null;
          target_table: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          id?: never;
          meta?: Json;
          target_id?: string | null;
          target_table?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          banner_url: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          registration_deadline: string | null;
          start_date: string | null;
          status: Database["public"]["Enums"]["event_status"];
          team_max: number;
          team_min: number;
          title: string;
          tracks: string[];
          type: Database["public"]["Enums"]["event_type"];
          updated_at: string;
        };
        Insert: {
          banner_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          registration_deadline?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          team_max?: number;
          team_min?: number;
          title: string;
          tracks?: string[];
          type: Database["public"]["Enums"]["event_type"];
          updated_at?: string;
        };
        Update: {
          banner_url?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          registration_deadline?: string | null;
          start_date?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          team_max?: number;
          team_min?: number;
          title?: string;
          tracks?: string[];
          type?: Database["public"]["Enums"]["event_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      join_requests: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          message: string | null;
          requester_id: string;
          status: Database["public"]["Enums"]["request_status"];
          team_id: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          message?: string | null;
          requester_id: string;
          status?: Database["public"]["Enums"]["request_status"];
          team_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          message?: string | null;
          requester_id?: string;
          status?: Database["public"]["Enums"]["request_status"];
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "join_requests_decided_by_fkey";
            columns: ["decided_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "join_requests_requester_id_fkey";
            columns: ["requester_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "join_requests_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      member_skills: {
        Row: {
          created_at: string;
          member_id: string;
          proficiency: Database["public"]["Enums"]["proficiency"];
          skill_id: string;
        };
        Insert: {
          created_at?: string;
          member_id: string;
          proficiency?: Database["public"]["Enums"]["proficiency"];
          skill_id: string;
        };
        Update: {
          created_at?: string;
          member_id?: string;
          proficiency?: Database["public"]["Enums"]["proficiency"];
          skill_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_skills_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_skills_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          admin_role: Database["public"]["Enums"]["admin_role"] | null;
          bio: string | null;
          birth_date: string | null;
          branch: string | null;
          created_at: string;
          department: string | null;
          designation: string | null;
          email: string;
          full_name: string;
          github_url: string | null;
          id: string;
          is_profile_complete: boolean | null;
          linkedin_url: string | null;
          open_to_invites: boolean;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["profile_status"];
          updated_at: string;
          year: number | null;
        };
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null;
          bio?: string | null;
          birth_date?: string | null;
          branch?: string | null;
          created_at?: string;
          department?: string | null;
          designation?: string | null;
          email: string;
          full_name: string;
          github_url?: string | null;
          id: string;
          is_profile_complete?: never;
          linkedin_url?: string | null;
          open_to_invites?: boolean;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
          year?: number | null;
        };
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null;
          bio?: string | null;
          birth_date?: string | null;
          branch?: string | null;
          created_at?: string;
          department?: string | null;
          designation?: string | null;
          email?: string;
          full_name?: string;
          github_url?: string | null;
          id?: string;
          is_profile_complete?: never;
          linkedin_url?: string | null;
          open_to_invites?: boolean;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["profile_status"];
          updated_at?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      skills: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          id: string;
          is_active: boolean;
          is_custom: boolean;
          merged_into_id: string | null;
          name: string;
          slug: string | null;
        };
        Insert: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          is_custom?: boolean;
          merged_into_id?: string | null;
          name: string;
          slug?: never;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_active?: boolean;
          is_custom?: boolean;
          merged_into_id?: string | null;
          name?: string;
          slug?: never;
        };
        Relationships: [
          {
            foreignKeyName: "skills_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "skills_merged_into_id_fkey";
            columns: ["merged_into_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
        ];
      };
      team_guests: {
        Row: {
          added_by: string | null;
          created_at: string;
          full_name: string;
          id: string;
          team_id: string;
        };
        Insert: {
          added_by?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          team_id: string;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_guests_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_guests_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          event_id: string;
          event_type: Database["public"]["Enums"]["event_type"];
          joined_at: string;
          member_id: string;
          team_id: string;
        };
        Insert: {
          event_id?: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          joined_at?: string;
          member_id: string;
          team_id: string;
        };
        Update: {
          event_id?: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          joined_at?: string;
          member_id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_team_id_event_id_event_type_fkey";
            columns: ["team_id", "event_id", "event_type"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id", "event_id", "event_type"];
          },
        ];
      };
      team_required_skills: {
        Row: { skill_id: string; team_id: string };
        Insert: { skill_id: string; team_id: string };
        Update: { skill_id?: string; team_id?: string };
        Relationships: [
          {
            foreignKeyName: "team_required_skills_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_required_skills_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          created_at: string;
          description: string | null;
          event_id: string;
          event_type: Database["public"]["Enums"]["event_type"];
          id: string;
          lead_id: string;
          name: string;
          track: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          event_id: string;
          // Derived by the fill_team_event_type trigger — never send it.
          event_type?: Database["public"]["Enums"]["event_type"];
          id?: string;
          lead_id: string;
          name: string;
          track?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          event_id?: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          id?: string;
          lead_id?: string;
          name?: string;
          track?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_event_id_event_type_fkey";
            columns: ["event_id", "event_type"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id", "type"];
          },
          {
            foreignKeyName: "teams_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      event_is_visible: { Args: { p_event_id: string }; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      is_approved: { Args: never; Returns: boolean };
      is_staff: { Args: never; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
      leads_team: { Args: { p_team_id: string }; Returns: boolean };
      merge_skills: { Args: { source_id: string; target_id: string }; Returns: undefined };
      respond_to_join_request: {
        Args: { approve: boolean; request_id: string };
        Returns: undefined;
      };
      team_size: { Args: { p_team_id: string }; Returns: number };
      upcoming_birthdays: {
        Args: { days_ahead?: number };
        Returns: {
          id: string;
          full_name: string;
          department: string | null;
          designation: string | null;
          branch: string | null;
          birth_date: string;
          days_away: number;
        }[];
      };
    };
    Enums: {
      admin_role: "super_admin" | "admin" | "moderator";
      event_status: "draft" | "open" | "closed";
      event_type: "hackathon" | "project";
      proficiency: "beginner" | "intermediate" | "advanced";
      profile_status: "pending" | "approved" | "rejected" | "needs_info";
      request_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DefaultSchema = Database["public"];

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never;

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never;

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never;

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T];

export type Profile = Tables<"profiles">;
export type Skill = Tables<"skills">;
export type Event = Tables<"events">;
export type Team = Tables<"teams">;
export type JoinRequest = Tables<"join_requests">;
export type TeamGuest = Tables<"team_guests">;
export type Announcement = Tables<"announcements">;
