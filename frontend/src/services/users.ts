import { apiCall } from "./api";

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

class UsersService {
  private readonly baseUrl = "/users";
  
  async getCurrentUser() {
    return apiCall(`${this.baseUrl}/profile`, { method: "GET" });
  }
}

export const usersService = new UsersService();
export default usersService;
