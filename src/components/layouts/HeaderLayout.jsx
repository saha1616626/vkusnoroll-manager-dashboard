// Компонент для отображения Header и его дочерних страниц

import React from "react";
import OrderNotificationBanner from "./../ui/OrderNotificationBanner";
import { Outlet } from "react-router-dom";

// Импорт компонентов
import Header from "../common/Header";

const HeaderLayout = () => {
    return (
        <div>
            <Header />
            {/* Уведомление */}
            <OrderNotificationBanner />
            <Outlet />
        </div>
    );
};

export default HeaderLayout;