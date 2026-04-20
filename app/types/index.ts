

export enum Role {
    ADMIN = "ADMIN",
    MANAGER = "MANAGER",
    USER = "USER",
    GUEST = "GUEST"
}

export interface User {
    id: string;
    name: string;
    avatar:string;
    email: string;
    role: Role;
    teamId?: string;
    team?: Team;
    monthlyHours?: number | null;
    hourlyRate?: number | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Team {
    id: string;
    name: string;
    description?: string | null;
    code: string;
    members: User[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Credentials {
    name: string;
    password: string;
}

export interface AuthContextType {
    user: User | null;
    login: (formdata: FormData )=>void;
    logout: () => void;
    hasPermission: (requiredRole: Role) => boolean;
}

