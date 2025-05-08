// Поле для выбора значения из списка

import React, { useState, useEffect, useRef, useCallback } from "react";

// Импорт стилей
import './../../styles/ui/filterSelect.css'

const FilterSelect = ({ placeholder, options, selectedValue, onChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false); // Управляет видимостью выпадающего списка
    const [displayValue, setDisplayValue] = useState('');
    // useRef для отслеживания кликов вне компонента
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Пустой вариант выборки в начало списка
    const allOptions = ['', ...options];

    // Форматирование отображаемого значения в placeholder поля
    const formatDisplayValue = useCallback(() => { // useCallback для мемоизации функции
        if (selectedValue.length === 0) return ''; // Если нет выбранных элементов
        return selectedValue.length > 28 ? selectedValue.slice(0, 25) + '...' : selectedValue;
    }, [selectedValue]);

    // Обновление displayValue (значения в placeholder) при изменении selectedValues
    useEffect(() => { // useEffect отслеживает изменения зависимостей
        setDisplayValue(formatDisplayValue());
    }, [formatDisplayValue]); // Следим за изменением selectedValues (выбранные значения)

    // Обработчик клика вне компонента
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside); // Запрет на немедленное закрытие при клике на элементы списка
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* 
===========================
Обработчики событий
===========================
*/

    // Открытие меню при нажатии на поле
    const handleInputFocus = () => {
        setIsOpen(true);
        setInputValue('');
    };

    // Выбор элемента из списка
    const handleSelect = (option) => {
        onChange(option); // Передаем выбранное значение
        setIsOpen(false); // Закрываем список
    };

    // Автоматическая фильтрация списка при вводе без учета регистра
    const filteredOptions = allOptions.filter(option => 
        option.toLowerCase().includes(inputValue.toLowerCase())
      );

    return (
        <div className="filter-select" ref={wrapperRef}>

            <input
                ref={inputRef}
                type="text"
                value={isOpen ? inputValue : displayValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleInputFocus}
                placeholder={
                    selectedValue.length === 0
                        ? [placeholder] // Отображаем в placeholder заранее созданное сообщение, если нет выбранных объектов
                        : displayValue || 'Выберите элемент'
                }
                className="filter-input"
                readOnly={isOpen} // Запрещаем ручной ввод
            />

            {isOpen && (
                <div className="filter-select-dropdown-container">
                    <div className="filter-select-dropdown">
                        {filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                className={`filter-select-dropdown-item ${
                                    option === selectedValue ? 'selected' : ''
                                  } ${
                                    option === '' ? 'filter-select-empty-option' : ''
                                  }`}
                                onClick={() => handleSelect(option)}
                            >
                                {option === '' ? 'Не выбрано' : option}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );

};

export default FilterSelect;