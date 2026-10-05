export interface UserProfile {
  id: string;
  username: string;
  teacherName: string;
  userName?: string;
  role: 'admin' | 'teacher' | 'user';
  token: string;
}
