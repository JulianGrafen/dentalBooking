/**
 * Supabase database types.
 *
 * Mirrors supabase/migrations/*.sql. Once a Supabase project is linked,
 * regenerate with:
 *
 *   supabase gen types typescript --linked > types/database.ts
 *
 * The shape below matches the generator's output so the swap is a no-op
 * for consuming code.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      practices: {
        Row: {
          id: string;
          name: string;
          slug: string;
          public_key: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug?: string | null;
          public_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          public_key?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      practice_members: {
        Row: {
          practice_id: string;
          user_id: string;
          member_email: string;
          role: Database['public']['Enums']['practice_role'];
          created_at: string;
        };
        Insert: {
          practice_id: string;
          user_id: string;
          member_email: string;
          role?: Database['public']['Enums']['practice_role'];
          created_at?: string;
        };
        Update: {
          practice_id?: string;
          user_id?: string;
          member_email?: string;
          role?: Database['public']['Enums']['practice_role'];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_members_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
        ];
      };
      practice_invites: {
        Row: {
          id: string;
          practice_id: string;
          email: string;
          role: Database['public']['Enums']['practice_role'];
          token: string;
          invited_by: string;
          accepted_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          email: string;
          role?: Database['public']['Enums']['practice_role'];
          token?: string;
          invited_by: string;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          email?: string;
          role?: Database['public']['Enums']['practice_role'];
          token?: string;
          invited_by?: string;
          accepted_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_invites_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
        ];
      };
      practice_booking_treatments: {
        Row: {
          practice_id: string;
          slug: string;
          label: string;
          duration_minutes: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          practice_id: string;
          slug: string;
          label: string;
          duration_minutes: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          practice_id?: string;
          slug?: string;
          label?: string;
          duration_minutes?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_booking_treatments_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
        ];
      };
      patients: {
        Row: {
          id: string;
          practice_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          insurance_type: Database['public']['Enums']['insurance_type'];
          last_visit_date: string | null;
          is_waitlisted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          insurance_type: Database['public']['Enums']['insurance_type'];
          last_visit_date?: string | null;
          is_waitlisted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          insurance_type?: Database['public']['Enums']['insurance_type'];
          last_visit_date?: string | null;
          is_waitlisted?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patients_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
        ];
      };
      appointments: {
        Row: {
          id: string;
          practice_id: string;
          encrypted_payload: string;
          start_time: string;
          end_time: string;
          status: Database['public']['Enums']['appointment_status'];
          source: Database['public']['Enums']['appointment_source'];
          created_at: string;
        };
        Insert: {
          id?: string;
          practice_id: string;
          encrypted_payload: string;
          start_time: string;
          end_time: string;
          status?: Database['public']['Enums']['appointment_status'];
          source?: Database['public']['Enums']['appointment_source'];
          created_at?: string;
        };
        Update: {
          id?: string;
          practice_id?: string;
          encrypted_payload?: string;
          start_time?: string;
          end_time?: string;
          status?: Database['public']['Enums']['appointment_status'];
          source?: Database['public']['Enums']['appointment_source'];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'appointments_practice_id_fkey';
            columns: ['practice_id'];
            isOneToOne: false;
            referencedRelation: 'practices';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      accept_practice_invite: {
        Args: { invite_token: string };
        Returns: {
          practice_id: string;
          role: Database['public']['Enums']['practice_role'];
        }[];
      };
      create_practice_invite: {
        Args: { target_email: string };
        Returns: {
          token: string;
          expires_at: string;
        }[];
      };
      create_public_booking: {
        Args: {
          booking_slug: string;
          treatment_slug: string;
          encrypted_payload: string;
          requested_start_time: string;
          requested_end_time: string;
        };
        Returns: string;
      };
      get_public_booking_practice: {
        Args: { booking_slug: string };
        Returns: {
          name: string;
          public_key: string;
        }[];
      };
      get_public_booking_treatments: {
        Args: { booking_slug: string };
        Returns: {
          slug: string;
          label: string;
          duration_minutes: number;
        }[];
      };
      get_public_booking_availability: {
        Args: { booking_slug: string; booking_date: string };
        Returns: {
          start_time: string;
          end_time: string;
        }[];
      };
      is_practice_member: {
        Args: { target_practice_id: string; target_user_id?: string };
        Returns: boolean;
      };
      is_practice_owner: {
        Args: { target_practice_id: string; target_user_id?: string };
        Returns: boolean;
      };
    };
    Enums: {
      insurance_type: 'kasse' | 'privat';
      appointment_status: 'booked' | 'cancelled' | 'pending';
      appointment_source: 'manual' | 'online' | 'recall' | 'smart_fill';
      practice_role: 'owner' | 'calendar_manager';
    };
    CompositeTypes: Record<never, never>;
  };
};

// Convenience aliases — keep consuming code free of long index chains.
export type Practice = Database['public']['Tables']['practices']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'];
export type InsuranceType = Database['public']['Enums']['insurance_type'];
export type AppointmentStatus = Database['public']['Enums']['appointment_status'];
export type AppointmentSource = Database['public']['Enums']['appointment_source'];
export type PracticeRole = Database['public']['Enums']['practice_role'];
export type PracticeBookingTreatmentRow =
  Database['public']['Tables']['practice_booking_treatments']['Row'];
