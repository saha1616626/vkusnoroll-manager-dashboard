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
    const formatDisplayValue = useCallback(() => { // useCallback для мемоизации функции
        if (selectedValues.length === 0) return ''; // Если нет выбранных элементов
        const joined = selectedValues.join(', ');
        return joined.length > 28 ? joined.slice(0, 25) + '...' : joined;
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

    const handleSelect = (option) => {
        if (!selectedValues.includes(option)) {
            onChange([...selectedValues, option]);
        }
        inputRef.current.focus(); // После выбора элемента фокус остается на списке, список не закрывается
    };

    // Автоматическая фильтрация списка при вводе без учета регистра
    const filteredOptions = options
        .filter(option =>
            !selectedValues.includes(option) &&
            option.toLowerCase().includes(inputValue.toLowerCase())
        );

    return (
        <div className="multi-select" ref={wrapperRef}>

            <input
                ref={inputRef}
                type="text"
                value={isOpen ? inputValue : displayValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleInputFocus}
                placeholder={
                    selectedValues.length === 0 
                        ? [placeholder] // Отображаем в placeholder заранее созданное сообщение, если нет выбранных объектов
                        : displayValue || 'Выберите элементы'
                }
                className="filter-input"
            />

            {isOpen && (
                <div className="multi-select-element-container">
                    <div className="selected-values">
                        {selectedValues.map(value => (
                            <span className="selected-item" key={value}>
                                {value}
                                <button
                                    onClick={() => onChange(selectedValues.filter(v => v !== value))}
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
                                {filteredOptions.map((option, index) => (
                                    <div
                                        key={index}
                                        className="multi-dropdown-item"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelect(option)}
                                    >
                                        {option}
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
