export interface DriveRound {
  round_id: number;
  round_name: string;
  round_order: number;
  description?: string;
}

export interface RoundStatus {
  round_id: number;
  round_name: string;
  round_order: number;
  status: 'PENDING' | 'CLEARED' | 'REJECTED' | 'ABSENT' | 'NOT_REACHED';
  remarks?: string | null;
}

export interface Applicant {
  application_id: number;
  student_name: string;
  roll_number: string;
  email: string;
  prn?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  program_name?: string | null;
  program_batch?: string | null;
  sicsr_program_name?: string | null;
  college_email?: string | null;
  personal_email?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  whatsapp_link?: string | null;
  linkedin_profile_url?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  std_x_percentage?: number | null;
  std_x_cgpa?: number | null;
  std_xii_percentage?: number | null;
  std_xii_cgpa?: number | null;
  ug_course_name?: string | null;
  ug_specialization?: string | null;
  ug_university?: string | null;
  ug_percentage?: number | null;
  ug_cgpa?: number | null;
  ug_year?: number | string | null;
  educational_background?: string | null;
  sicsr_specialization?: string | null;
  sem1_gpa?: number | null;
  sem2_gpa?: number | null;
  sem3_gpa?: number | null;
  cgpa?: number | null;
  backlog?: boolean | number | null;
  interested_job_roles?: string | null;
  work_experience?: boolean | number | null;
  total_work_experience?: number | null;
  last_company_name?: string | null;
  last_company_industry?: string | null;
  applied_cv_slot?: number | null;
  applied_cv_name?: string | null;
  applied_cv_link?: string | null;
  status: string;
  result: 'PENDING' | 'SELECTED' | 'REJECTED' | 'ABSENT';
  current_round_id: number | null;
  last_round_reached: number | null;
  rounds: RoundStatus[];
  selected?: boolean;
}
