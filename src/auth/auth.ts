export type GuestSession = {
  id: string;
  mode: "guest";
};

export interface AuthProvider {
  createGuestSession(): Promise<GuestSession>;
}

export class LocalDemoAuthProvider implements AuthProvider {
  async createGuestSession(): Promise<GuestSession> {
    return { id: crypto.randomUUID(), mode: "guest" };
  }
}

export const authProvider: AuthProvider = new LocalDemoAuthProvider();