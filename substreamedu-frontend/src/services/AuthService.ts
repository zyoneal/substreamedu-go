import { axiosService } from "./AxiosService";
import { urls } from "../constants/urls";
import { constants } from "../constants/constants";



const AuthService = {

    async login(email: string): Promise<string> {
        try {
            const axiosResponse = await axiosService.post(urls.auth.login, { email });
            
            return axiosResponse?.data || email;
        } catch (error: any) {
            
            const errorMessage = error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Failed to send code. Please try again.';
            throw new Error(errorMessage);
        }
    },

    async verify(email: string, otp: string): Promise<boolean> {
        const response = await axiosService.post(urls.auth.verify, { email, otp });

        const { userId, token, email: userEmail, role } = response.data

        if (userId) {
            this.setUserId(userId);
        }
        if (userEmail) {
            this.setUserEmail(userEmail);
        }
        if (token) {
            localStorage.setItem("jwt", token);
        }
        if (role) {
            this.setAuthoritiesList([role]);
        }
        localStorage.setItem(constants.isLoggedIn, "true");
        return true;
    },

    setUserId(userId: string): void {
        return localStorage.setItem(constants.userId, userId);
    },

    getUserId(): string | null {
        const userId = localStorage.getItem(constants.userId);
        if (userId && userId !== "undefined" && userId !== "null") {
            return userId;
        }
        
        let guestUserId = localStorage.getItem("guestUserId");
        if (!guestUserId) {
            guestUserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
            localStorage.setItem("guestUserId", guestUserId);
        }
        return guestUserId;
    },

    setUserEmail(userEmail: string): void {
        return localStorage.setItem(constants.userEmail, userEmail);
    },

    getUserEmail(): string | null {
        return localStorage.getItem(constants.userEmail);
    },

    getToken(): string | null {
        return localStorage.getItem("jwt");
    },

    setAuthoritiesList(authoritiesList: string[]): void {
        localStorage.setItem(constants.authoritiesList, JSON.stringify(authoritiesList));
    },

    getAuthoritiesList(): string[] | null {
        const authoritiesList = localStorage.getItem(constants.authoritiesList);
        return authoritiesList ? JSON.parse(authoritiesList) : null;
    },

    async logout(): Promise<void> {
        try {
            this.clearUser();
        } catch (error) {
            console.error("Error during logout:", error);
        }
    },

    clearUser(): void {
        localStorage.removeItem(constants.authoritiesList);
        localStorage.removeItem(constants.userId);
        localStorage.removeItem(constants.userEmail);
        localStorage.removeItem("jwt");
        localStorage.setItem(constants.isLoggedIn, "false");
    }
};

export { AuthService };