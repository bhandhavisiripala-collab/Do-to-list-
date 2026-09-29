export interface PlanStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  order: number;
}

export interface UserTask {
  id: string;
  userId: string;
  title: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  steps: PlanStep[];
}

export interface AuthUser {
  id: string;
  username: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface GeneratePlanResponse {
  steps: Array<{
    title: string;
    description: string;
  }>;
}
