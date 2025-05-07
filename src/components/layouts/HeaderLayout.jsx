// Компонент для отображения Header и его дочерних страниц

import React from "react";
import { Outlet } from "react-router-dom";

// Импорт компонентов
import Header from "../common/Header";

const HeaderLayout = () => {
    return (
        <div>
            <Header />
            <Outlet />
        </div>
    );
};

export default HeaderLayout;