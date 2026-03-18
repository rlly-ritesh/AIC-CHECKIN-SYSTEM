import React from 'react';

const StatCard = ({ number, label, id }) => {
  return (
    <div className="stat-card">
      <div className="stat-number" id={id}>
        {number}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

export default StatCard;
