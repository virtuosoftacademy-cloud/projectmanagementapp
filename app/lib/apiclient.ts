const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_BASE_URL;
    }

    async request(endpoint: string, options: RequestInit = {}): Promise<any> {
        const url = `${this.baseUrl}${endpoint}`;
        const config: RequestInit = {
            headers: {
                "Content-Type": "application/json",
                ...options.headers,
            },
            credentials: "include", // Include cookies for authentication
            ...options,
        }
        const response = await fetch(url, config);
        if (response.status === 401) return null
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: "An error occurred" }));
            throw new Error(error.error || "An error occurred");
        }
        return response.json();
    }

    //Auth Methods
    async Register(userData: unknown) {
        // console.log(userData)
        return this.request("/register", {
            method: "POST",
            body: JSON.stringify(userData),
        })
    }

    async Login(email: string, password: string) {
        console.log(email, password)
        return this.request("/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        })
    }

    async Logout() {
        return this.request("/logout", {
            method: "POST"
        })
    }

    async GetCurrentUser() {
        return this.request("/profile")
    }

    //User Methods
    async GetUsers() {
        return this.request("/user")
    }

    async UpdateUserRole(userId: string, role: string) {
        return this.request(`/user/${userId}/role`, {
            method: "PATCH",
            body: JSON.stringify({ role })
        })
    }

    async AssignUserToTeam(userId: string, teamId: string | null) {
        return this.request(`/user/${userId}/team`, {
            method: "PATCH",
            body: JSON.stringify({ teamId })
        })
    }

}

export const apiClient = new ApiClient();