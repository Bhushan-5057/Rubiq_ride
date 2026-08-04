import {
  SOCKET_EVENTS,
  emitToRideRoom,
} from "../../../config/socket/socket.js";
import {
  acceptRideService,
  driverArrivedService,
  startRideService,
  completeRideService,
  updateDriverLocationService
} from "../../../services/rideServices/driverTrackingService/driverTracking.service.js";
import { cancelRideService } from "../../../services/rideServices/rideCancellation.service.js";
import { getDistanceMatrix } from "../../../services/googleMaps/googleMaps.service.js";
import { Ride } from "../../../models/ride/ride.model.js";
import { refundPayment } from "../../../services/payment/payment.service.js";
import { DRIVER_CANCELLATION_REASONS } from "../../../common/cancellationReasons.js";
import { notifyRideParticipant } from "../../../helpers/rideNotify.helper.js";
import {
  extractNormalizedCoords,
  isValidCoordinatePair,
  normalizeLocationInput,
  toPassengerCoordAliases,
} from "../../../utils/location.js";

function resolveDriverLatLng(source) {
  const extracted = extractNormalizedCoords(source);
  if (!extracted) return null;
  return { latitude: extracted.latitude, longitude: extracted.longitude };
}

function withPassengerFriendlyCoords(payload, coords) {
  if (!coords) return payload;

  const aliases = toPassengerCoordAliases(coords);
  if (!aliases) return payload;

  const { latitude, longitude, lat, lng, coordinates } = aliases;

  const locationObj = {
    type: "Point",
    coordinates,
    latitude,
    longitude,
    lat,
    lng,
  };

  const driver = payload.driver
    ? {
        ...payload.driver,
        ...aliases,
        location: {
          ...(typeof payload.driver.location === "object"
            ? payload.driver.location
            : {}),
          ...locationObj,
        },
        locationUpdatedAt:
          payload.driver.locationUpdatedAt ||
          payload.locationUpdatedAt ||
          null,
      }
    : payload.driver;

  return {
    ...payload,
    ...aliases,
    remainingRouteOrigin: {
      lat: latitude,
      lng: longitude,
    },
    location: locationObj,
    liveLocation: payload.liveLocation
      ? {
          ...payload.liveLocation,
          ...locationObj,
          updatedAt:
            payload.liveLocation.updatedAt ||
            payload.locationUpdatedAt ||
            new Date(),
        }
      : {
          ...locationObj,
          updatedAt: payload.locationUpdatedAt || new Date(),
        },
    ...(driver !== undefined ? { driver } : {}),
  };
}

function trackingPhase(status) {
  if (status === "accepted" || status === "driver_arrived") return "to_pickup";
  if (status === "started" || status === "ongoing") return "to_drop";
  return null;
}

async function emitLiveLocationToPassenger({
  ride,
  passengerId,
  event,
  payload,
}) {
  await notifyRideParticipant({
    ride,
    userId: passengerId,
    role: "passenger",
    event,
    payload,
  });
  emitToRideRoom(ride._id, event, payload);
}

//----------------------------- Driver Accept Ride -----------------------------

export const acceptRide = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required",
      });
    }

    const ride = await acceptRideService({ rideId, driverId });

    const initialCoords =
      resolveDriverLatLng(ride.liveLocation) ||
      resolveDriverLatLng(req.driver);

    const payload = withPassengerFriendlyCoords(
      {
        rideId: ride._id,
        driver: {
          id: driverId,
          name: req.driver.name,
          contactNumber: req.driver.contactNumber,
          vehicleNumber: req.driver.vehicleNumber,
          vehicleType: req.driver.vehicleType,
        },
        liveLocation: ride.liveLocation || null,
        liveTracking: initialCoords
          ? {
              available: true,
              phase: "to_pickup",
              status: ride.status,
              ...toPassengerCoordAliases(initialCoords),
              remainingRouteOrigin: {
                lat: initialCoords.latitude,
                lng: initialCoords.longitude,
              },
              remainingRouteDestination: ride.pickup?.coordinates
                ? {
                    lat: ride.pickup.coordinates[1],
                    lng: ride.pickup.coordinates[0],
                  }
                : null,
              locationUpdatedAt: ride.liveLocation?.updatedAt || new Date(),
              tripPolyline: ride.routeDetails?.polyline || null,
              polyline: ride.routeDetails?.polyline || null,
              message: "Your driver is on the way to pickup",
            }
          : null,
        status: ride.status,
        pickup: ride.pickup,
        drop: ride.drop,
        fareEstimate: ride.fareEstimate,
      },
      initialCoords,
    );

    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_DRIVER_ASSIGNED,
      payload,
      push: {
        title: "Ride Accepted",
        body: "Driver accepted your ride request.",
        data: { rideId: ride._id.toString() },
      },
    });
    emitToRideRoom(ride._id, SOCKET_EVENTS.RIDE_DRIVER_ASSIGNED, payload);

    if (initialCoords && ride.passenger) {
      const onTheWaySeed = withPassengerFriendlyCoords(
        {
          rideId: ride._id,
          driver: payload.driver,
          pickupLocation: ride.pickup,
          etaMinutes: null,
          distanceToPickup: null,
          eta: null,
          distance: null,
          message: "Your driver is on the way",
          status: ride.status,
        },
        initialCoords,
      );
      await emitLiveLocationToPassenger({
        ride,
        passengerId: ride.passenger.toString(),
        event: SOCKET_EVENTS.DRIVER_ON_ROUTE,
        payload: onTheWaySeed,
      });
    }

    res.json({ success: true, ride });
  } catch (error) {
    next(error);
  }
};

