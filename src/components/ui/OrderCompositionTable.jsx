// Таблица с составом товаров заказа

import React, { useState, useEffect, useCallback, useRef } from "react";

// Импорт компонентов
import OrderCompositionTableRow from './OrderCompositionTableRow'; // Строка таблицы с товаром из заказа

// Импорт стилей
import './../../styles/ui/orderCompositionTable.css'

const OrderCompositionTable = ({
    data = [],
    columns = ['select', 'Наименование', 'Категория', 'Цена', 'Количество', 'Сумма'], // Фиксированные колонки
    onSelectionChange,
    onRowClick,
    onDataChange,
    tableId
}) => {

    /* 
    ===============================
    Состояния, константы и ссылки
    ===============================
    */

    const [selectedRows, setSelectedRows] = useState([]);
    const [columnWidths, setColumnWidths] = useState({});
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartX, setDragStartX] = useState(0);
    const [draggedColumn, setDraggedColumn] = useState(null);
    const tableRef = useRef(null);


    // const columns = ['select', 'Наименование', 'Категория', 'Цена', 'Количество', 'Сумма'];

    /* 
    ===========================
    Обработчики событий
    ===========================
    */

    // Обработчики изменения данных
    const handleDataChange = useCallback((updatedRow, rowIndex) => {
        const newData = [...data];
        newData[rowIndex] = updatedRow;
        onDataChange?.(newData);
    }, [data, onDataChange]);

    // Обработчки выделения всех строк
    const handleSelectAll = (e) => {
        const newSelected = e.target.checked ?
            new Set(data.map((item, index) => index)) : // Если есть выеделение, то отмечаем все элементы в таблице
            new Set(); // Если нет выделения, то обнуляем все выделения в таблице
        setSelectedRows(newSelected); // Сохраняем результат в переменную
        onSelectionChange?.(Array.from(newSelected)); // Передаем массив выбранных объектов
    };

    // Обработчки выделения строки
    const handleRowSelect = useCallback((index) => {
        setSelectedRows(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    }, []);

    // Сохранение ширин
    const saveWidths = useCallback((widths) => {
        localStorage.setItem(`cartTableWidths_${tableId}`, JSON.stringify(widths));
    }, [tableId]);

    // Начало перетаскивания колонки (изменения размера)
    const startResize = (column, e) => {
        setIsDragging(true); // Устанавливаем состояние перетаскивания 
        setDragStartX(e.clientX); // Сохраняем начальную позицию курсора мыши по оси X
        setDraggedColumn(column); // Сохраняем информацию о том, какой столбец мы перетаскиваем
        document.body.style.userSelect = 'none'; // Блокируем выделение текста пользователем
    };

    // Обработка изменения размера
    const doResize = useCallback((e) => {
        if (!isDragging || !draggedColumn) return; // Если нет состояия перетаскивания или не выбран столбец, то выходим из функции

        const delta = e.clientX - dragStartX; // Получаем разницу между начальным состоянием столбца (до перетаскивания) и текущей позицией столбца (после перетаскивания)
        const newWidths = { // Устанавливаем новую ширину стобца
            ...columnWidths, // Копируем все свойства из предыдущего состояния в новый объект
            [draggedColumn]: Math.max(50, (columnWidths[draggedColumn] || 100) + delta) // Не менее 50 едениц ширина, если нет данных о ширине для столбца, то она равна 100 + delta
        };

        setColumnWidths(newWidths); // Обновляем ширину для столбца
        setDragStartX(e.clientX); // Обновляем начальную позицию курсора по оси X
        saveWidths(newWidths); // Сохраняем данные о ширине столбца в localStorage
    }, [isDragging, dragStartX, draggedColumn, columnWidths, saveWidths]);

    // Завершение перетаскивания
    const stopResize = useCallback(() => {
        setIsDragging(false); // Устанавливаем состояние отсутствия перетаскивания
        document.body.style.userSelect = ''; // Убираем блокировку выделение текста пользователем
    }, []);

    /* 
    ===========================
     Эффекты
    ===========================
    */

    // Загрузка сохраненных ширин
    useEffect(() => {
        const savedWidths = localStorage.getItem(`cartTableWidths_${tableId}`);
        if (savedWidths) {
            setColumnWidths(JSON.parse(savedWidths));
        }
    }, [tableId]);

    // Обработчики событий мыши
    useEffect(() => {
        document.addEventListener('mousemove', doResize); // Добавляем обработчик. Перемещение мышью
        document.addEventListener('mouseup', stopResize); // Добавляем обработчик. Отпускание клавиши мыши
        return () => {
            document.removeEventListener('mousemove', doResize); // Удаляем обработчик. Перемещение мышью
            document.removeEventListener('mouseup', stopResize); // Удаляем обработчик. Отпускание клавиши мыши
        };
    }, [doResize, stopResize]);

    /* 
    ===========================
     Рендер
    ===========================
    */

    return (
        <div className="shopping-cart-table-container" ref={tableRef}>
            <table className="shopping-cart-table">
                <thead>
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={column}
                                style={{
                                    width: column === 'select' ? '40px' : columnWidths[column],
                                    position: 'relative'
                                }}
                            >
                                {column === 'select' ? (
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.size === data.length}
                                        onChange={handleSelectAll}
                                        className="shopping-cart-table-checkbox"
                                    />
                                ) : (
                                    column
                                )}
                                {index !== 0 && (
                                    <div
                                        className="shopping-cart-table-resizer"
                                        onMouseDown={(e) => startResize(column, e)}
                                    />
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.map((row, rowIndex) => (
                        <OrderCompositionTableRow
                            key={rowIndex}
                            row={row}
                            rowIndex={rowIndex}
                            columns={columns}
                            columnWidths={columnWidths}
                            selectedRows={selectedRows}
                            onDataChange={handleDataChange}
                            onSelectionChange={handleRowSelect}
                            onRowClick={onRowClick}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default OrderCompositionTable;