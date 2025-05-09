// Поле для выбора нескольких значений из списка

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Импорт стилей
import './../../styles/ui/filterMultiSelect.css'

const FilterMultiSelect = ({ placeholder, options, selectedValues, onChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false); // Управляет видимостью выпадающего списка
    const [displayValue, setDisplayValue] = useState('');
    // useRef для отслеживания кликов вне компонента
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Форматирование отображаемого значения в placeholder поля
    const formatDisplayValue = useCallback(() => {
        if (selectedValues.length === 0) return '';

        // Извлекаем имена из объектов
        const names = selectedValues.map(item => item.name);
        const joined = names.join(', ');

        return joined.length > 28
            ? `${joined.slice(0, 25)}...`
            : joined;
    }, [selectedValues]);

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

    const handleInputFocus = () => {
        setIsOpen(true);
        setInputValue('');
    };

    // Проверка наличия элемента в выбранных значениях
    const isSelected = (id) =>
        selectedValues.some(item => item.id === id);

    // Обработчик выбора/снятия элемента
    const handleSelect = (option) => {
        if (isSelected(option.id)) {
            onChange(selectedValues.filter(item => item.id !== option.id));
        } else {
            onChange([...selectedValues, option]);
        }
    };

    // Фильтрация опций
    const filteredOptions = options.filter(option =>
        !isSelected(option.id) &&
        option.name.toLowerCase().includes(inputValue.toLowerCase())
    );

    return (
        <div className="multi-select" ref={wrapperRef}>

            <input
                ref={inputRef}
                type="text"
                value={isOpen ? inputValue : displayValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleInputFocus}
                placeholder={displayValue || placeholder}
                className="filter-input"
            />

            {isOpen && (
                <div className="multi-select-element-container">
                    <div className="selected-values">
                        {selectedValues.map((item) => (
                            <span className="selected-item" key={item.id}>
                                {item.name}
                                <button
                                    onClick={() => handleSelect(item)}
                                    className="remove-item"
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>

                    {filteredOptions.length > 0 && (
                        <>
                            <hr className="multi-select-divider" /> {/* Разделительная линия */}

                            <div className="dropdown-multi-select">
                                {filteredOptions.map((option) => (
                                    <div
                                        key={option.id}
                                        className="multi-dropdown-item"
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option.name}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

        </div>
    );
};

export default FilterMultiSelect;
