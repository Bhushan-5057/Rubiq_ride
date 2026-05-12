import { Router } from "express";
import {
  autocompleteController,
  directionsController,
  distanceMatrixController,
  geocodeController,
  placeDetailsController,
  reverseGeocodeController,
} from "../../controllers/maps/googleMaps.controller.js";
import { authenticateUser } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateUser);

router.get("/places/autocomplete", autocompleteController);
router.get("/places/details/:placeId", placeDetailsController);
router.get("/geocode", geocodeController);
router.get("/reverse-geocode", reverseGeocodeController);
router.post("/directions", directionsController);
router.post("/distance-matrix", distanceMatrixController);

export default router;
