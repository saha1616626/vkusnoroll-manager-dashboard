// Частный маршрут. Контент доступен после авторизации

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

// Контекс
import { useAuth } from "./../../contexts/AuthContext"; // Контекст авторизации

const PrivateRoute = () => {

    const { isAuthenticated } = useAuth(); // Состояния из контекста авторизации
    const location = useLocation();

    return isAuthenticated 
        ? <Outlet /> // Рендерим вложенные маршруты
        : <Navigate to="/login" state={{ from: location }} replace />;

};

export default PrivateRoute;