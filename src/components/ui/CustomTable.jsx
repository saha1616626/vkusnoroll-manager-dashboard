// Компонент кастомной таблицы

import React, { useState, useEffect, useCallback, useRef } from "react";

// Импорт стилей
import './../../styles/ui/customTable.css'

const CustomTable = ({
    columns: originalColumns,
    data,
    onSelectionChange,
    onRowClick,
    tableId,
    centeredColumns = [] // Cписок центрируемых колонок
}) => {
    const [selectedRows, setSelectedRows] = useState(new Set()); // selectedRows - Текущее состояние выбранных строк. setSelectedRows - Позволяет изменять текущее состояние выбранных строк. Set - позволяем хранить уникальные значения (автоматически исключает дубликаты)
    const [columnWidths, setColumnWidths] = useState({}); // Ширина столбцов
    const [isDragging, setIsDragging] = useState(false); // Состояние перетаскивания столбца
    const [dragStartX, setDragStartX] = useState(0); // Позиция курсора мыши по оси X
    const [draggedColumn, setDraggedColumn] = useState(null); // Какой столбец перетаскивают
    const tableRef = useRef(null); // Ссылка на таблицу

    // Дополнительная колонка для чекбоксов
    const columns = ['select', ...originalColumns];

    // Загрузка сохраненных ширин столбцов
    useEffect(() => {
        const savedWidths = localStorage.getItem(`tableWidths_${tableId}`); // Получаем данные таблицы по переданному идентификатору таблицы
        if (savedWidths) { // Если данные найдены
            setColumnWidths(JSON.parse(savedWidths)); // Устанавливаем полученные значения
        }
    }, [tableId]);

    // Сохранение ширины столбцов
    const saveWidths = useCallback((widths) => {
        localStorage.setItem(`tableWidths_${tableId}`, JSON.stringify(widths));
    }, [tableId]);

    /* 
===========================
Обработчики событий
===========================
*/

    // Обработчки выделения всех строк
    const handleSelectAll = (e) => {
        const newSelected = e.target.checked ?
            new Set(data.map((item, index) => index)) : // Если есть выеделение, то отмечаем все элементы в таблице
            new Set(); // Если нет выделения, то обнуляем все выделения в таблице
        setSelectedRows(newSelected); // Сохраняем результат в переменную
        onSelectionChange?.(Array.from(newSelected)); // Передаем массив выбранных объектов
    };

    // Обработчки выделения строки
    const handleRowSelect = (index) => {
        const newSelected = new Set(selectedRows); // Создаем новый экземпляр Set на основе существующего (выбранных строк)
        if (newSelected.has(index)) { // Если строка была ранее выбрана, зачит, мы ее удаляем из списка выбранных
            newSelected.delete(index);
        }
        else { // Если строка не была выбрана ранее, зачит, мы ее добавляем в список выбранных
            newSelected.add(index);
        }
        setSelectedRows(newSelected); // Обновляем состояние
        onSelectionChange?.(Array.from(newSelected));
    };

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

    // Обработчики событий мыши
    useEffect(() => {
        document.addEventListener('mousemove', doResize); // Добавляем обработчик. Перемещение мышью
        document.addEventListener('mouseup', stopResize); // Добавляем обработчик. Отпускание клавиши мыши
        return () => {
            document.removeEventListener('mousemove', doResize); // Удаляем обработчик. Перемещение мышью
            document.removeEventListener('mouseup', stopResize); // Удаляем обработчик. Отпускание клавиши мыши
        };
    }, [doResize, stopResize]);

    return (
        <div className="custom-table-container" ref={tableRef}>
            <table className="custom-table">
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
                                        style={{ width: '17px', height: '17px' }}
                                    />
                                ) : (
                                    column
                                )}
                                {index !== 0 && (
                                    <div
                                        className="custom-table-column-resizer"
                                        onMouseDown={(e) => startResize(column, e)}
                                    />
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            onClick={() => onRowClick?.(row)}
                            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                        >
                            {columns.map((column) => (
                                <td
                                    key={column}
                                    style={{
                                        width: column === 'select' ? '40px' : columnWidths[column],
                                        textAlign: centeredColumns.includes(column) ? 'center' : 'left'
                                    }}
                                    // Останавливаем всплытие события onRowClick для всей ячейки с чекбоксом
                                    onClick={(e) => column === 'select' && e.stopPropagation()}
                                >
                                    {column === 'select' ? (
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.has(rowIndex)}
                                            onChange={(e) => {
                                                e.stopPropagation(); // Останавливаем всплытие события onRowClick
                                                handleRowSelect(rowIndex);
                                            }}
                                            style={{ width: '17px', height: '17px' }}
                                        />
                                    ) : (
                                        <div className="custom-table-cell-content"
                                            // Показывает полный текст при наведении
                                            title={String(row[column])}>
                                            {row[column]}
                                        </div>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>

            </table>
        </div>
    );
};

export default CustomTable;