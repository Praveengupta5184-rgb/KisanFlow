import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Ticket, Users, User, Bell } from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

const NAV_ITEMS = [
  { label: 'Home',    icon: Home,     path: '/farmer/discovery' },
  { label: 'Booking', icon: Calendar, path: '/farmer/slot-booking' },
  { label: 'Token',   icon: Ticket,   path: '/farmer/token-status' },
  { label: 'Queue',   icon: Users,    path: '/farmer/status-tracker' },
  { label: 'Profile', icon: User,     path: '/farmer/profile' },
];

const FarmerBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications } = useFarmer();
  const unreadCount = (notifications || []).filter((n) => n.unread).length;

  return (
    <nav className="farmer-bottom-nav" role="navigation" aria-label="Main navigation">
      {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
        const isActive = location.pathname === path ||
          (path === '/farmer/discovery' && location.pathname === '/farmer/dashboard');
        const isProfile = label === 'Profile';

        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 4px',
              color: isActive ? '#2e7d32' : '#94a3b8',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.7rem',
              position: 'relative',
              transition: 'color 0.15s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Active indicator line */}
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '20%',
                  right: '20%',
                  height: '3px',
                  background: '#2e7d32',
                  borderRadius: '0 0 4px 4px',
                }}
              />
            )}

            {/* Icon with notification badge on Profile */}
            <span style={{ position: 'relative', display: 'flex' }}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              {isProfile && unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-6px',
                    background: '#c62828',
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #fff',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>

            {/* Label */}
            <span style={{ lineHeight: 1.1 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default FarmerBottomNav;