//------------------------- Driver Arrived -------------------------

export const driverArrived = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId, driverLocationCoordinates } = req.body;
    const ride = await driverArrivedService({
      rideId,
      driverId,
      driverLocationCoordinates,
    });

    let arrivedCoords = resolveDriverLatLng(req.driver);
    if (driverLocationCoordinates != null && ride.pickup?.coordinates) {
      try {
        const normalized = normalizeLocationInput(driverLocationCoordinates, {
          referenceCoordinates: ride.pickup.coordinates,
        });
        arrivedCoords = {
          latitude: normalized.latitude,
          longitude: normalized.longitude,
        };
      } catch {
        // Do nothing
      }
    }

    const payload = withPassengerFriendlyCoords(
      {
        rideId: ride._id,
        driver: {
          id: driverId,
          name: req.driver.name,
          contactNumber: req.driver.contactNumber,
          vehicleNumber: req.driver.vehicleNumber,
          vehicleType: req.driver.vehicleType,
        },
        status: ride.status,
        pickup: ride.pickup,
        drop: ride.drop,
        fareEstimate: ride.fareEstimate,
      },
      arrivedCoords,
    );

    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.DRIVER_ARRIVED,
      payload,
      push: {
        title: "Driver Arrived",
        body: "Driver has arrived at your pickup location.",
        data: { rideId: ride._id.toString() },
      },
    });
    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.DRIVER_ARRIVED_LEGACY,
      payload,
    });
    emitToRideRoom(ride._id, SOCKET_EVENTS.DRIVER_ARRIVED, payload);
    res.json({ success: true, ride });
  } catch (error) {
    next(error);
  }
};

//------------------------- Driver Start Ride -------------------------

export const startRide = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId, otpForStartRide, driverLocationCoordinates } = req.body;
    const ride = await startRideService({
      rideId,
      driverId,
      otpForStartRide,
      driverLocationCoordinates,
    });

    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_STARTED,
      payload: { rideId: ride._id },
      push: {
        title: "Ride Started",
        body: "Your ride has started.",
        data: { rideId: ride._id.toString() },
      },
    });
    res.json({ success: true, ride });
  } catch (error) {
    next(error);
  }
}

//-------------------------- Driver Complete Ride --------------------------

export const completeRide = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId, driverLocationCoordinates } = req.body;

    const ride = await completeRideService({
      rideId,
      driverId,
      driverLocationCoordinates,
    });

    const completedPayload = {
      rideId: ride._id,
      status: ride.status,
      paymentStatus: ride.paymentStatus,
      paymentMethod: ride.paymentMethod,
      fare: ride.fareEstimate,
    };

    await notifyRideParticipant({
      ride,
      userId: ride.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_COMPLETED,
      payload: completedPayload,
      push: {
        title: "Ride Completed",
        body: "Your ride has been completed.",
        data: { rideId: ride._id.toString() },
      },
    });

    if (ride.paymentMethod === 'cash') {
      ride.paymentStatus = 'paid';
      ride.transactionDate = new Date();
      await ride.save();
    }

    if (ride.paymentStatus === 'paid') {
      await notifyRideParticipant({
        ride,
        userId: driverId,
        role: "driver",
        event: "payment:received",
        payload: {
          rideId: ride._id,
          amount: ride.fareEstimate,
          currency: "inr",
          paymentMethod: ride.paymentMethod,
        },
      });
    }

    res.json({
      success: true,
      ride,
      paymentStatus: ride.paymentStatus,
      paymentMethod: ride.paymentMethod
    });
  } catch (error) {
    next(error);
  }
};

