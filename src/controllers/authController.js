import * as authService from '../services/authService.js'

export async function registerCustomer(req, res) {
  const result = await authService.registerCustomer(req.body)
  res.status(201).json({ success: true, message: 'Customer account created', data: result })
}

export async function registerProvider(req, res) {
  const result = await authService.registerProvider(req.body)
  res.status(201).json({ success: true, message: 'Provider account created', data: result })
}

export async function login(req, res) {
  const result = await authService.login(req.body)
  res.json({ success: true, message: 'Logged in successfully', data: result })
}

export async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id)
  res.json({ success: true, data: { user } })
}