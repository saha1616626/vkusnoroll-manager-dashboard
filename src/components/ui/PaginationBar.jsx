// Панель разбиения контента на страницы

import React from 'react';
import './../../styles/ui/paginationBar.css';

const PaginationBar = ({
    totalItems,
    currentPage,
    itemsPerPage,
    onPageChange
}) => {

    // Проверка на нулевые и некорректные значения
    const displayTotal = Math.max(0, Number(totalItems) || 0);
    const totalPages = Math.ceil(displayTotal / itemsPerPage);
    const startItem = Math.min(currentPage * itemsPerPage + 1, displayTotal); // Защита от превышения
    const endItem = Math.min((currentPage + 1) * itemsPerPage, displayTotal);

    return (
        <div className="pagination-bar-container">
            <div className="pagination-bar-counter">
                {displayTotal === 0 ? 'Нет данных' : `${startItem} — ${endItem} из ${displayTotal}`}
            </div>

            <div className="pagination-bar-controls">
                <button
                    className="pagination-bar-button pagination-bar-prev"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 0 || displayTotal === 0}
                    title={currentPage === 0 || displayTotal === 0 ? '' : 'Назад'}
                >
                </button>

                <button
                    className="pagination-bar-button pagination-bar-next"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage + 1 >= totalPages || displayTotal === 0}
                    title={currentPage + 1 >= totalPages || displayTotal === 0 ? '' : 'Вперед'}
                >
                </button>
            </div>
        </div>
    );
};

export default PaginationBar;