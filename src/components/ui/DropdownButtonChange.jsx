import React, { useState, useRef, useEffect } from "react";

// Импорт стилей
import "./../../styles/ui/dropdownButtonChange.css";

// Импорт иконок

const DropdownButtonChange = ({ onDelete, onPaymentStatus, onOrderStatus }) => {
    const [isOpen, setIsOpen] = useState(false); // Состояние для управления закрытия/открытия списка
    const dropdownRef = useRef(null); // Ссылка на элемент выпадающего списка кнопки "Изменить". Для получения доступа к DOM-элементу и проверки, был ли клик вне него

    // Кнопка "изменить" с выпадающим списком функций
    const toggleDropdown = (option) => {
        setIsOpen(prev => !prev); // Переключение состояния
    };

    // Выбранная функция в раскрывающемся списке кнопки

    // Удаление
    const handleDeleteClick = () => {
        onDelete?.();
        setIsOpen(false); // Закрыть выпадающий список после выбора
    }

    // Изменить статус оплаты
    const handlePaymentStatus = () => {
        onPaymentStatus?.();
        setIsOpen(false);
    }

    // Изменить статус заказа
    const handleOrderStatus = () => {
        onOrderStatus?.();
        setIsOpen(false);
    }

    // Хук для обработки кликов вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) { // Если клик произошел вне элемента
                setIsOpen(false); // Закрыть выпадающий список
            }
        };

        // Обработчик события клика
        document.addEventListener('mousedown', handleClickOutside);

        // Удаление обработчика при размонтировании компонента
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };

    }, []);

    return (
        <div className="dropdown-button-change" ref={dropdownRef}>
            <button className="button-control dropdown-button" onClick={toggleDropdown}>
                Изменить
            </button>
            {isOpen && (
                <div className="dropdown-button-change-menu">
                    <div className="dropdown-button-change-option" onClick={handleDeleteClick}>
                        Удалить
                    </div>
                    <div className="dropdown-button-change-option" onClick={handlePaymentStatus}>
                        Статус оплаты
                    </div>
                    <div className="dropdown-button-change-option" onClick={handleOrderStatus}>
                        Статус заказа
                    </div>
                </div>
            )}
        </div>
    );
};

export default DropdownButtonChange;