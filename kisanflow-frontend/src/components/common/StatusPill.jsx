import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Clock } from 'lucide-react';

const StatusPill = ({ status, waitMinutes, queueCount, text }) => {
  if (status === 'green') {
    return (
      <span className="badge badge-green">
        <CheckCircle2 size={14} />
        {text || `सुचारू (Smooth) • ${waitMinutes ? `${waitMinutes} min wait` : 'Fast Track'}`}
      </span>
    );
  }

  if (status === 'yellow') {
    return (
      <span className="badge badge-yellow">
        <AlertTriangle size={14} />
        {text || `मध्यम भीड़ (Moderate) • ${waitMinutes ? `${waitMinutes} min wait` : ''}`}
      </span>
    );
  }

  return (
    <span className="badge badge-red animate-pulse-warning">
      <AlertOctagon size={14} />
      {text || `भारी जाम (High Delay) • ${waitMinutes ? `${waitMinutes} min wait` : ''}`}
    </span>
  );
};

export default StatusPill;
