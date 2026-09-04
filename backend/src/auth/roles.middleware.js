export const requireRole = (role) => {
  return (req, res, next) => {
    // Convertimos ambos a minúsculas para evitar discrepancias tipo "Cliente" vs "cliente"
    const userRole = String(req.user?.rol || '').toLowerCase();
    const requiredRole = String(role).toLowerCase();

    if (userRole !== requiredRole) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
};

export const requireAnyRole = (...roles) => {
  return (req, res, next) => {
    const userRole = String(req.user?.rol || '').toLowerCase();
    const allowedRoles = roles.map(r => String(r).toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
  };
};