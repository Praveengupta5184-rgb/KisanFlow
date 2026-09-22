import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const portalLoginPath = {
  FARMER: '/farmer/login',
  OFFICER: '/officer/login',
  TRADER: '/trader/login',
};

const isRoleAllowedByToken = (tokenRole, allowedRole) => {
  if (allowedRole === 'FARMER') {
    return tokenRole === 'FARMER';
  }
  if (allowedRole === 'TRADER') {
    return tokenRole === 'TRADER';
  }

  return ['OFFICER', 'DISTRICT_OFFICER', 'ADMIN'].includes(tokenRole);
};

const getJwtPayload = (token) => {
  try {
    const encodedPayload = token.split('.')[1];
    const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=');
    return JSON.parse(window.atob(paddedPayload));
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ allowedRole, children }) => {
  const location = useLocation();
  const token = window.localStorage.getItem('token');
  const role = window.localStorage.getItem('role');
  const loginPath = portalLoginPath[allowedRole] || '/officer/login';

  if (!token) {
    return React.createElement(Navigate, { to: loginPath, replace: true, state: { from: location } });
  }

  const jwtPayload = getJwtPayload(token);
  const isExpired = !jwtPayload?.exp || jwtPayload.exp * 1000 <= Date.now();

  if (isExpired || jwtPayload.type !== 'access' || !isRoleAllowedByToken(jwtPayload.role, allowedRole) || role !== allowedRole) {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('role');
    // Redirect to the correct login portal for the attempted role
    return React.createElement(Navigate, { to: loginPath, replace: true });
  }

  return children;
};

export default ProtectedRoute;
