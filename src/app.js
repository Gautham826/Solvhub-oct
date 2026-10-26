import express from 'express'
import cors from 'cors'
import { corsOptions } from './config/cors.js'
import apiRoutes from './routes/index.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api', apiRoutes)

app.use(notFound)
app.use(errorHandler)

export default app