import React from 'react';
import { User, ShieldCheck, MapPin, Briefcase } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';

const OfficerProfilePage = () => {
  const { officer } = useOfficer();

  if (!officer) {
    return (
      <div style={{ padding: '20px', color: '#64748b' }}>
        Loading officer profile...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <User size={32} color="#2563eb" />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
          Officer Profile
        </h2>
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8' }}>
            <User size={40} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>
              {officer.username || 'Officer'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.9rem' }}>
              <ShieldCheck size={16} color="#16a34a" />
              Verified Authenticated Session
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
              Role
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, color: '#1e293b', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Briefcase size={18} color="#475569" />
              {officer.role || 'DISTRICT_OFFICER'}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
              Assigned Centre ID
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600, color: '#1e293b', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <MapPin size={18} color="#475569" />
              {officer.centreId || 'N/A'}
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
              Officer System ID
            </label>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#334155', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', wordBreak: 'break-all' }}>
              {officer.officerId || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerProfilePage;
