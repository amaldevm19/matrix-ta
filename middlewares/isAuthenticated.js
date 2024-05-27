

function isAuthenticated(req, res, next) {
    if (req.session.user && req.session.user.EmployeeId) {
      return next();
    }
    res.redirect("/users/login/?url="+req.originalUrl);
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.IsAdmin) {
    return next();
  }
  res.redirect("/users/login/?url="+req.originalUrl);
}

module.exports = {isAuthenticated, isAdmin}

