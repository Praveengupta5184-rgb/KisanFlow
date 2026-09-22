import React from 'react';
import FarmerSidebar from './FarmerSidebar';
import FarmerBottomNav from './FarmerBottomNav';

/**
 * FarmerLayout — wraps all farmer protected pages.
 *
 * Mobile  (< 1024px):  [Navbar] + [page content (farmer-layout)] + [FarmerBottomNav]
 * Desktop (≥ 1024px):  [Navbar] + [FarmerSidebar | page content (farmer-layout)]
 *
 * CSS classes `farmer-sidebar` and `farmer-bottom-nav` handle visibility via media queries.
 */
const FarmerLayout = ({ children }) => {
  return (
    <div className="farmer-app-wrapper">
      {/* Desktop sidebar — hidden on mobile via CSS */}
      <FarmerSidebar />

      {/* Page content — takes remaining width */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>

      {/* Mobile bottom navigation — hidden on desktop via CSS */}
      <FarmerBottomNav />
    </div>
  );
};

export default FarmerLayout;
