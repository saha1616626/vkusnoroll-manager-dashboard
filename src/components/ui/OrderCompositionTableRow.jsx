// Строка таблицы с товаром из заказа

import React, { useState, useEffect } from "react";

const OrderCompositionTableRow = ({
    key,
    row,
    rowIndex,
    columns,
    columnWidths,
    selectedRows,
    onRowClick,
    onDataChange,
    onSelectionChange
}) => {

    /* 
    ===============================
    Состояния, константы и ссылки
    ===============================
    */

    // Локальные состояния для отображения
    const [displayPrice, setDisplayPrice] = useState(""); // Цена товара
    const [displaySum, setDisplaySum] = useState(""); // Сумма товара
    const [displayQuantity, setDisplayQuantity] = useState(""); // Кол-во товара

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Инициализация состояний при изменении row
    useEffect(() => {
        setDisplayPrice(row.pricePerUnit?.toFixed(2).replace(/\.00$/, "") || "");
        setDisplaySum(row.sum?.toFixed(2).replace(/\.00$/, "") || "");
        setDisplayQuantity(row.quantityOrder?.toString() || "");
    }, [row]);

    /* 
    ===========================
    Обработчики событий
    ===========================
    */

    // Обработка цены
    const handlePriceChange = (rawValue) => {
        // Разрешаем пустую строку и частичный ввод
        if (rawValue === "") {
            setDisplayPrice("");
            return;
        }
        // Автодобавление "0." при начале с точки
        const value = rawValue.startsWith(".") ? `0${rawValue}` : rawValue;
        const numericValue = parseFloat(value) || 0;
        const updatedRow = {
            ...row,
            pricePerUnit: numericValue,
            sum: numericValue * (row.quantityOrder || 0)
        };
        onDataChange(updatedRow, rowIndex);
        setDisplayPrice(rawValue); // Сохраняем сырое значение
    };

    // Обработка количества
    const handleQuantityChange = (rawValue) => {
        if (rawValue === "") {
            setDisplayQuantity("");
            return;
        }
        const numericValue = Math.max(0, parseInt(rawValue, 10) || 0);
        const updatedRow = {
            ...row,
            quantityOrder: numericValue,
            sum: (row.pricePerUnit || 0) * numericValue
        };
        onDataChange(updatedRow, rowIndex);
        setDisplayQuantity(rawValue);
    };

    // Обработка суммы
    const handleSumChange = (rawValue) => {
        if (rawValue === "") {
            setDisplaySum("");
            return;
        }
        const value = rawValue.startsWith(".") ? `0${rawValue}` : rawValue;
        const numericValue = parseFloat(value) || 0;
        const newPrice = (row.quantityOrder && row.quantityOrder !== 0)
            ? numericValue / row.quantityOrder
            : 0; // Защита от деления на ноль
        const updatedRow = {
            ...row,
            pricePerUnit: newPrice,
            sum: numericValue
        };
        onDataChange(updatedRow, rowIndex);
        setDisplaySum(rawValue);
    };

    // Нажатие на строку
    const handleSelect = (e) => {
        e.stopPropagation();
        onSelectionChange(rowIndex);
    };

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <tr
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
        >
            {columns.map(column => (
                <td
                    key={column}
                    style={{
                        width: column === 'select' ? '40px' : columnWidths[column],
                        textAlign: ['Цена', 'Количество', 'Сумма'].includes(column)
                            ? 'right'
                            : 'left'
                    }}
                    onClick={(e) => column === 'select' && e.stopPropagation()}
                >
                    {column === 'select' ? (
                        <input
                            type="checkbox"
                            checked={selectedRows.includes(rowIndex)}
                            onChange={handleSelect}
                            className="shopping-cart-table-checkbox"
                        />
                    ) : column === 'Наименование' ? (
                        <div className="shopping-cart-table-cell">
                            {row.name}
                        </div>
                    ) : column === 'Категория' ? (
                        <div className="shopping-cart-table-cell">
                            {row.categoryName}
                        </div>
                    ) : column === 'Цена' ? (
                        <input
                            type="text"
                            value={displayPrice}
                            onChange={(e) => {
                                const value = e.target.value
                                    .replace(/[^0-9.]/g, '')
                                    .replace(/(\..*)\./g, '$1');
                                handlePriceChange(value);
                            }}
                            onBlur={() => {
                                let finalValue = parseFloat(displayPrice) || 0;
                                if (displayPrice === "" || displayPrice === ".") finalValue = 0; // Установка 0 при пустом поле
                                handlePriceChange(finalValue.toFixed(2));
                            }}
                            className="shopping-cart-table-input"
                        />
                    ) : column === 'Количество' ? (
                        <input
                            type="text"
                            value={displayQuantity}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                handleQuantityChange(value);
                            }}
                            onBlur={() => {
                                if (displayQuantity === "") handleQuantityChange("0");
                            }}
                            className="shopping-cart-table-input"
                        />
                    ) : column === 'Сумма' ? (
                        <input
                            type="text"
                            value={displaySum}
                            onChange={(e) => {
                                const value = e.target.value
                                    .replace(/[^0-9.]/g, '')
                                    .replace(/(\..*)\./g, '$1');
                                handleSumChange(value);
                            }}
                            onBlur={() => {
                                let finalValue = parseFloat(displaySum) || 0;
                                if (displaySum === "" || displaySum === ".") finalValue = 0;
                                handleSumChange(finalValue.toFixed(2));
                            }}
                            className="shopping-cart-table-input"
                        />
                    ) : (
                        <div className="shopping-cart-table-cell">
                            {row[column]}
                        </div>
                    )}
                </td>
            ))}
        </tr>
    );
};

export default OrderCompositionTableRow;