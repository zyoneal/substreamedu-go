import { createContext, Dispatch, SetStateAction } from 'react';

interface AuthContextType {
  isLoggedIn: boolean;
  setIsLoggedIn: Dispatch<SetStateAction<boolean>>;
  authorities: string[];
  setAuthorities: Dispatch<SetStateAction<string[]>>;
}

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  setIsLoggedIn: () => { },
  authorities: [],
  setAuthorities: () => { },
});