//------------------------------- Driver Cancel Ride -------------------------------

export const cancelRide = async (req, res, next) => {
  try {
    const driverId = req.driver._id;
    const { rideId, reasonCode, reasonText } = req.body;

    if (!reasonCode) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required"
      });
    }

    const ride = await Ride.findOne({ _id: rideId, driver: driverId });

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.paymentStatus === 'paid') {
      if (ride.razorpayPaymentId) {
        try {
          await refundPayment(ride.razorpayPaymentId, null, {
            rideId: ride._id.toString(),
            reason: 'ride_cancelled',
          });
        } catch (error) {
          console.error('Error processing refund:', error);
        }
      }

      ride.paymentStatus = 'refunded';
      await ride.save();
    } else if (ride.paymentStatus === 'pending') {
      ride.paymentStatus = 'failed';
      await ride.save();
    }

    const updatedRide = await cancelRideService({
      rideId,
      actorId: driverId,
      cancelledBy: "Driver",
      reasonCode,
      reasonText,
      paymentStatus: ride.paymentStatus,
    });

    await notifyRideParticipant({
      ride: updatedRide,
      userId: updatedRide.passenger,
      role: "passenger",
      event: SOCKET_EVENTS.RIDE_CANCELLED_BY_DRIVER,
      payload: {
        rideId: updatedRide._id,
        cancelledBy: "Driver",
        reasonCode: updatedRide.cancellation.reasonCode,
        reasonText: updatedRide.cancellation.reasonText,
        paymentStatus: updatedRide.paymentStatus,
        refundProcessed: updatedRide.paymentStatus === "refunded",
      },
      push: {
        title: "Ride Cancelled",
        body: "Your driver cancelled the ride.",
        data: { rideId: updatedRide._id.toString() },
      },
    });
    res.json({
      success: true,
      message: "Ride cancelled successfully",
      ride: updatedRide,
      refundProcessed: updatedRide.paymentStatus === 'refunded'
    });
  } catch (error) {
    next(error);
  }
};

//------------------------------ Update Driver Location ------------------------------

