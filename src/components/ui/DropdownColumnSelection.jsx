import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

// Импорт стилей
import "./../../styles/ui/dropdownColumnSelection.css";

// Импорт иконок
import resetIcon from './../../assets/icons/reset.png';

const DropdownColumnSelection = ({ options, title, defaultSelected, setSelectedColumns, pageId }) => {
    const [isOpen, setIsOpen] = useState(false); // Состояние для управления открытием/закрытием списка
    const [selectedOptions, setSelectedOptions] = useState(() => {
        // Загрузка выбранных столбцов из localStorage при инициализации состояния по ключу таблицы
        const savedOptions = localStorage.getItem(`selectedOptions_${pageId}`);
        return savedOptions ? JSON.parse(savedOptions) : defaultSelected || [];
    }); // Сохранение выбранных опций
    const dropdownRef = useRef(null); // Ссылка на элемент выпадающего списка

    // Устанавливаем выбранные столбцы в родительском компоненте
    useEffect(() => {
        if (setSelectedColumns) {
            setSelectedColumns(selectedOptions);
        }
    }, [selectedOptions, setSelectedColumns]);

    // Хук для обработки кликов вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false); // Закрыть выпадающий список
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [])

    // Обработчик клика по чекбоксу
    const handleCheckboxChange = (option) => {
        setSelectedOptions(prev => {
            const updatedOptions = prev.includes(option)
                ? prev.filter(item => item !== option) // Деактивация опции
                : [...prev, option]; // Активировать опцию

            // Сохранение обновленных опций в localStorage с учетом pageId
            localStorage.setItem(
                `selectedOptions_${pageId}`,
                JSON.stringify(updatedOptions)
            );
            return updatedOptions;
        });
    };

    // Обработчик установки значения по умолчанию
    const handleReset = () => {
        setSelectedOptions(defaultSelected); // Установить значения по умолчанию
        // Сбрасываем с учетом pageId
        localStorage.setItem(
            `selectedOptions_${pageId}`,
            JSON.stringify(defaultSelected)
        );
    };

    const toggleDropdown = () => {
        setIsOpen(prev => !prev); // Переключение состояния
    };

    return (
        <div className="dropdown-columns" ref={dropdownRef}>
            <button className="button-control" onClick={toggleDropdown}>
                {title}
            </button>
            {isOpen && (
                <div className="dropdown-menu-columns">

                    <h4 className="dropdown-header">Настроить колонки</h4>

                    <button className="reset-button-columns" onClick={handleReset}>
                        <img src={resetIcon} alt="Reset" className="icon-reset-button-columns" />
                        Значения по умолчанию
                    </button>

                    <hr className="divider" /> {/* Разделительная линия */}

                    {options.map(option => (
                        <label key={option} className="dropdown-option-columns">

                            <input
                                type="checkbox"
                                checked={selectedOptions.includes(option)}
                                onChange={() => handleCheckboxChange(option)}
                            />
                            {option}
                        </label>
                    ))}

                </div>
            )}
        </div>
    );
};

DropdownColumnSelection.propTypes = {
    options: PropTypes.arrayOf(PropTypes.string).isRequired, // Массив опций для чекбоксов
    title: PropTypes.string, // Заголовок для кнопки
    defaultSelected: PropTypes.arrayOf(PropTypes.string), // Массив опций по умолчанию
    setSelectedColumns: PropTypes.func.isRequired, // Функция для установки выбранных столбцов
    pageId: PropTypes.string.isRequired
};

export default DropdownColumnSelection;
