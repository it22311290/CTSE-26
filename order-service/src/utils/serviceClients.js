const axios = require("axios");

const USER_SERVICE = process.env.USER_SERVICE_URL || "http://user-service:3001";
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || "http://product-service:3002";
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || "http://payment-service:3004";

const SERVICE_HEADERS = () => ({ "x-service-key": process.env.INTERNAL_SERVICE_KEY });

const serviceClients = {
  validateToken: async (token) => {
    const resp = await axios.get(`${USER_SERVICE}/api/auth/validate`, {
      headers: { Authorization: `Bearer ${token}`, ...SERVICE_HEADERS() }
    });
    return resp.data;
  },

  checkAndReserveStock: async (productId, quantity) => {
    const resp = await axios.post(`${PRODUCT_SERVICE}/api/products/internal/check-stock`, { productId, quantity }, {
      headers: SERVICE_HEADERS()
    });
    return resp.data;
  },

  restoreStock: async (productId, quantity) => {
    const resp = await axios.post(`${PRODUCT_SERVICE}/api/products/internal/restore-stock`, { productId, quantity }, {
      headers: SERVICE_HEADERS()
    });
    return resp.data;
  },

  getProduct: async (productId) => {
    const resp = await axios.get(`${PRODUCT_SERVICE}/api/products/${productId}`, {
      headers: SERVICE_HEADERS()
    });
    return resp.data.product;
  },

  initiatePayment: async (orderId, amount, userId, token) => {
    const resp = await axios.post(`${PAYMENT_SERVICE}/api/payments/initiate`, {
      orderId, amount, userId
    }, { headers: { Authorization: `Bearer ${token}`, ...SERVICE_HEADERS() } });
    return resp.data;
  }
};

module.exports = serviceClients;
