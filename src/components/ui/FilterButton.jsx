// Кнопка для отображения фильтра

import React from 'react';
import PropTypes from 'prop-types';

// Импорт стилей
import './../../styles/ui/filterButton.css'

const FilterButton = ({ isActive, toggleFilter }) => {
    return (
        <button
          className={`button-control filter-button ${isActive ? 'active' : ''}`}
          onClick={toggleFilter}
        >
          Фильтрация
        </button>
      );
};

FilterButton.propTypes = {
    isActive: PropTypes.bool.isRequired,
    toggleFilter: PropTypes.func.isRequired,
  };
export default FilterButton;