export const updateDriverLocation = async (req, res, next) => {
  try {
    const body = req.body || {};
    const lngRaw = body.lng ?? body.longitude ?? body.long;
    const latRaw = body.lat ?? body.latitude;
    const rideId = body.rideId ?? body.ride_id ?? body.rideID ?? null;

    const longitude = Number(lngRaw);
    const latitude = Number(latRaw);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      throw new Error("Latitude and longitude must be valid numbers");
    }

    if (!isValidCoordinatePair(longitude, latitude)) {
      throw new Error(
        "Invalid coordinates. Expected longitude [-180,180] and latitude [-90,90]",
      );
    }

    const updatedDriver = await updateDriverLocationService(
      req.driver,
      longitude,
      latitude,
      rideId,
    );

    const { ride, trackingRideId, liveLocation, ...driverLocation } =
      updatedDriver;
    const effectiveRideId = trackingRideId || rideId || ride?._id || null;

    if (ride?.passenger) {
      const passengerId = ride.passenger.toString();
      const liveCoords = {
        latitude,
        longitude,
      };
      const phase = trackingPhase(ride.status);
      const destination =
        phase === "to_pickup"
          ? ride.pickup
          : phase === "to_drop"
            ? ride.drop
            : null;

      const locationPayload = withPassengerFriendlyCoords(
        {
          rideId: effectiveRideId,
          driver: {
            id: driverLocation.id,
            name: driverLocation.name,
            vehicleType: driverLocation.vehicleType,
            vehicleNumber: driverLocation.vehicleNumber,
            contactNumber: driverLocation.contactNumber,
            ...toPassengerCoordAliases(liveCoords),
            location: driverLocation.location,
            locationUpdatedAt: driverLocation.updatedAt,
          },
          liveLocation:
            liveLocation ||
            ride.liveLocation || {
              type: "Point",
              coordinates: [longitude, latitude],
              longitude,
              latitude,
              lat: latitude,
              lng: longitude,
              updatedAt: driverLocation.updatedAt,
            },
          liveTracking: {
            available: true,
            phase,
            status: ride.status,
            ...toPassengerCoordAliases(liveCoords),
            locationUpdatedAt: driverLocation.updatedAt,
            source: "update",
            remainingRouteOrigin: { lat: latitude, lng: longitude },
            remainingRouteDestination: destination?.coordinates
              ? {
                  lat: destination.coordinates[1],
                  lng: destination.coordinates[0],
                }
              : null,
            pickup: ride.pickup || null,
            drop: ride.drop || null,
            tripPolyline: ride.routeDetails?.polyline || null,
            polyline: ride.routeDetails?.polyline || null,
            etaMinutes: null,
            message:
              phase === "to_pickup"
                ? "Your driver is on the way to pickup"
                : "Your ride is in progress",
          },
          status: ride.status,
          phase,
          locationUpdatedAt: driverLocation.updatedAt,
          timestamp: Date.now(),
          message:
            phase === "to_pickup"
              ? "Your driver is on the way to pickup"
              : "Your ride is in progress",
        },
        liveCoords,
      );

      await emitLiveLocationToPassenger({
        ride,
        passengerId,
        event: SOCKET_EVENTS.DRIVER_LOCATION_UPDATED,
        payload: locationPayload,
      });

      if (ride.status === "accepted" || ride.status === "driver_arrived") {
        await emitLiveLocationToPassenger({
          ride,
          passengerId,
          event: SOCKET_EVENTS.DRIVER_ON_ROUTE,
          payload: withPassengerFriendlyCoords(
            {
              rideId: effectiveRideId,
              driver: locationPayload.driver,
              liveLocation: locationPayload.liveLocation,
              liveTracking: locationPayload.liveTracking,
              pickupLocation: ride.pickup,
              etaMinutes: null,
              distanceToPickup: null,
              eta: null,
              distance: null,
              message: "Your driver is on the way",
              status: ride.status,
              phase: "to_pickup",
              locationUpdatedAt: driverLocation.updatedAt,
              timestamp: Date.now(),
            },
            liveCoords,
          ),
        });
      }

      if (
        destination?.coordinates?.length === 2 &&
        isValidCoordinatePair(longitude, latitude)
      ) {
        void (async () => {
          try {
            const matrix = await getDistanceMatrix({
              origins: [[longitude, latitude]],
              destinations: [destination.coordinates],
            });
            const element = matrix.rows[0]?.elements[0];
            const etaMinutes =
              element?.durationInTraffic?.minutes ||
              element?.duration?.minutes ||
              null;
            const distanceObj = element?.distance || null;
            if (etaMinutes == null && !distanceObj) return;

            const etaPayload = withPassengerFriendlyCoords(
              {
                rideId: effectiveRideId,
                driver: locationPayload.driver,
                liveLocation: locationPayload.liveLocation,
                liveTracking: {
                  ...locationPayload.liveTracking,
                  etaMinutes,
                  distance: distanceObj,
                  distanceKm:
                    typeof distanceObj?.km === "number" ? distanceObj.km : null,
                  distanceMeters:
                    typeof distanceObj?.meters === "number"
                      ? distanceObj.meters
                      : null,
                },
                status: ride.status,
                phase,
                etaMinutes,
                eta: etaMinutes,
                locationUpdatedAt: driverLocation.updatedAt,
                timestamp: Date.now(),
                message: locationPayload.message,
                ...(phase === "to_drop"
                  ? {
                      dropLocation: ride.drop,
                      etaToDropMinutes: etaMinutes,
                      distanceToDrop: distanceObj,
                    }
                  : {
                      pickupLocation: ride.pickup,
                      etaToPickupMinutes: etaMinutes,
                      distanceToPickup: distanceObj,
                      distance:
                        typeof distanceObj?.km === "number"
                          ? distanceObj.km
                          : typeof distanceObj?.meters === "number"
                            ? distanceObj.meters / 1000
                            : null,
                    }),
              },
              liveCoords,
            );

            await emitLiveLocationToPassenger({
              ride,
              passengerId,
              event: SOCKET_EVENTS.DRIVER_LOCATION_UPDATED,
              payload: etaPayload,
            });
          } catch {
            // Do nothing
          }
        })();
      }
    }

    res.json({
      success: true,
      message: "Location updated",
      driver: driverLocation,
      dbSaved: driverLocation.dbSaved,
      tracking: Boolean(ride),
      trackingRideId: trackingRideId || null,
      liveLocation: liveLocation || null,
    });
  } catch (error) {
    next(error);
  }
};

//------------------------- Driver Cancellation Reasons ------------------------- 

export const getDriverCancellationReasons = (req, res, next) => {
  try {
    const reasons = Object.entries(DRIVER_CANCELLATION_REASONS).map(
      ([code, text]) => ({ code, text })
    )
    res.json({
      success: true,
      message: "Driver Cancellaition Reasons fetched succesfully",
      reasons
    })
  } catch (error) {
    next(error)
  }
}
