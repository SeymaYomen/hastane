export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          user_id: string
          doctor_id: string
          date: string
          time: string
          status: string
          notes: string | null
          price: number
          is_first_visit: boolean
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          doctor_id: string
          date: string
          time: string
          status?: string
          notes?: string | null
          price: number
          is_first_visit?: boolean
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          doctor_id?: string
          date?: string
          time?: string
          status?: string
          notes?: string | null
          price?: number
          is_first_visit?: boolean
          rating?: number | null
          created_at?: string
        }
      }
      doctors: {
        Row: {
          id: string
          full_name: string
          department: string
          title: string
          experience_years: number
          education: string
          languages: string[]
          specialties: string[]
          working_days: string[]
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          department: string
          title: string
          experience_years: number
          education: string
          languages: string[]
          specialties: string[]
          working_days: string[]
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          department?: string
          title?: string
          experience_years?: number
          education?: string
          languages?: string[]
          specialties?: string[]
          working_days?: string[]
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          tckn: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          phone?: string | null
          tckn: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          tckn?: string
          created_at?: string
        }
      }
    }
  }
}