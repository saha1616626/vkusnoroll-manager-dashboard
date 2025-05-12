import { useState, useEffect } from 'react';

// Позволяет задерживать срабатывание функции до тех пор, пока пользователь не прекратит ввод данных на определённый промежуток времени
export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Очистка таймера при изменении value или delay
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};
