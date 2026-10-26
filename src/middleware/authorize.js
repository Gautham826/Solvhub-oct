import ApiError from '../utils/ApiError.js'

// Role-based access control. Use after authenticate:
//   router.get('/x', authenticate, authorize(ROLES.ADMIN), handler)
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized()
    if (!allowedRoles.includes(req.user.role)) throw ApiError.forbidden()
    next()
  }
}