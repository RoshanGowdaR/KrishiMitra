import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  timeout: 20000,
});

const normalizeApiError = (error) => {
  if (axios.isCancel(error)) {
    return 'Request cancelled.';
  }

  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  return error.response?.data?.detail || 'Request failed. Please try again.';
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = normalizeApiError(error);
    toast.error(String(message));
    return Promise.reject(error);
  }
);

export const getWeather = async (lat, lon) => {
  const response = await api.get('/weather', { params: { lat, lon } });
  return response.data;
};

export const getForecast = async (lat, lon) => {
  const response = await api.get('/weather/forecast', { params: { lat, lon } });
  return response.data;
};

export const getMarketPrices = async (state, district, commodity) => (
  await api.get('/market/prices', { params: { state, district, commodity } })
).data;

export const getMarketPricesWithFilters = async ({
  state = 'Karnataka',
  district = 'Bengaluru',
  commodity = '',
}) => {
  const response = await api.get('/market/prices', {
    params: {
      state,
      district,
      commodity: commodity || undefined,
    },
  });
  return response.data;
};

export const getAllSchemes = async (language = 'en') => (await api.get('/schemes', { params: { language } })).data;
export const getSchemeById = async (schemeId, language = 'en') => (
  await api.get('/schemes/' + schemeId, { params: { language } })
).data;

export const getSchemes = async (language = 'en') => {
  const response = await api.get('/schemes', { params: { language } });
  return response.data;
};

export const getSchemeDetails = async (schemeId, language = 'en') => {
  const response = await api.get('/schemes/' + schemeId, { params: { language } });
  return response.data;
};

export const analyzeCropDisease = async (payload) => (await api.post('/crop-disease/analyze', payload)).data;

export const analyzeCropDiseaseImage = async ({ imageBase64, language = 'en' }) => {
  const response = await api.post('/crop-disease/analyze', {
    image_base64: imageBase64,
    language,
  });
  return response.data;
};

export const sendChatMessage = async (payload) => (await api.post('/chatbot/message', payload)).data;
export const translateChatText = async (payload) => (await api.post('/chatbot/translate', payload)).data;

export const sendChatbotMessage = async ({ message, language = 'en', conversationHistory = [] }) => {
  const response = await api.post('/chatbot/message', {
    message,
    language,
    conversation_history: conversationHistory,
  });
  return response.data;
};

export const getListings = async (params) => (await api.get('/marketplace/listings', { params })).data;
export const createListing = async (payload) => (await api.post('/marketplace/listings', payload)).data;

export const getQuizzes = async (params) => (await api.get('/quiz', { params })).data;
export const submitQuiz = async (quizId, payload) => (await api.post('/quiz/' + quizId + '/submit', payload)).data;

export const analyzeSoil = async (payload) => (await api.post('/soil/analyze-card', payload)).data;
export const getSoilCalendar = async (params) => (await api.get('/soil/analyze-location', { params })).data;

export const getPosts = async (params) => (await api.get('/forum/posts', { params })).data;
export const createForumPost = async (payload) => (await api.post('/forum/posts', payload)).data;

export const createSosRequest = async (payload) => (await api.post('/sos/request', payload)).data;
export const getSosHelplines = async () => (await api.get('/sos/helplines')).data;

export const getCropGuide = async (cropName, language = 'en') => (
  await api.get('/farm-guide/crops/' + cropName, { params: { language } })
).data;

export const getFarmGuideCrops = async (params) => (await api.get('/farm-guide/crops', { params })).data;

export const updateProfile = async (payload) => (
  await api.post('http://127.0.0.1:8000/api/v1/auth/update-profile', payload)
).data;

export default api;
