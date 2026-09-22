import axios from 'axios';

const BASE_URL =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Services
export const farmerApi = {
  sendOtp: async (mobile) => {
    const response = await apiClient.post('/v1/auth/otp/send', { mobileNumber: mobile });
    return response.data;
  },
  verifyOtp: async (mobile, otp) => {
    return apiClient.post('/v1/auth/otp/verify', { mobileNumber: mobile, otp });
  },
  getFarmerProfile: async () => {
    const res = await apiClient.get('/v1/farmers/me');
    return res.data;
  },
  getNearbyCentres: async (lat, lng) => {
    const res = await apiClient.get('/v1/centres/nearby', { params: { lat, lng } });
    return res.data;
  },
  analyzeCropQuality: async (imageFormData) => {
    const res = await apiClient.post('/v1/ai/crop-pre-screen', imageFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  bookSlot: async (bookingPayload) => {
    const res = await apiClient.post('/v1/bookings', bookingPayload);
    return res.data;
  },
  getActiveBookings: async (farmerId) => {
    const res = await apiClient.get(`/v1/bookings/farmer/${farmerId}/active`);
    return res.data;
  },
  getLotByBooking: async (bookingId) => {
    try {
      const res = await apiClient.get(`/v1/auctions/lots/booking/${bookingId}`);
      return res.data;
    } catch (e) {
      if (e.response && e.response.status === 404) return null;
      throw e;
    }
  },
  getQueue: async (centreId) => {
    const res = await apiClient.get(`/v1/queue/centres/${centreId}`);
    return res.data;
  },
  getQueueStatus: async (bookingId) => {
    const res = await apiClient.get(`/v1/queue/bookings/${bookingId}/queue-status`);
    return res.data;
  },
  getWeatherAlerts: async (farmerId) => {
    const res = await apiClient.get(`/v1/bookings/farmer/${farmerId}/weather-alerts`);
    return res.data;
  },
  rescheduleWeatherBooking: async (bookingId) => {
    const res = await apiClient.post(`/v1/bookings/${bookingId}/weather/reschedule`);
    return res.data;
  },
  keepWeatherBooking: async (bookingId) => {
    const res = await apiClient.post(`/v1/bookings/${bookingId}/weather/keep`);
    return res.data;
  },
  cancelWeatherBooking: async (bookingId) => {
    const res = await apiClient.post(`/v1/bookings/${bookingId}/weather/cancel`);
    return res.data;
  },
  getCropPrices: async (centreId) => {
    const res = await apiClient.get(`/v1/centres/${centreId}/crop-prices`);
    return res.data;
  },
  sendVoiceQuery: async (queryText) => {
    const res = await apiClient.post('/v1/voice/query', { query: queryText });
    return res.data;
  },
  chatWithAi: async (queryText, language = 'en') => {
    const res = await apiClient.post('/v1/ai/chat', { query: queryText, language });
    return res.data;
  },
  getAiRecommendations: async (lat, lng) => {
    const res = await apiClient.post('/v1/ai/recommend-centres', { latitude: lat, longitude: lng });
    return res.data;
  },
  getBookingQr: async (bookingId) => {
    const res = await apiClient.get(`/v1/bookings/${bookingId}/qr`);
    return res.data;
  },
};

export const officerApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/v1/auth/login', credentials);
    return {
      ...response,
      data: {
        ...response.data,
        token: response.data.token || response.data.accessToken,
      },
    };
  },
  getOfficerProfile: async () => {
    const res = await apiClient.get('/v1/officer/me');
    return res.data;
  },
  getDistrictOverview: async () => {
    const res = await apiClient.get('/v1/officer/district-overview');
    return res.data;
  },
  runWhatIfSimulation: async (scenario) => {
    const scenarioMap = {
      DEMAND_SURGE: 'demandIncrease',
      MACHINE_FAILURE: 'equipmentFailure',
      WEATHER_SHUTDOWN: 'centreClosure',
      STAFF_UNAVAILABLE: 'staffUnavailable',
    };
    const centres = scenario.centres || [];
    const res = await apiClient.post('/v1/ai/what-if', {
      scenarioType: scenarioMap[scenario.scenarioType] || scenario.scenarioType,
      affectedCentreId: scenario.affectedCentreId || centres[0]?.centreId,
      centres,
      demandIncreasePercent: scenario.surgePercentage || 0,
      unavailableCounters: scenario.unavailableCounters || 0,
      equipmentCapacityReductionPercent: scenario.equipmentCapacityReductionPercent || 35,
    });
    const data = res.data;
    const impacts = data.centreImpacts || [];
    const worst = impacts.reduce((current, item) => (item.estimatedWaitMinutes > (current?.estimatedWaitMinutes || 0) ? item : current), null);
    const baselineLoad = impacts.reduce((sum, item) => sum + (item.originalLoad || 0), 0);
    const simulatedLoad = impacts.reduce((sum, item) => sum + (item.newLoad || 0), 0);
    return {
      ...data,
      baseline: { avgWaitMinutes: worst?.estimatedWaitMinutes || 0, peakQueueLength: baselineLoad, jamProbability: worst?.overloadRisk || 'low', fuelWastedLiters: 0 },
      simulated: { avgWaitMinutes: worst?.estimatedWaitMinutes || 0, peakQueueLength: simulatedLoad, jamProbability: worst?.overloadRisk || 'low', fuelWastedLiters: 0 },
    };
  },
  getCentres: async () => {
    const res = await apiClient.get('/v1/centres');
    return res.data;
  },
  getAlerts: async () => {
    const res = await apiClient.get('/v1/alerts');
    return res.data;
  },
  getQueue: async (centreId) => {
    const res = await apiClient.get(`/v1/queue/centres/${centreId}`);
    return res.data;
  },
  getActiveBookings: async (centreId) => {
    const res = await apiClient.get(`/v1/centres/${centreId}/bookings/active`);
    return res.data;
  },
  getCropPrices: async (centreId) => {
    const res = await apiClient.get(`/v1/centres/${centreId}/crop-prices`);
    return res.data;
  },
  updateBookingStatus: async (bookingId, payload) => {
    // payload can be a string (legacy) or full object { stage, currentCounter, nextCounter, nextProcess, instruction }
    const body = typeof payload === 'string' ? { stage: payload } : payload;
    const res = await apiClient.patch(`/v1/bookings/${bookingId}/status`, body);
    return res.data;
  },
  getWeatherSummary: async (centreId) => {
    const res = await apiClient.get(`/v1/centres/${centreId}/weather/summary`);
    return res.data;
  },
  getEmergencySlots: async (centreId) => {
    const res = await apiClient.get(`/v1/centres/${centreId}/weather/emergency-slots`);
    return res.data;
  },
  updateCropPrice: async (centreId, cropType, price) => {
    const res = await apiClient.put(`/v1/centres/${centreId}/crop-prices`, { cropType, price: Number(price) });
    return res.data;
  },
  getOverduePayments: async () => {
    const res = await apiClient.get('/v1/payments/overdue');
    return res.data;
  },
  recordPayment: async (paymentData) => {
    const res = await apiClient.post('/v1/payments', paymentData);
    return res.data;
  },
  scanQr: async (qrId) => {
    const res = await apiClient.post('/v1/qr/scan', { qrId });
    return res.data;
  },
  getCentreOccupancy: async (centreId) => {
    const res = await apiClient.get(`/v1/qr/centres/${centreId}/occupancy`);
    return res.data;
  },
  createLot: async (bookingId, weight, price, grade) => {
    const res = await apiClient.post(`/v1/auctions/lots`, null, {
      params: { bookingId, weight, price, grade }
    });
    return res.data;
  },
  closeAuction: async (lotId) => {
    const res = await apiClient.post(`/v1/auctions/lots/${lotId}/close`);
    return res.data;
  },
};

export const traderApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/v1/auth/login', credentials);
    return {
      ...response,
      data: {
        ...response.data,
        token: response.data.token || response.data.accessToken,
      },
    };
  },
  getActiveLots: async (centreId) => {
    const res = await apiClient.get('/v1/auctions/lots', { params: { centreId } });
    return res.data;
  },
  placeBid: async (lotId, bidRequest) => {
    const res = await apiClient.post(`/v1/auctions/lots/${lotId}/bids`, bidRequest);
    return res.data;
  },
};
