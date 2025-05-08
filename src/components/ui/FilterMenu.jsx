// Меню фильтра

import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import FilterMultiSelect from './FilterMultiSelect';
import FilterSelect from './FilterSelect';

// Импорт стилей
import './../../styles/ui/filterMenu.css'

const FilterMenu = ({
    isOpen,
    filters,
    formData,
    onFormUpdate,
    onSearch,
    onReset
}) => {

    // Инициализация полей дат (со временем)
    const initialDateValues = {
        start: formData.date?.start || '',
        end: formData.date?.end || ''
    };

    // Инициализация для диапазона дат (без времени)
    const initialSimpleDateValues = {
        start: formData.simpleDate?.start || '',
        end: formData.simpleDate?.end || ''
    };

    // Функция обработки изменения значения в поле
    const handleChange = (e) => {
        const { name, value } = e.target; // Деструктуризация для доступа к имени и значению элемента
        onFormUpdate(name, value);
    };

    // Обработка изменений в полях дат
    const handleDateChange = (e, type) => {
        let value = e.target.value;

        // Автоматически выставляем время если не указано
        if (value && !value.includes('T')) {
            if (type === 'start') {
                value += 'T00:00';
            } else {
                value += 'T23:59';
            }
        }

        // Сохраняем в формате { date: { start, end } }
        const newDate = {
            ...formData.date,
            [type]: value
        };

        onFormUpdate('date', newDate);
    }

    // Обработка для дат без времени
    const handleSimpleDateChange = (e, type) => {
        const value = e.target.value;
        const newDate = {
            ...formData.simpleDate,
            [type]: value
        };
        onFormUpdate('simpleDate', newDate);
    }

    const handleBlur = (e, options) => {
        const { name, value } = e.target;
        if (options.length > 0 && !options.includes(value)) {
            onFormUpdate(name, '');
        }
    };

    // Функция обработки изменения значения в поле MultiSelect
    const handleMultiSelectChange = (selectedValues, name) => {
        onFormUpdate(name, selectedValues); // Передаем и обновляем выбранные данные
    };

    const handleLocalSearch = (e) => {
        onSearch(formData);
    }

    const handleLocalReset = () => {
        onReset();
    };

    // Sort
    const [openSortIndex, setOpenSortIndex] = useState(null); // Отображение меню для режима "sort"
    const sortRef = useRef(null); // Ссылка на контейнер меню

    const getSortLabel = (filter, value) => {
        const mainOption = filter.options.find(opt => opt.type === value.type);
        const subOption = mainOption.subOptions.find(opt => opt.value === value.order);
        return `${mainOption.label} (${subOption.label})`;
    };

    // Обработчик клика вне меню
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) {
                setOpenSortIndex(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* 
    ===========================
     Рендер
    ===========================
    */

    if (!isOpen) return null;

    return (
        <div className="filter-menu">
            <div className="filter-items">
                {filters.map((filter, index) => (
                    <div key={index} className="filter-item">
                        <label htmlFor={filter.name} className="filter-label">{filter.label}</label>

                        {filter.type === 'text' && (
                            <input
                                id={filter.name}
                                type="text"
                                placeholder={filter.placeholder || ''} // '' - для корректного сброса значений кнопкой "очистка"
                                name={filter.name}
                                value={formData[filter.name] || ''}
                                onChange={(e) => handleChange(e)}
                                onBlur={(e) => handleBlur(e, [])} // Пустой массив для обычного текстового поля
                                className="filter-input"
                            />
                        )}

                        {filter.type === 'number' && (
                            <input
                                id={filter.name}
                                type="number"
                                placeholder={filter.placeholder || ''} // '' - для корректного сброса значений кнопкой "очистка"
                                name={filter.name}
                                value={formData[filter.name] || ''}
                                onChange={(e) => handleChange(e)}
                                onBlur={(e) => handleBlur(e, [])} // Пустой массив для обычного числового поля
                                className="filter-input"
                            />
                        )}

                        {filter.type === 'date-range' && (
                            <div className="filter-input-date-container">
                                <input
                                    id={`${filter.name}_start`}
                                    type="datetime-local"
                                    name="date"
                                    value={initialDateValues.start || ''}
                                    onChange={(e) => handleDateChange(e, 'start')}
                                    className="filter-input-date"
                                />
                                -
                                <input
                                    id={`${filter.name}_start`}
                                    type="datetime-local"
                                    name="date"
                                    value={initialDateValues.end || ''}
                                    onChange={(e) => handleDateChange(e, 'end')}
                                    className="filter-input-date"
                                />
                            </div>
                        )}

                        {filter.type === 'date-range-no-time' && (
                            <div className="filter-input-date-container">
                                <input
                                    id={`${filter.name}_start_simple`}
                                    type="date"
                                    name="simpleDate"
                                    value={initialSimpleDateValues.start || ''}
                                    onChange={(e) => handleSimpleDateChange(e, 'start')}
                                    className="filter-input-date"
                                />
                                -
                                <input
                                    id={`${filter.name}_end_simple`}
                                    type="date"
                                    name="simpleDate"
                                    value={initialSimpleDateValues.end || ''}
                                    onChange={(e) => handleSimpleDateChange(e, 'end')}
                                    className="filter-input-date"
                                />
                            </div>
                        )}

                        {filter.type === 'select' && (
                            <FilterSelect
                                placeholder={filter.placeholder || 'Выберите значение'}
                                options={filter.options}
                                selectedValue={formData[filter.name] || ''}
                                onChange={(value) => handleChange({
                                    target: {
                                        name: filter.name,
                                        value: value
                                    }
                                })}
                            />
                        )}

                        {filter.type === 'multi-select' && (
                            <FilterMultiSelect
                                placeholder={filter.placeholder || ''}
                                options={filter.options}
                                selectedValues={formData[filter.name] || []}
                                onChange={(values) => handleMultiSelectChange(values, filter.name)}
                            />
                        )}

                        {/* Сортировка */}
                        {filter.type === 'sort' && (
                            <div className="sort-filter-container" ref={sortRef}>
                                <div className="sort-main-button"
                                    onClick={() => setOpenSortIndex(openSortIndex === index ? null : index)}>
                                    <span>{formData[filter.name]?.type ? `${getSortLabel(filter, formData[filter.name])}` : filter.label}</span>
                                    <svg
                                        className={`sort-chevron ${openSortIndex === index ? 'open' : ''}`}
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"
                                        />
                                    </svg>
                                </div>

                                {openSortIndex === index && (
                                    <div className="sort-dropdown-menu">
                                        {filter.options.map((sortOption, idx) => (
                                            <div key={idx} className="sort-option">
                                                <label className="sort-type-label">
                                                    <input
                                                        type="radio"
                                                        name={`${filter.name}_type`}
                                                        value={sortOption.type}
                                                        checked={formData[filter.name]?.type === sortOption.type}
                                                        onChange={(e) => {
                                                            handleChange({
                                                                target: {
                                                                    name: filter.name,
                                                                    value: {
                                                                        type: e.target.value,
                                                                        order: sortOption.subOptions[0].value
                                                                    }
                                                                }
                                                            });
                                                            setOpenSortIndex(index); // Оставляем меню открытым
                                                        }}
                                                    />
                                                    {sortOption.label}
                                                </label>

                                                {formData[filter.name]?.type === sortOption.type && (
                                                    <div className="sort-sub-options">
                                                        {sortOption.subOptions.map((subOpt, subIdx) => (
                                                            <label key={subIdx} className="sort-order-label">
                                                                <input
                                                                    type="radio"
                                                                    name={`${filter.name}_order`}
                                                                    value={subOpt.value}
                                                                    checked={formData[filter.name]?.order === subOpt.value}
                                                                    onChange={(e) => handleChange({
                                                                        target: {
                                                                            name: filter.name,
                                                                            value: {
                                                                                ...formData[filter.name],
                                                                                order: e.target.value
                                                                            }
                                                                        }
                                                                    })}
                                                                />
                                                                {subOpt.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                ))}
            </div>

            <div className="filter-actions">
                <button className="button-control filter-button-action-search" onClick={handleLocalSearch}>
                    Поиск
                </button>
                <button className="button-control filter-button-action-clearing" onClick={handleLocalReset}>
                    Очистка
                </button>
            </div>
        </div>
    );
};

FilterMenu.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    filters: PropTypes.arrayOf(
        PropTypes.shape({
            type: PropTypes.oneOf(['text', 'number', 'date-range', 'date-range-no-time', 'select', 'multi-select', 'sort']).isRequired,
            name: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            placeholder: PropTypes.string,
            options: PropTypes.oneOfType([
                PropTypes.arrayOf(PropTypes.string),
                PropTypes.arrayOf(
                    PropTypes.shape({
                        type: PropTypes.string.isRequired,
                        label: PropTypes.string.isRequired,
                        subOptions: PropTypes.arrayOf(
                            PropTypes.shape({
                                value: PropTypes.string.isRequired,
                                label: PropTypes.string.isRequired
                            })
                        ).isRequired
                    })
                )
            ])
        })
    ).isRequired,
    formData: PropTypes.object.isRequired,
    onFormUpdate: PropTypes.func.isRequired,
    onSearch: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired
};

export default FilterMenu;