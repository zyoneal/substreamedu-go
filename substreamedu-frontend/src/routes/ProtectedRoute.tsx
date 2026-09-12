import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../store/AuthContext';
import { UserRole } from '../constants/roles';

interface ProtectedRouteProps {
    requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole }) => {
    const { isLoggedIn, authorities } = useContext(AuthContext);

    if (!isLoggedIn) {
        return <Navigate to="/" replace />;
    }

    if (requiredRole && !authorities.includes(requiredRole)) {
        console.warn(`Access denied. Required role: ${requiredRole}. User roles: ${authorities}`);
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
