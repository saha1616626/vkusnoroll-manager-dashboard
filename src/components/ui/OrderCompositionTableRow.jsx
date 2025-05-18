// Строка таблицы с товаром из заказа

import React, { useState, useEffect } from "react";

const OrderCompositionTableRow = ({
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

        setDisplayPrice(rawValue.startsWith(".") ? `0${rawValue}` : rawValue); // Сохраняем сырое значение
    };

    // Обработка количества
    const handleQuantityChange = (rawValue) => {
        if (rawValue === "") {
            setDisplayQuantity("");
            return;
        }

        setDisplayQuantity(rawValue);
    };

    // Обработка суммы
    const handleSumChange = (rawValue) => {
        if (rawValue === "") {
            setDisplaySum("");
            return;
        }

        setDisplaySum(rawValue.startsWith(".") ? `0${rawValue}` : rawValue);
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
                            // Поле блокируется, так как в приложении не предусмотрено отслеживание 
                            // установки цен определенным пользователем (нет истории операций), из-за чего 
                            // менеджер может оформлять заказ целенаправленно по заниженной цене.
                            disabled={true}
                            type="text"
                            value={displayPrice}
                            onChange={(e) => {
                                const value = e.target.value
                                    .replace(/[^0-9.]/g, '')
                                    .replace(/(\..*)\./g, '$1');
                                handlePriceChange(value);
                            }}
                            onBlur={() => {
                                const numericValue = parseFloat(displayPrice) || 0;
                                const updatedRow = {
                                    ...row,
                                    pricePerUnit: numericValue,
                                    sum: numericValue * (row.quantityOrder || 0)
                                };
                                onDataChange(updatedRow, rowIndex);

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
                            style={{
                                backgroundColor: (parseInt(displayQuantity, 10) === 0 ? '#ffe6e6' : 'white'),
                                borderColor: (parseInt(displayQuantity, 10) === 0 ? '#ff4d4d' : '#d9d9d9'),
                                outline: (parseInt(displayQuantity, 10) === 0 ? '1px solid  #ff4d4d' : '')
                            }}
                            onBlur={() => {
                                const numericValue = Math.max(0, parseInt(displayQuantity, 10) || 0);
                                const updatedRow = {
                                    ...row,
                                    quantityOrder: numericValue,
                                    sum: (row.pricePerUnit || 0) * numericValue
                                };
                                onDataChange(updatedRow, rowIndex);

                                if (displayQuantity === "") handleQuantityChange("0");
                            }}
                            className="shopping-cart-table-input"
                        />
                    ) : column === 'Сумма' ? (
                        <input
                            // Поле блокируется, так как в приложении не предусмотрено отслеживание 
                            // установки цен определенным пользователем (нет истории операций), из-за чего 
                            // менеджер может оформлять заказ целенаправленно по заниженной цене.
                            disabled={true}
                            type="text"
                            value={displaySum}
                            onChange={(e) => {
                                const value = e.target.value
                                    .replace(/[^0-9.]/g, '')
                                    .replace(/(\..*)\./g, '$1');
                                handleSumChange(value);
                            }}
                            onBlur={() => {
                                const numericValue = parseFloat(displaySum) || 0;
                                const newPrice = (row.quantityOrder && row.quantityOrder !== 0)
                                    ? numericValue / row.quantityOrder
                                    : 0; // Защита от деления на ноль
                                const updatedRow = {
                                    ...row,
                                    pricePerUnit: newPrice,
                                    sum: (row.quantityOrder === 0 || row.pricePerUnit === 0) ? 0
                                        // Устанавливаем не numericValue, а при повторном пересчете цена * кол-во, чтобы получить правильное округление.
                                        : (newPrice.toFixed(2) * row.quantityOrder)
                                };
                                onDataChange(updatedRow, rowIndex);

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