export async function profileController(req, res, next) {
  try {
    res.json({
      success: true,
      message: "Admin profile fetched successfully",
      user: req.user, 
    });
  } catch (err) {
    next(err);
  }
}