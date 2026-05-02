import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080',
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    })

    return Promise.reject(error)
  },
)

export default api
