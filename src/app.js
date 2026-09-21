const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const errorHandler = require('./middlewares/error.middleware')
const authRoute = require('./modules/auth/auth.route')

const app = express()

// Middlewares
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(morgan('dev'))

// Rate limit cho auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,
  message: { success: false, message: 'Quá nhiều request, thử lại sau' }
})

// Routes
app.use('/api/v1/auth', authLimiter, authRoute)

// Health check
app.get('/', (req, res) => res.json({ success: true, message: 'Server running' }))

// Error handler
app.use(errorHandler)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))