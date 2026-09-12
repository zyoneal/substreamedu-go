import { axiosService } from "./AxiosService";
import { urls } from "../constants/urls";

export interface User {
    id: string;
    email: string;
    isActive: boolean;
    isPremium: boolean;
    role: string;
    translationCount: number;
    createdAt: string;
}

export interface UserOverview {
    wordCount: number;
    resourceCount: number;
}

export interface UserMediaStats {
    subtitleCount: number;
}

export interface PaginatedUsers {
    users: User[];
    total: number;
}

const AdminService = {
    async getUsers(
        limit: number = 20,
        offset: number = 0,
        query: string = "",
        isPremium?: boolean,
        sortBy: string = "created_at",
        sortOrder: string = "DESC"
    ): Promise<PaginatedUsers> {
        const params: any = { limit, offset, query, sortBy, sortOrder };
        if (isPremium !== undefined) {
            params.isPremium = isPremium;
        }

        const response = await axiosService.get(urls.admin.users, { params });
        return response.data;
    },

    async updateUser(userId: string, data: { isPremium?: boolean; isActive?: boolean; role?: string }): Promise<User> {
        const response = await axiosService.patch(`${urls.admin.users}/${userId}`, data);
        return response.data;
    },

    async getUserOverview(userId: string): Promise<UserOverview> {
        const response = await axiosService.get(urls.admin.userOverview(userId));
        return response.data;
    },

    async getUserMediaStats(userId: string): Promise<UserMediaStats> {
        const response = await axiosService.get(urls.admin.userMediaStats(userId));
        return response.data;
    },

    async getTopUsersByWords(limit: number = 10): Promise<{ userId: string, wordCount: number }[]> {
        const response = await axiosService.get(`api/dictionary/admin/users/top-words`, {
            params: { limit }
        });
        return response.data;
    },

    async getUserById(userId: string): Promise<User> {
        const response = await axiosService.get(`api/users/${userId}`);
        return response.data as User;
    }
};

export default AdminService;
