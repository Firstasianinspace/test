export type UserRole = 'manager' | 'executor';

export interface User {
  readonly id: string;
  readonly fullName: string;
  readonly role: UserRole;
}
